import { DocumentSymbol, SymbolKind } from "vscode-languageserver/node";
import type { TfSymbol, TfSymbolKind } from "@tfscript/core/symbols";

const LSP_KIND: Record<TfSymbolKind, SymbolKind> = {
  def: SymbolKind.Function,
  alias: SymbolKind.Function,
  bind: SymbolKind.Key,
  hook: SymbolKind.Event,
  trig: SymbolKind.Event,
};

export function toDocumentSymbol(symbol: TfSymbol): DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: LSP_KIND[symbol.kind],
    range: symbol.range,
    selectionRange: symbol.selectionRange,
  };
}
