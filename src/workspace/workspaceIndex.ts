import * as path from "node:path";
import { splitLogicalEntries, splitRawLines } from "../logicalEntries";
import { entryLoads, literalText } from "../loadCommands";
import type { ContextFile, ExternalMacro, NavContext } from "../navigation";
import { getDocumentSymbols, type TfSymbol } from "../symbols";
import { findLoadPaths, type LoadPath } from "../documentLinks";
import type { Range } from "../symbols";
import { buildLoadGraph, fileKey as keyOf, resolveLoadPath, type LoadGraph, type LoadedFile, type LoadPathEnvironment, type SearchEnvironment } from "./loadGraph";
import { resolveSettings, toLocalPath, toTfPath, type Environment, type RawSettings, type ResolvedSettings } from "./settings";
import { parseTfHelp, type HelpEntry } from "./tfHelp";
import {
  loadPathDiagnostics,
  macroNames,
  unfollowedOnPath,
  type DefinedElsewhere,
  type MacroContext,
  type MacroNames,
  type UnfollowedLoad,
} from "./loadPathDiagnostics";
import type { TfDiagnostic } from "../diagnostics";

export interface FileSystem {
  readFile(file: string): string | undefined;
  /** `.tf` files directly inside `dir` (absolute paths), or none if it can't be read. */
  listTfFiles(dir: string): string[];
  /** Every tf script under `dir`, recursively: `.tf` files plus `tfrc`/`.tfrc`; at most `limit` of them, stopping there. */
  walkTfFiles(dir: string, limit?: number): string[];
  /**
   * When `file` last changed, or undefined if it can't be told. Cached text of a file no watcher
   * covers is only trusted while this stays the same.
   */
  mtime?(file: string): number | undefined;
}

export interface ContextInfo {
  folder: string;
  /** The active context, from the settings. */
  active: string;
  /** The context the file is actually seen in. */
  used: string;
  contexts: { name: string; entryFiles: string[]; loadsFile: boolean; chain: string[] }[];
}

interface LibraryFile {
  path: string;
  text: string;
  defs: TfSymbol[];
}

/** At most this many files of a workspace folder are read for the undefined-macro check. */
export const MAX_WALKED_FILES = 5000;
/** How long a listing of a folder no watcher covers is trusted, in milliseconds. */
const UNWATCHED_WALK_MS = 10_000;
/** At most how often the modification times of cached files nothing watches are checked, in milliseconds. */
const UNWATCHED_CHECK_MS = 1000;
/** The listing of a folder that isn't a workspace folder, which is never walked. */
const NOT_WALKED = { files: [] as string[], truncated: false };

function isInside(file: string, dir: string): boolean {
  const rel = path.relative(keyOf(dir), keyOf(file));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Per workspace folder: the settings, the load graph built from them, and the tf library's
 * files. Open documents' unsaved text overrides what's on disk. Everything is rebuilt lazily —
 * an edit or a file change only marks the graphs stale; the next request rebuilds them.
 */
export class WorkspaceIndex {
  private folders: string[] = [];
  private raw = new Map<string, RawSettings>();
  private overlay = new Map<string, string>();
  private resolved = new Map<string, ResolvedSettings>();
  /** Keyed by folder and context name. */
  private graphs = new Map<string, { settings: ResolvedSettings; graph: LoadGraph }>();
  private libraries = new Map<string, { files: string[]; at: number }>();
  private helps = new Map<string, ReadonlyMap<string, HelpEntry> | undefined>();

  constructor(
    private readonly fs: FileSystem,
    private readonly environment: Environment,
  ) {}

  setFolders(folders: string[]): void {
    this.folders = folders.map((f) => path.resolve(f));
    this.invalidate();
  }

  setSettings(folder: string, raw: RawSettings): void {
    this.raw.set(keyOf(folder), raw);
    this.invalidate();
    this.resolvable.clear();
    this.libraries.clear();
    this.helps.clear();
  }

  /**
   * An open document's text (undefined once it is closed). Its disk text is read again after
   * it closes, and whether loads resolve is worked out again: the file may be one they find.
   */
  setOverlay(file: string, text: string | undefined): void {
    if (text === undefined) this.overlay.delete(keyOf(file));
    else this.overlay.set(keyOf(file), text);
    this.disk.delete(keyOf(file));
    this.resolvable.clear();
    this.invalidate();
  }

  /**
   * The folders a file watcher reports changes in (workspace folders, and whatever else the
   * client agreed to watch). Text read from disk under them is kept until filesChanged(); text
   * read anywhere else is checked against the file's modification time first.
   */
  setWatchedRoots(roots: string[]): void {
    this.watchedRoots = roots.map((r) => path.resolve(r));
  }

  private watchedRoots: string[] = [];

  private isWatched(file: string): boolean {
    return this.watchedRoots.some((r) => keyOf(r) === keyOf(file) || isInside(file, r));
  }

  invalidate(): void {
    this.graphs.clear();
    // A tfrc appearing or disappearing changes which entry file the default context finds.
    this.resolved.clear();
  }

  /** Files read from disk, until a watched file changes (filesChanged()) or, unwatched, until their modification time does. */
  private disk = new Map<string, { file: string; text: string | undefined; mtime: number | undefined }>();

  private read = (file: string): string | undefined => {
    const key = keyOf(file);
    const open = this.overlay.get(key);
    if (open !== undefined) return open;
    const cached = this.disk.get(key);
    if (cached) return cached.text;
    const mtime = this.fs.mtime?.(file);
    const text = this.fs.readFile(file);
    this.disk.set(key, { file, text, mtime });
    return text;
  };

  /**
   * Forgets the disk text of every file no watcher covers whose modification time has changed
   * (or that appeared or went away), and the graphs built from it. Run before a graph is used.
   */
  private refreshUnwatched(): void {
    if (!this.fs.mtime) return;
    const since = Date.now() - this.lastRefresh;
    if (since < UNWATCHED_CHECK_MS) {
      // Skipped: a file written just now would stay stale until something asks again, so ask for
      // one check once the second is up (once, however many requests are skipped meanwhile).
      if (!this.recheckPending && [...this.disk.values()].some((e) => !this.isWatched(e.file))) {
        this.recheckPending = true;
        this.recheck?.(UNWATCHED_CHECK_MS - since);
      }
      return;
    }
    this.lastRefresh = Date.now();
    this.recheckPending = false;
    let changed = false;
    for (const [key, entry] of this.disk) {
      if (this.isWatched(entry.file) || this.fs.mtime(entry.file) === entry.mtime) continue;
      this.disk.delete(key);
      changed = true;
    }
    if (changed) {
      this.resolvable.clear();
      this.invalidate();
    }
  }

  private recheckPending = false;
  private recheck: ((delayMs: number) => void) | undefined;

  /**
   * How to ask for the open documents to be checked again in `delayMs`: called when a check of
   * unwatched files' modification times was skipped for being too soon after the last.
   */
  setRecheck(recheck: (delayMs: number) => void): void {
    this.recheck = recheck;
  }

  /**
   * Every macro-defining entry (`/def`, `/alias`, `/bind`, `/hook`, `/trig*`) in every tf
   * script under the workspace folders — reached by a load path or not — whose name contains
   * the query's characters in order, ignoring case (the editor ranks them further).
   */
  private lastRefresh = -Infinity;

  workspaceSymbols(query: string): { file: string; folder: string; symbol: TfSymbol }[] {
    this.refreshUnwatched();
    const q = query.toLowerCase();
    const matches = (name: string): boolean => {
      let i = 0;
      for (const ch of name.toLowerCase()) if (ch === q[i]) i += 1;
      return i === q.length;
    };
    const seen = new Set<string>();
    const results: { file: string; folder: string; symbol: TfSymbol }[] = [];
    for (const folder of this.folders) {
      for (const file of this.fs.walkTfFiles(folder)) {
        if (seen.has(keyOf(file))) continue;
        seen.add(keyOf(file));
        const text = this.read(file);
        if (text === undefined) continue;
        for (const symbol of getDocumentSymbols(text)) {
          if (matches(symbol.name)) results.push({ file: path.resolve(file), folder, symbol });
        }
      }
    }
    return results;
  }

  folderFor(file: string): string {
    const inside = this.folders.filter((f) => isInside(file, f));
    return inside.sort((a, b) => b.length - a.length)[0] ?? path.dirname(path.resolve(file));
  }

  settingsFor(folder: string): ResolvedSettings {
    const key = keyOf(folder);
    let settings = this.resolved.get(key);
    if (!settings) {
      settings = resolveSettings(this.raw.get(key) ?? {}, folder, this.environment);
      this.resolved.set(key, settings);
    }
    return settings;
  }

  /** The load graph of one context in `folder` (the active one if unnamed). */
  graphFor(folder: string, contextName?: string): { settings: ResolvedSettings; graph: LoadGraph } {
    const settings = this.settingsFor(folder);
    const context = settings.contexts.find((c) => c.name === (contextName ?? settings.activeContext)) ?? settings.contexts[0];
    const key = `${keyOf(folder)}\0${context?.name ?? ""}`;
    const cached = this.graphs.get(key);
    if (cached) return cached;
    const graph = buildLoadGraph({
      entryFiles: context?.entryFiles ?? [],
      libraryDir: settings.libraryDir,
      tfPath: settings.tfPath,
      workingDir: settings.workingDir,
      home: settings.home,
      pathMappings: settings.pathMappings,
      variables: settings.variables,
      readFile: this.read,
    });
    const built = { settings, graph };
    this.graphs.set(key, built);
    return built;
  }

  /**
   * tf's library files: listed once (until a watched file changes), read like any other file, so
   * an open library file's unsaved text counts and a changed one is read again.
   */
  private library(dir: string): LibraryFile[] {
    return this.libraryListing(dir).files.flatMap((file) => {
      const text = this.read(file);
      return text === undefined ? [] : [{ path: file, text, defs: this.librarySymbols(file, text) }];
    });
  }

  /** The library's files, kept until a watched file changes, or for a few seconds when no watcher covers it. */
  private libraryListing(dir: string): { files: string[]; at: number } {
    const key = keyOf(dir);
    let listed = this.libraries.get(key);
    if (!listed || (!this.isWatched(dir) && Date.now() - listed.at >= UNWATCHED_WALK_MS)) {
      listed = { files: this.fs.listTfFiles(dir).map((f) => path.resolve(f)), at: Date.now() };
      this.libraries.set(key, listed);
    }
    return listed;
  }

  private librarySymbolCache = new Map<string, { text: string; defs: TfSymbol[] }>();

  private librarySymbols(file: string, text: string): TfSymbol[] {
    const cached = this.librarySymbolCache.get(keyOf(file));
    if (cached && cached.text === text) return cached.defs;
    const defs = getDocumentSymbols(text).filter((s) => s.kind === "def");
    this.librarySymbolCache.set(keyOf(file), { text, defs });
    return defs;
  }

  /**
   * The context `file` is seen in: the active one if its load path reaches the file, else the
   * first context that does (tf can only have read the file that way), else the active one.
   */
  contextFor(file: string): { folder: string; name: string; graph: LoadGraph; settings: ResolvedSettings } {
    this.refreshUnwatched();
    const folder = this.folderFor(file);
    const settings = this.settingsFor(folder);
    const self = keyOf(file);
    const reaches = (name: string): boolean => this.graphFor(folder, name).graph.files.some((f) => keyOf(f.path) === self);
    const name = [settings.activeContext, ...settings.contexts.map((c) => c.name)].find(reaches) ?? settings.activeContext;
    return { folder, name, settings, graph: this.graphFor(folder, name).graph };
  }

  /**
   * Every context of `file`'s folder: whether it loads the file, through which chain of loads
   * (entry file first, the file itself last), and which context the file is seen in.
   */
  contextInfo(file: string): ContextInfo {
    const { folder, name, settings } = this.contextFor(file);
    const contexts = settings.contexts.map((c) => {
      const byKey = new Map(this.graphFor(folder, c.name).graph.files.map((f) => [keyOf(f.path), f]));
      const chain: string[] = [];
      const seen = new Set<string>();
      let at = byKey.get(keyOf(file));
      while (at && !seen.has(keyOf(at.path))) {
        seen.add(keyOf(at.path));
        chain.unshift(this.label(at.path, folder, settings.libraryDir));
        const from = at.sites[0]?.from;
        at = from === undefined ? undefined : byKey.get(keyOf(from));
      }
      const entryFiles = c.entryFiles.map((e) => this.label(e, folder, settings.libraryDir));
      return { name: c.name, entryFiles, loadsFile: chain.length > 0, chain };
    });
    return { folder, active: settings.activeContext, used: name, contexts };
  }

  /** How to name a file to the user: a library file by its name, a workspace file relative to the folder. */
  private label(f: string, folder: string, lib: string | undefined): string {
    if (lib && isInside(f, lib)) return path.basename(f);
    const rel = path.relative(folder, f);
    return rel.startsWith("..") || path.isAbsolute(rel) ? f : rel.replace(/\\/g, "/");
  }

  /** unresolved-load and (if enabled) undefined-macro diagnostics for `file`, from its context's graph. */
  loadPathDiagnostics(file: string, text: string): TfDiagnostic[] {
    const { folder, graph, settings } = this.contextFor(file);
    const options = this.raw.get(keyOf(folder))?.diagnostics;
    // tf's own library calls hook points a user may define (kbbind.tf: key_meta_f1 = /key_esc_f1).
    // A library file opened on its own is in a folder of its own, so ask every folder's settings.
    const library = [settings, ...this.folders.map((f) => this.settingsFor(f))].some((s) => s.libraryDir !== undefined && isInside(file, s.libraryDir));
    const undefinedMacros = (options?.undefinedMacros ?? true) && !library;
    return loadPathDiagnostics(
      file,
      text,
      graph,
      { unresolvedLoads: options?.unresolvedLoads ?? true, undefinedMacros, ignoreMacros: options?.ignoreMacros ?? [] },
      undefinedMacros ? this.macroContext(file, folder, graph, settings) : {},
    );
  }

  /**
   * Whether a macro name (lower case) is already defined where `file` runs: in it, on its load
   * path, anywhere else in its workspace folder, or in tf's library. For naming a new macro, so it
   * doesn't redefine one: as generous as the undefined-macro check, a name built when a /def runs
   * (`/def ~body_%1`) takes every name it could make.
   */
  macroNameTaken(file: string, text: string): (name: string) => boolean {
    const { folder, graph, settings } = this.contextFor(file);
    const sets: MacroNames[] = [this.macroNamesOf(file, text), ...graph.files.map((f) => this.macroNamesOf(f.path, f.text))];
    for (const e of this.macroContext(file, folder, graph, settings).elsewhere ?? []) sets.push(e.defs);
    return (name) => sets.some((d) => d.names.has(name) || d.prefixes.some((p) => name.startsWith(p)));
  }

  /**
   * Every tf script under a workspace folder (`walkTfFiles`), until a watched file changes:
   * walking the folder on every keystroke cost seconds in a big tree. Capped, so a folder like a
   * home directory can't take forever. A folder that isn't a workspace folder (a loose file's own
   * directory) is never walked.
   */
  private walks = new Map<string, { files: string[]; truncated: boolean; at: number }>();
  /** Per file, by its text: the macros it defines and the loads it makes. */
  private analyses = new Map<string, { text: string; defs: MacroNames; loads: { raw: string; literal?: string; line: number }[] }>();
  /** Whether a load path resolves, per search environment (cleared when files or settings change). */
  private resolvable = new Map<string, boolean>();
  /** Per graph, and the folder listing it was built from (which a refresh replaces). */
  private macroContexts = new WeakMap<LoadGraph, { walked: object; listed: object | undefined; elsewhere: DefinedElsewhere[]; unfollowed: UnfollowedLoad[]; files: string[]; truncated: boolean }>();

  /**
   * A watched file or folder was created, changed or deleted (or renamed): forget what was read
   * from disk, the folder listings and the library's, since a folder's files may have gone with it.
   */
  filesChanged(): void {
    this.disk.clear();
    this.walks.clear();
    this.libraries.clear();
    this.resolvable.clear();
    this.invalidate();
  }

  private isWorkspaceFolder(folder: string): boolean {
    return this.folders.some((f) => keyOf(f) === keyOf(folder));
  }

  /**
   * The tf files of a workspace folder, at most MAX_WALKED_FILES (the walk stops there), kept until
   * a watched file changes, or for a few seconds when no watcher covers the folder.
   */
  private walk(folder: string): { files: string[]; truncated: boolean } {
    if (!this.isWorkspaceFolder(folder)) return NOT_WALKED;
    const key = keyOf(folder);
    const cached = this.walks.get(key);
    if (cached && (this.isWatched(folder) || Date.now() - cached.at < UNWATCHED_WALK_MS)) return cached;
    const found = this.fs.walkTfFiles(folder, MAX_WALKED_FILES + 1);
    const walked = { files: found.slice(0, MAX_WALKED_FILES), truncated: found.length > MAX_WALKED_FILES, at: Date.now() };
    this.walks.set(key, walked);
    return walked;
  }

  private analysis(file: string, text: string): { defs: MacroNames; loads: { raw: string; literal?: string; line: number }[] } {
    const key = keyOf(file);
    const cached = this.analyses.get(key);
    if (cached && cached.text === text) return cached;
    const loads: { raw: string; literal?: string; line: number }[] = [];
    for (const entry of splitLogicalEntries(text)) {
      if (entry.incomplete) continue;
      for (const load of entryLoads(entry)) {
        const literal = literalText(load.file, load.pending)?.trim();
        loads.push({ raw: entry.text.slice(load.start, load.end), ...(literal === undefined ? {} : { literal }), line: entry.startLine });
      }
    }
    const result = { text, defs: macroNames(text), loads };
    this.analyses.set(key, result);
    return result;
  }

  private macroNamesOf = (file: string, text: string): MacroNames => this.analysis(file, text).defs;

  private resolves(literal: string, env: LoadPathEnvironment): boolean {
    const key = `${JSON.stringify([env.workingDir, env.home, env.tfPath, env.libraryDir, env.local, env.pathMappings])}\0${literal}`;
    let found = this.resolvable.get(key);
    if (found === undefined) {
      found = resolveLoadPath(literal, env).found !== undefined;
      this.resolvable.set(key, found);
    }
    return found;
  }

  /**
   * What the undefined-macro check needs to know about the rest of the workspace, for `file`:
   * the files its load path doesn't reach and the macros they define, the loads that can't be
   * followed, and how to /require a file from it. The folder's files, their contents and what
   * each defines and loads are cached until a watched file changes (an edit only changes the one
   * file's text); what depends on the load graph is worked out once per graph.
   */
  private macroContext(file: string, folder: string, graph: LoadGraph, settings: ResolvedSettings): MacroContext {
    const lib = settings.libraryDir;
    const walked = this.walk(folder);
    const listed = lib ? this.libraryListing(lib) : undefined;
    let shared = this.macroContexts.get(graph);
    if (!shared || shared.walked !== walked || shared.listed !== listed) {
      const { files, truncated } = walked;
      const reached = new Set(graph.files.map((f) => keyOf(f.path)));
      const elsewhere: DefinedElsewhere[] = [];
      const add = (f: string, text: string, library: boolean): void => {
        if (reached.has(keyOf(f))) return;
        reached.add(keyOf(f));
        elsewhere.push({ file: path.resolve(f), label: this.label(f, folder, lib), library, defs: this.macroNamesOf(f, text) });
      };
      for (const f of files) {
        const text = this.read(f);
        if (text !== undefined) add(f, text, Boolean(lib && isInside(f, lib)));
      }
      if (lib) for (const f of this.library(lib)) add(f.path, f.text, true);
      // On the path, the graph knows which loads it couldn't follow.
      const unfollowed = unfollowedOnPath(graph, (f) => this.label(f, folder, lib));
      shared = { walked, listed, elsewhere, unfollowed, files, truncated };
      this.macroContexts.set(graph, shared);
    }
    const self = keyOf(file);
    const onPath = graph.files.find((f) => keyOf(f.path) === self);
    const env = onPath ? this.envAt(onPath.searchEnv, settings) : this.envFor(settings);
    return {
      // A file is never "elsewhere" to itself.
      elsewhere: shared.elsewhere.filter((e) => keyOf(e.file) !== self),
      unfollowed: onPath ? shared.unfollowed : this.offPathUnfollowed(file, shared.files, folder, settings),
      requirePath: (target) => this.requirePath(target, env, settings),
      namesOf: this.macroNamesOf,
      ...(shared.truncated ? { readOnly: MAX_WALKED_FILES } : {}),
    };
  }

  /**
   * For a file no load path reaches: the loads that can't be followed in it and in the files that
   * may load it, directly or not. A file may load it when one of its loads ends with this file's
   * name and the folders before it (`/require tf-wotmud/score.tf` for `.../tf-wotmud/score.tf`):
   * how tf finds it isn't known, so only the name can be compared. A loose file (in no workspace
   * folder) only has its own loads.
   */
  private offPathUnfollowed(file: string, files: string[], folder: string, settings: ResolvedSettings): UnfollowedLoad[] {
    const env = this.envFor(settings);
    const loadsOf = (f: string): { written: string[]; unfollowed: UnfollowedLoad[] } => {
      const text = this.read(f);
      const loads = text === undefined ? [] : this.analysis(f, text).loads;
      return {
        written: loads.flatMap((l) => (l.literal === undefined ? [] : [l.literal])),
        unfollowed: loads
          .filter((l) => l.literal === undefined || !this.resolves(l.literal, env))
          .map((l) => ({ raw: l.raw, label: this.label(f, folder, settings.libraryDir), line: l.line })),
      };
    };
    const segments = (p: string): string[] => p.replace(/\\/g, "/").split("/").filter((s) => s !== "" && s !== ".");
    const names = (target: string, written: string): boolean => {
      const t = segments(target);
      const w = segments(written).filter((s) => s !== ".." && s !== "~" && !s.startsWith("~"));
      if (w.length === 0) return false;
      const n = Math.min(t.length, w.length);
      for (let i = 1; i <= n; i += 1) if (t[t.length - i] !== w[w.length - i]) return false;
      return true;
    };
    // Keys are case-folded where the filesystem is (keyOf); fold what's written the same way.
    const fold = (s: string): string => (process.platform === "win32" ? s.toLowerCase() : s);
    const out: UnfollowedLoad[] = [];
    const seen = new Set<string>();
    const queue = [file];
    while (queue.length > 0) {
      const f = queue.shift() as string;
      const key = keyOf(f);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(...loadsOf(f).unfollowed);
      for (const other of files) {
        if (!seen.has(keyOf(other)) && loadsOf(other).written.some((w) => names(key, fold(w)))) queue.push(other);
      }
    }
    return out;
  }

  /**
   * What to write after `/require`, in a file read with `env`'s TFPATH and TFLIBDIR, for tf to
   * load `target`: its path from tf's current directory, or from a TFPATH directory (TFLIBDIR
   * when TFPATH is empty), checked by resolving it the way tf would; else tf's own absolute path
   * for it, through a path mapping. Undefined when none of them reaches it.
   */
  private requirePath(target: string, env: LoadPathEnvironment, settings: ResolvedSettings): string | undefined {
    const local = (dir: string, isLocal: boolean | undefined): string => (isLocal ? dir : toLocalPath(dir, settings.pathMappings));
    const dirs = [
      env.workingDir,
      ...(env.tfPath.length > 0 ? env.tfPath.map((d) => local(d, env.local?.tfPath)) : env.libraryDir ? [local(env.libraryDir, env.local?.libraryDir)] : []),
    ];
    const candidates = dirs.flatMap((dir) => {
      const rel = path.relative(dir, target);
      return rel === "" || rel.startsWith("..") || path.isAbsolute(rel) ? [] : [rel.replace(/\\/g, "/")];
    });
    const tfPath = toTfPath(target, settings.pathMappings);
    if (tfPath !== undefined) candidates.push(tfPath);
    // /require joins its words with single blanks, so a name with a run of them can't be written.
    return candidates.find((written) => {
      if (/\s\s/.test(written)) return false;
      const found = resolveLoadPath(written, env).found;
      return found !== undefined && keyOf(found) === keyOf(target);
    });
  }

  /** How tf finds a file, with the settings tf starts with: their folders are already here. */
  private envFor(settings: ResolvedSettings): LoadPathEnvironment {
    return {
      home: settings.home,
      tfPath: settings.tfPath,
      libraryDir: settings.libraryDir,
      workingDir: settings.workingDir,
      pathMappings: settings.pathMappings,
      local: { home: true, tfPath: true, libraryDir: true },
      readFile: this.read,
    };
  }

  /** How tf finds a file at some point on the load path, with the search variables it had then. */
  private envAt(at: SearchEnvironment, settings: ResolvedSettings): LoadPathEnvironment {
    return {
      home: at.home,
      tfPath: at.tfPath,
      ...(at.libraryDir === undefined ? {} : { libraryDir: at.libraryDir }),
      workingDir: settings.workingDir,
      pathMappings: settings.pathMappings,
      local: at.local,
      readFile: this.read,
    };
  }

  /**
   * The file each `/load` and `/require` in `text` opens. A load that runs while the file loads
   * (a top-level command, or one a top-level `/eval` runs), in a file the load path reaches,
   * resolves as the load graph found it, with the TFPATH and HOME that were set at that point (a
   * tfrc may change them), and has no link when tf wouldn't find it. A load in a macro body runs
   * whenever the macro does, and nothing is known about a file nothing loads, so those resolve
   * with the settings' TFPATH, TFLIBDIR, HOME and working directory.
   */
  documentLinks(file: string, text: string): { range: Range; target: string; kind: LoadPath["kind"] }[] {
    const { settings, graph } = this.contextFor(file);
    const self = keyOf(file);
    const onPath = graph.files.some((f) => keyOf(f.path) === self);
    const env = this.envFor(settings);
    const links = findLoadPaths(text).flatMap((load) => {
      let target: string | undefined;
      if (onPath && load.topLevel) {
        target = graph.resolved.find((r) => keyOf(r.from) === self && r.line === load.line && r.offset === load.offset)?.file;
      } else {
        const found = resolveLoadPath(load.file, env).found;
        target = found === undefined ? undefined : path.resolve(found);
      }
      return target === undefined ? [] : [{ range: load.range, target, kind: load.kind }];
    });
    if (!onPath) return links;
    // A path built from variables (`/eval /load %{dir}/x.tf`) isn't literal text, but the load
    // graph worked it out with the variables set on the path: link it too.
    const linked = new Set(links.map((l) => `${l.range.start.line}:${l.range.start.character}`));
    const entries = splitLogicalEntries(text);
    for (const r of graph.resolved) {
      if (keyOf(r.from) !== self) continue;
      const entry = entries.find((e) => e.startLine === r.line);
      const from = entry?.offsetMap[r.offset];
      const last = entry?.offsetMap[r.offset + r.raw.length - 1];
      if (!from || !last || from.line !== last.line || linked.has(`${from.line}:${from.character}`)) continue;
      links.push({
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        target: r.file,
        kind: r.kind,
      });
    }
    return links.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
  }

  /**
   * What the rest of the workspace knows about `file`, in the context it is seen in. If that
   * context's load path reaches it, every other file on that path; otherwise just what
   * stdlib.tf loads, which tf always reads first. Plus, as "not loaded" hints, the tf library
   * files the path never reaches.
   */
  navContext(file: string, uriOf: (file: string) => string): NavContext {
    const { folder, settings, graph } = this.contextFor(file);
    return this.buildNavContext(file, uriOf, folder, settings, graph);
  }

  /**
   * navContext(), kept per load graph (which an edit or a changed file replaces), for call
   * hierarchy, which needs one for every file that calls the macro. Its locations use the URIs
   * `uriOf` gave when it was built, so it isn't for answers that open a file.
   */
  callerContext(file: string, uriOf: (file: string) => string): NavContext {
    const { folder, settings, graph } = this.contextFor(file);
    let byFile = this.navContexts.get(graph);
    if (!byFile) {
      byFile = new Map();
      this.navContexts.set(graph, byFile);
    }
    const cached = byFile.get(keyOf(file));
    if (cached && cached.uriOf === uriOf) return cached.ctx;
    const ctx = this.buildNavContext(file, uriOf, folder, settings, graph);
    byFile.set(keyOf(file), { uriOf, ctx });
    return ctx;
  }

  private navContexts = new WeakMap<LoadGraph, Map<string, { uriOf: (file: string) => string; ctx: NavContext }>>();

  private buildNavContext(file: string, uriOf: (file: string) => string, folder: string, settings: ResolvedSettings, graph: LoadGraph): NavContext {
    const self = keyOf(file);
    const onPath = graph.files.some((f) => keyOf(f.path) === self);
    const loaded = graph.files.filter((f) => keyOf(f.path) !== self && (onPath || f.stdlib));
    const lib = settings.libraryDir;
    const label = (f: string): string => this.label(f, folder, lib);
    const isLibrary = (f: string): boolean => Boolean(lib && isInside(f, lib));

    const macros: ExternalMacro[] = loaded.flatMap((f: LoadedFile) => {
      const lines = splitRawLines(f.text);
      return f.defs.map((d) => ({
        uri: uriOf(f.path),
        label: label(f.path),
        symbol: d.symbol,
        lines,
        library: isLibrary(f.path),
        loaded: true,
      }));
    });

    if (lib) {
      const reached = new Set(graph.files.filter((f) => onPath || f.stdlib).map((f) => keyOf(f.path)));
      for (const f of this.library(lib)) {
        if (reached.has(keyOf(f.path)) || keyOf(f.path) === self) continue;
        const lines = splitRawLines(f.text);
        for (const symbol of f.defs) {
          macros.push({ uri: uriOf(f.path), label: label(f.path), symbol, lines, library: true, loaded: false });
        }
      }
    }

    return {
      uri: uriOf(file),
      files: onPath ? loaded.filter((f) => !isLibrary(f.path)).map((f) => ({ uri: uriOf(f.path), text: f.text })) : [],
      macros,
      libraryFiles: loaded.filter((f) => isLibrary(f.path)).map((f) => ({ uri: uriOf(f.path), text: f.text })),
      help: lib ? this.help(lib) : undefined,
    };
  }

  /**
   * Every file a call to a macro defined in `file` may come from: `file` itself, the files on
   * its load path (tf's library among them), and every tf script in its workspace folder,
   * reached by a load path or not. A file outside every workspace folder (tf's library, say) is
   * called from the scripts of all of them, so then every folder is searched, with what each
   * folder's load path reaches.
   */
  callerFiles(file: string, uriOf: (file: string) => string): ContextFile[] {
    const { folder, graph } = this.contextFor(file);
    const out = new Map<string, ContextFile>();
    const add = (p: string, text?: string): void => {
      const key = keyOf(p);
      if (out.has(key)) return;
      const t = text ?? this.read(p);
      if (t !== undefined) out.set(key, { uri: uriOf(path.resolve(p)), text: t });
    };
    add(file);
    for (const f of graph.files) add(f.path, f.text);
    for (const f of this.isWorkspaceFolder(folder) ? [folder] : this.folders) {
      for (const loaded of this.graphFor(f).graph.files) add(loaded.path, loaded.text);
      for (const walked of this.walk(f).files) add(walked);
    }
    return [...out.values()];
  }

  /** Whether `file`'s folder shows "N references" above each /def. Default on. */
  referenceLenses(file: string): boolean {
    return this.raw.get(keyOf(this.folderFor(file)))?.codeLens?.references ?? true;
  }

  private help(dir: string): ReadonlyMap<string, HelpEntry> | undefined {
    const key = keyOf(dir);
    if (!this.helps.has(key)) {
      const text = this.fs.readFile(path.join(dir, "tf-help"));
      this.helps.set(key, text === undefined ? undefined : parseTfHelp(text));
    }
    return this.helps.get(key);
  }
}
