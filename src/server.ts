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
  DidChangeConfigurationNotification,
  type InitializeParams,
  type InitializeResult,
  type Location,
  MarkupKind,
  type ReferenceParams,
  type TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDiagnostics, type TfDiagnostic } from "./diagnostics";
import { getCommandCompletions } from "./completions";
import { getDocumentSymbols, toDocumentSymbol } from "./symbols";
import { getFoldingRanges, toFoldingRange } from "./folding";
import { getCodeActions } from "./codeActions";
import { getDefinition, getHover, getReferences, type NavContext } from "./navigation";
import type { RawSettings } from "./workspace/settings";
import { fileKey } from "./workspace/loadGraph";
import { WorkspaceIndex } from "./workspace/workspaceIndex";

// Explicit streams rather than relying on a `--stdio`/`--node-ipc`/`--socket` command-line
// flag: createConnection() alone throws "Connection input stream is not set" without one.
const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

function readFile(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

function listTfFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".tf"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

const index = new WorkspaceIndex({ readFile, listTfFiles }, { env: process.env, homedir: homedir(), exists: existsSync });
let folders: string[] = [];
let hasConfiguration = false;

function toPath(uri: string): string | undefined {
  if (!uri.startsWith("file:")) return undefined;
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
}

const sameFile = (a: string, b: string): boolean => fileKey(a) === fileKey(b);

// An open document keeps the URI the editor gave it (VS Code writes `file:///c%3A/...` on
// Windows), so a location in it must use that exact string, not a freshly built one.
function toUri(file: string): string {
  const open = documents.all().find((d) => {
    const p = toPath(d.uri);
    return p !== undefined && sameFile(p, file);
  });
  return open?.uri ?? pathToFileURL(file).href;
}

function contextFor(document: TextDocument): NavContext | undefined {
  const file = toPath(document.uri);
  return file === undefined ? undefined : index.navContext(file, toUri);
}

async function loadSettings(): Promise<void> {
  if (!hasConfiguration) return;
  for (const folder of folders) {
    const raw = (await connection.workspace.getConfiguration({
      scopeUri: pathToFileURL(folder).href,
      section: "tfscript",
    })) as RawSettings | null;
    index.setSettings(folder, raw ?? {});
  }
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  folders = (params.workspaceFolders ?? []).map((f) => toPath(f.uri)).filter((f): f is string => f !== undefined);
  if (folders.length === 0 && params.rootUri) {
    const root = toPath(params.rootUri);
    if (root) folders = [root];
  }
  index.setFolders(folders);
  hasConfiguration = Boolean(params.capabilities.workspace?.configuration);
  return {
    capabilities: {
      workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["/"] },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
    },
  };
});

connection.onInitialized(() => {
  if (hasConfiguration) {
    void connection.client.register(DidChangeConfigurationNotification.type, undefined);
    void loadSettings();
  }
  connection.workspace.onDidChangeWorkspaceFolders((event) => {
    const removed = event.removed.map((f) => toPath(f.uri));
    folders = folders.filter((f) => !removed.some((r) => r !== undefined && sameFile(r, f)));
    for (const f of event.added) {
      const p = toPath(f.uri);
      if (p) folders.push(p);
    }
    index.setFolders(folders);
    void loadSettings();
  });
});

connection.onDidChangeConfiguration(() => void loadSettings());
connection.onDidChangeWatchedFiles(() => index.invalidate());

// Not onDidOpen too: TextDocuments fires onDidChangeContent for the initial open as well
// (vscode-languageserver's didOpen handler fires both), so that alone already covers it.
documents.onDidChangeContent((change) => {
  const file = toPath(change.document.uri);
  if (file) index.setOverlay(file, change.document.getText());
  validate(change.document);
});
documents.onDidClose((event) => {
  const file = toPath(event.document.uri);
  if (file) index.setOverlay(file, undefined);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

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
  const hover = document && getHover(document.getText(), params.position, contextFor(document));
  return hover ? { contents: { kind: MarkupKind.Markdown, value: hover.markdown }, range: hover.range } : null;
});

connection.onDefinition((params: TextDocumentPositionParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const ctx = contextFor(document);
  return getDefinition(document.getText(), params.position, ctx).map((l) => ({ uri: l.uri || document.uri, range: l.range }));
});

connection.onReferences((params: ReferenceParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const ctx = contextFor(document);
  return getReferences(document.getText(), params.position, params.context.includeDeclaration, ctx).map((l) => ({
    uri: l.uri || document.uri,
    range: l.range,
  }));
});

documents.listen(connection);
connection.listen();
