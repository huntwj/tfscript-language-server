import { ALL_COMMANDS } from "./data/commands";
import { SPECIAL_VARIABLES } from "./data/variables.generated";
import { evalMode, shortened, type Source } from "./loadCommands";
import { isTfSpace, splitLogicalEntries, type LogicalEntry } from "./logicalEntries";
import { macroBodyStart, parseRegions, type ExpressionRegion, type Statement, type StructureMode } from "./structure";
import type { Range } from "./symbols";

/**
 * Every place a file names a tf variable, and which variable each one means.
 *
 * Commands and expressions are found with structure.ts's model of how tf compiles a command
 * list, so a `/set` only counts at the start of a statement (not in `/echo type /set x`), and an
 * expression is only what tf compiles as one: a `$[...]`, a `(condition)`, the text of a `/test`,
 * `/return` or `/result`, and a `/def -E` option.
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
 *  - Until a macro's `/let x` statement has run, `%x` there still reads the global, and that
 *    includes the `/let`'s own value: `/let x=%{x}-L` reads the global x.
 *  - `getopts("ab:", ...)` sets a local `opt_a` and `opt_b` in the calling macro (expr.c
 *    FN_getopts), leaving a global `opt_a` alone.
 *  - `%x` is substituted in a macro body (and by `/eval`); a plain top-level command, or one in a
 *    top-level `/if` or `/while`, keeps it as text.
 *  - An expression reads `%x`, `{x}` and `x` itself, top level or not, but a string in it is
 *    left alone: `$["%Y"]` and `/if ("%Y" =~ ...)` see `%Y`. A `/test`, `/return` or `/result`
 *    in a macro body is substituted first, strings and all, so `/test v := "%Y"` reads Y.
 *  - `{x}` is only a substitution in an expression: in a command it stays text.
 *  - `x /y` in an expression divides x by the variable y (tf warns when y also names a command).
 *  - `/def -E"expr"` compiles expr when the `/def` runs and evaluates it when the trigger
 *    matches (macro.c), so its names are reads; `-t`, `-h`, `-T`, `-w` and the rest are
 *    patterns and names, not substituted.
 *  - A run of two or more `%`s is text one level down: `%%{w}` in a `/def` inside a body becomes
 *    `%{w}` in the inner macro. `/eval`, `/for` and `/repeat` text and a `/def` inside a body are
 *    read again as the level below sees them, with each run of `%`s one shorter.
 *  - `/eval` text and a `$(...)` run in a scope of their own inside the running macro's (expand.c
 *    pushes one for each), so a `/let` there ends with them, while their reads still see the
 *    macro's locals. `/for VAR ...` runs its command in stdlib's `/@eval /let VAR=...`, so VAR is
 *    that loop's local and the macro's locals are seen too. `/repeat` compiles its command as a
 *    macro body and runs it later from the top level (process.c), so it sees none of them; nor
 *    does a `/def` inside a body, which runs whenever it's called.
 *
 * Approximated, because which scope a read finds depends on how the code runs:
 *  - A read or assignment counts as local when a `/let` of the same name has ended before it in
 *    its own scope or one around it; anything else counts as global.
 *  - tf's scoping is dynamic: a macro also sees the locals of the macro that called it (proven:
 *    a callee's `%y` read the caller's `/let y`). That isn't followed here: a read in a body
 *    without its own `/let` counts as global (rename refuses the cases it would get wrong).
 *  - A `/let` in a branch that doesn't run still counts.
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

const COMMAND_NAMES: ReadonlySet<string> = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));

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

/** `is_end_of_statement()`: `%` then `;`, `|` or `\`. */
function isStatEnd(s: string, i: number): boolean {
  const next = s[i + 1];
  return s[i] === "%" && (next === ";" || next === "|" || next === "\\");
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

/**
 * Where the substitution whose selector starts at `i` (at its `{`, or just past a bare `%`) ends,
 * its `-default` and closing `}` included (varsub(): a braced default runs to the `}`, a bare
 * one to the next blank).
 */
function substitutionEnd(s: string, i: number, to: number): number {
  if (s[i] === "{") return matching(s, i, to, "{", "}");
  let k = Math.max(readSelector(s, i)?.nameEnd ?? i, i);
  if (s[k] === "-") while (k < to && !isTfSpace(s[k]) && !isStatEnd(s, k)) k += 1;
  return k;
}

interface Found {
  name: string;
  access: VariableAccess;
  form: VariableForm;
  /** Offsets into the entry's text. */
  start: number;
  end: number;
  /** For a `/let` or getopts(), where the variable starts to exist: the end of its statement. */
  from?: number;
  /** The variable scopes it is in, innermost first (see Walk.chain). */
  chain: string[];
}

/** What one walk over a text needs: the text, where it came from, and where to put what it finds. */
interface Walk {
  src: Source;
  found: Found[];
  depth: number;
  /**
   * The variable scopes the text runs in, innermost first: a macro body's, then for `/eval` text
   * and a `/for` command the scopes of what runs them (tf searches every scope of the running
   * macros, findlocalvar()). Text that runs later on its own, a `/repeat` command or a `/def`'s
   * body inside a body, starts afresh.
   */
  chain: string[];
  /** Names the next scope opened in this entry. */
  scopes: { prefix: string; next: number };
  /** The scopes at each offset of the text, its `$(...)`s' added in front: set by walk(). */
  chainAt?: (offset: number) => string[];
}

const at = (w: Walk, start: number, end: number) => ({ start: w.src.map[start] as number, end: (w.src.map[end - 1] as number) + 1 });

function push(w: Walk, name: string, access: VariableAccess, form: VariableForm, start: number, end: number, from?: number): void {
  const chain = w.chainAt?.(start) ?? w.chain;
  w.found.push({ name, access, form, ...at(w, start, end), ...(from === undefined ? {} : { from: w.src.map[from] as number }), chain });
}

function newScope(w: Walk, kind: string): string {
  w.scopes.next += 1;
  return `${w.scopes.prefix}:${kind}${w.scopes.next}`;
}

/** A walk over `src`, run in `chain`. */
function inner(w: Walk, src: Source, chain: string[]): Walk {
  return { src, found: w.found, depth: w.depth + 1, chain, scopes: w.scopes };
}

/**
 * The `%x`, `%{x}` and `%{x-default}` substitutions in `[from, to)` of a statement tf substitutes,
 * outside the expressions in `skip` (which read their own, and whose strings tf leaves alone).
 */
function percents(w: Walk, from: number, to: number, skip: Uint8Array): void {
  const s = w.src.text;
  for (let i = from; i < to; i += 1) {
    if (skip[i]) continue;
    if (s[i] === "\\") {
      i += 1;
      continue;
    }
    if (s[i] !== "%") continue;
    let j = i;
    while (s[j] === "%") j += 1;
    const c = s[j];
    if (j - i > 1 || !(c === "{" || c === "#" || c === "?" || c === "*" || c === "-" || isNameChar(c))) {
      // A run of %s is text here (the level below reads it), and so is a % before anything else.
      i = j - 1;
      continue;
    }
    const sel = readSelector(s, j);
    // `%{name%{n}}`: the name is built at run time, so it isn't this variable.
    const built = c === "{" && sel !== undefined && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
    if (sel?.name !== undefined && !built) {
      push(w, sel.name, "read", c === "{" ? "percent-braced" : "percent", sel.nameStart, sel.nameEnd);
    }
    // Carry on from the end of the name, so a default's own substitutions are read too.
    i = (sel?.nameEnd ?? j) - 1;
  }
}

/**
 * getopts()' first argument names its options: each letter is a local `opt_<letter>`, set in the
 * calling macro's scope (expr.c FN_getopts: setlocalstrvar() and friends), and a `:`, `#` or `@`
 * after one says what kind of value it takes. Only a literal string can be read.
 */
function getopts(w: Walk, i: number, to: number): void {
  const s = w.src.text;
  while (isTfSpace(s[i])) i += 1;
  const quote = s[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return;
  const close = matching(s, i - 1, to, "(", ")");
  for (let k = i + 1; k < to && s[k] !== quote; k += 1) {
    const c = s[k] as string;
    if (c === "\\") return;
    if (/[A-Za-z]/.test(c)) push(w, `opt_${c}`, "getopts", "option-letter", k, k + 1, close);
  }
}

/** Variable names in the expression `[from, to)`. */
function expression(w: Walk, from: number, to: number): void {
  const s = w.src.text;
  let i = from;
  while (i < to) {
    const c = s[i] as string;
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(s, i, to);
    } else if (c === "%") {
      let j = i;
      while (s[j] === "%") j += 1;
      if (j === i + 1) {
        const sel = readSelector(s, j);
        const built = s[j] === "{" && sel !== undefined && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
        if (sel?.name !== undefined && !built) {
          push(w, sel.name, "read", s[j] === "{" ? "percent-braced" : "percent", sel.nameStart, sel.nameEnd);
        }
      }
      i = Math.max(substitutionEnd(s, j, to), j);
    } else if (c === "{") {
      const sel = readSelector(s, i);
      const built = sel !== undefined && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
      if (sel?.name !== undefined && !built) push(w, sel.name, "read", "expr-braced", sel.nameStart, sel.nameEnd);
      i = Math.max(substitutionEnd(s, i, to), i + 1);
    } else if (c === "/" && isNameFirst(s[i + 1]) && (i === from || isTfSpace(s[i - 1]))) {
      // `x /y` divides by y; when y names a command, tf warns of a missing %; and it's no variable.
      let k = i + 1;
      while (isNameChar(s[k])) k += 1;
      i = COMMAND_NAMES.has(s.slice(i + 1, k).toLowerCase()) ? k : i + 1;
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
      if (s[start - 1] === "}" || s[start - 1] === "]" || (s[i] === "%" && !isStatEnd(s, i)) || s[i] === "$" || s[i] === "{") {
        continue;
      }
      let k = i;
      while (isTfSpace(s[k])) k += 1;
      if (s[k] === "(") {
        // A function call (expr.c unary_expr()). getopts("ab:", ...) sets a local opt_a and opt_b.
        if (s.slice(start, i) === "getopts") getopts(w, k + 1, to);
        continue;
      }
      let b = start - 1;
      while (isTfSpace(s[b])) b -= 1;
      const prefix = (s[b] === "+" && s[b - 1] === "+") || (s[b] === "-" && s[b - 1] === "-");
      const assigns = (":+-*/".includes(s[k] ?? "x") && s[k + 1] === "=") || prefix;
      push(w, s.slice(start, i), assigns ? "assign" : "read", "expr-bare", start, i);
    } else {
      i += 1;
    }
  }
}

const COMMAND_RE = /^\/@?([A-Za-z_]+)/;
const MACRO_DEFINER = /^(?:def|bind|hook|trig|trigc|trigp|trigpc|alias)$/;

/** A `/set`, `/setenv`, `/let`, `/unset` or `/export` statement's variable. */
function command(w: Walk, word: string, st: Statement, argStart: number): void {
  const s = w.src.text;
  let i = argStart;
  while (i < st.end && isTfSpace(s[i])) i += 1;
  const start = i;
  if (word === "unset" || word === "export") {
    // The whole rest of the statement is the name (handle_unset_command()).
    let end = st.end;
    while (end > start && isTfSpace(s[end - 1])) end -= 1;
    const name = s.slice(start, end);
    if (isVariableName(name)) push(w, name, word, "command", start, end);
    return;
  }
  if (!isNameFirst(s[i])) return;
  while (i < st.end && isNameChar(s[i])) i += 1;
  // setdelim(): the name ends at `=`, a blank or the end; anything else is "illegal variable name".
  if (i < st.end && s[i] !== "=" && !isTfSpace(s[i])) return;
  const hasValue = s[i] === "=" || s.slice(i, st.end).trim() !== "";
  const access = !hasValue ? "read" : (word as VariableAccess);
  push(w, s.slice(start, i), access, "command", start, i, access === "let" ? st.end : undefined);
}

/** `/eval [-s<level>] TEXT`: TEXT is read again, as `level` reads it (the default, a macro body). */
function evalText(w: Walk, st: Statement, argStart: number): void {
  const s = w.src.text;
  let i = argStart;
  let mode: StructureMode = "body";
  for (;;) {
    while (i < st.end && isTfSpace(s[i])) i += 1;
    if (s[i] !== "-") break;
    let k = i;
    while (k < st.end && !isTfSpace(s[k])) k += 1;
    const opt = s.slice(i, k);
    i = k;
    if (opt === "-" || opt === "--") break;
    const picked = opt.startsWith("-s") ? evalMode(opt.slice(2)) : undefined;
    if (!picked) return; // an error: nothing runs
    mode = picked;
  }
  // /eval runs its text in a scope of its own, inside the running macro's (expand.c).
  walk(inner(w, handedOn(w, st, i), [newScope(w, "eval"), ...(w.chainAt?.(st.start) ?? w.chain)]), mode);
}

/** The text a command hands on to run later, `[from, st.end)`: a substituted statement's runs of %s are one shorter. */
function handedOn(w: Walk, st: Statement, from: number): Source {
  return st.level === "keyword" ? slice(w.src, from, st.end) : shortened(w.src, from, st.end);
}

/** The next blank-separated word at or after `i`, before `end`. */
function nextWord(s: string, i: number, end: number): { start: number; end: number } | undefined {
  while (i < end && isTfSpace(s[i])) i += 1;
  if (i >= end) return undefined;
  const start = i;
  while (i < end && !isTfSpace(s[i])) i += 1;
  return { start, end: i };
}

/**
 * `/for VAR START END COMMAND`: stdlib.tf's /for runs `/@eval /let VAR=START%%; /while (...)
 * COMMAND%%; ...`, so COMMAND is read as a macro body, in the scope of that /eval, where VAR is a
 * local, inside the scopes of whatever ran the /for.
 */
function forCommand(w: Walk, st: Statement, argStart: number): void {
  const s = w.src.text;
  const v = nextWord(s, argStart, st.end);
  const first = v && nextWord(s, v.end, st.end);
  const last = first && nextWord(s, first.end, st.end);
  const command = last && nextWord(s, last.end, st.end);
  if (!v || !command || !isVariableName(s.slice(v.start, v.end))) return;
  const scope = newScope(w, "for");
  const chain = [scope, ...(w.chainAt?.(st.start) ?? w.chain)];
  w.found.push({ name: s.slice(v.start, v.end), access: "let", form: "command", ...at(w, v.start, v.end), from: -Infinity, chain });
  walk(inner(w, handedOn(w, st, command.start), chain), "body");
}

/**
 * `/repeat [-options] COUNT COMMAND`: process.c compiles COMMAND as a macro body (SUB_MACRO) and
 * runs it later, from the top level, so it sees no local of the macro that ran the /repeat.
 */
function repeatCommand(w: Walk, st: Statement, argStart: number): void {
  const s = w.src.text;
  let word = nextWord(s, argStart, st.end);
  while (word && s[word.start] === "-") word = nextWord(s, word.end, st.end);
  const command = word && nextWord(s, word.end, st.end);
  if (!command) return;
  walk(inner(w, handedOn(w, st, command.start), [newScope(w, "repeat")]), "body");
}

/** `/def -E"expr"`: its expression, from the options before the body. */
function defExpression(w: Walk, from: number, to: number): void {
  const s = w.src.text;
  for (let i = from; i < to - 1; i += 1) {
    if (!(s[i] === "-" && s[i + 1] === "E" && (i === from || isTfSpace(s[i - 1])))) continue;
    let k = i + 2;
    const quote = s[k];
    if (quote === '"' || quote === "'" || quote === "`") {
      const end = skipString(s, k, to);
      expression(w, k + 1, end - 1);
      i = end;
    } else {
      while (k < to && !isTfSpace(s[k])) k += 1;
      expression(w, i + 2, k);
      i = k;
    }
  }
}

function slice(src: Source, start: number, end: number): Source {
  return { text: src.text.slice(start, end), map: src.map.slice(start, end + 1) };
}

function statement(w: Walk, st: Statement, skip: Uint8Array): void {
  const s = w.src.text;
  if (st.level === "full") percents(w, st.start, st.end, skip);
  const m = COMMAND_RE.exec(s.slice(st.start, Math.min(st.end, st.start + 40)));
  if (!m) return;
  const word = (m[1] as string).toLowerCase();
  const argStart = st.start + m[0].length;
  if (argStart < st.end && !isTfSpace(s[argStart])) return;
  if (word === "set" || word === "setenv" || word === "let" || word === "unset" || word === "export") {
    command(w, word, st, argStart);
  } else if (w.depth >= 8) {
    // Deep enough: text that runs text that runs text isn't read any further.
  } else if (word === "eval") {
    evalText(w, st, argStart);
  } else if (word === "for") {
    forCommand(w, st, argStart);
  } else if (word === "repeat") {
    repeatCommand(w, st, argStart);
  } else if (MACRO_DEFINER.test(word)) {
    const text = s.slice(st.start, st.end);
    const body = macroBodyStart(text);
    if (word === "def") defExpression(w, argStart, body < 0 ? st.end : st.start + body - 1);
    // A definition inside a substituted body: its own body is read again, as the macro will see
    // it, in a scope of its own (it runs whenever it's called, not inside this macro).
    if (st.level === "full" && body >= 0) {
      walk(inner(w, shortened(w.src, st.start + body, st.end), [newScope(w, "def")]), "body");
    }
  }
}

/** The strings inside each `$[...]` and condition, which tf doesn't substitute (`$["%Y"]` stays `%Y`). */
function stringsIn(s: string, expressions: ExpressionRegion[]): Uint8Array {
  const mask = new Uint8Array(s.length + 1);
  for (const ex of expressions) {
    if (ex.kind === "statement") continue;
    let k = ex.start;
    while (k < ex.end) {
      const c = s[k];
      if (c === '"' || c === "'" || c === "`") {
        const end = skipString(s, k, ex.end);
        mask.fill(1, k, end);
        k = end;
      } else if (c === "$" && s[k + 1] === "(") {
        // A command substitution's statements are substituted as usual.
        k = matching(s, k + 1, ex.end, "(", ")");
      } else {
        k += 1;
      }
    }
  }
  return mask;
}

/**
 * The scopes at each offset of a walk's text: its own chain, with a scope for each `$(...)` the
 * offset is in added in front (expand.c pushes one for each command substitution).
 */
function scopesOf(w: Walk, cmdsubs: { start: number; end: number }[]): (offset: number) => string[] {
  if (cmdsubs.length === 0) return () => w.chain;
  // They nest, so one sweep finds each offset's innermost $(...) and each one's parent.
  const subs = [...cmdsubs].sort((a, b) => a.start - b.start || b.end - a.end);
  const owner = new Int32Array(w.src.text.length + 1).fill(-1);
  const parent: number[] = [];
  const stack: number[] = [];
  let k = 0;
  for (let p = 0; p <= w.src.text.length; p += 1) {
    while (stack.length > 0 && (subs[stack[stack.length - 1] as number] as { end: number }).end <= p) stack.pop();
    while (k < subs.length && (subs[k] as { start: number }).start <= p) {
      parent[k] = stack[stack.length - 1] ?? -1;
      stack.push(k);
      k += 1;
      while (stack.length > 0 && (subs[stack[stack.length - 1] as number] as { end: number }).end <= p) stack.pop();
    }
    owner[p] = stack[stack.length - 1] ?? -1;
  }
  const names = subs.map(() => newScope(w, "cmdsub"));
  const chains = new Map<number, string[]>();
  const chainOf = (i: number): string[] => {
    if (i < 0) return w.chain;
    let c = chains.get(i);
    if (!c) {
      c = [names[i] as string, ...chainOf(parent[i] as number)];
      chains.set(i, c);
    }
    return c;
  };
  return (offset) => chainOf(owner[offset] ?? -1);
}

function walk(w: Walk, mode: StructureMode): void {
  const { statements, expressions, cmdsubs } = parseRegions(w.src.text, mode);
  w.chainAt = scopesOf(w, cmdsubs);
  const skip = stringsIn(w.src.text, expressions);
  for (const st of statements) statement(w, st, skip);
  for (const ex of expressions) region(w, ex, skip);
}

function region(w: Walk, ex: ExpressionRegion, skip: Uint8Array): void {
  // A /test, /return or /result in a substituted body is substituted first, strings and all.
  if (ex.kind === "statement" && ex.level === "full") percents(w, ex.start, ex.end, skip);
  expression(w, ex.start, ex.end);
}

function entryVariables(entry: LogicalEntry, index: number): VariableOccurrence[] {
  const s = entry.text;
  const found: Found[] = [];
  const src: Source = { text: s, map: Array.from({ length: s.length + 1 }, (_, i) => i) };
  const local = `local:${index}`;
  const scopes = { prefix: local, next: 0 };
  // A top-level /let is "illegal at top level" in tf; it still gets a scope of its own here.
  walk({ src, found, depth: 0, chain: [`${local}:top`], scopes }, "top");
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(s) : -1;
  if (body >= 0) walk({ src: slice(src, body, s.length), found, depth: 0, chain: [local], scopes }, "body");

  // A name can be read twice (an expression inside another one, or a level and the one below):
  // keep the first.
  const seen = new Set<number>();
  const unique = found.filter((f) => !seen.has(f.start) && (seen.add(f.start), true)).sort((a, b) => a.start - b.start);

  // Where each scope's own variables start to exist: the end of the first /let (or getopts()).
  const born = new Map<string, number>();
  const binds = (f: Found): boolean => f.access === "let" || f.access === "getopts";
  for (const f of unique) {
    if (!binds(f) || f.from === undefined) continue;
    const key = `${f.chain[0]}\0${f.name}`;
    born.set(key, Math.min(born.get(key) ?? Infinity, f.from));
  }
  const out: VariableOccurrence[] = [];
  for (const f of unique) {
    let scope = "global";
    if (binds(f)) scope = f.chain[0] as string;
    else if (f.access === "read" || f.access === "assign") {
      // The nearest scope whose variable exists by then, as hfindnearestvar() searches.
      scope = f.chain.find((c) => (born.get(`${c}\0${f.name}`) ?? Infinity) <= f.start) ?? "global";
    }
    const first = entry.offsetMap[f.start];
    const last = entry.offsetMap[f.end - 1];
    // A name split across a `\`-continued line has no single range to point at.
    if (!first || !last || first.line !== last.line) continue;
    out.push({
      name: f.name,
      access: f.access,
      form: f.form,
      scope,
      entry: index,
      offset: f.start,
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
