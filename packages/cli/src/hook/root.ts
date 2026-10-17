import * as path from "node:path";
import { findConfig } from "@tfscript/core/workspace/configFile";

/** What finding the root reads from the machine. */
export interface RootHost {
  isFile(file: string): boolean;
  /** Where `p` really is, through junctions and symbolic links, or `p` if that can't be told. */
  realpath(p: string): string;
  /**
   * Whether searching `dir` for tf scripts is quick: it isn't a drive's root or the home folder,
   * and it doesn't hold too many entries.
   */
  isSmallFolder(dir: string): boolean;
}

/** Where the hook checks a file from. */
export interface HookRoot {
  /** The folder given to tfscript check as --root, absolute. */
  root: string;
  /** The tfscript.json whose folder the root is, if one was found. */
  config?: string;
  /**
   * The file is to be checked on its own, with undefined-macro off: no tfscript.json says where
   * its scripts are, and its folder is too big to search for what defines each macro.
   */
  fileOnly?: boolean;
}

/** Whether `file` is `dir` or inside it, by their paths alone. */
export function isInside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !rel.startsWith("../") && !path.isAbsolute(rel));
}

/**
 * Whether `file` is in `dir`: by their paths, or else by where each really is, so a file reached
 * through a junction or a symbolic link into the folder (or a folder that is one) counts.
 */
export function contains(dir: string, file: string, realpath: (p: string) => string): boolean {
  return isInside(file, dir) || isInside(realpath(file), realpath(dir));
}

/**
 * The root to check `file` from. tfscript check searches its whole root for what defines each
 * macro, so the root is kept as narrow as what is known allows:
 *
 * - for a file in the project folder Claude Code gives the hook (CLAUDE_PROJECT_DIR), the folder
 *   of the nearest tfscript.json between the file and the project folder, else the project folder;
 * - for any other file, the folder of the nearest tfscript.json above it; else its own folder, if
 *   that is small; else its own folder with the file checked alone (`fileOnly`).
 */
export function hookRoot(file: string, projectDir: string | undefined, host: RootHost): HookRoot {
  const absolute = path.resolve(file);
  const dir = path.dirname(absolute);
  const project = projectDir !== undefined && projectDir.trim() !== "" ? path.resolve(projectDir) : undefined;
  if (project !== undefined && contains(project, absolute, host.realpath)) {
    // Walk up the path the file was named by when that is in the project, else the real one.
    const [from, stop] = isInside(absolute, project) ? [dir, project] : [path.dirname(host.realpath(absolute)), host.realpath(project)];
    const config = findConfig(from, host.isFile, stop);
    return config !== undefined ? { root: path.dirname(config), config } : { root: project };
  }
  const config = findConfig(dir, host.isFile);
  if (config !== undefined) return { root: path.dirname(config), config };
  return host.isSmallFolder(dir) ? { root: dir } : { root: dir, fileOnly: true };
}
