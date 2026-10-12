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

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ["/"] },
  },
}));

documents.onDidChangeContent((change) => validate(change.document));
documents.onDidOpen((event) => validate(event.document));

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
