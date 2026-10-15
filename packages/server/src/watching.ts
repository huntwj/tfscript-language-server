import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type { FileSystemWatcher } from "vscode-languageserver/node";
import { fileKey } from "@tfscript/core/workspace/loadGraph";
import type { ResolvedSettings } from "@tfscript/core/workspace/settings";

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
/** How long the client has to acknowledge a registration before files are checked by modification time instead. */
export const REGISTER_TIMEOUT_MS = 5000;

/** Folders whose changes don't matter, and whose create and delete events (a jj or git command's) are ignored. */
export const SKIP_DIRS: ReadonlySet<string> = new Set([".git", ".jj", "node_modules"]);

/** Whether `name` is one of SKIP_DIRS, ignoring case where the file system does (Windows). */
export function isSkippedDir(name: string): boolean {
  return SKIP_DIRS.has(process.platform === "win32" ? name.toLowerCase() : name);
}

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
 * create and delete; with relative patterns, the same for tf's library and each mapped folder;
 * and in each home directory (the settings' and the OS's) only its own tfrc files, not
 * recursively. Only a bounded folder becomes a watched root: not a drive root, and not one
 * holding a home directory, which would mean trusting everything under it. Other files are
 * checked by modification time.
 */
export function watchPlan(folders: string[], settings: ResolvedSettings[], relativePatterns: boolean, osHome: string): WatchPlan {
  const homes = new Map([[fileKey(osHome), osHome], ...settings.map((s) => [fileKey(s.home), s.home] as [string, string])]);
  const bounded = (dir: string): boolean => path.parse(dir).root !== dir && ![...homes.values()].some((h) => isWithin(h, dir));
  const watchers: FileSystemWatcher[] = [
    { globPattern: TF_FILES, kind: CREATE | CHANGE | DELETE },
    { globPattern: "**/*", kind: CREATE | DELETE },
  ];
  const roots = folders.filter(bounded);
  if (!relativePatterns) return { watchers, roots };
  const extra = new Map<string, string>();
  for (const s of settings) {
    for (const dir of [s.libraryDir, ...s.pathMappings.map((m) => m.local)]) {
      if (!dir || !bounded(dir) || roots.some((r) => isWithin(dir, r))) continue;
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
  return !file.split(/[\\/]/).some(isSkippedDir);
}

export interface Disposable {
  dispose(): void;
}

/**
 * Keeps one registration of the watchers at a time: each update waits for the one before it,
 * registers the new watchers, and only once the client has them drops the old ones and reports
 * a change (what happened in between went unreported). A registration that fails, or that the
 * client doesn't answer within REGISTER_TIMEOUT_MS, or a plan that can't be made, leaves nothing
 * trusted as watched, so files are checked by modification time.
 */
export class Watching {
  private current: Disposable | undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly register: (watchers: FileSystemWatcher[]) => Promise<Disposable>,
    private readonly setRoots: (roots: string[]) => void,
    private readonly log: (message: string) => void,
    private readonly changed: () => void = () => undefined,
    private readonly timeoutMs = REGISTER_TIMEOUT_MS,
  ) {}

  update(makePlan: () => WatchPlan | undefined): Promise<void> {
    this.queue = this.queue.then(() => this.apply(makePlan));
    return this.queue;
  }

  private drop(): void {
    this.current?.dispose();
    this.current = undefined;
  }

  private async apply(makePlan: () => WatchPlan | undefined): Promise<void> {
    let plan: WatchPlan | undefined;
    try {
      plan = makePlan();
    } catch (error) {
      this.log(`tfscript: the file watchers couldn't be worked out, so files are checked by modification time: ${String(error)}`);
    }
    if (!plan) {
      this.drop();
      this.setRoots([]);
      return;
    }
    const pending = this.register(plan.watchers);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer in ${this.timeoutMs} ms`)), this.timeoutMs);
    });
    try {
      const registration = await Promise.race([pending, timeout]);
      this.drop();
      this.current = registration;
      this.setRoots(plan.roots);
      this.changed();
    } catch (error) {
      // A late answer still registered watchers: take them back.
      pending.then((late) => late.dispose(), () => undefined);
      this.log(`tfscript: the client refused the file watchers, so files are checked by modification time: ${String(error)}`);
      this.drop();
      this.setRoots([]);
    } finally {
      clearTimeout(timer);
    }
  }
}
