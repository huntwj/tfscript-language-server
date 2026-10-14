import { isTfSpace, type LogicalEntry } from "./logicalEntries";
import { evalMode, shortened, type Source } from "./loadCommands";
import { macroBodyStart, parseRegions, type StructureMode, type SubLevel } from "./structure";

/**
 * Which text of a top-level entry tf substitutes, and how: one table the rules ask, rather than
 * each guessing from the command at the start of the line. Proven against real tf (probes p04,
 * p06, p10 and q05 of the 2026-10-14 rule analysis, and r2.tf):
 *
 *  - A plain top-level line is read at `SUB_KEYWORD` (command.c `load_file()`): `%;`, `%{x}`,
 *    `%x`, `$[...]`, `$(...)` and `\` are all text. `/set a=1%; /set b=2` sets a to
 *    `1%; /set b=2`.
 *  - A top-level line starting with `/if` or `/while` is raised to `SUB_NEWLINE` for the rest of
 *    the line (expand.c): `%;` separates and a run of `%`s loses one, but nothing is substituted,
 *    so `/if (1) /echo %{x}%; /endif` prints `%{x}`.
 *  - A macro body is substituted when it runs (`SUB_MACRO`): `/def`, `/bind`, `/hook`, `/trig*`
 *    and stdlib's `/alias`. So is the command of a `/repeat` (process.c compiles it as a macro
 *    body, whatever its options), all of a `/for`'s words (stdlib's `/for` runs them through
 *    `/@eval`), and `/eval` text at its `-s` level: the default and `-sfull` substitute, `-son`
 *    reads it as an `/if` line is read and `-soff` as a plain line.
 *  - An expression is evaluated at any level: an `/if` or `/while` condition, the text of a
 *    `/test`, `/return` or `/result`, and `$[...]` where it is substituted. There `%x` and `%{x}`
 *    are operands, so a top-level `/if (%{x} == 5)` does read x.
 *
 * Each level reads the text the one outside it produced: inside an `/if` line `%%{x}` reaches an
 * `/eval` as `%{x}`, which it substitutes.
 */

/** How the text at an offset is finally read: a level, or as an expression. */
export type SubContext = SubLevel | "expression";

/** A statement read at the top level, or by an `/eval -soff`/`-son` there, as offsets into `entry.text`. */
export interface ContextStatement {
  start: number;
  end: number;
  level: SubLevel;
  /** The command, lower case, without its `/` and any `@` or `!`: "" for text sent to the world. */
  word: string;
  /** For a macro-defining command, where its body starts. */
  body?: number;
  /** Read by an `/eval -soff` or `-son`, not straight from the file. */
  viaEval: boolean;
}

export interface SubstitutionModel {
  /** How each character of `entry.text` is finally read. */
  contexts: SubContext[];
  /** The statements read without substitution, outermost first. */
  statements: ContextStatement[];
}

const MACRO_DEFINER = /^(?:def|bind|hook|trig|trigc|trigp|trigpc|alias)$/;
const MAX_DEPTH = 8;

const COMMAND_RE = /^\/[@!]*([^\s%)]*)/;

/** The command a statement at `start` runs, lower case, without its `/` and any `@` or `!`; "" for text. */
function commandWord(s: string, start: number): string {
  if (s[start] !== "/") return "";
  return (COMMAND_RE.exec(s.slice(start))?.[1] ?? "").toLowerCase();
}

function nextWord(s: string, i: number, end: number): { start: number; end: number } | undefined {
  while (i < end && isTfSpace(s[i])) i += 1;
  if (i >= end) return undefined;
  const start = i;
  while (i < end && !isTfSpace(s[i])) i += 1;
  return { start, end: i };
}

/**
 * `/repeat [-options] COUNT COMMAND`, its arguments `s[from, to)`: where COMMAND starts, and whether
 * it first runs at once, inside whatever ran the `/repeat`. procopt("-@PSw:n") through nextopt():
 * flags group in one word (`-Sn`); `-w` takes the rest of its word as the world; a digit or `:`
 * after the `-` is the time; `--` or `-` ends the options. `-S` and `-P` run it at once, a time
 * runs it later, and the last of them given wins. Undefined for an invalid option or count (an
 * error: nothing runs) or no command.
 */
export function repeatArguments(s: string, from: number, to: number): { command: number; now: boolean } | undefined {
  let now = false;
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    for (let k = 1; k < opt.length; k += 1) {
      const flag = opt[k] as string;
      if ((flag >= "0" && flag <= "9") || flag === ":") {
        now = false;
        break;
      }
      if (flag === "S" || flag === "P") now = true;
      else if (flag === "w") break; // (a quoted world name with blanks in it isn't followed)
      else if (flag !== "n") return undefined;
    }
  }
  // tf takes "i" (forever) or a positive number, and nothing else, as the count.
  if (!word || !/^(?:[iI]|0*[1-9][0-9]*)$/.test(s.slice(word.start, word.end))) return undefined;
  const command = nextWord(s, word.end, to);
  return command ? { command: command.start, now } : undefined;
}

/** `/eval [-s<level>] TEXT`, its arguments `s[from, to)`: where TEXT starts and how it is read. Undefined for an error. */
export function evalArguments(s: string, from: number, to: number): { text: number; mode: StructureMode } | undefined {
  let mode: StructureMode = "body";
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    const picked = opt.startsWith("-s") ? evalMode(opt.slice(2)) : undefined;
    if (!picked) return undefined;
    mode = picked;
  }
  return { text: word ? word.start : to, mode };
}

const cache = new WeakMap<LogicalEntry, SubstitutionModel>();

export function entrySubstitution(entry: LogicalEntry): SubstitutionModel {
  let model = cache.get(entry);
  if (model) return model;
  const contexts: SubContext[] = new Array<SubContext>(entry.text.length).fill("keyword");
  const statements: ContextStatement[] = [];
  model = { contexts, statements };

  const mark = (src: Source, from: number, to: number, context: SubContext): void => {
    for (let k = from; k < to; k += 1) {
      const at = src.map[k];
      if (at !== undefined && at < contexts.length) contexts[at] = context;
    }
  };

  /** `src.text`, read as `mode` reads it; later (inner) reads overwrite earlier ones. */
  const read = (src: Source, mode: StructureMode, depth: number, viaEval: boolean): void => {
    const s = src.text;
    if (mode === "body") {
      mark(src, 0, s.length, "full");
      return;
    }
    const regions = parseRegions(s, mode);
    for (const st of regions.statements) {
      mark(src, st.start, st.end, st.level);
      const word = commandWord(s, st.start);
      const out: ContextStatement = {
        start: src.map[st.start] as number,
        end: st.end > st.start ? (src.map[st.end - 1] as number) + 1 : (src.map[st.start] as number),
        level: st.level,
        word,
        viaEval,
      };
      statements.push(out);
      if (depth >= MAX_DEPTH) continue;
      const argStart = st.start + (word ? (COMMAND_RE.exec(s.slice(st.start))?.[0].length ?? 0) : 0);
      // What the command is handed: a plain line as written, an /if line with its % runs shortened.
      const handed = (from: number): Source =>
        st.level === "newline" ? shortened(src, from, st.end) : { text: s.slice(from, st.end), map: src.map.slice(from, st.end + 1) };
      if (MACRO_DEFINER.test(word)) {
        const body = macroBodyStart(s.slice(st.start, st.end));
        if (body >= 0) {
          out.body = src.map[st.start + body] as number;
          read(handed(st.start + body), "body", depth + 1, true);
        }
      } else if (word === "for") {
        read(handed(argStart), "body", depth + 1, true);
      } else if (word === "repeat") {
        const h = handed(argStart);
        const r = repeatArguments(h.text, 0, h.text.length);
        if (r) read({ text: h.text.slice(r.command), map: h.map.slice(r.command) }, "body", depth + 1, true);
      } else if (word === "eval") {
        const h = handed(argStart);
        const e = evalArguments(h.text, 0, h.text.length);
        if (e) read({ text: h.text.slice(e.text), map: h.map.slice(e.text) }, e.mode, depth + 1, true);
      }
    }
    // Expressions last: what is evaluated as an expression is read so wherever it sits.
    for (const ex of regions.expressions) mark(src, ex.start, ex.end, "expression");
  };

  read({ text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) }, "top", 0, false);
  cache.set(entry, model);
  return model;
}
