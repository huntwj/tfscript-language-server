import * as path from "node:path";
import { CONFIG_FILE, readConfig, type ClaudeCodeSettings } from "@tfscript/core/workspace/configFile";
import type { JsonReport } from "../format";
import { DEFAULT_BUDGET, DEFAULT_WARNING_LIMIT, shapeReport } from "./report";
import { hookRoot, isInside, type RootHost } from "./root";
import { terraformSign } from "./terraform";

/**
 * The Claude Code plugin's PostToolUse hook: after Claude edits or writes a tf script, it runs
 * tfscript check on the file and tells Claude what it found. It never changes a file. Claude Code
 * gives it the tool call as JSON on stdin; it answers with JSON on stdout and always exits 0, so
 * nothing it does can stop Claude's work. It says nothing for a clean file, a file that isn't a tf
 * script, or a .tf file that is Terraform.
 */

/** How long a check may take, by default, before the hook tries the quick check instead. */
export const DEFAULT_TIMEOUT_SECONDS = 10;

/**
 * How long the quick check (without undefined-macro, after the full one timed out) may take. With the
 * longest full check (MAX_TIMEOUT_SECONDS, 20) it stays inside the 30 seconds hooks.json gives the hook.
 */
export const RETRY_SECONDS = 5;

/** How a run of tfscript check ended. */
export interface CliRun {
  /** The exit status, or null when it didn't exit (timed out, or couldn't start). */
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Why it failed to run (it couldn't start, or its output was too big), if it did. */
  failure?: CliFailure;
}

export interface CliFailure {
  /** The end of "tfscript couldn't check x, because ...". */
  reason: string;
  /** Whether it ran but gave more output than could be read, so running it by hand shows why. */
  overflow: boolean;
}

export interface HookDeps extends RootHost {
  /** CLAUDE_PROJECT_DIR, the project folder Claude Code started in. */
  projectDir?: string;
  /** The bundled tfscript check, run with node. */
  cliPath: string;
  /** Runs node `cliPath` with `args` in `cwd`, giving up after `timeoutMs`. */
  runCli(args: string[], cwd: string, timeoutMs: number): CliRun;
  readFile(file: string): string | undefined;
  listDir(dir: string): string[] | undefined;
}

/** What the hook writes to stdout (nothing, when stdout is empty). */
export interface HookResult {
  stdout: string;
}

/** The PostToolUse input fields the hook reads. */
export interface ToolCall {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: { file_path?: unknown; content?: unknown; new_string?: unknown; edits?: unknown };
  cwd?: unknown;
}

/**
 * The lines (1-based) of `text`, the file after the edit, that the call wrote: where each Edit or
 * MultiEdit `new_string` now is, every occurrence of it; or "all" for a Write (the whole file),
 * or when an edit's text can't be found (then nothing is left out).
 */
export function editedLines(call: ToolCall, text: string | undefined): Set<number> | "all" {
  const input = call.tool_input ?? {};
  if (typeof input.content === "string" || text === undefined) return "all";
  const edits = Array.isArray(input.edits) ? (input.edits as { new_string?: unknown }[]).map((e) => e?.new_string) : [];
  const written = [input.new_string, ...edits].filter((s): s is string => typeof s === "string");
  if (written.length === 0) return "all";
  const starts = [0];
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  const lineOf = (offset: number): number => {
    let lo = 0;
    while (lo + 1 < starts.length && (starts[lo + 1] as number) <= offset) lo += 1;
    return lo + 1;
  };
  const lines = new Set<number>();
  for (const s of written) {
    if (s === "") continue;
    let at = text.indexOf(s);
    if (at < 0) return "all";
    for (; at >= 0; at = text.indexOf(s, at + s.length)) {
      for (let l = lineOf(at); l <= lineOf(at + s.length - 1); l += 1) lines.add(l);
    }
  }
  return lines;
}

/** The report without its lint diagnostics on lines the edit didn't write, and how many it left out. */
function editedLintOnly(report: JsonReport, edited: Set<number> | "all"): { report: JsonReport; left: number } {
  if (edited === "all") return { report, left: 0 };
  const kept = report.diagnostics.filter((d) => !d.lint || edited.has(d.range.start.line));
  return { report: { ...report, diagnostics: kept }, left: report.diagnostics.length - kept.length };
}

/** What the hook says about the lint warnings it left out, or undefined for none. */
const leftOutNote = (left: number): string | undefined =>
  left === 0
    ? undefined
    : `${left === 1 ? "1 lint warning" : `${left} lint warnings`} on lines this edit didn't write ${left === 1 ? "isn't" : "aren't"} listed: tfscript reports lint only where an edit writes.`;

const QUIET: HookResult = { stdout: "" };

/** Whether `file` is one the hook checks: a .tf file, a tfrc or .tfrc, or a tfscript.json. */
export function kindOf(file: string): "script" | "config" | undefined {
  const name = path.basename(file);
  const lower = name.toLowerCase();
  if (lower.endsWith(".tf") || name === "tfrc" || name === ".tfrc") return "script";
  if (name === CONFIG_FILE) return "config";
  return undefined;
}

/** A context note for Claude, beside the tool's result. */
function context(text: string): HookResult {
  return { stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text } })}\n` };
}

/** Errors in the edited file: put to Claude as a block on the edit (the edit has happened; this asks for a fix). */
function block(text: string): HookResult {
  return { stdout: `${JSON.stringify({ decision: "block", reason: text, hookSpecificOutput: { hookEventName: "PostToolUse" } })}\n` };
}

/** `p` with forward slashes, which every shell takes, Git Bash's included (it eats backslashes). */
const slash = (p: string): string => p.replace(/\\/g, "/");

/** `p` quoted for a shell, with forward slashes. */
const quote = (p: string): string => `"${slash(p)}"`;

/**
 * `file` as the hook names it, in its first line and on each diagnostic's alike: relative to the
 * project folder when inside it (by its path, or else by where it really is), else absolute;
 * with forward slashes either way.
 */
function labelOf(file: string, projectDir: string | undefined, realpath: (p: string) => string): string {
  if (projectDir !== undefined) {
    const project = path.resolve(projectDir);
    if (isInside(file, project)) return slash(path.relative(project, file)) || slash(file);
    const real = realpath(file);
    const realProject = realpath(project);
    if (isInside(real, realProject)) return slash(path.relative(realProject, real)) || slash(file);
  }
  return slash(file);
}

/** Runs the hook on `input`, the PostToolUse JSON from stdin. */
export function runHook(input: string, deps: HookDeps): HookResult {
  let call: ToolCall;
  try {
    call = JSON.parse(input) as ToolCall;
  } catch {
    return QUIET;
  }
  const given = call?.tool_input?.file_path;
  if (typeof given !== "string" || given === "") return QUIET;
  // The path is absolute as Claude Code sends it; a relative one is taken from the call's cwd.
  const base = typeof call.cwd === "string" && call.cwd !== "" ? call.cwd : (deps.projectDir ?? ".");
  const file = path.resolve(base, given);
  const kind = kindOf(file);
  if (kind === undefined || !deps.isFile(file)) return QUIET;
  const label = labelOf(file, deps.projectDir, deps.realpath);

  if (kind === "config") {
    const loaded = readConfig(file, deps.readFile, label);
    return loaded.config ? QUIET : context(`tfscript can't use ${label}: ${loaded.problems.join(" ")}`);
  }

  if (terraformSign(file, deps) !== undefined) return QUIET;

  const { root, config, fileOnly } = hookRoot(file, deps.projectDir, deps);
  let claudeCode: ClaudeCodeSettings = {};
  if (config !== undefined) {
    const configLabel = labelOf(config, deps.projectDir, deps.realpath);
    const loaded = readConfig(config, deps.readFile, configLabel);
    if (!loaded.config) {
      return context(`tfscript didn't check ${label}, because it can't use ${configLabel}: ${loaded.problems.join(" ")}`);
    }
    if (loaded.config.claudeCode.enabled === false) return QUIET;
    claudeCode = loaded.config.claudeCode;
  }
  const seconds = claudeCode.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;

  // Messages name a setting as its tfscript.json key, which is how the hook is set up. A file
  // checked alone (its folder too big to search) has undefined-macro off, which would search it.
  const flags = ["--setting-names", "config", ...(fileOnly ? ["--no-undefined-macros"] : [])];
  // Run from the root, so nothing in the check depends on where Claude Code started the hook.
  const run = deps.runCli(["check", "--format", "json", ...flags, "--root", root, file], root, seconds * 1000);
  // What Claude can run to see the whole report: absolute paths, so it works from any folder.
  const fullCommand = `node ${quote(deps.cliPath)} check ${flags.join(" ")} --root ${quote(root)} ${quote(file)}`;

  const options = { warningLimit: claudeCode.warningLimit ?? DEFAULT_WARNING_LIMIT, showInformation: claudeCode.showInformation ?? false };
  // Lint is only passed on for the lines this call wrote, so Claude isn't sent off to change code
  // nobody asked about; a file improves as it is worked on. Errors and the rest are passed on whole.
  const edited = editedLines(call, deps.readFile(file));

  if (run.timedOut) {
    // Try once more, quickly: the same root and the same tfscript.json (so its libraryPath,
    // variables, pathMappings and the rest still hold), with undefined-macro off. Only that check
    // searches the root (for what defines each macro), so without it the check is quick.
    const quickFlags = flags.includes("--no-undefined-macros") ? flags : [...flags, "--no-undefined-macros"];
    const quick = deps.runCli(["check", "--format", "json", ...quickFlags, "--root", root, file], root, RETRY_SECONDS * 1000);
    const quickRun = quick.timedOut || quick.failure !== undefined ? undefined : parseReport(quick.stdout);
    const quickReport = quickRun && editedLintOnly(quickRun, edited).report;
    if (quickReport === undefined) {
      return context(
        `tfscript didn't finish checking ${label} within ${seconds} seconds, so it is unchecked. ` +
          `Its root, ${slash(root)}, may hold too many files: put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`,
      );
    }
    const note =
      `The full check of ${label} didn't finish within ${seconds} seconds (its root, ${slash(root)}, may hold too many files to search for what defines each macro), so this is a quick check without undefined-macro. ` +
      `For the full check, narrow the root with a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`;
    const problems = quickReport.problems.length > 0 ? `tfscript also couldn't check everything: ${quickReport.problems.join(" ")}` : undefined;
    const tail = problems === undefined ? note : `${problems}\n${note}`;
    const shaped = shapeReport(quickReport, label, { ...options, budget: DEFAULT_BUDGET - tail.length });
    if (shaped === undefined) return context(tail);
    const text = `${shaped.text}\n${tail}`;
    return shaped.errors > 0 ? block(text) : context(text);
  }
  if (run.failure !== undefined) {
    const fix = run.failure.overflow ? `run ${fullCommand} to see it` : `check that node can run ${slash(deps.cliPath)}`;
    return context(`tfscript couldn't check ${label}, because ${run.failure.reason}: ${fix}.`);
  }

  const parsed = parseReport(run.stdout);
  if (parsed === undefined) {
    // The first line of what it said, without a Windows line end's \r.
    const why = run.stderr.replace(/\r/g, "").trim().split("\n")[0] ?? "";
    return context(`tfscript couldn't check ${label}${why ? ` (${why})` : ""}: run ${fullCommand} to see why.`);
  }
  if (parsed.problems.length > 0 && parsed.diagnostics.length === 0) {
    return context(`tfscript couldn't check ${label}: ${parsed.problems.join(" ")}`);
  }
  const { report, left } = editedLintOnly(parsed, edited);

  // Problems beside diagnostics (a path it couldn't check, alongside the file) are passed on too,
  // and the lint left out is counted.
  const problems = report.problems.length > 0 ? `tfscript also couldn't check everything: ${report.problems.join(" ")}` : undefined;
  const notes = [problems, leftOutNote(left)].filter((n): n is string => n !== undefined);
  const also = notes.length > 0 ? notes.join("\n") : undefined;
  const shaped = shapeReport(report, label, { ...options, fullCommand, ...(also ? { budget: DEFAULT_BUDGET - also.length } : {}) });
  // Lint left out alone is nothing to say.
  if (shaped === undefined) return problems === undefined ? QUIET : context(problems);
  const text = also === undefined ? shaped.text : `${shaped.text}\n${also}`;
  return shaped.errors > 0 ? block(text) : context(text);
}

/** tfscript check's JSON report, or undefined when `stdout` isn't one. */
function parseReport(stdout: string): JsonReport | undefined {
  try {
    const report = JSON.parse(stdout) as JsonReport;
    return Array.isArray(report?.diagnostics) && Array.isArray(report.problems) ? report : undefined;
  } catch {
    return undefined;
  }
}
