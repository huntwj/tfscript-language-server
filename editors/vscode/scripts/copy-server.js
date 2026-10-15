#!/usr/bin/env node
/**
 * Copies the language server's built dist/ (packages/server in this repo) into this extension's
 * own server/ directory, so the packaged .vsix carries a real copy of the server rather than
 * a path that only resolves inside this repo's own checkout. A relative path into the repo
 * (e.g. "../../packages/server/dist/server.js") works fine when running this extension unpacked
 * via F5 (Extension Development Host, where extensionPath is this very folder), but breaks once
 * the extension is packaged and installed: VS Code extracts it to its own extensions directory
 * (e.g. ~/.vscode/extensions/huntwj.tfscript-vscode-x.y.z/), nowhere near the repo that built
 * it, and that relative path then points at nothing.
 *
 * The server requires the analysis as @tfscript/core (packages/core), so core's dist/ and its
 * package.json (whose "exports" map the subpaths onto dist/) go to server/node_modules/@tfscript/core,
 * where Node finds them walking up from server/server.js. The other runtime dependencies,
 * vscode-languageserver and vscode-languageserver-textdocument, are this extension's own.
 *
 * The extension's "build" script rebuilds the server first, so this never copies a stale dist/.
 */
const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const path = require("node:path");

const PACKAGES = path.resolve(__dirname, "..", "..", "..", "packages");
const SERVER_DIST = path.join(PACKAGES, "server", "dist");
const CORE = path.join(PACKAGES, "core");
const CORE_DIST = path.join(CORE, "dist");
const SERVER_DIR = path.resolve(__dirname, "..", "server");
const CORE_DIR = path.join(SERVER_DIR, "node_modules", "@tfscript", "core");

for (const dist of [SERVER_DIST, CORE_DIST]) {
  if (!existsSync(dist)) {
    console.error(
      `${dist} does not exist. Run "npm run build" in the tfscript-language-server ` +
        "repo root before building this extension.",
    );
    process.exit(1);
  }
}

// tsc -b's incremental build state, not part of the program.
const notBuildInfo = (src) => !src.endsWith(".tsbuildinfo");

rmSync(SERVER_DIR, { recursive: true, force: true });
cpSync(SERVER_DIST, SERVER_DIR, { recursive: true, filter: notBuildInfo });
mkdirSync(CORE_DIR, { recursive: true });
cpSync(path.join(CORE, "package.json"), path.join(CORE_DIR, "package.json"));
cpSync(CORE_DIST, path.join(CORE_DIR, "dist"), { recursive: true, filter: notBuildInfo });
console.log(`Copied ${SERVER_DIST} -> ${SERVER_DIR}`);
console.log(`Copied ${CORE_DIST} -> ${path.join(CORE_DIR, "dist")}`);
