import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

interface LspRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // `server/` is this extension's own copy of the sibling tfscript-language-server package's
  // dist/, placed there at build time (scripts/copy-server.js) and packaged into the .vsix —
  // NOT a relative path into the sibling repo. A relative path like "../../dist/server.js"
  // only resolves while running this extension unpacked via F5 (where extensionPath is this
  // checkout's own editors/vscode folder); once packaged and installed, VS Code extracts the
  // extension into its own extensions directory, nowhere near the repo that built it, and
  // that relative path points at nothing there.
  const serverModule = join(context.extensionPath, "server", "server.js");

  if (!existsSync(serverModule)) {
    void vscode.window.showErrorMessage(
      `tfscript: server not found at ${serverModule}. Build it into this extension: ` +
        'run "npm run build" in the tfscript-language-server repo root, then "npm run ' +
        'build" in editors/vscode, then repackage.',
    );
    return;
  }

  // The server speaks LSP over its own stdio (createConnection(ProposedFeatures.all,
  // process.stdin, process.stdout) in src/server.ts) regardless of how it's launched, so
  // TransportKind.stdio — not the default ipc — is what actually matches what it does.
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  // The server reads tfscript.* settings itself (workspace/configuration) and keeps an index
  // of every file its load paths reach. It registers the file watchers it needs itself
  // (workspace/didChangeWatchedFiles), since which folders to watch depends on the settings.
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "tf" }],
    synchronize: { configurationSection: "tfscript" },
  };

  client = new LanguageClient("tfscript", "tfscript", serverOptions, clientOptions);
  context.subscriptions.push({ dispose: () => void client?.stop() });

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  status.command = "tfscript.chooseContext";
  context.subscriptions.push(
    status,
    vscode.commands.registerCommand("tfscript.chooseContext", () => chooseContext()),
    // The server's "N references" lenses: VS Code's own references peek needs a Uri, a Position
    // and Locations, which the lens's JSON arguments can't carry, so they are converted here.
    vscode.commands.registerCommand(
      "tfscript.showReferences",
      (uri: string, position: { line: number; character: number }, locations: { uri: string; range: LspRange }[]) => {
        const convert = client?.protocol2CodeConverter;
        if (!convert) return;
        return vscode.commands.executeCommand(
          "editor.action.showReferences",
          vscode.Uri.parse(uri),
          convert.asPosition(position),
          locations.map((l) => convert.asLocation(l)),
        );
      },
    ),
    vscode.window.onDidChangeActiveTextEditor(() => void refreshStatus(status)),
    vscode.workspace.onDidSaveTextDocument(() => void refreshStatus(status)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      // The server re-reads its settings on the same event; give it a moment before asking.
      if (e.affectsConfiguration("tfscript")) setTimeout(() => void refreshStatus(status), 300);
    }),
  );
  void client.start().then(() => refreshStatus(status));
}

interface ContextInfo {
  folder: string;
  active: string;
  used: string;
  contexts: { name: string; entryFiles: string[]; loadsFile: boolean; chain: string[] }[];
}

async function contextInfo(document: vscode.TextDocument): Promise<ContextInfo | null> {
  if (!client?.isRunning() || document.languageId !== "tf" || document.uri.scheme !== "file") return null;
  return client.sendRequest<ContextInfo | null>("tfscript/contextInfo", { uri: document.uri.toString() });
}

/**
 * The status bar item for a tf file: the load context it is seen in (the tfrc, or the
 * `tfscript.contexts` entry, whose /load chain reaches it), with that chain in the tooltip.
 */
async function refreshStatus(status: vscode.StatusBarItem): Promise<void> {
  const document = vscode.window.activeTextEditor?.document;
  const info = document && (await contextInfo(document).catch(() => null));
  if (!info) {
    status.hide();
    return;
  }
  const used = info.contexts.find((c) => c.name === info.used);
  const single = info.contexts.length === 1;
  const name = single && info.used === "default" ? (used?.entryFiles[0] ?? "no tfrc") : info.used;
  const tooltip = new vscode.MarkdownString();
  if (used?.loadsFile) {
    status.text = `$(references) tf: ${name}`;
    tooltip.appendMarkdown(`Seen as loaded by **${info.used}**:\n\n`);
    tooltip.appendText(used.chain.join(" → "));
    if (info.used !== info.active) tooltip.appendMarkdown(`\n\nThe active context, **${info.active}**, doesn't load this file.`);
  } else {
    status.text = `$(circle-slash) tf: not loaded`;
    tooltip.appendMarkdown(
      single && !used?.entryFiles.length
        ? "No tfrc found: set `tfscript.entryFiles` (or `tfscript.contexts`) to the files tf starts with."
        : "No load context reaches this file, so it sees only what `stdlib.tf` defines.",
    );
  }
  tooltip.appendMarkdown("\n\nClick to choose the load context.");
  status.tooltip = tooltip;
  status.show();
}

async function chooseContext(): Promise<void> {
  const document = vscode.window.activeTextEditor?.document;
  const info = document && (await contextInfo(document));
  if (!document || !info) {
    void vscode.window.showInformationMessage("tfscript: open a tf file to choose the load context it is seen in.");
    return;
  }
  type Item = vscode.QuickPickItem & { context?: string };
  const items: Item[] = info.contexts.map((c) => ({
    label: c.name,
    description: [c.name === info.active ? "active" : "", c.entryFiles.join(", ")].filter(Boolean).join(" · "),
    detail: c.loadsFile ? `loads this file: ${c.chain.join(" → ")}` : "doesn't load this file",
    context: c.name,
  }));
  items.push({ label: "$(gear) Configure contexts…", detail: "tfscript.contexts: one entry per way tf is started" });
  const picked = await vscode.window.showQuickPick(items, { placeHolder: "Load context: which way of starting tf to see files through" });
  if (!picked) return;
  if (picked.context === undefined) {
    await vscode.commands.executeCommand("workbench.action.openSettings", "tfscript.contexts");
    return;
  }
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  const target = folder ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Global;
  await vscode.workspace.getConfiguration("tfscript", document.uri).update("activeContext", picked.context, target);
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
