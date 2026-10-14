import * as path from "node:path";
import { splitRawLines } from "../logicalEntries";
import type { ExternalMacro, NavContext } from "../navigation";
import { getDocumentSymbols, type TfSymbol } from "../symbols";
import { findLoadPaths, type LoadPath } from "../documentLinks";
import type { Range } from "../symbols";
import { buildLoadGraph, fileKey as keyOf, resolveLoadPath, type LoadGraph, type LoadedFile } from "./loadGraph";
import { resolveSettings, type Environment, type RawSettings, type ResolvedSettings } from "./settings";
import { parseTfHelp, type HelpEntry } from "./tfHelp";
import { loadPathDiagnostics } from "./loadPathDiagnostics";
import type { TfDiagnostic } from "../diagnostics";

export interface FileSystem {
  readFile(file: string): string | undefined;
  /** `.tf` files directly inside `dir` (absolute paths), or none if it can't be read. */
  listTfFiles(dir: string): string[];
  /** Every tf script under `dir`, recursively: `.tf` files plus `tfrc`/`.tfrc`. */
  walkTfFiles(dir: string): string[];
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
  private libraries = new Map<string, LibraryFile[]>();
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
    this.libraries.clear();
    this.helps.clear();
  }

  setOverlay(file: string, text: string | undefined): void {
    if (text === undefined) this.overlay.delete(keyOf(file));
    else this.overlay.set(keyOf(file), text);
    this.invalidate();
  }

  invalidate(): void {
    this.graphs.clear();
    // A tfrc appearing or disappearing changes which entry file the default context finds.
    this.resolved.clear();
  }

  private read = (file: string): string | undefined => this.overlay.get(keyOf(file)) ?? this.fs.readFile(file);

  /** The workspace folder holding `file` (the innermost one), or the file's own directory. */
  /**
   * Every macro-defining entry (`/def`, `/alias`, `/bind`, `/hook`, `/trig*`) in every tf
   * script under the workspace folders — reached by a load path or not — whose name contains
   * the query's characters in order, ignoring case (the editor ranks them further).
   */
  workspaceSymbols(query: string): { file: string; folder: string; symbol: TfSymbol }[] {
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
      readFile: this.read,
    });
    const built = { settings, graph };
    this.graphs.set(key, built);
    return built;
  }

  private library(dir: string): LibraryFile[] {
    const key = keyOf(dir);
    let files = this.libraries.get(key);
    if (!files) {
      files = this.fs.listTfFiles(dir).flatMap((file) => {
        const text = this.fs.readFile(file);
        return text === undefined
          ? []
          : [{ path: path.resolve(file), text, defs: getDocumentSymbols(text).filter((s) => s.kind === "def") }];
      });
      this.libraries.set(key, files);
    }
    return files;
  }

  /**
   * The context `file` is seen in: the active one if its load path reaches the file, else the
   * first context that does (tf can only have read the file that way), else the active one.
   */
  contextFor(file: string): { folder: string; name: string; graph: LoadGraph; settings: ResolvedSettings } {
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
    const { folder, graph } = this.contextFor(file);
    const options = this.raw.get(keyOf(folder))?.diagnostics;
    return loadPathDiagnostics(file, text, graph, {
      unresolvedLoads: options?.unresolvedLoads ?? true,
      undefinedMacros: options?.undefinedMacros ?? false,
    });
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
    const env = {
      home: settings.home,
      tfPath: settings.tfPath,
      libraryDir: settings.libraryDir,
      workingDir: settings.workingDir,
      readFile: this.read,
    };
    return findLoadPaths(text).flatMap((load) => {
      let target: string | undefined;
      if (onPath && load.topLevel) {
        target = graph.resolved.find((r) => keyOf(r.from) === self && r.line === load.line && r.offset === load.offset)?.file;
      } else {
        const found = resolveLoadPath(load.file, env).found;
        target = found === undefined ? undefined : path.resolve(found);
      }
      return target === undefined ? [] : [{ range: load.range, target, kind: load.kind }];
    });
  }

  /**
   * What the rest of the workspace knows about `file`, in the context it is seen in. If that
   * context's load path reaches it, every other file on that path; otherwise just what
   * stdlib.tf loads, which tf always reads first. Plus, as "not loaded" hints, the tf library
   * files the path never reaches.
   */
  navContext(file: string, uriOf: (file: string) => string): NavContext {
    const { folder, settings, graph } = this.contextFor(file);
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

  private help(dir: string): ReadonlyMap<string, HelpEntry> | undefined {
    const key = keyOf(dir);
    if (!this.helps.has(key)) {
      const text = this.fs.readFile(path.join(dir, "tf-help"));
      this.helps.set(key, text === undefined ? undefined : parseTfHelp(text));
    }
    return this.helps.get(key);
  }
}
