import { isCommentLine, splitLogicalEntries, splitRawLines } from "./logicalEntries";
import type { Position } from "./symbols";

/**
 * Where the cursor is, for completion, signature help and hover: in a command name, a `%`
 * substitution, the variable name or value of a `/set`, or a tf expression — and in which
 * function call of that expression.
 *
 * An expression is the inside of `$[...]`, the parenthesised condition of `/if`, `/elseif` and
 * `/while`, and the rest of a `/test`, `/expr`, `/result` or `/return` statement
 * (htmldoc topics/expressions.html). The scan is per statement — from the last `%;` before the
 * cursor — over the whole logical entry, so `\`-continued lines count as one. Text inside a
 * string literal is not an expression.
 */

export type CursorContext =
  | { kind: "command"; partial: string }
  | { kind: "substitution"; partial: string; braced: boolean }
  | { kind: "variable-name"; partial: string }
  | { kind: "variable-value"; variable: string; partial: string }
  | { kind: "expression"; partial: string; inNumber: boolean; call?: FunctionCall }
  | { kind: "none" };

export interface FunctionCall {
  name: string;
  /** Which argument the cursor is in, from 0. */
  argument: number;
}

/** The current logical entry's text up to the cursor, or undefined on a comment line. */
export function textBefore(text: string, pos: Position): string | undefined {
  const lines = splitRawLines(text);
  if (isCommentLine(lines[pos.line] ?? "")) return undefined;
  const entry = splitLogicalEntries(text).find((e) => e.startLine <= pos.line && pos.line <= e.endLine);
  if (!entry) return (lines[pos.line] ?? "").slice(0, pos.character);
  const offset = entry.offsetMap.filter((m) => m.line < pos.line || (m.line === pos.line && m.character < pos.character)).length;
  return entry.text.slice(0, offset);
}

/** The text after the last statement separator (`%;` or `%|`, not `%%;`). */
function currentStatement(before: string): string {
  let cut = 0;
  for (const m of before.matchAll(/(?<!%)(?:%%)*%[;|]/g)) cut = (m.index ?? 0) + m[0].length;
  return before.slice(cut);
}

const EXPRESSION_COMMAND_RE = /(?:^|[\s;|(])\/@?(?:test|expr|result|return)\s+/gi;
const CONDITION_RE = /(?:^|[\s;|(])\/@?(?:if|elseif|while)\s*\(/gi;

/**
 * Where the expression the cursor is in starts within `stmt`, or -1. The innermost unclosed
 * `$[` wins; otherwise an unclosed `/if (`; otherwise the argument of `/test` and friends.
 */
function expressionStart(stmt: string): number {
  // Innermost unclosed $[ ... ].
  const opens: number[] = [];
  for (let i = 0; i < stmt.length; i += 1) {
    if (stmt[i] === "$" && stmt[i + 1] === "[" && stmt[i - 1] !== "$") {
      opens.push(i + 2);
      i += 1;
    } else if (stmt[i] === "]" && opens.length > 0) {
      opens.pop();
    }
  }
  if (opens.length > 0) return opens[opens.length - 1] as number;

  let start = -1;
  for (const m of stmt.matchAll(CONDITION_RE)) {
    const open = (m.index ?? 0) + m[0].length;
    if (depthAfter(stmt.slice(open)) >= 0) start = open;
  }
  if (start >= 0) return start;
  for (const m of stmt.matchAll(EXPRESSION_COMMAND_RE)) start = (m.index ?? 0) + m[0].length;
  return start;
}

/** Parenthesis depth at the end of `s` relative to its start, ignoring string literals; -1 once closed below 0. */
function depthAfter(s: string): number {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i] as string;
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth < 0) return -1;
  }
  return depth;
}

function insideString(expr: string): boolean {
  let quote = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i] as string;
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
  }
  return quote !== "";
}

/** The innermost unclosed `name(` in an expression, and which argument the cursor is in. */
export function functionCallAt(expr: string): FunctionCall | undefined {
  const stack: { name: string; argument: number }[] = [];
  let quote = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i] as string;
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") {
      const name = /([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(expr.slice(0, i))?.[1] ?? "";
      stack.push({ name, argument: 0 });
    } else if (ch === ")") stack.pop();
    else if (ch === "," && stack.length > 0) (stack[stack.length - 1] as { argument: number }).argument += 1;
  }
  for (let k = stack.length - 1; k >= 0; k -= 1) {
    const frame = stack[k] as { name: string; argument: number };
    if (frame.name) return frame;
    // A bare `(` groups; the call the cursor is in, if any, is further out.
  }
  return undefined;
}

export function cursorContext(before: string): CursorContext {
  const stmt = currentStatement(before);

  const subst = /(?<!%)(?:%%)*%(\{)?([A-Za-z0-9_#*?-]*)$/.exec(stmt);
  if (subst) return { kind: "substitution", partial: subst[2] as string, braced: Boolean(subst[1]) };

  const command = /(?:^|[\s;|(])\/@?!?([A-Za-z0-9_]*)$/.exec(stmt);
  if (command) return { kind: "command", partial: command[1] as string };

  const value = /(?:^|[\s;|(])\/@?set\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*|\s+)([A-Za-z0-9_]*)$/i.exec(stmt);
  if (value) return { kind: "variable-value", variable: value[1] as string, partial: value[2] as string };

  const name = /(?:^|[\s;|(])\/@?(?:set|unset|setenv|let|listvar|export)\s+([A-Za-z_][A-Za-z0-9_]*)?$/i.exec(stmt);
  if (name) return { kind: "variable-name", partial: name[1] ?? "" };

  const start = expressionStart(stmt);
  if (start >= 0) {
    const expr = stmt.slice(start);
    if (insideString(expr)) return { kind: "none" };
    const word = /([A-Za-z_][A-Za-z0-9_]*)?$/.exec(expr);
    const partial = word?.[1] ?? "";
    // After a digit or a `.` the word is part of a number: nothing to complete, though the
    // call it is an argument of still matters for signature help.
    const inNumber = /[0-9.]$/.test(expr.slice(0, expr.length - partial.length));
    const call = functionCallAt(expr);
    return { kind: "expression", partial, inNumber, ...(call ? { call } : {}) };
  }
  return { kind: "none" };
}
