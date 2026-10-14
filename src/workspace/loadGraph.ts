import * as path from "node:path";
import { entryCommands, shortenPercents, type LoadCommand, type SetCommand } from "../loadCommands";
import type { SubLevel } from "../structure";
import { splitLogicalEntries, type LogicalEntry } from "../logicalEntries";
import { findAbortEntry } from "../rules/bareLineAfterCommand";
import { getDocumentSymbols, type TfSymbol } from "../symbols";
import { SPECIAL_VARIABLE_NAMES } from "../variables";
import { toLocalPath, type PathMapping } from "./settings";

/**
 * Replays tf's startup load order statically: stdlib.tf (tinyfugue/src/main.c's
 * read_configuration() loads TFLIBRARY first), then each entry file in turn, following every
 * top-level `/load` and `/require` at the point it occurs, so files come out in the order tf
 * would read them. Rules, each proven against real tf with tf-script-check on 2026-10-12, not
 * just read from the source:
 *  - How tf reads a `/load` or `/require` command, and which ones run while the file loads (a
 *    top-level command, or one a top-level `/eval` runs): see loadCommands.ts.
 *  - Path resolution (command.c do_file_load(), tfio.c expand_filename()): a leading `~` is the
 *    HOME variable, and such a path is absolute; a relative path is tried against tf's current directory — NOT the loading
 *    file's directory (a file beside the loader was not found) — then, only if that fails,
 *    against each TFPATH directory in order (first hit wins, checked both orders), or against
 *    TFLIBDIR when TFPATH is empty.
 *  - `/require` skips a file whose `/loaded TOKEN` has already run — by token, not filename:
 *    a different file declaring the same token was opened but stopped at its `/loaded`. A plain
 *    `/load` always reads the file again.
 *  - A top-level line is not substituted, so a `%{var}` in a plain `/load` path is taken
 *    literally (and fails); `/eval /load %{dir}/x.tf` substitutes. `/set NAME=value` lines are
 *    tracked so `/eval` paths — and TFPATH/HOME changes made in a tfrc — resolve the way tf
 *    would, as long as the value was set to literal text. One inside an `/if` or `/while` makes
 *    the variable unknown, except the default-value idiom when it can be evaluated (guardRuns()).
 *  - tf may run somewhere else (a container, WSL): its absolute paths go through the settings'
 *    path mappings to find the file here (resolveLoadPath()).
 *  - Reading stops where tf aborts the file (a bare line; see bareLineAfterCommand.ts).
 * Loads inside `/def` (and other macro) bodies run later, if ever, so they are not followed. A
 * load inside a joined top-level `/if` is followed as if its branch were taken.
 *
 * A file reached a second time is not walked again: its later load site is recorded in
 * `sites`, so a future "which context is active" choice has every path to it, but only the
 * first load decides its place in the order.
 */

export type LoadKind = "stdlib" | "entry" | "load" | "require";

export interface LoadSite {
  kind: LoadKind;
  /** The loading file, absent for stdlib.tf and entry files. */
  from?: string;
  line?: number;
}

export interface MacroDef {
  file: string;
  symbol: TfSymbol;
  /** Position in the global load order: lower means tf defined it earlier. */
  seq: number;
}

export interface LoadedFile {
  path: string;
  text: string;
  sites: LoadSite[];
  defs: MacroDef[];
  /** Read while stdlib.tf was loading, so it is loaded no matter which entry file runs. */
  stdlib: boolean;
  /** HOME, TFPATH and TFLIBDIR as they were when tf started reading it. */
  searchEnv: SearchEnvironment;
}

/** tf's search variables at some point on the load path (see LoadPathEnvironment). */
export interface SearchEnvironment {
  home: string;
  tfPath: string[];
  libraryDir?: string;
  local: { home: boolean; tfPath: boolean; libraryDir: boolean };
}

/**
 * Why a load can't be followed: tf won't find the file; a variable in its path (or TFPATH, HOME,
 * TFLIBDIR) has no known value; the same, because a /set inside an /if or /while above may have
 * changed it ("guarded-variable"); a top-level path isn't substituted; or ~user, whose home
 * directory can't be checked.
 */
export type UnresolvedKind = "not-found" | "unknown-variable" | "guarded-variable" | "not-substituted" | "user-home";

export interface UnresolvedLoad {
  from: string;
  /** The entry's first line in `from`. */
  line: number;
  /** Where the filename is written, as offsets into the entry's joined text. */
  start: number;
  end: number;
  kind: UnresolvedKind;
  /** The path as written in the script, before any substitution. */
  raw: string;
  /** The path tf would look up (after substitution, for an `/eval` load). */
  file: string;
  reason: string;
  /** For "not-found": every place tf would have tried, in order. */
  searched: string[];
  /** For "unknown-variable" and "guarded-variable": the variable. */
  variable?: string;
}

/** A top-level `/load` or `/require` the walk followed, and the file tf would read for it. */
export interface ResolvedLoad {
  from: string;
  /** The entry's first line in `from`. */
  line: number;
  /** Where the filename starts in the entry's joined text: with `line`, the load's identity. */
  offset: number;
  /** The path as written in the script, before any substitution. */
  raw: string;
  file: string;
  kind: "load" | "require";
}

export interface LoadGraph {
  /** Every file read, in first-load order. */
  files: LoadedFile[];
  unresolved: UnresolvedLoad[];
  resolved: ResolvedLoad[];
}

export interface LoadGraphOptions {
  entryFiles: string[];
  /** TFLIBDIR: where stdlib.tf (and the rest of tf's library) lives. */
  libraryDir?: string;
  /** The initial TFPATH directories. */
  tfPath?: string[];
  /** tf's current directory, which relative `/load` paths resolve against. */
  workingDir: string;
  /** The initial HOME variable, for `~`. */
  home?: string;
  /** Where tf's absolute paths are here (settings.ts). */
  pathMappings?: readonly PathMapping[];
  readFile(file: string): string | undefined;
}

const LOADED_RE = /^\s*\/loaded\s+(\S+)/i;

/** A path that can only be tf's, on another machine: on Windows, rooted with no drive (`\wotmud\x.tf`), and not UNC. */
export function isForeignPath(p: string): boolean {
  return process.platform === "win32" && /^[\\/](?![\\/])/.test(p);
}

const NAME = "[A-Za-z_][A-Za-z0-9_]*";
/**
 * A whole entry that is one `/if (<unset test of x>) <one statement>%; /endif`: `!x`, `!{x}`,
 * `x =~ ""`, `{x} =~ ""`, `x == ""` or `{x} == ""` (either quote). Groups: the name (2-5),
 * the operator (6), the statement (7).
 */
const GUARD_RE = new RegExp(
  `^\\s*/if\\s*\\(\\s*(?:(!)\\s*(?:\\{(${NAME})\\}|(${NAME}))|(?:\\{(${NAME})\\}|(${NAME}))\\s*(=~|==)\\s*(?:""|''))\\s*\\)\\s*(/\\S[\\s\\S]*?)\\s*%;\\s*/endif\\s*$`,
  "i",
);

/** A path's identity for comparisons: resolved, and case-folded where the filesystem is. */
export function fileKey(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

type Expanded = { ok: true; value: string } | { ok: false; reason: string; variable: string };

/** One substitution pass over `text`, as `/eval` does for the forms a load path uses. */
export function expandVariables(text: string, vars: Map<string, string>): Expanded {
  let missing: string | undefined;
  const value = text.replace(
    /%(%+)|%\{([^}-]+)(?:-([^}]*))?\}|%([A-Za-z_][A-Za-z0-9_]*)/g,
    (_whole, percents?: string, braced?: string, fallback?: string, bare?: string) => {
      // expand.c percentsub(): a run of `%`s loses one, and nothing after it is substituted.
      if (percents !== undefined) return percents;
      const name = (braced ?? bare) as string;
      const v = vars.get(name);
      if (v !== undefined && v !== "") return v;
      if (fallback !== undefined) return fallback;
      missing ??= name;
      return "";
    },
  );
  return missing
    ? { ok: false, reason: `%{${missing}} is not set to literal text on this load path`, variable: missing }
    : { ok: true, value };
}

export interface LoadPathEnvironment {
  /** The HOME variable, for `~`. */
  home: string;
  /** The TFPATH variable's directories. */
  tfPath: string[];
  /** The TFLIBDIR variable, searched when TFPATH is empty. */
  libraryDir?: string;
  /** tf's current directory. */
  workingDir: string;
  /** Where tf's absolute paths are here, for a tf that runs somewhere else (settings.ts). */
  pathMappings?: readonly PathMapping[];
  /**
   * Which of `home`, `tfPath` and `libraryDir` already name folders here (they came from the
   * settings, not from a script's /set), so they aren't mapped again.
   */
  local?: { home?: boolean; tfPath?: boolean; libraryDir?: boolean };
  readFile(file: string): string | undefined;
}

/**
 * Where tf finds the file `/load file` names (rules in the header comment), and every place it
 * tries, as files here: an absolute path tf would open (the file's, a TFPATH or TFLIBDIR entry,
 * HOME) goes through the path mappings first, unless it came from the settings.
 */
export function resolveLoadPath(file: string, env: LoadPathEnvironment): { found?: string; searched: string[] } {
  const mappings = env.pathMappings ?? [];
  // A directory joined with a relative path; a directory tf named is mapped first.
  const under = (dir: string, rel: string, local: boolean | undefined): string =>
    local ? path.join(dir, rel) : path.normalize(toLocalPath(`${dir}/${rel}`, mappings));
  // tf counts any path starting with ~ as absolute (tfio.h is_absolute_path()), so it never
  // searches TFPATH for one. `~user/...` is user's home directory from the password file, which
  // this can't read; when there is no such user, expand_filename() leaves the name as it is and
  // it opens relative to the current directory (proven: after /cd /script, /load
  // ~nosuchuser/n.tf read /script/~nosuchuser/n.tf). Only that second case can be checked.
  // This follows tf's own expand_filename() (tfio.c), which does what POSIX shells and bash do
  // with an unknown user (the tilde-prefix stays literal; zsh reports an error instead). Recheck
  // it if tf's ~ handling changes.
  if (file.startsWith("~")) {
    const underHome = file === "~" || file.startsWith("~/");
    const named = underHome ? env.home + file.slice(1) : file;
    const mapped = underHome && env.local?.home ? named : toLocalPath(named, mappings);
    const target = mapped === named ? path.resolve(env.workingDir, named) : path.normalize(mapped);
    return { found: env.readFile(target) !== undefined ? target : undefined, searched: [target] };
  }
  const target = file;
  const candidates: string[] = [];
  if (path.isAbsolute(target)) {
    candidates.push(path.normalize(toLocalPath(target, mappings)));
  } else {
    candidates.push(path.join(env.workingDir, target));
    if (env.tfPath.length > 0) {
      for (const dir of env.tfPath) if (path.isAbsolute(dir)) candidates.push(under(dir, target, env.local?.tfPath));
    } else if (env.libraryDir && path.isAbsolute(env.libraryDir)) {
      candidates.push(under(env.libraryDir, target, env.local?.libraryDir));
    }
  }
  return { found: candidates.find((c) => env.readFile(c) !== undefined), searched: candidates };
}

export function buildLoadGraph(options: LoadGraphOptions): LoadGraph {
  const vars = new Map<string, string>([
    ["TFLIBDIR", options.libraryDir ?? ""],
    ["TFPATH", (options.tfPath ?? []).join(" ")],
    ["HOME", options.home ?? ""],
  ]);
  /** Search variables (TFPATH, TFLIBDIR, HOME) whose value isn't known here; any other variable is just left out of `vars`. */
  const unknown = new Set<string>();
  /** Variables whose value is unknown because a /set inside an /if or /while may have changed it. */
  const guarded = new Set<string>();
  /** Every variable some /set on the path has set, or tried to: a default-value guard can't call them unset. */
  const everSet = new Set<string>(vars.keys());
  /** The search variables still holding the settings' folders here, which aren't mapped again. */
  const local = new Set(vars.keys());
  /**
   * The first thing on the path that may have set variables this can't see (an OpaqueCommand, a
   * top-level /for, an assignment in a condition, a load it can't follow), after which a
   * default-value guard is no longer trusted.
   */
  let opaque: string | undefined;

  function searchEnv(): SearchEnvironment {
    const libraryDir = vars.get("TFLIBDIR") || undefined;
    return {
      home: vars.get("HOME") ?? "",
      tfPath: (vars.get("TFPATH") ?? "").split(/\s+/).filter(Boolean),
      ...(libraryDir === undefined ? {} : { libraryDir }),
      local: { home: local.has("HOME"), tfPath: local.has("TFPATH"), libraryDir: local.has("TFLIBDIR") },
    };
  }

  /**
   * Whether the /if around `command` runs it, when the whole entry is the default-value idiom
   * `/if (x =~ "") /set x=VALUE%; /endif`, or undefined when that can't be known. Proven in real
   * tf (tf-script-check, 2026-10-14): for an unset variable, `x =~ ""`, `x == ""`, `!x` and the
   * `{x}` forms are all true; for a set one, only `x =~ ""` is exact (true just for an empty
   * value), since `==` and `!` compare numbers and are true for `0` and `abc` too. A variable is
   * taken as unset when nothing on the path has set it, it isn't one of tf's special variables
   * (`wrapspace` has a default), and its name has a lower-case letter: tf makes every environment
   * variable a global (HOME, PATH and TERM were set at startup), and those are upper case by
   * convention.
   */
  function guardRuns(entry: LogicalEntry, command: SetCommand): boolean | undefined {
    // Real tf: after /setup (which /sets it), /test x := "real", /eval /set x%{nothing}=..., or a
    // load from a path this can't follow, the variable was set and the guard skipped.
    if (opaque !== undefined) return undefined;
    const m = GUARD_RE.exec(entry.text);
    if (!m) return undefined;
    const name = (m[2] ?? m[3] ?? m[4] ?? m[5]) as string;
    const body = m[7] as string;
    if (name !== command.name || /%[;|\\]/.test(body) || !new RegExp(`^/@?set(?:env)?\\s+${name}(?:=|\\s)`, "i").test(body)) return undefined;
    const exact = m[6] === "=~";
    if (vars.has(name)) {
      const value = vars.get(name) as string;
      if (value === "") return true;
      return exact ? false : undefined;
    }
    if (unknown.has(name) || everSet.has(name) || SPECIAL_VARIABLE_NAMES.has(name) || !/[a-z]/.test(name)) return undefined;
    return true;
  }
  const files = new Map<string, LoadedFile>();
  const tokens = new Set<string>();
  const unresolved: UnresolvedLoad[] = [];
  const resolved: ResolvedLoad[] = [];
  let seq = 0;
  let inStdlib = false;

  function resolve(file: string): { found?: string; searched: string[]; unknownVar?: string } {
    const env = searchEnv();
    const tfPath = env.tfPath;
    const result = resolveLoadPath(file, {
      ...env,
      workingDir: options.workingDir,
      ...(options.pathMappings ? { pathMappings: options.pathMappings } : {}),
      readFile: options.readFile,
    });
    // Only the current directory is tried without a search variable; past it, an unknown one
    // makes the answer unknown too.
    if (result.found !== undefined && result.found === result.searched[0] && !/^~(?:\/|$)/.test(file)) return result;
    const needs = /^~(?:\/|$)/.test(file) ? ["HOME"] : file.startsWith("~") || path.isAbsolute(file) ? [] : ["TFPATH", ...(tfPath.length > 0 ? [] : ["TFLIBDIR"])];
    const unknownVar = needs.find((v) => unknown.has(v));
    return unknownVar ? { searched: result.searched, unknownVar } : result;
  }

  /** What `text` becomes after the `pending` passes, with the variables known so far. */
  function valueAfter(text: string, pending: SubLevel[]): Expanded {
    let value = text;
    for (const level of pending) {
      if (level === "newline") value = shortenPercents(value);
      if (level !== "full") continue;
      const expanded = expandVariables(value, vars);
      if (!expanded.ok) return expanded;
      value = expanded.value;
    }
    return { ok: true, value };
  }

  /** The unresolved kind and reason for a variable with no known value. */
  function unknownValue(variable: string, reason: string): { kind: UnresolvedKind; reason: string } {
    return guarded.has(variable)
      ? { kind: "guarded-variable", reason: `%{${variable}} is set inside an /if or /while on the load path` }
      : { kind: "unknown-variable", reason };
  }

  function handleLoad(entry: LogicalEntry, load: LoadCommand, from: string): void {
    const line = entry.startLine;
    const raw = entry.text.slice(load.start, load.end);
    let file = load.file;
    const fail = (k: UnresolvedKind, reason: string, searched: string[] = [], variable?: string): void => {
      unresolved.push({ from, line, start: load.start, end: load.end, kind: k, raw, file, reason, searched, ...(variable ? { variable } : {}) });
      // Any load this can't follow may set anything. One tf won't find here only loads nothing if
      // every place it looked is a folder here: a tf path no mapping covers may exist where tf
      // runs (proven: /eval /load %{d}/conf.tf, with d a path only tf's container had, set the
      // variable and the guard after it skipped). On Windows such a path is rooted but has no
      // drive; elsewhere it can't be told from a local one.
      if (k !== "not-found" || searched.some(isForeignPath)) opaque ??= `the load of ${raw}`;
    };
    // A `%` in a run of them is text, not the start of a substitution.
    const namesVariable = /%\{|%[A-Za-z_]/.test(raw.replace(/%%+/g, ""));
    if (load.plain && namesVariable) {
      return fail("not-substituted", "a top-level path is not substituted; prefix the line with /eval");
    }
    const value = valueAfter(file, load.pending);
    if (!value.ok) {
      const why = unknownValue(value.variable, value.reason);
      return fail(why.kind, why.reason, [], value.variable);
    }
    file = value.value;
    // stdlib.tf's /require passes its words on to /load with single blanks; /load trims.
    file = load.kind === "require" ? file.trim().split(/[ \t\r\f\v]+/).join(" ") : file.trim();
    if (!file) return;
    const { found, searched, unknownVar } = resolve(file);
    if (unknownVar) {
      const why = unknownValue(unknownVar, `%{${unknownVar}} is not set to literal text on this load path`);
      return fail(why.kind, why.reason, searched, unknownVar);
    }
    if (!found) {
      // ~ and ~/... are under HOME; with no HOME known here, the path looked at means nothing.
      if (/^~(?:\/|$)/.test(file) && !vars.get("HOME")) return fail("unknown-variable", "HOME isn't known on this load path", [], "HOME");
      // Without a substitution pass %{x} is literal text: a name tf really looks for, but most likely a mistake.
      if (namesVariable && !load.pending.includes("full")) return fail("not-substituted", "this path is not substituted here; prefix the command with /eval", searched);
      const user = /^~([^/]+)/.exec(file)?.[1];
      if (user) return fail("user-home", `~${user} is user ${user}'s home directory, unless there is no such user`, searched);
      return fail("not-found", "file not found", searched);
    }
    resolved.push({ from, line, offset: load.start, raw, file: path.resolve(found), kind: load.kind });
    walk(found, { kind: load.kind, from, line });
  }

  function walk(file: string, site: LoadSite): void {
    const key = fileKey(file);
    const existing = files.get(key);
    if (existing) {
      existing.sites.push(site);
      return;
    }
    const text = options.readFile(file);
    if (text === undefined) return;

    const loaded: LoadedFile = { path: path.resolve(file), text, sites: [site], defs: [], stdlib: inStdlib, searchEnv: searchEnv() };
    files.set(key, loaded);

    const entries = splitLogicalEntries(text);
    const abort = findAbortEntry(entries);
    const usable: LogicalEntry[] = (abort ? entries.slice(0, abort.entryIndex) : entries).filter((e) => !e.incomplete);
    const defsByLine = new Map<number, TfSymbol>();
    for (const s of getDocumentSymbols(text)) if (s.kind === "def") defsByLine.set(s.range.start.line, s);

    for (const entry of usable) {
      if (entry.isDefBody || entry.isOtherMacroBody) {
        const symbol = defsByLine.get(entry.startLine);
        if (symbol) loaded.defs.push({ file: loaded.path, symbol, seq: seq++ });
        continue;
      }
      const token = LOADED_RE.exec(entry.text)?.[1];
      if (token !== undefined) {
        if (tokens.has(token) && site.kind === "require") break;
        tokens.add(token);
        continue;
      }
      if (entry.isForLoop) {
        opaque ??= "a /for";
        continue;
      }
      for (const command of entryCommands(entry)) {
        if (!command.topLevel) continue;
        if (command.kind === "opaque") {
          opaque ??= command.what;
          continue;
        }
        if (command.kind !== "set") {
          handleLoad(entry, command, loaded.path);
          continue;
        }
        if (command.name === "TFPATH" || command.name === "TFLIBDIR" || command.name === "HOME") local.delete(command.name);
        const value = valueAfter(command.value, command.pending);
        const runs = command.conditional ? guardRuns(entry, command) : true;
        everSet.add(command.name);
        if (runs === false) continue; // the guard is known to skip it: nothing changes
        if (value.ok && runs === true) {
          vars.set(command.name, value.value);
          unknown.delete(command.name);
          guarded.delete(command.name);
        } else if (!value.ok || vars.get(command.name) !== value.value) {
          // A /set inside an /if or /while may or may not run: unless it sets the value the
          // variable already has, its value is no longer known.
          vars.delete(command.name);
          unknown.add(command.name);
          if (command.conditional) guarded.add(command.name);
          else guarded.delete(command.name);
        }
      }
    }

  }

  if (options.libraryDir) {
    const stdlib = path.join(options.libraryDir, "stdlib.tf");
    if (options.readFile(stdlib) !== undefined) {
      inStdlib = true;
      walk(stdlib, { kind: "stdlib" });
      inStdlib = false;
    }
  }
  for (const entry of options.entryFiles) walk(entry, { kind: "entry" });

  return { files: [...files.values()], unresolved, resolved };
}
