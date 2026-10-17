#!/usr/bin/env node
/**
 * Scores a `claude plugin eval` run of the Claude Code plugin's suite (editors/claude-code/evals)
 * in real tf: `claude plugin eval` has no grader that can run a program, so this reads the file
 * each run wrote (the tf-correct grader's evidence, in the --json result), loads it into tf, runs
 * what the case asks for, and checks what tf printed and sent. Needs Docker and the ~/ai/mud
 * checkout's tf image, like check-format-live.js. Not part of `npm test`:
 *
 *   claude plugin eval editors/claude-code --json result.json ...
 *   node scripts/score-evals-live.js result.json
 *
 * A run passes when tf prints no problem (a syntax error, a missing file, an unknown command, a
 * warning: tf-script-check's list) and every expected line is there, in order. MUD_DIR names the
 * ~/ai/mud checkout when it isn't found beside this repo.
 */
const { spawn, spawnSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
function mudDir() {
  if (process.env.MUD_DIR) return path.resolve(process.env.MUD_DIR);
  const candidates = [path.resolve(REPO_ROOT, ".."), path.resolve(REPO_ROOT, "..", "..", "mud")];
  const found = candidates.find((d) => existsSync(path.join(d, "docker", "tf.py")));
  if (found) return found;
  console.error(`score-evals-live: can't find the ~/ai/mud checkout (docker/tf.py) in ${candidates.join(" or ")}: set MUD_DIR to it.`);
  process.exit(2);
}
const MUD_DIR = mudDir();

function tfImage() {
  const launcher = path.join(MUD_DIR, "docker", "tf.py").replace(/\\/g, "/");
  const code = `import importlib.util as u; s=u.spec_from_file_location("t", "${launcher}"); m=u.module_from_spec(s); s.loader.exec_module(m); print(m.ensure_image(False, True, False, False))`;
  const r = spawnSync("uv", ["run", "--python", "3.13", "python", "-c", code], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`couldn't find the tf image: ${r.stderr}`);
  return r.stdout.trim().split("\n").pop();
}

/** tf-script-check's problem words, for lines tf starts with %. */
const PROBLEM =
  /syntax error|No such file|not a command|unknown|cannot|can't|illegal|unexpected|Warning|error|failed|invalid|bad |unmatched|reserved word|no such|not defined|not found|found \d+ arguments|division by zero|outside of|out of range|already exists|incomplete|too (?:many|few|long|large)|not a builtin|recursion count|exceeded|overflow|must be|missing|can not|not connected/i;
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b[>=]/g;

/**
 * Each case: the file the run wrote, files beside it (mounted where the case needs them), the
 * commands typed after loading it, and the lines expected, in order (SENT:[...] for what tf sent
 * to the world). `once` lines must appear exactly once.
 */
const CASES = {
  "top-level-if": { file: "startup.tf", commands: ["/eval /echo -- hp_warn=%{hp_warn}"], expect: ["hp_warn defaulted to 50", "hp_warn=50"] },
  "load-from-variable": { file: "loader.tf", mounts: { "/home/me/tf": { "extra.tf": "/echo extra.tf loaded\n" } }, commands: [], expect: ["extra.tf loaded"] },
  "if-else-in-macro": {
    file: "hp.tf",
    commands: ["/set hp=10", "/checkhp", "/eval /echo -- alarm=%{alarm}", "/set hp=50", "/set alarm=0", "/checkhp", "/eval /echo -- alarm=%{alarm}"],
    expect: ["LOW", "done", "alarm=1", "ok", "done", "alarm=0"],
  },
  "trigger-condition": {
    file: "loot.tf",
    commands: ["/trigger You get a gold coin from the corpse.", "/trigger You get a rusty sword from the corpse.", "/echo -- after"],
    expect: ["GOLD!", "after"],
    once: ["GOLD!"],
  },
  "literal-percent": { file: "sale.tf", commands: ["/sale"], expect: ["Everything is 50%-off today"] },
  "multi-line-def": { file: "prep.tf", commands: ["/prep"], expect: ["SENT:[wield sword]", "SENT:[wear shield]", "SENT:[stand]"] },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let names = 0;

/** Runs tf with `dir` at /w and each mount, connected to a recording server; its output lines, then what it sent. */
async function runTf(image, dir, mounts, commands) {
  const received = [];
  const server = net.createServer((socket) => {
    socket.write("Welcome.\r\n");
    socket.on("data", (b) => received.push(b));
    socket.on("error", () => {});
  });
  await new Promise((r) => server.listen(0, "0.0.0.0", r));
  const port = server.address().port;
  const name = `tfscript-evals-${process.pid}-${(names += 1)}`;
  const volumes = Object.entries(mounts).flatMap(([at, local]) => ["-v", `${local}:${at}`]);
  const tf = spawn("docker", ["run", "--rm", "-i", "--name", name, "--add-host=host.docker.internal:host-gateway", "-e", "HOME=/tmp", "-v", `${dir}:/w`, ...volumes, image, "-n"]);
  let out = "";
  tf.stdout.on("data", (b) => (out += b));
  tf.stderr.on("data", (b) => (out += b));
  const done = new Promise((r) => tf.on("close", r));
  tf.stdin.write(`/set wrap=off\n/set wrapsize=4000\n/addworld -Tdiku w host.docker.internal ${port}\n/connect w\n`);
  await sleep(2500);
  tf.stdin.write("/echo -- ===load===\n/load /w/script.tf\n");
  await sleep(800);
  tf.stdin.write(commands.map((c) => `${c}\n`).join(""));
  await sleep(1500);
  tf.stdin.end("/@quit\n");
  const timer = setTimeout(() => spawnSync("docker", ["kill", name]), 20_000);
  await done;
  clearTimeout(timer);
  server.close();
  const sent = Buffer.concat(received).toString("utf8").split("\r\n").filter((l) => l !== "").map((l) => `SENT:[${l}]`);
  const lines = out.replace(ANSI, "").replace(/\r/g, "").split("\n");
  const from = lines.findIndex((l) => l.includes("===load==="));
  return { lines: from < 0 ? lines : lines.slice(from + 1), sent };
}

/** Whether `want` appear in `got` in order; the problem lines tf printed. */
function judge(spec, lines, sent) {
  const problems = lines.filter((l) => l.startsWith("%") && PROBLEM.test(l) && !/^% Loading commands/.test(l));
  const all = [...lines, ...sent];
  let at = 0;
  const missing = [];
  for (const want of spec.expect) {
    const i = all.findIndex((l, k) => k >= at && (want.startsWith("SENT:") ? l === want : l.trim() === want || l.trim().endsWith(` ${want}`)));
    if (i < 0) missing.push(want);
    else at = i + 1;
  }
  const repeated = (spec.once ?? []).filter((w) => all.filter((l) => l.trim() === w || l.trim().endsWith(` ${w}`)).length !== 1);
  return { pass: problems.length === 0 && missing.length === 0 && repeated.length === 0, problems, missing, repeated };
}

async function main() {
  const resultFile = process.argv[2];
  if (!resultFile) {
    console.error("Give the --json result of a claude plugin eval run: node scripts/score-evals-live.js result.json");
    process.exit(2);
  }
  const result = JSON.parse(readFileSync(resultFile, "utf8"));
  const image = tfImage();
  const scratch = mkdtempSync(path.join(os.tmpdir(), "tfscript-evals-"));
  const summary = {};
  try {
    for (const c of result.cases) {
      const spec = CASES[c.name];
      if (!spec) {
        console.log(`skip  ${c.name}: no tf check for this case in scripts/score-evals-live.js`);
        continue;
      }
      for (const [arm, runs] of Object.entries(c.arms)) {
        for (const [k, run] of runs.entries()) {
          const text = run.graders.find((g) => g.name === "tf-correct")?.evidence;
          const key = `${c.name} ${arm}`;
          summary[key] ??= { passed: 0, runs: 0 };
          summary[key].runs += 1;
          if (typeof text !== "string" || text === "") {
            console.log(`FAIL  ${key} #${k + 1}: no ${spec.file} written`);
            continue;
          }
          const dir = path.join(scratch, `${c.name}-${arm}-${k}`);
          const mounts = {};
          require("node:fs").mkdirSync(dir, { recursive: true });
          writeFileSync(path.join(dir, "script.tf"), text);
          for (const [at, files] of Object.entries(spec.mounts ?? {})) {
            const local = path.join(dir, `mount-${Object.keys(mounts).length}`);
            require("node:fs").mkdirSync(local);
            for (const [n, body] of Object.entries(files)) writeFileSync(path.join(local, n), body);
            mounts[at] = local;
          }
          const { lines, sent } = await runTf(image, dir, mounts, spec.commands);
          const v = judge(spec, lines, sent);
          if (v.pass) summary[key].passed += 1;
          const why = [...v.problems.map((p) => `tf: ${p}`), ...v.missing.map((m) => `missing: ${m}`), ...v.repeated.map((m) => `not exactly once: ${m}`)];
          console.log(`${v.pass ? "pass" : "FAIL"}  ${key} #${k + 1}${why.length ? `\n      ${why.join("\n      ")}` : ""}`);
        }
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  console.log("\nIn real tf (passed/runs):");
  for (const [key, s] of Object.entries(summary)) console.log(`  ${key.padEnd(32)} ${s.passed}/${s.runs}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
