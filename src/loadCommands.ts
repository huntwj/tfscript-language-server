import { isTfSpace, type LogicalEntry } from "./logicalEntries";
import { entryStatements, parseStatements, type StructureMode } from "./structure";

/**
 * The `/load`, `/require` and `/set` commands in an entry, as tf parses them. Both the load graph
 * (which also tracks `/set`, for TFPATH, HOME and `/eval` paths) and the document links read
 * them from here. A command only counts at the start of a statement (structure.ts finds them:
 * `/echo hi /load x.tf` is an `/echo`). Proven against real tf with tf-script-check on
 * 2026-10-13, as well as read from the source:
 *  - `/load` (command.c `handle_load_command()`) takes only `-q`, which may be grouped (`-qq`);
 *    `-` or `--` ends the options (util.c `nextopt()`); any other option is an error and nothing
 *    loads. The rest of the line, trimmed (`stripstr()`), is the filename, inner blanks included.
 *  - `/require` is stdlib.tf's `/load %{-L} %{L}`: its words are passed on with single blanks,
 *    so `/require a  b.tf` loads `a b.tf`.
 *  - At the top level a plain command runs to the end of the line, `%;` included:
 *    `/load a.tf%; /echo x` looks for a file called `a.tf%; /echo x`. In a macro body `%;`
 *    ends the statement.
 *  - `/eval TEXT` (expand.c `handle_eval_command()`) runs TEXT while the file loads, by default
 *    as a macro body runs: substituted, then split on `%;`, so a top-level
 *    `/eval /set y=1%; /load b.tf` sets y and loads b.tf. `-s` picks the level (variable.c
 *    `enum_sub`, names in any case): `-soff`/`-s0` reads TEXT as a top-level line does (one
 *    command to the end, unless it starts with `/if` or `/while`), `-son`/`-s1` splits on `%;`
 *    without substituting, `-sfull`/`-s2` is the default. Any other value or option is an error,
 *    and nothing runs.
 *  - Text whose compile stops at an error runs nothing, so it has no commands (structure.ts).
 */

interface CommandBase {
  /** Where the argument is written, as offsets into `entry.text`. */
  start: number;
  end: number;
  /** Substituted before it runs: in a macro body or under `/eval`. */
  substituted: boolean;
  /** Runs while the file loads: a top-level command, or one a top-level `/eval` runs. */
  topLevel: boolean;
}

export interface LoadCommand extends CommandBase {
  kind: "load" | "require";
  /** The filename as written, `/require`'s words joined by single blanks; may need substituting. */
  file: string;
}

export interface SetCommand extends CommandBase {
  kind: "set";
  name: string;
  /** The value as written, trimmed; may need substituting. */
  value: string;
}

export type EntryCommand = LoadCommand | SetCommand;

const EVAL_RE = /^\/@?eval(?=\s|$)/i;
const LOAD_RE = /^\/(@?)(load|require)(?=\s|$)/i;
const SET_RE = /^\/@?set\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*|\s+)/i;
const EVAL_LEVELS: Readonly<Record<string, StructureMode>> = {
  off: "top", "0": "top",
  on: "newline", "1": "newline",
  full: "body", "2": "body",
};

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

function trimmedEnd(text: string, from: number, to: number): number {
  let end = to;
  while (end > from && isTfSpace(text[end - 1])) end -= 1;
  return end;
}

export function entryCommands(entry: LogicalEntry): EntryCommand[] {
  const out: EntryCommand[] = [];
  const text = entry.text;

  const visit = (start: number, end: number, substituted: boolean, topLevel: boolean): void => {
    const stmt = text.slice(start, end);
    const ev = EVAL_RE.exec(stmt);
    if (ev) {
      const args = words(text, start + ev[0].length, end);
      let mode: StructureMode = "body";
      let from = end;
      let i = 0;
      for (; i < args.length; i += 1) {
        const w = text.slice(args[i]!.start, args[i]!.end);
        if (w === "-" || w === "--") {
          i += 1;
          break;
        }
        if (!w.startsWith("-")) break;
        const level = /^-s(.*)$/.exec(w)?.[1]?.toLowerCase();
        const picked = level === undefined ? undefined : EVAL_LEVELS[level];
        if (!picked) return;
        mode = picked;
      }
      if (i < args.length) from = args[i]!.start;
      for (const st of parseStatements(text.slice(from, end), mode)) {
        visit(from + st.start, from + st.end, substituted || mode === "body", topLevel);
      }
      return;
    }

    const set = SET_RE.exec(stmt);
    if (set) {
      const valueStart = start + set[0].length;
      const valueEnd = trimmedEnd(text, valueStart, end);
      out.push({
        kind: "set",
        name: set[1] as string,
        value: text.slice(valueStart, valueEnd),
        start: valueStart,
        end: valueEnd,
        substituted,
        topLevel,
      });
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
    out.push({ kind, file, start: fileStart, end: fileEnd, substituted, topLevel });
  };

  for (const st of entryStatements(entry)) visit(st.start, st.end, st.substituted, !st.substituted);
  return out;
}

export function entryLoads(entry: LogicalEntry): LoadCommand[] {
  return entryCommands(entry).filter((c): c is LoadCommand => c.kind !== "set");
}
