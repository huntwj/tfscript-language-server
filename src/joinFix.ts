import type { Range, TfDiagnostic, TfTextEdit } from "./diagnostics";
import {
  continuesToNextLine,
  isBlankLine,
  isCommentLine,
  isTfSpace,
  leadingWhitespaceLength,
  splitLogicalEntries,
  splitRawLines,
  type LogicalEntry,
} from "./logicalEntries";
import { macroBodyStart } from "./structure";

/**
 * Fixes that join physical lines into one command with trailing `\`s: for a top-level `/if` or
 * `/while` whose closer is on a later line (missing-continuation), and for an indented line that
 * looks like it continues the command above (indented-line-after-command).
 *
 * How far to join, and whether each joint needs a `%;`, isn't something a single line can tell,
 * so this tries it: it joins one more line at a time, settles the result with the structural
 * fixes the joined command then needs (a `%;` before a keyword that would otherwise be text, or
 * removing one that sends a blank line), and takes the first result with no errors left. A
 * candidate is only kept if it leaves no problem the original lines didn't have.
 *
 * tf's loader (load_file() in tinyfugue/src/command.c, see logicalEntries.ts) strips each joined
 * line's leading whitespace and drops the `\`, so a line gets ` \` (the blank keeps the words
 * apart). Where `%;` separates statements (a macro body, or a top-level line that starts with
 * `/if` or `/while`), a joint before a line starting with `/` gets `%; \` instead, since two
 * commands on separate lines were meant as two statements. A comment line in between needs
 * nothing: it is skipped even in the middle of a continuation. A blank line ends the search, as
 * does a CRLF line (`\<CR>` can't continue; see backslashNotLast.ts).
 */

type Diagnose = (text: string) => TfDiagnostic[];

/** A join's edits, whether it leaves no error, and the lines it makes one command. */
interface Join {
  edits: TfTextEdit[];
  clean: boolean;
  from: number;
  to: number;
}

/** The most lines past a command's own a join brings into it. */
export const JOIN_MAX_LINES = 20;
const MAX_LINES = JOIN_MAX_LINES;
const MAX_TRIES = 80;
const MAX_SLICE = 20_000;
const MAX_TOTAL_TRIES = 1500;
/** An /endif or /done as a word of its own, after a blank or a separator. */
const CLOSER_RE = /(?<![^ \t;|\\])\/(?:endif|done)(?=[ \t\r\f\v%)]|$)/i;
const TOP_BLOCK_RE = /^\/(?:if|while)\b/i;
/** A line that starts with a keyword of a block: it can only belong to one opened above it. */
const STRAY_KEYWORD_RE = /^\/(?:then|else|elseif|endif|do|done)(?![^ \t\r\f\v%])/i;
/** Structural fixes the settle step applies; not "Add %; /endif ...", which would close a block early. */
const SETTLE_CODES = new Set(["block-structure", "separator-sends-blank-line"]);

/** How `%;` reads in the command: "body" in a macro body, "top" in a top-level /if or /while, or not at all. */
type Separates = "body" | "top" | undefined;

function separates(entry: LogicalEntry): Separates {
  if (entry.isDefBody || entry.isOtherMacroBody) return "body";
  return TOP_BLOCK_RE.test(entry.text) ? "top" : undefined;
}

/**
 * Reads a command's text the way expand() finds its statement separators (structure.ts has the
 * full model): `%;`, `%|` or `%\` separates; a run of two or more `%`s is text, whatever follows
 * (percentsub() keeps the whole run); in a macro body `\` escapes the next character, and a
 * top-level line does no `\` processing. Proven live in a /def body: `\\%;` and `\\\\%;` separate,
 * `\%;` and `\\\%;` are text, `\%%;` separates (the `\` takes one `%`), `%%%;` is text; on a
 * top-level /if line `\%;` and `\\%;` separate, `%%;` and `\%%;` don't.
 *
 * It is fed one piece at a time, so a command joined from many lines is read once.
 */
class SeparatorScanner {
  private escaped = false;
  private percents = 0;
  private content = false;
  /** The text so far ends with a separator. */
  atSeparator = false;
  /** Separators with nothing but blanks since the one before (or the start): empty statements. */
  empty = 0;
  constructor(private readonly mode: Separates) {}

  feed(text: string): this {
    for (const ch of text) {
      if (this.escaped) {
        this.escaped = false;
        this.text();
      } else if (this.percents === 1 && (ch === ";" || ch === "|" || ch === "\\")) {
        if (!this.content) this.empty += 1;
        this.content = false;
        this.percents = 0;
        this.atSeparator = true;
      } else if (ch === "%") {
        if (this.percents > 0) this.content = true; // a run of %s is text
        this.percents += 1;
        this.atSeparator = false;
      } else if (ch === "\\" && this.mode === "body") {
        this.escaped = true;
        this.text();
      } else if (isTfSpace(ch) && this.percents === 0) {
        this.atSeparator = false;
      } else {
        this.text();
      }
    }
    return this;
  }

  private text(): void {
    this.content = true;
    this.percents = 0;
    this.atSeparator = false;
  }
}

/** A line's part of the command, as tf joins it: without its leading blanks or continuing `\`. */
function partOf(line: string): string {
  const part = line.slice(leadingWhitespaceLength(line));
  return continuesToNextLine(part) ? part.slice(0, -1) : part;
}

/** The command of lines `from`..`to`, as tf joins it. */
function joinedText(lines: string[], from: number, to: number): string {
  let text = "";
  for (let k = from; k <= to; k += 1) if (!isCommentLine(lines[k] ?? "")) text += partOf(lines[k] ?? "");
  return text;
}

/**
 * `line` with what it needs at its end to continue onto `next`, or undefined if it can't.
 * `header` says the command so far is a macro's header with its body still empty (`/def a =`),
 * where nothing needs separating.
 */
function continued(line: string, next: string, mode: Separates, header: boolean, scan: SeparatorScanner): string | undefined {
  if (line.endsWith("\r") || isBlankLine(line)) return undefined;
  let end = line.length;
  while (end > 0 && isTfSpace(line[end - 1])) end -= 1;
  const body = line.slice(0, end);
  if (continuesToNextLine(body)) {
    // A \ with whitespace after it: deleting the whitespace is all it needs.
    scan.feed(partOf(body));
    return body;
  }
  scan.feed(body.slice(leadingWhitespaceLength(body)));
  const command = next[leadingWhitespaceLength(next)] === "/";
  const sep = mode !== undefined && command && !header && !scan.atSeparator;
  // Glued onto a % the %; would be %%;, which is text; after a \ in a body, the % would be escaped.
  const added = !sep ? " " : body.endsWith("%") || (mode === "body" && body.endsWith("\\")) ? " %; " : "%; ";
  scan.feed(added);
  return `${body}${added}\\`;
}

/**
 * Lines `base`..`to` of `lines`, with `from`..`to` joined into the command that starts at line
 * `base`, or undefined if they can't be.
 */
function joined(lines: string[], base: number, from: number, to: number, mode: Separates): string[] | undefined {
  const out = lines.slice(base, to + 1);
  const scan = new SeparatorScanner(mode);
  scan.feed(joinedText(lines, base, from - 1));
  // A macro header with its body still empty (`/def a =`) needs no separator after it.
  let header = mode === "body";
  for (let k = from; k < to; k += 1) {
    const line = out[k - base] ?? "";
    if (isCommentLine(line)) continue;
    let n = k + 1;
    while (n < to && isCommentLine(out[n - base] ?? "")) n += 1;
    if (header) {
      const sofar = joinedText(out, 0, k - base);
      const start = macroBodyStart(sofar);
      header = start >= 0 && sofar.slice(start).trim() === "";
    }
    const next = continued(line, out[n - base] ?? "", mode, header, scan);
    if (next === undefined) return undefined;
    out[k - base] = next;
  }
  return out;
}

function applyLineEdits(lines: string[], edits: TfTextEdit[]): string[] | undefined {
  if (edits.some((e) => e.range.start.line !== e.range.end.line || e.newText.includes("\n"))) return undefined;
  const out = lines.slice();
  const ordered = [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character);
  for (const e of ordered) {
    const line = out[e.range.start.line] ?? "";
    out[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return out;
}

const key = (d: TfDiagnostic): string => `${d.code}\u0000${d.message}`;

function counts(diagnostics: TfDiagnostic[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of diagnostics) m.set(d.code, (m.get(d.code) ?? 0) + 1);
  return m;
}

/**
 * Applies the structural fixes the joined slice needs, for problems the original slice didn't
 * have. Returns the settled slice and its diagnostics.
 */
function settle(slice: string[], before: TfDiagnostic[], diagnose: Diagnose): { lines: string[]; diagnostics: TfDiagnostic[] } {
  const old = new Set(before.map(key));
  let lines = slice;
  let diagnostics = diagnose(lines.join("\n"));
  for (let round = 0; round < 6; round += 1) {
    const d = diagnostics.find((x) => SETTLE_CODES.has(x.code) && x.fix && !x.fix.title.startsWith("Add ") && !old.has(key(x)));
    const next = d?.fix && applyLineEdits(lines, d.fix.edits);
    if (!next) break;
    lines = next;
    diagnostics = diagnose(lines.join("\n"));
  }
  return { lines, diagnostics };
}

function emptyStatements(lines: string[], mode: Separates): number {
  return mode === undefined ? 0 : new SeparatorScanner(mode).feed(joinedText(lines, 0, lines.length - 1)).empty;
}

/** Single-line edits that turn `before` into `after` (same number of lines), offset by `base` lines. */
function lineEdits(before: string[], after: string[], base: number): TfTextEdit[] {
  const edits: TfTextEdit[] = [];
  before.forEach((was, i) => {
    const now = after[i] ?? "";
    if (was === now) return;
    let p = 0;
    while (p < was.length && p < now.length && was[p] === now[p]) p += 1;
    let s = 0;
    while (s < was.length - p && s < now.length - p && was[was.length - 1 - s] === now[now.length - 1 - s]) s += 1;
    const range: Range = { start: { line: base + i, character: p }, end: { line: base + i, character: was.length - s } };
    edits.push({ range, newText: now.slice(p, now.length - s) });
  });
  return edits;
}

/**
 * Joins the command that starts at `entry` with the lines after `first` (its last line, or the
 * line before an indented one), up to the first result that leaves no error. `gone` says whether
 * a settled slice's diagnostics no longer have the problem being fixed (lines relative to the slice).
 * Past `minLast` (and from the start when `closerOnly`, for an unclosed block) it only tries
 * stopping at a line with an `/endif` or `/done` on it, the only lines that can close a block.
 * It goes no further than a blank line, or a line in `stopAt`.
 */
function joinFix(
  lines: string[],
  entry: LogicalEntry,
  first: number,
  minLast: number,
  gone: (diagnostics: TfDiagnostic[]) => boolean,
  diagnose: Diagnose,
  closerOnly: boolean,
  stopAt: Set<number> = new Set(),
): Join | undefined {
  const separate = separates(entry);
  const base = entry.startLine;
  let fallback: Join | undefined;
  for (let last = minLast; last < lines.length && last <= first + MAX_LINES; last += 1) {
    const line = lines[last] ?? "";
    if (isBlankLine(line) || stopAt.has(last)) break;
    if (isCommentLine(line) || continuesToNextLine(line)) continue;
    // Joining further only helps if it brings in a block's /endif or /done.
    if ((closerOnly || last > minLast) && !CLOSER_RE.test(line)) continue;
    const candidate = joined(lines, base, first, last, separate);
    if (!candidate) break;
    const original = lines.slice(base, last + 1);
    const before = diagnose(original.join("\n"));
    const settled = settle(candidate, before, diagnose);
    if (!gone(settled.diagnostics)) continue;
    const had = counts(before);
    if ([...counts(settled.diagnostics)].some(([code, n]) => n > (had.get(code) ?? 0))) continue;
    // Nor an empty statement (%;%;) the original didn't have: in a body it sends a blank line.
    if (emptyStatements(settled.lines, separate) > emptyStatements(original, separate)) continue;
    const edits = lineEdits(original, settled.lines, base);
    const join = { edits, clean: !settled.diagnostics.some((d) => d.severity === "error"), from: base, to: last };
    if (join.clean) return join;
    fallback ??= join;
  }
  return fallback;
}

/**
 * Joins a top-level block's command with the lines after it up to `last`, and closes it with
 * `%; /endif` or `%; /done` at the end: for a block cut off at the end of its line with no closer
 * below, only indented lines or an `/else`. Kept only if that leaves no error at all.
 */
function joinAndClose(lines: string[], entry: LogicalEntry, last: number, closer: string, diagnose: Diagnose): Join | undefined {
  const separate = separates(entry);
  const base = entry.startLine;
  const candidate = joined(lines, base, entry.endLine, last, separate);
  if (!candidate) return undefined;
  const end = candidate.length - 1;
  const tail = (candidate[end] ?? "").replace(/[ \t\f\v]+$/, "");
  const scan = new SeparatorScanner(separate).feed(joinedText(candidate, 0, end));
  // Glued onto a % the %; would be %%;, which is text.
  candidate[end] = `${tail}${scan.atSeparator ? " " : tail.endsWith("%") ? " %; " : "%; "}/${closer}`;
  const original = lines.slice(base, last + 1);
  const settled = settle(candidate, diagnose(original.join("\n")), diagnose);
  if (settled.diagnostics.some((d) => d.severity === "error")) return undefined;
  if (emptyStatements(settled.lines, separate) > emptyStatements(original, separate)) return undefined;
  return { edits: lineEdits(original, settled.lines, base), clean: true, from: base, to: last };
}

/** The entry holding `line` (entries are in line order, so a binary search). */
function entryAt(entries: LogicalEntry[], line: number): LogicalEntry | undefined {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const e = entries[mid] as LogicalEntry;
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return e;
  }
  return undefined;
}

function touches(fix: TfDiagnostic["fix"], line: number): boolean {
  return !!fix && fix.edits.some((e) => e.range.start.line <= line && line <= e.range.end.line);
}

/**
 * Adds the line-joining fixes to the missing-continuation and indented-line-after-command
 * diagnostics, and to a block-structure error at a top-level /if or /while. The opener's fix goes
 * first: an indented line inside it gets the same fix, since joining the whole block fixes it. A
 * block-structure fix that would add an /endif or /done to a command that a join fix extends is
 * dropped: the join brings in the real one.
 *
 * Each try runs the diagnostics over the lines being joined. So the cost stays bounded, each
 * diagnostic gets at most MAX_TRIES runs, over at most MAX_SLICE characters, and the whole file at
 * most MAX_TOTAL_TRIES; a diagnostic that runs out goes without a join fix. The per-diagnostic
 * budget keeps one hard case from starving the rest; the total is only reached by files full of
 * them.
 */
export function addJoinFixes(text: string, diagnostics: TfDiagnostic[], diagnoseSlice: Diagnose): void {
  let total = 0;
  addJoins(text, diagnostics, (t) => {
    total += 1;
    if (total > MAX_TOTAL_TRIES) throw new OutOfTries();
    return diagnoseSlice(t);
  });
}

class OutOfTries extends Error {}

/** `fn(diagnose)` with a fresh budget of MAX_TRIES runs, or undefined if it runs out. */
function attempt<T>(diagnoseSlice: Diagnose, fn: (diagnose: Diagnose) => T): T | undefined {
  let tries = 0;
  const diagnose: Diagnose = (t) => {
    tries += 1;
    if (tries > MAX_TRIES || t.length > MAX_SLICE) throw new OutOfTries();
    return diagnoseSlice(t);
  };
  try {
    return fn(diagnose);
  } catch (e) {
    if (e instanceof OutOfTries) return undefined;
    throw e;
  }
}

/** The indented-line diagnostics in runs: each one after the first is the line after the one before it. */
function indentedRuns(diagnostics: TfDiagnostic[]): TfDiagnostic[][] {
  const runs: TfDiagnostic[][] = [];
  const indented = diagnostics.filter((d) => d.code === "indented-line-after-command").sort((a, b) => a.range.start.line - b.range.start.line);
  for (const d of indented) {
    const run = runs[runs.length - 1];
    const tail = run?.[run.length - 1];
    if (run && tail && d.related?.[0]?.range.start.line === tail.range.start.line) run.push(d);
    else runs.push([d]);
  }
  return runs;
}

function addJoins(text: string, diagnostics: TfDiagnostic[], diagnoseSlice: Diagnose): void {
  if (!diagnostics.some((d) => d.code === "missing-continuation" || d.code === "indented-line-after-command" || d.code === "block-structure")) return;
  const lines = splitRawLines(text);
  const entries = splitLogicalEntries(text);
  // A block's join stops at an unindented macro definition, a new command whose body isn't part of
  // the block. An indented one is meant to be in it, and joins like any command.
  const definitions = new Set(
    entries.filter((e) => (e.isDefBody || e.isOtherMacroBody) && leadingWhitespaceLength(lines[e.startLine] ?? "") === 0).map((e) => e.startLine),
  );
  const joins: NonNullable<TfDiagnostic["fix"]>[] = [];
  /** The joins that leave no error, with the lines they make one command. */
  const clean: { fix: NonNullable<TfDiagnostic["fix"]>; from: number; to: number }[] = [];
  const add = (d: TfDiagnostic, title: string, join: Join): void => {
    d.fix = { title, edits: join.edits };
    joins.push(d.fix);
    if (join.clean) clean.push({ fix: d.fix, from: join.from, to: join.to });
  };

  for (const d of diagnostics) {
    if (d.code !== "missing-continuation" && d.code !== "block-structure") continue;
    // An "Add %; /endif ..." fix gives way to joining in a closer below.
    if (d.fix && !d.fix.title.startsWith("Add %; /")) continue;
    const entry = entryAt(entries, d.range.start.line);
    const first = entry?.offsetMap[0];
    // The command has to start with /if or /while, for %; to separate its statements. A
    // missing-continuation's block may be a later one in it (`/if (1) ...%; /endif%; /if (2) ...`).
    const starts = !!first && first.line === d.range.start.line && first.character === d.range.start.character;
    const own = TOP_BLOCK_RE.exec((lines[d.range.start.line] ?? "").slice(d.range.start.character));
    const opener = entry && !entry.isDefBody && !entry.isOtherMacroBody && TOP_BLOCK_RE.test(entry.text) ? own : null;
    if (!entry || !opener || (!starts && d.code !== "missing-continuation")) continue;
    const at = d.range.start.line - entry.startLine;
    const anyMessage = d.code === "missing-continuation";
    const join = attempt(diagnoseSlice, (diagnose) =>
      // missing-continuation's message names lines, which differ in the slice: the code and line are enough.
      joinFix(lines, entry, entry.endLine, entry.endLine + 1, (ds) => !ds.some((x) => x.code === d.code && (anyMessage || x.message === d.message) && x.range.start.line === at), diagnose, true, definitions),
    );
    // A block-structure error at the opener could be anything wrong with the block, so only a join that fixes it all.
    if (join && (join.clean || d.code === "missing-continuation")) {
      add(d, `Join the ${opener[0].toLowerCase()}'s lines with \\`, join);
      continue;
    }
    // A block with no closer below it, only lines meant as its body (or a stray /else or /elseif):
    // join those and close it. Not with a stray /then or /do, where it can't tell a condition list
    // from a (condition), nor with a closer, which the join above would have brought in.
    const related = d.code === "missing-continuation" ? (d.related ?? []) : [];
    if (related.length === 0 || related.some((r) => / \/(?:then|do|endif|done) doesn't/.test(r.message))) continue;
    const word = opener[0].toLowerCase();
    const closer = word === "/while" ? "done" : "endif";
    const last = Math.max(...related.map((r) => r.range.start.line));
    // Only if that is clearly where the block ends: not when the next command (past any blank or
    // comment lines) is indented or a keyword of a block, as more of its body or its closer may be
    // past a blank line or the reach a join has, which missing-continuation doesn't take in.
    let after = last + 1;
    while (after < lines.length && (isCommentLine(lines[after] ?? "") || isBlankLine(lines[after] ?? ""))) after += 1;
    const following = lines[after] ?? "";
    if (leadingWhitespaceLength(following) > 0 || STRAY_KEYWORD_RE.test(following)) continue;
    const closed = attempt(diagnoseSlice, (diagnose) => joinAndClose(lines, entry, last, closer, diagnose));
    if (closed) add(d, `Join the ${word}'s lines with \\ and end it with /${closer}`, closed);
  }

  for (const run of indentedRuns(diagnostics)) {
    const head = run[0] as TfDiagnostic;
    const previous = head.related?.[0]?.range.start.line;
    const entry = previous === undefined ? undefined : entryAt(entries, previous);
    if (!entry || previous === undefined || head.fix) continue;
    const enclosing = joins.find((f) => touches(f, previous));
    if (enclosing) {
      for (const d of run) d.fix = enclosing;
      continue;
    }
    // A \ with whitespace after it: backslash-not-last's fix is the one.
    if (/\\[ \t\f\v]+$/.test(lines[previous] ?? "")) continue;
    const own = lines[head.range.start.line] ?? "";
    if (!separates(entry) && own[leadingWhitespaceLength(own)] === "/") {
      // Two plain top-level commands can't be one, so the indentation is what's wrong.
      for (const d of run) {
        const line = d.range.start.line;
        const indent = leadingWhitespaceLength(lines[line] ?? "");
        d.fix = { title: "Remove the indentation", edits: [{ range: { start: { line, character: 0 }, end: { line, character: indent } }, newText: "" }] };
      }
      continue;
    }
    // The whole run of indented lines continues the command above it.
    const last = (run[run.length - 1] as TfDiagnostic).range.start.line;
    const at = last - entry.startLine;
    const join = attempt(diagnoseSlice, (diagnose) =>
      joinFix(lines, entry, previous, last, (ds) => !ds.some((x) => x.code === head.code && x.range.start.line >= previous - entry.startLine && x.range.start.line <= at), diagnose, false),
    );
    if (!join) continue;
    add(head, join.edits.length > 1 ? "Join these lines with \\" : `End line ${previous + 1} with \\`, join);
    for (const d of run) d.fix = head.fix;
  }

  // Every other structural problem in the lines a clean join makes one command (a stray /endif,
  // or an "Add %; /endif" fix that would close the block early) is fixed by that join.
  for (const d of diagnostics) {
    if (d.code !== "block-structure" && d.code !== "indented-line-after-command") continue;
    if (d.fix && !d.fix.title.startsWith("Add %; /")) continue;
    const join = clean.find((j) => j.from <= d.range.start.line && d.range.start.line <= j.to);
    if (join) d.fix = join.fix;
  }
}
