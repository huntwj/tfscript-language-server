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
  type DocumentFormattingParams,
  type DocumentRangeFormattingParams,
  type FoldingRange,
  type FoldingRangeParams,
  type Hover,
  DidChangeConfigurationNotification,
  type InitializeParams,
  type InitializeResult,
  type Location,
  MarkupKind,
  type PrepareRenameParams,
  type ReferenceParams,
  type SemanticTokens,
  type SemanticTokensParams,
  type SignatureHelp,
  type RenameParams,
  ResponseError,
  ErrorCodes,
  type SymbolInformation,
  type TextEdit,
  type WorkspaceEdit,
  type WorkspaceSymbolParams,
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
import { getDefinition, getHover, getReferences, getRenameEdits, prepareRename, type NavContext } from "./navigation";
import { encodeSemanticTokens, getSemanticTokens, TOKEN_MODIFIERS, TOKEN_TYPES } from "./semanticTokens";
import { getSignatureHelp } from "./signatureHelp";
import { formatText } from "./formatting";
import type { RawSettings } from "./workspace/settings";
import { fileKey } from "./workspace/loadGraph";
import { WorkspaceIndex, type ContextInfo } from "./workspace/workspaceIndex";

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

const SKIP_DIRS = new Set([".git", ".jj", "node_modules"]);

function walkTfFiles(dir: string): string[] {
  const out: string[] = [];
  const visit = (d: string): void => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) visit(full);
      } else if (e.name.endsWith(".tf") || e.name === "tfrc" || e.name === ".tfrc") {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
}

const index = new WorkspaceIndex({ readFile, listTfFiles, walkTfFiles }, { env: process.env, homedir: homedir(), exists: existsSync });
let folders: string[] = [];
let hasConfiguration = false;
let canRefreshTokens = false;

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
  revalidateOpenDocuments();
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  folders = (params.workspaceFolders ?? []).map((f) => toPath(f.uri)).filter((f): f is string => f !== undefined);
  if (folders.length === 0 && params.rootUri) {
    const root = toPath(params.rootUri);
    if (root) folders = [root];
  }
  index.setFolders(folders);
  hasConfiguration = Boolean(params.capabilities.workspace?.configuration);
  canRefreshTokens = Boolean(params.capabilities.workspace?.semanticTokens?.refreshSupport);
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
      workspaceSymbolProvider: true,
      renameProvider: { prepareProvider: true },
      semanticTokensProvider: { legend: { tokenTypes: [...TOKEN_TYPES], tokenModifiers: [...TOKEN_MODIFIERS] }, full: true },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      signatureHelpProvider: { triggerCharacters: [" "], retriggerCharacters: ["=", "-"] },
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
connection.onDidChangeWatchedFiles(() => {
  index.invalidate();
  scheduleRevalidation();
});

// An edit to one file can change another's load-path diagnostics (a /def added, a /load
// fixed), so every open document is rechecked — after a pause, not on every keystroke.
let revalidateTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleRevalidation(): void {
  if (revalidateTimer) clearTimeout(revalidateTimer);
  revalidateTimer = setTimeout(revalidateOpenDocuments, 300);
}
function revalidateOpenDocuments(): void {
  revalidateTimer = undefined;
  for (const document of documents.all()) validate(document);
  // A macro defined or removed in one file changes how calls to it are coloured in the others.
  if (canRefreshTokens) connection.languages.semanticTokens.refresh();
}

// Not onDidOpen too: TextDocuments fires onDidChangeContent for the initial open as well
// (vscode-languageserver's didOpen handler fires both), so that alone already covers it.
documents.onDidChangeContent((change) => {
  const file = toPath(change.document.uri);
  if (file) index.setOverlay(file, change.document.getText());
  validate(change.document);
  scheduleRevalidation();
});
documents.onDidClose((event) => {
  const file = toPath(event.document.uri);
  if (file) index.setOverlay(file, undefined);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  scheduleRevalidation();
});

function toLspDiagnostic(d: TfDiagnostic): Diagnostic {
  return {
    range: d.range,
    message: d.message,
    code: d.code,
    source: "tfscript",
    severity:
      d.severity === "error"
        ? DiagnosticSeverity.Error
        : d.severity === "warning"
          ? DiagnosticSeverity.Warning
          : DiagnosticSeverity.Information,
  };
}

function validate(document: TextDocument): void {
  const text = document.getText();
  const file = toPath(document.uri);
  const all = [...getDiagnostics(text), ...(file ? index.loadPathDiagnostics(file, text) : [])];
  connection.sendDiagnostics({ uri: document.uri, diagnostics: all.map(toLspDiagnostic) });
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

connection.onSignatureHelp((params: TextDocumentPositionParams): SignatureHelp | null => {
  const document = documents.get(params.textDocument.uri);
  const help = document && getSignatureHelp(document.getText(), params.position, contextFor(document));
  if (!help) return null;
  return {
    signatures: help.signatures.map((s) => ({
      label: s.label,
      parameters: s.parameters.map((label) => ({ label })),
      ...(s.documentation ? { documentation: s.documentation } : {}),
    })),
    activeSignature: help.activeSignature,
    // -1 (no parameter, e.g. after `--`) is sent out of range so nothing is highlighted.
    activeParameter: help.activeParameter >= 0 ? help.activeParameter : (help.signatures[help.activeSignature]?.parameters.length ?? 0),
  };
});

connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
  const document = documents.get(params.textDocument.uri);
  return { data: document ? encodeSemanticTokens(getSemanticTokens(document.getText(), contextFor(document))) : [] };
});

async function formatting(params: DocumentFormattingParams | DocumentRangeFormattingParams): Promise<TextEdit[]> {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  let splitStatements = true;
  if (hasConfiguration) {
    const raw = (await connection.workspace.getConfiguration({ scopeUri: document.uri, section: "tfscript" })) as RawSettings | null;
    splitStatements = raw?.format?.splitStatements ?? true;
  }
  const indent = params.options.insertSpaces ? " ".repeat(params.options.tabSize) : "\t";
  const range = "range" in params ? params.range : undefined;
  return formatText(document.getText(), { indent, splitStatements }, range);
}

connection.onDocumentFormatting(formatting);
connection.onDocumentRangeFormatting(formatting);

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

// Not part of LSP: the editor's context picker asks which load contexts reach a file, through
// which chain of loads, and which one the file is seen in. Choosing one is the
// `tfscript.activeContext` setting, which arrives like any other configuration change.
connection.onRequest("tfscript/contextInfo", (params: { uri: string }): ContextInfo | null => {
  const file = toPath(params.uri);
  return file === undefined ? null : index.contextInfo(file);
});

connection.onWorkspaceSymbol((params: WorkspaceSymbolParams): SymbolInformation[] =>
  index.workspaceSymbols(params.query).map(({ file, folder, symbol }) => ({
    name: symbol.name,
    kind: toDocumentSymbol(symbol).kind,
    location: { uri: toUri(file), range: symbol.selectionRange },
    containerName: path.relative(folder, file).replace(/\\/g, "/"),
  })),
);

connection.onPrepareRename((params: PrepareRenameParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const result = prepareRename(document.getText(), params.position, contextFor(document));
  if ("error" in result) throw new ResponseError(ErrorCodes.InvalidRequest, result.error);
  return result;
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const result = getRenameEdits(document.getText(), params.position, params.newName, contextFor(document));
  if ("error" in result) throw new ResponseError(ErrorCodes.InvalidRequest, result.error);
  const changes: Record<string, TextEdit[]> = {};
  for (const edit of result) {
    const uri = edit.uri || document.uri;
    (changes[uri] ??= []).push({ range: edit.range, newText: edit.newText });
  }
  return { changes };
});

documents.listen(connection);
connection.listen();
