#!/usr/bin/env node
/**
 * Copies the sibling tfscript-language-server package's built dist/ into this extension's
 * own server/ directory, so the packaged .vsix carries a real copy of the server rather than
 * a path that only resolves inside this repo's own checkout. A relative path to the sibling
 * repo (e.g. "../../dist/server.js") works fine when running this extension unpacked via F5
 * (Extension Development Host, where extensionPath is this very folder), but breaks once the
 * extension is packaged and installed: VS Code extracts it to its own extensions directory
 * (e.g. ~/.vscode/extensions/huntwj.tfscript-vscode-x.y.z/), nowhere near the repo that built
 * it, and that relative path then points at nothing.
 *
 * The extension's "build" script rebuilds the server first, so this never copies a stale dist/.
 */
const { cpSync, existsSync, rmSync } = require("node:fs");
const path = require("node:path");

const ROOT_DIST = path.resolve(__dirname, "..", "..", "..", "dist");
const SERVER_DIR = path.resolve(__dirname, "..", "server");

if (!existsSync(ROOT_DIST)) {
  console.error(
    `${ROOT_DIST} does not exist. Run "npm run build" in the tfscript-language-server ` +
      "repo root before building this extension.",
  );
  process.exit(1);
}

rmSync(SERVER_DIR, { recursive: true, force: true });
cpSync(ROOT_DIST, SERVER_DIR, { recursive: true });
console.log(`Copied ${ROOT_DIST} -> ${SERVER_DIR}`);
