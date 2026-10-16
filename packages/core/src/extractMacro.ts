import { ALL_COMMANDS } from "./data/commands";
import type { Position, Range, TfTextEdit } from "./diagnostics";
import { splitEntry } from "./formatting";
import { isBlankLine, isCommentLine, isTfSpace, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { macroBodyStart, parseUnits, type Unit } from "./structure";
import { defIsInvisible, getDocumentSymbols, type TfSymbol } from "./symbols";
import { findFunctionCalls, findMacroCalls, findVariables, isNameChar, type MacroCall } from "./variables";

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
 *  - It is always called as `/name %*`, which gives it the caller's arguments word for word, when
 *    the caller was called as a command (called as a function, see below): `%1`,
 *    `%*`, `%#`, `%L`, `%L2`, `%-1`, `%-L`, `{#}`, `{1}`, `{*}` and the braced and defaulted forms
 *    all came out the same, with arguments holding `"`, `%;`, `%%`, `$[...]` and `\`, and in a
 *    trigger's and a hook's body; with no arguments, passing `%*` on changes none of them. Always,
 *    not only when the moved text names an argument: `/eval` and `eval()` text shares the running
 *    macro's arguments, so a `%%1` or `\%1` there reads them too. `%Pn` reads the caller's last
 *    regexp match, and `%?` its last result.
 *  - After the call, `%?` is the new macro's last command's result: what it was before.
 *
 * And what doesn't, so the action is shown disabled with the reason:
 *  - A `/let` in the moved statements makes a local of the new macro, gone when it returns (a
 *    callee's `/let z` left the caller's `%z` empty), and so does an assignment (`h := 7`, `++c`)
 *    to a name with no local and no global: refused when the rest of the body names it, or runs a
 *    macro (or `/trigger`) that might read it through the same dynamic scoping. An assignment to a
 *    name the macro `/let`s before it is fine: it sets that local.
 *  - `regmatch()` in the new macro sets `%P1`... only for it: the caller's `%P1` afterwards was
 *    still its own match. Refused when the rest of the body reads `%P`.
 *  - `/return`, `/result` and `/exit` would end the new macro instead, `/shift` would shift its
 *    arguments, `getopts()` would read its arguments and set its locals, `%0` would be its name,
 *    and a `/break` that isn't inside a `/while` in the selection would end it instead of a loop.
 *  - Inside a loop, a local the selection makes and reads lasts into the loop's next turn; a new
 *    macro's starts afresh each call.
 *  - Called as a function, `go("p q", "r")`, a macro keeps its arguments as passed; `%*` joins them
 *    with blanks and the new macro splits them again (`%1=[p]` where go had `[p q]`), so moved text
 *    that reads arguments is refused when the macro is called as a function anywhere seen.
 *  - A `%|` or `%\` beside the selection ties it to the next statement.
 *  - A tab in the moved text: tf turns it into spaces by column, and the column moves.
 *  - A file with CRLF line endings, where a `\` never continues a line (like the formatter).
 */

export interface TfExtractAction {
  title: string;
  edits: TfTextEdit[];
  /** Why the selection can't be extracted, when it can't. */
  disabled?: string;
  /** Where, once the edits are applied, the name it made is, for a rename to follow. */
  rename?: Position;
}

export interface ExtractOptions {
  /** Whether a macro (lower case) already exists where this file runs; this file's own and tf's are always checked. */
  isTaken?: (name: string) => boolean;
  /** One level of indentation, for the new macro's body. */
  indent?: string;
  /** Whether a macro (lower case) is called as a function, `name(...)`, anywhere that can be seen. */
  calledAsFunction?: (name: string) => boolean;
}

const TITLE = "Extract to a new macro";

/** An argument read: `%1`, `%*`, `%#`, `%L`, `%-1`, `%R`, braced or with a longer `%` run or `\` (read one level down), or `{1}`, `{#}`, `{*}`, `{L}` in an expression. */
const ARGUMENT_RE = /(?:%+|\\%)\{?(?:-?[0-9]|\*|#|-?L[0-9]*(?![A-Za-z_])|R(?![A-Za-z_]))|\{(?:#|\*|-?[0-9]+|-?L[0-9]*)\}/;

/**
 * Whether macro text may read the running macro's arguments: it names one, or it runs text built
 * when it runs, an `/eval` of a substitution or eval(), which can (`/eval %{cmd}` with cmd holding
 * `%1` read the arguments of the macro running the /eval, in tf).
 */
export function readsArguments(text: string): boolean {
  return ARGUMENT_RE.test(text) || /(^|[^\w])\/[@!]*eval\b[^%$]*?(?:%|\$[[({])/i.test(text) || /(^|[^\w])eval\s*\(/.test(text);
}

/** `/break 0`, which tf refuses to compile (the block-structure diagnostic says so). */
export function breaksZero(text: string): boolean {
  return /(^|[^\w])\/[@!]*break\s+0+(?![0-9])/i.test(text);
}

/** Whether a unit is inside a `/while` of the body (in its loop body or its condition list). */
export function inLoop(units: Unit[], at: Unit, text: string): boolean {
  return units.some((w) => w.block && w.word === "while" && w.start < at.start && trimEnd(text, w.start, w.end) >= trimEnd(text, at.start, at.end));
}

const COMMAND_NAMES: ReadonlySet<string> = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
/**
 * tf's commands that run code findMacroCalls() doesn't read: `/trigger` runs whichever trigger
 * bodies match, and `/not` and `/quote` run their text (`/eval`, `/for` and `/repeat` text is read).
 */
export const RUNS_OTHER_CODE = new Set(["trigger", "not", "quote"]);
export const ENDS_MACRO = new Set(["return", "result", "exit"]);
const ALIAS_RE = /^\s*\/alias\b/i;

export function compare(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

/** `end` pulled back over the blanks before it, but not over one escaped with `\`. */
export function trimEnd(s: string, start: number, end: number): number {
  let e = end;
  while (e > start && isTfSpace(s[e - 1]) && s[e - 2] !== "\\") e -= 1;
  return e;
}

/** The selection as offsets into the entry's text: the characters it covers. */
export function selected(entry: LogicalEntry, range: Range): { from: number; to: number } {
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

/**
 * Whether the text reads `%0`, the running macro's name, in any of its forms: `%0`, `%{0}`, `{0}` in
 * an expression, and with a longer run of `%`s or a `\` before it, which `/eval` text reads one
 * level down.
 */
export function readsMacroName(s: string): boolean {
  return /%+\{?0+(?![0-9])|\{0+\}/.test(s);
}

/** Whether `name` appears in `text` as a whole name (not part of a longer one). */
export function mentions(text: string, name: string): boolean {
  let at = text.indexOf(name);
  while (at >= 0) {
    if (!isNameChar(text[at - 1]) && !isNameChar(text[at + name.length])) return true;
    at = text.indexOf(name, at + 1);
  }
  return false;
}

/**
 * What the rest of the body runs that may read the caller's locals: a call to a macro, by name or as
 * a function in an expression, or a command that runs code of its own.
 */
export function readerOutside(calls: MacroCall[]): string | undefined {
  for (const c of calls) {
    const name = c.name.toLowerCase();
    if (!COMMAND_NAMES.has(name) || RUNS_OTHER_CODE.has(name)) return `/${c.name}`;
  }
  return undefined;
}

/** The variable a `/let` statement sets, as written, or "" when its name is built when it runs. */
export function letName(text: string): string {
  const m = /^\/[@!]*let\s+([^\s=]*)/i.exec(text);
  const name = m?.[1] ?? "";
  return /[%$\\{]/.test(name) ? "" : name;
}

export function isDefEntry(entry: LogicalEntry): boolean {
  return (entry.isDefBody || entry.isOtherMacroBody) && !ALIAS_RE.test(entry.text);
}

/** Who the body belongs to, for messages: `/foo`, or "this trigger" and the like. */
export function ownerName(symbol: TfSymbol | undefined): string {
  if (symbol?.kind === "def") return `/${symbol.name}`;
  if (symbol?.kind === "trig") return "this trigger";
  if (symbol?.kind === "hook") return "this hook";
  if (symbol?.kind === "bind") return "this key binding";
  return "this macro";
}

/** The new macro's name: `<macro>_extracted`, numbered past any name already taken. */
function newName(symbol: TfSymbol | undefined, taken: (name: string) => boolean): string {
  const written = symbol?.kind === "def" ? symbol.name.replace(/^(["'`])(.*)\1$/, "$2") : "";
  const base = /^[A-Za-z0-9_~.:-]+$/.test(written) ? `${written}_extracted` : "extracted";
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? base : `${base}${n}`;
    if (!taken(name.toLowerCase())) return name;
  }
}

/** Apply edits (non-overlapping) to text. */
export function applyEdits(text: string, edits: TfTextEdit[]): string {
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

function plan(
  text: string,
  lines: string[],
  entry: LogicalEntry,
  entryIndex: number,
  range: Range,
  symbol: TfSymbol | undefined,
  options: ExtractOptions,
): Plan | undefined {
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
  const outsideText = `${bodyText.slice(0, xStart)} ${bodyText.slice(xEnd)}`;
  const startPos = entry.offsetMap[body + xStart];
  const lastPos = entry.offsetMap[body + xEnd - 1];
  const bodyPos = entry.offsetMap[body];
  if (!startPos || !lastPos || !bodyPos) return undefined;

  if (moved.includes("\t")) {
    return { disabled: "The selection has a tab in it, which tf turns into spaces by column, and its column would change in the new macro: replace it with spaces first." };
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
  if (readsMacroName(moved)) {
    return { disabled: `%0 is the running macro's name, which in the new macro would be its own: leave it out of the selection.` };
  }
  if (breaksZero(moved)) return { disabled: "tf refuses to compile /break 0: fix the /break first." };
  // Called as a function, a macro keeps its arguments as tf passed them, but `%*` joins them
  // with blanks and the new macro splits them again (in tf, `go("p q", "r")` gave %1=[p q] in
  // go and [p] in a macro go called with %*).
  if (symbol?.kind === "def" && readsArguments(moved) && options.calledAsFunction?.(symbol.name.toLowerCase())) {
    return { disabled: `${owner} is called as a function, ${symbol.name}(...), whose arguments %* would split differently in a new macro: it can't be extracted.` };
  }
  if (/(^|[^\w])regmatch\s*\(/.test(moved) && /%\{?P|\{P/.test(outsideText)) {
    return { disabled: `regmatch() in the selection would set %P1 and the rest only inside the new macro, but ${owner} reads them outside it: keep the regmatch() outside the selection.` };
  }
  for (const u of within.filter((w) => w.word === "let")) {
    if (letName(bodyText.slice(u.start, u.end)) === "") {
      return { disabled: "A /let in the selection sets a variable whose name is built when it runs, and it would be the new macro's local: keep it outside the selection." };
    }
  }
  // The variables the moved text makes a local of: its /lets, and its assignments to a name with
  // no local of the macro's (one with no global either makes a local; whether there is a global
  // isn't known, so any).
  const inMoved = (offset: number): boolean => offset >= body + xStart && offset < body + xEnd;
  const made = new Map<string, "let" | "assign">();
  const movedOccurrences = findVariables(text).filter((o) => o.entry === entryIndex && inMoved(o.offset));
  for (const o of movedOccurrences) {
    if (o.access === "let") made.set(o.name, "let");
    else if (o.access === "assign" && o.scope === "global" && !made.has(o.name)) made.set(o.name, "assign");
  }
  // Inside a loop, a local the selection makes lasts into the loop's next turn, where the
  // selection may read it before setting it again; in a macro of its own it starts afresh each
  // call (in tf, `/if (seen) ...%; /let seen=1` in a /while saw `seen` on later turns; extracted,
  // never). Fine only when the name's first use is an unconditional /let that doesn't read it.
  if (made.size > 0 && inLoop(parsed.units, chosen[0] as Unit, bodyText)) {
    for (const v of made.keys()) {
      const uses = movedOccurrences.filter((o) => o.name === v).sort((a, b) => a.offset - b.offset);
      const first = uses[0];
      const letUnit = first && first.access === "let" ? within.find((u) => u.word === "let" && u.list === list && first.offset - body >= u.start && first.offset - body < u.end) : undefined;
      const readsInOwnLet = letUnit !== undefined && uses.some((o) => o.access === "read" && o.offset - body >= letUnit.start && o.offset - body < letUnit.end);
      if (!letUnit || readsInOwnLet) {
        return { disabled: `The selection is inside a /while and makes a local ${v} that it reads: the loop's next turn sees the last turn's ${v}, but a new macro's ${v} would start afresh each call. Keep it in ${owner}.` };
      }
    }
  }
  if (made.size > 0) {
    const inBody = (r: Range): boolean => compare(r.start, bodyPos) >= 0 && r.start.line <= entry.endLine;
    const inSelection = (r: Range): boolean => compare(r.start, startPos) >= 0 && compare(r.start, lastPos) <= 0;
    const calls = [...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => inBody(c.range) && !inSelection(c.range));
    const reader = readerOutside(calls);
    for (const [name, how] of made) {
      const what =
        how === "let"
          ? `${name} is /let in the selection, so it would be the new macro's local, gone when it returns`
          : `${name} is assigned in the selection with no /let of it in ${owner}, so unless a global ${name} exists, the assignment would make a local of the new macro, gone when it returns`;
      const keep = how === "let" ? "keep the /let outside the selection" : `/let or /set ${name} before the selection, or keep the assignment outside it`;
      if (mentions(outsideText, name)) return { disabled: `${what}, but ${owner} uses it outside the selection: ${keep}.` };
      if (reader) return { disabled: `${what}, but ${owner} also runs ${reader}, which may read it through tf's dynamic scoping: ${keep}.` };
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
  const call = `/${name} %*`;

  if (!entry.parts.some((p) => p.line === lastPos.line) || entry.parts.filter((p) => p.line >= startPos.line && p.line <= lastPos.line).length !== lastPos.line - startPos.line + 1) {
    return { disabled: "The selection has comment lines between its lines, which would be lost: move them out of the selection first." };
  }
  let insertLine = entry.startLine;
  // Above the comment lines directly over the macro, which belong to it (its `;;;` doc comment).
  while (insertLine > 0 && isCommentLine(lines[insertLine - 1] ?? "")) insertLine -= 1;
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
  const entries = splitLogicalEntries(text);
  const entryIndex = entries.findIndex((x) => x.startLine <= range.start.line && x.endLine >= range.end.line - (range.end.character === 0 ? 1 : 0));
  const entry = entries[entryIndex];
  if (!entry || entry.incomplete || !isDefEntry(entry)) return [];
  const symbol = getDocumentSymbols(text).find((sym) => sym.range.start.line === entry.startLine);
  const result = plan(text, lines, entry, entryIndex, range, symbol, options);
  if (!result) return [];
  if ("disabled" in result) return [{ title: TITLE, edits: [], disabled: result.disabled }];
  return [{ title: `${TITLE}, /${result.name}`, edits: result.edits }];
}
