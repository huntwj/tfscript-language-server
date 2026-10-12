import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

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

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "tf" }],
  };

  client = new LanguageClient("tfscript", "tfscript", serverOptions, clientOptions);
  void client.start();
  context.subscriptions.push({ dispose: () => void client?.stop() });
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
