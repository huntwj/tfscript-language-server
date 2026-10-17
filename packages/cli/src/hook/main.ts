import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { isSkippedDir } from "@tfscript/core/workspace/nodeFileSystem";
import { runHook, type CliFailure, type CliRun, type HookDeps } from "./hook";

/** The most output a check may give before it is stopped. */
export const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/** Why a run failed, as the end of "tfscript couldn't check x, because ...", from spawnSync's error. */
export function spawnFailure(error: NodeJS.ErrnoException): CliFailure {
  switch (error.code) {
    case "ENOBUFS":
      return { reason: `its report was larger than ${MAX_OUTPUT_BYTES / 1024 / 1024} MiB`, overflow: true };
    case "ENOENT":
      return { reason: "it couldn't be started: node, or the folder it was to run in, wasn't found (ENOENT)", overflow: false };
    case "EACCES":
    case "EPERM":
      return { reason: `it wasn't allowed to start (${error.code})`, overflow: false };
    default:
      return { reason: `it couldn't be run (${error.code ? `${error.code}: ` : ""}${error.message})`, overflow: false };
  }
}

/** Runs node `cli` with `args`, killing it after `timeoutMs`. */
export function runNode(cli: string, args: string[], cwd: string, timeoutMs: number): CliRun {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: MAX_OUTPUT_BYTES });
  const error = result.error as NodeJS.ErrnoException | undefined;
  const timedOut = error?.code === "ETIMEDOUT";
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut,
    ...(error !== undefined && !timedOut ? { failure: spawnFailure(error) } : {}),
  };
}

/** How many entries a folder may hold, all the way down, and still be searched for tf scripts in a moment. */
export const SMALL_FOLDER_ENTRIES = 5000;

/**
 * Whether `dir` can be searched quickly: not a drive's root or the home folder, and holding no
 * more than `limit` entries all the way down (skipping .git, .jj and node_modules, as the search does).
 */
export function isSmallFolder(dir: string, limit = SMALL_FOLDER_ENTRIES, home = homedir()): boolean {
  const resolved = path.resolve(dir);
  if (path.parse(resolved).root === resolved || path.relative(home, resolved) === "") return false;
  let seen = 0;
  const visit = (d: string): boolean => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return true;
    }
    seen += entries.length;
    if (seen > limit) return false;
    return entries.every((e) => !e.isDirectory() || isSkippedDir(e.name) || visit(path.join(d, e.name)));
  };
  return visit(resolved);
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
    realpath: (p) => {
      try {
        return realpathSync.native(p);
      } catch {
        return p;
      }
    },
    isSmallFolder: (d) => isSmallFolder(d),
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
