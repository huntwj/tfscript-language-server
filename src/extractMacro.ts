import { ALL_COMMANDS } from "./data/commands";
import { FUNCTIONS } from "./data/functions.generated";
import type { Position, Range, TfTextEdit } from "./diagnostics";
import { splitEntry } from "./formatting";
import { isBlankLine, isTfSpace, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { macroBodyStart, parseUnits, type Unit } from "./structure";
import { defIsInvisible, getDocumentSymbols, type TfSymbol } from "./symbols";
import { isNameChar, readSelector } from "./variables";

/**
 * "Extract to a new macro": moves statements of a macro body into a `/def` of their own, placed
 * just above the macro (and its `;;;` doc comment), and leaves a call to it in their place.
 *
 * The selection has to cover whole statements, or whole `/if`...`/endif` and `/while`...`/done`
 * blocks, that run one after another in the same list: the body itself, or one branch or loop
 * body of a block. Anything else (half a statement or block, a condition list, the inside of a
 * `$(...)`) isn't offered.
 *
 * What makes the call run the same as the statements did, each proven in real tf
 * (tf_script_check, 2026-10-14):
 *  - The new body is the same text at the same level: a top-level `/def` body, as the macro's own
 *    was, so its `%`s, `$[...]`s and `\`s are substituted the same way when it runs.
 *  - tf's scoping is dynamic: a macro called from another sees the caller's `/let` locals, and an
 *    assignment in an expression (`x := 1`, `++x`) sets the nearest one, the caller's included
 *    (hsetnearestvar()). So reads and assignments in the moved statements still reach the caller's.
 *  - Called as `/name %*`, it gets the caller's arguments word for word: `%1`, `%*`, `%#`, `%L`,
 *    `%L2`, `%-1`, `%-L`, `{#}`, `{1}`, `{*}` and the braced and defaulted forms all came out the
 *    same, with arguments holding `"`, `%;`, `%%`, `$[...]` and `\`, and in a trigger's and a
 *    hook's body. `%Pn` reads the caller's last regexp match, and `%?` its last result.
 *  - After the call, `%?` is the new macro's last command's result: what it was before.
 *
 * And what doesn't, so the action is shown disabled with the reason:
 *  - A `/let` in the moved statements makes a local of the new macro, gone when it returns (a
 *    callee's `/let z` left the caller's `%z` empty): refused when the rest of the body names it,
 *    or runs anything that might read it through the same dynamic scoping (a macro, `/eval`...).
 *  - `regmatch()` in the new macro sets `%P1`... only for it: the caller's `%P1` afterwards was
 *    still its own match. Refused when the rest of the body reads `%P`.
 *  - `/return`, `/result` and `/exit` would end the new macro instead, `/shift` would shift its
 *    arguments, `getopts()` would read its arguments and set its locals, `%0` would be its name,
 *    and a `/break` that isn't inside a `/while` in the selection would end it instead of a loop.
 *  - A `%|` or `%\` beside the selection ties it to the next statement.
 *  - A tab after a line's indentation: tf turns it into spaces by column, and the column moves.
 *  - A file with CRLF line endings, where a `\` never continues a line (like the formatter).
 */

export interface TfExtractAction {
  title: string;
  edits: TfTextEdit[];
  /** Why the selection can't be extracted, when it can't. */
  disabled?: string;
}

export interface ExtractOptions {
  /** Whether a macro (lower case) already exists where this file runs; this file's own and tf's are always checked. */
  isTaken?: (name: string) => boolean;
  /** One level of indentation, for the new macro's body. */
  indent?: string;
}

const TITLE = "Extract to a new macro";

const COMMAND_NAMES: ReadonlySet<string> = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
const FUNCTION_NAMES: ReadonlySet<string> = new Set(FUNCTIONS.map((f) => f.name));
/** Commands that run text of their own, here and now or later, in which a macro may read the caller's locals. */
const RUNS_TEXT = new Set(["eval", "for", "repeat", "trigger", "not", "quote"]);
const ENDS_MACRO = new Set(["return", "result", "exit"]);
const ALIAS_RE = /^\s*\/alias\b/i;

function compare(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

/** `end` pulled back over the blanks before it, but not over one escaped with `\`. */
function trimEnd(s: string, start: number, end: number): number {
  let e = end;
  while (e > start && isTfSpace(s[e - 1]) && s[e - 2] !== "\\") e -= 1;
  return e;
}

/** The selection as offsets into the entry's text: the characters it covers. */
function selected(entry: LogicalEntry, range: Range): { from: number; to: number } {
  let from = entry.text.length;
  let to = 0;
  entry.offsetMap.forEach((p, k) => {
    if (compare(p, range.start) >= 0 && compare(p, range.end) < 0) {
      from = Math.min(from, k);
      to = Math.max(to, k + 1);
    }
  });
  return { from, to };
}

/** The positional selectors (`1`, `*`, `L2`, `#`, `0`...) the text substitutes, as a macro body would. */
function positionals(s: string): string[] {
  const found: string[] = [];
  const add = (at: number): void => {
    const sel = readSelector(s, at);
    if (sel && sel.name === undefined) found.push(s.slice(sel.nameStart, sel.nameEnd));
  };
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === "\\") {
      i += 1;
    } else if (c === "%") {
      let n = 1;
      while (s[i + n] === "%") n += 1;
      if (n === 1 && !";|\\".includes(s[i + 1] ?? ";")) add(i + 1);
      i += n - 1;
    } else if (c === "{" && s[i - 1] !== "%" && s[i - 1] !== "$") {
      // `{1}` in an expression (or plain text, which only makes this more careful).
      add(i);
    }
  }
  return found;
}

/** Whether `name` appears in `text` as a whole name (not part of a longer one). */
function mentions(text: string, name: string): boolean {
  let at = text.indexOf(name);
  while (at >= 0) {
    if (!isNameChar(text[at - 1]) && !isNameChar(text[at + name.length])) return true;
    at = text.indexOf(name, at + 1);
  }
  return false;
}

/** A name called as a function that isn't one of tf's, which tf then runs as a macro. */
function macroFunctionCall(text: string): string | undefined {
  for (const m of text.matchAll(/(^|[^\w%$])([A-Za-z_]\w*)\s*\(/g)) {
    const name = m[2] as string;
    if (!FUNCTION_NAMES.has(name)) return name;
  }
  return undefined;
}

/** What the outside of the body runs that may read the caller's locals: a macro, or text it runs. */
function readerOutside(outside: Unit[], outsideText: string): string | undefined {
  for (const u of outside) {
    if (u.word === "" || u.block) continue;
    if (!COMMAND_NAMES.has(u.word) || RUNS_TEXT.has(u.word)) return `/${u.word}`;
  }
  const fn = macroFunctionCall(outsideText);
  return fn === undefined ? undefined : `${fn}()`;
}

/** The variable a `/let` statement sets, as written, or "" when its name is built when it runs. */
function letName(text: string): string {
  const m = /^\/[@!]*let\s+([^\s=]*)/i.exec(text);
  const name = m?.[1] ?? "";
  return /[%$\\{]/.test(name) ? "" : name;
}

function isDefEntry(entry: LogicalEntry): boolean {
  return (entry.isDefBody || entry.isOtherMacroBody) && !ALIAS_RE.test(entry.text);
}

/** Who the body belongs to, for messages: `/foo`, or "this trigger" and the like. */
function ownerName(symbol: TfSymbol | undefined): string {
  if (symbol?.kind === "def") return `/${symbol.name}`;
  if (symbol?.kind === "trig") return "this trigger";
  if (symbol?.kind === "hook") return "this hook";
  if (symbol?.kind === "bind") return "this key binding";
  return "this macro";
}

/** The new macro's name: `<macro>_extracted`, numbered past any name already taken. */
function newName(symbol: TfSymbol | undefined, taken: (name: string) => boolean): string {
  const base = symbol?.kind === "def" && /^[^\s%$=]+$/.test(symbol.name) ? `${symbol.name}_extracted` : "extracted";
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? base : `${base}${n}`;
    if (!taken(name.toLowerCase())) return name;
  }
}

/** Apply edits (non-overlapping) to text. */
function applyEdits(text: string, edits: TfTextEdit[]): string {
  const lines = splitRawLines(text);
  const starts: number[] = [];
  let at = 0;
  for (const l of lines) {
    starts.push(at);
    at += l.length + 1;
  }
  const off = (p: Position): number => (starts[p.line] ?? text.length) + p.character;
  let out = text;
  for (const e of [...edits].sort((a, b) => off(b.range.start) - off(a.range.start))) {
    out = out.slice(0, off(e.range.start)) + e.newText + out.slice(off(e.range.end));
  }
  return out;
}

type Plan = { disabled: string } | { name: string; edits: TfTextEdit[] };

function plan(text: string, lines: string[], entry: LogicalEntry, range: Range, symbol: TfSymbol | undefined, options: ExtractOptions): Plan | undefined {
  const body = macroBodyStart(entry.text);
  if (body < 0) return undefined;
  const { from, to } = selected(entry, range);
  if (from >= to || from < body) return undefined;
  const bodyText = entry.text.slice(body);
  const parsed = parseUnits(bodyText);
  if (!parsed.complete) return undefined;
  const s = from - body;
  const e = to - body;
  const end = (u: Unit): number => trimEnd(bodyText, u.start, u.end);

  // The statements and blocks the selection covers, outermost only, all in one list.
  const covered = parsed.units.filter((u) => u.start >= s && end(u) <= e && (end(u) > u.start || (u.start > s && u.start < e)));
  const chosen = covered.filter((u) => !covered.some((o) => o !== u && o.start <= u.start && end(o) >= end(u) && (o.start < u.start || end(o) > end(u))));
  if (chosen.length === 0) return undefined;
  const list = chosen[0]?.list as number;
  if (chosen.some((u) => u.list !== list)) return undefined;
  chosen.sort((a, b) => a.start - b.start);
  const inList = parsed.units.filter((u) => u.list === list).sort((a, b) => a.start - b.start);
  const firstAt = inList.indexOf(chosen[0] as Unit);
  if (chosen.some((u, k) => inList[firstAt + k] !== u)) return undefined;
  // Nothing else selected but blanks and the separators between them.
  for (let k = s; k < e; ) {
    const inside = chosen.find((u) => k >= u.start && k < end(u));
    if (inside) k = end(inside);
    else if (isTfSpace(bodyText[k])) k += 1;
    else if (bodyText[k] === "%" && ";|\\".includes(bodyText[k + 1] ?? " ") && bodyText[k - 1] !== "%") k += 2;
    else return undefined;
  }

  const kind = parsed.lists[list]?.kind;
  if (kind === "cmdsub") return { disabled: "Statements inside a $(...) can't be extracted: select the whole statement the $(...) is in." };
  if (kind === "condition") return { disabled: "A condition list can't be extracted on its own: select the whole /if or /while." };

  const owner = ownerName(symbol);
  const xStart = (chosen[0] as Unit).start;
  const xEnd = end(chosen[chosen.length - 1] as Unit);
  const moved = bodyText.slice(xStart, xEnd);
  const within = parsed.units.filter((u) => u.start >= xStart && end(u) <= xEnd);
  const outside = parsed.units.filter((u) => end(u) <= xStart || u.start >= xEnd);
  const outsideText = `${bodyText.slice(0, xStart)} ${bodyText.slice(xEnd)}`;

  if (moved.includes("\t")) {
    return { disabled: "The selection has a tab after a line's indentation, which tf reads as a different number of spaces in another column: replace it with spaces first." };
  }
  // A %| or %\ beside the selection joins it to the statement on that side.
  let before = xStart;
  while (before > 0 && isTfSpace(bodyText[before - 1])) before -= 1;
  let after = xEnd;
  while (isTfSpace(bodyText[after])) after += 1;
  const tie = (at: number): boolean => bodyText[at] === "%" && (bodyText[at + 1] === "|" || bodyText[at + 1] === "\\") && bodyText[at - 1] !== "%";
  if ((before >= 2 && tie(before - 2)) || tie(after)) {
    return { disabled: "A %| or %\\ ties the selection to the statement next to it: select that statement too, or neither." };
  }

  for (const u of within) {
    if (ENDS_MACRO.has(u.word)) return { disabled: `/${u.word} in the selection would end the new macro, not ${owner}: leave it out of the selection.` };
    if (u.word === "shift") return { disabled: `/shift in the selection would shift the new macro's arguments, not ${owner}'s: leave it out of the selection.` };
    if (u.word === "break") {
      const n = Number(/^\/[@!]*break\s*(\d*)/i.exec(bodyText.slice(u.start, u.end))?.[1] || "1");
      const loops = within.filter((w) => w.block && w.word === "while" && w.start < u.start && end(w) >= end(u)).length;
      if (loops < n) return { disabled: `This /break would end the new macro, not the loop it is in: select the whole /while.` };
    }
  }
  if (/(^|[^\w])getopts\s*\(/.test(moved)) {
    return { disabled: `getopts() reads the running macro's arguments and sets its locals, so in a new macro it would read and set the wrong ones: leave it out of the selection.` };
  }
  const selectors = positionals(moved);
  if (selectors.some((p) => /^0+$/.test(p))) {
    return { disabled: `%0 is the running macro's name, which in the new macro would be its own: leave it out of the selection.` };
  }
  if (/(^|[^\w])regmatch\s*\(/.test(moved) && /%\{?P|\{P/.test(outsideText)) {
    return { disabled: `regmatch() in the selection would set %P1 and the rest only inside the new macro, but ${owner} reads them outside it: keep the regmatch() outside the selection.` };
  }
  for (const u of within.filter((w) => w.word === "let")) {
    const name = letName(bodyText.slice(u.start, u.end));
    if (name === "") return { disabled: "A /let in the selection sets a variable whose name is built when it runs, and it would be the new macro's local: keep it outside the selection." };
    if (mentions(outsideText, name)) {
      return { disabled: `${name} is /let in the selection, so it would be the new macro's local, gone when it returns, but ${owner} uses it outside the selection: keep the /let outside the selection.` };
    }
    const reader = readerOutside(outside, outsideText);
    if (reader) {
      return {
        disabled: `${name} is /let in the selection, so it would be the new macro's local, gone when it returns, but ${owner} also runs ${reader}, which may read it through tf's dynamic scoping: keep the /let outside the selection.`,
      };
    }
  }

  // The new macro, laid out like the formatter would, and the call that replaces the selection.
  const own = new Set([...getDocumentSymbols(text)].filter((sym) => sym.kind === "def").map((sym) => sym.name.toLowerCase()));
  const taken = (n: string): boolean => COMMAND_NAMES.has(n) || own.has(n) || (options.isTaken?.(n) ?? false);
  const name = newName(symbol, taken);
  const head = entry.text.slice(0, body);
  const defAt = head.search(/\/def\b/i);
  const invisible = defAt >= 0 && defIsInvisible(head, defAt + 4);
  const line = `/def ${invisible ? "-i " : ""}${name} = ${moved}`;
  const lineEntry = splitLogicalEntries(line)[0];
  if (!lineEntry || lineEntry.parts.length !== 1 || lineEntry.text !== line) return undefined;
  const split = splitEntry(lineEntry, [line], options.indent ?? "    ", { headTabs: true });
  // splitEntry() only lays it out when that joins back to the same program.
  const defLines = split && split.length > 1 ? split : [line];
  // `%Pn` (the last regexp match) and `%?` (the last result) aren't arguments.
  const call = `/${name}${selectors.some((p) => p !== "?" && !p.startsWith("P")) ? " %*" : ""}`;

  const startPos = entry.offsetMap[body + xStart];
  const lastPos = entry.offsetMap[body + xEnd - 1];
  if (!startPos || !lastPos) return undefined;
  if (!entry.parts.some((p) => p.line === lastPos.line) || entry.parts.filter((p) => p.line >= startPos.line && p.line <= lastPos.line).length !== lastPos.line - startPos.line + 1) {
    return { disabled: "The selection has comment lines between its lines, which would be lost: move them out of the selection first." };
  }
  let insertLine = entry.startLine;
  while (insertLine > 0 && /^\s*;;;/.test(lines[insertLine - 1] ?? "")) insertLine -= 1;
  const gap = insertLine > 0 && !isBlankLine(lines[insertLine - 1] ?? "") ? "\n" : "";
  const edits: TfTextEdit[] = [
    { range: { start: { line: insertLine, character: 0 }, end: { line: insertLine, character: 0 } }, newText: `${gap}${defLines.join("\n")}\n\n` },
    { range: { start: startPos, end: { line: lastPos.line, character: lastPos.character + 1 } }, newText: call },
  ];

  // Check the result reads back as planned: the new macro's body is the moved text, and the macro
  // is its old text with the call in place of it.
  const after2 = splitLogicalEntries(applyEdits(text, edits));
  const added = (gap ? 1 : 0) + defLines.length + 1;
  const newDef = after2.find((x) => x.startLine === insertLine + (gap ? 1 : 0));
  const newOwner = after2.find((x) => x.startLine === entry.startLine + added);
  const expected = entry.text.slice(0, body + xStart) + call + entry.text.slice(body + xEnd);
  if (!newDef || !newOwner || newOwner.text !== expected) return undefined;
  const newBody = macroBodyStart(newDef.text);
  if (newBody < 0 || newDef.text.slice(0, newBody) !== line.slice(0, macroBodyStart(line))) return undefined;
  const normal = (t: string): string => t.replace(/[ \t]*%;[ \t]*/g, "%;").trim();
  if (normal(newDef.text.slice(newBody)) !== normal(moved)) return undefined;
  if (!parseUnits(newOwner.text.slice(body)).complete || !parseUnits(newDef.text.slice(newBody)).complete) return undefined;
  return { name, edits };
}

/** The "Extract to a new macro" action for a selection in a macro body, if it covers whole statements. */
export function getExtractActions(text: string, range: Range, options: ExtractOptions = {}): TfExtractAction[] {
  if (compare(range.start, range.end) >= 0 || text.includes("\r")) return [];
  const lines = splitRawLines(text);
  const entry = splitLogicalEntries(text).find((x) => x.startLine <= range.start.line && x.endLine >= range.end.line - (range.end.character === 0 ? 1 : 0));
  if (!entry || entry.incomplete || !isDefEntry(entry)) return [];
  const symbol = getDocumentSymbols(text).find((sym) => sym.range.start.line === entry.startLine);
  const result = plan(text, lines, entry, range, symbol, options);
  if (!result) return [];
  if ("disabled" in result) return [{ title: TITLE, edits: [], disabled: result.disabled }];
  return [{ title: `${TITLE}, /${result.name}`, edits: result.edits }];
}
