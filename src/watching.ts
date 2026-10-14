import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type { FileSystemWatcher } from "vscode-languageserver/node";
import { fileKey } from "./workspace/loadGraph";
import type { ResolvedSettings } from "./workspace/settings";

/**
 * Which file watchers the server asks the client for, and what the index may then trust as
 * watched. A watched root is one where every change that matters gets reported: its tf files,
 * and its folders being created, deleted or renamed (which takes their files with them).
 */

/** WatchKind from the protocol: Create 1, Change 2, Delete 4. */
const CREATE = 1;
const CHANGE = 2;
const DELETE = 4;
const TF_FILES = "**/{*.tf,tfrc,.tfrc}";

/** Folders whose changes don't matter, and whose create and delete events (a jj or git command's) are ignored. */
export const SKIP_DIRS: ReadonlySet<string> = new Set([".git", ".jj", "node_modules"]);

export interface WatchPlan {
  watchers: FileSystemWatcher[];
  /** Folders (and single files) the index may trust as watched; anything else it checks by modification time. */
  roots: string[];
}

function isWithin(file: string, dir: string): boolean {
  const rel = path.relative(fileKey(dir), fileKey(file));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * The watchers for `folders` and the settings: in each workspace folder its tf files and every
 * create and delete; with relative patterns, the same for tf's library and each mapped folder, as
 * long as it is bounded (not a drive root, and not a folder holding the home directory, which would
 * mean watching everything under it); and in the home directory only its own tfrc files, not
 * recursively. The home directory isn't a watched root, so other files under it are checked by
 * modification time.
 */
export function watchPlan(folders: string[], settings: ResolvedSettings[], relativePatterns: boolean): WatchPlan {
  const watchers: FileSystemWatcher[] = [
    { globPattern: TF_FILES, kind: CREATE | CHANGE | DELETE },
    { globPattern: "**/*", kind: CREATE | DELETE },
  ];
  const roots = [...folders];
  if (!relativePatterns) return { watchers, roots };
  const homes = new Map(settings.map((s) => [fileKey(s.home), s.home]));
  const extra = new Map<string, string>();
  for (const s of settings) {
    for (const dir of [s.libraryDir, ...s.pathMappings.map((m) => m.local)]) {
      if (!dir || path.parse(dir).root === dir || [...homes.values()].some((h) => isWithin(h, dir)) || roots.some((r) => isWithin(dir, r))) continue;
      extra.set(fileKey(dir), dir);
    }
  }
  for (const dir of extra.values()) {
    const baseUri = pathToFileURL(dir).href;
    watchers.push({ globPattern: { baseUri, pattern: TF_FILES }, kind: CREATE | CHANGE | DELETE });
    watchers.push({ globPattern: { baseUri, pattern: "**/*" }, kind: CREATE | DELETE });
    roots.push(dir);
  }
  for (const home of homes.values()) {
    if (roots.some((r) => isWithin(home, r))) continue;
    watchers.push({ globPattern: { baseUri: pathToFileURL(home).href, pattern: "{tfrc,.tfrc}" }, kind: CREATE | CHANGE | DELETE });
    roots.push(path.join(home, "tfrc"), path.join(home, ".tfrc"));
  }
  return { watchers, roots };
}

/** Whether a reported change can matter: not one inside a .jj, .git or node_modules folder. */
export function relevantChange(file: string): boolean {
  return !file.split(/[\\/]/).some((part) => SKIP_DIRS.has(part));
}

export interface Disposable {
  dispose(): void;
}

/**
 * Keeps one registration of the watchers at a time: each update waits for the one before it,
 * replaces its registration, and on a failed registration (a client that refuses it) tells the
 * index nothing is watched, so it falls back to checking modification times.
 */
export class Watching {
  private current: Disposable | undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly register: (watchers: FileSystemWatcher[]) => Promise<Disposable>,
    private readonly setRoots: (roots: string[]) => void,
    private readonly log: (message: string) => void,
  ) {}

  update(plan: WatchPlan | undefined): Promise<void> {
    this.queue = this.queue.then(() => this.apply(plan));
    return this.queue;
  }

  private async apply(plan: WatchPlan | undefined): Promise<void> {
    this.current?.dispose();
    this.current = undefined;
    if (!plan) {
      this.setRoots([]);
      return;
    }
    try {
      this.current = await this.register(plan.watchers);
      this.setRoots(plan.roots);
    } catch (error) {
      this.log(`tfscript: the client refused the file watchers, so files are checked by modification time: ${String(error)}`);
      this.setRoots([]);
    }
  }
}
