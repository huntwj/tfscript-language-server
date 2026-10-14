import { SPECIAL_VARIABLES } from "./data/variables.generated";
import { splitLogicalEntries, type LogicalEntry } from "./logicalEntries";
import { macroBodyStart } from "./structure";
import type { Range } from "./symbols";

/**
 * Every place a file names a tf variable, and which variable each one means.
 *
 * What tf does, from its source and proven in real tf (tf_script_check, 2026-10-14):
 *  - Names are case-sensitive: `/set Foo=1` and `/set foo=2` are two variables (variable.c
 *    compares names with strcmp(), strstructcmp() for the global table).
 *  - `/set` and `/setenv` set a global; `/unset` and `/export` only look at globals
 *    (findglobalvar()). So in a macro that has `/let x`, `/set x=...` and `/unset x` still change
 *    the global x while `%x` there reads the local.
 *  - `/let` sets a variable in the running macro's own scope (findorcreatelocalvar()). A read —
 *    `%x`, `%{x}`, `{x}` or `x` in an expression — takes the nearest: the innermost scope that has
 *    one, then the global (hfindnearestvar(), findlocalvar() walks every scope). An assignment in
 *    an expression (`x := 1`, `x += 1`, `++x`) sets the nearest one the same way (hsetnearestvar()).
 *  - Before a macro's `/let x` runs, `%x` there still reads the global.
 *  - `getopts("ab:", ...)` sets a local `opt_a` and `opt_b` in the calling macro (expr.c
 *    FN_getopts), leaving a global `opt_a` alone (proven).
 *  - `{x}` is only a substitution in an expression: in a command it stays text (proven).
 *
 * Approximated, because which scope a read finds depends on how the code runs:
 *  - Each macro body is one scope. A read or assignment in a body counts as local when a `/let`
 *    of the same name comes before it in that body; anything else counts as global.
 *  - tf's scoping is dynamic: a macro also sees the locals of the macro that called it (proven:
 *    a callee's `%y` read the caller's `/let y`). That isn't followed: a read in a body without
 *    its own `/let` counts as global.
 *  - `$(...)` and `/eval` text run in a scope of their own (expand.c pushes one for each; proven
 *    for both), and a `/def` inside a body has its own body; all three count as part of the
 *    macro body around them.
 *  - A `/let` in a branch that doesn't run still counts.
 *  - `%x` in a top-level command is text tf never substitutes (load-no-expansion warns about it),
 *    and `%x` inside a string in an expression is only substituted by `/test`, `/result` and
 *    `/return`; both still count as reads, since that is what the author meant.
 *  - A run of two or more `%`s is text one level down: `%%{w}` in a `/def` inside a body becomes
 *    `%{w}` in the inner macro (proven). So `%%{name}` counts as a read; a bare `%%name` doesn't,
 *    since `100%%off` is far more often just a percent sign.
 *  - `/listvar` takes a pattern, and `/for`'s loop variable is set inside stdlib's /for, so
 *    neither is followed.
 */

export type VariableAccess = "set" | "setenv" | "let" | "getopts" | "unset" | "export" | "assign" | "read";

/** How the name is written, which decides what a rename may turn it into. */
export type VariableForm = "command" | "percent" | "percent-braced" | "expr-braced" | "expr-bare" | "option-letter";

export interface VariableOccurrence {
  name: string;
  access: VariableAccess;
  form: VariableForm;
  /** Just the name. */
  range: Range;
  /** "global", or "local:<entry>" for a macro body's own variable. */
  scope: string;
  /** Which logical entry, and where in its joined text. */
  entry: number;
  offset: number;
}

export const SPECIAL_VARIABLE_NAMES: ReadonlySet<string> = new Set(SPECIAL_VARIABLES.map((v) => v.name));

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= "0" && c <= "9";

/** variable.h's is_namechar_first(): a letter, `_`, or a byte of a UTF-8 character. */
export function isNameFirst(c: string | undefined): boolean {
  return c !== undefined && (/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 0x80);
}

/** variable.h's is_namechar(): is_namechar_first() or a digit. */
export function isNameChar(c: string | undefined): boolean {
  return isNameFirst(c) || isDigit(c);
}

export function isVariableName(name: string): boolean {
  return name.length > 0 && isNameFirst(name[0]) && [...name].every(isNameChar);
}

export interface Selector {
  /** The variable's name, or undefined for a positional or special selector (`1`, `L`, `#`, `R`). */
  name?: string;
  nameStart: number;
  nameEnd: number;
}

/**
 * Reads a substitution selector at `i`, just past the `%` (or at the `{` of `{x}` in an
 * expression), the way expand.c's varsub() does. Its quirks, from the comment there:
 * `%Lx` and `%{Lx}` are the variable Lx, `%L1x` is parameter L1 then text, `%{L1x}` is the
 * variable L1x, and `%-name` is an error.
 */
export function readSelector(s: string, i: number): Selector | undefined {
  const bracket = s[i] === "{";
  if (bracket) i += 1;
  if ((s[i] === "#" || s[i] === "?") && (!bracket || s[i + 1] === "}")) {
    return { nameStart: i, nameEnd: i + 1 };
  }
  let n = -1;
  let except = false;
  let ell = false;
  let pee = false;
  let star = false;
  let start: number;
  const digits = (): void => {
    n = 0;
    while (isDigit(s[i])) i += 1;
  };
  if (isDigit(s[i])) {
    start = i;
    digits();
  } else {
    if (s[i] === "-") {
      except = true;
      i += 1;
    }
    start = i;
    if (s[i] === "L") ell = true;
    else if (s[i] === "P") pee = true;
    else if (s[i] === "*") star = true;
    if (ell || pee || star) i += 1;
    if (!star && isDigit(s[i])) digits();
  }
  let selector = "";
  if (((n < 0 && !star) || (bracket && (ell || pee))) && isNameChar(s[i])) {
    ell = pee = false;
    n = -1;
    do i += 1;
    while (isNameChar(s[i]));
    selector = s.slice(start, i);
  }
  if (star || pee || ell || n >= 0 || selector === "R" || selector === "PL" || selector === "PR") {
    return { nameStart: start, nameEnd: i };
  }
  if (except || selector === "") return undefined;
  return { name: selector, nameStart: start, nameEnd: i };
}

/**
 * A `%;` or `%|` statement separator at `i`. A longer run (`%%;`) is text at this level but a
 * separator one level down, in a `/def` or `/eval` inside the body, which is where an expression
 * around it is read; so it ends a statement here too.
 */
function isSeparatorAt(s: string, i: number): boolean {
  return s[i] === "%" && (s[i + 1] === ";" || s[i + 1] === "|");
}

/** Where the statement holding `i` ends: at the next separator, or the end of the text. */
function statementEnd(s: string, i: number, end: number): number {
  for (let k = i; k < end; k += 1) if (isSeparatorAt(s, k)) return k;
  return end;
}

function skipString(s: string, i: number, end: number): number {
  const quote = s[i];
  for (let k = i + 1; k < end; k += 1) {
    if (s[k] === "\\") k += 1;
    else if (s[k] === quote) return k + 1;
  }
  return end;
}

/** The index just past the bracket that closes the one at `i`, skipping strings. */
function matching(s: string, i: number, end: number, open: string, close: string): number {
  let depth = 0;
  for (let k = i; k < end; k += 1) {
    const c = s[k];
    if (c === '"' || c === "'" || c === "`") k = skipString(s, k, end) - 1;
    else if (c === open) depth += 1;
    else if (c === close && --depth === 0) return k + 1;
  }
  return end;
}

interface Found {
  name: string;
  access: VariableAccess;
  form: VariableForm;
  offset: number;
  /** How much of the text it covers, when that isn't the name: getopts()' option letter. */
  length?: number;
}

const COMMAND_RE = /(^|[\s;|(])\/(set|setenv|let|unset|export)(?=\s|$)/gi;
const CONDITION_RE = /(^|[\s;|(])\/(?:if|elseif|while)\s*\(/gi;
const EXPRESSION_COMMAND_RE = /(^|[\s;|(])\/(?:test|result|return|expr)(?=\s|$)/gi;

function commands(s: string, found: Found[]): void {
  for (const m of s.matchAll(COMMAND_RE)) {
    const word = (m[2] as string).toLowerCase() as "set" | "setenv" | "let" | "unset" | "export";
    let i = (m.index ?? 0) + (m[1] as string).length + 1 + word.length;
    while (s[i] === " " || s[i] === "\t") i += 1;
    const start = i;
    const end = statementEnd(s, start, s.length);
    if (word === "unset" || word === "export") {
      // The whole rest of the statement is the name (handle_unset_command()).
      const name = s.slice(start, end).replace(/\s+$/, "");
      if (isVariableName(name)) found.push({ name, access: word, form: "command", offset: start });
      continue;
    }
    if (!isNameFirst(s[i])) continue;
    while (isNameChar(s[i])) i += 1;
    const name = s.slice(start, i);
    // setdelim(): the name ends at `=`, a blank or the end; anything else is "illegal variable name".
    const next = s[i];
    if (next !== undefined && next !== "=" && next !== " " && next !== "\t" && i !== end) continue;
    const hasValue = next === "=" || s.slice(i, end).trim() !== "";
    found.push({ name, access: hasValue ? word : "read", form: "command", offset: start });
  }
}

/** `%x`, `%{x}` and `%{x-default}` substitutions in `s[from, to)`. */
function percents(s: string, from: number, to: number, escapes: boolean, found: Found[]): void {
  for (let i = from; i < to; i += 1) {
    if (escapes && s[i] === "\\") {
      i += 1;
      continue;
    }
    if (s[i] !== "%") continue;
    let j = i;
    while (s[j] === "%") j += 1;
    const run = j - i;
    const c = s[j];
    const opens = run === 1 ? c === "{" || c === "#" || c === "?" || c === "*" || c === "-" || isNameChar(c) : c === "{";
    if (!opens) {
      i = j - 1;
      continue;
    }
    const sel = readSelector(s, j);
    if (sel?.name !== undefined) {
      found.push({ name: sel.name, access: "read", form: c === "{" ? "percent-braced" : "percent", offset: sel.nameStart });
    }
    // Carry on from the end of the name, so a default's own substitutions are read too.
    i = (sel?.nameEnd ?? j) - 1;
  }
}

/**
 * Where the substitution whose selector starts at `i` (at its `{`, or just past a bare `%`) ends,
 * its `-default` and closing `}` included (varsub(): a braced default runs to the `}`, a bare
 * one to the next blank).
 */
function substitutionEnd(s: string, i: number, to: number): number {
  if (s[i] === "{") return matching(s, i, to, "{", "}");
  let k = Math.max(readSelector(s, i)?.nameEnd ?? i, i);
  if (s[k] === "-") while (k < to && s[k] !== " " && s[k] !== "\t" && !isSeparatorAt(s, k)) k += 1;
  return k;
}

/** Variable names in the expression `s[from, to)`. `%` substitutions are left to percents(). */
function expression(s: string, from: number, to: number, found: Found[]): void {
  let i = from;
  while (i < to) {
    const c = s[i] as string;
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(s, i, to);
    } else if (c === "%") {
      let j = i;
      while (s[j] === "%") j += 1;
      i = Math.max(substitutionEnd(s, j, to), j);
    } else if (c === "{") {
      const sel = readSelector(s, i);
      if (sel?.name !== undefined) found.push({ name: sel.name, access: "read", form: "expr-braced", offset: sel.nameStart });
      i = Math.max(substitutionEnd(s, i, to), i + 1);
    } else if (c === "/" && isNameFirst(s[i + 1]) && (i === from || s[i - 1] === " " || s[i - 1] === "\t")) {
      // A command name where a `%;` is missing: tf warns "possibly missing '%;'", and it's no variable.
      i += 1;
      while (isNameChar(s[i])) i += 1;
    } else if (c === "$") {
      if (s[i + 1] === "(") i = matching(s, i + 1, to, "(", ")");
      else if (s[i + 1] === "{") i = matching(s, i + 1, to, "{", "}");
      else if (s[i + 1] === "[") i += 2;
      else {
        i += 1;
        while (isNameChar(s[i])) i += 1;
      }
    } else if (isDigit(c) || (c === "." && isDigit(s[i + 1]))) {
      while (i < to && (isNameChar(s[i]) || s[i] === ".")) i += 1;
    } else if (isNameFirst(c)) {
      const start = i;
      while (isNameChar(s[i])) i += 1;
      // Part of a name built at run time (`cylon%i`, `kbwarned_%1`, `_kb_stack_%{n}_top`): not this variable.
      if (s[start - 1] === "}" || s[start - 1] === "]" || (s[i] === "%" && !isSeparatorAt(s, i)) || s[i] === "$" || s[i] === "{") {
        continue;
      }
      let k = i;
      while (s[k] === " " || s[k] === "\t") k += 1;
      if (s[k] === "(") {
        // A function call (expr.c unary_expr()). getopts("ab:", ...) sets a local opt_a and opt_b.
        if (s.slice(start, i) === "getopts") getopts(s, k + 1, to, found);
        continue;
      }
      let b = start - 1;
      while (s[b] === " " || s[b] === "\t") b -= 1;
      const prefix = (s[b] === "+" && s[b - 1] === "+") || (s[b] === "-" && s[b - 1] === "-");
      const assigns = (":+-*/".includes(s[k] ?? "x") && s[k + 1] === "=") || prefix;
      found.push({ name: s.slice(start, i), access: assigns ? "assign" : "read", form: "expr-bare", offset: start });
    } else {
      i += 1;
    }
  }
}

/**
 * getopts()' first argument names its options: each letter is a local `opt_<letter>`, set in the
 * calling macro's scope (expr.c FN_getopts: setlocalstrvar() and friends), and a `:`, `#` or `@`
 * after one says what kind of value it takes. Only a literal string can be read.
 */
function getopts(s: string, i: number, to: number, found: Found[]): void {
  while (s[i] === " " || s[i] === "\t") i += 1;
  const quote = s[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return;
  for (let k = i + 1; k < to && s[k] !== quote; k += 1) {
    const c = s[k] as string;
    if (c === "\\") return;
    if (/[A-Za-z]/.test(c)) found.push({ name: `opt_${c}`, access: "getopts", form: "option-letter", offset: k, length: 1 });
  }
}

function expressions(s: string, found: Found[]): void {
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "$" && s[i + 1] === "[" && s[i - 1] !== "$") {
      const end = matching(s, i + 1, s.length, "[", "]");
      expression(s, i + 2, end - 1, found);
    }
  }
  for (const m of s.matchAll(CONDITION_RE)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    const end = matching(s, open, s.length, "(", ")");
    expression(s, open + 1, end - 1, found);
  }
  for (const m of s.matchAll(EXPRESSION_COMMAND_RE)) {
    const start = (m.index ?? 0) + m[0].length;
    expression(s, start, statementEnd(s, start, s.length), found);
  }
}

function entryVariables(entry: LogicalEntry, index: number): VariableOccurrence[] {
  const s = entry.text;
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(s) : -1;
  const found: Found[] = [];
  commands(s, found);
  // In a macro body `\` escapes the next character; a top-level line keeps it as text.
  if (body >= 0) {
    percents(s, 0, body, false, found);
    percents(s, body, s.length, true, found);
  } else {
    percents(s, 0, s.length, false, found);
  }
  expressions(s, found);

  // An expression's `$(...)` is skipped by expression(), and a `$[` inside one is read twice:
  // keep one of each.
  const seen = new Set<number>();
  const unique = found
    .filter((f) => !seen.has(f.offset) && (seen.add(f.offset), true))
    .sort((a, b) => a.offset - b.offset);

  const inBody = (f: Found): boolean => body >= 0 && f.offset >= body;
  const binds = (f: Found): boolean => f.access === "let" || f.access === "getopts";
  const lets = unique.filter((f) => binds(f) && inBody(f));
  const local = `local:${index}`;
  const out: VariableOccurrence[] = [];
  for (const f of unique) {
    let scope = "global";
    if (binds(f)) scope = local;
    else if ((f.access === "read" || f.access === "assign") && inBody(f)) {
      if (lets.some((l) => l.name === f.name && l.offset < f.offset)) scope = local;
    }
    const first = entry.offsetMap[f.offset];
    const last = entry.offsetMap[f.offset + (f.length ?? f.name.length) - 1];
    // A name split across a `\`-continued line has no single range to point at.
    if (!first || !last || first.line !== last.line) continue;
    out.push({
      name: f.name,
      access: f.access,
      form: f.form,
      scope,
      entry: index,
      offset: f.offset,
      range: { start: { line: first.line, character: first.character }, end: { line: last.line, character: last.character + 1 } },
    });
  }
  return out;
}

const cache = new Map<string, VariableOccurrence[]>();

/** Every variable occurrence in `text`, in document order. */
export function findVariables(text: string): VariableOccurrence[] {
  let result = cache.get(text);
  if (!result) {
    result = splitLogicalEntries(text).flatMap((entry, i) => (entry.incomplete ? [] : entryVariables(entry, i)));
    if (cache.size >= 64) cache.delete(cache.keys().next().value as string);
    cache.set(text, result);
  }
  return result;
}
