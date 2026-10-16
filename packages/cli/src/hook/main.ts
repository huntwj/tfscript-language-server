import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { runHook, type CliRun, type HookDeps } from "./hook";

/** Runs node `cli` with `args`, killing it after `timeoutMs`. */
export function runNode(cli: string, args: string[], cwd: string, timeoutMs: number): CliRun {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: code === "ETIMEDOUT",
    ...(result.error !== undefined && code !== "ETIMEDOUT" ? { error: result.error.message } : {}),
  };
}

/** The hook's dependencies on this machine: the CLI beside the hook (tfscript.js, in the plugin's bundle). */
export function nodeDeps(cliPath: string, env: NodeJS.ProcessEnv = process.env): HookDeps {
  return {
    ...(env.CLAUDE_PROJECT_DIR ? { projectDir: env.CLAUDE_PROJECT_DIR } : {}),
    cliPath,
    runCli: (args, cwd, timeoutMs) => runNode(cliPath, args, cwd, timeoutMs),
    readFile: (f) => {
      try {
        return readFileSync(f, "utf8");
      } catch {
        return undefined;
      }
    },
    listDir: (d) => {
      try {
        return readdirSync(d);
      } catch {
        return undefined;
      }
    },
    isFile: (f) => {
      try {
        return statSync(f).isFile();
      } catch {
        return false;
      }
    },
  };
}

/** The hook as Claude Code runs it: the tool call on stdin, the answer on stdout, exit 0 whatever happens. */
export function hookMain(cliPath: string): void {
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {
    input = "";
  }
  try {
    process.stdout.write(runHook(input, nodeDeps(cliPath)).stdout);
  } catch (error) {
    // A bug in the hook mustn't get in Claude's way: say so on stderr (Claude Code's debug log) and exit 0.
    process.stderr.write(`tfscript hook: an internal error, which is a bug: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  }
  process.exitCode = 0;
}
