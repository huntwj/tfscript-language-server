import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { timeBudget } from "../../core/test/timeBudget";
import type { JsonDiagnostic, JsonReport } from "../src/format";
import { kindOf, RETRY_SECONDS, runHook, type CliRun, type HookDeps } from "../src/hook/hook";
import { isSmallFolder, runNode } from "../src/hook/main";
import { shapeReport } from "../src/hook/report";
import { hookRoot, type RootHost } from "../src/hook/root";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);

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
    expect(d.calls[0]).toEqual({ args: ["check", "--format", "json", "--setting-names", "config", "--root", p("proj", "mud"), p("proj", "mud", "wot", "a.tf")], cwd: p("proj"), timeoutMs: 2000 });
    expect(out.hookSpecificOutput.additionalContext?.split("\n")).toEqual([
      `tfscript found 2 warnings and 1 information note in ${path.join("mud", "wot", "a.tf")}:`,
      "- a.tf:1:1: warning warning-code: A warning on line 1: fix it.",
      "- a.tf:3:1: information information-code: A information on line 3: fix it.",
      `- 1 more is not listed; to see them all, run node ${p("plugin", "bundle", "tfscript.js")} check --root ${p("proj", "mud")} ${p("proj", "mud", "wot", "a.tf")}.`,
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

  it("checks the file alone, quickly and without undefined-macro, when the full check times out", () => {
    const files = { [p("proj", "a.tf")]: "" };
    const timedOut: CliRun = { status: null, stdout: "", stderr: "", timedOut: true };
    const note =
      `The full check of a.tf didn't finish within 10 seconds (its root, ${p("proj")}, may hold too many files), so this is a quick check of the file alone, without undefined-macro. ` +
      "For the full check, put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.";

    let n = 0;
    const d = deps(files, () => (n++ === 0 ? timedOut : ran(report([diagnostic("error", 1)]), 1)));
    const out = parsed(runHook(input(p("proj", "a.tf")), d).stdout);
    expect(d.calls.map((c) => [c.args, c.timeoutMs])).toEqual([
      [["check", "--format", "json", "--setting-names", "config", "--root", p("proj"), p("proj", "a.tf")], 10000],
      [["check", "--format", "json", "--setting-names", "config", "--no-undefined-macros", "--root", p("proj"), p("proj", "a.tf")], RETRY_SECONDS * 1000],
    ]);
    expect(out.decision).toBe("block");
    expect(out.reason?.split("\n")).toEqual(["tfscript found 1 error in a.tf:", "- a.tf:1:1: error error-code: A error on line 1: fix it.", note]);

    n = 0;
    const clean = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => (n++ === 0 ? timedOut : ran(report([]))))).stdout);
    expect(clean).toEqual({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: note } });
  });

  it("gives a short notice when the check times out, can't start or fails", () => {
    const files = { [p("proj", "a.tf")]: "" };
    const timedOut = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ({ status: null, stdout: "", stderr: "", timedOut: true }))).stdout);
    expect(timedOut.hookSpecificOutput.additionalContext).toBe(
      `tfscript didn't finish checking a.tf within 10 seconds, so it is unchecked. Its root, ${p("proj")}, may hold too many files: put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`,
    );
    const noStart = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ({ status: null, stdout: "", stderr: "", timedOut: false, error: "spawn ENOENT" }))).stdout);
    expect(noStart.hookSpecificOutput.additionalContext).toMatch(/^tfscript couldn't check a\.tf, because it couldn't start \(spawn ENOENT\): check that node can run /);
    const crashed = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ({ status: 2, stdout: "", stderr: "tfscript: the check failed\nstack", timedOut: false }))).stdout);
    expect(crashed.hookSpecificOutput.additionalContext).toMatch(/^tfscript couldn't check a\.tf \(tfscript: the check failed\): run node .+ to see why\.$/);
    const problem = parsed(runHook(input(p("proj", "a.tf")), deps(files, () => ran(report([], ["a.tf can't be read: check that it is a file you may read."]), 2))).stdout);
    expect(problem.hookSpecificOutput.additionalContext).toBe("tfscript couldn't check a.tf: a.tf can't be read: check that it is a file you may read.");
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
});
