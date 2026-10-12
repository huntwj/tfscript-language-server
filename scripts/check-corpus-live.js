#!/usr/bin/env node
/**
 * Slow corpus check: cross-validates this engine's diagnostics against real tf, via
 * ~/ai/mud/scripts/tf_script_check.py (needs Docker). Not part of `npm test` — the fast
 * loop should not need Docker — run it by hand with `npm run test:corpus-live`.
 *
 * For each configured corpus, loads the real entry point through tf-script-check (mounting
 * its repo read-only) and separately runs this engine's getDiagnostics() over every file in
 * that corpus, then checks the two verdicts agree. This is a comparison tool, not a test
 * runner: a mismatch is reported for a human to look at, not auto-resolved either way.
 */
const { spawnSync } = require("node:child_process");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const MUD_DIR = path.resolve(REPO_ROOT, "..");
const TF_SCRIPT_CHECK = path.join(MUD_DIR, "scripts", "tf_script_check.py");

const { getDiagnostics } = require("../dist/diagnostics");

/**
 * Add a corpus here for another sibling repo's scripts.
 * - `mountHostDir` is mounted read-only inside the check container at `mountContainerDir`
 *   (needs to be the repo ROOT, not just the tf/ directory, so the script's own
 *   %{wotmud_repo_dir}-style /load paths resolve exactly as they do for a real user).
 * - `entry` is the real /load entry point, as a container path under mountContainerDir.
 * - `filesDir` + `files` are the real .tf files this engine should also score, read
 *   straight off disk (no container needed for that half).
 */
const CORPORA = [
  {
    name: "wotmud",
    mountHostDir: path.resolve(MUD_DIR, "..", "wotmud"),
    mountContainerDir: "/wotmud",
    entry: "/wotmud/tf/wotmud.tf",
    filesDir: path.resolve(MUD_DIR, "..", "wotmud", "tf"),
    files: ["wotmud.tf", "logging.tf", "mapping.tf"],
  },
];

function runTfScriptCheck(mountHostDir, mountContainerDir, entry) {
  const result = spawnSync(
    "uv",
    [
      "run",
      "--python",
      "3.13",
      TF_SCRIPT_CHECK,
      "--mount",
      `${mountHostDir}=${mountContainerDir}`,
      entry,
    ],
    { encoding: "utf8", env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
  );
  return {
    verdict: result.status === 0 ? "clean" : "problem",
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function runThisEngine(filesDir, files) {
  const perFile = {};
  let anyProblem = false;
  for (const file of files) {
    const text = readFileSync(path.join(filesDir, file), "utf8");
    const diags = getDiagnostics(text);
    perFile[file] = diags;
    if (diags.length > 0) anyProblem = true;
  }
  return { verdict: anyProblem ? "problem" : "clean", perFile };
}

let mismatches = 0;

for (const corpus of CORPORA) {
  console.log(`=== ${corpus.name} ===`);
  const missing = readdirSync(corpus.filesDir).filter(
    (f) => f.endsWith(".tf") && !corpus.files.includes(f),
  );
  if (missing.length > 0) {
    console.log(`  note: not in the configured file list (not scored): ${missing.join(", ")}`);
  }

  const real = runTfScriptCheck(corpus.mountHostDir, corpus.mountContainerDir, corpus.entry);
  const mine = runThisEngine(corpus.filesDir, corpus.files);

  console.log(`  real tf (tf-script-check):  ${real.verdict}`);
  console.log(`  this engine (aggregate):    ${mine.verdict}`);
  for (const [file, diags] of Object.entries(mine.perFile)) {
    console.log(`    ${file}: ${diags.length} diagnostic(s)`);
    for (const d of diags) console.log(`      [${d.severity}] ${d.code}: ${d.message}`);
  }

  if (real.verdict !== mine.verdict) {
    mismatches += 1;
    console.log(`  MISMATCH. tf-script-check output:\n${real.output}`);
  }
}

if (mismatches > 0) {
  console.error(`\n${mismatches} corpus mismatch(es).`);
  process.exit(1);
} else {
  console.log("\nAll corpora agree with real tf.");
}
