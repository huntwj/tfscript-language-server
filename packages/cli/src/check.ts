import { readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import type { TfDiagnostic } from "@tfscript/core/diagnostics";
import { documentDiagnostics } from "@tfscript/core/workspace/documentDiagnostics";
import { fileKey } from "@tfscript/core/workspace/loadGraph";
import { isSkippedDir, nodeEnvironment, nodeFileSystem } from "@tfscript/core/workspace/nodeFileSystem";
import type { Environment, RawSettings } from "@tfscript/core/workspace/settings";
import { WorkspaceIndex, type FileSystem } from "@tfscript/core/workspace/workspaceIndex";

export interface CheckRequest {
  /** Files and folders to check, absolute or relative to `cwd`. */
  paths: string[];
  /** The workspace folder, as an editor would have it open. Defaults to `cwd`. */
  root?: string;
  /**
   * The tfscript.* settings for the root folder. Core resolves them as it does the editor's
   * (resolveSettings()); a settings file would be read into these too, under the options.
   */
  settings: RawSettings;
  cwd: string;
}

export interface CheckedFile {
  /** Absolute. */
  file: string;
  text: string;
  diagnostics: TfDiagnostic[];
}

export interface CheckResult {
  files: CheckedFile[];
  /** Paths that couldn't be checked: each a sentence saying why and what to do. */
  problems: string[];
}

export interface CheckHost {
  fs: FileSystem;
  environment: Environment;
  /** Whether `p` is a folder, a file, or neither. */
  kind(p: string): "dir" | "file" | undefined;
  /**
   * Whether the folder `dir`, or one under it the walk enters, holds a link to a folder (a
   * junction or a symbolic link), which the walk doesn't follow.
   */
  linksFolders(dir: string): boolean;
}

function linksFolders(dir: string): boolean {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((e) => {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      try {
        return statSync(full).isDirectory();
      } catch {
        return false;
      }
    }
    return e.isDirectory() && !isSkippedDir(e.name) && linksFolders(full);
  });
}

export const nodeHost = (): CheckHost => ({
  fs: nodeFileSystem,
  environment: nodeEnvironment(),
  kind: (p) => {
    try {
      const s = statSync(p);
      return s.isDirectory() ? "dir" : s.isFile() ? "file" : undefined;
    } catch {
      return undefined;
    }
  },
  linksFolders,
});

/**
 * The files `paths` name: a file as it is (whatever its name, so a tfrc counts), a folder's tf
 * scripts as the server's workspace walk finds them (`.tf`, `tfrc` and `.tfrc`, skipping .git,
 * .jj and node_modules, and not following a link to a folder inside it), in name order. Each
 * file once.
 */
function expand(request: CheckRequest, host: CheckHost, problems: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (f: string): void => {
    if (seen.has(fileKey(f))) return;
    seen.add(fileKey(f));
    out.push(f);
  };
  for (const given of request.paths) {
    const p = path.resolve(request.cwd, given);
    const kind = host.kind(p);
    if (kind === "file") add(p);
    else if (kind === "dir") {
      const found = host.fs.walkTfFiles(p).map((f) => path.resolve(f)).sort();
      if (found.length === 0) {
        problems.push(
          host.linksFolders(p)
            ? `${given} has no tf scripts in it, only links to folders (junctions or symbolic links), which a folder's search doesn't follow: name the linked folders themselves.`
            : `${given} has no tf scripts in it (.tf files, tfrc or .tfrc): name a folder that holds some, or the files themselves.`,
        );
      }
      found.forEach(add);
    } else problems.push(`${given} doesn't exist: check the path.`);
  }
  return out;
}

/**
 * Each file's diagnostics, as the language server publishes them for a file open in a workspace
 * whose one folder is the root (core's documentDiagnostics()): the file's own, then its load-path
 * ones. A file outside the root is seen as the server sees it, in a folder of its own with the
 * default settings.
 */
export function check(request: CheckRequest, host: CheckHost = nodeHost()): CheckResult {
  const problems: string[] = [];
  const root = path.resolve(request.cwd, request.root ?? ".");
  if (host.kind(root) !== "dir") {
    return { files: [], problems: [`The root folder ${request.root ?? root} doesn't exist: give --root a folder that does.`] };
  }
  const files = expand(request, host, problems);
  const index = new WorkspaceIndex(host.fs, host.environment);
  index.setFolders([root]);
  index.setSettings(root, request.settings);
  const checked: CheckedFile[] = [];
  for (const file of files) {
    const text = host.fs.readFile(file);
    if (text === undefined) {
      problems.push(`${path.relative(request.cwd, file) || file} can't be read: check that it is a file you may read.`);
      continue;
    }
    checked.push({ file, text, diagnostics: documentDiagnostics(text, file, index) });
  }
  return { files: checked, problems };
}
