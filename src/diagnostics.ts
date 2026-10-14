import { splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { RULES, type Severity } from "./rules";
import type { EntryMatch, LineMatch, LineSpan } from "./rules/types";
import { findAbortEntry } from "./rules/bareLineAfterCommand";
import { addJoinFixes } from "./joinFix";

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
 * Every diagnostic for `text`. `joinFixes: false` leaves out the line-joining fixes (joinFix.ts),
 * which try out candidate fixes with this function and so must not recurse into themselves.
 */
export function getDiagnostics(text: string, { joinFixes = true }: { joinFixes?: boolean } = {}): TfDiagnostic[] {
  const entries = splitLogicalEntries(text);
  const diagnostics: TfDiagnostic[] = [];

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
    if (rule.scope === "entry") {
      for (const entry of usableEntries) {
        for (const match of rule.check(entry)) {
          const d = entryDiagnostic(entry, match, rule.id, rule.severity);
          if (d) diagnostics.push(d);
        }
      }
    } else {
      for (const match of rule.check(textForFileRules)) diagnostics.push(lineDiagnostic(match, rule.id, rule.severity));
    }
  }

  if (abort) diagnostics.push(lineDiagnostic(abort, "bare-line-after-command", "error"));
  if (joinFixes) addJoinFixes(text, diagnostics, (t) => getDiagnostics(t, { joinFixes: false }));

  return diagnostics;
}
