import { ALL_COMMANDS, type CommandSource } from "./data/commands";
import { COMMAND_DESCRIPTIONS } from "./data/commandDescriptions";
import { COMMAND_USAGES } from "./data/commandUsages.generated";
import { isCommentLine, splitRawLines } from "./logicalEntries";
import { getDocumentSymbols, type Position, type Range, type TfSymbol } from "./symbols";

/**
 * Single-file navigation: hover, go-to-definition and find-references for macro names.
 *
 * A name is used in three ways, all looked up case-insensitively — tf hashes macro names with
 * lcase() and compares them with cstrcmp() (tinyfugue/src/macro.c's macro_table, search.c's
 * hash_string(), util.c's cstrcmp()), so `/Foo` calls a macro defined as `foo`:
 *  - `/name ...` calls the macro if one is defined, the built-in otherwise (htmldoc
 *    topics/macros.html: a macro shadows a same-named builtin);
 *  - `/@name ...` always calls the built-in, never a macro, so it is never a reference to one;
 *  - `${name}` / `$name` substitutes the macro's body.
 * A `/` only starts a command at the start of a line or after whitespace, `;` or `|` (the
 * `%;`/`%|` separators) or `(` — the same boundary completion uses — so a path in
 * `/load %{d}/x.tf` or `/set d=/script` is not read as a call. Comment lines are skipped.
 *
 * Only `/def` defines a name you can call as `/name` (or substitute as `${name}`); `/alias`,
 * `/bind`, `/hook` and `/trig*` create macros reached some other way, so they are not
 * definition targets here.
 */

export type UsageKind = "call" | "builtin-call" | "substitution";

export interface NameUsage {
  name: string;
  kind: UsageKind;
  /** Just the name. */
  range: Range;
}

const NAME = "[^\\s%;=()\\[\\]{}\"'`$\\\\]+";
const CALL_RE = new RegExp(`(^|[\\s;|(])\\/(@?)(${NAME})`, "g");
const BRACED_SUBST_RE = /(?<!\$)\$\{([^}\s]+)\}/g;
const BARE_SUBST_RE = /(?<!\$)\$([A-Za-z_][A-Za-z0-9_]*)/g;

export function findUsages(text: string): NameUsage[] {
  const usages: NameUsage[] = [];
  splitRawLines(text).forEach((line, lineNo) => {
    if (isCommentLine(line)) return;
    const push = (name: string, kind: UsageKind, start: number): void => {
      usages.push({
        name,
        kind,
        range: { start: { line: lineNo, character: start }, end: { line: lineNo, character: start + name.length } },
      });
    };
    for (const m of line.matchAll(CALL_RE)) {
      const at = m[2] as string;
      const name = m[3] as string;
      const start = (m.index ?? 0) + (m[1] as string).length + 1 + at.length;
      push(name, at ? "builtin-call" : "call", start);
    }
    for (const m of line.matchAll(BRACED_SUBST_RE)) push(m[1] as string, "substitution", (m.index ?? 0) + 2);
    for (const m of line.matchAll(BARE_SUBST_RE)) push(m[1] as string, "substitution", (m.index ?? 0) + 1);
  });
  return usages;
}

function contains(range: Range, pos: Position): boolean {
  const afterStart = pos.line > range.start.line || (pos.line === range.start.line && pos.character >= range.start.character);
  const beforeEnd = pos.line < range.end.line || (pos.line === range.end.line && pos.character <= range.end.character);
  return afterStart && beforeEnd;
}

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

function macroDefinitions(symbols: TfSymbol[], name: string): TfSymbol[] {
  return symbols.filter((s) => s.kind === "def" && same(s.name, name));
}

interface Target {
  name: string;
  /** The usage under the cursor, or undefined when the cursor is on a /def's own name. */
  usage?: NameUsage;
  range: Range;
}

function targetAt(text: string, pos: Position, symbols: TfSymbol[]): Target | undefined {
  const usage = findUsages(text).find((u) => contains(u.range, pos));
  if (usage) return { name: usage.name, usage, range: usage.range };
  const def = symbols.find((s) => s.kind === "def" && contains(s.selectionRange, pos));
  return def && { name: def.name, range: def.selectionRange };
}

const COMMANDS = new Map(ALL_COMMANDS.map((c) => [c.name.toLowerCase(), c.source]));

const SOURCE_LABEL: Record<CommandSource, string> = {
  keyword: "tf control-flow keyword",
  builtin: "tf built-in command",
  stdlib: "stdlib.tf macro (always loaded)",
};

export interface TfHover {
  markdown: string;
  range: Range;
}

function commandHover(name: string): string | undefined {
  const key = name.toLowerCase();
  const source = COMMANDS.get(key);
  if (!source) return undefined;
  const usages = COMMAND_USAGES[key];
  const synopsis = usages ? "```tf\n" + usages.join("\n") + "\n```\n\n" : "";
  const description = COMMAND_DESCRIPTIONS[key];
  return `${synopsis}${description ? `${description}\n\n` : ""}${SOURCE_LABEL[source]} — \`/help ${key}\``;
}

const DOC_COMMENT_RE = /^\s*;;;(.*)$/;

/**
 * The `;;;` lines directly above a /def (no blank line between), with the `;;;` and one
 * following space removed — the convention stdlib.tf itself uses for its usage headers. Only
 * `;;;`, so ordinary `;;` notes and commented-out code (`;/...`) aren't shown as docs.
 */
export function docCommentAbove(lines: string[], defLine: number): string | undefined {
  const doc: string[] = [];
  for (let i = defLine - 1; i >= 0; i -= 1) {
    const m = DOC_COMMENT_RE.exec(lines[i] ?? "");
    if (!m) break;
    doc.unshift((m[1] as string).replace(/^ /, "").replace(/\s+$/, ""));
  }
  return doc.length > 0 ? doc.join("\n") : undefined;
}

export function getHover(text: string, pos: Position): TfHover | undefined {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target) return undefined;

  if (target.usage?.kind === "builtin-call") {
    const source = COMMANDS.get(target.name.toLowerCase());
    if (source !== "builtin" && source !== "keyword") return undefined;
    const doc = commandHover(target.name);
    return doc ? { markdown: `${doc}\n\n\`/@\` calls the built-in even if a macro has the same name.`, range: target.range } : undefined;
  }

  const defs = macroDefinitions(symbols, target.name);
  if (defs.length > 0) {
    const lines = defs.map((d) => `${d.detail} ${d.name}`).join("\n");
    const where = defs.map((d) => d.range.start.line + 1).join(", ");
    const source = COMMANDS.get(target.name.toLowerCase());
    const shadow =
      source === "builtin" || source === "keyword"
        ? `\n\nShadows the built-in \`/${target.name.toLowerCase()}\`; \`/@${target.name.toLowerCase()}\` calls the built-in.`
        : source === "stdlib"
          ? `\n\nRedefines stdlib.tf's \`/${target.name.toLowerCase()}\`.`
          : "";
    const rawLines = splitRawLines(text);
    const docs = defs.map((d) => docCommentAbove(rawLines, d.range.start.line)).filter((d) => d !== undefined);
    const doc = docs.length > 0 ? `${docs.join("\n\n")}\n\n` : "";
    return {
      markdown: "```tf\n" + lines + "\n```\n\n" + doc + `macro defined in this file (line ${where})${shadow}`,
      range: target.range,
    };
  }

  if (target.usage?.kind === "call") {
    const doc = commandHover(target.name);
    return doc ? { markdown: doc, range: target.range } : undefined;
  }
  return undefined;
}

/** Where `/name` (or `${name}`) under the cursor is defined: every `/def` of it in this file. */
export function getDefinition(text: string, pos: Position): Range[] {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];
  return macroDefinitions(symbols, target.name).map((d) => d.selectionRange);
}

/** Every call and substitution of the macro under the cursor, plus its /def names if asked. */
export function getReferences(text: string, pos: Position, includeDeclaration: boolean): Range[] {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];
  const uses = findUsages(text)
    .filter((u) => u.kind !== "builtin-call" && same(u.name, target.name))
    .map((u) => u.range);
  const decls = includeDeclaration ? macroDefinitions(symbols, target.name).map((d) => d.selectionRange) : [];
  return [...decls, ...uses].sort((a, b) => a.start.line - b.start.line || a.start.character - b.start.character);
}
