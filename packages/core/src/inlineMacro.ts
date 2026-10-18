import type { Position, Range, TfTextEdit } from "./diagnostics";
import { getDiagnostics } from "./diagnostics";
import {
  applyEdits,
  breaksZero,
  ENDS_MACRO,
  inLoop,
  isDefEntry,
  letName,
  mentions,
  ownerName,
  readerOutside,
  readsArguments,
  readsMacroName,
  trimEnd,
} from "./extractMacro";
import { formatIndent, splitEntry } from "./formatting";
import { isBlankLine, isTfSpace, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { macroBodyStart, parseStatements, parseUnits, type Unit } from "./structure";
import { getDocumentSymbols, type TfSymbol } from "./symbols";
import type { TfBuild } from "./tfBuild";
import { findFunctionCalls, findMacroCalls, findVariables } from "./variables";
import { countDefsOf } from "./workspace/loadPathDiagnostics";

/**
 * "Inline /foo": the reverse of "Extract to a new macro" (extractMacro.ts). A `/foo` statement in
 * a macro body is replaced by foo's body, and "Inline all calls to /foo and remove it" does that
 * for every call in the file and deletes the `/def`.
 *
 * Why the body runs the same in the caller, from what extract proved in real tf (2026-10-14):
 *  - tf's scoping is dynamic, so the body already reads and assigns the caller's `/let` locals;
 *    `%Pn` and `%?` already read the caller's.
 *  - Called as `/foo %*`, the body's arguments are the caller's word for word when the caller was
 *    called as a command (not as a function: see below); called as `/foo`, it has none, so then a
 *    body that reads no argument (nor runs /eval of text built when it runs) is the only one.
 *  - Both are top-level `/def` bodies, substituted the same way when they run.
 *
 * Refused (shown disabled, with the reason) when the body would run differently in the caller:
 * `/return`, `/result`, `/exit` (would end the caller), `/shift` and getopts() (the caller's
 * arguments), `%0` (the caller's name), a `/break` outside a loop in the body (ends the macro;
 * inlined, it would end the caller's loop), a `/let` or (in the fork) an assignment that makes a
 * local (the caller's, once inlined, so its other statements and the macros it runs would see it),
 * regmatch() when the caller reads `%P` (a match made in a macro ends with it: do_macro()'s
 * new_reg_scope()), arguments other than `%*`, `/!foo` (negates the result), a call inside a
 * `$(...)` or a condition list, `%|` or `%\` beside the call, a tab, recursion, and a macro that
 * may be defined more than once or elsewhere on the load path.
 *
 * Not modelled: tf echoes an invisible (`-i`) macro's commands only under `%mecho` at a higher
 * level than a visible one's (do_macro() sets invis_flag), so an inlined `-i` body is echoed like
 * its caller's.
 */

export interface TfInlineAction {
  title: string;
  edits: TfTextEdit[];
  /** Why it can't be done, when it can't. */
  disabled?: string;
}

export interface InlineOptions {
  /** Whether a macro (lower case) may also be defined outside this file, on its load path or in the workspace. */
  definedOutside?: (name: string) => boolean;
  /** Whether a file other than this one mentions the name (lower case), so its /def can't be removed. */
  mentionedOutside?: (name: string) => boolean;
  /** One level of indentation, for a body laid out over several lines. */
  indent?: string;
  /** The file is in tf's library. */
  library?: boolean;
  /** Which tf runs the file (tfBuild.ts): whether an assignment to a name with no variable makes a local. */
  tfBuild?: TfBuild;
  /** Whether a macro (lower case) is called as a function, `name(...)`, anywhere that can be seen. */
  calledAsFunction?: (name: string) => boolean;
}

const CALL_RE = /^\/([@!]?)([^\s%$\\]+)(?:\s+(.*))?$/s;
const CHANGES_DEFS_RE = /\/@?(?:undef|undefn|undeft|purge|purgedef|edit)\b/i;
const PLAIN_DEF_HEAD_RE = /^\s*\/@?def(?:\s+-i)*\s+\S+\s*=\s*$/i;

function compare(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

interface Callee {
  name: string;
  entry: LogicalEntry;
  entryIndex: number;
  symbol: TfSymbol;
  /** The body as tf runs it: one line, without a `%;` that only ends it. */
  body: string;
}

interface Site {
  entry: LogicalEntry;
  entryIndex: number;
  bodyAt: number;
  unit: Unit;
  bodyText: string;
  units: Unit[];
  lists: { kind: string }[];
}

/** The body without the blanks around it and a last `%;` that only ends it (one that does sends nothing). */
function runnableBody(entry: LogicalEntry): string | undefined {
  const at = macroBodyStart(entry.text);
  if (at < 0) return undefined;
  let body = entry.text.slice(at);
  let e = trimEnd(body, 0, body.length);
  if (e >= 2 && body.slice(e - 2, e) === "%;" && body[e - 3] !== "%" && body[e - 3] !== "\\") e = trimEnd(body, 0, e - 2);
  body = body.slice(0, e);
  let s = 0;
  while (isTfSpace(body[s])) s += 1;
  return body.slice(s);
}

function findCallee(text: string, entries: LogicalEntry[], name: string): Callee | { disabled: string } | undefined {
  const symbols = getDocumentSymbols(text).filter((s) => s.kind === "def" && s.name.toLowerCase() === name);
  if (symbols.length === 0) return undefined;
  if (symbols.length > 1 || countDefsOf(text, name) > 1) return { disabled: `/${name} is defined more than once in this file, so which body a call runs depends on the order: it can't be inlined.` };
  const symbol = symbols[0] as TfSymbol;
  const entryIndex = entries.findIndex((e) => e.startLine === symbol.range.start.line);
  const entry = entries[entryIndex];
  if (!entry || !entry.isDefBody || entry.incomplete) return undefined;
  const body = runnableBody(entry);
  if (body === undefined) return undefined;
  return { name, entry, entryIndex, symbol, body };
}

/** The statement the position is in, in a macro body, and the body it is in. */
function siteAt(entries: LogicalEntry[], pos: Position): Site | undefined {
  const entryIndex = entries.findIndex((e) => e.startLine <= pos.line && e.endLine >= pos.line);
  const entry = entries[entryIndex];
  if (!entry || entry.incomplete || !isDefEntry(entry)) return undefined;
  let offset = -1;
  entry.offsetMap.forEach((p, k) => {
    if (offset < 0 && compare(p, pos) >= 0) offset = k;
  });
  if (offset < 0) offset = entry.text.length;
  return siteFor(entry, entryIndex, offset);
}

function siteFor(entry: LogicalEntry, entryIndex: number, offset: number): Site | undefined {
  const bodyAt = macroBodyStart(entry.text);
  if (bodyAt < 0 || offset < bodyAt) return undefined;
  const bodyText = entry.text.slice(bodyAt);
  const parsed = parseUnits(bodyText);
  if (!parsed.complete) return undefined;
  const o = offset - bodyAt;
  const holding = parsed.units.filter((u) => !u.block && u.word !== "" && o >= u.start && o <= trimEnd(bodyText, u.start, u.end));
  holding.sort((a, b) => b.start - a.start);
  const unit = holding[0];
  if (!unit) return undefined;
  return { entry, entryIndex, bodyAt, unit, bodyText, units: parsed.units, lists: parsed.lists };
}

/** The call's name (lower case), if the statement calls a macro by name. */
function calledName(site: Site): string | undefined {
  const m = CALL_RE.exec(site.bodyText.slice(site.unit.start, trimEnd(site.bodyText, site.unit.start, site.unit.end)));
  return m ? (m[2] as string).toLowerCase() : undefined;
}

type Plan = { disabled: string } | { edits: TfTextEdit[] };

/** The statement texts of a body, trimmed. */
function statementTexts(body: string): string[] {
  return parseStatements(body, "body").map((s) => body.slice(s.start, s.end).trim());
}

function plan(text: string, entries: LogicalEntry[], site: Site, callee: Callee, options: InlineOptions, checkDiagnostics = true): Plan | undefined {
  const { entry, unit, bodyText, bodyAt } = site;
  const name = callee.name;
  const callEnd = trimEnd(bodyText, unit.start, unit.end);
  const m = CALL_RE.exec(bodyText.slice(unit.start, callEnd));
  if (!m || (m[2] as string).toLowerCase() !== name) return undefined;
  if (m[1] === "@") return undefined;
  if (m[1] === "!") return { disabled: `/!${name} negates the result of /${name}, which the inlined statements can't do: call it without the !.` };
  const args = (m[3] ?? "").trim();
  if (args !== "" && args !== "%*" && args !== "%{*}") {
    return { disabled: `This call passes /${name} arguments of its own, which its body would read where the caller's are inlined: only a call with no arguments or with %* can be inlined.` };
  }
  const kind = site.lists[unit.list]?.kind;
  if (kind === "cmdsub") return { disabled: `This call is inside a $(...), whose output it gives: it can't be inlined.` };
  if (kind === "condition") return { disabled: `This call is in a condition list, where only its result counts: it can't be inlined.` };
  if (callee.entryIndex === site.entryIndex) return { disabled: `/${name} calls itself here: a recursive call can't be inlined.` };

  // A %| or %\ beside the call ties it to the statement next to it.
  let before = unit.start;
  while (before > 0 && isTfSpace(bodyText[before - 1])) before -= 1;
  let after = callEnd;
  while (isTfSpace(bodyText[after])) after += 1;
  const tie = (at: number): boolean => bodyText[at] === "%" && (bodyText[at + 1] === "|" || bodyText[at + 1] === "\\") && bodyText[at - 1] !== "%";
  if ((before >= 2 && tie(before - 2)) || tie(after)) return { disabled: `A %| or %\\ ties this call to the statement next to it, which would take only the last inlined statement: it can't be inlined.` };

  if (options.definedOutside?.(name)) return { disabled: `/${name} may also be defined in another file on the load path, which would decide which body this call runs: it can't be inlined.` };
  if (CHANGES_DEFS_RE.test(text) && text.split("\n").some((l) => CHANGES_DEFS_RE.test(l) && mentions(l.toLowerCase(), name))) {
    return { disabled: `This file undefines or edits /${name}, so which body a call runs depends on when: it can't be inlined.` };
  }
  // Defined after the caller: a command that runs between the two could call the caller before /foo exists.
  if (callee.entry.startLine > entry.startLine) {
    const runsBetween = entries.some(
      (e) => e.startLine > entry.endLine && e.endLine < callee.entry.startLine && !e.isDefBody && !e.isOtherMacroBody && findMacroCalls(e.text).length > 0,
    );
    if (runsBetween) return { disabled: `/${name} is defined after this macro, and a command between them may run this macro before /${name} exists: move the /def of /${name} up first.` };
  }

  const owner = ownerName(getDocumentSymbols(text).find((s) => s.range.start.line === entry.startLine));
  const body = callee.body;
  if (body === "") return { disabled: `/${name}'s body is empty, so inlining it would leave an empty statement, which sends a blank line: remove the call instead.` };
  if (body.includes("\t")) return { disabled: `/${name}'s body has a tab in it, which tf turns into spaces by column, and its column would change: replace it with spaces first.` };
  const parsed = parseUnits(body);
  if (!parsed.complete) return undefined;
  if (parsed.units.some((u) => u.word === name)) return { disabled: `/${name} calls itself: a recursive macro can't be inlined.` };
  for (const u of parsed.units) {
    if (ENDS_MACRO.has(u.word)) return { disabled: `/${name}'s /${u.word} would end ${owner} once inlined, not just /${name}: it can't be inlined.` };
    if (u.word === "shift") return { disabled: `/${name}'s /shift would shift ${owner}'s arguments once inlined: it can't be inlined.` };
    if (u.word === "break") {
      const n = Number(/^\/[@!]*break\s*(\d*)/i.exec(body.slice(u.start, u.end))?.[1] || "1");
      const loops = parsed.units.filter((w) => w.block && w.word === "while" && w.start < u.start && trimEnd(body, w.start, w.end) >= trimEnd(body, u.start, u.end)).length;
      if (loops < n) return { disabled: `This /break in /${name} ends /${name}; inlined, it would end the loop the call is in instead: it can't be inlined.` };
    }
  }
  if (/(^|[^\w])getopts\s*\(/.test(body)) return { disabled: `/${name} calls getopts(), which would read ${owner}'s arguments and set its locals once inlined: it can't be inlined.` };
  if (readsMacroName(body)) return { disabled: `/${name} reads %0, its own name, which would be ${owner}'s once inlined: it can't be inlined.` };
  if (breaksZero(body)) return { disabled: `tf refuses to compile /${name}'s /break 0: fix it first.` };
  if (args === "" && readsArguments(body)) return { disabled: `/${name} reads its arguments, which this call doesn't pass: inlined, it would read ${owner}'s. Call it with %* first if that's what it should get.` };

  // Called as a function, the caller keeps its arguments as tf passed them, but `%*` joins them
  // with blanks and /foo splits them again (in tf, `go("p q", "r")` gave /foo %1=[p] and go's
  // own %1=[p q]), so the body reads them differently once inlined.
  const callerSymbol = getDocumentSymbols(text).find((s) => s.range.start.line === entry.startLine);
  if (args !== "" && callerSymbol?.kind === "def" && readsArguments(body) && options.calledAsFunction?.(callerSymbol.name.toLowerCase())) {
    return { disabled: `${owner} is called as a function, ${callerSymbol.name}(...), whose arguments %* hands /${name} split differently: inlined, the body would read ${owner}'s as they were passed.` };
  }

  // What the rest of the caller does, which a local the body makes would now reach.
  const outsideText = `${bodyText.slice(0, unit.start)} ${bodyText.slice(callEnd)}`;
  const callStart = entry.offsetMap[bodyAt + unit.start];
  const callLast = entry.offsetMap[bodyAt + callEnd - 1];
  const bodyPos = entry.offsetMap[bodyAt];
  if (!callStart || !callLast || !bodyPos) return undefined;
  const inCall = (r: Range): boolean => compare(r.start, callStart) >= 0 && compare(r.start, callLast) <= 0;
  const inCallerBody = (r: Range): boolean => compare(r.start, bodyPos) >= 0 && r.start.line <= entry.endLine;
  const lazyReader = (): string | undefined =>
    readerOutside([...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => inCallerBody(c.range) && !inCall(c.range)));

  if (/(^|[^\w])regmatch\s*\(/.test(body)) {
    if (/%\{?P|\{P/.test(outsideText)) return { disabled: `/${name}'s regmatch() sets %P1 and the rest only inside /${name}, but ${owner} reads them: inlined, it would change what they read.` };
    const reader = lazyReader();
    if (reader) return { disabled: `/${name}'s regmatch() sets %P1 and the rest only inside /${name}; inlined, ${reader}, which ${owner} also runs, might read them.` };
  }

  // The locals the body makes: its /lets, and in the fork assignments to a name it has no local of
  // (which make one when no variable of that name exists, and whether one does isn't known).
  // Upstream, such an assignment makes a global wherever it runs (expr.c's assign()).
  const calleeBodyAt = macroBodyStart(callee.entry.text);
  const made = new Map<string, "let" | "assign">();
  for (const u of parsed.units.filter((w) => w.word === "let")) {
    if (letName(body.slice(u.start, u.end)) === "") return { disabled: `/${name} has a /let whose name is built when it runs, which would be ${owner}'s local once inlined: it can't be inlined.` };
  }
  for (const o of findVariables(text)) {
    if (o.entry !== callee.entryIndex || o.offset < calleeBodyAt) continue;
    if (o.access === "let") made.set(o.name, "let");
    else if (o.access === "assign" && o.scope === "global" && options.tfBuild === "fork" && !made.has(o.name)) made.set(o.name, "assign");
  }
  if (made.size > 0) {
    // An assignment to a name the caller has already /let, in its body's own list (not in a
    // branch that might not run), sets that local either way.
    const caller = site.units.filter((u) => u.word === "let" && u.list === 0 && u.start < unit.start).map((u) => letName(bodyText.slice(u.start, u.end)));
    for (const [v, how] of made) if (how === "assign" && caller.includes(v)) made.delete(v);
  }
  // In a loop, the body's local would last into the next turn, where a call starts afresh (in tf,
  // `/let n=$[n+1]` called in a /while gave 1,1,1; inlined it gave 1,2,3).
  if (made.size > 0 && inLoop(site.units, unit, bodyText)) {
    const v = [...made.keys()][0] as string;
    return { disabled: `This call is inside a /while, and /${name} makes a local ${v}: inlined, the loop's next turn would see the last turn's ${v}, where each call starts without one.` };
  }
  if (made.size > 0) {
    const reader = lazyReader();
    for (const [v, how] of made) {
      const what =
        how === "let"
          ? `/${name} /lets ${v}, which would be ${owner}'s local once inlined`
          : `/${name} assigns ${v} with no /let of it, which makes a local when no ${v} exists, and once inlined that would be ${owner}'s`;
      if (mentions(outsideText, v)) return { disabled: `${what}, but ${owner} uses ${v} itself: it can't be inlined.` };
      if (reader) return { disabled: `${what}, and ${owner} also runs ${reader}, which may read it through tf's dynamic scoping: it can't be inlined.` };
    }
  }

  // The text that replaces the call: the body on the call's line, or laid out one statement per
  // line when the caller is (the call starts its line and the macro goes on over more lines).
  const lines = splitRawLines(text);
  if (callStart.line !== callLast.line) return undefined;
  const callLine = lines[callStart.line] ?? "";
  const lead = callLine.slice(0, callStart.character);
  let newText = body;
  if (entry.endLine > entry.startLine && /^\s*$/.test(lead)) {
    const line = `/def __inline = ${body}`;
    const lineEntry = splitLogicalEntries(line)[0];
    const indent = options.indent ?? formatIndent();
    const laid = lineEntry && lineEntry.text === line ? splitEntry(lineEntry, [line], indent, { headTabs: true }) : undefined;
    if (laid && laid.length > 2) {
      // Statements end the way the caller's own lines do (`%; \` or `%;\`); the last laid-out
      // line ends the call's statement, and what followed the call on its line follows it.
      // The call's own line says how, or else the first of the caller's lines that ends a statement.
      const ending = /%;( *)\\\s*$/;
      const tail = /^%;( *)\\\s*$/.exec(callLine.slice(callLast.character + 1)) ?? lines.slice(entry.startLine, entry.endLine + 1).map((l) => ending.exec(l)).find((x) => x);
      const end = tail ? `%;${tail[1]}\\` : "%;\\";
      newText = laid
        .slice(1)
        .map((l, k) => (k === 0 ? l.slice(indent.length) : lead + l.slice(indent.length)))
        .map((l) => (l.endsWith("%;\\") ? l.slice(0, -3) + end : l))
        .join("\n");
    }
  }
  const edits: TfTextEdit[] = [{ range: { start: callStart, end: { line: callLast.line, character: callLast.character + 1 } }, newText }];
  return verified(text, entry, bodyAt, unit, callEnd, body, edits, checkDiagnostics) ? { edits } : undefined;
}

/** Whether the edits give the caller the body's statements in place of the call, and nothing new to report. */
function verified(text: string, entry: LogicalEntry, bodyAt: number, unit: Unit, callEnd: number, body: string, edits: TfTextEdit[], checkDiagnostics: boolean): boolean {
  const out = applyEdits(text, edits);
  const after = splitLogicalEntries(out).find((e) => e.startLine === entry.startLine);
  if (!after || after.incomplete) return false;
  const newBodyAt = macroBodyStart(after.text);
  if (newBodyAt < 0 || after.text.slice(0, newBodyAt) !== entry.text.slice(0, bodyAt)) return false;
  const newBody = after.text.slice(newBodyAt);
  if (!parseUnits(newBody).complete) return false;
  const old = entry.text.slice(bodyAt);
  const expected = statementTexts(old.slice(0, unit.start) + body + old.slice(callEnd));
  const got = statementTexts(newBody);
  if (expected.length !== got.length || expected.some((s, k) => s !== got[k])) return false;
  return !checkDiagnostics || !moreDiagnostics(text, out);
}

let lastCount: { text: string; counts: Map<string, number> } | undefined;

function diagnosticCounts(text: string): Map<string, number> {
  if (lastCount?.text === text) return lastCount.counts;
  const counts = new Map<string, number>();
  for (const d of getDiagnostics(text)) counts.set(d.code, (counts.get(d.code) ?? 0) + 1);
  lastCount = { text, counts };
  return counts;
}

/** Whether `after` reports something `before` didn't (counted per code). */
function moreDiagnostics(before: string, after: string): boolean {
  const b = diagnosticCounts(before);
  const a = new Map<string, number>();
  for (const d of getDiagnostics(after)) a.set(d.code, (a.get(d.code) ?? 0) + 1);
  for (const [code, n] of a) if (n > (b.get(code) ?? 0)) return true;
  return false;
}

/** The lines of the /def and the `;;;` doc comment directly above it, and a blank line after it when one is left doubled. */
function removalOf(lines: string[], callee: Callee): TfTextEdit {
  let first = callee.entry.startLine;
  while (first > 0 && /^\s*;;;/.test(lines[first - 1] ?? "")) first -= 1;
  let last = callee.entry.endLine + 1;
  const blankBefore = first === 0 || isBlankLine(lines[first - 1] ?? "");
  if (blankBefore && last < lines.length && isBlankLine(lines[last] ?? "")) last += 1;
  return { range: { start: { line: first, character: 0 }, end: { line: last, character: 0 } }, newText: "" };
}

/** Where a call no statement of a body holds is, for the message: in /eval text, a nested /def, $(...), or at the top level. */
function whereCalled(entries: LogicalEntry[], pos: Position): string {
  const line = `on line ${pos.line + 1}`;
  const entry = entries.find((e) => e.startLine <= pos.line && e.endLine >= pos.line);
  if (!entry) return line;
  const bodyAt = macroBodyStart(entry.text);
  if (!isDefEntry(entry) || bodyAt < 0) return `at the top level of the file, ${line}`;
  let offset = -1;
  entry.offsetMap.forEach((p, k) => {
    if (offset < 0 && compare(p, pos) >= 0) offset = k;
  });
  const bodyText = entry.text.slice(bodyAt);
  const parsed = parseUnits(bodyText);
  const o = offset - bodyAt;
  const holder = parsed.units.filter((u) => !u.block && u.start <= o && o < u.end).sort((a, b) => b.start - a.start)[0];
  if (holder && parsed.lists[holder.list]?.kind === "cmdsub") return `inside a $(...) ${line}`;
  if (holder?.word === "def") return `from a /def inside another macro's body, ${line}`;
  if (holder && ["eval", "for", "repeat", "quote", "not"].includes(holder.word)) return `from /${holder.word} text ${line}`;
  return line;
}

function inlineAll(text: string, entries: LogicalEntry[], callee: Callee, options: InlineOptions): Plan {
  const name = callee.name;
  if (!PLAIN_DEF_HEAD_RE.test(callee.entry.text.slice(0, macroBodyStart(callee.entry.text)))) {
    return { disabled: `/${name} has options other than -i (a trigger, hook or key binding, say), which removing it would lose: only its calls can be inlined, one at a time.` };
  }
  if (options.mentionedOutside?.(name)) return { disabled: `Another file mentions /${name}, so its /def can't be removed: inline its calls one at a time.` };
  if (findFunctionCalls(text).some((c) => c.name.toLowerCase() === name)) return { disabled: `/${name} is also called as a function, ${name}(...), which can't be inlined: inline its other calls one at a time.` };
  const sites: Site[] = [];
  for (const [i, e] of entries.entries()) {
    if (e.incomplete || !isDefEntry(e) || i === callee.entryIndex) continue;
    const at = macroBodyStart(e.text);
    if (at < 0) continue;
    const parsed = parseUnits(e.text.slice(at));
    for (const u of parsed.units) {
      if (u.block || u.word !== name) continue;
      const site = siteFor(e, i, at + u.start);
      if (site && site.unit.start === u.start) sites.push(site);
    }
  }
  const calls = findMacroCalls(text).filter((c) => c.name.toLowerCase() === name);
  if (sites.length === 0) return { disabled: `/${name} has no calls in this file to inline.` };
  if (calls.length !== sites.length) {
    const at = (s: Site, o: number): Position => s.entry.offsetMap[s.bodyAt + o] ?? { line: -1, character: 0 };
    const atSite = (r: Range): boolean => sites.some((s) => compare(at(s, s.unit.start), r.start) <= 0 && compare(r.start, at(s, s.unit.end - 1)) <= 0);
    const other = calls.find((c) => !atSite(c.range));
    return { disabled: `/${name} is also run ${other ? whereCalled(entries, other.range.start) : "from text that can't take its body"}, which can't take its body: inline its other calls one at a time.` };
  }
  // Nothing else in the file may name it (/ismacro, a hook's body, a string), apart from comment lines.
  const mentionCount = text
    .split("\n")
    .filter((l) => !/^\s*[;#]/.test(l))
    .reduce((n, l) => n + (l.toLowerCase().match(new RegExp(`(?<![\\w])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "g"))?.length ?? 0), 0);
  if (mentionCount !== sites.length + 1) return { disabled: `This file names /${name} other than in its /def and its calls (in /ismacro or a string, say), so it can't be removed: inline its calls one at a time.` };
  const edits: TfTextEdit[] = [];
  for (const site of sites) {
    const p = plan(text, entries, site, callee, options, false);
    if (!p) return { disabled: `A call to /${name} on line ${(site.entry.offsetMap[site.bodyAt + site.unit.start]?.line ?? 0) + 1} can't be inlined.` };
    if ("disabled" in p) return { disabled: `The call on line ${(site.entry.offsetMap[site.bodyAt + site.unit.start]?.line ?? 0) + 1}: ${p.disabled}` };
    for (const e of p.edits) edits.push(e);
  }
  edits.push(removalOf(splitRawLines(text), callee));
  const out = applyEdits(text, edits);
  if (moreDiagnostics(text, out) || countDefsOf(out, name) !== 0) return { disabled: `Inlining every call to /${name} would change what else the file reports: inline its calls one at a time.` };
  return { edits };
}

/** "Inline /foo" for a call at the position, and "Inline all calls to /foo and remove it" on a call or on the /def's name. */
export function getInlineActions(text: string, range: Range, options: InlineOptions = {}): TfInlineAction[] {
  if (text.includes("\r")) return [];
  const entries = splitLogicalEntries(text);
  const out: TfInlineAction[] = [];
  const site = siteAt(entries, range.start);
  const nameAtCall = site ? calledName(site) : undefined;
  let name = nameAtCall;
  if (site && name && site.bodyText.slice(site.unit.start).startsWith("/@")) name = undefined;
  if (!name) {
    const def = getDocumentSymbols(text).find((s) => s.kind === "def" && compare(s.selectionRange.start, range.start) <= 0 && compare(range.start, s.selectionRange.end) <= 0);
    if (!def) return [];
    name = def.name.toLowerCase();
  }
  const callee = findCallee(text, entries, name);
  if (!callee) return [];
  const title = `Inline /${"symbol" in callee ? callee.symbol.name : name}`;
  const allTitle = `Inline all calls to /${"symbol" in callee ? callee.symbol.name : name} and remove it`;
  if ("disabled" in callee) return [{ title: nameAtCall ? title : allTitle, edits: [], disabled: callee.disabled }];
  if (options.library) {
    const why = `This file is tf's library, whose macros are there to be redefined by your own files, and a call has to find the redefinition: it is left as a call.`;
    return [...(site && nameAtCall === name ? [{ title, edits: [], disabled: why }] : []), { title: allTitle, edits: [], disabled: why }];
  }
  if (site && nameAtCall === name) {
    const p = plan(text, entries, site, callee, options);
    if (p) out.push("disabled" in p ? { title, edits: [], disabled: p.disabled } : { title, edits: p.edits });
  }
  const all = inlineAll(text, entries, callee, options);
  out.push("disabled" in all ? { title: allTitle, edits: [], disabled: all.disabled } : { title: allTitle, edits: all.edits });
  return out;
}
