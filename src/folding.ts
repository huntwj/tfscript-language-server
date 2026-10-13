import { FoldingRange, FoldingRangeKind } from "vscode-languageserver/node";
import { isCommentLine, splitLogicalEntries, splitRawLines } from "./logicalEntries";

/**
 * Folding ranges, from the same logical entries diagnostics use:
 *  - every entry that backslash-continues across physical lines folds as one region — that
 *    is what a multi-line `/def` body is to tf, and it also covers a top-level `/if ... /endif`
 *    joined with `\`. An `/if` that is *not* joined is several separate entries (and a
 *    diagnostic, if-multiline-top-level), so there is no block there to fold;
 *  - a run of two or more comment lines folds as a comment.
 * Comment lines inside a continuation are skipped by tf's loader, so they stay inside the
 * entry's fold rather than starting a comment fold of their own.
 */

export interface TfFoldingRange {
  startLine: number;
  endLine: number;
  kind?: "comment";
}

export function getFoldingRanges(text: string): TfFoldingRange[] {
  const lines = splitRawLines(text);
  const ranges: TfFoldingRange[] = [];
  const inEntry = new Set<number>();

  for (const entry of splitLogicalEntries(text)) {
    if (entry.endLine === entry.startLine) continue;
    ranges.push({ startLine: entry.startLine, endLine: entry.endLine });
    for (let line = entry.startLine; line <= entry.endLine; line += 1) inEntry.add(line);
  }

  let runStart = -1;
  const closeRun = (lastLine: number): void => {
    if (runStart !== -1 && lastLine > runStart) {
      ranges.push({ startLine: runStart, endLine: lastLine, kind: "comment" });
    }
    runStart = -1;
  };
  lines.forEach((line, idx) => {
    if (isCommentLine(line) && !inEntry.has(idx)) {
      if (runStart === -1) runStart = idx;
    } else {
      closeRun(idx - 1);
    }
  });
  closeRun(lines.length - 1);

  return ranges.sort((a, b) => a.startLine - b.startLine);
}

export function toFoldingRange(range: TfFoldingRange): FoldingRange {
  return {
    startLine: range.startLine,
    endLine: range.endLine,
    ...(range.kind === "comment" ? { kind: FoldingRangeKind.Comment } : { kind: FoldingRangeKind.Region }),
  };
}
