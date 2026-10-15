import { describe, expect, it } from "vitest";
import { FoldingRangeKind } from "vscode-languageserver/node";
import { toFoldingRange } from "../src/lspFolding";

describe("toFoldingRange", () => {
  it("maps onto LSP folding range kinds", () => {
    expect(toFoldingRange({ startLine: 0, endLine: 2 })).toEqual({
      startLine: 0,
      endLine: 2,
      kind: FoldingRangeKind.Region,
    });
    expect(toFoldingRange({ startLine: 0, endLine: 2, kind: "comment" })).toEqual({
      startLine: 0,
      endLine: 2,
      kind: FoldingRangeKind.Comment,
    });
  });
});
