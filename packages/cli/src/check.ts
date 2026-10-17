import { readdirSync, realpathSync, statSync } from "node:fs";
import * as path from "node:path";
import type { TfDiagnostic } from "@tfscript/core/diagnostics";
import { asLoaded } from "@tfscript/core/tfBuild";
import { CONFIG_FILE, overlaySettings, readConfig } from "@tfscript/core/workspace/configFile";
import { documentDiagnostics } from "@tfscript/core/workspace/documentDiagnostics";
import { fileKey } from "@tfscript/core/workspace/loadGraph";
import { isSkippedDir, nodeEnvironment, nodeFileSystem } from "@tfscript/core/workspace/nodeFileSystem";
import type { Environment, RawSettings } from "@tfscript/core/workspace/settings";
import { WorkspaceIndex, type FileSystem } from "@tfscript/core/workspace/workspaceIndex";

export interface CheckRequest {
  /** Files and folders to check, absolute or relative to `cwd`. */
  paths: string[];
  /** The workspace folder, as an editor would have it open. Defaults to the folder of `config` if given, else `cwd`. */
  root?: string;
  /**
   * A tfscript.json to read settings from, relative to `cwd`. Without it, the root's own
   * tfscript.json is read, if it has one.
   */
  config?: string;
  /**
   * The tfscript.* settings the options give, for the root folder. They go over the
   * tfscript.json's, and core resolves the result as it does the editor's (resolveSettings()).
   */
  settings: RawSettings;
  cwd: string;
}

export interface CheckedFile {
  /** Absolute, as it was named (through any link). */
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
  /** Where `p` really is, through any links (junctions, symbolic links), or `p` if that can't be told. */
  realpath(p: string): string;
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
  realpath: (p) => {
    try {
      return realpathSync.native(p);
    } catch {
      return p;
    }
  },
});

/**
 * The files `paths` name: a file as it is (whatever its name, so a tfrc counts), a folder's tf
 * scripts as the server's workspace walk finds them (`.tf`, `tfrc` and `.tfrc`, skipping .git,
 * .jj and node_modules, and not following a link to a folder inside it), in name order. Each
 * file once, however it is reached: two names through links for one file are the first.
 */
export function expandPaths(paths: string[], cwd: string, host: CheckHost, problems: string[]): { file: string; real: string }[] {
  const seen = new Set<string>();
  const out: { file: string; real: string }[] = [];
  const add = (file: string): void => {
    const real = host.realpath(file);
    if (seen.has(fileKey(real))) return;
    seen.add(fileKey(real));
    out.push({ file, real });
  };
  for (const given of paths) {
    const p = path.resolve(cwd, given);
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
  const given = request.config === undefined ? undefined : path.resolve(request.cwd, request.config);
  const root = path.resolve(request.cwd, request.root ?? (given === undefined ? "." : path.dirname(given)));
  const rootKind = host.kind(root);
  if (rootKind === "file") {
    return { files: [], problems: [`The root ${request.root ?? root} is a file, not a folder: give --root the folder that holds it.`] };
  }
  if (rootKind !== "dir") {
    return { files: [], problems: [`The root folder ${request.root ?? root} doesn't exist: give --root a folder that does.`] };
  }
  // The settings: a tfscript.json's (named, or the root's own), with the options over them.
  const configFile = given ?? path.join(root, CONFIG_FILE);
  let settings = request.settings;
  if (given !== undefined || host.kind(configFile) === "file") {
    const label = path.relative(request.cwd, configFile) || configFile;
    const givenKind = given === undefined ? "file" : host.kind(given);
    if (givenKind === "dir") {
      return { files: [], problems: [`The settings file ${request.config} is a folder: give --config the tfscript.json file.`] };
    }
    if (givenKind !== "file") {
      return { files: [], problems: [`The settings file ${request.config} doesn't exist: check the path given to --config.`] };
    }
    const loaded = readConfig(configFile, (f) => host.fs.readFile(f), label);
    if (!loaded.config) return { files: [], problems: loaded.problems };
    settings = overlaySettings(loaded.config.settings, request.settings);
  }
  const files = expandPaths(request.paths, request.cwd, host, problems);
  // Whether a file is in the root, and where its loads lead, is worked out from where each really
  // is, so a file named through a link (or a root that is one) is placed as the file itself.
  const realRoot = host.realpath(root);
  const index = new WorkspaceIndex(host.fs, host.environment);
  index.setFolders([realRoot]);
  index.setSettings(realRoot, settings);
  const checked: CheckedFile[] = [];
  for (const { file, real } of files) {
    const text = host.fs.readFile(real);
    if (text === undefined) {
      problems.push(`${path.relative(request.cwd, file) || file} can't be read: check that it is a file you may read.`);
      continue;
    }
    checked.push({ file, text, diagnostics: documentDiagnostics(asLoaded(text, index.tfBuildFor(real)), real, index) });
  }
  return { files: checked, problems };
}
