import * as path from "node:path";

/**
 * The `tfscript.*` settings, as an editor sends them (VS Code: folder-scoped, so each folder
 * of a multi-root workspace has its own; other editors pass the same keys through LSP's
 * workspace/configuration request).
 */
export interface RawSettings {
  /** Files tf loads after stdlib.tf, in order — normally just the tfrc. Relative to the folder. */
  entryFiles?: string[];
  /** TFLIBDIR: tf's library directory, holding stdlib.tf. */
  libraryPath?: string;
  /** TFPATH as tf starts with it. Note a non-empty TFPATH replaces TFLIBDIR as the fallback. */
  tfPath?: string[];
  /** tf's current directory, which relative `/load` paths resolve against. Defaults to the folder. */
  workingDirectory?: string;
  /** What `~` (tf's HOME) means. Defaults to the user's home directory. */
  homeDirectory?: string;
  diagnostics?: {
    /** `/load`/`/require` paths tf wouldn't find. Default on. */
    unresolvedLoads?: boolean;
    /** Calls to names defined nowhere on the load path. Default off. */
    undefinedMacros?: boolean;
  };
  format?: {
    /** Split macro bodies into one `%;`-separated statement per line. Default on. */
    splitStatements?: boolean;
  };
}

export interface ResolvedSettings {
  entryFiles: string[];
  libraryDir?: string;
  tfPath: string[];
  workingDir: string;
  home: string;
}

export interface Environment {
  env: Record<string, string | undefined>;
  homedir: string;
  exists(file: string): boolean;
}

function absolute(p: string, folder: string, home: string): string {
  const expanded = p === "~" || p.startsWith("~/") || p.startsWith("~\\") ? home + p.slice(1) : p;
  return path.resolve(folder, expanded);
}

/**
 * Fills in what's unset the way tf itself would find it: with no entryFiles, a tfrc at the
 * folder root (`.tfrc`, `tfrc`, or `tfrc.tf`), else tf's own `~/.tfrc` then `~/tfrc`
 * (tinyfugue/src/main.c read_configuration()); TFLIBDIR and TFPATH from the environment.
 */
export function resolveSettings(raw: RawSettings, folder: string, environment: Environment): ResolvedSettings {
  const home = raw.homeDirectory ? path.resolve(folder, raw.homeDirectory) : environment.homedir;
  const abs = (p: string) => absolute(p, folder, home);

  let entryFiles = (raw.entryFiles ?? []).filter((f) => f.trim() !== "").map(abs);
  if (entryFiles.length === 0) {
    const candidates = [
      path.join(folder, ".tfrc"),
      path.join(folder, "tfrc"),
      path.join(folder, "tfrc.tf"),
      path.join(home, ".tfrc"),
      path.join(home, "tfrc"),
    ];
    const found = candidates.find((c) => environment.exists(c));
    entryFiles = found ? [found] : [];
  }

  const library = raw.libraryPath?.trim() || environment.env.TFLIBDIR;
  const tfPath =
    raw.tfPath && raw.tfPath.length > 0
      ? raw.tfPath.map(abs)
      : (environment.env.TFPATH ?? "").split(/\s+/).filter(Boolean);

  return {
    entryFiles,
    libraryDir: library ? abs(library) : undefined,
    tfPath,
    workingDir: raw.workingDirectory ? abs(raw.workingDirectory) : folder,
    home,
  };
}
