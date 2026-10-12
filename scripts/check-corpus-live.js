#!/usr/bin/env node
/**
 * Slow corpus check: cross-validates this engine's diagnostics against real tf, via
 * ~/ai/mud/scripts/tf_script_check.py (needs Docker). Not part of `npm test` — the fast
 * loop should not need Docker — run it by hand with `npm run test:corpus-live`.
 *
 * Each corpus is a set of real /load-able "targets" — a target is one real entry point
 * (what a user actually /loads) plus the list of files that entry point reads, since this
 * engine scores each file on its own and the two totals need to line up. For a cascading
 * entry point (wotmud.tf /loads logging.tf, mapping.tf) that's one target covering three
 * files; for a directory of independent scripts (tinyfugue's lib/tf) it's one target per
 * file. Each target is checked on its own, not folded into one corpus-wide verdict, so a
 * mismatch always names the exact file — needed once a corpus has more than a couple of
 * files to not have to bisect by hand.
 */
const { spawnSync } = require("node:child_process");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const MUD_DIR = path.resolve(REPO_ROOT, "..");
const TF_SCRIPT_CHECK = path.join(MUD_DIR, "scripts", "tf_script_check.py");

const { getDiagnostics } = require("../dist/diagnostics");

function singleFileTarget(file) {
  return { entry: `/corpus/${file}`, files: [file] };
}

/**
 * - `mountHostDir` is mounted read-only inside the check container at `mountContainerDir`
 *   (the repo ROOT a real /load path is relative to, not just the directory holding the
 *   scripts, so %{var}-built /load paths resolve exactly as they do for a real user).
 * - `filesDir` is where this engine reads the real files from, straight off disk.
 * - `targets` is computed lazily (a function), since one corpus lists every .tf file in a
 *   directory at run time rather than naming each by hand.
 */
const CORPORA = [
  {
    name: "wotmud",
    mountHostDir: path.resolve(MUD_DIR, "..", "wotmud"),
    mountContainerDir: "/wotmud",
    filesDir: path.resolve(MUD_DIR, "..", "wotmud", "tf"),
    targets: () => [
      { entry: "/wotmud/tf/wotmud.tf", files: ["wotmud.tf", "logging.tf", "mapping.tf"] },
    ],
  },
  {
    name: "tinyfugue-lib",
    // tinyfugue/ is a separate, private checkout of upstream TinyFugue — read-only here.
    mountHostDir: path.resolve(MUD_DIR, "tinyfugue", "lib", "tf"),
    mountContainerDir: "/corpus",
    filesDir: path.resolve(MUD_DIR, "tinyfugue", "lib", "tf"),
    targets: (filesDir) =>
      readdirSync(filesDir)
        .filter((f) => f.endsWith(".tf"))
        .sort()
        .map(singleFileTarget),
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

let total = 0;
let mismatches = 0;

for (const corpus of CORPORA) {
  const targets = corpus.targets(corpus.filesDir);
  console.log(`=== ${corpus.name} (${targets.length} target(s)) ===`);

  for (const target of targets) {
    total += 1;
    const real = runTfScriptCheck(corpus.mountHostDir, corpus.mountContainerDir, target.entry);
    const mine = runThisEngine(corpus.filesDir, target.files);

    if (real.verdict === mine.verdict) {
      console.log(`  OK   ${target.entry}: ${real.verdict}`);
      continue;
    }

    mismatches += 1;
    console.log(`  DIFF ${target.entry}: real=${real.verdict} mine=${mine.verdict}`);
    for (const [file, diags] of Object.entries(mine.perFile)) {
      for (const d of diags) console.log(`    ${file}: [${d.severity}] ${d.code}: ${d.message}`);
    }
    console.log(`  real tf output:\n${real.output}`);
  }
}

if (mismatches > 0) {
  console.error(`\n${total - mismatches}/${total} targets agree with real tf. ${mismatches} mismatch(es).`);
  process.exit(1);
} else {
  console.log(`\nAll ${total} targets agree with real tf.`);
}
