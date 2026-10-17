#!/usr/bin/env node
/**
 * Slow formatter check: loads each corpus file into real tf as it is and as the formatter lays it
 * out, and compares what tf stores and does (needs Docker and the ~/ai/mud checkout's tf image).
 * Not part of `npm test`; run it by hand with `npm run test:format-live`.
 *
 * Each corpus folder is copied twice to a scratch folder, once as it is and once with every file
 * formatted, and each copy is mounted at /w in its own tf. tf's library is also tf's TFLIBDIR, so
 * the second tf starts from the formatted stdlib.tf, and the macros each defines at startup are
 * compared first. Then for each file the formatter changes, in a fresh tf each time:
 *  1. Load the file and `/list -i` every macro. The two listings must be the same, line for line,
 *     or the same once the blanks beside each `%;` separator are dropped (formatting.ts's
 *     guarantee: nothing else may differ), and the load must print the same messages but for
 *     the line numbers they name.
 *  2. For each macro whose listing differs at all, run it (`/#<number>`, no arguments) with tf
 *     connected to a server here that records every byte tf sends it, and compare everything tf
 *     printed and sent. `/quit`, `/sh` and friends are stubbed out first.
 *
 * Corpora: tf's library (tinyfugue/lib/tf), the WoTMUD scripts (../wotmud/tf) and the tf-* repos
 * in ../mud-ws/tf-fix, each skipped when missing. All are read only: they are copied first.
 * MUD_DIR names the ~/ai/mud checkout when this repo isn't inside it.
 */
const { spawn, spawnSync } = require("node:child_process");
const { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const MUD_DIR = process.env.MUD_DIR ? path.resolve(process.env.MUD_DIR) : path.resolve(REPO_ROOT, "..");
const { formatDocument, applyFormatEdits } = require("../packages/core/dist/formatting");

const tfFix = path.resolve(MUD_DIR, "..", "mud-ws", "tf-fix");
const CORPORA = [
  { name: "tinyfugue-lib", dir: path.join(MUD_DIR, "tinyfugue", "lib", "tf"), library: true },
  { name: "wotmud", dir: path.resolve(MUD_DIR, "..", "wotmud", "tf") },
  ...(existsSync(tfFix) ? readdirSync(tfFix).filter((d) => d.startsWith("tf-")).sort() : []).map((d) => ({ name: d, dir: path.join(tfFix, d) })),
];

function tfImage() {
  const launcher = path.join(MUD_DIR, "docker", "tf.py").replace(/\\/g, "/");
  const code = `import importlib.util as u; s=u.spec_from_file_location("t", "${launcher}"); m=u.module_from_spec(s); s.loader.exec_module(m); print(m.ensure_image(False, True, False, False))`;
  const r = spawnSync("uv", ["run", "--python", "3.13", "python", "-c", code], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`couldn't find the tf image: ${r.stderr}`);
  return r.stdout.trim().split("\n").pop();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const QUIT_WAIT = 20_000;
/** Macros run in one tf, so one that breaks tf's input (a hook on every line) spoils only its batch. */
const BATCH = 8;
let runs = 0;
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b[>=]/g;

/**
 * Runs tf with `dir` at /w (and as TFLIBDIR for a `library`), connected to a recording server,
 * typing `commands`; resolves to its output lines, then what it sent, each as SENT:[...].
 */
async function runTf(image, dir, commands, library) {
  const received = [];
  const server = net.createServer((socket) => {
    socket.write("Welcome.\r\n");
    socket.on("data", (b) => received.push(b));
    socket.on("error", () => {});
  });
  await new Promise((r) => server.listen(0, "0.0.0.0", r));
  const port = server.address().port;
  const env = library ? ["-e", "TFLIBDIR=/w"] : [];
  const name = `tfscript-format-live-${process.pid}-${(runs += 1)}`;
  const tf = spawn("docker", ["run", "--rm", "-i", "--name", name, "--add-host=host.docker.internal:host-gateway", "-e", "HOME=/tmp", ...env, "-v", `${dir}:/w`, image, "-n"]);
  let out = "";
  tf.stdout.on("data", (b) => (out += b));
  tf.stderr.on("data", (b) => (out += b));
  const done = new Promise((r) => tf.on("close", r));
  tf.stdin.write(`/set wrap=off\n/set wrapsize=4000\n/addworld -Tdiku w host.docker.internal ${port}\n/connect w\n`);
  await sleep(2500);
  tf.stdin.write(commands.map((c) => `${c}\n`).join(""));
  await sleep(1500);
  tf.stdin.end("/@quit\n");
  // A macro that was run may have left a hook that eats the /quit: stop tf from outside then.
  const timer = setTimeout(() => spawnSync("docker", ["kill", name]), QUIT_WAIT);
  await done;
  clearTimeout(timer);
  server.close();
  const sent = Buffer.concat(received).toString("utf8").split("\r\n").filter((l) => l !== "").map((l) => `SENT:[${l}]`);
  // The server's port is the one thing that differs between two runs by design.
  const lines = out.replace(ANSI, "").replace(/\r/g, "").replaceAll(String(port), "<port>").split("\n");
  return [...lines, ...sent];
}

/** The lines after the first holding `start`, up to the next holding `end`. */
const between = (lines, start, end) => {
  const a = lines.findIndex((l) => l.includes(start));
  const b = lines.findIndex((l, i) => i > a && l.includes(end));
  return a < 0 ? [] : lines.slice(a + 1, b < 0 ? undefined : b);
};

/** A /list line with the blanks beside each single `%;` dropped (but not those that keep it from gluing to a `%`, `\`, `$` or `/`). */
const normaliseList = (l) => l.replace(/(?<![%\\$/ ])[ \t]+(?=(?<!%)%;)/g, "").replace(/(?<!%)%;[ \t]+/g, "%;");

/**
 * Whether `after` is `before` with only blanks beside `%;`s taken out, none of them inside a quoted
 * string (counting quotes from the start of the line, as an expression would): a second, plainer
 * reading of the guarantee than normaliseList(), so a blank dropped inside `"a%;  b"` is caught.
 */
function onlySeparatorBlanksGone(before, after) {
  let j = 0;
  let quote = "";
  for (let i = 0; i < before.length; i += 1) {
    const ch = before[i];
    if (after[j] === ch) {
      j += 1;
      if (quote ? ch === quote : ch === '"' || ch === "'") quote = quote ? "" : ch;
      continue;
    }
    if (ch !== " " && ch !== "\t") return false;
    let a = i;
    while (a > 0 && /[ \t]/.test(before[a - 1])) a -= 1;
    let b = i;
    while (b < before.length && /[ \t]/.test(before[b])) b += 1;
    const nextToSep = before.startsWith("%;", b) || (a >= 2 && before.slice(a - 2, a) === "%;");
    if (!nextToSep || quote) return false;
  }
  return j === after.length;
}

const STUBS = ["quit", "sh", "suspend", "connect", "dc", "world", "load", "save", "log", "edit"].map((n) => `/def -i ${n} = /@echo %% ORACLE: /${n} stubbed`);

const emptyReport = () => ({ macros: 0, identical: 0, normalised: 0, mismatches: [], runs: 0, runMismatches: [], movedMessages: 0 });

/** The macros already run, by their listing: one the library defines is run once, not again for every file. */
const ran = new Set();

/**
 * Compares two /list -i listings line by line; returns the numbers of the macros that differ only
 * in blanks beside a %; and haven't been run yet.
 */
function compareListings(la, lb, report) {
  const differing = [];
  for (let i = 0; i < Math.max(la.length, lb.length); i += 1) {
    const x = la[i] ?? "";
    const y = lb[i] ?? "";
    if (x === y) report.identical += 1;
    else if (normaliseList(x) === normaliseList(y) && onlySeparatorBlanksGone(x, y)) {
      report.normalised += 1;
      const n = /^% (\d+): /.exec(x)?.[1];
      if (n && !ran.has(x)) differing.push(n);
      ran.add(x);
    } else report.mismatches.push({ before: x, after: y });
  }
  report.macros += Math.max(la.length, lb.length);
  return differing;
}

/** Runs each macro numbered in `numbers` after `setup`, in both copies, and compares what tf printed and sent. */
async function compareRuns(image, dirs, setup, numbers, library, report) {
  const batches = [];
  for (let k = 0; k < numbers.length; k += BATCH) batches.push(numbers.slice(k, k + BATCH));
  await Promise.all(Array.from({ length: 3 }, () => runBatches(image, dirs, setup, batches, library, report)));
}

async function runBatches(image, dirs, setup, batches, library, report) {
  for (let batch = batches.shift(); batch; batch = batches.shift()) {
    const calls = [...setup, ...STUBS, ...batch.flatMap((n) => [`/@echo %% ORACLE-CALL ${n}`, `/#${n}`]), "/@echo %% ORACLE-END"];
    const [ra, rb] = await Promise.all([runTf(image, dirs.before, calls, library), runTf(image, dirs.after, calls, library)]);
    report.runs += batch.length;
    const ca = between(ra, "ORACLE-CALL", "ORACLE-END").concat(ra.filter((l) => l.startsWith("SENT:")));
    const cb = between(rb, "ORACLE-CALL", "ORACLE-END").concat(rb.filter((l) => l.startsWith("SENT:")));
    for (let i = 0; i < Math.max(ca.length, cb.length); i += 1) if (ca[i] !== cb[i]) report.runMismatches.push({ before: ca[i], after: cb[i] });
  }
}

/** Loads one file in each copy and compares the macros, the load's messages, and what the changed macros do. */
async function checkFile(image, dirs, name, library) {
  const report = emptyReport();
  const listing = [`/load /w/${name}`, "/@echo %% ORACLE-LIST", "/list -i", "/@echo %% ORACLE-END"];
  const [a, b] = await Promise.all([runTf(image, dirs.before, listing, library), runTf(image, dirs.after, listing, library)]);
  const differing = compareListings(between(a, "ORACLE-LIST", "ORACLE-END"), between(b, "ORACLE-LIST", "ORACLE-END"), report);
  // A message names the lines its command is on, which formatting moves; nothing else may differ.
  const moved = (l) => l.replace(/, lines? \d+(?:-\d+)?:/, ", line <n>:");
  const loadA = between(a, `Loading commands from /w/${name}`, "ORACLE-LIST");
  const loadB = between(b, `Loading commands from /w/${name}`, "ORACLE-LIST");
  if (loadA.join("\n") !== loadB.join("\n")) {
    if (loadA.map(moved).join("\n") === loadB.map(moved).join("\n")) report.movedMessages += 1;
    else report.mismatches.push({ before: loadA.join(" | "), after: loadB.join(" | ") });
  }
  await compareRuns(image, dirs, [`/load /w/${name}`], differing, library, report);
  return report;
}

/** The messages and macros of tf's startup, from the library in each copy. */
async function checkStartup(image, dirs) {
  const report = emptyReport();
  const listing = ["/@echo %% ORACLE-LIST", "/list -i", "/@echo %% ORACLE-END"];
  const [a, b] = await Promise.all([runTf(image, dirs.before, listing, true), runTf(image, dirs.after, listing, true)]);
  const startA = a.slice(0, a.findIndex((l) => l.includes("ORACLE-LIST"))).filter((l) => l.startsWith("%"));
  const startB = b.slice(0, b.findIndex((l) => l.includes("ORACLE-LIST"))).filter((l) => l.startsWith("%"));
  if (startA.join("\n") !== startB.join("\n")) report.mismatches.push({ before: startA.join(" | "), after: startB.join(" | ") });
  const differing = compareListings(between(a, "ORACLE-LIST", "ORACLE-END"), between(b, "ORACLE-LIST", "ORACLE-END"), report);
  await compareRuns(image, dirs, [], differing, true, report);
  return report;
}

function tallyOf(result) {
  const tally = { entries: result.entries.length, changed: 0, refused: {}, crlf: result.crlf };
  for (const e of result.entries) {
    if (e.changed) tally.changed += 1;
    if (e.refused) tally.refused[e.refused] = (tally.refused[e.refused] ?? 0) + 1;
  }
  return tally;
}

async function main() {
  const image = tfImage();
  const scratch = mkdtempSync(path.join(os.tmpdir(), "tfscript-format-live-"));
  const totals = { files: 0, formatted: 0, crlf: 0, entries: 0, changed: 0, refused: {}, macros: 0, identical: 0, normalised: 0, mismatches: 0, runs: 0, runMismatches: 0, movedMessages: 0 };
  const add = (r) => {
    totals.macros += r.macros;
    totals.identical += r.identical;
    totals.normalised += r.normalised;
    totals.mismatches += r.mismatches.length;
    totals.runs += r.runs;
    totals.runMismatches += r.runMismatches.length;
    totals.movedMessages += r.movedMessages;
  };
  const show = (label, r) => {
    const ok = r.mismatches.length === 0 && r.runMismatches.length === 0;
    console.log(`  ${ok ? "OK  " : "DIFF"}  ${label}; /list ${r.identical} identical, ${r.normalised} equal but for blanks beside %; (${r.runs} run)${r.movedMessages ? "; its load messages name moved lines" : ""}`);
    for (const m of [...r.mismatches, ...r.runMismatches]) console.log(`      before: ${m.before}\n      after:  ${m.after}`);
  };
  for (const corpus of CORPORA) {
    if (!existsSync(corpus.dir)) {
      console.log(`=== ${corpus.name}: skipped, ${corpus.dir} not found ===`);
      continue;
    }
    const dirs = { before: path.join(scratch, corpus.name, "before"), after: path.join(scratch, corpus.name, "after") };
    cpSync(corpus.dir, dirs.before, { recursive: true, filter: (src) => !/[\\/]\.(jj|git)$/.test(src) && !/[\\/]node_modules$/.test(src) });
    cpSync(dirs.before, dirs.after, { recursive: true });
    const files = readdirSync(corpus.dir).filter((f) => f.endsWith(".tf")).sort();
    const changed = [];
    console.log(`=== ${corpus.name} (${files.length} files) ===`);
    for (const name of files) {
      const text = readFileSync(path.join(corpus.dir, name), "utf8");
      const result = formatDocument(text);
      const tally = tallyOf(result);
      totals.files += 1;
      totals.entries += tally.entries;
      totals.changed += tally.changed;
      if (tally.crlf) totals.crlf += 1;
      for (const [why, n] of Object.entries(tally.refused)) totals.refused[why] = (totals.refused[why] ?? 0) + n;
      const refused = Object.entries(tally.refused).map(([w, n]) => `${w} ${n}`).join(", ");
      const what = `${name}: ${tally.changed}/${tally.entries} entries changed${refused ? `; left: ${refused}` : ""}${tally.crlf ? "; CRLF, left alone" : ""}`;
      if (result.edits.length === 0) {
        console.log(`  same  ${what}`);
        continue;
      }
      writeFileSync(path.join(dirs.after, name), applyFormatEdits(text, result.edits));
      changed.push({ name, what });
    }
    if (corpus.library) {
      const r = await checkStartup(image, dirs);
      add(r);
      show("tf's startup, from this library", r);
    }
    // A few files at a time: each check is two or four tf runs.
    const queue = [...changed];
    await Promise.all(
      Array.from({ length: 2 }, async () => {
        for (let c = queue.shift(); c; c = queue.shift()) {
          const r = await checkFile(image, dirs, c.name, corpus.library);
          totals.formatted += 1;
          add(r);
          show(c.what, r);
        }
      }),
    );
  }
  rmSync(scratch, { recursive: true, force: true });
  console.log(`\n${JSON.stringify(totals, null, 2)}`);
  if (totals.mismatches + totals.runMismatches > 0) {
    console.error(`\n${totals.mismatches + totals.runMismatches} mismatch(es) between a file and its formatted version.`);
    process.exit(1);
  }
  console.log("\nEvery formatted file stores and runs the same macros in real tf.");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
