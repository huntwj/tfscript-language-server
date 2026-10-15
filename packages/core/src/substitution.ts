import { isTfSpace, type LogicalEntry } from "./logicalEntries";
import { evalMode, shortened, type Source } from "./loadCommands";
import { code, COMMAND_RE, commandWord, macroBodyStart, parseRegions, type ExpressionRegion, type StructureIssue, type StructureMode, type SubLevel } from "./structure";

/**
 * Which text of a top-level entry tf substitutes, and how: one table the rules ask, rather than
 * each guessing from the command at the start of the line. Proven against real tf (probes p04,
 * p06, p10 and q05 of the 2026-10-14 rule analysis, r2.tf, and the review's p1-p4):
 *
 *  - A plain top-level line is read at `SUB_KEYWORD` (command.c `load_file()`): `%;`, `%{x}`,
 *    `%x`, `$[...]`, `$(...)` and `\` are all text. `/set a=1%; /set b=2` sets a to
 *    `1%; /set b=2`.
 *  - A top-level line starting with `/if` or `/while` is raised to `SUB_NEWLINE` for the rest of
 *    the line (expand.c): `%;` separates and a run of `%`s loses one, but nothing is substituted,
 *    so `/if (1) /echo %{x}%; /endif` prints `%{x}`.
 *  - A macro body is substituted when it runs (`SUB_MACRO`): `/def`, `/bind`, `/hook` (and their
 *    `/@` forms), `/trig*` and stdlib's `/alias`. So is the command of a `/repeat` (process.c
 *    compiles it as a macro body, whatever its options) and of stdlib's `/at` (which hands it to
 *    `/repeat`), all of a `/for`'s words (stdlib's `/for` runs them through `/@eval`), the command
 *    after a `/quote`'s backquote (process.c runs it with `macro_run()` at its `-s` level, by
 *    default `SUB_MACRO`), and `/eval` text at its `-s` level: the default and `-sfull`
 *    substitute, `-son` reads it as an `/if` line is read and `-soff` as a plain line.
 *  - An expression is evaluated at any level: an `/if` or `/while` condition, the text of a
 *    `/test`, `/return` or `/result`, and `$[...]` where it is substituted. There `%x` and `%{x}`
 *    are operands, so a top-level `/if (%{x} == 5)` does read x.
 *  - A string in an expression is not substituted by the expression. In a condition or `$[...]`
 *    nothing substitutes it, even in a macro body: `/if (echo("%{x}"))` prints `%{x}`. The text
 *    of a `/test`, `/return` or `/result` is substituted at its statement's level first, so a
 *    string there is substituted in a macro body but not at the top level.
 *
 * Each level reads the text the one outside it produced: inside an `/if` line `%%{x}` reaches an
 * `/eval` as `%{x}`, which it substitutes.
 */

/**
 * How the text at an offset is finally read: a level, as an expression, or as a string in a
 * condition or `$[...]`, which nothing substitutes.
 */
export type SubContext = SubLevel | "expression" | "string";

/**
 * An `-s` option, as offsets: a word of its own (`-soff`, `whole`), or the `soff` grouped after
 * other flags in one (`-Ssoff`).
 */
export interface LevelOption {
  start: number;
  end: number;
  whole: boolean;
}

/**
 * The `/eval -soff` or `-son`, or the `/quote` with one, whose text a statement is, with its `-s`
 * options' offsets into `entry.text`.
 */
export interface EvalLevel {
  command: "eval" | "quote";
  mode: "top" | "newline";
  options: LevelOption[];
}

/** A statement read at the top level, or by an `/eval -soff`/`-son` there, as offsets into `entry.text`. */
export interface ContextStatement {
  start: number;
  end: number;
  level: SubLevel;
  /** The command, lower case, without its `/` and any `@` or `!`: "" for text sent to the world. */
  word: string;
  /** For a macro-defining command, where its body starts. */
  body?: number;
  /** The `/eval` that read it, when it isn't read straight from the file. */
  viaEval?: EvalLevel;
}

export interface SubstitutionModel {
  /** How each character of `entry.text` is finally read. */
  contexts: SubContext[];
  /**
   * Whether each character of `entry.text` is read as part of an expression, its strings included
   * (a string in a top-level `/test` keeps the `keyword` context, but is still no command text).
   */
  inExpression: boolean[];
  /** The statements read without substitution, outermost first. */
  statements: ContextStatement[];
  /**
   * The substitution and expression problems in every text tf reads (`substitution`, `expression`
   * and `operand` issues), as offsets into `entry.text`: so they are found wherever tf reads them,
   * a `/repeat` or `/eval` text included, and nowhere it doesn't, such as a plain top-level line.
   */
  issues: StructureIssue[];
}

const SYNTAX_KINDS = new Set(["substitution", "expression", "operand", "empty-statement"]);

/**
 * The commands that take a `= body` tf stores as a macro body (without `/` or `@`): /def and /edit
 * (macro_spec() in macro.c), /bind, /hook, /gag, /hilite and /trigpc (split_args() in command.c),
 * and stdlib's /trig, /trigc, /trigp and /alias.
 */
export const MACRO_DEFINER = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias)$/;
const MAX_DEPTH = 8;

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

/**
 * `/eval [-s<level>] TEXT`, its arguments `s[from, to)`: where TEXT starts, how it is read, and
 * where each `-s` option is (the last one counts). Undefined for an error.
 */
export function evalArguments(
  s: string,
  from: number,
  to: number,
): { text: number; mode: StructureMode; options: LevelOption[] } | undefined {
  let mode: StructureMode = "body";
  const options: LevelOption[] = [];
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    const at = word;
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    const picked = opt.startsWith("-s") ? evalMode(opt.slice(2)) : undefined;
    if (!picked) return undefined;
    mode = picked;
    options.push({ start: at.start, end: at.end, whole: true });
  }
  return { text: word ? word.start : to, mode, options };
}

/**
 * `/quote [-options] [PREFIX]` + backquote + `COMMAND`, its arguments `s[from, to)`: where COMMAND
 * starts and ends, how it is read, and where each `-s` option is. procopt("-@PSw:d:s:"): `-w`, `-d`
 * and `-s` take the rest of their word; a digit or `:` is the time. The first `'`, `!`, `#` or
 * backquote not escaped by `\` picks the kind; only a backquote runs a tf command,
 * `"COMMAND"SUFFIX` or the rest of the text. Undefined for any other kind, or an error.
 */
export function quoteCommand(
  s: string,
  from: number,
  to: number,
): { start: number; end: number; mode: StructureMode; options: LevelOption[] } | undefined {
  let mode: StructureMode = "body";
  const options: LevelOption[] = [];
  let i = from;
  let word = nextWord(s, i, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    const at = word;
    i = word.end;
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    for (let k = 1; k < opt.length; k += 1) {
      const flag = opt[k] as string;
      if ((flag >= "0" && flag <= "9") || flag === ":" || flag === "w" || flag === "d") break;
      if (flag === "s") {
        const picked = evalMode(opt.slice(k + 1));
        if (!picked) return undefined;
        mode = picked;
        options.push(k === 1 ? { start: at.start, end: at.end, whole: true } : { start: at.start + k, end: at.end, whole: false });
        break;
      }
      // (procopt's "-@" isn't an option letter: tf says "-@: invalid option", second review's q2.)
      if (flag !== "P" && flag !== "S") return undefined;
    }
  }
  if (word) i = word.start;
  while (i < to && s[i] !== "'" && s[i] !== "!" && s[i] !== "#" && s[i] !== "`") i += s[i] === "\\" ? 2 : 1;
  if (i >= to || s[i] !== "`") return undefined;
  i += 1;
  if (s[i] !== '"') return { start: i, end: to, mode, options };
  let end = i + 1;
  while (end < to && s[end] !== '"') end += s[end] === "\\" ? 2 : 1;
  return { start: i + 1, end: Math.min(end, to), mode, options };
}

/**
 * stdlib's `/at [-v] [DATE] TIME COMMAND`, its arguments `s[from, to)`: where COMMAND starts. It
 * goes to `/repeat` as `%*`, which compiles it as a macro body (lib/tf/at.tf).
 */
export function atCommand(s: string, from: number, to: number): number | undefined {
  let word = nextWord(s, from, to);
  while (word && /^-(?:v*|-)$/.test(s.slice(word.start, word.end))) {
    const end = s.slice(word.start, word.end) === "--";
    word = nextWord(s, word.end, to);
    if (end) break;
  }
  if (word && /^(?:\d{2}(?:\d{2})?-)?\d{1,2}[-/]\d{1,2}$/.test(s.slice(word.start, word.end))) word = nextWord(s, word.end, to);
  const command = word && nextWord(s, word.end, to);
  return command?.start;
}

/**
 * The strings in `s[from, to)`, read as an expression reads them (tf's `is_quote()`, `\` escaping),
 * and the `$(...)`s, whose text is a command list run as a macro body, not part of the expression.
 * Where a `$(...)` ends is the structure parser's to say (`known`, the `$(...)`s it read): its text
 * is read at `SUB_MACRO`, so `\)` doesn't end it, and an `/if (...)` or `/while (...)` in it reads
 * its own parentheses (third review's probe p1); a `/test`'s text in it does not, and ends at the
 * first `)`. Where the parser read none (a `/test`'s
 * text with a `$` in it is only compiled when it runs), the `$(...)` is parsed here, as a body.
 */
function stringsIn(
  s: string,
  from: number,
  to: number,
  known: { start: number; end: number }[],
): { strings: { start: number; end: number }[]; cmdsubs: { start: number; end: number }[] } {
  const strings: { start: number; end: number }[] = [];
  const cmdsubs: { start: number; end: number }[] = [];
  for (let k = from; k < to; k += 1) {
    if (s[k] === "$" && s[k + 1] === "(") {
      // known holds the inside, from after the ( to the ) that closes it.
      let inner = known.find((c) => c.start === k + 2);
      if (!inner) {
        const read = parseRegions(s.slice(k, to), "body").cmdsubs.find((c) => c.start === 2);
        inner = read ? { start: k + 2, end: k + read.end } : { start: k + 2, end: to };
      }
      cmdsubs.push(inner);
      k = inner.end;
      continue;
    }
    const quote = s[k];
    if (quote !== '"' && quote !== "'" && quote !== "`") continue;
    let end = k + 1;
    while (end < to && s[end] !== quote) end += s[end] === "\\" ? 2 : 1;
    strings.push({ start: k, end: Math.min(end + 1, to) });
    k = end;
  }
  return { strings, cmdsubs };
}

const cache = new WeakMap<LogicalEntry, SubstitutionModel>();

export function entrySubstitution(entry: LogicalEntry): SubstitutionModel {
  let model = cache.get(entry);
  if (model) return model;
  const contexts: SubContext[] = new Array<SubContext>(entry.text.length).fill("keyword");
  const inExpression: boolean[] = new Array<boolean>(entry.text.length).fill(false);
  const statements: ContextStatement[] = [];
  const issues: StructureIssue[] = [];
  model = { contexts, inExpression, statements, issues };
  const seen = new Set<string>();

  /**
   * `found`'s syntax issues, read in `src`, as offsets into `entry.text`. A fix is kept only where
   * `src` is the entry's own text unchanged: in a text an `/if` line handed on with its `%` runs
   * shortened, an edit wouldn't mean what it does there.
   */
  const collect = (src: Source, found: StructureIssue[]): void => {
    const base = src.map[0] as number;
    const plain = src.map.every((v, k) => v === base + k);
    // A run of `%`s an /if line shortened maps its first kept `%` to the one it dropped, so a range
    // covers what was written; a problem here starts at the kept one itself (`%%{x` marks `%{`),
    // just before whatever the next character maps to.
    const at = (start: number, end: number): { start: number; end: number } => {
      const own = src.map[start] as number;
      const next = src.map[start + 1];
      const from = end > start && next !== undefined ? Math.max(own, next - 1) : own;
      return { start: from, end: end > start ? Math.max(from + 1, (src.map[end - 1] as number) + 1) : from };
    };
    for (const issue of found) {
      if (!SYNTAX_KINDS.has(issue.kind)) continue;
      const { fix, related, ...rest } = issue;
      const out: StructureIssue = { ...rest, ...at(issue.start, issue.end) };
      if (related) out.related = related.map((n) => ({ ...n, ...at(n.start, n.end) }));
      if (fix && plain) out.fix = { ...fix, edits: fix.edits.map((e) => ({ ...e, start: e.start + base, end: e.end + base })) };
      const key = `${out.start}:${out.end}:${out.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(out);
    }
  };

  const mark = (src: Source, from: number, to: number, context: SubContext, expression = false): void => {
    for (let k = from; k < to; k += 1) {
      const at = src.map[k];
      if (at !== undefined && at < contexts.length) {
        contexts[at] = context;
        inExpression[at] = expression;
      }
    }
  };

  /**
   * Expressions, outer before inner, then the strings in each: a string in a condition or `$[...]`
   * is never substituted. A `$(...)` in an expression runs as a macro body (second review's e1-e3:
   * `/if ($(/echo "%{x}") =~ ...)` compares `"XV"`, at the top level too).
   */
  const expressions = (src: Source, list: ExpressionRegion[], known: { start: number; end: number }[]): void => {
    for (const ex of [...list].sort((a, b) => a.start - b.start || b.end - a.end)) {
      mark(src, ex.start, ex.end, "expression", true);
      const { strings, cmdsubs } = stringsIn(src.text, ex.start, ex.end, known);
      for (const str of strings) mark(src, str.start, str.end, ex.kind === "statement" ? (ex.level ?? "keyword") : "string", true);
      for (const c of cmdsubs) mark(src, c.start, c.end, "full");
    }
  };

  const sub = (src: Source, from: number, to = src.text.length): Source => ({
    text: src.text.slice(from, to),
    map: src.map.slice(from, to + 1),
  });

  /**
   * The text a macro builds from words of `src`, as a source of its own: each word maps to where it
   * is written, and the text around it to the start of the word after it (or the end of the one
   * before). Its map isn't a plain slice, so no fix is kept from it.
   */
  const built = (src: Source, parts: (string | { start: number; end: number })[]): Source => {
    let text = "";
    const map: number[] = [];
    parts.forEach((part, k) => {
      if (typeof part !== "string") {
        text += src.text.slice(part.start, part.end);
        for (let k = part.start; k < part.end; k += 1) map.push(src.map[k] as number);
        return;
      }
      const next = parts.slice(k + 1).find((p) => typeof p !== "string") as { start: number } | undefined;
      const prev = parts.slice(0, k).reverse().find((p) => typeof p !== "string") as { end: number } | undefined;
      const at = next ? (src.map[next.start] as number) : prev ? (src.map[prev.end - 1] as number) : (src.map[0] as number);
      text += part;
      for (let i = 0; i < part.length; i += 1) map.push(at);
    });
    map.push(map[map.length - 1] ?? (src.map[0] as number));
    return { text, map };
  };

  /**
   * A `/for`'s END, compiled where stdlib puts it: `/while ( VAR <= END )` (stdlib.tf). A problem
   * the parser finds in END itself is kept as it is. VAR is checked as a name, as the `/let` stdlib
   * runs first reads one, and one the parser finds inside VAR isn't said again here. One
   * it reports at the text around them (a `)` of stdlib's that END's own `(` or `$[` takes, say) is
   * no character the file holds, so it is said of the word that leaves the condition open: END if
   * END alone isn't a whole expression, else VAR if VAR alone isn't (review rev-s2d f2.tf: tf
   * rejects `/for j( 1 2`), else of neither.
   */
  const forEnd = (h: Source, name: { start: number; end: number }, to: { start: number; end: number }): void => {
    // A body, as stdlib has, so a ) END leaves over starts it rather than meeting /done.
    const wrapped = built(h, ["/while ( ", name, " <= ", to, " ) x%; /done"]);
    const nameStart = "/while ( ".length;
    const nameEnd = nameStart + (name.end - name.start);
    const endStart = nameEnd + " <= ".length;
    const endEnd = endStart + (to.end - to.start);
    // Whether a word, compiled as an expression of its own (a top-level /test is compiled as written), is whole.
    const whole = (word: { start: number; end: number }): boolean =>
      !parseRegions(`/test ${h.text.slice(word.start, word.end)}`, "top").issues.some((i) => i.kind === "expression" || i.kind === "substitution");
    const blame = (start: number, end: number, what: string, advice: string): StructureIssue => {
      const written = wrapped.text.slice(start, end);
      return {
        kind: "expression",
        start,
        end,
        message: `This /for's ${what}, ${written}, isn't a complete ${what === "END" ? "expression" : "variable name"}: ${advice}.`,
        label: `not a complete ${what === "END" ? "expression" : "name"}`,
        explanation:
          `stdlib's ${code("/for")} compares the loop variable with END in a condition, ${code("/while ( VAR <= END )")}, ` +
          `so each has to be whole on its own. This one leaves something open that the condition around it would ` +
          `have to close.`,
      };
    };
    const kept: StructureIssue[] = [];
    let said = false;
    // tf's /let takes a name as spanvar() reads one (variable.c): `/for j) 1 2` is "illegal variable
    // name: j)" (proven, review rev-s2e). A VAR with a substitution in it may make a name at run time.
    const varName = h.text.slice(name.start, name.end);
    if (!/[%$\\{]/.test(varName) && !/^[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*$/.test(varName)) {
      kept.push({
        ...blame(nameStart, nameEnd, "variable", "write a name, such as i"),
        explanation:
          `stdlib's ${code("/for")} sets the loop variable with ${code("/let VAR=START")}, and tf takes only a name ` +
          `there: letters, digits and ${code("_")}, not starting with a digit.`,
      });
      said = true;
    }
    for (const issue of parseRegions(wrapped.text, "body").issues) {
      if (issue.kind === "empty-statement") continue;
      if (issue.start >= endStart && issue.start < endEnd) kept.push(issue);
      else if (issue.start >= nameStart && issue.start < nameEnd) continue;
      else if (!said) {
        said = true;
        if (!whole(to)) kept.push(blame(endStart, endEnd, "END", "write a number, or an expression that closes"));
        else if (!whole(name)) kept.push(blame(nameStart, nameEnd, "variable", "write a name, such as i"));
      }
    }
    collect(wrapped, kept);
  };

  /**
   * `src.text`, read as `mode` reads it; later (inner) reads overwrite earlier ones. `issues`
   * false for a read that only marks how the text is substituted, not how it is compiled.
   */
  const read = (src: Source, mode: StructureMode, depth: number, viaEval: EvalLevel | undefined, issues = true): void => {
    const s = src.text;
    const regions = parseRegions(s, mode);
    if (issues) collect(src, regions.issues);
    if (mode === "body") {
      mark(src, 0, s.length, "full");
      expressions(src, regions.expressions, regions.cmdsubs);
      return;
    }
    // Where the text is split into statements, `%;` separates: it is read at the newline level.
    const split = mode === "newline" || regions.blocks.length > 0 || regions.statements.length > 1;
    mark(src, 0, s.length, split ? "newline" : "keyword");
    for (const st of regions.statements) {
      mark(src, st.start, st.end, st.level);
      const word = commandWord(s, st.start);
      const out: ContextStatement = {
        start: src.map[st.start] as number,
        end: st.end > st.start ? (src.map[st.end - 1] as number) + 1 : (src.map[st.start] as number),
        level: st.level,
        word,
      };
      if (viaEval) out.viaEval = viaEval;
      statements.push(out);
      if (depth >= MAX_DEPTH) continue;
      const argStart = st.start + (word ? (COMMAND_RE.exec(s.slice(st.start))?.[0].length ?? 0) : 0);
      // What the command is handed: a plain line as written, an /if line with its % runs shortened.
      const handed = (from: number): Source => (st.level === "newline" ? shortened(src, from, st.end) : sub(src, from, st.end));
      if (MACRO_DEFINER.test(word)) {
        const body = macroBodyStart(s.slice(st.start, st.end));
        if (body >= 0) {
          out.body = src.map[st.start + body] as number;
          read(handed(st.start + body), "body", depth + 1, undefined);
        }
      } else if (word === "for") {
        // VAR START END COMMAND: all substituted, and COMMAND is a macro body of its own, whose
        // conditions are read as conditions (second review's g1: G4 printed %{x}). Read as one body,
        // the whole text has COMMAND mid-statement, where an /if (...) is no condition (review rev-s2
        // p3), so that read's issues aren't kept. stdlib compiles each word where it puts it
        // (stdlib.tf: `/@eval /let %1=%2%%; /while ( %1 <= %3 ) %-3...`), so each is read there.
        const h = handed(argStart);
        read(h, "body", depth + 1, undefined, false);
        const words: { start: number; end: number }[] = [];
        for (let w = nextWord(h.text, 0, h.text.length); w && words.length < 4; w = nextWord(h.text, w.end, h.text.length)) words.push(w);
        const [name, from, to, command] = words;
        if (name && from) read(built(h, ["/let ", name, "=", from]), "body", depth + 1, undefined);
        if (name && to) forEnd(h, name, to);
        if (command) read(sub(h, command.start), "body", depth + 1, undefined);
      } else if (word === "repeat") {
        const h = handed(argStart);
        const r = repeatArguments(h.text, 0, h.text.length);
        if (r) read(sub(h, r.command), "body", depth + 1, undefined);
      } else if (word === "at") {
        const h = handed(argStart);
        const command = atCommand(h.text, 0, h.text.length);
        if (command !== undefined) read(sub(h, command), "body", depth + 1, undefined);
      } else if (word === "quote" || word === "eval") {
        const h = handed(argStart);
        const r = word === "quote" ? quoteCommand(h.text, 0, h.text.length) : evalArguments(h.text, 0, h.text.length);
        if (!r) continue;
        const [from, to] = "text" in r ? [r.text, h.text.length] : [r.start, r.end];
        const options = r.options.map((o) => ({ start: h.map[o.start] as number, end: (h.map[o.end - 1] as number) + 1, whole: o.whole }));
        read(sub(h, from, to), r.mode, depth + 1, r.mode === "body" ? undefined : { command: word, mode: r.mode, options });
      }
    }
    // A /test, /return or /result is a statement too, though its text is an expression.
    for (const ex of regions.expressions) {
      if (ex.kind !== "statement") continue;
      let start = ex.start;
      while (start > 0 && isTfSpace(s[start - 1])) start -= 1;
      while (start > 0 && s[start] !== "/") start -= 1;
      const out: ContextStatement = {
        start: src.map[start] as number,
        end: ex.end > start ? (src.map[ex.end - 1] as number) + 1 : (src.map[start] as number),
        level: ex.level ?? "keyword",
        word: commandWord(s, start),
      };
      if (viaEval) out.viaEval = viaEval;
      statements.push(out);
    }
    // Expressions last: what is evaluated as an expression is read so wherever it sits.
    expressions(src, regions.expressions, regions.cmdsubs);
  };

  read({ text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) }, "top", 0, undefined);
  cache.set(entry, model);
  return model;
}
