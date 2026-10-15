import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import type { Environment } from "./settings";
import type { FileSystem } from "./workspaceIndex";

/**
 * The workspace index's file system and environment on this machine, through node:fs: what the
 * server and the command line both read files with.
 */

/** Folders whose changes don't matter, and whose create and delete events (a jj or git command's) are ignored. */
export const SKIP_DIRS: ReadonlySet<string> = new Set([".git", ".jj", "node_modules"]);

/** Whether `name` is one of SKIP_DIRS, ignoring case where the file system does (Windows). */
export function isSkippedDir(name: string): boolean {
  return SKIP_DIRS.has(process.platform === "win32" ? name.toLowerCase() : name);
}

export function readFile(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

export function listTfFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".tf"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** Stops as soon as it has `limit` files: a big tree isn't read to the end and then cut. */
export function walkTfFiles(dir: string, limit = Infinity): string[] {
  const out: string[] = [];
  const visit = (d: string): void => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!isSkippedDir(e.name)) visit(full);
      } else if (e.name.endsWith(".tf") || e.name === "tfrc" || e.name === ".tfrc") {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
}

export function mtime(file: string): number | undefined {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
}

export const nodeFileSystem: FileSystem = { readFile, listTfFiles, walkTfFiles, mtime };

/** This process's environment, home directory and file system, as settings are resolved against them. */
export function nodeEnvironment(): Environment {
  return { env: process.env, homedir: homedir(), exists: existsSync };
}
