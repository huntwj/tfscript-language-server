import * as path from "node:path";
import { CONFIG_FILE, readConfig, type ClaudeCodeSettings } from "@tfscript/core/workspace/configFile";
import type { JsonReport } from "../format";
import { DEFAULT_WARNING_LIMIT, shapeReport } from "./report";
import { hookRoot, isInside, type RootHost } from "./root";
import { terraformSign } from "./terraform";

/**
 * The Claude Code plugin's PostToolUse hook: after Claude edits or writes a tf script, it runs
 * tfscript check on the file and tells Claude what it found. It never changes a file. Claude Code
 * gives it the tool call as JSON on stdin; it answers with JSON on stdout and always exits 0, so
 * nothing it does can stop Claude's work. It says nothing for a clean file, a file that isn't a tf
 * script, or a .tf file that is Terraform.
 */

/** How long a check may take, by default, before the hook gives up with a notice. */
export const DEFAULT_TIMEOUT_SECONDS = 10;

/** How a run of tfscript check ended. */
export interface CliRun {
  /** The exit status, or null when it didn't exit (timed out, or couldn't start). */
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Why it couldn't start, if it couldn't. */
  error?: string;
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
interface ToolCall {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: { file_path?: unknown };
  cwd?: string;
}

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

/** `file` as Claude would know it: relative to the project folder when inside it, else absolute. */
function labelOf(file: string, projectDir: string | undefined): string {
  if (projectDir === undefined || !isInside(file, path.resolve(projectDir))) return file;
  return path.relative(path.resolve(projectDir), file) || file;
}

const quote = (s: string): string => (/\s/.test(s) ? `"${s}"` : s);

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
  const file = path.resolve(call.cwd ?? deps.projectDir ?? ".", given);
  const kind = kindOf(file);
  if (kind === undefined || !deps.isFile(file)) return QUIET;
  const label = labelOf(file, deps.projectDir);

  if (kind === "config") {
    const loaded = readConfig(file, deps.readFile, label);
    return loaded.config ? QUIET : context(`tfscript can't use ${label}: ${loaded.problems.join(" ")}`);
  }

  if (terraformSign(file, deps) !== undefined) return QUIET;

  const { root, config, fileOnly } = hookRoot(file, deps.projectDir, deps);
  let claudeCode: ClaudeCodeSettings = {};
  if (config !== undefined) {
    const configLabel = labelOf(config, deps.projectDir);
    const loaded = readConfig(config, deps.readFile, configLabel);
    if (!loaded.config) {
      return context(`tfscript didn't check ${label}, because it can't use ${configLabel}: ${loaded.problems.join(" ")}`);
    }
    if (loaded.config.claudeCode.enabled === false) return QUIET;
    claudeCode = loaded.config.claudeCode;
  }
  const seconds = claudeCode.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;

  const cwd = deps.projectDir !== undefined && isInside(file, path.resolve(deps.projectDir)) ? path.resolve(deps.projectDir) : root;
  // A file checked alone (its folder too big to search) has undefined-macro off: it would search the whole folder.
  const args = ["check", "--format", "json", ...(fileOnly ? ["--no-undefined-macros"] : []), "--root", root, file];
  const run = deps.runCli(args, cwd, seconds * 1000);
  const fullCommand = `node ${quote(deps.cliPath)} check --root ${quote(root)} ${quote(file)}`;

  if (run.timedOut) {
    return context(
      `tfscript didn't finish checking ${label} within ${seconds} seconds, so it is unchecked. ` +
        `Its root, ${root}, may hold too many files: put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`,
    );
  }
  if (run.error !== undefined) return context(`tfscript couldn't check ${label}, because it couldn't start (${run.error}): check that node can run ${deps.cliPath}.`);

  let report: JsonReport | undefined;
  try {
    report = JSON.parse(run.stdout) as JsonReport;
  } catch {
    report = undefined;
  }
  if (report === undefined || !Array.isArray(report.diagnostics)) {
    const why = run.stderr.trim().split("\n")[0] ?? "";
    return context(`tfscript couldn't check ${label}${why ? ` (${why})` : ""}: run ${fullCommand} to see why.`);
  }
  if (report.problems.length > 0 && report.diagnostics.length === 0) {
    return context(`tfscript couldn't check ${label}: ${report.problems.join(" ")}`);
  }

  const shaped = shapeReport(report, label, {
    warningLimit: claudeCode.warningLimit ?? DEFAULT_WARNING_LIMIT,
    showInformation: claudeCode.showInformation ?? false,
    fullCommand,
  });
  if (shaped === undefined) return QUIET;
  return shaped.errors > 0 ? block(shaped.text) : context(shaped.text);
}
