#!/usr/bin/env node
/**
 * Bundles what the Claude Code plugin (editors/claude-code) runs into single files under its
 * bundle/ folder, each with every dependency inside it, as a plugin is installed from git with no
 * npm install:
 *
 *   bundle/tfscript.js                    the command line, tfscript check (packages/cli)
 *   bundle/tfscript-language-server.js    the language server (packages/server)
 *   bundle/tfscript-hook.js               the PostToolUse hook (packages/cli/src/hook)
 *
 * They are built from the TypeScript sources, not from dist/, so no build is needed first. The
 * bundles are committed, so they must come out byte for byte the same on every machine: paths in
 * them are relative to the repo root, and nothing records a time.
 *
 *   node scripts/bundle-claude-code.js           write the bundles (npm run bundle:claude-code)
 *   node scripts/bundle-claude-code.js --check   exit 1 if a committed bundle differs from a fresh build (CI)
 */
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = "editors/claude-code/bundle";

const ENTRIES = {
  "tfscript.js": "packages/cli/src/cli.ts",
  "tfscript-language-server.js": "packages/server/src/server.ts",
  "tfscript-hook.js": "packages/cli/src/hook/bin.ts",
};

/** Each bundle's text, by its path relative to the repo root. */
function build() {
  const out = {};
  for (const [name, entry] of Object.entries(ENTRIES)) {
    const result = esbuild.buildSync({
      absWorkingDir: REPO_ROOT,
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node22",
      // The sources of core, not its dist/, so a bundle never carries a stale build.
      alias: { "@tfscript/core": "./packages/core/src" },
      banner: { js: `// Generated from ${entry} by scripts/bundle-claude-code.js (npm run bundle:claude-code). Do not edit.` },
      legalComments: "eof",
      charset: "utf8",
      write: false,
      logLevel: "silent",
    });
    for (const warning of result.warnings) console.warn(`${entry}: ${warning.text}`);
    out[`${OUT_DIR}/${name}`] = result.outputFiles[0].text.replace(/\r\n/g, "\n");
  }
  return out;
}

function main() {
  const check = process.argv.includes("--check");
  const bundles = build();
  if (check) {
    const stale = Object.entries(bundles).filter(([relative, text]) => {
      try {
        return readFileSync(path.join(REPO_ROOT, relative), "utf8") !== text;
      } catch {
        return true;
      }
    });
    for (const [relative] of stale) console.error(`${relative} is out of date with the sources: run npm run bundle:claude-code and commit the result.`);
    process.exitCode = stale.length > 0 ? 1 : 0;
    if (stale.length === 0) console.log("The Claude Code plugin's bundles are up to date.");
    return;
  }
  for (const [relative, text] of Object.entries(bundles)) {
    const file = path.join(REPO_ROOT, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    console.log(`wrote ${relative} (${Math.round(text.length / 1024)} KiB)`);
  }
}

main();
