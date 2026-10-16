import { FUNCTION_EFFECTS } from "./data/functionEffects";
import { FUNCTIONS } from "./data/functions.generated";
import type { Position, Range, TfTextEdit } from "./diagnostics";
import { applyEdits, compare, isDefEntry, mentions, readerOutside, selected, trimEnd, type TfExtractAction } from "./extractMacro";
import { alwaysEvaluated, ExprSyntaxError, nodes, parseExpression, pathTo, type ExprNode } from "./expressionTree";
import { isTfSpace, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { macroBodyStart, parseRegions, parseUnits, type ExpressionRegion, type Unit } from "./structure";
import { findFunctionCalls, findMacroCalls, SPECIAL_VARIABLE_NAMES } from "./variables";

/**
 * "Extract to a local variable": the selected part of an expression in a macro body is computed
 * by two new statements just before the statement it is in,
 *
 *     /let value=%; /test value:=(EXPRESSION)%;
 *
 * and the selection becomes a reference to the variable: `{value}` in an expression, `%{value}`
 * where the selection was a whole `$[...]` in text tf substitutes (a command's arguments, or the
 * text of a `/test`, `/return` or `/result`).
 *
 * Why this form, each proven in real tf (tf_script_check, 2026-10-15; the probes are listed in the
 * README): `/let value=$[EXPRESSION]` makes the value text, so a real loses its last digits (with
 * `1/3.0`, `value*3` gave 0.999999999999999 and `value==1/3.0` gave 0; inline, 1. and 1). An
 * assignment keeps the value as it is, with its type: 1., 1, the whole of 9223372036854775807,
 * strings with blanks and quotes, an empty string, `2.0`, `1:30`. The `/let` first makes the
 * variable a local of this macro whatever global of that name exists (an assignment alone sets a
 * global one, and makes a local only while `%local_assign` is on). `{value}` reads it back as
 * that value; `%{value}` puts the same text in as `$[...]` did.
 *
 * What the rewrite changes, and so where it is refused:
 *  - The text after `/test` is substituted before it is compiled, where a condition or a `$[...]`
 *    is compiled as written: `"a %%; b"` became `a %; b`, and `"q\"r"` stopped being one string.
 *    So the selection may hold no `%`, `$` or `\`; and when it is inside the text of a `/test`,
 *    `/return` or `/result`, neither may the rest of that text, as a substitution there could
 *    group it differently.
 *  - It is evaluated earlier, before the rest of its statement: refused when it has side effects
 *    (an assignment, `++`, `--`, a function that isn't known to have none, which includes every
 *    macro called as a function) or what the statement evaluates before it does (what comes
 *    after it, an operator around it included, runs after it either way), or when it is only
 *    evaluated some of the time: the right of `&` or `|`, a branch of `?:`, the default of a
 *    `%{x-...}`, an `/elseif` or `/while` condition, or inside a `$(...)` or a condition list.
 *  - A compile error moves from the macro to the `/test`: a call with the wrong number of
 *    arguments in a `$[...]` stopped the whole macro, in the `/test` only that statement. Refused.
 *  - `%?`, the last command's result: `/let` sets it to 1 and the `/test` to the value, where the
 *    statement would have seen the one before. A macro the statement runs reads the caller's `%?`
 *    too, and an `/if` whose branch doesn't run leaves it as it was (the macro then returned the
 *    `/test`'s value, not the one before). Refused when the statement reads `%?` or runs a macro,
 *    and for an `/if`, when the first statement of a branch, or the statement after the `/if`,
 *    does, or there is no plain statement there to set it again.
 *  - Bugs of tf's: a `?:` whose condition is true and whose value is used crashed tf in a macro
 *    body (in `$[...]`, `echo(...)` or an assignment, though not in a condition), and a `,` in a
 *    `$[...]` in command text threw away the text before it. Refused when the selection holds a
 *    `? :`, or the `$[...]` it is in holds a `,`.
 *  - `{value}` is a variable where the selection was a value, and `whatis()` says so
 *    (`id:float` for `float`); nothing else tells them apart (an assignment, `$[...]`, a
 *    `/return` and a macro's arguments all take the value). Refused as `whatis()`'s argument.
 *  - The new local shadows any global of its name for the rest of the macro and what it calls, so
 *    its name, `value` (or `value2` and on), is one no file that can be seen mentions. A global
 *    set where no file shows it (typed at tf's prompt, or by a file the workspace doesn't index)
 *    isn't known: then the macro reads the local, as intended, but tf runs the SHADOW hook each
 *    time it runs, which by default warns that the local variable overshadows the global. The
 *    rename offered after the edit is the way to pick another name.
 *
 * A `/let` lasts for the rest of the macro body it runs in, and no longer: at the top level its
 * variable was gone by the next command, and so was one made in a `/repeat` or `/for` text; one
 * made in `/eval` text in a macro was gone once the `/eval` ended, though the macro went on. So
 * this is only offered in a macro body, and only for the body's own statements: a `/def`,
 * `/bind`, `/hook` or `/trig*` body, not an `/alias`, the text of an `/eval`, `/repeat` or
 * `/for`, or a top-level line.
 */

export interface ExtractVariableOptions {
  /** Whether a file other than this one mentions a word (lower case), as any name. */
  mentionedOutside?: (name: string) => boolean;
}

const TITLE = "Extract to a local variable";
const ARITY = new Map(FUNCTIONS.map((f) => [f.name, f]));
const READS_RESULT = /%+\{?\?|\{\?\}/;
/** Text the `/test` would substitute again: a `%`, a `$` or a `\`. */
const SUBSTITUTED = /[%$\\]/;

type Plan = { disabled: string } | { name: string; edits: TfTextEdit[]; rename: Position };

function describe(s: string, n: ExprNode): string {
  const t = s.slice(n.start, n.end);
  return t.length > 24 ? `${t.slice(0, 21)}...` : t;
}

/** Why the selection isn't one node of the tree: a token it cuts, a parenthesis it splits, or the grouping. */
function notOneNode(s: string, root: ExprNode, from: number, to: number): string {
  const leaves = nodes(root).filter((n) => n.kind === "number" || n.kind === "string" || n.kind === "name" || n.kind === "substitution");
  const cut = leaves.find((n) => (from > n.start && from < n.end) || (to > n.start && to < n.end));
  if (cut) return `The selection cuts ${describe(s, cut)} in two: select the whole of it.`;
  let depth = 0;
  for (let k = from; k < to && depth >= 0; k += 1) {
    if (s[k] === "(" || (s[k] === "$" && s[k + 1] === "[")) depth += 1;
    else if (s[k] === ")" || s[k] === "]") depth -= 1;
  }
  if (depth !== 0) return "The selection has a parenthesis without its partner: select both, or neither.";
  return "The selection isn't one whole operand, as tf groups the operators around it: select a whole operand, or add parentheses.";
}

/** What a node's evaluation changes, as a reason, or undefined. */
function sideEffect(s: string, n: ExprNode): string | undefined {
  if (n.kind === "assign") return `${describe(s, n)} assigns a variable`;
  if (n.kind === "prefix" && (n.op === "++" || n.op === "--")) return `${describe(s, n)} changes a variable`;
  if (n.kind === "substitution" && n.what === "command") return `${describe(s, n)} runs commands`;
  if (n.kind === "call") {
    const effect = FUNCTION_EFFECTS[n.name];
    if (effect === undefined) return `${n.name}() isn't one of tf's functions, so it may be a macro with side effects`;
    if (effect === "effects") return `${n.name}() has side effects`;
  }
  return undefined;
}

/** The innermost unit holding `[from, to)`. */
function innermost(units: Unit[], end: (u: Unit) => number, from: number, to: number, block: boolean): Unit | undefined {
  let best: Unit | undefined;
  for (const u of units) {
    if (u.block !== block || u.start > from || end(u) < to) continue;
    if (!best || u.start >= best.start) best = u;
  }
  return best;
}

function plan(text: string, entry: LogicalEntry, range: Range, options: ExtractVariableOptions): Plan | undefined {
  const body = macroBodyStart(entry.text);
  if (body < 0) return undefined;
  const sel = selected(entry, range);
  if (sel.from >= sel.to || sel.from < body) return undefined;
  const s = entry.text.slice(body);
  let from = sel.from - body;
  let to = sel.to - body;
  while (from < to && isTfSpace(s[from])) from += 1;
  to = trimEnd(s, from, to);
  if (from >= to) return undefined;

  const parsed = parseUnits(s);
  const regions = parseRegions(s, "body");
  if (!parsed.complete || regions.stopped) return undefined;
  const subEnds = new Map<number, number>();
  for (const sp of regions.spans) if (sp.kind === "substitution") subEnds.set(sp.start, sp.end);
  const rEnd = (r: ExpressionRegion): number => trimEnd(s, r.start, r.end);
  const holds = (r: ExpressionRegion, a: number, b: number): boolean => r.start <= a && b <= rEnd(r);

  // The selection of a whole (condition) is its inside.
  const cond = regions.spans.find((sp) => sp.kind === "condition" && sp.start === from && sp.end === to);
  if (cond?.inner) {
    from = cond.inner.start;
    while (from < cond.inner.end && isTfSpace(s[from])) from += 1;
    to = trimEnd(s, from, cond.inner.end);
    if (from >= to) return undefined;
  }

  // Where the selection is: inside an expression, or a whole $[...] in substituted text.
  const containing = regions.expressions.filter((r) => holds(r, from, to)).sort((a, b) => a.start - b.start || rEnd(b) - rEnd(a));
  const wholeBracket = s.startsWith("$[", from) && subEnds.get(from) === to;
  let root: ExpressionRegion | undefined;
  let reference: "expression" | "text";
  const outer = containing[0];
  if (!outer || (outer.kind === "statement" && wholeBracket && !containing.some((r) => r.kind === "bracket"))) {
    if (!wholeBracket) {
      const partly = regions.expressions.some((r) => r.start < to && from < rEnd(r) && !(from <= r.start && rEnd(r) <= to));
      return partly ? { disabled: "The selection runs past the end of the expression it starts in: select part of one expression." } : undefined;
    }
    root = regions.expressions.find((r) => r.kind === "bracket" && r.start === from + 2);
    reference = "text";
  } else if (outer.kind === "statement") {
    root = containing.find((r) => r.kind === "bracket") ?? outer;
    reference = "expression";
    if (root === outer && SUBSTITUTED.test(s.slice(outer.start, rEnd(outer)))) {
      return { disabled: "This text is substituted before tf evaluates it, so a %, $ or \\ in it could change how the selection groups: it can't be extracted." };
    }
  } else {
    root = outer;
    reference = "expression";
  }
  if (!root) return undefined;
  // tf compiles a body's conditions and $[...]s with the body, and a syntax error in one stops
  // the whole macro from ever running, rewritten or not (in tf, `$[0x10 + 1]` did): nothing to
  // keep the same, and tf reported the error at a different place once the body changed.
  for (const r of regions.expressions) {
    if (r.kind === "statement") continue;
    try {
      parseExpression(s, r.start, rEnd(r), (at) => subEnds.get(at));
    } catch (e) {
      if (e instanceof ExprSyntaxError) return { disabled: "This macro has an expression tf can't compile, so it never runs: fix that first." };
      throw e;
    }
  }

  let tree: ExprNode;
  try {
    tree = parseExpression(s, root.start, rEnd(root), (at) => subEnds.get(at));
  } catch (e) {
    if (e instanceof ExprSyntaxError) return { disabled: "This expression couldn't be read, so its parts can't be told apart: fix it first." };
    throw e;
  }
  const valueFrom = reference === "text" ? root.start : from;
  const valueTo = reference === "text" ? rEnd(root) : to;
  const path = reference === "text" ? [tree] : pathTo(tree, from, to);
  if (!path) return { disabled: notOneNode(s, tree, from, to) };
  const chosen = path[path.length - 1] as ExprNode;
  const inner = chosen.kind === "bracket" ? chosen.inner : chosen;
  const value = s.slice(chosen.kind === "bracket" ? inner.start : valueFrom, chosen.kind === "bracket" ? inner.end : valueTo);

  if (value.includes("\t")) return { disabled: "The selection has a tab in it, which tf turns into spaces by column, and its column would change: replace it with spaces first." };
  if (SUBSTITUTED.test(value)) {
    return { disabled: "The selection has a %, $ or \\, which the /test it would move to substitutes once more before evaluating it: it can't be extracted as it is." };
  }
  for (const n of nodes(inner)) {
    const effect = sideEffect(s, n);
    if (effect) return { disabled: `In the selection, ${effect}, and it would be evaluated earlier than it is now: leave that out of the selection.` };
    if (n.kind === "call") {
      const f = ARITY.get(n.name);
      if (f && (n.args.length < f.min || (f.max !== null && n.args.length > f.max))) {
        return { disabled: `${n.name}() has the wrong number of arguments, which tf reports when the macro is compiled; in the /test it would only be reported when that runs: fix the call first.` };
      }
    }
    if (n.kind === "conditional" && n.then) {
      return { disabled: "The selection has a ? : in it, which crashes tf when its condition is true and its value is used, as it would be in the /test: it can't be extracted." };
    }
  }
  for (let k = 1; k < path.length; k += 1) {
    const parent = path[k - 1] as ExprNode;
    if (!alwaysEvaluated(parent, path[k] as ExprNode)) {
      const where = parent.kind === "conditional" ? "in a branch of ?:" : `on the right of ${parent.kind === "binary" ? parent.op : ""}`;
      return { disabled: `The selection is ${where}, which tf only evaluates some of the time, but the /let before the statement would evaluate it every time: select the whole condition instead.` };
    }
  }
  // `{value}` compiles as the name `value` does: where tf wants a variable rather than a value
  // (an assignment's target, the operand of `++` or `--`, tfread()'s last argument), the rewrite
  // would assign `value` instead (in tf, `x := 5` with x selected left x as it was), and
  // whatis() says `id:` before its type (`id:float` for `float`). Refused where the selection
  // reaches one of those through an operator that hands on an operand itself: parentheses, the
  // right of a `,`, a branch of `?:` (and the condition of `x ?: y`, which is its value), and
  // either side of `|` and `&`, which leave the operand that decided them on the stack (expr.c's
  // DUP shares the Value: in tf, `x | y := 5` assigned x when x was 1).
  for (let k = path.length - 1; k > 0; k -= 1) {
    const parent = path[k - 1] as ExprNode;
    const child = path[k] as ExprNode;
    if ((parent.kind === "assign" && parent.left === child) || (parent.kind === "prefix" && (parent.op === "++" || parent.op === "--"))) {
      return { disabled: "The selection is the variable this assigns to, which can't be replaced by another: select the value instead." };
    }
    if (parent.kind === "call") {
      if (parent.name === "tfread" && parent.args[parent.args.length - 1] === child) {
        return { disabled: "The selection is the variable tfread() reads into, which can't be replaced by another: it can't be extracted." };
      }
      if (parent.name === "whatis") return { disabled: "whatis() would see a variable in place of the selection's value, and say id: before its type: it can't be extracted." };
      break;
    }
    const passes =
      parent.kind === "paren" ||
      parent.kind === "bracket" ||
      (parent.kind === "conditional" && (child !== parent.test || parent.then === undefined)) ||
      (parent.kind === "binary" && (parent.op === "|" || parent.op === "&" || (parent.op === "," && parent.right === child)));
    if (!passes) break;
  }
  // A $[...] in substituted text: tf drops the text before it when it holds a `,`.
  const substitutedBracket = root.kind === "bracket" && !regions.expressions.some((r) => r !== root && r.kind !== "statement" && r.start <= root.start && rEnd(root) <= rEnd(r));
  if (substitutedBracket && nodes(tree).some((n) => n.kind === "binary" && n.op === ",")) {
    return { disabled: "tf mis-compiles the , in this $[...], losing the text before it, so rewriting it can't be checked: it can't be extracted." };
  }
  // Inside a substitution whose default only runs when the variable is empty, or a $(...).
  const within = regions.spans.find((sp) => sp.kind === "substitution" && sp.start < from && to <= sp.end && (s[sp.start] === "%" || s[sp.start] === "{" || s.startsWith("${", sp.start) || s.startsWith("$(", sp.start)));
  if (within) {
    return s.startsWith("$(", within.start)
      ? { disabled: "The selection is inside a $(...), whose commands run on their own: it can't be extracted from there." }
      : { disabled: "The selection is in the default of a substitution, which tf only evaluates when the variable is empty: it can't be extracted from there." };
  }

  // The statement the /let goes before.
  const end = (u: Unit): number => trimEnd(s, u.start, u.end);
  let holder: Unit | undefined;
  let evaluated: { start: number; end: number };
  if (root.kind === "condition" && !containing.some((r) => r.kind === "statement")) {
    const opener = /\/[@!]*(if|elseif|while)\s*\($/i.exec(s.slice(0, root.start))?.[1]?.toLowerCase();
    if (opener === "while") return { disabled: "A /while's condition is evaluated on every turn of the loop, but a /let before the /while would run once: it can't be extracted." };
    if (opener === "elseif") return { disabled: "An /elseif's condition is only evaluated when the conditions before it are false, but a /let before the /if would always run: it can't be extracted." };
    holder = parsed.units.find((u) => u.block && u.word === "if" && /^\/[@!]*if\s*\($/i.test(s.slice(u.start, root.start)));
    evaluated = { start: root.start, end: rEnd(root) };
  } else {
    holder = innermost(parsed.units, end, from, to, false);
    evaluated = holder ? { start: holder.start, end: end(holder) } : { start: 0, end: 0 };
  }
  if (!holder) return undefined;
  const kind = parsed.lists[holder.list]?.kind;
  if (kind === "condition") return { disabled: "The selection is in an /if or /while condition list, where a /let would become part of the condition: it can't be extracted." };
  if (kind === "cmdsub") return { disabled: "The selection is inside a $(...), whose commands run on their own: it can't be extracted from there." };

  // What the statement evaluates before the selection must change nothing. What it evaluates
  // after, an operator around the selection included, runs after it either way: tf substitutes
  // left to right, evaluates operands and arguments in order, and an operator after them.
  if (regions.spans.some((sp) => sp.kind === "substitution" && s.startsWith("$(", sp.start) && sp.start >= evaluated.start && sp.end <= from)) {
    return { disabled: "The statement runs a $(...) before the selection, which would now be evaluated first: it can't be extracted." };
  }
  const evaluatedRegions = regions.expressions.filter((r) => r.start >= evaluated.start && rEnd(r) <= evaluated.end && r.start < from);
  for (const r of evaluatedRegions) {
    if (regions.expressions.some((o) => o !== r && o.start <= r.start && rEnd(r) <= rEnd(o) && o.start >= evaluated.start && rEnd(o) <= evaluated.end && (o.start < r.start || rEnd(o) > rEnd(r)))) continue;
    let t: ExprNode;
    try {
      t = parseExpression(s, r.start, rEnd(r), (at) => subEnds.get(at));
    } catch {
      return { disabled: "The statement before the selection couldn't be read to check that it changes nothing: it can't be extracted." };
    }
    for (const n of nodes(t)) {
      if (n.end > from) continue;
      const effect = sideEffect(s, n);
      if (effect) return { disabled: `Before the selection, ${effect}, and the selection would now be evaluated first: it can't be extracted.` };
    }
  }

  // %?, the last command's result, which the new statements change.
  const entryCalls = (a: number, b: number): string | undefined => {
    const startPos = entry.offsetMap[body + a];
    const lastPos = entry.offsetMap[body + b - 1];
    if (!startPos || !lastPos) return undefined;
    const inside = (r: Range): boolean => compare(r.start, startPos) >= 0 && compare(r.start, lastPos) <= 0;
    return readerOutside([...findMacroCalls(text), ...findFunctionCalls(text)].filter((c) => inside(c.range)));
  };
  const observes = (u: Unit, who: string): string | undefined => {
    const t = s.slice(u.start, end(u));
    if (READS_RESULT.test(t)) return `${who} reads %?, the last command's result, which the new /let and /test would change: it can't be extracted.`;
    const runs = entryCalls(u.start, end(u));
    if (runs) return `${who} runs ${runs}, which can read %?, the last command's result, and the new /let and /test would change it: it can't be extracted.`;
    return undefined;
  };
  if (!holder.block) {
    const why = observes(holder, "This statement");
    if (why) return { disabled: why };
  } else {
    if (READS_RESULT.test(s.slice(root.start, rEnd(root)))) return { disabled: "This condition reads %?, the last command's result, which the new /let and /test would change: it can't be extracted." };
    const block = regions.blocks.find((b) => b.start === holder.start);
    if (!block) return undefined;
    let passes = !/\/[@!]*else\s*$/i.test(s.slice(block.start, block.parts[block.parts.length - 1]?.start ?? block.start).trimEnd());
    for (const part of block.parts) {
      const first = parsed.units.filter((u) => u.start >= part.start && u.start < part.end).sort((a, b) => a.start - b.start)[0];
      if (!first) {
        passes = true;
        continue;
      }
      if (first.block) return { disabled: "A branch of this /if starts with another block, which would see %?, the last command's result, that the new /let and /test change: it can't be extracted." };
      const why = observes(first, "The first statement of a branch");
      if (why) return { disabled: why };
    }
    if (passes) {
      const next = parsed.units.filter((u) => u.list === holder.list && u.start > end(holder)).sort((a, b) => a.start - b.start)[0];
      if (!next || next.block || next.word === "break" || next.word === "exit") {
        return { disabled: "When none of this /if's branches runs, it leaves %?, the last command's result, as it was, and the new /let and /test would change what it was: add an /else, or a statement after the /if." };
      }
      const why = observes(next, "The statement after this /if");
      if (why) return { disabled: why };
    }
  }
  // A %| or %\ before the statement ties it to the one before.
  let before = holder.start;
  while (before > 0 && isTfSpace(s[before - 1])) before -= 1;
  if (before >= 2 && s[before - 2] === "%" && (s[before - 1] === "|" || s[before - 1] === "\\") && s[before - 3] !== "%") {
    return { disabled: "A %| or %\\ ties this statement to the one before it, and the new statements would come between them: it can't be extracted." };
  }

  // A name nothing that can be seen mentions.
  const lower = text.toLowerCase();
  let name = "";
  for (let n = 1; ; n += 1) {
    name = n === 1 ? "value" : `value${n}`;
    if (!mentions(lower, name) && !SPECIAL_VARIABLE_NAMES.has(name) && !(options.mentionedOutside?.(name) ?? false)) break;
  }

  // The edits: the two statements before the holder, on its line or on lines of their own.
  const lines = splitRawLines(text);
  const holderPos = entry.offsetMap[body + holder.start];
  const selStart = entry.offsetMap[body + from];
  const selLast = entry.offsetMap[body + to - 1];
  if (!holderPos || !selStart || !selLast) return undefined;
  if (entry.parts.filter((p) => p.line >= selStart.line && p.line <= selLast.line).length !== selLast.line - selStart.line + 1) {
    return { disabled: "The selection has comment lines between its lines, which would be lost: move them out of the selection first." };
  }
  const lead = (lines[holderPos.line] ?? "").slice(0, holderPos.character);
  const ownLine = holderPos.line > entry.startLine && /^[ \t]*$/.test(lead) && entry.parts.some((p) => p.line === holderPos.line);
  const spacing = /%;( *)\\\s*$/.exec(lines.slice(entry.startLine, entry.endLine + 1).find((l) => /%;( *)\\\s*$/.test(l)) ?? "")?.[1] ?? "";
  const statements = [`/let ${name}=`, `/test ${name}:=(${value})`];
  const inserted = ownLine ? statements.map((st) => `${st}%;${spacing}\\\n${lead}`).join("") : statements.map((st) => `${st}%; `).join("");
  // After a `%`, `%{value}` would make `%%{value}`, an escaped `%` and the text `{value}` (in tf,
  // `50%$[1 + 2]` printed `50%{value}`); `$[{value}]` printed `50%3` after one, two or three `%`s.
  const ref = reference === "text" ? (s[from - 1] === "%" ? `$[{${name}}]` : `%{${name}}`) : `{${name}}`;
  const selRange = { start: selStart, end: { line: selLast.line, character: selLast.character + 1 } };
  const edits: TfTextEdit[] =
    compare(holderPos, selStart) === 0
      ? [{ range: selRange, newText: inserted + ref }]
      : [{ range: { start: holderPos, end: holderPos }, newText: inserted }, { range: selRange, newText: ref }];

  // Check it reads back as planned: the same entry, with the statements and the reference in place.
  const out = splitLogicalEntries(applyEdits(text, edits)).find((x) => x.startLine === entry.startLine);
  const expected = `${s.slice(0, holder.start)}${statements.map((st) => `${st}%;`).join("")}${s.slice(holder.start, from)}${ref}${s.slice(to)}`;
  const normal = (t: string): string => t.replace(/[ \t]*%;[ \t]*/g, "%;");
  if (!out || out.incomplete || out.text.slice(0, body) !== entry.text.slice(0, body) || normal(out.text.slice(body)) !== normal(expected)) return undefined;
  if (!parseUnits(out.text.slice(body)).complete) return undefined;
  // The new statements start where the holder did, so the name is just after `/let `.
  return { name, edits, rename: { line: holderPos.line, character: holderPos.character + "/let ".length } };
}

/** The "Extract to a local variable" action for a selection in an expression of a macro body. */
export function getExtractVariableActions(text: string, range: Range, options: ExtractVariableOptions = {}): TfExtractAction[] {
  if (compare(range.start, range.end) >= 0 || text.includes("\r")) return [];
  const entries = splitLogicalEntries(text);
  const entry = entries.find((x) => x.startLine <= range.start.line && x.endLine >= range.end.line - (range.end.character === 0 ? 1 : 0));
  if (!entry || entry.incomplete || !isDefEntry(entry)) return [];
  const result = plan(text, entry, range, options);
  if (!result) return [];
  if ("disabled" in result) return [{ title: TITLE, edits: [], disabled: result.disabled }];
  return [{ title: TITLE, edits: result.edits, rename: result.rename }];
}
