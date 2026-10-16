#!/usr/bin/env node
/**
 * Writes the docs generated from the rule table (packages/core/src/rules/table.ts): docs/rules.md, the README's
 * rule table, the notes page's rule list and the tf-scripting skill under docs/generated/, and the
 * Claude Code plugin's copy of the skill (editors/claude-code/skills/tf-scripting/SKILL.md).
 * Run `npm run docs:rules` (it builds first, as this reads core's dist/) after changing the table;
 * packages/core/test/ruleDocs.test.ts fails while a checked-in copy is out of date.
 */
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const { generatedFiles, withReadmeTable } = require("../packages/core/dist/rules/render");

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
