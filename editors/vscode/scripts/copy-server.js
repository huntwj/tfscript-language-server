#!/usr/bin/env node
/**
 * Copies the language server, bundled into one file with everything it requires (the
 * `@tfscript/core` analysis and vscode-languageserver included), into this extension's own
 * server/server.js, so the packaged .vsix carries a real copy of the server rather than a path
 * that only resolves inside this repo's own checkout. A relative path into the repo (e.g.
 * "../../packages/server/dist/server.js") works fine when running this extension unpacked via F5
 * (Extension Development Host, where extensionPath is this very folder), but breaks once the
 * extension is packaged and installed: VS Code extracts it to its own extensions directory (e.g.
 * ~/.vscode/extensions/huntwj.tfscript-vscode-x.y.z/), nowhere near the repo that built it, and
 * that relative path then points at nothing.
 *
 * The bundle is the Claude Code plugin's (editors/claude-code/bundle/tfscript-language-server.js,
 * built by the repo's npm run bundle:claude-code), so both editors run the same server, and it
 * needs no node_modules beside it. The extension's "build" script rebuilds the bundle first, so
 * this never copies a stale one.
 */
const { copyFileSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const path = require("node:path");

const BUNDLE = path.resolve(__dirname, "..", "..", "claude-code", "bundle", "tfscript-language-server.js");
const SERVER_DIR = path.resolve(__dirname, "..", "server");

if (!existsSync(BUNDLE)) {
  console.error(`${BUNDLE} does not exist. Run "npm run bundle:claude-code" in the tfscript-language-server repo root before building this extension.`);
  process.exit(1);
}

rmSync(SERVER_DIR, { recursive: true, force: true });
mkdirSync(SERVER_DIR, { recursive: true });
copyFileSync(BUNDLE, path.join(SERVER_DIR, "server.js"));
console.log(`Copied ${BUNDLE} -> ${path.join(SERVER_DIR, "server.js")}`);
