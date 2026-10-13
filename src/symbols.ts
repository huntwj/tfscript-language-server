import { DocumentSymbol, SymbolKind } from "vscode-languageserver/node";
import { isTfSpace, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";

/**
 * Document symbols: one per top-level entry that defines a macro, read off the same logical
 * entries diagnostics.ts uses (so backslash continuation and comment lines are already
 * handled). Each symbol's name is what tf itself would record for the macro:
 *  - `/def [options] NAME = body` — name parsing follows `macro_spec()` (tinyfugue/src/macro.c)
 *    and the option grammar in `nextopt()` (util.c): options are `-` words whose letters may
 *    group (`-iq`), string/number options (`t w h b B E A a f P T m p c n`) take their argument
 *    with no space, quoted with `"`, `'` or backtick (a `\` escapes the quote or another `\`),
 *    and `--` or a lone `-` ends the options; a `=` right after an option ends them too
 *    (`/def -t"foo"=bar`). The name is then everything up to the first `=`, trimmed. A /def
 *    with no name but a `-t`, `-h` or `-b` option is an anonymous trigger/hook/binding, and is
 *    shown under that pattern instead so it still appears in the outline.
 *  - `/bind KEY = body`, `/hook EVENT = body` — `split_args()` (command.c): everything before
 *    the first `=`, trimmed. `/hook`, `/hook on` and `/hook off` toggle hooks, defining nothing.
 *  - `/trig PATTERN = body`, `/trigc PROB PATTERN = body`, `/trigp PRI PATTERN = body`,
 *    `/trigpc PRI PROB PATTERN = body` — the stdlib.tf wrappers all end in `handle_trigpc_command`,
 *    which reads its leading numbers with `numarg()` then calls `split_args()` on the rest.
 *  - `/alias NAME body` — lib/tf/alias.tf's `/alias` defines `~alias_body_NAME`; the name is
 *    the first word, and with fewer than two words it lists aliases instead of defining one.
 *
 * Only an entry *starting* with one of these commands counts: a `/def` nested in another
 * command's body (`/if ... /def x = ...%; /endif`) is runtime work, not a top-level definition.
 */

export type TfSymbolKind = "def" | "alias" | "bind" | "hook" | "trig";

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface TfSymbol {
  name: string;
  kind: TfSymbolKind;
  /** The command word as written, lowercased, with its options for a /def: e.g. `/def -i`. */
  detail: string;
  /** The whole entry, first line start to last line end. */
  range: Range;
  /** Just the name, as it appears in the document. */
  selectionRange: Range;
}

const DEFINING_COMMAND_RE = /^\s*\/(def|alias|bind|hook|trigpc|trigc|trigp|trig)\b/i;

/** From macro_spec()'s startopt() string, minus the /list-only `usS` prefix. */
const DEF_OPTS_WITH_ARG = new Set(["p", "c", "b", "B", "E", "t", "w", "h", "A", "a", "f", "P", "T", "n", "m"]);

function isQuote(ch: string | undefined): boolean {
  return ch === '"' || ch === "'" || ch === "`";
}

function skipSpaces(text: string, i: number): number {
  while (i < text.length && isTfSpace(text[i])) i += 1;
  return i;
}

function skipWord(text: string, i: number): number {
  while (i < text.length && !isTfSpace(text[i])) i += 1;
  return i;
}

/** Mirrors stringliteral(): returns the index just past the closing quote (or text end if unmatched). */
function skipQuoted(text: string, i: number): number {
  const quote = text[i];
  i += 1;
  while (i < text.length && text[i] !== quote) {
    if (text[i] === "\\" && (text[i + 1] === quote || text[i + 1] === "\\")) i += 1;
    i += 1;
  }
  return i < text.length ? i + 1 : i;
}

interface DefOptions {
  end: number;
  trigger?: string;
  hook?: string;
  key?: string;
}

function skipDefOptions(text: string, i: number): DefOptions {
  const result: DefOptions = { end: i };
  while (true) {
    i = skipSpaces(text, i);
    if (text[i] !== "-") break;
    i += 1;
    if (text[i] === "-") i += 1;
    if (i >= text.length || isTfSpace(text[i])) {
      result.end = skipSpaces(text, i);
      return result;
    }
    while (i < text.length && !isTfSpace(text[i]) && text[i] !== "=") {
      const opt = text[i] as string;
      i += 1;
      if (!DEF_OPTS_WITH_ARG.has(opt)) continue;
      const argStart = i;
      i = isQuote(text[i]) ? skipQuoted(text, i) : skipWord(text, i);
      const raw = text.slice(argStart, i);
      const value = isQuote(raw[0]) && raw.length >= 2 && raw.endsWith(raw[0] as string) ? raw.slice(1, -1) : raw;
      if (opt === "t") result.trigger = value;
      else if (opt === "h") result.hook = value;
      else if (opt === "b" || opt === "B") result.key = value;
    }
    result.end = i;
  }
  result.end = i;
  return result;
}

interface NameSpan {
  start: number;
  end: number;
}

function trimSpan(text: string, start: number, end: number): NameSpan | undefined {
  while (start < end && isTfSpace(text[start])) start += 1;
  while (end > start && isTfSpace(text[end - 1])) end -= 1;
  return end > start ? { start, end } : undefined;
}

/** Everything from `from` up to the first `=` (or the end), trimmed — what split_args() calls the pattern. */
function spanBeforeEquals(text: string, from: number): NameSpan | undefined {
  const eq = text.indexOf("=", from);
  return trimSpan(text, from, eq === -1 ? text.length : eq);
}

interface Found {
  kind: TfSymbolKind;
  detail: string;
  name: string;
  span?: NameSpan;
}

function findDefinition(text: string): Found | undefined {
  const m = DEFINING_COMMAND_RE.exec(text);
  if (!m) return undefined;
  const command = (m[1] as string).toLowerCase();
  const commandStart = m[0].length - command.length - 1;
  let i = m[0].length;

  switch (command) {
    case "def": {
      const opts = skipDefOptions(text, i);
      const span = spanBeforeEquals(text, opts.end);
      const detail = text.slice(commandStart, opts.end).trim().replace(/\s+/g, " ");
      if (span) return { kind: "def", detail, name: text.slice(span.start, span.end), span };
      if (opts.trigger !== undefined) return { kind: "trig", detail: `${detail} (anonymous trigger)`, name: opts.trigger };
      if (opts.hook !== undefined) return { kind: "hook", detail: `${detail} (anonymous hook)`, name: opts.hook };
      if (opts.key !== undefined) return { kind: "bind", detail: `${detail} (anonymous binding)`, name: opts.key };
      return undefined;
    }
    case "alias": {
      const nameStart = skipSpaces(text, i);
      const nameEnd = skipWord(text, nameStart);
      if (nameEnd === nameStart) return undefined;
      if (skipWord(text, skipSpaces(text, nameEnd)) === skipSpaces(text, nameEnd)) return undefined;
      return { kind: "alias", detail: "/alias", name: text.slice(nameStart, nameEnd), span: { start: nameStart, end: nameEnd } };
    }
    case "hook": {
      const rest = text.slice(i).trim().toLowerCase();
      if (rest === "" || rest === "on" || rest === "off") return undefined;
      const span = spanBeforeEquals(text, i);
      return span && { kind: "hook", detail: "/hook", name: text.slice(span.start, span.end), span };
    }
    case "bind": {
      const span = spanBeforeEquals(text, i);
      return span && { kind: "bind", detail: "/bind", name: text.slice(span.start, span.end), span };
    }
    default: {
      const leadingNumbers = command === "trigpc" ? 2 : command === "trig" ? 0 : 1;
      for (let n = 0; n < leadingNumbers; n += 1) i = skipWord(text, skipSpaces(text, i));
      const span = spanBeforeEquals(text, i);
      return span && { kind: "trig", detail: `/${command}`, name: text.slice(span.start, span.end), span };
    }
  }
}

function spanToRange(entry: LogicalEntry, span: NameSpan): Range | undefined {
  const start = entry.offsetMap[span.start];
  const last = entry.offsetMap[span.end - 1];
  if (!start || !last) return undefined;
  return { start, end: { line: last.line, character: last.character + 1 } };
}

export function getDocumentSymbols(text: string): TfSymbol[] {
  const lines = splitRawLines(text);
  const symbols: TfSymbol[] = [];

  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    const found = findDefinition(entry.text);
    if (!found) continue;

    const range: Range = {
      start: { line: entry.startLine, character: 0 },
      end: { line: entry.endLine, character: (lines[entry.endLine] ?? "").length },
    };
    const commandRange = spanToRange(entry, { start: 0, end: Math.min(entry.text.length, 1) }) ?? range;
    const selectionRange = (found.span && spanToRange(entry, found.span)) ?? commandRange;

    symbols.push({ name: found.name, kind: found.kind, detail: found.detail, range, selectionRange });
  }

  return symbols;
}

const LSP_KIND: Record<TfSymbolKind, SymbolKind> = {
  def: SymbolKind.Function,
  alias: SymbolKind.Function,
  bind: SymbolKind.Key,
  hook: SymbolKind.Event,
  trig: SymbolKind.Event,
};

export function toDocumentSymbol(symbol: TfSymbol): DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: LSP_KIND[symbol.kind],
    range: symbol.range,
    selectionRange: symbol.selectionRange,
  };
}
