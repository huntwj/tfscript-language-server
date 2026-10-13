import { ALL_COMMANDS, RESERVED_MACRO_NAMES, type CommandSource } from "./data/commands";
import { COMMAND_DESCRIPTIONS } from "./data/commandDescriptions";
import { COMMAND_USAGES } from "./data/commandUsages.generated";
import { isCommentLine, splitRawLines } from "./logicalEntries";
import { getDocumentSymbols, type Position, type Range, type TfSymbol } from "./symbols";
import type { HelpEntry } from "./workspace/tfHelp";

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
  /** An unbraced `$name`, which only allows identifier characters. */
  bare?: boolean;
}

const NAME ="[^\\s%;=()\\[\\]{}\"'`$\\\\]+";
// `/!name` runs /name and negates its result (stdlib.tf: `/if /!purge ...`), so the `!` is
// not part of the name.
export const CALL_RE = new RegExp(`(^|[\\s;|(])\\/(@?)(!?)(${NAME})`, "g");
const BRACED_SUBST_RE = /(?<!\$)\$\{([^}\s]+)\}/g;
const BARE_SUBST_RE = /(?<!\$)\$([A-Za-z_][A-Za-z0-9_]*)/g;

export function findUsages(text: string): NameUsage[] {
  const usages: NameUsage[] = [];
  splitRawLines(text).forEach((line, lineNo) => {
    if (isCommentLine(line)) return;
    const push = (name: string, kind: UsageKind, start: number, bare = false): void => {
      usages.push({
        name,
        kind,
        range: { start: { line: lineNo, character: start }, end: { line: lineNo, character: start + name.length } },
        ...(bare ? { bare } : {}),
      });
    };
    for (const m of line.matchAll(CALL_RE)) {
      const at = m[2] as string;
      const bang = m[3] as string;
      const name = m[4] as string;
      const start = (m.index ?? 0) + (m[1] as string).length + 1 + at.length + bang.length;
      push(name, at ? "builtin-call" : "call", start);
    }
    for (const m of line.matchAll(BRACED_SUBST_RE)) push(m[1] as string, "substitution", (m.index ?? 0) + 2);
    for (const m of line.matchAll(BARE_SUBST_RE)) push(m[1] as string, "substitution", (m.index ?? 0) + 1, true);
  });
  return usages;
}

function contains(range: Range, pos: Position): boolean {
  const afterStart = pos.line > range.start.line || (pos.line === range.start.line && pos.character >= range.start.character);
  const beforeEnd = pos.line < range.end.line || (pos.line === range.end.line && pos.character <= range.end.character);
  return afterStart && beforeEnd;
}


const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export interface Location {
  uri: string;
  range: Range;
}

/** Another file on this file's load path, for references. */
export interface ContextFile {
  uri: string;
  text: string;
}

/** A `/def` in some other file. */
export interface ExternalMacro {
  uri: string;
  /** How to name the file in a hover: a workspace-relative path, or a library file's name. */
  label: string;
  symbol: TfSymbol;
  /** That file's lines, for its `;;;` doc comment. */
  lines: string[];
  /** Part of tf's own library (TFLIBDIR) rather than the user's scripts. */
  library: boolean;
  /**
   * False for a library file that is not on this file's load path at all: shown as a hint
   * ("not loaded — /require it"), and as a last-resort definition target, never as a
   * reference.
   */
  loaded: boolean;
}

/**
 * What the rest of the workspace contributes. Without one, everything is single-file.
 * `uri` is the document's own URI, used in the returned locations.
 */
export interface NavContext {
  uri: string;
  files: ContextFile[];
  macros: ExternalMacro[];
  /** The installed tf-help, keyed by topic (`/let`), when a tf library is configured. */
  help?: ReadonlyMap<string, HelpEntry>;
}

export interface Def {
  uri: string;
  label?: string;
  symbol: TfSymbol;
  lines: string[];
  library: boolean;
  loaded: boolean;
}

/** A `/def` of a reserved name (`/def if`, `/def eval`) is refused by tf, so it defines nothing. */
export function definitionsOf(name: string, text: string, symbols: TfSymbol[], ctx: NavContext | undefined): Def[] {
  if (RESERVED_MACRO_NAMES.has(name.toLowerCase())) return [];
  const lines = splitRawLines(text);
  const local: Def[] = symbols
    .filter((s) => s.kind === "def" && same(s.name, name))
    .map((symbol) => ({ uri: ctx?.uri ?? "", symbol, lines, library: false, loaded: true }));
  const external: Def[] = (ctx?.macros ?? [])
    .filter((m) => same(m.symbol.name, name))
    .map((m) => ({ uri: m.uri, label: m.label, symbol: m.symbol, lines: m.lines, library: m.library, loaded: m.loaded }));
  return [...local, ...external];
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

export const COMMANDS = new Map(ALL_COMMANDS.map((c) => [c.name.toLowerCase(), c.source]));

const SOURCE_LABEL: Record<CommandSource, string> = {
  keyword: "tf control-flow keyword",
  builtin: "tf built-in command",
  stdlib: "stdlib.tf macro (always loaded)",
};

export interface TfHover {
  markdown: string;
  range: Range;
}

/**
 * A command's synopsis and description. The installed tf-help, when there is one, supplies
 * both (and covers library macros like /alias that aren't in the command tables); without it,
 * the synopsis comes from the htmldoc extraction shipped in this package. A hand-written
 * COMMAND_DESCRIPTIONS entry wins over tf-help's summary.
 */
function commandHover(name: string, help?: ReadonlyMap<string, HelpEntry>): string | undefined {
  const key = name.toLowerCase();
  const source = COMMANDS.get(key);
  const entry = help?.get(`/${key}`);
  if (!source && !entry) return undefined;
  const usages = entry && entry.usage.length > 0 ? entry.usage : COMMAND_USAGES[key];
  const synopsis = usages ? "```tf\n" + usages.join("\n") + "\n```\n\n" : "";
  const description = COMMAND_DESCRIPTIONS[key] || (entry?.summary && escapeMarkdown(entry.summary));
  const label = source ? `${SOURCE_LABEL[source]} — ` : "";
  return `${synopsis}${description ? `${description}\n\n` : ""}${label}\`/help ${key}\``;
}

/**
 * Text from a tf file or tf-help is plain text, not Markdown: `<name>` would otherwise be
 * dropped as an unknown HTML tag by the editor, and `kb_push`/`%*` would turn italic.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
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

function where(def: Def): string {
  const line = def.symbol.range.start.line + 1;
  if (!def.label) return `this file, line ${line}`;
  return `\`${def.label}\`${def.library ? " (tf library)" : ""} line ${line}`;
}

function describeDefs(defs: Def[]): string {
  const code = "```tf\n" + defs.map((d) => `${d.symbol.detail} ${d.symbol.name}`).join("\n") + "\n```\n\n";
  const docs = defs
    .map((d) => docCommentAbove(d.lines, d.symbol.range.start.line))
    .filter((d) => d !== undefined)
    .map((d) => d.split("\n").map(escapeMarkdown).join("  \n"));
  return code + (docs.length > 0 ? `${docs.join("\n\n")}\n\n` : "") + `defined in ${defs.map(where).join("; ")}`;
}

export function getHover(text: string, pos: Position, ctx?: NavContext): TfHover | undefined {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target) return undefined;
  const key = target.name.toLowerCase();
  const source = COMMANDS.get(key);

  if (target.usage?.kind === "builtin-call") {
    if (source !== "builtin" && source !== "keyword") return undefined;
    const doc = commandHover(target.name, ctx?.help);
    return doc ? { markdown: `${doc}\n\n\`/@\` calls the built-in even if a macro has the same name.`, range: target.range } : undefined;
  }

  const all = definitionsOf(target.name, text, symbols, ctx);
  const userDefs = all.filter((d) => d.loaded && !d.library);
  const libraryDefs = all.filter((d) => d.loaded && d.library);
  const unloaded = all.filter((d) => !d.loaded);

  if (userDefs.length > 0) {
    let note = "";
    if (source === "builtin") {
      note = `\n\nShadows the built-in \`/${key}\`; \`/@${key}\` calls the built-in.`;
    } else if (source === "stdlib" || libraryDefs.length > 0) {
      const from = libraryDefs[0]?.label ?? "stdlib.tf";
      note = `\n\nRedefines \`/${key}\` from \`${from}\`.`;
    }
    return { markdown: describeDefs(userDefs) + note, range: target.range };
  }

  const command = commandHover(target.name, ctx?.help);
  const withCommand = (rest: string): string => (command ? `${command}\n\n${rest}` : rest);

  if (libraryDefs.length > 0) {
    return { markdown: withCommand(describeDefs(libraryDefs)), range: target.range };
  }

  // A library macro the load path never reaches (e.g. /alias without /require alias.tf). A
  // name in the command tables is always available, so it never gets this note.
  if (unloaded.length > 0 && !source) {
    const first = unloaded[0] as Def;
    return {
      markdown: withCommand(describeDefs(unloaded)) + `\n\nNot loaded on this file's load path — \`/require ${first.label ?? ""}\` first.`,
      range: target.range,
    };
  }

  return command && target.usage?.kind === "call" ? { markdown: command, range: target.range } : undefined;
}

/**
 * Where `/name` (or `${name}`) under the cursor is defined: every `/def` of it in this file
 * and in the files on its load path — or, failing those, in a tf library file that isn't
 * loaded, so go-to-definition still finds `/alias` before its `/require alias.tf` is added.
 */
export function getDefinition(text: string, pos: Position, ctx?: NavContext): Location[] {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];
  const all = definitionsOf(target.name, text, symbols, ctx);
  const loaded = all.filter((d) => d.loaded);
  return (loaded.length > 0 ? loaded : all).map((d) => ({ uri: d.uri, range: d.symbol.selectionRange }));
}

/**
 * Every call and substitution of the macro under the cursor, in this file and the others on
 * its load path, plus the `/def` names if asked.
 */
export function getReferences(text: string, pos: Position, includeDeclaration: boolean, ctx?: NavContext): Location[] {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target || target.usage?.kind === "builtin-call") return [];

  const uses = (uri: string, fileText: string): Location[] =>
    findUsages(fileText)
      .filter((u) => u.kind !== "builtin-call" && same(u.name, target.name))
      .map((u) => ({ uri, range: u.range }));

  const decls = includeDeclaration
    ? definitionsOf(target.name, text, symbols, ctx)
        .filter((d) => d.loaded)
        .map((d) => ({ uri: d.uri, range: d.symbol.selectionRange }))
    : [];
  const all = [...decls, ...uses(ctx?.uri ?? "", text), ...(ctx?.files ?? []).flatMap((f) => uses(f.uri, f.text))];
  return all.sort(
    (a, b) =>
      a.uri.localeCompare(b.uri) || a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character,
  );
}

export interface TextEditAt {
  uri: string;
  range: Range;
  newText: string;
}

type RenameTarget = { ok: true; target: Target; defs: Def[]; symbols: TfSymbol[] } | { ok: false; reason: string };

function renameTarget(text: string, pos: Position, ctx: NavContext | undefined): RenameTarget {
  const symbols = getDocumentSymbols(text);
  const target = targetAt(text, pos, symbols);
  if (!target) return { ok: false, reason: "Put the cursor on a macro name to rename it." };
  if (target.usage?.kind === "builtin-call") {
    return { ok: false, reason: `/@${target.name} always calls the built-in, which can't be renamed.` };
  }
  const defs = definitionsOf(target.name, text, symbols, ctx).filter((d) => d.loaded);
  const library = defs.find((d) => d.library);
  if (library) {
    return { ok: false, reason: `/${target.name} is defined in tf's library (${library.label ?? "stdlib.tf"}), which isn't yours to rename.` };
  }
  if (defs.length === 0) {
    const builtin = COMMANDS.has(target.name.toLowerCase());
    return {
      ok: false,
      reason: builtin
        ? `/${target.name} is a tf command, not a macro defined in your scripts.`
        : `No /def of ${target.name} on this file's load path, so there is nothing to rename it consistently with.`,
    };
  }
  return { ok: true, target, defs, symbols };
}

const NEW_NAME_RE = new RegExp(`^${NAME}$`);
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** The range of the name under the cursor, if it can be renamed; otherwise why not. */
export function prepareRename(text: string, pos: Position, ctx?: NavContext): { range: Range; placeholder: string } | { error: string } {
  const r = renameTarget(text, pos, ctx);
  return r.ok ? { range: r.target.range, placeholder: r.target.name } : { error: r.reason };
}

/**
 * Renames a macro you defined: its `/def` names, and every `/name`, `${name}` and `$name` in
 * this file and the others on its load path. A bare `$old` becomes `${new}` when the new name
 * isn't a plain identifier, since only the braced form allows other characters.
 *
 * Not renamed, because nothing here can tell them from ordinary text: names inside strings or
 * built at runtime (`/undef name`, `ismacro("name")`, `/def ~body_%1`), and comments —
 * `;;;` doc lines included.
 */
export function getRenameEdits(text: string, pos: Position, newName: string, ctx?: NavContext): TextEditAt[] | { error: string } {
  const r = renameTarget(text, pos, ctx);
  if (!r.ok) return { error: r.reason };
  if (!NEW_NAME_RE.test(newName)) {
    return { error: `"${newName}" can't be a macro name here: no spaces, and none of % ; = ( ) [ ] { } " ' \` $ \\.` };
  }
  const { target, defs } = r;
  const self = ctx?.uri ?? "";
  const edits: TextEditAt[] = defs.map((d) => ({ uri: d.uri, range: d.symbol.selectionRange, newText: newName }));

  const usesIn = (uri: string, fileText: string): void => {
    for (const u of findUsages(fileText)) {
      if (u.kind === "builtin-call" || !same(u.name, target.name)) continue;
      if (u.bare && !IDENTIFIER_RE.test(newName)) {
        const start = { line: u.range.start.line, character: u.range.start.character - 1 };
        edits.push({ uri, range: { start, end: u.range.end }, newText: `\${${newName}}` });
      } else {
        edits.push({ uri, range: u.range, newText: newName });
      }
    }
  };
  usesIn(self, text);
  for (const f of ctx?.files ?? []) usesIn(f.uri, f.text);
  return edits;
}
