import * as path from "node:path";
import { ALL_COMMANDS } from "../data/commands";
import type { TfDiagnostic, TfTextEdit } from "../diagnostics";
import { isCommentLine, splitLogicalEntries, splitRawLines, type LogicalEntry } from "../logicalEntries";
import { code } from "../structure";
import { findMacroCalls } from "../variables";
import { fileKey, isForeignPath, type LoadGraph, type UnresolvedLoad } from "./loadGraph";

export interface LoadPathDiagnosticOptions {
  /** `/load`/`/require` paths tf would not find. On by default. */
  unresolvedLoads: boolean;
  /** `/name` calls to macros defined nowhere tf can see. */
  undefinedMacros: boolean;
  /** Macro names the undefined-macro check leaves alone; `*` matches any run of characters. */
  ignoreMacros?: string[];
}

/** The macros a file defines, for a file that isn't on this file's load path. */
export interface DefinedElsewhere {
  file: string;
  /** How to name it in a message: a workspace-relative path, or a library file's name. */
  label: string;
  /** Part of tf's library. */
  library: boolean;
  defs: MacroNames;
}

/** A load this check can't follow, which might define a macro it can't see. */
export interface UnfollowedLoad {
  /** The path as written. */
  raw: string;
  /** The file it is in, as a label, and its line (0-based). */
  label: string;
  line: number;
}

/** What the rest of the workspace tells the undefined-macro check. */
export interface MacroContext {
  elsewhere?: DefinedElsewhere[];
  unfollowed?: UnfollowedLoad[];
  /** What to write after `/require`, in this file, to load `file`; undefined if tf can't be told where it is. */
  requirePath?: (file: string) => string | undefined;
  /** The macros a file on the path defines (cached by the caller); macroNames() by default. */
  namesOf?: (file: string, text: string) => MacroNames;
}

export interface MacroNames {
  /** Lower case, as tf looks macros up; each maps to the spelling of its first /def. */
  names: Map<string, string>;
  /** Prefixes of names built when the /def runs (`/def ~body_%1`). */
  prefixes: string[];
}

const COMMAND_NAMES = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));

/**
 * A `/def` (or `/@def`, the builtin) anywhere in a file's text — top level or nested in a macro
 * body, run later — and the name after its options, which may carry quoted arguments with spaces
 * (map.tf: `/def -iFp9999 -mglob -h'send {n|s|e|w}' _map_hook = ...`), in which `\` escapes the
 * next character (util.c stringliteral()).
 */
const ANY_DEF_RE = /(?:^|[\s;|(])\/@?def\b((?:\s+-(?:[^\s"'`]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)*)*)\s+([^\s=]+)/gi;

/**
 * Every macro name `text` defines anywhere, generously: any `/def` in it, including one inside
 * a body or `/eval` text that only runs later, since such a name may well exist by the time a
 * call runs.
 */
export function macroNames(text: string): MacroNames {
  const names = new Map<string, string>();
  const prefixes: string[] = [];
  for (const m of text.matchAll(ANY_DEF_RE)) {
    const written = m[2] as string;
    const name = written.toLowerCase();
    const dynamic = name.search(/[%$]/);
    if (dynamic === -1) {
      if (!names.has(name)) names.set(name, written);
    } else if (dynamic > 0) prefixes.push(name.slice(0, dynamic));
  }
  return { names, prefixes };
}

function defines(defs: MacroNames, name: string): boolean {
  return defs.names.has(name) || defs.prefixes.some((p) => name.startsWith(p));
}

/**
 * The loads on the path the graph couldn't follow. One tf won't find loads nothing, unless it
 * looked somewhere only tf's machine has (isForeignPath()).
 */
export function unfollowedOnPath(graph: LoadGraph, label: (file: string) => string = (f) => path.basename(f)): UnfollowedLoad[] {
  return graph.unresolved
    .filter((u) => u.kind === "unknown-variable" || u.kind === "guarded-variable" || u.kind === "user-home" || u.searched.some(isForeignPath))
    .map((u) => ({ raw: u.raw, label: label(u.from), line: u.line }));
}

function onPathNames(graph: LoadGraph, file: string, ownText: string, namesOf: (file: string, text: string) => MacroNames): MacroNames {
  const names = new Map([...COMMAND_NAMES].map((n) => [n, n]));
  const prefixes: string[] = [];
  for (const [f, text] of [[file, ownText] as const, ...graph.files.map((g) => [g.path, g.text] as const)]) {
    const d = namesOf(f, text);
    for (const [n, written] of d.names) if (!names.has(n)) names.set(n, written);
    prefixes.push(...d.prefixes);
  }
  for (const f of graph.files) {
    for (const d of f.defs) if (!names.has(d.symbol.name.toLowerCase())) names.set(d.symbol.name.toLowerCase(), d.symbol.name);
  }
  return { names, prefixes };
}

function ignored(patterns: string[], name: string): boolean {
  return patterns.some((p) => {
    const re = new RegExp(`^${p.toLowerCase().split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    return re.test(name);
  });
}

/** Optimal string alignment distance: insertions, deletions, substitutions and swapped neighbours. */
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) (rows[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    const row = rows[i] as number[];
    const up = rows[i - 1] as number[];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((up[j] as number) + 1, (row[j - 1] as number) + 1, (up[j - 1] as number) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j] as number, ((rows[i - 2] as number[])[j - 2] as number) + 1);
      }
    }
  }
  return (rows[a.length] as number[])[b.length] as number;
}

/**
 * The one visible name `name` is most likely a typo of: within 1 edit for a name of 4 or 5
 * characters, 2 for one of 6 or more, and strictly closer than every other candidate. A shorter
 * name is too close to too much to guess.
 */
export function nearestName(name: string, candidates: Iterable<string>): string | undefined {
  if (name.length < 4) return undefined;
  const limit = name.length >= 6 ? 2 : 1;
  let best: string | undefined;
  let bestDistance = Infinity;
  let tied = false;
  for (const c of candidates) {
    if (Math.abs(c.length - name.length) > limit) continue;
    const d = editDistance(name, c);
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
      tied = false;
    } else if (d === bestDistance) {
      tied = true;
    }
  }
  return best !== undefined && bestDistance <= limit && bestDistance > 0 && !tied ? best : undefined;
}

/**
 * The edit that adds `line` as a line of its own: after a `/loaded` line, else after the comments
 * and blank lines a file starts with, in the file's own line ending. A `;;;` doc comment right
 * above the first command belongs to it, so the line goes above that, unless the `;;;` lines are
 * the whole header (from the top of the file), which stays first.
 */
function insertLine(text: string, lines: string[], line: string): TfTextEdit {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  // splitRawLines() leaves an empty last line after a final newline: the lines that exist.
  const count = text.endsWith("\n") ? lines.length - 1 : lines.length;
  const loaded = lines.findIndex((l) => /^\s*\/loaded\s/i.test(l));
  let at: number;
  if (loaded >= 0) {
    at = loaded + 1;
  } else {
    at = 0;
    while (at < count && (isCommentLine(lines[at] as string) || (lines[at] as string).trim() === "")) at += 1;
    let doc = at;
    while (doc > 0 && /^\s*;;;/.test(lines[doc - 1] as string)) doc -= 1;
    if (doc > 0 && at < count) at = doc;
  }
  if (at < count) return { range: { start: { line: at, character: 0 }, end: { line: at, character: 0 } }, newText: `${line}${eol}` };
  // Past the last line (a /loaded line with no newline after it, or a file of only comments).
  const last = Math.max(0, count - 1);
  const end = { line: last, character: (lines[last] ?? "").replace(/\r$/, "").length };
  return { range: { start: end, end }, newText: count === 0 ? `${line}${eol}` : `${eol}${line}` };
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
  if (u.kind === "unknown-variable" && u.variable !== "HOME") {
    return {
      message: `This load can't be followed here: ${u.reason}.`,
      label: "can't follow",
      explanation:
        `tf works the path out when it runs. This check only follows paths built from literal ${code("/set")} ` +
        "values, so it can't tell whether tf will find the file.",
    };
  }
  if (u.kind === "unknown-variable" && u.variable === "HOME") {
    return {
      message: `This load can't be followed here: ${u.reason}, and ~ means tf's HOME: set tfscript.homeDirectory.`,
      label: "can't follow",
      explanation: `A path starting with ${code("~")} is under tf's ${code("HOME")}, which this check takes from ${code("tfscript.homeDirectory")}.`,
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
  if (/^~(?:\/|$)/.test(u.file)) {
    return {
      message: `tf won't find ${shown} in its HOME directory (${u.searched[0] ?? ""}): fix the path.`,
      label: "not found",
      explanation:
        `A path starting with ${code("~/")} is under tf's ${code("HOME")} (${code("tfscript.homeDirectory")} here), and ` +
        "tf looks nowhere else for it.",
    };
  }
  if (u.file.startsWith("~") || path.isAbsolute(u.file)) {
    // A Unix path no mapping covered: tf may run somewhere it exists (a container, WSL, another host).
    const unmapped = u.file.startsWith("/") && path.normalize(u.file) === path.normalize(u.searched[0] ?? "");
    return {
      message: unmapped
        ? `tf won't find ${shown}: fix the path, or if tf runs where that path exists, map it with tfscript.pathMappings.`
        : `tf won't find ${shown}: fix the path.`,
      label: "not found",
      explanation:
        `The path is absolute, so tf looks only at ${u.searched.map((s) => code(s)).join(", ")}.` +
        (unmapped
          ? ` If tf runs in a container or on another machine, ${code("tfscript.pathMappings")} says where its paths are here, ` +
            `for example ${code('[{ "tf": "/wotmud", "local": "C:/Users/me/wotmud" }]')}.`
          : ""),
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

const UNDEFINED_EXPLANATION =
  `tf looks the name up when the command runs, and with no macro or command of that name it prints ` +
  `${code("NAME: no such command or macro")}, sets ${code("%?")} to 1 and goes on with the next command. ` +
  "This check looked in this file, the files on its load path, the other tf files in the workspace and " +
  `tf's library. A macro made while tf runs (${code("/eval /def")}, or a file loaded some other way) isn't ` +
  `seen: add its name to ${code("tfscript.diagnostics.ignoreMacros")}.`;

function undefinedMacros(
  file: string,
  text: string,
  lines: string[],
  graph: LoadGraph,
  onPath: boolean,
  { elsewhere = [], unfollowed = [], requirePath = () => undefined, namesOf = (_f, t) => macroNames(t) }: MacroContext,
  ignore: string[],
): TfDiagnostic[] {
  const visible = onPathNames(graph, file, text, namesOf);
  const out: TfDiagnostic[] = [];
  for (const call of findMacroCalls(text)) {
    if (call.dynamic) continue;
    const name = call.name.toLowerCase();
    // A path or pattern written as a statement (`/^...`, `/*`) isn't a macro name.
    if (!/^[A-Za-z0-9_~:]/.test(name) || /[/*]/.test(name)) continue;
    if (defines(visible, name) || ignored(ignore, name)) continue;
    if (guardedByIsmacro(lines, call.range.start.line, name)) continue;
    const there = elsewhere.find((e) => defines(e.defs, name));
    if (there) {
      // Off every load path, nothing is known about what is loaded first.
      if (!onPath) continue;
      const where = there.library ? `tf's library file ${there.label}` : there.label;
      const required = requirePath(there.file);
      const d: TfDiagnostic = {
        range: call.range,
        message:
          required === undefined
            ? `/${call.name} is defined in ${where}, which isn't on this file's load path: load it first.`
            : `/${call.name} is defined in ${where}, which isn't on this file's load path: add /require ${required}.`,
        label: "not loaded",
        explanation:
          `None of the files tf loads on this file's load path define ${code(`/${call.name}`)}, so unless ` +
          `${there.label} is loaded some other way first, tf prints ${code(`${call.name}: no such command or macro`)} here.`,
        code: "undefined-macro",
        severity: "information",
      };
      if (required !== undefined) d.fix = { title: `Add /require ${required}`, edits: [insertLine(text, lines, `/require ${required}`)] };
      out.push(d);
      continue;
    }
    const close = nearestName(name, visible.names.keys());
    const nearest = close === undefined ? undefined : (visible.names.get(close) ?? close);
    const blind = unfollowed[0];
    const d: TfDiagnostic = blind
      ? {
          // A load this check can't follow may well define it: say so, quietly.
          range: call.range,
          message:
            `/${call.name} isn't defined in any file this check can read, but the load of ${blind.raw} ` +
            `(${blind.label} line ${blind.line + 1}) can't be followed: ` +
            (nearest ? `did you mean /${nearest}?` : "make that load resolve, or check the name."),
          label: "not found",
          explanation:
            `${UNDEFINED_EXPLANATION} Loads it couldn't follow, which may define it: ` +
            `${unfollowed.slice(0, 5).map((u) => `${code(u.raw)} (${u.label} line ${u.line + 1})`).join(", ")}` +
            `${unfollowed.length > 5 ? `, and ${unfollowed.length - 5} more` : ""}.`,
          code: "undefined-macro",
          severity: "information",
        }
      : {
          range: call.range,
          message: nearest
            ? `There's no macro or command /${call.name}: did you mean /${nearest}?`
            : `There's no macro or command /${call.name} anywhere tf can see: check the name.`,
          label: "not defined",
          explanation: UNDEFINED_EXPLANATION,
          code: "undefined-macro",
          severity: "warning",
        };
    if (nearest) d.fix = { title: `Change to /${nearest}`, edits: [{ range: call.range, newText: nearest }] };
    out.push(d);
  }
  return out;
}

/**
 * Diagnostics that need the whole load path. Unresolved loads only for a file the path reaches
 * (a file it doesn't reach has no known context); `/load` paths that only fail because a
 * top-level line isn't substituted are left to the load-no-expansion rule, which already flags
 * them. Undefined macros for any file: a name defined nowhere at all is a warning either way, but
 * "defined in a file this one doesn't load" needs the load path.
 */
export function loadPathDiagnostics(
  file: string,
  text: string,
  graph: LoadGraph,
  options: LoadPathDiagnosticOptions,
  context: MacroContext = {},
): TfDiagnostic[] {
  const self = fileKey(file);
  const onPath = graph.files.some((f) => fileKey(f.path) === self);
  const lines = splitRawLines(text);
  const out: TfDiagnostic[] = [];
  if (options.undefinedMacros) {
    const unfollowed = context.unfollowed ?? (onPath ? unfollowedOnPath(graph) : []);
    out.push(...undefinedMacros(file, text, lines, graph, onPath, { ...context, unfollowed }, options.ignoreMacros ?? []));
  }
  if (!onPath) return out;
  const entries = splitLogicalEntries(text);

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

  return out;
}
