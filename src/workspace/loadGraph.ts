import * as path from "node:path";
import { splitLogicalEntries, type LogicalEntry } from "../logicalEntries";
import { findAbortEntry } from "../rules/bareLineAfterCommand";
import { getDocumentSymbols, type TfSymbol } from "../symbols";

/**
 * Replays tf's startup load order statically: stdlib.tf (tinyfugue/src/main.c's
 * read_configuration() loads TFLIBRARY first), then each entry file in turn, following every
 * top-level `/load` and `/require` at the point it occurs, so files come out in the order tf
 * would read them. Rules, each proven against real tf with tf-script-check on 2026-10-12, not
 * just read from the source:
 *  - `/load [-q] file` (command.c handle_load_command): options, then the rest of the line,
 *    trimmed, is the filename. `/require` is stdlib.tf's `/load %{-L} %{L}` plus a skip.
 *  - Path resolution (command.c do_file_load(), tfio.c expand_filename()): a leading `~` is the
 *    HOME variable; a relative path is tried against tf's current directory — NOT the loading
 *    file's directory (a file beside the loader was not found) — then, only if that fails,
 *    against each TFPATH directory in order (first hit wins, checked both orders), or against
 *    TFLIBDIR when TFPATH is empty.
 *  - `/require` skips a file whose `/loaded TOKEN` has already run — by token, not filename:
 *    a different file declaring the same token was opened but stopped at its `/loaded`. A plain
 *    `/load` always reads the file again.
 *  - A top-level line is not substituted, so a `%{var}` in a plain `/load` path is taken
 *    literally (and fails); `/eval /load %{dir}/x.tf` substitutes. `/set NAME=value` lines are
 *    tracked so `/eval` paths — and TFPATH/HOME changes made in a tfrc — resolve the way tf
 *    would, as long as the value was set to literal text.
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
}

export interface UnresolvedLoad {
  from: string;
  line: number;
  file: string;
  reason: string;
}

export interface LoadGraph {
  /** Every file read, in first-load order. */
  files: LoadedFile[];
  unresolved: UnresolvedLoad[];
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
  readFile(file: string): string | undefined;
}

const LOADED_RE = /^\s*\/loaded\s+(\S+)/i;
const SET_RE = /^\s*(\/eval\s+(?:-\S+\s+)*)?\/set\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*|\s+)(.*)$/is;
const LOAD_RE = /(?:^|\s)(\/eval\s+(?:-\S+\s+)*)?\/@?(load|require)(?=\s|$)(.*)$/is;

/** A path's identity for comparisons: resolved, and case-folded where the filesystem is. */
export function fileKey(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

type Expanded = { ok: true; value: string } | { ok: false; reason: string };

/** One substitution pass over `text`, as `/eval` does for the forms a load path uses. */
export function expandVariables(text: string, vars: Map<string, string>): Expanded {
  let missing: string | undefined;
  const value = text.replace(
    /%%|%\{([^}-]+)(?:-([^}]*))?\}|%([A-Za-z_][A-Za-z0-9_]*)/g,
    (whole, braced?: string, fallback?: string, bare?: string) => {
      if (whole === "%%") return "%";
      const name = (braced ?? bare) as string;
      const v = vars.get(name);
      if (v !== undefined && v !== "") return v;
      if (fallback !== undefined) return fallback;
      missing ??= name;
      return "";
    },
  );
  return missing ? { ok: false, reason: `%{${missing}} is not set to literal text on this load path` } : { ok: true, value };
}

function stripLoadOptions(args: string): string {
  let rest = args.trim();
  while (rest.startsWith("-")) {
    const end = rest.search(/\s/);
    const opt = end === -1 ? rest : rest.slice(0, end);
    rest = end === -1 ? "" : rest.slice(end).trim();
    if (opt === "--") break;
  }
  return rest;
}

export function buildLoadGraph(options: LoadGraphOptions): LoadGraph {
  const vars = new Map<string, string>([
    ["TFLIBDIR", options.libraryDir ?? ""],
    ["TFPATH", (options.tfPath ?? []).join(" ")],
    ["HOME", options.home ?? ""],
  ]);
  const files = new Map<string, LoadedFile>();
  const tokens = new Set<string>();
  const unresolved: UnresolvedLoad[] = [];
  let seq = 0;
  let inStdlib = false;

  function resolve(file: string): string | undefined {
    let target = file;
    if (target === "~" || target.startsWith("~/")) target = (vars.get("HOME") ?? "") + target.slice(1);
    const candidates: string[] = [];
    if (path.isAbsolute(target)) {
      candidates.push(target);
    } else {
      candidates.push(path.join(options.workingDir, target));
      const tfPath = (vars.get("TFPATH") ?? "").split(/\s+/).filter(Boolean);
      if (tfPath.length > 0) {
        for (const dir of tfPath) if (path.isAbsolute(dir)) candidates.push(path.join(dir, target));
      } else {
        const lib = vars.get("TFLIBDIR");
        if (lib && path.isAbsolute(lib)) candidates.push(path.join(lib, target));
      }
    }
    return candidates.find((c) => options.readFile(c) !== undefined);
  }

  function handleLoads(entryText: string, from: string, line: number): void {
    for (const segment of entryText.split("%;")) handleLoad(segment, from, line);
  }

  function handleLoad(segment: string, from: string, line: number): void {
    const m = LOAD_RE.exec(segment);
    if (!m) return;
    const isEval = Boolean(m[1]);
    const kind = (m[2] as string).toLowerCase() as "load" | "require";
    let file = stripLoadOptions(m[3] as string);
    if (!file) return;
    if (isEval) {
      const expanded = expandVariables(file, vars);
      if (!expanded.ok) {
        unresolved.push({ from, line, file, reason: expanded.reason });
        return;
      }
      file = expanded.value;
    } else if (/%\{|%[A-Za-z_]/.test(file)) {
      unresolved.push({ from, line, file, reason: "a top-level path is not substituted; prefix the line with /eval" });
      return;
    }
    const found = resolve(file);
    if (!found) {
      unresolved.push({ from, line, file, reason: "file not found" });
      return;
    }
    walk(found, { kind, from, line });
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

    const loaded: LoadedFile = { path: path.resolve(file), text, sites: [site], defs: [], stdlib: inStdlib };
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
      const set = SET_RE.exec(entry.text);
      if (set) {
        const raw = (set[3] as string).trim();
        const value = set[1] ? expandVariables(raw, vars) : { ok: true as const, value: raw };
        if (value.ok) vars.set(set[2] as string, value.value);
        else vars.delete(set[2] as string);
        continue;
      }
      if (!entry.isForLoop) handleLoads(entry.text, loaded.path, entry.startLine);
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

  return { files: [...files.values()], unresolved };
}
