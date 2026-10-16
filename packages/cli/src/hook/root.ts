import * as path from "node:path";
import { findConfig } from "@tfscript/core/workspace/configFile";

/** Where the hook checks a file from. */
export interface HookRoot {
  /** The folder given to tfscript check as --root, absolute. */
  root: string;
  /** The tfscript.json whose folder the root is, if one was found. */
  config?: string;
}

/** Whether `file` is `dir` or inside it. */
export function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !rel.startsWith("../") && !path.isAbsolute(rel));
}

/**
 * The root to check `file` from. tfscript check searches its whole root for what defines each
 * macro, so the root is kept as narrow as what is known allows: the folder of the nearest
 * tfscript.json above the file; failing that the project folder Claude Code gives the hook
 * (CLAUDE_PROJECT_DIR), if the file is in it; otherwise the file's own folder.
 */
export function hookRoot(file: string, projectDir: string | undefined, exists: (file: string) => boolean): HookRoot {
  const absolute = path.resolve(file);
  const config = findConfig(path.dirname(absolute), exists);
  if (config !== undefined) return { root: path.dirname(config), config };
  if (projectDir !== undefined && projectDir.trim() !== "" && isInside(absolute, path.resolve(projectDir))) {
    return { root: path.resolve(projectDir) };
  }
  return { root: path.dirname(absolute) };
}
