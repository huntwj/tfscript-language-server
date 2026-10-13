#!/usr/bin/env node
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type CodeAction,
  CodeActionKind,
  type CodeActionParams,
  type CompletionItem,
  type CompletionParams,
  type Diagnostic,
  DiagnosticSeverity,
  type DocumentSymbol,
  type DocumentSymbolParams,
  type FoldingRange,
  type FoldingRangeParams,
  type Hover,
  type InitializeResult,
  type Location,
  MarkupKind,
  type ReferenceParams,
  type TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getDiagnostics, type TfDiagnostic } from "./diagnostics";
import { getCommandCompletions } from "./completions";
import { getDocumentSymbols, toDocumentSymbol } from "./symbols";
import { getFoldingRanges, toFoldingRange } from "./folding";
import { getCodeActions } from "./codeActions";
import { getDefinition, getHover, getReferences } from "./navigation";

// Explicit streams rather than relying on a `--stdio`/`--node-ipc`/`--socket` command-line
// flag: createConnection() alone throws "Connection input stream is not set" without one.
const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ["/"] },
    documentSymbolProvider: true,
    foldingRangeProvider: true,
    codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
    hoverProvider: true,
    definitionProvider: true,
    referencesProvider: true,
  },
}));

// Not onDidOpen too: TextDocuments fires onDidChangeContent for the initial open as well
// (vscode-languageserver's didOpen handler fires both), so that alone already covers it.
documents.onDidChangeContent((change) => validate(change.document));
documents.onDidClose((event) =>
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] }),
);

function toLspDiagnostic(d: TfDiagnostic): Diagnostic {
  return {
    range: d.range,
    message: d.message,
    code: d.code,
    source: "tfscript",
    severity: d.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
  };
}

function validate(document: TextDocument): void {
  const diagnostics = getDiagnostics(document.getText()).map(toLspDiagnostic);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const { line, character } = params.position;
  const linePrefix = document.getText({
    start: { line, character: 0 },
    end: { line, character },
  });
  return getCommandCompletions(linePrefix) ?? [];
});

connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDocumentSymbols(document.getText()).map(toDocumentSymbol);
});

connection.onFoldingRanges((params: FoldingRangeParams): FoldingRange[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getFoldingRanges(document.getText()).map(toFoldingRange);
});

// `only` lists the kinds the client wants; a kind matches itself and anything nested under it
// (`quickfix` covers `quickfix.foo`; `""` covers everything).
function wantsQuickFix(only: string[] | undefined): boolean {
  if (!only) return true;
  return only.some((k) => k === "" || CodeActionKind.QuickFix === k || CodeActionKind.QuickFix.startsWith(`${k}.`));
}

connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document || !wantsQuickFix(params.context.only)) return [];
  return getCodeActions(document.getText(), params.range).map((action) => ({
    title: action.title,
    kind: CodeActionKind.QuickFix,
    diagnostics: [toLspDiagnostic(action.diagnostic)],
    edit: { changes: { [document.uri]: action.edits } },
  }));
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  const hover = document && getHover(document.getText(), params.position);
  return hover ? { contents: { kind: MarkupKind.Markdown, value: hover.markdown }, range: hover.range } : null;
});

connection.onDefinition((params: TextDocumentPositionParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDefinition(document.getText(), params.position).map((range) => ({ uri: document.uri, range }));
});

connection.onReferences((params: ReferenceParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getReferences(document.getText(), params.position, params.context.includeDeclaration).map((range) => ({
    uri: document.uri,
    range,
  }));
});

documents.listen(connection);
connection.listen();
