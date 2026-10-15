import { FoldingRange, FoldingRangeKind } from "vscode-languageserver/node";
import type { TfFoldingRange } from "@tfscript/core/folding";

export function toFoldingRange(range: TfFoldingRange): FoldingRange {
  return {
    startLine: range.startLine,
    endLine: range.endLine,
    ...(range.kind === "comment" ? { kind: FoldingRangeKind.Comment } : { kind: FoldingRangeKind.Region }),
  };
}
