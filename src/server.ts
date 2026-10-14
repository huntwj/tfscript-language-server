#!/usr/bin/env node
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type CallHierarchyItem,
  type CallHierarchyIncomingCall,
  type CallHierarchyOutgoingCall,
  type CodeAction,
  type CodeLens,
  CodeLensRefreshRequest,
  CodeActionKind,
  type CodeActionParams,
  type CompletionItem,
  type CompletionParams,
  type Diagnostic,
  DiagnosticSeverity,
  type DocumentHighlight,
  DocumentHighlightKind,
  type DocumentSymbol,
  type DocumentLink,
  type DocumentLinkParams,
  type DocumentSymbolParams,
  type DocumentFormattingParams,
  type DocumentRangeFormattingParams,
  type FoldingRange,
  type FoldingRangeParams,
  type Hover,
  DidChangeConfigurationNotification,
  DidChangeWatchedFilesNotification,
  type InitializeParams,
  type InitializeResult,
  type Location,
  MarkupKind,
  type PrepareRenameParams,
  type ReferenceParams,
  type SelectionRange,
  type SelectionRangeParams,
  type SemanticTokens,
  type SemanticTokensParams,
  type SignatureHelp,
  type RenameParams,
  ResponseError,
  ErrorCodes,
  type SymbolInformation,
  SymbolKind,
  type TextEdit,
  type WorkspaceEdit,
  type WorkspaceSymbolParams,
  type TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDiagnostics, type TfDiagnostic } from "./diagnostics";
import { getCompletions } from "./completions";
import { getDocumentSymbols, toDocumentSymbol } from "./symbols";
import { getFoldingRanges, toFoldingRange } from "./folding";
import { getSelectionRanges } from "./selectionRange";
import { routeCodeActions, type CodeActionRequest } from "./codeActions";
import { incomingCalls, outgoingCalls, prepareCallHierarchy, type TfCallItem } from "./callHierarchy";
import { explainDiagnostic, rangeContains } from "./explain";
import {
  getDefinition,
  getDocumentHighlights,
  getHover,
  getReferences,
  getRenameEdits,
  prepareRename,
  type NavContext,
} from "./navigation";
import { encodeSemanticTokens, getSemanticTokens, TOKEN_MODIFIERS, TOKEN_TYPES } from "./semanticTokens";
import { getSignatureHelp } from "./signatureHelp";
import { formatText } from "./formatting";
import type { RawSettings } from "./workspace/settings";
import { fileKey } from "./workspace/loadGraph";
import { WorkspaceIndex, type ContextInfo } from "./workspace/workspaceIndex";
import { isSkippedDir, relevantChange, watchPlan, Watching } from "./watching";
import { logUnhandledRejections } from "./rejections";

// Explicit streams rather than relying on a `--stdio`/`--node-ipc`/`--socket` command-line
// flag: createConnection() alone throws "Connection input stream is not set" without one.
const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);

logUnhandledRejections(process, (text) => process.stderr.write(text));
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


/** Stops as soon as it has `limit` files: a big tree isn't read to the end and then cut. */
function walkTfFiles(dir: string, limit = Infinity): string[] {
  const out: string[] = [];
  const visit = (d: string): void => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!isSkippedDir(e.name)) visit(full);
      } else if (e.name.endsWith(".tf") || e.name === "tfrc" || e.name === ".tfrc") {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
}

function mtime(file: string): number | undefined {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
}

const index = new WorkspaceIndex({ readFile, listTfFiles, walkTfFiles, mtime }, { env: process.env, homedir: homedir(), exists: existsSync });
let folders: string[] = [];
let hasConfiguration = false;
let canRefreshTokens = false;
let canRefreshLenses = false;

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

/**
 * Reads the settings, then registers the watchers they call for. Runs one at a time: a later
 * call waits for the one before, so registrations don't overlap. Whatever fails, the open
 * documents are checked again.
 */
let settingsQueue: Promise<void> = Promise.resolve();
function loadSettings(): Promise<void> {
  settingsQueue = settingsQueue.then(loadSettingsNow, loadSettingsNow);
  return settingsQueue;
}

async function loadSettingsNow(): Promise<void> {
  try {
    if (hasConfiguration) {
      for (const folder of folders) {
        const raw = (await connection.workspace.getConfiguration({
          scopeUri: pathToFileURL(folder).href,
          section: "tfscript",
        })) as RawSettings | null;
        index.setSettings(folder, raw ?? {});
      }
    }
    // The folders to watch depend on the settings (the library, mapped folders).
    await watching.update(() =>
      canWatch ? watchPlan(folders, folders.map((f) => index.settingsFor(f)), canWatchOutside, homedir()) : undefined,
    );
  } catch (error) {
    connection.console.error(`tfscript: reading the settings failed: ${String(error)}`);
  } finally {
    revalidateOpenDocuments();
  }
}

let canWatch = false;
let canWatchOutside = false;
const watching = new Watching(
  (watchers) => connection.client.register(DidChangeWatchedFilesNotification.type, { watchers }),
  (roots) => index.setWatchedRoots(roots),
  (message) => connection.console.error(message),
  // Changes made before the new watchers were in place weren't reported to anyone.
  () => index.filesChanged(),
);

// A check of unwatched files skipped for being too soon is made up for once the second is up.
index.setRecheck((delayMs) => setTimeout(revalidateOpenDocuments, delayMs + 10));

connection.onInitialize((params: InitializeParams): InitializeResult => {
  folders = (params.workspaceFolders ?? []).map((f) => toPath(f.uri)).filter((f): f is string => f !== undefined);
  if (folders.length === 0 && params.rootUri) {
    const root = toPath(params.rootUri);
    if (root) folders = [root];
  }
  index.setFolders(folders);
  hasConfiguration = Boolean(params.capabilities.workspace?.configuration);
  canRefreshTokens = Boolean(params.capabilities.workspace?.semanticTokens?.refreshSupport);
  canRefreshLenses = Boolean(params.capabilities.workspace?.codeLens?.refreshSupport);
  canWatch = Boolean(params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration);
  canWatchOutside = canWatch && Boolean(params.capabilities.workspace?.didChangeWatchedFiles?.relativePatternSupport);
  return {
    capabilities: {
      workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["/", "{"] },
      documentSymbolProvider: true,
      documentLinkProvider: { resolveProvider: false },
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorRewrite] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentHighlightProvider: true,
      callHierarchyProvider: true,
      codeLensProvider: { resolveProvider: true },
      workspaceSymbolProvider: true,
      renameProvider: { prepareProvider: true },
      semanticTokensProvider: { legend: { tokenTypes: [...TOKEN_TYPES], tokenModifiers: [...TOKEN_MODIFIERS] }, full: true },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      signatureHelpProvider: { triggerCharacters: [" ", "(", ","], retriggerCharacters: ["=", "-", ")"] },
    },
  };
});

connection.onInitialized(() => {
  if (hasConfiguration) {
    connection.client
      .register(DidChangeConfigurationNotification.type, undefined)
      .catch((error: unknown) => connection.console.error(`tfscript: the client refused configuration change notifications: ${String(error)}`));
  }
  void loadSettings();
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
connection.onDidChangeWatchedFiles((params) => {
  // A jj or git command churns .jj and .git; nothing there is read.
  if (!params.changes.some((c) => relevantChange(toPath(c.uri) ?? c.uri))) return;
  // What was read from disk (files, folder listings) may be stale now.
  index.filesChanged();
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
  // ...and how many references the "N references" lenses count (and the setting that shows them).
  if (canRefreshLenses) void connection.sendRequest(CodeLensRefreshRequest.type).catch(() => undefined);
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
  published.delete(event.document.uri);
  const file = toPath(event.document.uri);
  if (file) index.setOverlay(file, undefined);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  scheduleRevalidation();
});

function toLspDiagnostic(d: TfDiagnostic, uri: string): Diagnostic {
  return {
    range: d.range,
    message: d.message,
    code: d.code,
    source: "tfscript",
    ...(d.related ? { relatedInformation: d.related.map((r) => ({ location: { uri, range: r.range }, message: r.message })) } : {}),
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
  published.set(document.uri, { version: document.version, diagnostics: all });
  connection.sendDiagnostics({ uri: document.uri, diagnostics: all.map((d) => toLspDiagnostic(d, document.uri)) });
}

/** The diagnostics last published for each open document, for the hover's explanations. */
const published = new Map<string, { version: number; diagnostics: TfDiagnostic[] }>();

function diagnosticsFor(document: TextDocument): TfDiagnostic[] {
  const last = published.get(document.uri);
  return last && last.version === document.version ? last.diagnostics : getDiagnostics(document.getText());
}

connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  return document ? getCompletions(document.getText(), params.position, contextFor(document)) : [];
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

connection.onSelectionRanges((params: SelectionRangeParams): SelectionRange[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getSelectionRanges(document.getText(), params.positions);
});

connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const request: CodeActionRequest = { range: params.range, diagnostics: diagnosticsFor(document) };
  if (params.context.only) request.only = params.context.only;
  if (params.context.triggerKind !== undefined) request.triggerKind = params.context.triggerKind;
  return routeCodeActions(document.getText(), request).map((action) => ({
    title: action.title,
    kind: action.kind,
    ...(action.diagnostic ? { diagnostics: [toLspDiagnostic(action.diagnostic, document.uri)] } : {}),
    edit: { changes: { [document.uri]: action.edits } },
  }));
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const text = document.getText();
  // VS Code shows a diagnostic's message at the top of the hover by itself; this adds its
  // excerpt and explanation below, then whatever the hover says about the word itself.
  const explained = diagnosticsFor(document)
    .filter((d) => rangeContains(d.range, params.position))
    .flatMap((d) => explainDiagnostic(text, d) ?? []);
  const hover = getHover(text, params.position, contextFor(document));
  const parts = [...explained, ...(hover ? [hover.markdown] : [])];
  if (parts.length === 0) return null;
  return {
    contents: { kind: MarkupKind.Markdown, value: parts.join("\n\n---\n\n") },
    ...(hover && explained.length === 0 ? { range: hover.range } : {}),
  };
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

/** A document's text: the editor's if it is open, else what is on disk. */
function textOf(uri: string): string | undefined {
  const open = documents.get(uri);
  if (open) return open.getText();
  const file = toPath(uri);
  return file === undefined ? undefined : readFile(file);
}

function navContextOf(uri: string): NavContext | undefined {
  const file = toPath(uri);
  return file === undefined ? undefined : index.navContext(file, toUri);
}

const CALL_KIND: Record<TfCallItem["kind"], SymbolKind> = { macro: SymbolKind.Function, trigger: SymbolKind.Event, file: SymbolKind.File };

function toCallItem(item: TfCallItem): CallHierarchyItem {
  const { kind, ...rest } = item;
  return { ...rest, kind: CALL_KIND[kind], data: { kind } };
}

function fromCallItem(item: CallHierarchyItem): TfCallItem {
  const kind = (item.data as { kind?: TfCallItem["kind"] } | undefined)?.kind ?? "macro";
  return { name: item.name, kind, uri: item.uri, range: item.range, selectionRange: item.selectionRange, detail: item.detail ?? "" };
}

connection.languages.callHierarchy.onPrepare((params): CallHierarchyItem[] | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const items = prepareCallHierarchy(document.getText(), params.position, contextFor(document));
  return items.length > 0 ? items.map((i) => toCallItem({ ...i, uri: i.uri || document.uri })) : null;
});

connection.languages.callHierarchy.onIncomingCalls((params): CallHierarchyIncomingCall[] => {
  const file = toPath(params.item.uri);
  if (file === undefined) return [];
  return incomingCalls(fromCallItem(params.item), index.callerFiles(file, toUri)).map((c) => ({
    from: toCallItem(c.from),
    fromRanges: c.fromRanges,
  }));
});

connection.languages.callHierarchy.onOutgoingCalls((params): CallHierarchyOutgoingCall[] => {
  const text = textOf(params.item.uri);
  if (text === undefined) return [];
  return outgoingCalls(fromCallItem(params.item), text, navContextOf(params.item.uri)).map((c) => ({
    to: toCallItem({ ...c.to, uri: c.to.uri || params.item.uri }),
    fromRanges: c.fromRanges,
  }));
});

// "N references" above each /def, counted when the editor shows it (codeLens/resolve), so a
// file with many /defs stays cheap. The command is the VS Code extension's own
// tfscript.showReferences, which opens the references peek: VS Code's editor.action.showReferences
// needs its Uri and Position objects, which JSON arguments can't carry.
interface LensData {
  uri: string;
  position: { line: number; character: number };
}

connection.onCodeLens((params): CodeLens[] => {
  const document = documents.get(params.textDocument.uri);
  const file = document && toPath(document.uri);
  if (!document || file === undefined || !index.referenceLenses(file)) return [];
  return getDocumentSymbols(document.getText())
    .filter((s) => s.kind === "def")
    .map((s) => ({ range: s.selectionRange, data: { uri: document.uri, position: s.selectionRange.start } satisfies LensData }));
});

connection.onCodeLensResolve((lens): CodeLens => {
  const data = lens.data as LensData;
  const document = documents.get(data.uri);
  if (!document) return { ...lens, command: { title: "references", command: "" } };
  const locations = getReferences(document.getText(), data.position, false, contextFor(document)).map((l) => ({
    uri: l.uri || document.uri,
    range: l.range,
  }));
  const n = locations.length;
  return {
    ...lens,
    command: {
      title: n === 1 ? "1 reference" : `${n} references`,
      command: "tfscript.showReferences",
      arguments: [data.uri, data.position, locations],
    },
  };
});

connection.onDocumentHighlight((params: TextDocumentPositionParams): DocumentHighlight[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDocumentHighlights(document.getText(), params.position).map((h) => ({
    range: h.range,
    kind: h.kind === "write" ? DocumentHighlightKind.Write : DocumentHighlightKind.Read,
  }));
});

connection.onDocumentLinks((params: DocumentLinkParams): DocumentLink[] => {
  const document = documents.get(params.textDocument.uri);
  const file = document && toPath(document.uri);
  if (!document || file === undefined) return [];
  return index.documentLinks(file, document.getText()).map((link) => ({
    range: link.range,
    target: toUri(link.target),
    tooltip: `Open ${link.target}`,
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
