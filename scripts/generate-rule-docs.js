#!/usr/bin/env node
/**
 * Writes the docs generated from the rule table (src/rules/table.ts): docs/rules.md, the README's
 * rule table, and the notes page's rule list and the tf-scripting skill under docs/generated/.
 * Run `npm run docs:rules` (it builds first, as this reads dist/) after changing the table;
 * test/ruleDocs.test.ts fails while a checked-in copy is out of date.
 */
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const { generatedFiles, withReadmeTable } = require("../dist/rules/render");

const REPO_ROOT = path.resolve(__dirname, "..");

// Written as LF, whatever the platform.
function write(relative, text) {
  const file = path.join(REPO_ROOT, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text.replace(/\r\n/g, "\n"));
  console.log(`wrote ${relative}`);
}

for (const [relative, text] of Object.entries(generatedFiles())) write(relative, text);
write("README.md", withReadmeTable(readFileSync(path.join(REPO_ROOT, "README.md"), "utf8")));
