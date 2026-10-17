import type { Range, TfTextEdit } from "./diagnostics";
import { hasInnerTab, normalise, programText, rejoin, splitEntry, topLevelSeparators } from "./formatting";
import { isCommentLine, leadingWhitespaceLength, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { checkStructure, macroBodyStart, parseStatements } from "./structure";
import { getDocumentSymbols, type TfSymbol, type TfSymbolKind } from "./symbols";

/**
 * Refactorings that move a macro body between one line and a `\`-continued block of lines,
 * without changing what tf runs.
 *
 * Split is the formatter's layout for one entry (formatting.ts): each `%;` statement on its own
 * line ending `%;\`, the body starting on the line after the head, each block's children indented.
 * Join is the reverse: the text tf itself reads from the lines (load_file() strips each line's
 * leading blanks and drops the `\`), with one blank after each `%;`.
 *
 * Both rest on two facts proven against real tf: a continued entry is the concatenation of its
 * lines with their indentation removed, and inside a macro body the blanks beside a `%;` are
 * dropped when it runs (formatting.ts). Each action is offered only when the result reads back
 * as the same program: the same head, the same body once separator blanks are dropped, the same
 * statements, and the same structural problems (none, usually).
 *
 * Never offered for:
 *  - a line ending in a carriage return (CRLF): tf only continues a line whose very last
 *    character is `\`, so a `\` before the `\r` continues nothing and a body can't be split;
 *  - an entry with a tab after its indentation: tf expands tabs by column, so moving the text
 *    to another column changes it (formatting.ts, hasInnerTab);
 *  - a continued entry with comment lines between its lines: tf skips them, but joining would
 *    delete them;
 *  - an entry the file ends in the middle of (a final `\`), which tf never runs.
 */

export interface TfRefactorAction {
  title: string;
  edits: TfTextEdit[];
}

const DEFAULT_INDENT = "    ";

/** The file's indentation unit: the smallest indentation of a continuation line, or four spaces. */
export function detectIndent(text: string): string {
  let best: string | undefined;
  const lines = splitRawLines(text);
  for (const entry of splitLogicalEntries(text)) {
    if (entry.parts.length < 2) continue;
    for (const part of entry.parts.slice(1)) {
      const line = lines[part.line] ?? "";
      const lead = line.slice(0, leadingWhitespaceLength(line)).replace(/\r/g, "");
      if (lead === "" || isCommentLine(line)) continue;
      if (lead.startsWith("\t")) return "\t";
      if (best === undefined || lead.length < best.length) best = lead;
    }
  }
  return best ?? DEFAULT_INDENT;
}

/** One line holding the entry's text, with one blank after each `%;` in the body. */
export function joinedLine(entry: LogicalEntry, firstLine: string): string | undefined {
  const body = macroBodyStart(entry.text);
  if (body < 0) return undefined;
  const text = normalise(entry.text, body);
  const seps = topLevelSeparators(text).filter((s) => s >= body && s + 2 < text.length);
  let out = "";
  let from = 0;
  for (const s of seps) {
    out += `${text.slice(from, s + 2)} `;
    from = s + 2;
  }
  out += text.slice(from);
  return firstLine.slice(0, leadingWhitespaceLength(firstLine)) + out;
}

/** Whether two entries' texts are the same program to tf. */
export function sameProgram(a: string, b: string): boolean {
  const bodyA = macroBodyStart(a);
  const bodyB = macroBodyStart(b);
  if (bodyA < 0 || bodyB < 0) return false;
  if (programText(a, bodyA) !== programText(b, bodyB)) return false;
  const statements = (t: string, body: number): string[] =>
    parseStatements(t.slice(body), "body").map((st) => `${st.level}:${st.conditional}:${t.slice(body + st.start, body + st.end).trim()}`);
  if (statements(a, bodyA).join("\n") !== statements(b, bodyB).join("\n")) return false;
  const issues = (t: string, body: number): string => checkStructure(t.slice(body), "body").map((i) => `${i.kind}:${i.message}`).join("\n");
  return issues(a, bodyA) === issues(b, bodyB);
}

/**
 * Whether a tab sits in text that splitting or joining moves to another column (see
 * hasInnerTab): anywhere after the indentation of a later line, or in the body part of the first.
 * A tab in the head (`/def -i true<tab>= ...`, as tf's own library writes them) stays put.
 */
function tabMoves(entry: LogicalEntry, original: string[], body: number): boolean {
  const first = original[0] ?? "";
  const firstPart = entry.parts[0]?.text ?? "";
  const headEnd = body <= firstPart.length ? leadingWhitespaceLength(first) + body : first.length;
  if (first.slice(headEnd).includes("\t")) return true;
  return hasInnerTab(original.slice(1));
}

function overlapsLines(entry: LogicalEntry, range: Range): boolean {
  return entry.startLine <= range.end.line && entry.endLine >= range.start.line;
}

function wholeLines(entry: LogicalEntry, original: string[], newText: string): TfTextEdit {
  const last = original[original.length - 1] ?? "";
  return { range: { start: { line: entry.startLine, character: 0 }, end: { line: entry.endLine, character: last.length } }, newText };
}

const UNNAMED: Record<TfSymbolKind, string> = { def: "this macro's", alias: "this alias's", trig: "this trigger's", hook: "this hook's", bind: "this key binding's" };

/** Whose body an action moves: `/foo's` for a named macro or alias, else what kind of body it is. */
function owner(symbol: TfSymbol | undefined): string {
  if (!symbol) return "the";
  return symbol.kind === "def" || symbol.kind === "alias" ? `/${symbol.name}'s` : UNNAMED[symbol.kind];
}

/** Split or join actions for the macro-defining entries the range touches. */
export function getRefactorActions(text: string, range: Range, indent = detectIndent(text)): TfRefactorAction[] {
  const lines = splitRawLines(text);
  const actions: TfRefactorAction[] = [];
  const symbols = new Map(getDocumentSymbols(text).map((s) => [s.range.start.line, s]));
  for (const entry of splitLogicalEntries(text)) {
    if (!overlapsLines(entry, range)) continue;
    if (entry.incomplete || !(entry.isDefBody || entry.isOtherMacroBody)) continue;
    const original = lines.slice(entry.startLine, entry.endLine + 1);
    if (original.some((l) => l.includes("\r")) || tabMoves(entry, original, macroBodyStart(entry.text))) continue;

    if (entry.parts.length === 1) {
      const split = splitEntry(entry, original, indent, { headTabs: true });
      if (!split || split.length < 2) continue;
      const joinedBack = splitLogicalEntries(split.join("\n"))[0];
      const back = joinedBack && joinedLine(joinedBack, split[0] ?? "");
      if (!sameProgram(entry.text, rejoin(split)) || back === undefined || !sameProgram(entry.text, rejoin([back]))) continue;
      actions.push({ title: `Split ${owner(symbols.get(entry.startLine))} body onto separate lines`, edits: [wholeLines(entry, original, split.join("\n"))] });
      continue;
    }

    // Comment lines between the entry's lines would be lost.
    if (!entry.parts.every((p, i) => p.line === entry.startLine + i)) continue;
    const line = joinedLine(entry, original[0] ?? "");
    if (line === undefined || !sameProgram(entry.text, rejoin([line]))) continue;
    // The joined line must read back as one entry: not a comment, and not ending in a `\`.
    const reread = splitLogicalEntries(line);
    if (reread.length !== 1 || reread[0]?.parts.length !== 1) continue;
    actions.push({ title: `Join ${owner(symbols.get(entry.startLine))} body onto one line`, edits: [wholeLines(entry, original, line)] });
  }
  return actions;
}
