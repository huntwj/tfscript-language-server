import { ALL_COMMANDS } from "../data/commands";
import type { TfDiagnostic } from "../diagnostics";
import { splitRawLines } from "../logicalEntries";
import { findUsages } from "../navigation";
import { fileKey, type LoadGraph, type UnresolvedLoad } from "./loadGraph";

export interface LoadPathDiagnosticOptions {
  /** `/load`/`/require` paths tf would not find. On by default. */
  unresolvedLoads: boolean;
  /** `/name` calls to names defined nowhere on the load path. Off by default. */
  undefinedMacros: boolean;
}

const COMMAND_NAMES = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));

/**
 * A `/def` anywhere in a file's text — top level or nested in a macro body, run later — and
 * the name after its options, which may carry quoted arguments with spaces
 * (map.tf: `/def -iFp9999 -mglob -h'send {n|s|e|w}' _map_hook = ...`).
 */
const ANY_DEF_RE = /(?:^|[\s;|(])\/def\b((?:\s+-(?:[^\s"'`]|"[^"]*"|'[^']*'|`[^`]*`)*)*)\s+([^\s=]+)/gi;

function definedNames(graph: LoadGraph): { names: Set<string>; prefixes: string[] } {
  const names = new Set(COMMAND_NAMES);
  const prefixes: string[] = [];
  for (const f of graph.files) {
    for (const d of f.defs) names.add(d.symbol.name.toLowerCase());
    for (const m of f.text.matchAll(ANY_DEF_RE)) {
      const name = (m[2] as string).toLowerCase();
      const dynamic = name.search(/[%$]/);
      if (dynamic === -1) names.add(name);
      else if (dynamic > 0) prefixes.push(name.slice(0, dynamic));
    }
  }
  return { names, prefixes };
}

/**
 * Filters out the `/word`s that are text rather than calls, so the opt-in undefined-macro check
 * stays worth reading (found on tf's own library): a path (`/etc/hosts`), a regex or glob
 * (`/^\\/def.*`, `"*{/load*|/save*}"`), a name built at runtime (`/foo_%1`), or anything inside
 * a double-quoted string on that line.
 */
function looksLikeCall(line: string, start: number, end: number, name: string): boolean {
  if (!/^[A-Za-z0-9_~:]/.test(name) || /[/*]/.test(name)) return false;
  const next = line[end];
  if (next === "%" || next === "$") return false;
  let quotes = 0;
  for (let i = 0; i < start; i += 1) if (line[i] === '"' && line[i - 1] !== "\\") quotes += 1;
  return quotes % 2 === 0;
}

/**
 * An optional call: `/if /ismacro foo%; /then /foo` or `ismacro("foo") & ...` just before it
 * (spedwalk.tf, savehist.tf). The script already knows the macro may not exist.
 */
function guardedByIsmacro(lines: string[], line: number, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const guard = new RegExp(`ismacro\\W{1,3}${escaped}\\b`, "i");
  for (let i = line; i >= Math.max(0, line - 5); i -= 1) if (guard.test(lines[i] ?? "")) return true;
  return false;
}

function rangeOf(lines: string[], u: UnresolvedLoad) {
  for (let line = u.line; line < Math.min(lines.length, u.line + 50); line += 1) {
    const col = (lines[line] ?? "").indexOf(u.raw);
    if (col !== -1) return { start: { line, character: col }, end: { line, character: col + u.raw.length } };
  }
  const text = lines[u.line] ?? "";
  const start = text.length - text.trimStart().length;
  return { start: { line: u.line, character: start }, end: { line: u.line, character: text.trimEnd().length } };
}

function unresolvedMessage(u: UnresolvedLoad): string {
  if (u.kind === "unknown-variable") {
    return (
      `Can't follow this load: ${u.reason}. tf works the path out when it runs; this check only ` +
      `follows paths built from literal /set values.`
    );
  }
  if (u.kind === "user-home") {
    const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
    return (
      `Can't follow this load: tf takes ~${user} from user ${user}'s home directory, or, if there is no such user, ` +
      `as a folder named ~${user} in its current directory. Write the full path to have it checked.`
    );
  }
  const shown = u.file === u.raw ? `"${u.raw}"` : `"${u.raw}" (${u.file})`;
  return (
    `tf won't find ${shown}. It would try, in order: ${u.searched.join(", ")}. A relative path is ` +
    `looked up from tf's current directory (tfscript.workingDirectory), then TFPATH — not from ` +
    `this file's folder.`
  );
}

/**
 * Diagnostics that need the whole load path, for a file the path reaches (a file it doesn't
 * reach has no known context, so it gets none). `/load` paths that only fail because a
 * top-level line isn't substituted are left to the load-no-expansion rule, which already
 * flags them.
 */
export function loadPathDiagnostics(
  file: string,
  text: string,
  graph: LoadGraph,
  options: LoadPathDiagnosticOptions,
): TfDiagnostic[] {
  const self = fileKey(file);
  if (!graph.files.some((f) => fileKey(f.path) === self)) return [];
  const lines = splitRawLines(text);
  const out: TfDiagnostic[] = [];

  if (options.unresolvedLoads) {
    for (const u of graph.unresolved) {
      if (fileKey(u.from) !== self || u.kind === "not-substituted") continue;
      out.push({
        range: rangeOf(lines, u),
        message: unresolvedMessage(u),
        code: "unresolved-load",
        severity: u.kind === "not-found" ? "warning" : "information",
      });
    }
  }

  if (options.undefinedMacros) {
    const { names, prefixes } = definedNames(graph);
    for (const usage of findUsages(text)) {
      if (usage.kind !== "call") continue;
      // A `/name` mentioned in prose ("... /map_updateRoom? ...", typically /echo text) picks
      // up the punctuation after it; the bare name is what it refers to.
      const name = usage.name.toLowerCase().replace(/[?!.,:]+$/, "");
      if (names.has(name) || prefixes.some((p) => name.startsWith(p))) continue;
      if (!looksLikeCall(lines[usage.range.start.line] ?? "", usage.range.start.character, usage.range.end.character, name)) continue;
      if (guardedByIsmacro(lines, usage.range.start.line, name)) continue;
      out.push({
        range: usage.range,
        message:
          `/${usage.name} isn't defined anywhere on this file's load path, and isn't a tf command. ` +
          `It may still exist at runtime — from /eval /def, a hook, or a file loaded some other way — which this check can't see.`,
        code: "undefined-macro",
        severity: "information",
      });
    }
  }
  return out;
}
