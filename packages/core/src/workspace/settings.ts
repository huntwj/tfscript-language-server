import * as path from "node:path";

/**
 * The `tfscript.*` settings, as an editor sends them (VS Code: folder-scoped, so each folder
 * of a multi-root workspace has its own; other editors pass the same keys through LSP's
 * workspace/configuration request).
 */
export interface RawSettings {
  /** Files tf loads after stdlib.tf, in order — normally just the tfrc. Relative to the folder. */
  entryFiles?: string[];
  /**
   * Named alternatives to entryFiles: each is one way tf might be started (one tfrc per MUD or
   * character, say), with its own load path. A file reached by several is seen in the active one.
   */
  contexts?: Record<string, string[]>;
  /** Which of `contexts` is active. Defaults to the first. */
  activeContext?: string;
  /** TFLIBDIR: tf's library directory, holding stdlib.tf. */
  libraryPath?: string;
  /** TFPATH as tf starts with it. Note a non-empty TFPATH replaces TFLIBDIR as the fallback. */
  tfPath?: string[];
  /** tf's current directory, which relative `/load` paths resolve against. Defaults to the folder. */
  workingDirectory?: string;
  /** What `~` (tf's HOME) means. Defaults to the user's home directory. */
  homeDirectory?: string;
  /**
   * Where tf's paths are on this machine, for a tf that runs somewhere else (a container, WSL, a
   * remote host): each maps an absolute path as tf sees it (`/wotmud`) to a folder here.
   */
  pathMappings?: { tf: string; local: string }[];
  /**
   * Variables with a value as tf starts, name to value, as if /set after stdlib.tf (in the
   * environment, a tfrc outside the workspace, or a default this check can't evaluate). Values
   * are as tf sees them, so a path goes through `pathMappings`.
   */
  variables?: Record<string, string>;
  diagnostics?: {
    /** `/load`/`/require` paths tf wouldn't find. Default on. */
    unresolvedLoads?: boolean;
    /** Calls to macros defined nowhere tf can see. Default on. */
    undefinedMacros?: boolean;
    /** Macro names the undefined-macro check leaves alone (made while tf runs, say); `*` is a wildcard. */
    ignoreMacros?: string[];
  };
  codeLens?: {
    /** "N references" above each /def. Default on. */
    references?: boolean;
  };
  format?: {
    /** Split macro bodies into one `%;`-separated statement per line. Default on. */
    splitStatements?: boolean;
  };
}

/** One way tf might be started: a name and the files it loads after stdlib.tf, in order. */
export interface LoadContext {
  name: string;
  entryFiles: string[];
}

export interface ResolvedSettings {
  /** The first context's entry files. */
  entryFiles: string[];
  /** At least one: `contexts` from the settings, or a single "default" built from entryFiles. */
  contexts: LoadContext[];
  /** The active context's name, always one of `contexts`. */
  activeContext: string;
  libraryDir?: string;
  tfPath: string[];
  workingDir: string;
  home: string;
  /** Longest `tf` prefix first, `tf` with forward slashes and no trailing one, `local` absolute. */
  pathMappings: PathMapping[];
  /** Variables with a value as tf starts (valid names, string values only). */
  variables: Record<string, string>;
}

export interface PathMapping {
  tf: string;
  local: string;
}

/**
 * The file here that tf's absolute path `p` names, through the first mapping whose `tf` prefix
 * it starts with (a whole path segment), or `p` itself. Either separator is accepted, so a path
 * built with path.join() still maps.
 */
export function toLocalPath(p: string, mappings: readonly PathMapping[]): string {
  // A UNC path (\\server\share) is this machine's, never tf's.
  if (mappings.length === 0 || /^[\\/]{2}/.test(p)) return p;
  // `..` and `//` are resolved first, as tf's open() would: /wotmud/x/../y.tf is /wotmud/y.tf.
  const forward = path.posix.normalize(p.replace(/\\/g, "/"));
  for (const m of mappings) {
    if (forward === m.tf || forward.startsWith(m.tf === "/" ? "/" : `${m.tf}/`)) {
      return path.join(m.local, forward.slice(m.tf === "/" ? 1 : m.tf.length));
    }
  }
  return p;
}

/** tf's absolute path for the file here `p`, through the first mapping whose folder holds it, if any. */
export function toTfPath(p: string, mappings: readonly PathMapping[]): string | undefined {
  for (const m of mappings) {
    const rel = path.relative(m.local, p);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      const tail = rel.replace(/\\/g, "/");
      return tail === "" ? m.tf : `${m.tf === "/" ? "" : m.tf}/${tail}`;
    }
  }
  return undefined;
}

function mappingsOf(raw: RawSettings, folder: string, home: string): PathMapping[] {
  return (raw.pathMappings ?? [])
    .filter((m) => typeof m?.tf === "string" && typeof m?.local === "string" && m.tf.startsWith("/") && m.local.trim() !== "")
    .map((m) => ({ tf: path.posix.normalize(m.tf.replace(/\\/g, "/")).replace(/\/+$/, "") || "/", local: absolute(m.local, folder, home, []) }))
    .sort((a, b) => b.tf.length - a.tf.length);
}

export interface Environment {
  env: Record<string, string | undefined>;
  homedir: string;
  exists(file: string): boolean;
}

/** A setting's path, here: `~` is home, a path under a mapping's `tf` prefix is mapped, the rest is relative to the folder. */
function absolute(p: string, folder: string, home: string, mappings: readonly PathMapping[]): string {
  const expanded = p === "~" || p.startsWith("~/") || p.startsWith("~\\") ? home + p.slice(1) : p;
  return path.resolve(folder, toLocalPath(expanded, mappings));
}

/**
 * Fills in what's unset the way tf itself would find it: with no entryFiles, a tfrc at the
 * folder root (`.tfrc`, `tfrc`, or `tfrc.tf`), else tf's own `~/.tfrc` then `~/tfrc`
 * (tinyfugue/src/main.c read_configuration()); TFLIBDIR and TFPATH from the environment.
 */
export function resolveSettings(raw: RawSettings, folder: string, environment: Environment): ResolvedSettings {
  const userHome = environment.homedir;
  const pathMappings = mappingsOf(raw, folder, userHome);
  const home = raw.homeDirectory ? absolute(raw.homeDirectory, folder, userHome, pathMappings) : userHome;
  const abs = (p: string) => absolute(p, folder, home, pathMappings);

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

  const named = Object.entries(raw.contexts ?? {})
    .map(([name, files]) => ({ name, entryFiles: (Array.isArray(files) ? files : [files]).filter((f): f is string => typeof f === "string").filter((f) => f.trim() !== "").map(abs) }))
    .filter((c) => c.entryFiles.length > 0);
  const contexts = named.length > 0 ? named : [{ name: "default", entryFiles }];
  const active = contexts.find((c) => c.name === raw.activeContext) ?? (contexts[0] as LoadContext);

  return {
    entryFiles: (contexts[0] as LoadContext).entryFiles,
    contexts,
    activeContext: active.name,
    libraryDir: library ? abs(library) : undefined,
    tfPath,
    workingDir: raw.workingDirectory ? abs(raw.workingDirectory) : folder,
    home,
    pathMappings,
    variables: Object.fromEntries(
      Object.entries(raw.variables ?? {}).filter(([name, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && typeof value === "string"),
    ),
  };
}
