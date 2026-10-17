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
 * deeper, and `/endif` and `/done` line up with the keyword that opened them. A line that continues
 * a statement (a break the author made) hangs one level deeper still. Top-level commands that
 * aren't macro definitions only have their continuation lines re-indented.
 *
 * What makes that safe, each proven against real tf or its source (tinyfugue/src):
 *  - tf strips the leading whitespace of every line it reads, continuation lines included, and a
 *    trailing `\` joins the next line, removing only the `\` (command.c's load_file()). So
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
 *    `$[strlen("a%;  b")]`) is text, and the blanks after it count. Only the separators that both
 *    tf's model (structure.ts) and a quote- and bracket-wary scan (topLevelSeparators()) agree on
 *    are touched, and only in the body itself: not inside a `$(...)` or a `/if list /then`
 *    condition list.
 *  - Dropping the blanks before a `%;` can glue it to what precedes: `50% %;` would become `50%%;`
 *    (text), and `x\ %;` would become `x\%;` (an escaped `%`); both proven to change what runs. So
 *    those blanks stay after `%`, `\`, `$` and `/`.
 *  - tf turns a tab into spaces out to the next tab stop of its physical line (tfio.c), so a tab
 *    after a line's indentation changes width when its line moves; such entries are left alone.
 *  - `/def name = body`: the blanks around `=` don't matter (macro.c skips them before the body
 *    and trims them after the name), so `/def x=/echo` may become `/def x= \` then `/echo` on the
 *    next line; `/list` printed the same definition for every spacing of the head, options
 *    (`-p10 -mglob -t"a = b"`) included.
 *
 * What it guarantees: the definitions tf stores are the same, except that blanks next to the `%;`
 * separators above may be gone. Anything that reads a body as text, `/list`, `$(/list)`, `/edit`,
 * or `%mecho` showing each command as it runs, sees that difference; nothing else does.
 *
 * What it leaves exactly as written, a whole entry at a time: files with CRLF line endings (where
 * `\` never continues a line); an entry the file ends in the middle of; one with a comment or blank
 * line among its lines, a `%\`, a `\` followed by blanks, or a tab after a line's indentation; one
 * whose structure tf would reject or that the checks flag (an unbalanced /if, an empty statement,
 * any error diagnostic); one with a block keyword in the middle of a statement, which tf reads as
 * text (`/echo a /else /echo b`); and any layout that doesn't
 * join back, the way tf joins lines, to the same statements. An entry's first line is never moved:
 * an indented one is what tf's "possibly missing trailing \" warning is about.
 */

export interface FormatOptions {
  /** Spaces per indentation level. */
  indentWidth: number;
  /** Put each `%;`-separated statement of a macro body on its own line. Off: only re-indent. */
  splitStatements: boolean;
}

/** Wil's style: two spaces, one statement per line. */
export const DEFAULT_FORMAT_OPTIONS: Readonly<FormatOptions> = { indentWidth: 2, splitStatements: true };

export interface FormatEdit {
  range: Range;
  newText: string;
}

/** Why an entry was left exactly as written. */
export type Refusal =
  | "incomplete"
  | "comment"
  | "blank-line"
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
}

export interface FormatResult {
  edits: FormatEdit[];
  /** Every entry looked at, in order; empty for a CRLF file. */
  entries: EntryResult[];
  /** The file has CRLF line endings, so nothing was changed. */
  crlf: boolean;
}

/**
 * Offsets of the `%` of every `%;` separator in `s` that is outside quotes and brackets, and
 * not part of a longer run of `%`s: tf copies a run of two or more whole, so `%%;` and `%%%;` are
 * both text (proven, `separator-literal-forms`). Quotes don't actually protect a `%;` outside an
 * expression, and unbalanced text (an apostrophe in a line sent to the world, `:-(`) stops the
 * search early; both only ever mean fewer splits.
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
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth += 1;
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

/**
 * Whether a statement has a block keyword in the middle of its text (`/echo a /else /echo b`,
 * `/def inner = /if ...`), which tf reads as text: right, perhaps, but too easy to misread once
 * laid out, so such entries are left as written.
 */
function keywordMidStatement(text: string, layout: Layout): boolean {
  return layout.units.some((u) => !u.block && MID_KEYWORD_RE.test(text.slice(u.start, u.end)));
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
 * of the body itself, at each block part's first statement, and where the body starts.
 */
function splitPlan(entry: LogicalEntry, body: number, layout: Layout, authorBreaks: number[], multiLine: boolean): Plan | undefined {
  const j = entry.text;
  const cuts = new Set<number>();
  const removed = new Set<number>();
  const spaced = new Set<number>();
  // Where an author's break is replaced by one of ours.
  const zones: [number, number][] = [];
  const safe = new Set(topLevelSeparators(j));
  const own = layout.separators.filter((sep) => sep.char === ";" && layout.lists[sep.list]?.kind === "body");
  // Where the two disagree (an apostrophe in text sent to the world, `:-(`), the body is only
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
    zones.push([r, q]);
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
    zones.push([p, p]);
  }
  let first = body;
  while (isTfSpace(j[first])) first += 1;
  if (first < j.length && (cuts.size > 0 || multiLine)) {
    cuts.add(first);
    zones.push([body, first]);
    // `/def x=/echo` gets the blank of `= \`: macro.c skips blanks before a body.
    if (first === body && entry.isDefBody) spaced.add(first);
  }
  for (const b of authorBreaks) if (!zones.some(([r, q]) => r <= b && b <= q)) cuts.add(b);
  return { cuts, removed, spaced };
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

/**
 * One entry laid out, as its new physical lines, or why it is left as written. `original` holds
 * its physical lines; `indent` is one level; `split` puts a macro body's statements on lines of
 * their own (off: only re-indent).
 */
export function layoutEntry(entry: LogicalEntry, original: string[], indent: string, split: boolean): string[] | Refusal {
  if (entry.incomplete) return "incomplete";
  if (original.some((l, i) => i > 0 && isCommentLine(l))) return "comment";
  if (original.some((l, i) => i > 0 && isBlankLine(l))) return "blank-line";
  if (original.some((l) => l.includes("%\\"))) return "percent-backslash";
  if (original.some((l) => /\\[ \t\f\v]+$/.test(l))) return "space-after-backslash";
  // U+FFFD is what a byte that wasn't UTF-8 became on the way in; writing it back would lose it.
  if (original.some((l) => l.includes("\uFFFD"))) return "replacement-character";

  const j = entry.text;
  const macro = entry.isDefBody || entry.isOtherMacroBody;
  const body = macro ? macroBodyStart(j) : -1;
  if (tabMoves(original, entry, body)) return "tab";

  const top = parseLayout(j, "top");
  if (!parsedCleanly(top)) return "structure";
  const inner = body >= 0 ? parseLayout(j.slice(body), "body") : undefined;
  if (inner && !parsedCleanly(inner)) return "structure";
  if (inner ? keywordMidStatement(j.slice(body), inner) : keywordMidStatement(j, top)) return "keyword-mid-statement";

  const authorBreaks: number[] = [];
  let offset = 0;
  for (const part of entry.parts.slice(0, -1)) {
    offset += part.text.length;
    authorBreaks.push(offset);
  }
  const plan: Plan = (inner && split ? splitPlan(entry, body, inner, authorBreaks, original.length > 1) : undefined) ?? {
    cuts: new Set(authorBreaks),
    removed: new Set(),
    spaced: new Set(),
  };
  const { contents, starts } = cutLines(j, plan);

  const layout = inner ?? top;
  const base = inner ? body : 0;
  const stmtStarts = statementStarts(j, layout, base);
  if (inner) {
    let first = body;
    while (isTfSpace(j[first])) first += 1;
    stmtStarts.add(first);
  }
  const firstIndent = (original[0] ?? "").slice(0, leadingWhitespaceLength(original[0] ?? ""));
  const lines = contents.map((content, i) => {
    const end = i < contents.length - 1 ? "\\" : "";
    if (i === 0) return `${firstIndent}${content}${end}`;
    const o = starts[i] as number;
    // A break in a macro's head hangs under it; in the body, a line is one level in, more in each
    // block, and one more when it continues a statement rather than starting one.
    const level = inner && o < body ? 2 : (inner ? 1 : 0) + depthAt(layout, base, o) + (stmtStarts.has(o) ? 0 : 1);
    return `${indent.repeat(level)}${content}${end}`;
  });

  // The proof that this layout is the same program: no line tf would skip or end on, the same
  // joined text but for the dropped blanks, and the same statements.
  if (lines.some((l, i) => i > 0 && (isBlankLine(l) || isCommentLine(l)))) return "unverified";
  if (lines.some((l, i) => i < lines.length - 1 !== continuesToNextLine(l))) return "unverified";
  const joined = rejoin(lines);
  if (joined !== expectedText(j, plan)) return "unverified";
  if (inner) {
    const again = parseLayout(joined.slice(body), "body");
    if (!parsedCleanly(again)) return "unverified";
    if (again.separators.length !== inner.separators.length || again.blocks.length !== inner.blocks.length) return "unverified";
    if (statementTexts(joined.slice(body), again).join("\n") !== statementTexts(j.slice(body), inner).join("\n")) return "unverified";
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
  const indent = " ".repeat(opts.indentWidth);
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
    const laid = hasError ? "error" : layoutEntry(entry, original, indent, opts.splitStatements);
    if (typeof laid === "string") {
      entries.push({ ...at, changed: false, refused: laid });
      continue;
    }
    const changed = laid.join("\n") !== original.join("\n");
    entries.push({ ...at, changed });
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
