#!/usr/bin/env node
/**
 * Writes the tfscript "cloud kit" into a repo, for Claude Code cloud sessions (claude.ai/code and
 * the app), which load no plugins, but do read a repo's own .claude/ folder:
 *
 *   node scripts/cloud-kit.js <repo>            write or update the kit
 *   node scripts/cloud-kit.js --check <repo>    exit 1, listing what differs, when it is out of date
 *
 * In the repo:
 *   .claude/tfscript/tfscript.js, tfscript-hook.js   the plugin's bundled checker and hook (npm run bundle:claude-code)
 *   .claude/tfscript/README.md                        what this is, and how to update it
 *   .claude/skills/tf-scripting/SKILL.md              the skill, naming that checker (renderSkill("cloud"))
 *   .claude/settings.json                             a PostToolUse hook running the copy with --cloud-only
 *
 * --cloud-only makes the hook do nothing unless CLAUDE_CODE_REMOTE is "true", so on a machine with
 * the plugin only the plugin's hook speaks. Every other setting in settings.json is kept. Run
 * `npm run build` first: the skill comes from core's dist.
 */
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");
const BUNDLE = path.join(REPO, "editors", "claude-code", "bundle");
const { renderSkill } = require("../packages/core/dist/rules/render");
const VERSION = JSON.parse(readFileSync(path.join(REPO, "packages", "cli", "package.json"), "utf8")).version;

const HOOK_PATH = ".claude/tfscript/tfscript-hook.js";
const HOOK = {
  matcher: "Edit|Write|MultiEdit",
  hooks: [{ type: "command", command: `node "$CLAUDE_PROJECT_DIR/${HOOK_PATH}" --cloud-only`, timeout: 30, statusMessage: "Checking the tf script" }],
};

const README = `# tfscript for cloud sessions

Claude Code's cloud sessions (claude.ai/code, the app) load no plugins, so this repo carries its own
copy of the tfscript plugin's checker and skill (tfscript ${VERSION}):

- \`tfscript.js\`, \`tfscript-hook.js\`: the checker and its PostToolUse hook, from the tfscript-language-server
  repo's \`editors/claude-code/bundle/\`. \`.claude/settings.json\` runs the hook with \`--cloud-only\`, so it
  checks a tf script after each edit only in a cloud session; on a machine with the plugin, the plugin does.
- \`../skills/tf-scripting/SKILL.md\`: the tf-scripting skill.

Don't edit these files: they are generated. Update them from a tfscript-language-server checkout with
\`node scripts/cloud-kit.js <this repo>\` (after \`npm run build\`), and \`--check\` to see whether they are current.
`;

/** Each file of the kit, by its path in the repo, and its text. */
function kitFiles() {
  return {
    ".claude/tfscript/tfscript.js": readFileSync(path.join(BUNDLE, "tfscript.js"), "utf8"),
    [HOOK_PATH]: readFileSync(path.join(BUNDLE, "tfscript-hook.js"), "utf8"),
    ".claude/tfscript/README.md": README,
    ".claude/skills/tf-scripting/SKILL.md": renderSkill("cloud"),
  };
}

/** The repo's settings.json with the kit's hook in place of any earlier one, as text. */
function withHook(repo) {
  const file = path.join(repo, ".claude", "settings.json");
  const settings = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  settings.hooks ??= {};
  const post = (settings.hooks.PostToolUse ?? []).filter((h) => !(h.hooks ?? []).some((c) => String(c.command ?? "").includes(HOOK_PATH)));
  settings.hooks.PostToolUse = [...post, HOOK];
  return `${JSON.stringify(settings, null, 2)}\n`;
}

const args = process.argv.slice(2);
const check = args[0] === "--check";
const target = args[check ? 1 : 0];
if (!target || !existsSync(target)) {
  console.error("Give the repo to write the kit into: node scripts/cloud-kit.js [--check] <repo>.");
  process.exit(2);
}
const repo = path.resolve(target);
const want = { ...kitFiles(), ".claude/settings.json": withHook(repo) };
const stale = Object.entries(want).filter(([rel, text]) => {
  const file = path.join(repo, rel);
  return !existsSync(file) || readFileSync(file, "utf8") !== text;
});
if (check) {
  for (const [rel] of stale) console.log(`out of date: ${rel}`);
  if (stale.length > 0) {
    console.error(`The cloud kit in ${repo} is out of date: run node scripts/cloud-kit.js ${target}.`);
    process.exit(1);
  }
  console.log(`The cloud kit in ${repo} is up to date (tfscript ${VERSION}).`);
  process.exit(0);
}
for (const [rel, text] of stale) {
  const file = path.join(repo, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
  console.log(`wrote ${rel}`);
}
if (stale.length === 0) console.log(`The cloud kit in ${repo} is already up to date (tfscript ${VERSION}).`);
