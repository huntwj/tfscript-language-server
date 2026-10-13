import * as path from "node:path";
import { splitRawLines } from "../logicalEntries";
import type { ExternalMacro, NavContext } from "../navigation";
import { getDocumentSymbols, type TfSymbol } from "../symbols";
import { buildLoadGraph, fileKey as keyOf, type LoadGraph, type LoadedFile } from "./loadGraph";
import { resolveSettings, type Environment, type RawSettings, type ResolvedSettings } from "./settings";

export interface FileSystem {
  readFile(file: string): string | undefined;
  /** `.tf` files directly inside `dir` (absolute paths), or none if it can't be read. */
  listTfFiles(dir: string): string[];
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
  private graphs = new Map<string, { settings: ResolvedSettings; graph: LoadGraph }>();
  private libraries = new Map<string, LibraryFile[]>();

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
  }

  setOverlay(file: string, text: string | undefined): void {
    if (text === undefined) this.overlay.delete(keyOf(file));
    else this.overlay.set(keyOf(file), text);
    this.invalidate();
  }

  invalidate(): void {
    this.graphs.clear();
  }

  private read = (file: string): string | undefined => this.overlay.get(keyOf(file)) ?? this.fs.readFile(file);

  /** The workspace folder holding `file` (the innermost one), or the file's own directory. */
  folderFor(file: string): string {
    const inside = this.folders.filter((f) => isInside(file, f));
    return inside.sort((a, b) => b.length - a.length)[0] ?? path.dirname(path.resolve(file));
  }

  graphFor(folder: string): { settings: ResolvedSettings; graph: LoadGraph } {
    const key = keyOf(folder);
    const cached = this.graphs.get(key);
    if (cached) return cached;
    const settings = resolveSettings(this.raw.get(key) ?? {}, folder, this.environment);
    const graph = buildLoadGraph({
      entryFiles: settings.entryFiles,
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
   * What the rest of the workspace knows about `file`. If an entry file's load path reaches
   * it, every other file on that path; otherwise just what stdlib.tf loads, which tf always
   * reads first. Plus, as "not loaded" hints, the tf library files the path never reaches.
   */
  navContext(file: string, uriOf: (file: string) => string): NavContext {
    const folder = this.folderFor(file);
    const { settings, graph } = this.graphFor(folder);
    const self = keyOf(file);
    const onPath = graph.files.some((f) => keyOf(f.path) === self);
    const loaded = graph.files.filter((f) => keyOf(f.path) !== self && (onPath || f.stdlib));
    const lib = settings.libraryDir;

    const label = (f: string): string => {
      if (lib && isInside(f, lib)) return path.basename(f);
      const rel = path.relative(folder, f);
      return rel.startsWith("..") || path.isAbsolute(rel) ? f : rel.replace(/\\/g, "/");
    };
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
    };
  }
}
