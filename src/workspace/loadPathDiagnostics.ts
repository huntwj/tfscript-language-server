import * as path from "node:path";
import { ALL_COMMANDS } from "../data/commands";
import type { TfDiagnostic } from "../diagnostics";
import { splitLogicalEntries, splitRawLines, type LogicalEntry } from "../logicalEntries";
import { code } from "../structure";
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

/** The filename's range, mapped from the load's offsets in its entry; the entry's first line if that fails. */
function rangeOf(lines: string[], entries: LogicalEntry[], u: UnresolvedLoad) {
  const entry = entries.find((e) => e.startLine === u.line);
  const from = entry?.offsetMap[u.start];
  const last = entry?.offsetMap[u.end - 1];
  if (from && last) return { start: { ...from }, end: { line: last.line, character: last.character + 1 } };
  const text = lines[u.line] ?? "";
  const start = text.length - text.trimStart().length;
  return { start: { line: u.line, character: start }, end: { line: u.line, character: text.trimEnd().length } };
}

function unresolvedDetail(u: UnresolvedLoad): Pick<TfDiagnostic, "message" | "label" | "explanation"> {
  if (u.kind === "unknown-variable") {
    return {
      message: `This load can't be followed here: ${u.reason}.`,
      label: "can't follow",
      explanation:
        `tf works the path out when it runs. This check only follows paths built from literal ${code("/set")} ` +
        "values, so it can't tell whether tf will find the file.",
    };
  }
  if (u.kind === "guarded-variable") {
    // No advice: the usual reason is the default-value idiom, /if (x =~ "") /set x=...%; /endif,
    // which exists so users can override x, and the /set may be in an earlier file.
    return {
      message: `This load can't be followed here: %{${u.variable}} is set inside an /if or /while on the load path.`,
      label: "can't follow",
      explanation: `This check can't tell whether that ${code("/set")} runs, so it can't tell which file tf would load.`,
    };
  }
  if (u.kind === "user-home") {
    const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
    return {
      message: `This load can't be followed here, since ~${user} depends on whether user ${user} exists: write the full path to have it checked.`,
      label: "can't follow",
      explanation:
        `tf takes ${code(`~${user}`)} from user ${code(user)}'s home directory, or, if there is no such user, as a ` +
        `folder named ${code(`~${user}`)} in its current directory. ${userHomeExplanation(u)}`,
    };
  }
  const shown = u.file === u.raw ? `"${u.raw}"` : `"${u.raw}" (${u.file})`;
  // tf searches nothing for an absolute path, or one starting with ~ (resolveLoadPath), so the
  // working directory only matters for a relative one.
  if (u.file.startsWith("~") || path.isAbsolute(u.file)) {
    return {
      message: `tf won't find ${shown}: fix the path.`,
      label: "not found",
      explanation: `The path is absolute, so tf looks only at ${u.searched.map((s) => code(s)).join(", ")}.`,
    };
  }
  return {
    message: `tf won't find ${shown}: fix the path, or set tfscript.workingDirectory to the folder tf runs in.`,
    label: "not found",
    explanation:
      `tf would try, in order: ${u.searched.map((s) => code(s)).join(", ")}. A relative path is looked up from tf's ` +
      `current directory (${code("tfscript.workingDirectory")}), then ${code("TFPATH")}, not from this file's folder.`,
  };
}

/** The hover text for a ~user load: a misspelt name is a silent fallback, not an error. */
function userHomeExplanation(u: UnresolvedLoad): string {
  const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
  const rest = u.file.slice(user.length + 1);
  return (
    `If \`${user}\` is misspelt, or there is no such user, tf doesn't warn: it reads ` +
    `\`./~${user}${rest}\` from its current directory instead.`
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
  const entries = splitLogicalEntries(text);
  const out: TfDiagnostic[] = [];

  if (options.unresolvedLoads) {
    for (const u of graph.unresolved) {
      if (fileKey(u.from) !== self || u.kind === "not-substituted") continue;
      out.push({
        range: rangeOf(lines, entries, u),
        ...unresolvedDetail(u),
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
        message: `/${usage.name} isn't defined anywhere on this file's load path, and isn't a tf command: check the name.`,
        label: "not defined on the load path",
        explanation:
          `It may still exist when this runs: defined by ${code("/eval /def")}, by a hook, or in a file loaded some ` +
          "other way, none of which this check can see.",
        code: "undefined-macro",
        severity: "information",
      });
    }
  }
  return out;
}
