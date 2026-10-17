import { getDiagnostics } from "./diagnostics";
import { continuesToNextLine, isBlankLine, isCommentLine, isTfSpace, leadingWhitespaceLength, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import type { Range } from "./symbols";
import { macroBodyStart, parseLayout, type Layout, type StructureIssue } from "./structure";

/**
 * Formatting that cannot change what tf runs.
 *
 * The layout: a macro body (`/def`, `/bind`, `/hook`, `/trig*`, `/alias`...) starts on the line
 * after its head, which ends `= \`; each statement goes on a line of its own ending `%;\`, the last
 * with no `%;`; `/if`, `/elseif`, `/while` and `/else` start a block whose children sit one level
 * deeper, and `/endif` and `/done` line up with the keyword that opened them. A macro's line
 * breaks are the formatter's: the author's inside a statement are joined, a body of one statement
 * stays on its head's line when it fits, and a line over `maxWidth` is broken where it can be
 * (wrapLines(), breakPoints()). A line that continues a statement hangs two levels past it. A
 * top-level `/if` or `/while` block is re-indented the same way, keeping its author's breaks;
 * other top-level commands are left as written.
 *
 * What makes that safe, each proven against real tf or its source (tinyfugue/src):
 *  - tf strips the leading whitespace of every line it reads, continuation lines included, and a
 *    trailing `\` joins the next line, removing only the `\` (command.c's do_file_load()). So
 *    indentation is free, and a break inserted right after whitespace (`/if (x) \`) or after a
 *    `%;` joins back to the same text, but for the whitespace that followed the `%;`.
 *  - In a macro body, whitespace after a `%;` that separates statements is skipped before the next
 *    statement is compiled (expand.c's list(): `eat_space()` after the separator, and the blanks
 *    skipped at the top of the statement loop). Whitespace before it is cut from the statement's
 *    text (expand(): "nuke spaces before %;"), and a keyword statement (`/else`, `/endif`, `/done`)
 *    or a condition skips its own trailing blanks. Real tf ran a body written `x   %;   y` and
 *    `x%;y` the same for /echo, text sent to the world, /set, /let, /setenv, /test, /return,
 *    /result, /if, /elseif, /else, /while, /break, nested /if bodies, a nested /def (whose body is
 *    stored without the blanks) and a `%%;` one level down (2026-10-16).
 *  - Not every `%;` separates: one inside a string or `(...)` of an expression (`/if ("a%; b")`,
 *    `$[strlen("a%;  b")]`) is text, and the blanks after it count. Quotes matter nowhere else
 *    (topLevelSeparators()). Only the separators that both tf's model (structure.ts) and that
 *    bracket-wary scan agree on are touched, and only in the body itself: not inside a `$(...)`
 *    or a `/if list /then` condition list.
 *  - Dropping the blanks before a `%;` can glue it to what precedes: `50% %;` would become `50%%;`
 *    (text), and `x\ %;` would become `x\%;` (an escaped `%`); both proven to change what runs. So
 *    those blanks stay after `%`, `\`, `$` and `/`.
 *  - tf turns a tab into spaces out to the next tab stop of its physical line (tfio.c), so a tab
 *    after a line's indentation changes width when its line moves; such entries are left alone.
 *  - `/def name = body`: the blanks around `=` don't matter (macro.c skips them before the body
 *    and trims them after the name), so a split /def's head becomes `/def name = \` however it was
 *    spaced (`/def x=/echo` included); `/list` printed the same definition for every spacing of
 *    the head, options (`-p10 -mglob -t"a = b"`) included.
 *
 * What it guarantees: the definitions tf stores are the same, except that blanks next to the `%;`
 * separators above may be gone. Whatever reads a body back as text sees that difference: `/list`
 * and `$(/list)`, `/save`, `/edit`, a `${name}` substitution (`/echo [${name}]` prints the body,
 * which is how alias.tf's ~listalias shows an alias), and `%mecho` showing each command as it
 * runs. Running the macro is the same.
 *
 * What it leaves exactly as written, a whole entry at a time: files with CRLF line endings (where
 * `\` never continues a line); an entry the file ends in the middle of; one with a `%\`, a `\`
 * followed by blanks, a tab after a line's indentation, or a U+FFFD (a byte that wasn't UTF-8); one whose structure tf would reject or that the checks flag
 * (an unbalanced /if, an empty statement, any error diagnostic); one with a block keyword in the
 * middle of a statement, which tf reads as text (`/echo a /else /echo b`), unless that statement's
 * text is itself commands (`/eval /if ...`); and any layout that doesn't join back, the way tf
 * joins lines, to the same statements. An entry's first line is never moved: an indented one is
 * what tf's "possibly missing trailing \" warning is about. One with a comment or blank line among
 * its lines is only re-indented (reindentWithComments()).
 */

export interface FormatOptions {
  /** Spaces per indentation level. */
  indentWidth: number;
  /** Put each `%;`-separated statement of a macro body on its own line. Off: only re-indent. */
  splitStatements: boolean;
  /** The width a macro's lines are kept to where they can be broken (wrapLines()). */
  maxWidth: number;
}

/** Wil's style: two spaces, one statement per line, lines of at most 100 where they can be broken. */
export const DEFAULT_FORMAT_OPTIONS: Readonly<FormatOptions> = { indentWidth: 2, splitStatements: true, maxWidth: 100 };

/** One level of indentation: what formatting and the Split, Extract and Inline refactorings indent by. */
export function formatIndent(options: Partial<FormatOptions> = {}): string {
  return " ".repeat(options.indentWidth ?? DEFAULT_FORMAT_OPTIONS.indentWidth);
}

export interface FormatEdit {
  range: Range;
  newText: string;
}

/** Why an entry was left exactly as written. */
export type Refusal =
  | "incomplete"
  | "percent-backslash"
  | "space-after-backslash"
  | "tab"
  | "error"
  | "structure"
  | "keyword-mid-statement"
  | "replacement-character"
  | "unverified";

export interface EntryResult {
  startLine: number;
  endLine: number;
  changed: boolean;
  refused?: Refusal;
  /** A comment or blank line among its lines, so it was only re-indented (reindentWithComments()). */
  reindentOnly?: boolean;
}

export interface FormatResult {
  edits: FormatEdit[];
  /** Every entry looked at, in order; empty for a CRLF file. */
  entries: EntryResult[];
  /** The file has CRLF line endings, so nothing was changed. */
  crlf: boolean;
  /**
   * The text holds U+FFFD, so nothing was changed: it is what an editor shows for a byte that
   * wasn't UTF-8 (a Latin-1 file opened as UTF-8), and an edit would make the document dirty, to be
   * saved with EF BF BD in place of those bytes.
   */
  replacement?: boolean;
}

/**
 * Offsets of the `%` of every `%;` separator in `s` that is outside brackets, and not part of a
 * longer run of `%`s: tf copies a run of two or more whole, so `%%;` and `%%%;` are both text
 * (proven, `separator-literal-forms`). A quote only counts inside brackets: tf reads strings only
 * in an expression (expr.c's stringliteral()), and the text of a statement, `/test`'s and a nested
 * `-t"..."` option's included, is cut at each `%;` before anything parses it (expand.c's
 * expand() has no case for a quote). Real tf split `say don't%; say it's ok` in two, and
 * `/def -t"zz%; ..." x` in a body at the `%;`, but kept `/if ("it's%; x" =~ ...)` and
 * `$[strlen("a'%;b")]` whole (2026-10-16). Likewise a `[` or `{` only opens anything after a `$`
 * or `%` (`$[`, `${`, `%{`): `/echo [a%; /echo b]` and the `-b'^[x'` of a nested /def are cut at
 * their `%;` (proven the same day). Every `(` counts, so a `:-(` in text only ever means fewer
 * splits.
 */
export function topLevelSeparators(s: string): number[] {
  const out: number[] = [];
  let quote = "";
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i] as string;
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "%") {
      let n = 1;
      while (s[i + n] === "%") n += 1;
      if (n === 1 && s[i + n] === ";" && depth === 0) out.push(i);
      i += n - 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      if (depth > 0) quote = ch;
    } else if (ch === "(" || ("[{".includes(ch) && (depth > 0 || s[i - 1] === "$" || s[i - 1] === "%"))) depth += 1;
    else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
  }
  return out;
}

/** Blanks before a `%;` can go unless dropping them glues the `%;` to one of these (`50%%;`, `x\%;`). */
const GLUES = new Set(["%", "\\", "$", "/"]);

/**
 * The joined text with the whitespace beside each separator in the body removed: the parts of
 * an entry formatting may change. Two entries that normalise the same run the same. Blanks that
 * would glue a `%;` to a `%`, `\`, `$` or `/` before them are kept.
 */
export function normalise(joined: string, body: number): string {
  if (body < 0) return joined;
  const seps = topLevelSeparators(joined).filter((s) => s >= body);
  let out = "";
  let from = 0;
  for (const s of seps) {
    const before = joined.slice(from, s);
    const trimmed = before.replace(/[ \t\f\v]+$/, "");
    out += (trimmed.length < before.length && GLUES.has(trimmed[trimmed.length - 1] ?? "") ? before : trimmed) + "%;";
    from = s + 2;
    while (/[ \t\f\v]/.test(joined[from] ?? "")) from += 1;
  }
  return out + joined.slice(from);
}

/**
 * What formatting must keep of a macro entry's joined text: normalise()'s, with the blanks either
 * side of the head's `=` dropped too (macro.c trims them). Two entries with the same programText()
 * define the same macro.
 */
export function programText(joined: string, body: number): string {
  if (body < 0) return joined;
  const head = joined.slice(0, body - 1).replace(/[ \t\f\v]+$/, "");
  const rest = joined.slice(body).replace(/^[ \t\f\v]+/, "");
  return normalise(`${head}=${rest}`, head.length + 1);
}

/** The joined text tf reads from `lines`, which hold one entry. */
export function rejoin(lines: string[]): string {
  return splitLogicalEntries(lines.join("\n"))[0]?.text ?? "";
}

/**
 * tf turns each tab into spaces as it reads the file, out to the next tab stop counted from the
 * start of the physical line (tfio.c's tfgetS(), with %tabsize, whatever %expand_tabs says). A
 * tab after a line's indentation therefore becomes a different number of spaces when the line is
 * re-indented, split or joined: proven with lib/tf/quoter.tf's qmac, whose `[ <tab>]` is stored
 * as `[    ]` and became `[  ]` once re-indented. Tabs in the indentation itself become spaces
 * that are stripped anyway.
 */
export function hasInnerTab(lines: string[]): boolean {
  return lines.some((l) => !isCommentLine(l) && /\S[^\t]*\t/.test(l));
}

/** Issues that still leave the layout certain: a `$[...]` or `%{x}` as an expression operand only warns. */
const harmless = (issue: StructureIssue): boolean => issue.kind === "operand";

const parsedCleanly = (layout: Layout): boolean => !layout.stopped && layout.issues.every(harmless);

const MID_KEYWORD_RE = /\s\/@?(?:if|elseif|else|endif|while|do|done|then)(?![\w@])/i;

/** Commands whose text is itself commands, run later or at another level, where a keyword is at home. */
const NESTED_COMMANDS = /^(?:def|edit|bind|hook|trig|trigc|trigp|trigpc|alias|gag|hilite|eval|repeat|quote|at|for)$/;

/**
 * Whether a statement has a block keyword in the middle of its text (`/echo a /else /echo b`),
 * which tf reads as text: right, perhaps, but too easy to misread once laid out, so such entries
 * are left as written. Not in a command whose text holds commands (`/eval /if ...`, `/def x = /if
 * ...`), where the keyword starts a statement of the inner level, unless that statement runs over
 * several lines: its author has indented the inner blocks (stdlib.tf's `/for`), which one hanging
 * level would flatten. `breaks` are where `text`'s lines begin.
 */
function keywordMidStatement(text: string, layout: Layout, breaks: number[]): boolean {
  return layout.units.some((u) => {
    if (u.block || !MID_KEYWORD_RE.test(text.slice(u.start, u.end))) return false;
    return !NESTED_COMMANDS.test(u.word) || breaks.some((b) => u.start < b && b < u.end);
  });
}

/** Where the statements of `layout` (offsets shifted by `base`) start, after any blanks. */
function statementStarts(text: string, layout: Layout, base: number): Set<number> {
  const out = new Set<number>();
  for (const u of layout.units) out.add(u.start + base);
  for (const p of layout.partStarts) out.add(p + base);
  for (const s of layout.separators) {
    let q = s.at + base + 2;
    while (isTfSpace(text[q])) q += 1;
    out.add(q);
  }
  return out;
}

/** How many blocks of `layout` have `o` inside one of their parts (between a head and the next keyword). */
function depthAt(layout: Layout, base: number, o: number): number {
  return layout.blocks.filter((b) => b.parts.some((p) => p.start + base <= o && o < p.end + base)).length;
}

/** The statements' own text, blanks at either end dropped: what must not change. (A block's text holds its statements'.) */
function statementTexts(text: string, layout: Layout): string[] {
  return layout.units.filter((u) => !u.block).map((u) => `${u.word}:${text.slice(u.start, u.end).replace(/^[ \t]+|[ \t]+$/g, "")}`);
}

interface Plan {
  /** Offsets of the joined text where a new line starts. */
  cuts: Set<number>;
  /** Offsets of the joined text left out. */
  removed: Set<number>;
  /** Offsets of the joined text a blank goes in front of (at the end of the line before a cut). */
  spaced: Set<number>;
}

/**
 * Where to break the joined text of a macro entry, and what blanks to drop: after each separator
 * of the body itself, at each block part's first statement, and where the body starts. The
 * author's own breaks are not kept: the formatter decides them all (wrapLines() adds those a
 * long line needs). A body of one statement stays on its head's line when `moveBody` is false.
 */
function splitPlan(entry: LogicalEntry, body: number, layout: Layout, moveBody: boolean): Plan | undefined {
  const j = entry.text;
  const cuts = new Set<number>();
  const removed = new Set<number>();
  const spaced = new Set<number>();
  const safe = new Set(topLevelSeparators(j));
  const own = layout.separators.filter((sep) => sep.char === ";" && layout.lists[sep.list]?.kind === "body");
  // Where the two disagree (a `:-(` in text sent to the world), the body is only
  // re-indented: a layout split at some of its statements and not others would mislead.
  if (own.some((sep) => !safe.has(sep.at + body))) return undefined;

  for (const sep of own) {
    const at = sep.at + body;
    let q = at + 2;
    while (isTfSpace(j[q])) q += 1;
    let r = at;
    while (r > body && isTfSpace(j[r - 1])) r -= 1;
    if (r < at && r > body && !GLUES.has(j[r - 1] as string)) for (let k = r; k < at; k += 1) removed.add(k);
    for (let k = at + 2; k < q; k += 1) removed.add(k);
    // A %; that ends the body stays on its last line: breaking after it would continue the last
    // line onto whatever follows the entry.
    if (q < j.length) cuts.add(q);
  }
  for (const p0 of layout.partStarts) {
    const p = p0 + body;
    // Only after a blank, which stays at the end of the line before (`/if (x) \`), so the line
    // joins back the same; not where a %; follows straight away (`/else%;`).
    if (p >= j.length || !isTfSpace(j[p - 1]) || /^%[;|]/.test(j.slice(p))) continue;
    cuts.add(p);
  }
  let first = body;
  while (isTfSpace(j[first])) first += 1;
  if (first < j.length && (cuts.size > 0 || moveBody)) {
    cuts.add(first);
    let name = body - 1;
    if (entry.isDefBody) {
      // A /def's head ends ` = \` however it was spaced: macro.c trims the blanks after the name
      // and skips those before the body, and /list printed the same definition every way.
      while (name > 0 && isTfSpace(j[name - 1])) name -= 1;
      for (let k = name; k < body - 1; k += 1) removed.add(k);
      for (let k = body; k < first; k += 1) removed.add(k);
      spaced.add(body - 1);
      spaced.add(first);
    }
  }
  return { cuts, removed, spaced };
}

/** Commands whose text is text: printed or sent as it is, so it may break at any blank between its words. */
const TEXT_COMMAND_RE = /^\/@?(?:echo|_echo|send)(?![^ \t%])/i;
/** A statement that starts a condition in parentheses. */
const CONDITION_RE = /^\/@?(?:if|elseif|while)[ \t]*\(/i;

/**
 * Where a line running from `from` to `to` in the joined text `j` may break, by what it holds:
 * a macro's head between its words (outside quotes, which group an option's value); a condition
 * before an `&` or `|` of its own; text sent or printed at a blank between words (outside any
 * `$[...]`, `${...}`, `%{...}`, `@{...}` or `$(...)`); and a command whose text is commands (a
 * nested /def, say) after a `%%;` of that inner level, or else between its words. Anything else
 * isn't broken. Each place is the first character of the new line, right after a blank, which
 * stays at the end of the line before, so tf joins the lines back to the same text; never a `;` or
 * `#`, which would make the new line a comment tf skips, nor a `%;` or `%|` (`removed` blanks don't
 * count). `first` are the places to break at; `then`, where none of those fits, the next best.
 */
function breakPoints(j: string, from: number, to: number, head: boolean, removed: Set<number>): { first: number[]; then: number[] } {
  const out: number[] = [];
  const ok = (o: number): boolean =>
    isTfSpace(j[o - 1]) && !removed.has(o - 1) && !isTfSpace(j[o]) && j[o] !== ";" && j[o] !== "#" && !/^%[;|]/.test(j.slice(o)) && j[o - 2] !== "\\";
  let s = from;
  while (isTfSpace(j[s])) s += 1;
  const stmt = j.slice(s, to);
  // Between words after the command's own, not inside a quoted option value.
  const words = (): number[] => {
    const at: number[] = [];
    let quote = "";
    let started = false;
    for (let o = s; o < to; o += 1) {
      const ch = j[o] as string;
      if (quote) {
        if (ch === "\\") o += 1;
        else if (ch === quote) quote = "";
      } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (started && ok(o)) at.push(o);
      else if (isTfSpace(ch)) started = true;
    }
    return at;
  };
  if (head) return { first: words(), then: [] };
  if (CONDITION_RE.test(stmt)) {
    let o = j.indexOf("(", s);
    let depth = 0;
    let quote = "";
    for (; o < to; o += 1) {
      const ch = j[o] as string;
      if (quote) {
        if (ch === "\\") o += 1;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      } else if (depth === 1 && (ch === "&" || ch === "|") && ok(o)) out.push(o);
    }
    return { first: out, then: [] };
  }
  const word = /^\/@?([A-Za-z_]\w*)/.exec(stmt)?.[1]?.toLowerCase();
  if (word && NESTED_COMMANDS.test(word)) {
    // Where a nested macro's body starts, then after each of its own %%;.
    const inner = macroBodyStart(stmt);
    if (inner > 0) {
      let o = s + inner;
      while (isTfSpace(j[o])) o += 1;
      if (o < to && ok(o)) out.push(o);
    }
    for (let o = s; o < to; o += 1) {
      if (!ok(o)) continue;
      let p = o - 1;
      while (p > s && isTfSpace(j[p])) p -= 1;
      let n = 0;
      while (j[p - 1 - n] === "%") n += 1;
      if (j[p] === ";" && n >= 2) out.push(o);
    }
    return { first: out, then: words() };
  }
  if (!TEXT_COMMAND_RE.test(stmt) && stmt.startsWith("/")) return { first: [], then: [] };
  // Text: after the command and its options, at a blank between words, outside substitutions.
  let o = s;
  if (stmt.startsWith("/")) {
    while (o < to && !isTfSpace(j[o])) o += 1;
    for (;;) {
      let w = o;
      while (isTfSpace(j[w])) w += 1;
      if (j[w] !== "-" || !/[A-Za-z]/.test(j[w + 1] ?? "")) break;
      o = w;
      while (o < to && !isTfSpace(j[o])) o += 1;
    }
  }
  let depth = 0;
  let quote = "";
  for (; o < to; o += 1) {
    const ch = j[o] as string;
    if (quote) {
      if (ch === "\\") o += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "\\") {
      o += 1;
      continue;
    }
    if (depth > 0) {
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if ("([{".includes(ch)) depth += 1;
      else if (")]}".includes(ch)) depth -= 1;
      continue;
    }
    if ("$%@".includes(ch) && "([{".includes(j[o + 1] ?? "")) {
      depth = 1;
      o += 1;
      continue;
    }
    if (ok(o)) out.push(o);
  }
  return { first: out, then: [] };
}

/** The text of the joined offsets `from` to `to` as `plan` lays it out on one line (cutLines()'s rules). */
function piece(j: string, plan: Plan, from: number, to: number): string {
  let out = "";
  for (let o = from; o < to; o += 1) {
    if (o > from && plan.spaced.has(o)) out += " ";
    if (!plan.removed.has(o)) out += j[o];
  }
  if (to > from && plan.spaced.has(to)) out += " ";
  return out;
}

/**
 * Adds to `plan` the breaks that keep each line within `maxWidth`, where the line has places to
 * break (breakPoints()): as much on each line as fits, the rest hanging two levels past the
 * statement's own line. A line with no place that fits keeps the shortest overflow it can, and no
 * break is made that leaves the rest as long as it was (a command cut off from one long word).
 * `widthOf(o)` is the indentation of a line starting at `o`. `head` is where the head of a macro
 * ends (-1 for none).
 */
function wrapLines(j: string, plan: Plan, maxWidth: number, head: number, widthOf: (o: number) => number): void {
  const starts = [...plan.cuts].filter((c) => c > 0 && c < j.length).sort((a, b) => a - b);
  const bounds = [0, ...starts, j.length];
  for (let k = 0; k + 1 < bounds.length; k += 1) {
    const from = bounds[k] as number;
    const to = bounds[k + 1] as number;
    const fits = (a: number, b: number, lead: number): boolean => lead + piece(j, plan, a, b).length + (b === j.length ? 0 : 1) <= maxWidth;
    if (fits(from, to, widthOf(from))) continue;
    const { first, then } = breakPoints(j, from, to, head >= 0 && from < head, plan.removed);
    let at = from;
    let lead = widthOf(from);
    while (!fits(at, to, lead)) {
      // The last place that fits, of the first kind if one does; else the nearest overflow.
      const fitting = (points: number[]) => points.filter((p) => p > at && fits(at, p, lead));
      const best = fitting(first).pop() ?? fitting(then).pop() ?? [...first, ...then].filter((p) => p > at).sort((a, b) => a - b)[0];
      if (best === undefined) break;
      // A break with nothing after it to break at, whose rest still doesn't fit, gains nothing.
      if (!fits(best, to, widthOf(best)) && ![...first, ...then].some((p) => p > best)) break;
      plan.cuts.add(best);
      at = best;
      lead = widthOf(best);
    }
  }
}

/** The joined text cut into lines by `plan`, without indentation or `\`, and where in it each line starts. */
function cutLines(j: string, plan: Plan): { contents: string[]; starts: number[] } {
  const contents: string[] = [];
  const starts = [0];
  let line = "";
  for (let o = 0; o <= j.length; o += 1) {
    if (plan.spaced.has(o)) line += " ";
    if (plan.cuts.has(o) && o > 0 && o < j.length) {
      contents.push(line);
      starts.push(o);
      line = "";
    }
    if (o < j.length && !plan.removed.has(o)) line += j[o];
  }
  contents.push(line);
  return { contents, starts };
}

/** The joined text the plan should read back as. */
function expectedText(j: string, plan: Plan): string {
  let out = "";
  for (let o = 0; o < j.length; o += 1) {
    if (plan.spaced.has(o)) out += " ";
    if (!plan.removed.has(o)) out += j[o];
  }
  return out;
}

/** Whether a tab in `original` would change width: anywhere after a line's indentation, except in the first line's head. */
function tabMoves(original: string[], entry: LogicalEntry, body: number): boolean {
  if (hasInnerTab(original.slice(1))) return true;
  const firstLine = original[0] ?? "";
  const lead = leadingWhitespaceLength(firstLine);
  const tab = firstLine.indexOf("\t", lead);
  // The head stays where it is; from the body on, the first line's text may move.
  return tab >= 0 && (body < 0 || tab - lead >= body);
}

/** Whether a comment or blank line is among an entry's lines (after its first). */
export function hasCommentOrBlank(original: string[]): boolean {
  return original.some((l, i) => i > 0 && (isCommentLine(l) || isBlankLine(l)));
}

/** A line starting with one of these closes or divides a block, so a comment just before it is still inside. */
const CLOSER_RE = /^\/@?(?:endif|else|elseif|done|then|do)(?![\w@])/i;

/**
 * An entry with a comment or blank line among its lines, re-indented only: no text moves and no
 * statement is split. tf skips a comment line inside a continuation and a blank line ends one
 * (do_file_load()), so the code lines alone are the entry; they are laid out with splitting off,
 * and each comment line goes back between them at the depth of the block it sits in: the next
 * code line's, or one deeper when that line closes or divides the block (a comment before
 * `/endif` stays in the `/else` branch). A comment's own text is kept; blank lines are kept as
 * they are. Real tf stored every corpus entry laid out this way exactly as before (2026-10-16).
 */
function reindentWithComments(entry: LogicalEntry, original: string[], indent: string): string[] | Refusal {
  const kinds = original.map((l, i) => (i > 0 && isCommentLine(l) ? "comment" : i > 0 && isBlankLine(l) ? "blank" : "code"));
  const code = original.filter((_, i) => kinds[i] === "code");
  // Only the last line can be blank: a blank line ends the entry, after a final `\`.
  const endsOnBlank = kinds[kinds.length - 1] === "blank";
  if (kinds.slice(0, -1).includes("blank") || code.length === 0) return "unverified";
  const input = endsOnBlank ? [...code.slice(0, -1), (code[code.length - 1] as string).replace(/\\$/, "")] : code;
  const alone = splitLogicalEntries(input.join("\n"))[0];
  if (!alone || alone.text !== entry.text || alone.incomplete) return "unverified";
  const laid = layoutEntry(alone, input, indent, false);
  if (typeof laid === "string") return laid;
  // A plain top-level command keeps its author's indentation, comment lines included. (Code lines
  // already laid out in a macro body or a block still have their comment lines re-indented.)
  const macro = entry.isDefBody || entry.isOtherMacroBody;
  if (!macro && parseLayout(entry.text, "top").blocks.length === 0) return original;
  if (laid.length !== input.length) return "unverified";
  if (endsOnBlank) laid[laid.length - 1] += "\\";
  const out: string[] = [];
  let k = 0;
  original.forEach((l, i) => {
    if (kinds[i] === "code") out.push(laid[k++] as string);
    else if (kinds[i] === "blank") out.push(l);
    else {
      const next = laid[k] ?? laid[k - 1] ?? "";
      const lead = next.slice(0, leadingWhitespaceLength(next));
      out.push(lead + (CLOSER_RE.test(next.slice(lead.length)) ? indent : "") + l.slice(leadingWhitespaceLength(l)));
    }
  });
  // The same text for tf: every comment still a comment, every other line where it was.
  if (out.some((l, i) => (kinds[i] === "comment") !== (i > 0 && isCommentLine(l)))) return "unverified";
  if (rejoin(out) !== entry.text) return "unverified";
  return out;
}

/**
 * One entry laid out, as its new physical lines, or why it is left as written. `original` holds
 * its physical lines; `indent` is one level; `split` puts a macro body's statements on lines of
 * their own (off: only re-indent).
 */
export function layoutEntry(entry: LogicalEntry, original: string[], indent: string, split: boolean, maxWidth: number = DEFAULT_FORMAT_OPTIONS.maxWidth): string[] | Refusal {
  if (entry.incomplete) return "incomplete";
  if (original.some((l) => l.includes("%\\"))) return "percent-backslash";
  if (original.some((l) => /\\[ \t\f\v]+$/.test(l))) return "space-after-backslash";
  // U+FFFD is what a byte that wasn't UTF-8 became on the way in; writing it back would lose it.
  if (original.some((l) => l.includes("\uFFFD"))) return "replacement-character";
  if (hasCommentOrBlank(original)) return reindentWithComments(entry, original, indent);

  const j = entry.text;
  const macro = entry.isDefBody || entry.isOtherMacroBody;
  const body = macro ? macroBodyStart(j) : -1;
  if (tabMoves(original, entry, body)) return "tab";

  const top = parseLayout(j, "top");
  if (!parsedCleanly(top)) return "structure";
  const inner = body >= 0 ? parseLayout(j.slice(body), "body") : undefined;
  if (inner && !parsedCleanly(inner)) return "structure";
  const authorBreaks: number[] = [];
  let offset = 0;
  for (const part of entry.parts.slice(0, -1)) {
    offset += part.text.length;
    authorBreaks.push(offset);
  }
  const midKeyword = inner
    ? keywordMidStatement(
        j.slice(body),
        inner,
        authorBreaks.map((b) => b - body),
      )
    : keywordMidStatement(j, top, authorBreaks);
  if (midKeyword) return "keyword-mid-statement";
  // A plain top-level command (`/set x=\`, `/for i 0 2 \`) keeps the author's indentation: nested
  // /for lines read better as written than at one level. Only a top-level block is re-indented.
  if (!inner && top.blocks.length === 0) return original;
  const firstIndent = (original[0] ?? "").slice(0, leadingWhitespaceLength(original[0] ?? ""));
  let split1 = inner && split ? splitPlan(entry, body, inner, false) : undefined;
  // A body of one statement moves to the line after its head only when the whole, laid out on one
  // line (the blanks it drops gone, a /def's head ending ` = `), is wider than maxWidth; one that
  // fits only that way stays on one line, laid out so, and so reads the same formatted again.
  if (split1 && split1.cuts.size === 0 && firstIndent.length + expectedText(j, split1).length > maxWidth) {
    const moved = splitPlan(entry, body, inner as Layout, true) as Plan;
    split1 = firstIndent.length + expectedText(j, moved).length > maxWidth ? moved : { ...moved, cuts: new Set() };
  }
  // Only a body laid out afresh is wrapped; one only re-indented keeps the author's breaks.
  const wrap = split1 !== undefined;
  const plan: Plan = split1 ?? {
    cuts: new Set(authorBreaks),
    removed: new Set(),
    spaced: new Set(),
  };

  const layout = inner ?? top;
  const base = inner ? body : 0;
  const stmtStarts = statementStarts(j, layout, base);
  let first = body;
  if (inner) {
    while (isTfSpace(j[first])) first += 1;
    stmtStarts.add(first);
  }
  // A line of a macro's head hangs two levels in; in the body, a statement is one level in, more
  // in each block, and a line that continues one hangs two levels past it, so that it never lines
  // up with a block's first statement.
  const statementLevel = (o: number): number => (inner ? 1 : 0) + depthAt(layout, base, o);
  const levelAt = (o: number): number => (inner && o < body ? 2 : statementLevel(o) + (stmtStarts.has(o) ? 0 : 2));
  if (wrap) {
    const width = indent.length;
    wrapLines(
      j,
      plan,
      maxWidth,
      first,
      (o) => (o === 0 ? firstIndent.length : levelAt(o) * width),
    );
  }
  const { contents, starts } = cutLines(j, plan);
  const lines = contents.map((content, i) => {
    const end = i < contents.length - 1 ? "\\" : "";
    if (i === 0) return `${firstIndent}${content}${end}`;
    return `${indent.repeat(levelAt(starts[i] as number))}${content}${end}`;
  });

  // The proof that this layout is the same program: no line tf would skip or end on, the same
  // joined text but for the dropped blanks, and the same statements.
  if (lines.some((l, i) => i > 0 && (isBlankLine(l) || isCommentLine(l)))) return "unverified";
  if (lines.some((l, i) => i < lines.length - 1 !== continuesToNextLine(l))) return "unverified";
  const joined = rejoin(lines);
  if (joined !== expectedText(j, plan)) return "unverified";
  if (inner) {
    // The head's blanks may have changed, so the body is found again.
    const body2 = macroBodyStart(joined);
    if (body2 < 0 || programText(joined.slice(0, body2), body2) !== programText(j.slice(0, body), body)) return "unverified";
    const again = parseLayout(joined.slice(body2), "body");
    if (!parsedCleanly(again)) return "unverified";
    if (again.separators.length !== inner.separators.length || again.blocks.length !== inner.blocks.length) return "unverified";
    if (statementTexts(joined.slice(body2), again).join("\n") !== statementTexts(j.slice(body), inner).join("\n")) return "unverified";
  }
  return lines;
}

/**
 * The entry's macro body laid out one statement per line, each block's children indented, or
 * undefined when it has nothing to split or the layout would not join back to the same program.
 * `original` holds the entry's physical lines. (For the split refactoring. A tab in the head
 * stays put here, so `headTabs` changes nothing; it is kept for the callers.)
 */
export function splitEntry(entry: LogicalEntry, original: string[], indent: string, _opts: { headTabs?: boolean } = {}): string[] | undefined {
  if (!(entry.isDefBody || entry.isOtherMacroBody)) return undefined;
  const laid = layoutEntry(entry, original, indent, true);
  if (typeof laid === "string" || laid.length === original.length) return undefined;
  return laid;
}

/** The lines of every error diagnostic, whose entries are left as written. */
function errorLines(text: string): Set<number> {
  const out = new Set<number>();
  for (const d of getDiagnostics(text, { joinFixes: false })) {
    if (d.severity !== "error") continue;
    for (let l = d.range.start.line; l <= d.range.end.line; l += 1) out.add(l);
  }
  return out;
}

/** Every entry formatted (or those `range` touches), with why each one left alone was. */
export function formatDocument(text: string, options: Partial<FormatOptions> = {}, range?: Range): FormatResult {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  if (text.includes("\r")) return { edits: [], entries: [], crlf: true };
  if (text.includes("\uFFFD")) return { edits: [], entries: [], crlf: false, replacement: true };
  const indent = formatIndent(opts);
  const lines = splitRawLines(text);
  const errors = errorLines(text);
  const edits: FormatEdit[] = [];
  const entries: EntryResult[] = [];
  for (const entry of splitLogicalEntries(text)) {
    if (range && (entry.endLine < range.start.line || entry.startLine > range.end.line)) continue;
    // A selection of whole lines ends at the start of the line after them, which isn't selected.
    if (range && range.end.character === 0 && range.end.line > range.start.line && entry.startLine === range.end.line) continue;
    const at = { startLine: entry.startLine, endLine: entry.endLine };
    const original = lines.slice(entry.startLine, entry.endLine + 1);
    let hasError = false;
    for (let l = entry.startLine; l <= entry.endLine; l += 1) if (errors.has(l)) hasError = true;
    const laid = hasError ? "error" : layoutEntry(entry, original, indent, opts.splitStatements, opts.maxWidth);
    if (typeof laid === "string") {
      entries.push({ ...at, changed: false, refused: laid });
      continue;
    }
    const changed = laid.join("\n") !== original.join("\n");
    entries.push({ ...at, changed, ...(hasCommentOrBlank(original) ? { reindentOnly: true } : {}) });
    if (!changed) continue;
    const last = original[original.length - 1] ?? "";
    edits.push({
      range: { start: { line: entry.startLine, character: 0 }, end: { line: entry.endLine, character: last.length } },
      newText: laid.join("\n"),
    });
  }
  return { edits, entries, crlf: false };
}

/** The edits that format `text` (or the entries `range` touches), as whole-line replacements. */
export function formatText(text: string, options: Partial<FormatOptions> = {}, range?: Range): FormatEdit[] {
  return formatDocument(text, options, range).edits;
}

/** `text` with `edits` (whole-line replacements, as formatText() makes them) applied. */
export function applyFormatEdits(text: string, edits: FormatEdit[]): string {
  const lines = splitRawLines(text);
  for (const e of [...edits].sort((a, b) => b.range.start.line - a.range.start.line)) {
    lines.splice(e.range.start.line, e.range.end.line - e.range.start.line + 1, ...e.newText.split("\n"));
  }
  return lines.join("\n");
}
