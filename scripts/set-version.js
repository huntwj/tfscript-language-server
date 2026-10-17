#!/usr/bin/env node
/**
 * Sets the one version every published part carries (npm run version:set -- 0.3.0):
 *
 *   packages/core, packages/server, packages/cli   package.json, and their entries in package-lock.json,
 *                                                  with the exact @tfscript/core version cli and server depend on
 *   packages/cli/src/usage.ts                      VERSION, which `tfscript --version` prints
 *   editors/vscode                                 package.json and its package-lock.json
 *   editors/claude-code/.claude-plugin/plugin.json the plugin's version
 *   .claude-plugin/marketplace.json                the plugin's entry
 *   CHANGELOG.md                                   "## Unreleased" becomes this version's section, under a new, empty one
 *
 * Each file is changed in place, only at its version, so its layout is kept. packages/cli's tests
 * check that all of them agree (claudePlugin.test.ts, usage.test.ts). With --check it changes
 * nothing and lists every place with its version, exiting 1 when they disagree. Afterwards rebuild
 * the plugin's bundles (npm run bundle:claude-code), which hold VERSION.
 */
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");

/** Each place a version is written: its file, and a pattern whose first group is what precedes the version. */
const PLACES = [
  ...["packages/core", "packages/server", "packages/cli", "editors/vscode"].map((dir) => ({ file: `${dir}/package.json`, re: /^(  "version": ")([^"]*)"/m })),
  { file: "packages/cli/src/usage.ts", re: /^(export const VERSION = ")([^"]*)"/m },
  { file: "editors/claude-code/.claude-plugin/plugin.json", re: /^(  "version": ")([^"]*)"/m },
  { file: ".claude-plugin/marketplace.json", re: /("name": "tfscript",[\s\S]*?"version": ")([^"]*)"/ },
  // The workspace lockfile's own version, and each workspace package's entry.
  { file: "package-lock.json", re: /^(  "version": ")([^"]*)"/m },
  ...["packages/core", "packages/server", "packages/cli"].map((dir) => ({
    file: "package-lock.json",
    re: new RegExp(`^(    "${dir}": \\{\\n(?:      [^\\n]*\\n)*?      "version": ")([^"]*)"`, "m"),
  })),
  { file: "editors/vscode/package-lock.json", re: /^(  "version": ")([^"]*)"/m },
  { file: "editors/vscode/package-lock.json", re: /^(    "": \{\n(?:      [^\n]*\n)*?      "version": ")([^"]*)"/m },
  // The packages' exact dependencies on core, wherever they are written.
  ...["packages/cli/package.json", "packages/server/package.json", "package-lock.json"].map((file) => ({ file, re: /("@tfscript\/core": ")([^"]*)"/g })),
];

const read = (file) => readFileSync(path.join(REPO, file), "utf8");

function current() {
  return PLACES.flatMap((p) => {
    const found = [...read(p.file).matchAll(p.re.global ? p.re : new RegExp(p.re.source, `${p.re.flags}g`))].slice(0, p.re.global ? undefined : 1);
    if (found.length === 0) throw new Error(`${p.file}: no version where one was expected (${p.re}): update scripts/set-version.js.`);
    return found.map((m) => ({ file: p.file, version: m[2] }));
  });
}

const args = process.argv.slice(2);
if (args[0] === "--check") {
  const found = current();
  for (const f of found) console.log(`${f.version}  ${f.file}`);
  if (new Set(found.map((f) => f.version)).size > 1) {
    console.error("The versions disagree: set them all with npm run version:set -- <version>.");
    process.exit(1);
  }
  process.exit(0);
}

const version = args[0];
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error("Give the new version, as in npm run version:set -- 0.3.0.");
  process.exit(2);
}
const old = current();
if (old.every((f) => f.version === version)) {
  console.error(`Every place already has ${version}.`);
  process.exit(2);
}
for (const p of PLACES) {
  const text = read(p.file);
  writeFileSync(path.join(REPO, p.file), text.replace(p.re, (_, before) => `${before}${version}"`));
}
const changelog = read("CHANGELOG.md");
if (!/^## Unreleased\n/m.test(changelog)) {
  console.error('CHANGELOG.md has no "## Unreleased" section: add the release\'s section by hand.');
} else {
  writeFileSync(path.join(REPO, "CHANGELOG.md"), changelog.replace(/^## Unreleased\n/m, `## Unreleased\n\n## ${version}\n`));
}
for (const f of current()) console.log(`${f.version}  ${f.file}`);
console.log("Now rebuild the plugin's bundles (npm run bundle:claude-code), which hold the version.");
