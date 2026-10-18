import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { timeBudget } from "../../core/test/timeBudget";
import type { JsonDiagnostic, JsonReport } from "../src/format";
import { editedLines, kindOf, RETRY_SECONDS, runHook, type CliFailure, type CliRun, type HookDeps } from "../src/hook/hook";
import { isSmallFolder, runNode, spawnFailure } from "../src/hook/main";
import { shapeReport } from "../src/hook/report";
import { hookRoot, type RootHost } from "../src/hook/root";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);
const slash = (s: string) => s.replace(/\\/g, "/");

describe("the hook's root", () => {
  const files = new Set([p("mud", "tfscript.json"), p("tfscript.json")]);
  /** A machine where `links` are junctions (link -> target) and `big` folders are too big to search. */
  const host = (links: Record<string, string> = {}, big: string[] = []): RootHost => ({
    isFile: (f) => files.has(f),
    realpath: (f) => {
      for (const [link, target] of Object.entries(links)) if (f === link || f.startsWith(link + path.sep)) return target + f.slice(link.length);
      return f;
    },
    isSmallFolder: (d) => !big.includes(d),
  });

  it("is the folder of the nearest tfscript.json above the file, up to the project folder", () => {
    expect(hookRoot(p("mud", "wot", "a.tf"), p(), host())).toEqual({ root: p("mud"), config: p("mud", "tfscript.json") });
    expect(hookRoot(p("mud", "wot", "a.tf"), p("mud", "wot"), host())).toEqual({ root: p("mud", "wot") });
    expect(hookRoot(p("mud", "a.tf"), undefined, host())).toEqual({ root: p("mud"), config: p("mud", "tfscript.json") });
  });

  it("is the project folder, failing that, when the file is in it", () => {
    expect(hookRoot(p("proj", "scripts", "a.tf"), p("proj"), host())).toEqual({ root: p("proj") });
  });

  it("counts a file reached through a junction into the project as in it", () => {
    const links = { [p("link")]: p("proj") };
    expect(hookRoot(p("link", "scripts", "a.tf"), p("proj"), host(links))).toEqual({ root: p("proj") });
    // And a project folder that is itself a link.
    expect(hookRoot(p("proj", "a.tf"), p("link"), host(links))).toEqual({ root: p("link") });
  });

  it("is, outside the project, the nearest tfscript.json's folder, else the file's own folder if small", () => {
    expect(hookRoot(p("elsewhere", "a.tf"), p("proj"), host())).toEqual({ root: p(), config: p("tfscript.json") });
    files.delete(p("tfscript.json"));
    expect(hookRoot(p("elsewhere", "a.tf"), p("proj"), host())).toEqual({ root: p("elsewhere") });
    expect(hookRoot(p("elsewhere", "a.tf"), undefined, host())).toEqual({ root: p("elsewhere") });
    expect(hookRoot(p("proj-two", "a.tf"), p("proj"), host())).toEqual({ root: p("proj-two") });
    files.add(p("tfscript.json"));
  });

  it("checks the file alone when its folder is too big to search", () => {
    files.delete(p("tfscript.json"));
    expect(hookRoot(p("home", "a.tf"), p("proj"), host({}, [p("home")]))).toEqual({ root: p("home"), fileOnly: true });
    files.add(p("tfscript.json"));
  });
});

describe("isSmallFolder", () => {
  it("says no to a drive's root, the home folder and a folder with too many entries", () => {
    const dir = mkdtempSync(path.join(TMP, "small-"));
    for (let i = 0; i < 5; i++) writeFileSync(path.join(dir, `f${i}.tf`), "");
    mkdirSync(path.join(dir, "sub"));
    writeFileSync(path.join(dir, "sub", "x.tf"), "");
    expect(isSmallFolder(dir, 10, p("home"))).toBe(true);
    expect(isSmallFolder(dir, 6, p("home"))).toBe(false);
    expect(isSmallFolder(dir, 10, dir)).toBe(false);
    expect(isSmallFolder(path.parse(dir).root, 10, p("home"))).toBe(false);
  });
});

describe("which files the hook checks", () => {
  it("takes .tf files, tfrc and .tfrc as scripts, and tfscript.json as settings", () => {
    expect(kindOf(p("a.tf"))).toBe("script");
    expect(kindOf(p("A.TF"))).toBe("script");
    expect(kindOf(p("tfrc"))).toBe("script");
    expect(kindOf(p(".tfrc"))).toBe("script");
    expect(kindOf(p("tfscript.json"))).toBe("config");
    for (const name of ["a.ts", "tfrc.bak", "a.tf.json", "my.tfrc", "package.json"]) expect(kindOf(p(name)), name).toBeUndefined();
  });
});

function diagnostic(severity: JsonDiagnostic["severity"], line: number, fixes: string[] = []): JsonDiagnostic {
  return {
    file: "a.tf",
    range: { start: { line, column: 1, offset: 0 }, end: { line, column: 2, offset: 1 } },
    severity,
    code: `${severity}-code`,
    message: `A ${severity} on line ${line}: fix it.`,
    codeDescription: null,
    fixes,
    related: [],
    lint: false,
  };
}

function report(diagnostics: JsonDiagnostic[], problems: string[] = []): JsonReport {
  const count = (s: string) => diagnostics.filter((d) => d.severity === s).length;
  return {
    version: 1,
    files: ["a.tf"],
    diagnostics,
    problems,
    summary: { files: 1, errors: count("error"), warnings: count("warning"), information: count("information") },
  };
}

describe("the hook's report", () => {
  const options = { warningLimit: 20, showInformation: false };

  it("is nothing for a clean file, or one with only information notes", () => {
    expect(shapeReport(report([]), "a.tf", options)).toBeUndefined();
    expect(shapeReport(report([diagnostic("information", 1)]), "a.tf", options)).toBeUndefined();
  });

  it("lists every error, then warnings, each with its place, code, message and fixes", () => {
    const shaped = shapeReport(report([diagnostic("warning", 1), diagnostic("error", 2, ["Put = after oops"]), diagnostic("information", 3)]), "a.tf", options);
    expect(shaped).toEqual({
      errors: 1,
      text: [
        "tfscript found 1 error and 1 warning in a.tf:",
        "- a.tf:2:1: error error-code: A error on line 2: fix it. Quick fix an editor offers: Put = after oops.",
        "- a.tf:1:1: warning warning-code: A warning on line 1: fix it.",
      ].join("\n"),
    });
  });

  it("lists information notes when asked to", () => {
    const shaped = shapeReport(report([diagnostic("information", 3, ["A", "B"])]), "a.tf", { ...options, showInformation: true });
    expect(shaped?.text).toBe(
      ["tfscript found 1 information note in a.tf:", "- a.tf:3:1: information information-code: A information on line 3: fix it. Quick fixes an editor offers: A; B."].join("\n"),
    );
  });

  it("caps the warnings and counts the rest, naming the command that lists them all", () => {
    const many = Array.from({ length: 25 }, (_, i) => diagnostic("warning", i + 1));
    const shaped = shapeReport(report([diagnostic("error", 30), ...many]), "a.tf", { ...options, warningLimit: 3, fullCommand: "node tfscript.js check a.tf" });
    const lines = shaped?.text.split("\n") ?? [];
    expect(lines[0]).toBe("tfscript found 1 error and 25 warnings in a.tf:");
    expect(lines).toHaveLength(1 + 1 + 3 + 1);
    expect(lines.at(-1)).toBe("- 22 more are not listed; to see them all, run node tfscript.js check a.tf.");
  });

  it("stays inside its budget, listing errors first", () => {
    const errors = Array.from({ length: 400 }, (_, i) => diagnostic("error", i + 1));
    const shaped = shapeReport(report(errors), "a.tf", options);
    expect(shaped?.text.length).toBeLessThan(9000);
    expect(shaped?.text).toMatch(/\n- \d+ more are not listed\.$/);
  });
});

const TMP = mkdtempSync(path.join(tmpdir(), "tfscript-hook-"));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

/** Deps over an in-memory set of files, with `cli` standing in for tfscript check. */
function deps(files: Record<string, string>, cli: (args: string[], cwd: string, timeoutMs: number) => CliRun, projectDir = p("proj")): HookDeps & { calls: { args: string[]; cwd: string; timeoutMs: number }[] } {
  const calls: { args: string[]; cwd: string; timeoutMs: number }[] = [];
  return {
    projectDir,
    cliPath: p("plugin", "bundle", "tfscript.js"),
    runCli: (args, cwd, timeoutMs) => {
      calls.push({ args, cwd, timeoutMs });
      return cli(args, cwd, timeoutMs);
    },
    readFile: (f) => files[f],
    listDir: (d) => Object.keys(files).filter((f) => path.dirname(f) === d).map((f) => path.basename(f)),
    isFile: (f) => f in files,
    realpath: (f) => f,
    isSmallFolder: () => true,
    calls,
  };
}

const ran = (r: JsonReport, status = 0): CliRun => ({ status, stdout: JSON.stringify(r), stderr: "", timedOut: false });
const input = (file: string, tool = "Edit") => JSON.stringify({ hook_event_name: "PostToolUse", tool_name: tool, tool_input: { file_path: file }, cwd: p("proj") });
const parsed = (stdout: string) => JSON.parse(stdout) as { decision?: string; reason?: string; hookSpecificOutput: { hookEventName: string; additionalContext?: string } };

describe("runHook", () => {
  it("checks a tf script from its root, and puts errors to Claude as a block", () => {
    const d = deps({ [p("proj", "a.tf")]: "/def x" }, () => ran(report([diagnostic("error", 1)]), 1));
    const out = parsed(runHook(input(p("proj", "a.tf")), d).stdout);
    expect(d.calls).toEqual([{ args: ["check", "--format", "json", "--setting-names", "config", "--root", p("proj"), p("proj", "a.tf")], cwd: p("proj"), timeoutMs: 10000 }]);
    expect(out.decision).toBe("block");
    expect(out.reason).toMatch(/^tfscript found 1 error in a\.tf:\n- a\.tf:1:1: error error-code: /);
    expect(out.hookSpecificOutput).toEqual({ hookEventName: "PostToolUse" });
  });

  it("gives warnings as context, not a block, and says nothing for a clean file", () => {
    const warned = runHook(input(p("proj", "a.tf"), "Write"), deps({ [p("proj", "a.tf")]: "" }, () => ran(report([diagnostic("warning", 1)]))));
    const out = parsed(warned.stdout);
    expect(out.decision).toBeUndefined();
    expect(out.hookSpecificOutput.additionalContext).toMatch(/^tfscript found 1 warning in a\.tf:/);
    expect(runHook(input(p("proj", "a.tf")), deps({ [p("proj", "a.tf")]: "" }, () => ran(report([]))))).toEqual({ stdout: "" });
  });

  it("leaves alone other files, Terraform, input it can't read and files that are gone", () => {
    const never = () => {
      throw new Error("tfscript check ran");
    };
    const files = { [p("proj", "a.ts")]: "", [p("proj", "main.tf")]: 'resource "a" "b" {}', [p("infra", "x.tf")]: "", [p("infra", ".terraform.lock.hcl")]: "" };
    for (const file of [p("proj", "a.ts"), p("proj", "main.tf"), p("infra", "x.tf"), p("proj", "gone.tf")]) {
      expect(runHook(input(file), deps(files, never)), file).toEqual({ stdout: "" });
    }
    for (const text of ["", "not json", "{}", '{"tool_input":{}}', '{"tool_input":{"file_path":3}}']) expect(runHook(text, deps(files, never))).toEqual({ stdout: "" });
  });

  it("uses the tfscript.json above the file: its folder as the root, and its claudeCode settings", () => {
    const config = JSON.stringify({ claudeCode: { warningLimit: 1, showInformation: true, timeoutSeconds: 2 } });
    const many = report([diagnostic("warning", 1), diagnostic("warning", 2), diagnostic("information", 3)]);
    const d = deps({ [p("proj", "mud", "tfscript.json")]: config, [p("proj", "mud", "wot", "a.tf")]: "" }, () => ran(many));
    const out = parsed(runHook(input(p("proj", "mud", "wot", "a.tf")), d).stdout);
    expect(d.calls[0]).toEqual({ args: ["check", "--format", "json", "--setting-names", "config", "--root", p("proj", "mud"), p("proj", "mud", "wot", "a.tf")], cwd: p("proj", "mud"), timeoutMs: 2000 });
    expect(out.hookSpecificOutput.additionalContext?.split("\n")).toEqual([
      "tfscript found 2 warnings and 1 information note in mud/wot/a.tf:",
      "- mud/wot/a.tf:1:1: warning warning-code: A warning on line 1: fix it.",
      "- mud/wot/a.tf:3:1: information information-code: A information on line 3: fix it.",
      `- 1 more is not listed; to see them all, run node "${slash(p("plugin", "bundle", "tfscript.js"))}" check --setting-names config --root "${slash(p("proj", "mud"))}" "${slash(p("proj", "mud", "wot", "a.tf"))}".`,
    ]);
  });

  it("checks a file outside the project alone, with undefined-macro off, when its folder is too big", () => {
    const d = { ...deps({ [p("home", "a.tf")]: "" }, () => ran(report([]))), isSmallFolder: () => false };
    const calls: string[][] = [];
    d.runCli = (args) => {
      calls.push(args);
      return ran(report([]));
    };
    expect(runHook(input(p("home", "a.tf")), d)).toEqual({ stdout: "" });
    expect(calls).toEqual([["check", "--format", "json", "--setting-names", "config", "--no-undefined-macros", "--root", p("home"), p("home", "a.tf")]]);
  });

  it("names the file the same way in its first line and on each diagnostic, with forward slashes", () => {
    const one = report([diagnostic("warning", 1)]);
    const text = (file: string, projectDir: string | undefined, realpath: (f: string) => string = (f) => f) => {
      const d = { ...deps({ [file]: "" }, () => ran(one)), realpath };
      if (projectDir === undefined) delete d.projectDir;
      else d.projectDir = projectDir;
      return parsed(runHook(input(file), d).stdout).hookSpecificOutput.additionalContext?.split("\n").slice(0, 2);
    };
    const outside = slash(p("elsewhere", "a.tf"));
    expect(text(p("elsewhere", "a.tf"), p("proj"))).toEqual([`tfscript found 1 warning in ${outside}:`, `- ${outside}:1:1: warning warning-code: A warning on line 1: fix it.`]);
    expect(text(p("elsewhere", "a.tf"), undefined)).toEqual([`tfscript found 1 warning in ${outside}:`, `- ${outside}:1:1: warning warning-code: A warning on line 1: fix it.`]);
    // Through a junction into the project: named from the project, by where it really is.
    const viaLink = (f: string) => (f.startsWith(p("link")) ? p("proj") + f.slice(p("link").length) : f);
    expect(text(p("link", "s", "a.tf"), p("proj"), viaLink)).toEqual(["tfscript found 1 warning in s/a.tf:", "- s/a.tf:1:1: warning warning-code: A warning on line 1: fix it."]);
  });

  it("checks nothing under a tfscript.json that turns it off", () => {
    const d = deps({ [p("proj", "tfscript.json")]: '{"claudeCode":{"enabled":false}}', [p("proj", "a.tf")]: "" }, () => ran(report([diagnostic("error", 1)])));
    expect(runHook(input(p("proj", "a.tf")), d)).toEqual({ stdout: "" });
    expect(d.calls).toEqual([]);
  });

  it("says what is wrong with a bad tfscript.json, whether it is the file edited or the one above it", () => {
    const files = { [p("proj", "tfscript.json")]: '{"entryFiles":"tfrc"}', [p("proj", "a.tf")]: "" };
    const above = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ran(report([])))).stdout);
    expect(above.hookSpecificOutput.additionalContext).toBe(
      'tfscript didn\'t check a.tf, because it can\'t use tfscript.json: tfscript.json gives "entryFiles" as the text "tfrc", not a list of paths: write it as "entryFiles": ["tfrc"].',
    );
    const edited = parsed(runHook(input(p("proj", "tfscript.json"), "Write"), deps(files, () => ran(report([])))).stdout);
    expect(edited.hookSpecificOutput.additionalContext).toBe(
      'tfscript can\'t use tfscript.json: tfscript.json gives "entryFiles" as the text "tfrc", not a list of paths: write it as "entryFiles": ["tfrc"].',
    );
    expect(runHook(input(p("proj", "tfscript.json")), deps({ [p("proj", "tfscript.json")]: "{}" }, () => ran(report([]))))).toEqual({ stdout: "" });
  });

  it("checks again quickly, from the same root and without undefined-macro, when the full check times out", () => {
    const timedOut: CliRun = { status: null, stdout: "", stderr: "", timedOut: true };
    const noteFor = (label: string, root: string) =>
      `The full check of ${label} didn't finish within 10 seconds (its root, ${slash(root)}, may hold too many files to search for what defines each macro), so this is a quick check without undefined-macro. ` +
      "For the full check, narrow the root with a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.";

    // Under a tfscript.json: the retry keeps its folder as the root, so the CLI reads it again.
    const files = { [p("proj", "mud", "tfscript.json")]: '{"variables":{"dir":"/wotmud"}}', [p("proj", "mud", "wot", "a.tf")]: "" };
    let n = 0;
    const d = deps(files, () => (n++ === 0 ? timedOut : ran(report([diagnostic("error", 1)]), 1)));
    const out = parsed(runHook(input(p("proj", "mud", "wot", "a.tf")), d).stdout);
    expect(d.calls.map((c) => [c.args, c.cwd, c.timeoutMs])).toEqual([
      [["check", "--format", "json", "--setting-names", "config", "--root", p("proj", "mud"), p("proj", "mud", "wot", "a.tf")], p("proj", "mud"), 10000],
      [["check", "--format", "json", "--setting-names", "config", "--no-undefined-macros", "--root", p("proj", "mud"), p("proj", "mud", "wot", "a.tf")], p("proj", "mud"), RETRY_SECONDS * 1000],
    ]);
    expect(out.decision).toBe("block");
    expect(out.reason?.split("\n")).toEqual([
      "tfscript found 1 error in mud/wot/a.tf:",
      "- mud/wot/a.tf:1:1: error error-code: A error on line 1: fix it.",
      noteFor("mud/wot/a.tf", p("proj", "mud")),
    ]);

    const plain = { [p("proj", "a.tf")]: "" };
    n = 0;
    const clean = parsed(runHook(input(p("proj", "a.tf")), deps(plain, () => (n++ === 0 ? timedOut : ran(report([]))))).stdout);
    expect(clean).toEqual({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: noteFor("a.tf", p("proj")) } });

    // What the quick check couldn't check is passed on, not dropped.
    n = 0;
    const withProblem = parsed(runHook(input(p("proj", "a.tf")), deps(plain, () => (n++ === 0 ? timedOut : ran(report([], ["b.tf doesn't exist: check the path."]), 2)))).stdout);
    expect(withProblem.hookSpecificOutput.additionalContext?.split("\n")).toEqual([
      "tfscript also couldn't check everything: b.tf doesn't exist: check the path.",
      noteFor("a.tf", p("proj")),
    ]);
  });

  it("gives a short notice when the check times out, can't start or fails", () => {
    const files = { [p("proj", "a.tf")]: "" };
    const timedOut = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ({ status: null, stdout: "", stderr: "", timedOut: true }))).stdout);
    expect(timedOut.hookSpecificOutput.additionalContext).toBe(
      `tfscript didn't finish checking a.tf within 10 seconds, so it is unchecked. Its root, ${slash(p("proj"))}, may hold too many files: put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`,
    );
    const failed = (failure: CliFailure) =>
      parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ({ status: null, stdout: "", stderr: "", timedOut: false, failure }))).stdout).hookSpecificOutput.additionalContext;
    expect(failed(spawnFailure(Object.assign(new Error("spawnSync node ENOENT"), { code: "ENOENT" })))).toBe(
      `tfscript couldn't check a.tf, because it couldn't be started: node, or the folder it was to run in, wasn't found (ENOENT): check that node can run ${slash(p("plugin", "bundle", "tfscript.js"))}.`,
    );
    expect(failed(spawnFailure(Object.assign(new Error("spawnSync node ENOBUFS"), { code: "ENOBUFS" })))).toMatch(
      /^tfscript couldn't check a\.tf, because its report was larger than 64 MiB: run node ".+" check .+ to see it\.$/,
    );
    // The first line of stderr, without the \r of a Windows line end.
    const crashed = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ({ status: 2, stdout: "", stderr: "tfscript: the check failed\r\nstack\r\n", timedOut: false }))).stdout);
    expect(crashed.hookSpecificOutput.additionalContext).toMatch(/^tfscript couldn't check a\.tf \(tfscript: the check failed\): run node .+ to see why\.$/);
    const problem = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ran(report([], ["a.tf can't be read: check that it is a file you may read."]), 2))).stdout);
    expect(problem.hookSpecificOutput.additionalContext).toBe("tfscript couldn't check a.tf: a.tf can't be read: check that it is a file you may read.");
  });

  it("passes on problems beside diagnostics, rather than dropping them", () => {
    const files = { [p("proj", "a.tf")]: "" };
    const both = report([diagnostic("warning", 1)], ["b.tf doesn't exist: check the path."]);
    const text = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ran(both, 2))).stdout).hookSpecificOutput.additionalContext;
    expect(text?.split("\n")).toEqual([
      "tfscript found 1 warning in a.tf:",
      "- a.tf:1:1: warning warning-code: A warning on line 1: fix it.",
      "tfscript also couldn't check everything: b.tf doesn't exist: check the path.",
    ]);
  });

  it("takes a relative path from the call's cwd only when that is text", () => {
    const files = { [p("proj", "a.tf")]: "", [p("other", "a.tf")]: "" };
    const call = (cwd: unknown) => JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "a.tf" }, cwd });
    for (const cwd of [42, null, { dir: "x" }, ""]) {
      const d = deps(files, () => ran(report([])));
      expect(runHook(call(cwd), d), JSON.stringify(cwd)).toEqual({ stdout: "" });
      expect(d.calls[0]?.args.at(-1)).toBe(p("proj", "a.tf"));
    }
    const d = deps(files, () => ran(report([])));
    runHook(call(p("other")), d);
    expect(d.calls[0]?.args.at(-1)).toBe(p("other", "a.tf"));
  });
});

describe("runNode", () => {
  it("gives up on a check that runs too long, soon after the time allowed", () => {
    const slow = path.join(TMP, "slow.js");
    writeFileSync(slow, "setTimeout(() => {}, 20000);\n");
    const started = Date.now();
    const run = runNode(slow, [], TMP, 300);
    expect(run.timedOut).toBe(true);
    expect(run.status).toBeNull();
    expect(Date.now() - started).toBeLessThan(timeBudget(5000));
  });

  it("gives the exit status and output of one that finishes", () => {
    const quick = path.join(TMP, "quick.js");
    writeFileSync(quick, "process.stdout.write(process.argv.slice(2).join(' ')); process.exitCode = 1;\n");
    expect(runNode(quick, ["a", "b"], TMP, 10000)).toEqual({ status: 1, stdout: "a b", stderr: "", timedOut: false });
  });

  it("says why a run that can't start failed", () => {
    const run = runNode(path.join(TMP, "quick.js"), [], path.join(TMP, "no-such-folder"), 10000);
    expect(run.timedOut).toBe(false);
    expect(run.failure).toEqual({ reason: "it couldn't be started: node, or the folder it was to run in, wasn't found (ENOENT)", overflow: false });
    expect(spawnFailure(Object.assign(new Error("x"), { code: "EACCES" }))).toEqual({ reason: "it wasn't allowed to start (EACCES)", overflow: false });
    expect(spawnFailure(Object.assign(new Error("odd"), { code: "EIO" }))).toEqual({ reason: "it couldn't be run (EIO: odd)", overflow: false });
  });
});

describe("lint only on the lines an edit wrote", () => {
  const file = p("proj", "a.tf");
  const text = "/load alias.tf\n/def a = /echo a\n/def idle =\n/def b = /echo b\n";
  const lintAt = (line: number): JsonDiagnostic => ({ ...diagnostic("warning", line), code: "lint-code", lint: true });
  const edit = (tool_input: object) => JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: file, ...tool_input }, cwd: p("proj") });

  it("finds the lines of each new_string, every occurrence, and all of a Write", () => {
    expect(editedLines({ tool_input: { new_string: "/def idle =" } }, text)).toEqual(new Set([3]));
    expect(editedLines({ tool_input: { new_string: "/def a = /echo a\n/def idle =" } }, text)).toEqual(new Set([2, 3]));
    expect(editedLines({ tool_input: { new_string: "/echo" } }, text)).toEqual(new Set([2, 4]));
    expect(editedLines({ tool_input: { edits: [{ new_string: "alias.tf" }, { new_string: "b = " }] } }, text)).toEqual(new Set([1, 4]));
    expect(editedLines({ tool_input: { content: text } }, text)).toBe("all");
    // Text it can't find (a CRLF file, say) leaves nothing out; a deletion wrote no line.
    expect(editedLines({ tool_input: { new_string: "nowhere" } }, text)).toBe("all");
    expect(editedLines({ tool_input: { new_string: "" } }, text)).toEqual(new Set());
  });

  it("passes on lint on the edited lines only, says how much it left out, and every other diagnostic", () => {
    const d = deps({ [file]: text }, () => ran(report([lintAt(1), diagnostic("warning", 2), lintAt(3)])));
    const out = parsed(runHook(edit({ old_string: "/def idle", new_string: "/def idle =" }), d).stdout).hookSpecificOutput.additionalContext ?? "";
    expect(out).toContain("a.tf:3:1: warning lint-code");
    expect(out).toContain("a.tf:2:1: warning warning-code");
    expect(out).not.toContain("a.tf:1:1");
    expect(out).toContain("1 lint warning on lines this edit didn't write isn't listed");
  });

  it("says nothing when the only diagnostics are lint on lines it didn't write, and lists it all for a Write", () => {
    const only = () => ran(report([lintAt(1)]));
    expect(runHook(edit({ new_string: "/def b = /echo b" }), deps({ [file]: text }, only))).toEqual({ stdout: "" });
    const written = parsed(runHook(input(file, "Write"), deps({ [file]: text }, only)).stdout);
    expect(written.hookSpecificOutput.additionalContext).toContain("a.tf:1:1: warning lint-code");
  });
});
