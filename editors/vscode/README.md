# tfscript VS Code extension

A thin client: this extension has no logic of its own beyond starting
[`vscode-languageclient`](https://www.npmjs.com/package/vscode-languageclient) pointed at a
bundled copy of the sibling `tfscript-language-server` package's own `dist/` — see
`src/extension.ts` and `scripts/copy-server.js`. That copy is a real, on-disk copy made at
build time, not a relative path into the sibling repo: once packaged, VS Code extracts this
extension into its own extensions directory (e.g. `~/.vscode/extensions/...`), nowhere near
the repo that built it, so a path like `../../dist/server.js` (which *does* work when running
this extension unpacked via F5) would resolve to nothing there.

`vscode-languageserver` and `vscode-languageserver-textdocument` are listed as this package's
own dependencies too, even though they look like they belong only to the root package — the
copied `server/server.js` still needs to `require()` them at runtime, and Node resolves that
by walking up from `server/`'s own location, which only finds them if they're installed in
*this* package's `node_modules`, not the root repo's.

Running the extension needs no separately-installed Node or npm: VS Code forks the bundled
server using its own Node/Electron runtime (`vscode-languageclient`'s `TransportKind.stdio`
uses `child_process.fork()` with no explicit runtime override, confirmed by reading its
source). Node and npm are only needed to *build* this extension from source.

## What it adds over the bare server

- `.tf` files are recognized as the `tf` language (`contributes.languages`).
- Basic syntax highlighting (`syntaxes/tf.tmLanguage.json`): comments (`;` and `#`),
  `/command`s, `%{var}`/`%0`-`%9`/`%*`/`%;` substitution, and `$[...]` expressions — the
  pieces of tfscript's syntax this project has actually proven, not a full grammar.
- Line-comment toggling and bracket matching (`language-configuration.json`) — `;` is the
  default toggle-comment character; `#` also works in tf but VS Code only supports one
  toggle-comment string per language.
- Diagnostics and `/`-triggered completion, via the LSP server, same as any other client.

## Building and installing

```sh
# from the repo root, first:
npm install && npm run build

# then, from this directory:
npm install
npm run build
npm run package                       # -> tfscript-vscode.vsix
code --install-extension tfscript-vscode.vsix --force
```

After installing or updating, run **Developer: Reload Window** (Command Palette) — a newly
installed or changed extension's language/grammar contributions don't always take effect in
an already-open window otherwise.

### If `.tf` files still show as Plain Text after reloading

Check whether the window is in **Restricted Mode** (status bar, or the Command Palette's
"Workspace Trust" entries). This extension declares
`capabilities.untrustedWorkspaces.supported: true` (it only reports diagnostics/completions
for the open file; it runs no workspace-authored code or config), so it should activate
either way — but if you still see Plain Text, trust the workspace/file and reload again to
rule it out as a variable.

## Developing

Open this `editors/vscode` folder in VS Code and press F5 (`.vscode/launch.json` builds first,
then launches an Extension Development Host). That host still needs the root server built
(`npm run build` at the repo root) — the extension doesn't rebuild it for you.
