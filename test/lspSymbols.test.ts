import { describe, expect, it } from "vitest";
import { SymbolKind } from "vscode-languageserver/node";
import { toDocumentSymbol } from "../src/lspSymbols";
import { getDocumentSymbols } from "../src/symbols";

describe("toDocumentSymbol", () => {
  it("maps kinds onto LSP symbol kinds", () => {
    const text = ["/def a = /echo", "/alias b c", "/bind d = /e", "/hook F = /g", "/trig h = /i", ""].join("\n");
    const kinds = getDocumentSymbols(text).map((s) => toDocumentSymbol(s).kind);
    expect(kinds).toEqual([
      SymbolKind.Function,
      SymbolKind.Function,
      SymbolKind.Key,
      SymbolKind.Event,
      SymbolKind.Event,
    ]);
  });

  it("keeps the selection range inside the full range", () => {
    const [sym] = getDocumentSymbols("/def -i foo = /echo\n").map(toDocumentSymbol);
    expect(sym?.selectionRange.start.line).toBeGreaterThanOrEqual(sym!.range.start.line);
    expect(sym?.selectionRange.end.character).toBeLessThanOrEqual(sym!.range.end.character);
  });
});
