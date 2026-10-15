import { splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { RULES, type Severity } from "./rules";
import type { EntryMatch, LineMatch, LineSpan } from "./rules/types";
import { findAbortEntry } from "./rules/notACommand";
import { addJoinFixes } from "./joinFix";
import { consolidateContinuations } from "./rules/missingContinuation";

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface TfTextEdit {
  range: Range;
  newText: string;
}

export interface TfDiagnostic {
  range: Range;
  /** One sentence that reads on its own in the Problems pane. */
  message: string;
  code: string;
  severity: Severity;
  /** A few words marking the range in the hover's source excerpt. */
  label?: string;
  /** Markdown prose for the hover, below the excerpt. */
  explanation?: string;
  related?: { range: Range; message: string }[];
  fix?: { title: string; edits: TfTextEdit[] };
}

/** Where `offset` of `entry.text` is in the document; `entry.text.length` is just after its last character. */
function positionOf(entry: LogicalEntry, offset: number): Position | undefined {
  const at = entry.offsetMap[offset];
  if (at) return { line: at.line, character: at.character };
  const last = entry.offsetMap[offset - 1];
  return last ? { line: last.line, character: last.character + 1 } : undefined;
}

/** The document range of `entry.text`'s `start`..`end` (exclusive), or undefined if it can't be mapped. */
function rangeOf(entry: LogicalEntry, start: number, end: number): Range | undefined {
  const from = positionOf(entry, start);
  if (end <= start) return from && { start: from, end: from };
  // offsetMap has one entry per character; end is exclusive, so the last included character is at end - 1.
  const lastChar = entry.offsetMap[end - 1];
  return from && lastChar ? { start: from, end: { line: lastChar.line, character: lastChar.character + 1 } } : undefined;
}

function entryDiagnostic(entry: LogicalEntry, match: EntryMatch, code: string, severity: Severity): TfDiagnostic | undefined {
  if (match.end <= match.start) return undefined;
  const range = rangeOf(entry, match.start, match.end);
  if (!range) return undefined;
  const d: TfDiagnostic = { range, message: match.message, code, severity: match.severity ?? severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  const related = (match.related ?? []).flatMap((n) => {
    const r = rangeOf(entry, n.start, n.end);
    return r ? [{ range: r, message: n.message }] : [];
  });
  if (related.length > 0) d.related = related;
  if (match.fix) {
    const edits = match.fix.edits.map((e) => {
      const r = rangeOf(entry, e.start, e.end);
      return r && { range: r, newText: e.newText };
    });
    if (edits.length > 0 && edits.every((e) => e)) d.fix = { title: match.fix.title, edits: edits as TfTextEdit[] };
  }
  return d;
}

function spanRange(s: LineSpan): Range {
  return { start: { line: s.line, character: s.startChar }, end: { line: s.line, character: s.endChar } };
}

function lineDiagnostic(match: LineMatch, code: string, severity: Severity): TfDiagnostic {
  const d: TfDiagnostic = { range: spanRange(match), message: match.message, code, severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  if (match.related && match.related.length > 0) d.related = match.related.map((n) => ({ range: spanRange(n), message: n.message }));
  if (match.fix) d.fix = { title: match.fix.title, edits: match.fix.edits.map((e) => ({ range: spanRange(e), newText: e.newText })) };
  return d;
}

/**
 * Where a rule that throws is reported: on stderr, as unhandled rejections are (rejections.ts),
 * which the client shows in the server's output.
 */
let reportRuleError = (rule: string, error: unknown): void => {
  process.stderr.write(`tfscript: rule ${rule} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
};

/** Report a rule that throws somewhere else (tests); returns the reporter it replaced. */
export function onRuleError(report: (rule: string, error: unknown) => void): (rule: string, error: unknown) => void {
  const previous = reportRuleError;
  reportRuleError = report;
  return previous;
}

/**
 * Whether `d` is on something tf runs without a word, perhaps not as meant: an information note
 * (a plain-line `%;` is text), or keyword-mid-statement's warning for a keyword a /let or /set value
 * took (`/if (1) /set a=1 /else /set b=2%; /endif` loads clean). Such a diagnostic doesn't make a
 * file tf loads clean a problem, in the ground-truth test or the live corpus check.
 */
export function quietInTf(d: TfDiagnostic): boolean {
  return d.severity === "information" || (d.code === "keyword-mid-statement" && d.severity === "warning");
}

/**
 * Every diagnostic for `text`. `joinFixes: false` leaves out the line-joining fixes (joinFix.ts),
 * which try out candidate fixes with this function and so must not recurse into themselves.
 */
export function getDiagnostics(text: string, { joinFixes = true }: { joinFixes?: boolean } = {}): TfDiagnostic[] {
  const entries = splitLogicalEntries(text);
  let diagnostics: TfDiagnostic[] = [];

  // A bare (non-blank, non-comment, non-"/") line aborts tf's load of the rest of the file.
  // tf still reads every physical line of the aborting entry itself before it gives up (the
  // abort check only runs once the whole, possibly backslash-joined, command is assembled),
  // so the cut is after that entry's last line (endLine), not its first.
  const abort = findAbortEntry(entries);
  // An incomplete trailing entry (file ended mid-continuation) is excluded the same way as
  // everything after an abort: tf never executes it, so no rule should look inside it either.
  const usableEntries = (abort ? entries.slice(0, abort.entryIndex) : entries).filter(
    (entry) => !entry.incomplete,
  );
  const readableLineCount = abort ? (entries[abort.entryIndex]?.endLine ?? abort.line) + 1 : undefined;
  const textForFileRules =
    readableLineCount !== undefined
      ? splitRawLines(text).slice(0, readableLineCount).join("\n")
      : text;

  for (const rule of RULES) {
    // A rule that throws loses its own diagnostics, for that command, not every rule's for the file.
    let failed = false;
    const guarded = (run: () => void): void => {
      try {
        run();
      } catch (error) {
        if (!failed) reportRuleError(rule.id, error);
        failed = true;
      }
    };
    if (rule.scope === "entry") {
      for (const entry of usableEntries) {
        guarded(() => {
          const found: TfDiagnostic[] = [];
          for (const match of rule.check(entry, text)) {
            const d = entryDiagnostic(entry, match, rule.id, rule.severity);
            if (d) found.push(d);
          }
          for (const d of found) diagnostics.push(d);
        });
      }
    } else {
      guarded(() => {
        const found = rule.check(textForFileRules).map((match) => lineDiagnostic(match, rule.id, rule.severity));
        for (const d of found) diagnostics.push(d);
      });
    }
  }

  if (abort) diagnostics.push(lineDiagnostic(abort, "not-a-command", "error"));
  // One missing \ makes the lines after a top-level /if or /while commands of their own: say so once.
  diagnostics = consolidateContinuations(text, entries, diagnostics);
  if (joinFixes) addJoinFixes(text, diagnostics, (t) => getDiagnostics(t, { joinFixes: false }));

  return diagnostics;
}
