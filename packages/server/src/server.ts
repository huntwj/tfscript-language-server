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
import { homedir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDiagnostics, type TfDiagnostic } from "@tfscript/core/diagnostics";
import { getCompletions } from "./completions";
import { getDocumentSymbols } from "@tfscript/core/symbols";
import { toDocumentSymbol } from "./lspSymbols";
import { getFoldingRanges } from "@tfscript/core/folding";
import { toFoldingRange } from "./lspFolding";
import { getSelectionRanges } from "@tfscript/core/selectionRange";
import { routeCodeActions, toLspCodeAction, type CodeActionRequest } from "@tfscript/core/codeActions";
import { incomingCalls, outgoingCalls, prepareCallHierarchy, type TfCallItem } from "@tfscript/core/callHierarchy";
import { diagnosticHover, rangeContains } from "@tfscript/core/explain";
import { codeHref, findCode } from "@tfscript/core/rules/table";
import {
  getDefinition,
  getDocumentHighlights,
  getHover,
  getReferences,
  getRenameEdits,
  prepareRename,
  type NavContext,
} from "@tfscript/core/navigation";
import { encodeSemanticTokens, getSemanticTokens, TOKEN_MODIFIERS, TOKEN_TYPES } from "@tfscript/core/semanticTokens";
import { getSignatureHelp } from "@tfscript/core/signatureHelp";
import { formatText } from "@tfscript/core/formatting";
import { asLoaded, DEFAULT_TF_BUILD, type TfBuild } from "@tfscript/core/tfBuild";
import type { RawSettings } from "@tfscript/core/workspace/settings";
import { fileKey } from "@tfscript/core/workspace/loadGraph";
import { WorkspaceIndex, type ContextInfo } from "@tfscript/core/workspace/workspaceIndex";
import { nodeEnvironment, nodeFileSystem, readFile } from "@tfscript/core/workspace/nodeFileSystem";
import { documentDiagnostics } from "@tfscript/core/workspace/documentDiagnostics";
import { relevantChange, watchPlan, Watching } from "./watching";
import { logUnhandledRejections } from "./rejections";

// Explicit streams rather than relying on a `--stdio`/`--node-ipc`/`--socket` command-line
// flag: createConnection() alone throws "Connection input stream is not set" without one.
const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);

logUnhandledRejections(process, (text) => process.stderr.write(text));
const documents = new TextDocuments(TextDocument);

const index = new WorkspaceIndex(nodeFileSystem, nodeEnvironment());
let folders: string[] = [];
let hasConfiguration = false;
let canRefreshTokens = false;
let canRefreshLenses = false;
/** The client's command that opens a list of locations, from its initializationOptions (the VS Code extension's tfscript.showReferences). */
let showReferencesCommand: string | undefined;
/**
 * The client's command that starts a rename at a position, from its initializationOptions (the
 * VS Code extension's tfscript.renameAt): run after an action that makes a new name. A client
 * that names none gets the edit alone.
 */
let renameCommand: string | undefined;

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

/**
 * An open document's text as tf reads it with `/load` (core's asLoaded()), which every feature
 * works on. Under the fork a CR at a line's end is gone, and no other character moves. The
 * formatter alone takes the text as it is, since it rewrites it.
 */
function loadedText(document: TextDocument): string {
  const file = toPath(document.uri);
  return asLoaded(document.getText(), file === undefined ? DEFAULT_TF_BUILD : index.tfBuildFor(file));
}

/** Which tf runs a document (its folder's tfscript.tfBuild). */
function buildOf(document: TextDocument): TfBuild {
  const file = toPath(document.uri);
  return file === undefined ? DEFAULT_TF_BUILD : index.tfBuildFor(file);
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
/** The client can show a code action greyed out, with why it can't run (`disabled`). */
let canShowDisabled = false;
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
  const command = (params.initializationOptions as { showReferencesCommand?: unknown } | undefined)?.showReferencesCommand;
  showReferencesCommand = typeof command === "string" && command.length > 0 ? command : undefined;
  const rename = (params.initializationOptions as { renameCommand?: unknown } | undefined)?.renameCommand;
  renameCommand = typeof rename === "string" && rename.length > 0 ? rename : undefined;
  canWatch = Boolean(params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration);
  canWatchOutside = canWatch && Boolean(params.capabilities.workspace?.didChangeWatchedFiles?.relativePatternSupport);
  canShowDisabled = Boolean(params.capabilities.textDocument?.codeAction?.disabledSupport);
  return {
    capabilities: {
      workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["/", "{"] },
      documentSymbolProvider: true,
      documentLinkProvider: { resolveProvider: false },
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorRewrite, CodeActionKind.RefactorExtract, CodeActionKind.RefactorInline] },
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
    // The code shows as a link to its entry in docs/rules.md.
    ...(findCode(d.code) ? { codeDescription: { href: codeHref(d.code) } } : {}),
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
  const text = loadedText(document);
  const file = toPath(document.uri);
  const all = documentDiagnostics(text, file, index);
  published.set(document.uri, { version: document.version, diagnostics: all });
  connection.sendDiagnostics({ uri: document.uri, diagnostics: all.map((d) => toLspDiagnostic(d, document.uri)) });
}

/** The diagnostics last published for each open document, for the hover's explanations. */
const published = new Map<string, { version: number; diagnostics: TfDiagnostic[] }>();

function diagnosticsFor(document: TextDocument): TfDiagnostic[] {
  const last = published.get(document.uri);
  if (last && last.version === document.version) return last.diagnostics;
  const file = toPath(document.uri);
  const localPrefix = file === undefined ? undefined : index.localPrefixFor(file);
  return getDiagnostics(loadedText(document), { tfBuild: buildOf(document), ...(localPrefix ? { localPrefix } : {}) });
}

connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  return document ? getCompletions(loadedText(document), params.position, contextFor(document)) : [];
});

connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDocumentSymbols(loadedText(document)).map(toDocumentSymbol);
});

connection.onFoldingRanges((params: FoldingRangeParams): FoldingRange[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getFoldingRanges(loadedText(document)).map(toFoldingRange);
});

connection.onSelectionRanges((params: SelectionRangeParams): SelectionRange[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getSelectionRanges(loadedText(document), params.positions);
});

connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const request: CodeActionRequest = { range: params.range, diagnostics: diagnosticsFor(document), disabledSupport: canShowDisabled };
  if (params.context.only) request.only = params.context.only;
  if (params.context.triggerKind !== undefined) request.triggerKind = params.context.triggerKind;
  const file = toPath(document.uri);
  // Only worked out when an extracted macro needs a name.
  let taken: ((name: string) => boolean) | undefined;
  if (file) request.isTaken = (name) => (taken ??= index.macroNameTaken(file, loadedText(document)))(name);
  // And, for inlining, whether the macro's /def is the only one, and whether other files name it
  // (or, for a new local variable's name, mention the word at all).
  let outside: ((name: string) => boolean) | undefined;
  let mentioned: ((name: string) => boolean) | undefined;
  if (file) request.definedOutside = (name) => (outside ??= index.macroDefinedOutside(file))(name);
  if (file) request.mentionedOutside = (name) => (mentioned ??= index.macroMentionedOutside(file))(name);
  if (file && index.isLibraryFile(file)) request.library = true;
  if (file) request.tfBuild = index.tfBuildFor(file);
  let functions: ((name: string) => boolean) | undefined;
  if (file) request.calledAsFunction = (name) => (functions ??= index.macroCalledAsFunction(file, loadedText(document)))(name);
  return routeCodeActions(loadedText(document), request).map((action) => toLspCodeAction(action, document.uri, (d) => toLspDiagnostic(d, document.uri), renameCommand));
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const text = loadedText(document);
  // VS Code shows a diagnostic's message at the top of the hover by itself; this adds its
  // excerpt, explanation and what its code means below, then whatever the hover says about the word itself.
  const explained = diagnosticsFor(document)
    .filter((d) => rangeContains(d.range, params.position))
    .flatMap((d) => diagnosticHover(text, d) ?? []);
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
  const help = document && getSignatureHelp(loadedText(document), params.position, contextFor(document));
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
  return { data: document ? encodeSemanticTokens(getSemanticTokens(loadedText(document), contextFor(document))) : [] };
});

function formatting(params: DocumentFormattingParams | DocumentRangeFormattingParams): TextEdit[] {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  // The style is the formatter's own (DEFAULT_FORMAT_OPTIONS), whatever the editor's tab size.
  const range = "range" in params ? params.range : undefined;
  return formatText(document.getText(), {}, range);
}

connection.onDocumentFormatting(formatting);
connection.onDocumentRangeFormatting(formatting);

connection.onDefinition((params: TextDocumentPositionParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const ctx = contextFor(document);
  return getDefinition(loadedText(document), params.position, ctx).map((l) => ({ uri: l.uri || document.uri, range: l.range }));
});

connection.onReferences((params: ReferenceParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const ctx = contextFor(document);
  return getReferences(loadedText(document), params.position, params.context.includeDeclaration, ctx).map((l) => ({
    uri: l.uri || document.uri,
    range: l.range,
  }));
});

/** A document's text as tf reads it: the editor's if it is open, else what is on disk. */
function textOf(uri: string): string | undefined {
  const open = documents.get(uri);
  if (open) return loadedText(open);
  const file = toPath(uri);
  const text = file === undefined ? undefined : readFile(file);
  return file === undefined || text === undefined ? undefined : asLoaded(text, index.tfBuildFor(file));
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
  const items = prepareCallHierarchy(loadedText(document), params.position, contextFor(document));
  return items.length > 0 ? items.map((i) => toCallItem({ ...i, uri: i.uri || document.uri })) : null;
});

connection.languages.callHierarchy.onIncomingCalls((params): CallHierarchyIncomingCall[] => {
  const file = toPath(params.item.uri);
  if (file === undefined) return [];
  const callers = {
    contextOf: (uri: string) => {
      const caller = toPath(uri);
      return caller === undefined ? undefined : index.callerContext(caller, toUri);
    },
    keyOf: (uri: string) => fileKey(toPath(uri) ?? uri),
  };
  return incomingCalls(fromCallItem(params.item), index.callerFiles(file, toUri), callers).map((c) => ({
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
// file with many /defs stays cheap. LSP has no standard command that opens a list of locations,
// so the lenses are only offered to a client that names one in its initializationOptions
// (`showReferencesCommand`), called with a URI, a position and the locations: the VS Code
// extension's tfscript.showReferences, which opens the references peek (VS Code's own
// editor.action.showReferences needs Uri and Position objects, which JSON arguments can't carry).
// A lens another client couldn't run would only fail when clicked.
interface LensData {
  uri: string;
  position: { line: number; character: number };
}

connection.onCodeLens((params): CodeLens[] => {
  const document = documents.get(params.textDocument.uri);
  const file = document && toPath(document.uri);
  if (!showReferencesCommand || !document || file === undefined || !index.referenceLenses(file)) return [];
  return getDocumentSymbols(loadedText(document))
    .filter((s) => s.kind === "def")
    .map((s) => ({ range: s.selectionRange, data: { uri: document.uri, position: s.selectionRange.start } satisfies LensData }));
});

connection.onCodeLensResolve((lens): CodeLens => {
  const data = lens.data as LensData;
  const document = documents.get(data.uri);
  if (!document) return { ...lens, command: { title: "references", command: "" } };
  const locations = getReferences(loadedText(document), data.position, false, contextFor(document)).map((l) => ({
    uri: l.uri || document.uri,
    range: l.range,
  }));
  const n = locations.length;
  return {
    ...lens,
    command: {
      title: n === 1 ? "1 reference" : `${n} references`,
      command: showReferencesCommand ?? "",
      arguments: [data.uri, data.position, locations],
    },
  };
});

connection.onDocumentHighlight((params: TextDocumentPositionParams): DocumentHighlight[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return getDocumentHighlights(loadedText(document), params.position).map((h) => ({
    range: h.range,
    kind: h.kind === "write" ? DocumentHighlightKind.Write : DocumentHighlightKind.Read,
  }));
});

connection.onDocumentLinks((params: DocumentLinkParams): DocumentLink[] => {
  const document = documents.get(params.textDocument.uri);
  const file = document && toPath(document.uri);
  if (!document || file === undefined) return [];
  return index.documentLinks(file, loadedText(document)).map((link) => ({
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
  const result = prepareRename(loadedText(document), params.position, contextFor(document));
  if ("error" in result) throw new ResponseError(ErrorCodes.InvalidRequest, result.error);
  return result;
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const result = getRenameEdits(loadedText(document), params.position, params.newName, contextFor(document));
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
