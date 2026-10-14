import { definitionsOf, type ContextFile, type Def, type NavContext } from "./navigation";
import { getDocumentSymbols, type Position, type Range, type TfSymbol } from "./symbols";
import { findFunctionCalls, findMacroCalls } from "./variables";

/**
 * Call hierarchy for macros: who calls a macro, and what it calls.
 *
 * A call is what tf runs as one (variables.ts' statement model, so `/echo try /foo` isn't):
 *  - a `/name` statement, in a macro body, a trigger, hook or binding, `/eval`, `/for` and
 *    `/repeat` text or a `$(...)`, or at the top level of a file; `/!name` too, while `/@name`
 *    calls the builtin, never a macro;
 *  - `name(...)` in an expression, when name isn't one of tf's builtin functions (which tf tries
 *    first): tf then runs the macro of that name (expr.c do_function()).
 * A call whose name is only known when it runs (`/run_%1`) isn't one here.
 *
 * Items are `/def`s. A redefined macro has one item per `/def`; a call is shown under every one
 * of them, since which runs depends on load order. Calls at the top level of a file, outside any
 * definition, come from the file itself. Builtin commands have no `/def` to point at, so they
 * aren't shown; stdlib and library macros are, in their own files.
 */

export interface TfCallItem {
  name: string;
  /** A `/def` (or, as a caller only, a trigger, hook, binding or alias), or a file's top level. */
  kind: "macro" | "trigger" | "file";
  uri: string;
  range: Range;
  selectionRange: Range;
  /** The `/def` and its options, or which file: shown next to the name. */
  detail: string;
}

export interface TfIncomingCall {
  from: TfCallItem;
  /** The calls' names, in the caller's file. */
  fromRanges: Range[];
}

export interface TfOutgoingCall {
  to: TfCallItem;
  /** The calls' names, in the calling item's file. */
  fromRanges: Range[];
}

interface CallSite {
  /** As written; tf looks macros up ignoring case. */
  name: string;
  range: Range;
}

interface Analysed {
  text: string;
  symbols: TfSymbol[];
  sites: CallSite[];
}

/** Per file: its definitions and its calls, by its text (a request reads every file). */
const analyses = new Map<string, Analysed>();

function analyse(uri: string, text: string): Analysed {
  const cached = analyses.get(uri);
  if (cached && cached.text === text) return cached;
  const sites = [...findMacroCalls(text), ...findFunctionCalls(text)]
    .filter((c) => !c.dynamic)
    .map((c) => ({ name: c.name, range: c.range }))
    .sort((a, b) => compare(a.range.start, b.range.start));
  const result = { text, symbols: getDocumentSymbols(text), sites };
  if (analyses.size >= 2000) analyses.delete(analyses.keys().next().value as string);
  analyses.set(uri, result);
  return result;
}

const compare = (a: Position, b: Position): number => a.line - b.line || a.character - b.character;
const contains = (range: Range, pos: Position): boolean => compare(range.start, pos) <= 0 && compare(pos, range.end) <= 0;
const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

function fileName(uri: string): string {
  const last = decodeURIComponent(uri).split(/[/\\]/).pop();
  return last && last.length > 0 ? last : uri;
}

const TOP: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

function fileItem(uri: string): TfCallItem {
  return { name: fileName(uri), kind: "file", uri, range: TOP, selectionRange: TOP, detail: "top level" };
}

function symbolItem(uri: string, symbol: TfSymbol, label?: string): TfCallItem {
  return {
    name: symbol.name,
    kind: symbol.kind === "def" ? "macro" : "trigger",
    uri,
    range: symbol.range,
    selectionRange: symbol.selectionRange,
    detail: label ? `${symbol.detail} — ${label}` : symbol.detail,
  };
}

function defItem(d: Def): TfCallItem {
  return symbolItem(d.uri, d.symbol, d.label);
}

/** The defs a call to `name` from this file runs: those on its load path, else a library one that isn't loaded. */
function targets(name: string, a: Analysed, ctx: NavContext | undefined): Def[] {
  const all = definitionsOf(name, a.text, a.symbols, ctx);
  const loaded = all.filter((d) => d.loaded);
  return loaded.length > 0 ? loaded : all;
}

/** The definition (or top level) a position in the file is in. */
function enclosing(a: Analysed, pos: Position): TfSymbol | undefined {
  return a.symbols.find((s) => contains(s.range, pos));
}

/**
 * What the cursor names: the `/def` it is on, or the macro a call under it runs (every `/def` of
 * it, as go-to-definition finds them). Nothing for a builtin or an unknown name.
 */
export function prepareCallHierarchy(text: string, pos: Position, ctx?: NavContext): TfCallItem[] {
  const uri = ctx?.uri ?? "";
  const a = analyse(uri, text);
  const def = a.symbols.find((s) => s.kind === "def" && contains(s.selectionRange, pos));
  if (def) return [symbolItem(uri, def)];
  const call = a.sites.find((c) => contains(c.range, pos));
  return call ? targets(call.name, a, ctx).map(defItem) : [];
}

/**
 * Every call to the item's macro in `files` (its file and whatever else may call it), grouped by
 * the definition each is in, or the file's top level.
 */
export function incomingCalls(item: TfCallItem, files: ContextFile[]): TfIncomingCall[] {
  if (item.kind !== "macro") return [];
  const out: TfIncomingCall[] = [];
  for (const file of files) {
    const a = analyse(file.uri, file.text);
    const groups = new Map<TfSymbol | undefined, Range[]>();
    for (const site of a.sites) {
      if (!same(site.name, item.name)) continue;
      const from = enclosing(a, site.range.start);
      groups.set(from, [...(groups.get(from) ?? []), site.range]);
    }
    for (const [from, fromRanges] of groups) {
      out.push({ from: from ? symbolItem(file.uri, from) : fileItem(file.uri), fromRanges });
    }
  }
  return out.sort((x, y) => x.from.uri.localeCompare(y.from.uri) || compare(x.from.range.start, y.from.range.start));
}

/**
 * Every macro the item calls, grouped by the `/def` each call runs. `text` and `ctx` are the
 * item's file and its load path. Builtin commands and unknown names are left out.
 */
export function outgoingCalls(item: TfCallItem, text: string, ctx?: NavContext): TfOutgoingCall[] {
  const a = analyse(item.uri, text);
  const self =
    item.kind === "file" ? undefined : a.symbols.find((s) => compare(s.selectionRange.start, item.selectionRange.start) === 0);
  if (item.kind !== "file" && !self) return [];
  const groups = new Map<string, TfOutgoingCall>();
  for (const site of a.sites) {
    if (enclosing(a, site.range.start) !== self) continue;
    for (const def of targets(site.name, a, ctx)) {
      const key = `${def.uri}\0${def.symbol.selectionRange.start.line}\0${def.symbol.selectionRange.start.character}`;
      const group = groups.get(key);
      if (group) group.fromRanges.push(site.range);
      else groups.set(key, { to: defItem(def), fromRanges: [site.range] });
    }
  }
  return [...groups.values()];
}
