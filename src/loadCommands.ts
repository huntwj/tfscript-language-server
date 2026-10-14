import { isTfSpace, type LogicalEntry } from "./logicalEntries";
import { entryStatements, parseStatements, type StructureMode, type SubLevel } from "./structure";

/**
 * The `/load`, `/require`, `/set` and `/setenv` commands in an entry, as tf parses them. Both
 * the load graph (which also tracks variables, for TFPATH, HOME and `/eval` paths) and the
 * document links read them from here. A command only counts at the start of a statement
 * (structure.ts finds them: `/echo hi /load x.tf` is an `/echo`). Proven against real tf with
 * tf-script-check on 2026-10-13, as well as read from the source:
 *  - `/load` (command.c `handle_load_command()`) takes only `-q`, which may be grouped (`-qq`);
 *    `-` or `--` ends the options (util.c `nextopt()`); any other option is an error and nothing
 *    loads. The rest of the line, trimmed (`stripstr()`), is the filename, inner blanks included.
 *  - `/require` is stdlib.tf's `/load %{-L} %{L}`: its words are passed on with single blanks,
 *    so `/require a  b.tf` loads `a b.tf`.
 *  - At the top level a plain command runs to the end of the line, `%;` included:
 *    `/load a.tf%; /echo x` looks for a file called `a.tf%; /echo x`. In a macro body `%;`
 *    ends the statement.
 *  - `/set NAME=VALUE` and `/set NAME VALUE` (variable.c `setdelim()`): the value starts right
 *    after the `=`, or after the blanks, so `/set x =1` sets x to `=1`. `/setenv` sets the same
 *    global variable and exports it; `/let` sets a local one, so it isn't tracked.
 *  - Text at the `newline` level (expand.c `percentsub()` at `SUB_NEWLINE`) only has its runs
 *    of `%` shortened by one, so `%{x}` stays as it is: `/eval -son /load %{x}.tf` loads the file
 *    `%{x}.tf`, and `/eval -son /load a%%b.tf` loads `a%b.tf`. The same holds inside a top-level
 *    `/if` or `/while`.
 *  - `/eval TEXT` (expand.c `handle_eval_command()`) runs TEXT while the file loads, by default
 *    as a macro body runs: split on `%;`, each statement substituted as it runs, so a top-level
 *    `/eval /set d=x%; /load %{d}/a.tf` uses the new d. `-s` picks the level (variable.c
 *    `enum_sub`: a name in any case, or any all-digit number up to 2, as util.c `enum2int()`
 *    reads it, quoted or not): `-soff`/`-s0` reads TEXT as a top-level line is read (one command
 *    to the end, unless it starts with `/if` or `/while`), `-son`/`-s1` splits it on `%;` at the
 *    `newline` level, and `-sfull`/`-s2` is the default. Any other value or option is an error,
 *    and nothing runs.
 *  - Each level processes the text the one outside it produced: `/set d=dd` then
 *    `/if (1) /eval /load %%{d}/x.tf%; /endif` loads `dd/x.tf` (the `/if` makes `%%{d}` into
 *    `%{d}`, which `/eval` substitutes), and `/if (1) /eval -son /load a%%%%b.tf%; /endif` loads
 *    `a%%b.tf`.
 *  - Text whose compile stops at an error runs nothing, so it has no commands (structure.ts).
 */

interface CommandBase {
  /** Where the argument is written, as offsets into `entry.text`. */
  start: number;
  end: number;
  /**
   * The passes tf still makes over the text (`file` or `value`) before using it, in order. The
   * passes that need no variables are already applied, up to the first substitution (`full`).
   */
  pending: SubLevel[];
  /** A plain top-level command: tf uses its text exactly as written. */
  plain: boolean;
  /** Run by an `/eval`. */
  viaEval: boolean;
  /** Runs while the file loads: a top-level command, or one a top-level `/eval` runs. */
  topLevel: boolean;
  /** Inside an `/if` or `/while`, so it may not run at all. */
  conditional: boolean;
}

export interface LoadCommand extends CommandBase {
  kind: "load" | "require";
  /** The filename, `/require`'s words joined by single blanks. */
  file: string;
}

export interface SetCommand extends CommandBase {
  kind: "set";
  name: string;
  value: string;
}

export type EntryCommand = LoadCommand | SetCommand;

/**
 * What tf makes of `text` after the `pending` passes, when that doesn't depend on any variable:
 * undefined when a substitution pass still has something to substitute.
 */
export function literalText(text: string, pending: SubLevel[]): string | undefined {
  let out = text;
  for (const level of pending) {
    if (level === "full" && /[%$\\]/.test(out)) return undefined;
    if (level === "newline") out = shortenPercents(out);
  }
  return out;
}

/** expand.c `percentsub()`: a `%` followed by more `%`s keeps only those. */
export function shortenPercents(text: string): string {
  return text.replace(/%(%+)/g, "$1");
}

/** Text a level has produced, with where each character came from in the entry's text. */
interface Source {
  text: string;
  /** Offset into `entry.text` of each character of `text`. */
  map: number[];
}

/** The `newline` pass over `src.text[start, end)`: each run of `%`s loses its first one. */
function shortened(src: Source, start: number, end: number): Source {
  let text = "";
  const map: number[] = [];
  let i = start;
  while (i < end) {
    let j = i + 1;
    if (src.text[i] === "%") while (j < end && src.text[j] === "%") j += 1;
    // A run of two or more `%`s drops its first; anything else is kept. The first `%` kept maps
    // to the dropped one, so a range over the result still covers everything written.
    for (let k = j - i > 1 ? i + 1 : i; k < j; k += 1) {
      text += src.text[k];
      map.push(src.map[k === i + 1 && j - i > 1 ? i : k] as number);
    }
    i = j;
  }
  map.push(src.map[end] as number);
  return { text, map };
}

const EVAL_RE = /^\/@?eval(?=\s|$)/i;
const LOAD_RE = /^\/(@?)(load|require)(?=\s|$)/i;
const SET_RE = /^\/@?(?:set|setenv)\s+([A-Za-z_][A-Za-z0-9_]*)(?=[=\s])/i;
const EVAL_LEVELS: Readonly<Record<string, StructureMode>> = { off: "top", on: "newline", full: "body" };
const NUMBERED_LEVELS: readonly StructureMode[] = ["top", "newline", "body"];

interface Word {
  start: number;
  end: number;
}

function words(text: string, from: number, to: number): Word[] {
  const out: Word[] = [];
  let i = from;
  while (i < to) {
    while (i < to && isTfSpace(text[i])) i += 1;
    if (i >= to) break;
    const start = i;
    while (i < to && !isTfSpace(text[i])) i += 1;
    out.push({ start, end: i });
  }
  return out;
}

/**
 * The value of an `-s` option word, as nextopt() reads a string argument: the rest of the word,
 * or a quoted string that ends the word (util.c `stringliteral()`: `\` only escapes the quote or
 * another `\`, and is otherwise kept). Undefined for anything else.
 */
function optionArgument(arg: string): string | undefined {
  const quote = arg[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return arg;
  let out = "";
  for (let i = 1; i < arg.length; i += 1) {
    const ch = arg[i] as string;
    if (ch === quote) return i === arg.length - 1 ? out : undefined;
    if (ch === "\\" && (arg[i + 1] === quote || arg[i + 1] === "\\")) i += 1;
    out += arg[i];
  }
  return undefined;
}

function evalMode(arg: string): StructureMode | undefined {
  const value = optionArgument(arg);
  if (value === undefined) return undefined;
  if (/^[0-9]+$/.test(value)) return NUMBERED_LEVELS[Number(value)];
  return EVAL_LEVELS[value.toLowerCase()];
}

interface Context {
  /** Passes still to make, from the first substitution on. */
  pending: SubLevel[];
  plain: boolean;
  viaEval: boolean;
  topLevel: boolean;
  conditional: boolean;
}

export function entryCommands(entry: LogicalEntry): EntryCommand[] {
  const out: EntryCommand[] = [];

  /** The statement `src.text[start, end)`, read at `level` inside `ctx`. */
  const statement = (src: Source, start: number, end: number, level: SubLevel, ctx: Context): void => {
    if (ctx.pending.length > 0 || level === "full") {
      command(src, start, end, { ...ctx, pending: level === "keyword" ? ctx.pending : [...ctx.pending, level] });
    } else if (level === "newline") {
      const text = shortened(src, start, end);
      command(text, 0, text.text.length, ctx);
    } else {
      command(src, start, end, ctx);
    }
  };

  const command = (src: Source, start: number, end: number, ctx: Context): void => {
    const text = src.text;
    const stmt = text.slice(start, end);
    const at = (s: number, e: number) => ({ start: src.map[s] as number, end: (src.map[e - 1] as number) + 1 });

    const ev = EVAL_RE.exec(stmt);
    if (ev) {
      const args = words(text, start + ev[0].length, end);
      let mode: StructureMode = "body";
      let i = 0;
      for (; i < args.length; i += 1) {
        const w = text.slice(args[i]!.start, args[i]!.end);
        if (w === "-" || w === "--") {
          i += 1;
          break;
        }
        if (!w.startsWith("-")) break;
        const picked = w.startsWith("-s") ? evalMode(w.slice(2)) : undefined;
        if (!picked) return;
        mode = picked;
      }
      const from = i < args.length ? args[i]!.start : end;
      for (const st of parseStatements(text.slice(from, end), mode)) {
        statement(src, from + st.start, from + st.end, st.level, {
          ...ctx,
          plain: false,
          viaEval: true,
          conditional: ctx.conditional || st.conditional,
        });
      }
      return;
    }

    const set = SET_RE.exec(stmt);
    if (set) {
      // setdelim(): after the name, "=" starts the value; blanks are skipped, and the value starts after them.
      let valueStart = start + set[0].length;
      if (text[valueStart] === "=") {
        valueStart += 1;
      } else {
        while (valueStart < end && isTfSpace(text[valueStart])) valueStart += 1;
        if (valueStart >= end) return; // no value: /set NAME only shows the variable
      }
      let valueEnd = end;
      // expand() drops the blanks before a %; that ends the statement.
      if (src.map[end] !== undefined && entry.text[src.map[end] as number] === "%") {
        while (valueEnd > valueStart && isTfSpace(text[valueEnd - 1])) valueEnd -= 1;
      }
      const where = valueEnd > valueStart ? at(valueStart, valueEnd) : { start: src.map[valueStart - 1] as number, end: src.map[valueStart - 1] as number };
      out.push({ kind: "set", name: set[1] as string, value: text.slice(valueStart, valueEnd), ...where, ...ctx });
      return;
    }

    const m = LOAD_RE.exec(stmt);
    if (!m) return;
    const kind = (m[2] as string).toLowerCase() as "load" | "require";
    if (kind === "require" && m[1]) return;
    const args = words(text, start + m[0].length, end);
    let first = 0;
    while (first < args.length) {
      const w = text.slice(args[first]!.start, args[first]!.end);
      if (!w.startsWith("-")) break;
      if (w !== "-" && w !== "--" && !/^-q+$/.test(w)) return;
      first += 1;
      if (w === "-" || w === "--") break;
    }
    if (first >= args.length) return;
    const fileStart = args[first]!.start;
    const fileEnd = args[args.length - 1]!.end;
    const file =
      kind === "require" ? args.slice(first).map((w) => text.slice(w.start, w.end)).join(" ") : text.slice(fileStart, fileEnd);
    out.push({ kind, file, ...at(fileStart, fileEnd), ...ctx });
  };

  // One more offset than characters, so the statement's end (a separator, or the end) maps too.
  const source: Source = { text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) };
  for (const st of entryStatements(entry)) {
    statement(source, st.start, st.end, st.level, {
      pending: [],
      plain: st.level === "keyword",
      viaEval: false,
      topLevel: st.level !== "full",
      conditional: st.conditional,
    });
  }
  return out;
}

export function entryLoads(entry: LogicalEntry): LoadCommand[] {
  return entryCommands(entry).filter((c): c is LoadCommand => c.kind !== "set");
}
