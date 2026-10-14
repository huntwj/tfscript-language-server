import type { Position, Range } from "./diagnostics";
import { isTfSpace, type LogicalEntry, splitLogicalEntries, splitRawLines } from "./logicalEntries";
import { macroBodyStart, parseRegions, type StructureMode } from "./structure";

/**
 * Expand and shrink selection (`textDocument/selectionRange`). For each position, the pieces of
 * text around it from the innermost out, each containing the one before:
 * - the word (a name), then the name with its `/` (a command);
 *  - a substitution's inside, then the substitution (`%{x}`, `%{x-default}`, `$[...]`,
 *    `$(...)`, `${...}`, `{x}` in an expression);
 *  - a string or a parenthesis in an expression, inside and whole, and an `/if` or `/while`
 *    condition, inside and with its parentheses;
 *  - the statement (between separators);
 *  - one part of a block's body (after a condition, `/then`, `/do` or `/else`), then the whole
 *    block from `/if` to `/endif` or `/while` to `/done`;
 *  - a macro's body, then the whole command across its continuation lines, then those lines;
 *  - the file.
 * It comes from the parser's own model of each command (structure.ts), so what counts as a
 * statement or a block is what the diagnostics use. Only the command holding a position is
 * parsed.
 */

export interface SelectionRangeNode {
  range: Range;
  parent?: SelectionRangeNode;
}

interface Piece {
  start: number;
  end: number;
}

export function getSelectionRanges(text: string, positions: Position[]): SelectionRangeNode[] {
  const lines = splitRawLines(text);
  const entries = splitLogicalEntries(text);
  const models = new Map<LogicalEntry, Piece[]>();
  const file: Range = { start: { line: 0, character: 0 }, end: lineEnd(lines, lines.length - 1) };

  return positions.map((pos) => {
    const entry = entries.find((e) => e.startLine <= pos.line && pos.line <= e.endLine);
    const ranges: Range[] = [];
    const part = entry ? entry.parts.findIndex((p) => p.line === pos.line) : -1;
    if (entry && part >= 0) {
      let pieces = models.get(entry);
      if (!pieces) {
        pieces = entryPieces(entry);
        models.set(entry, pieces);
      }
      const at = charAt(entry.text, offsetAt(entry, part, pos.character));
      for (const p of chain([...pieces, ...wordPieces(entry.text, at)], at)) {
        ranges.push(rangeOf(entry, p));
      }
    } else {
      // A blank or comment line, or a comment line inside a continued command.
      const raw = lines[pos.line] ?? "";
      const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      const at = charAt(line, Math.min(pos.character, line.length));
      for (const p of chain(wordPieces(line, at), at)) {
        ranges.push({ start: { line: pos.line, character: p.start }, end: { line: pos.line, character: p.end } });
      }
      ranges.push({ start: { line: pos.line, character: 0 }, end: { line: pos.line, character: line.length } });
    }
    if (entry) ranges.push({ start: { line: entry.startLine, character: 0 }, end: lineEnd(lines, entry.endLine) });
    ranges.push(file);
    return link(ranges, pos);
  });
}

/** Every piece of the command that a position might select, as offsets into `entry.text`. */
function entryPieces(entry: LogicalEntry): Piece[] {
  const s = entry.text;
  const pieces: Piece[] = [];
  const add = (start: number, end: number): void => {
    const a = skipBlanks(s, start);
    const b = trimEnd(s, end);
    if (b > a) pieces.push({ start: a, end: b });
  };
  const read = (mode: StructureMode, from: number): void => {
    const regions = parseRegions(s.slice(from), mode);
    for (const st of regions.statements) add(st.start + from, st.end + from);
    for (const ex of regions.expressions) {
      if (ex.kind !== "statement") continue;
      // The /test, /return or /result text, then the statement with its keyword.
      add(ex.start + from, ex.end + from);
      add(keywordBefore(s, ex.start + from), ex.end + from);
    }
    for (const span of regions.spans) {
      add(span.start + from, span.end + from);
      if (span.inner) add(span.inner.start + from, span.inner.end + from);
    }
    for (const block of regions.blocks) {
      add(block.start + from, block.end + from);
      for (const p of block.parts) add(p.start + from, withoutSeparator(s, p.end + from));
    }
  };
  read("top", 0);
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(s) : -1;
  if (body >= 0) {
    read("body", body);
    add(body, s.length);
  }
  add(0, s.length);
  return pieces;
}

/**
 * The character a cursor at `off` is taken to be on: the one after it, unless that is a blank
 * (or the end) and the one before isn't, as at the end of a word.
 */
function charAt(s: string, off: number): number {
  const after = off < s.length && !isTfSpace(s[off]);
  const before = off > 0 && !isTfSpace(s[off - 1]);
  if (after) return isWordChar(s[off]) || !before || !isWordChar(s[off - 1]) ? off : off - 1;
  return before ? off - 1 : off;
}

/** The word on `at` (a name), and the name with the `/` of a command. */
function wordPieces(s: string, at: number): Piece[] {
  const pieces: Piece[] = [];
  let a = at;
  let b = at;
  while (a > 0 && isWordChar(s[a - 1])) a -= 1;
  while (b < s.length && isWordChar(s[b])) b += 1;
  if (b > a) {
    pieces.push({ start: a, end: b });
    let slash = a;
    while (slash > 0 && (s[slash - 1] === "@" || s[slash - 1] === "!")) slash -= 1;
    if (s[slash - 1] === "/") pieces.push({ start: slash - 1, end: b });
  }
  return pieces;
}

/** The pieces holding the character `at`, smallest first, each strictly containing the one before. */
function chain(pieces: Piece[], at: number): Piece[] {
  const around = pieces
    .filter((p) => p.start <= at && at < p.end)
    .sort((x, y) => x.end - x.start - (y.end - y.start) || x.start - y.start);
  const out: Piece[] = [];
  for (const p of around) {
    const last = out[out.length - 1];
    if (!last || (p.start <= last.start && p.end >= last.end && (p.start < last.start || p.end > last.end))) out.push(p);
  }
  return out;
}

/** The offset in `entry.text` of `character` on the entry's `part`th physical line. */
function offsetAt(entry: LogicalEntry, part: number, character: number): number {
  let start = 0;
  for (let k = 0; k < part; k += 1) start += (entry.parts[k] as { text: string }).text.length;
  const text = (entry.parts[part] as { text: string }).text;
  const indent = text.length > 0 ? (entry.offsetMap[start] as Position).character : 0;
  return start + Math.max(0, Math.min(text.length, character - indent));
}

function rangeOf(entry: LogicalEntry, p: Piece): Range {
  const first = entry.offsetMap[p.start] as Position;
  const last = entry.offsetMap[p.end - 1] as Position;
  return { start: { ...first }, end: { line: last.line, character: last.character + 1 } };
}

/**
 * Nests the ranges, innermost first, dropping any that equals the one inside it, and any that
 * doesn't hold `pos` (a position in a continuation line's indentation, or after its `\`, lies
 * outside the command's text, so the pieces of text right around it don't hold it).
 */
function link(ranges: Range[], pos: Position): SelectionRangeNode {
  const kept: Range[] = [];
  for (const r of ranges) {
    const last = kept[kept.length - 1];
    if ((last && sameRange(last, r)) || !holds(r, pos)) continue;
    kept.push(r);
  }
  if (kept.length === 0) kept.push({ start: pos, end: pos });
  let node: SelectionRangeNode | undefined;
  for (let k = kept.length - 1; k >= 0; k -= 1) node = node ? { range: kept[k] as Range, parent: node } : { range: kept[k] as Range };
  return node as SelectionRangeNode;
}

function before(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.character <= b.character);
}

function holds(r: Range, pos: Position): boolean {
  return before(r.start, pos) && before(pos, r.end);
}

function sameRange(a: Range, b: Range): boolean {
  return (
    a.start.line === b.start.line &&
    a.start.character === b.start.character &&
    a.end.line === b.end.line &&
    a.end.character === b.end.character
  );
}

function lineEnd(lines: string[], line: number): Position {
  const raw = lines[line] ?? "";
  return { line, character: raw.endsWith("\r") ? raw.length - 1 : raw.length };
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && (/[A-Za-z0-9_~]/.test(ch) || ch.charCodeAt(0) >= 0x80);
}

function skipBlanks(s: string, p: number): number {
  let q = p;
  while (q < s.length && isTfSpace(s[q])) q += 1;
  return q;
}

function trimEnd(s: string, p: number): number {
  let q = p;
  while (q > 0 && isTfSpace(s[q - 1])) q -= 1;
  return q;
}

/** `p`, the end of a block part, pulled back over the `%;` (or `%|`, `%\`) that ends it. */
function withoutSeparator(s: string, p: number): number {
  const q = trimEnd(s, p);
  const sep = s[q - 1] === ";" || s[q - 1] === "|" || s[q - 1] === "\\";
  return sep && s[q - 2] === "%" && s[q - 3] !== "%" ? trimEnd(s, q - 2) : q;
}

/** Where the `/test`, `/return` or `/result` keyword before an expression statement starts. */
function keywordBefore(s: string, p: number): number {
  let q = p;
  while (q > 0 && isTfSpace(s[q - 1])) q -= 1;
  while (q > 0 && !isTfSpace(s[q - 1]) && s[q - 1] !== "/") q -= 1;
  return s[q - 1] === "/" ? q - 1 : p;
}
