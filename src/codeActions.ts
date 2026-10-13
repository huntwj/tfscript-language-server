import { getDiagnostics, type Position, type TfDiagnostic } from "./diagnostics";
import { splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";

/**
 * Quick fixes for the diagnostics that have a mechanical remedy. Diagnostics are recomputed
 * here rather than read back from the request's `context.diagnostics`: that copy only carries
 * what the client chose to echo, and getDiagnostics() is cheap enough to run per request.
 *
 *  - trailing-space-after-backslash: delete the whitespace after the `\`, so the line
 *    continues the way the author meant. Not offered when that whitespace is only a `\r` — the
 *    file is CRLF-encoded, and deleting one line's `\r` would leave mixed line endings; the
 *    remedy there is converting the whole file, which is the editor's job.
 *  - load-no-expansion: insert `/eval ` before the command, forcing the substitution pass the
 *    diagnostic's own message suggests. One fix per entry, however many `%{...}` it holds.
 */

export interface Range {
  start: Position;
  end: Position;
}

export interface TfTextEdit {
  range: Range;
  newText: string;
}

export interface TfCodeAction {
  title: string;
  edits: TfTextEdit[];
  diagnostic: TfDiagnostic;
}

function comparePositions(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

function overlaps(a: Range, b: Range): boolean {
  return comparePositions(a.start, b.end) <= 0 && comparePositions(b.start, a.end) <= 0;
}

function entryContaining(entries: LogicalEntry[], line: number): LogicalEntry | undefined {
  return entries.find((entry) => entry.startLine <= line && line <= entry.endLine);
}

function fixTrailingSpace(diagnostic: TfDiagnostic, lines: string[]): TfCodeAction | undefined {
  const { start, end } = diagnostic.range;
  const removed = (lines[start.line] ?? "").slice(start.character + 1, end.character);
  if (removed.replace(/\r/g, "") === "") return undefined;
  return {
    title: "Remove the whitespace after the trailing '\\'",
    edits: [{ range: { start: { line: start.line, character: start.character + 1 }, end }, newText: "" }],
    diagnostic,
  };
}

function fixNoExpansion(diagnostic: TfDiagnostic, entry: LogicalEntry): TfCodeAction | undefined {
  const commandStart = entry.offsetMap[0];
  if (!commandStart) return undefined;
  return {
    title: "Prefix the command with /eval to force substitution",
    edits: [{ range: { start: commandStart, end: commandStart }, newText: "/eval " }],
    diagnostic,
  };
}

export function getCodeActions(text: string, range: Range): TfCodeAction[] {
  const lines = splitRawLines(text);
  let entries: LogicalEntry[] | undefined;
  const evalFixed = new Set<LogicalEntry>();
  const actions: TfCodeAction[] = [];

  for (const diagnostic of getDiagnostics(text)) {
    if (!overlaps(diagnostic.range, range)) continue;

    let action: TfCodeAction | undefined;
    if (diagnostic.code === "trailing-space-after-backslash") {
      action = fixTrailingSpace(diagnostic, lines);
    } else if (diagnostic.code === "load-no-expansion") {
      entries ??= splitLogicalEntries(text);
      const entry = entryContaining(entries, diagnostic.range.start.line);
      if (!entry || evalFixed.has(entry)) continue;
      evalFixed.add(entry);
      action = fixNoExpansion(diagnostic, entry);
    }
    if (action) actions.push(action);
  }

  return actions;
}
