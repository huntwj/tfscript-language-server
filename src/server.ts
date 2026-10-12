#!/usr/bin/env node
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type CompletionItem,
  type CompletionParams,
  type Diagnostic,
  DiagnosticSeverity,
  type InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getDiagnostics } from "./diagnostics";
import { getCommandCompletions } from "./completions";

// Explicit streams rather than relying on a `--stdio`/`--node-ipc`/`--socket` command-line
// flag: createConnection() alone throws "Connection input stream is not set" without one.
const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ["/"] },
  },
}));

// Not onDidOpen too: TextDocuments fires onDidChangeContent for the initial open as well
// (vscode-languageserver's didOpen handler fires both), so that alone already covers it.
documents.onDidChangeContent((change) => validate(change.document));
documents.onDidClose((event) =>
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] }),
);

function validate(document: TextDocument): void {
  const diagnostics: Diagnostic[] = getDiagnostics(document.getText()).map((d) => ({
    range: d.range,
    message: d.message,
    code: d.code,
    source: "tfscript",
    severity: d.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
  }));
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

documents.listen(connection);
connection.listen();
