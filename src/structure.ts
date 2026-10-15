import { isTfSpace, type LogicalEntry } from "./logicalEntries";
import { defOptionsEnd } from "./symbols";

/**
 * A model of how tf compiles a command list (`list()`, `statement()`, `expand()` and the
 * substitution scanners in tinyfugue/src/expand.c), close enough to find the errors tf's
 * compiler reports: a block left open, a keyword with no block to belong to, text glued on after
 * `/endif` or `/done`, and a `$[`, `${`, `$(`, `%{` or string that never closes. Proven against
 * real tf (tests/tfscript/cases/ in ~/ai/mud):
 *
 *  - Keywords are only keywords at the start of a statement. `/if (x) /echo a /else /echo b
 *    /endif` is one `/echo` whose text happens to contain `/else` and `/endif`, so the `/if` is
 *    never closed ("expected /endif, found end of body").
 *  - A macro body is compiled when the macro first runs (or at `/def` with `%defcompile` on), so
 *    its errors appear then, and the macro does nothing. A top-level line is compiled as it loads.
 *  - At the top level only keywords are read (`SUB_KEYWORD`): `%;` doesn't separate and nothing is
 *    substituted, so a plain command is one statement to the end of the line. Inside a top-level
 *    `/if` or `/while`, and from then on in that line, `%;` separates (`SUB_NEWLINE`), but there is
 *    still no `%{`, `$[` or `\` processing.
 *  - In a macro body (`SUB_MACRO`) `\` escapes the next character, a run of two or more `%`s is
 *    literal (so `%%;` and `%%%;` are text, not separators), and quotes are ordinary characters
 *    outside an expression: `/echo "a%; b"` is two statements.
 *  - Strings (`"..."`, `'...'` or `` `...` ``, tf's `is_quote()`) only matter inside an expression
 *    (`$[...]`, an `/if (...)` condition, `/test`): there, `"%;"` and `"]"` are text.
 *  - `/break` outside a loop is accepted (it ends the macro), but not inside a `$(...)`: there it
 *    may only end loops opened inside that `$(...)` (see `breakStatement`).
 *
 * Only the first error is reported, as tf stops compiling there. Warnings tf prints without
 * stopping (a `%;` straight after `/if (...)` or `/else` sends a blank line) are collected as
 * they come.
 */

/**
 * How much tf processes the text: a macro body (`SUB_MACRO`/`SUB_FULL`), a top-level line
 * (`SUB_KEYWORD`), or `/eval -son` (`SUB_NEWLINE`: `%;` separates, nothing is substituted).
 */
export type StructureMode = "body" | "top" | "newline";

export type StructureKind =
  /** Block structure: an unclosed or unexpected keyword, or text after /endif or /done. */
  | "block"
  /**
   * A keyword in the middle of a statement, where tf reads it as text (keyword_parse() only runs
   * at the start of one), which leaves its block unfinished.
   */
  | "keyword"
  /**
   * A keyword in the middle of a statement that its block would have taken, in a block that still
   * closes: tf runs it as text, with no error (`/if (1) /set a=1 /else /set b=2%; /endif`).
   */
  | "keyword-warning"
  /** A statement in a condition list that isn't a command: tf sends it to the world (list() in expand.c). */
  | "condition-text"
  /** A keyword glued to what follows it (`/if(1)`), which tf reads as a command of that whole name. */
  | "glued"
  /** A keyword glued to punctuation (`/endif;`, `/done:x`), which may also be a macro's name. */
  | "glued-punct"
  /** A top-level /if or /while still open where its (joined) line ends. */
  | "continuation"
  /** A `%{...}`, `%-`, `${...}` or `$(...)` tf can't read (`varsub()`, `macsub()`, `cmdsub()`). */
  | "substitution"
  /** A `$[...]`, string, parenthesis or condition tf's expression compiler can't read (expr.c). */
  | "expression"
  /**
   * A `$[...]` or `%{x}` that is itself an operand of an expression (expr.c's `primary_expr()`):
   * legal, but tf warns. Reported as it comes; compiling carries on.
   */
  | "operand"
  /** A statement with nothing in it (`%;%;`, `/then%;`, `$(...%;)`), which tf sends as a blank line. */
  | "empty-statement"
  /** Nesting past MAX_DEPTH levels, where the check stops (information, not a problem in tf). */
  | "too-deep";

/** A span of the checked text with a note on it, shown as a related location. */
export interface IssueNote {
  start: number;
  end: number;
  message: string;
}

/** Replace `start`..`end` with `newText` (an insertion when they are equal). */
export interface IssueEdit {
  start: number;
  end: number;
  newText: string;
}

export interface IssueFix {
  title: string;
  edits: IssueEdit[];
}

/**
 * What a diagnostic can say beyond its one-sentence message: a short label for the marked span,
 * a prose explanation for the hover, other spans that take part, and a mechanical fix.
 */
export interface IssueDetail {
  message: string;
  label?: string;
  explanation?: string;
  related?: IssueNote[];
  fix?: IssueFix;
}

export interface StructureIssue extends IssueDetail {
  kind: StructureKind;
  /** Offsets into the text given to `checkStructure`. */
  start: number;
  end: number;
}

/**
 * An `/if` or `/while` in the middle of a statement, which tf reads as text, with offsets into
 * the checked text: the keyword, where its statement starts, its command, and the `%;`s that
 * would make it a statement of its own (none where `%;` doesn't separate, on a plain top-level
 * line). Just text, unless the block it would have opened is what a later keyword needed:
 * pairSwallowed() finds that out, and moves the problem tf reports to it.
 */
export interface Swallowed {
  start: number;
  end: number;
  word: string;
  stmt: number;
  /** The statement's command, lower case without its slash, or "" for plain text. */
  command: string;
  edits: IssueEdit[];
  /**
   * The problem it leads to, which tf reports instead (an `/endif` or `/else` with no `/if`, a
   * `/done` with no `/while`): set when putting `%;` before the keyword makes that go away.
   */
  stray?: IssueNote;
}

/** `issue` with every offset moved by `by`. */
export function shiftIssue<T extends StructureIssue>(issue: T, by: number): T {
  return {
    ...issue,
    start: issue.start + by,
    end: issue.end + by,
    ...(issue.related ? { related: issue.related.map((n) => ({ ...n, start: n.start + by, end: n.end + by })) } : {}),
    ...(issue.fix
      ? { fix: { ...issue.fix, edits: issue.fix.edits.map((e) => ({ ...e, start: e.start + by, end: e.end + by })) } }
      : {}),
  };
}

/** One command statement, as offsets into the text that was parsed. */
export interface Statement {
  start: number;
  end: number;
  /**
   * How tf processes the statement's text: "full" in a macro body (`%{...}`, `$[...]`, `\`, and
   * a run of `%`s loses one), "newline" inside a top-level `/if` or `/while` and under
   * `/eval -son` (only the `%` runs), "keyword" for a plain top-level command (nothing).
   */
  level: SubLevel;
  /** Inside an `/if` or `/while` (its conditions included), so it may not run, or may run often. */
  conditional: boolean;
}

export type SubLevel = "keyword" | "newline" | "full";

/**
 * A statement, or a whole `/if`...`/endif` or `/while`...`/done` block, as offsets into the text
 * that was parsed, with the list of statements it runs in (Parser.lists).
 */
export interface Unit {
  start: number;
  /** Where its text ends: before the `%;` after it, or after the block's `/endif` or `/done` (and the blanks after those). */
  end: number;
  list: number;
  /** The command, lower case, without its `/` and any `@` or `!`: "" for text sent to the world, "if" or "while" for a block. */
  word: string;
  block: boolean;
}

/**
 * A run of statements tf runs one after another: a macro body, or a block's condition list,
 * branch or loop body, or a `$(...)`.
 */
export interface UnitList {
  kind: "body" | "condition" | "cmdsub";
}

/**
 * Text tf compiles as an expression, as offsets into the text that was parsed: the inside of a
 * `$[...]` or a `(condition)`, or the text of a `/test`, `/return` or `/result` statement, which
 * is substituted at `level` first.
 */
export interface ExpressionRegion {
  start: number;
  end: number;
  kind: "bracket" | "condition" | "statement";
  /** For a statement, how its text is substituted before it is compiled. */
  level?: SubLevel;
}

/**
 * A bracketed piece of text the parser read, as offsets into the text that was parsed: a
 * substitution (`%{...}`, `%name`, `${...}`, `$[...]`, `$(...)`, `{...}` in an expression), an
 * `/if` or `/while` condition, a parenthesis or a string in an expression. `inner` is what lies
 * between its brackets or quotes; a bare `%name` has none.
 */
export interface Span {
  start: number;
  end: number;
  kind: "substitution" | "condition" | "paren" | "string";
  inner?: { start: number; end: number };
}

/**
 * An `/if`...`/endif` or `/while`...`/done` that closed, from its keyword to the end of its
 * closing one, with each part of its body: after a condition, `/then`, `/do` or `/else`, up to the
 * next `/elseif`, `/else`, `/endif` or `/done` (the separator before that keyword included).
 */
export interface BlockRegion {
  start: number;
  end: number;
  parts: { start: number; end: number }[];
}

const levelOf = (subs: number): SubLevel => (subs >= FULL ? "full" : subs >= NEWLINE ? "newline" : "keyword");

const KEYWORDS = new Set([
  "break", "do", "done", "else", "elseif", "endif", "exit", "if",
  "let", "result", "return", "set", "setenv", "test", "then", "while",
]);

/** Keywords that only make sense inside a block, so finding one mid-statement suggests a missing `%;`. */
const INNER_KEYWORDS = new Set(["then", "else", "elseif", "endif", "do", "done"]);

type Block = "" | "if" | "elseif" | "then" | "else" | "endif" | "while" | "do" | "done";

const KEYWORD = 1;
const NEWLINE = 2;
const FULL = 3;

class Stop extends Error {}

/** The check, not tf, stops: nesting past MAX_DEPTH (see Parser.deeper). */
class TooDeep extends Stop {}

/**
 * How deep blocks and substitutions may nest before the check gives up (see Parser.deeper). Each
 * nested `/if`, `/while`, `$(...)`, `$[...]` or `%{name-...}` default is one level. Measured on
 * Node 24 with its default stack, the parser's own recursion overflowed at about 937 `$(...)`,
 * 1688 `/if`, 1875 `$[...]` and 2500 `%{x-` in one run, and at 1250 `$(...)`, 1562 `/if` in
 * another (how much stack is already in use when it starts differs). `$(...)` recurses deepest,
 * so this stays well under the lower figure for it.
 */
const MAX_DEPTH = 400;

interface MidKeyword {
  start: number;
  end: number;
  word: string;
  /** The command the keyword sits in, lowercase without its slash, or "" for plain text. */
  command: string;
  /** Where that statement starts. */
  stmt: number;
  /**
   * The innermost open block would have taken it, had it started a statement: an /else or
   * /elseif in an /if's body, an /endif in one, a /done in a /while's. If that block still closes,
   * tf runs it as text with no error (the /else ends up in a /set value): a warning.
   */
  taken: boolean;
}

/**
 * The commands whose arguments hold commands they run (or store as a macro body): a keyword in them
 * is meant for those commands, not for the block the statement is in. MACRO_DEFINER's
 * (substitution.ts), and the ones that run their text: /repeat, /at, /quote, /eval, /for, and
 * stdlib's /not (`/@eval %*`).
 */
export const TAKES_COMMANDS = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias|repeat|at|quote|eval|for|not)$/;

/**
 * A /let, /set or /setenv assignment, whose value takes the rest of the statement
 * (keyword-mid-statement's own wording): `name=value` or `name value`, with any `@` or `!` prefix
 * (`/@set` and `/!set` are /set too). Proven in tf (rev-s4b w13, w18: `/!set x13=1 /else ...` and
 * `/set x18 1 /else ...` take the /else into the value).
 */
const LET_ASSIGNMENT_RE = /^\/[@!]*(let|set|setenv)\b\s+[^\s=]+(?:\s*=|\s+\S)/i;

/** How keyword-mid-statement names what took a keyword: "the /set value", "the /echo command", ... */
export function swallower(s: string, stmt: number, command: string): string {
  const assignment = LET_ASSIGNMENT_RE.exec(s.slice(stmt));
  if (assignment) return `the /${(assignment[1] as string).toLowerCase()} value`;
  if (!command) return "the text before it";
  return ["test", "return", "result"].includes(command) ? `the /${command} expression` : `the /${command} command`;
}

/** How the statement's command took `/word`, for the hover: `what` is swallower()'s name for it. */
export function takesTheRest(command: string, word: string, what: string): string {
  if (what.endsWith(" value")) {
    const set = what.slice("the ".length, -" value".length);
    return `${code(set)} takes the rest of the statement, up to the next ${code("%;")}, as its value, so ${code(`/${word}`)} ends up in the value.`;
  }
  if (what.endsWith(" expression")) {
    return `${code(`/${command}`)} reads its expression up to the next ${code("%;")}, so ${code(`/${word}`)} becomes part of the expression.`;
  }
  return command
    ? `There is no ${code("%;")} before ${code(`/${word}`)}, so ${code(`/${command}`)} takes it, and everything after it up to the next ${code("%;")}, as its own text.`
    : `There is no ${code("%;")} before ${code(`/${word}`)}, so it is read as part of the text before it.`;
}

interface Open {
  keyword: "if" | "while";
  start: number;
  end: number;
  /** Where the current part of its body (after a condition, /then, /do or /else) starts. */
  body?: number;
  /** How many `$(...)` it is inside. */
  cmdsub: number;
  /**
   * Where its last /else or /elseif is: a keyword read as text before it can't be what would have
   * closed the block, since with a %; it would close it early and leave the /else stray (proven).
   */
  branch?: number;
  /** The parts of its body read so far (BlockRegion.parts). */
  parts: { start: number; end: number }[];
}

function isNameChar(ch: string | undefined): boolean {
  return ch !== undefined && (/[A-Za-z0-9_]/.test(ch) || ch.charCodeAt(0) >= 0x80);
}

/** A command at the start of a statement: its `/`, any `@` or `!` (the prefix), and its name. */
export const COMMAND_RE = /^\/([@!]*)([^\s%)]*)/;

/**
 * The command a statement at `start` runs: its name, lower case, without its `/` and any `@` or
 * `!`, and that prefix as written; "" for text. The one reading of a command word, for every rule.
 * A keyword is one only with no prefix or exactly one `@` (keyword_parse(), expand.c): `/@if` is
 * `/if`, but `/@@if` and `/!if` look for a command `@if` or `if`.
 */
export function commandParts(s: string, start: number): { prefix: string; word: string } {
  if (s[start] !== "/") return { prefix: "", word: "" };
  const m = COMMAND_RE.exec(s.slice(start));
  return { prefix: m?.[1] ?? "", word: (m?.[2] ?? "").toLowerCase() };
}

/** The keywords a block is made of, and /break: the ones a missing blank turns into a command name. */
const GLUABLE_KEYWORDS = new Set(["if", "elseif", "while", "then", "else", "endif", "do", "done", "break"]);

/**
 * What may follow a keyword's name glued to it, so that tf reads them as one word: not a blank,
 * `%` or `)` (keyword_parse() stops there, so the keyword is one), nor a character a macro name
 * goes on with (`/ifx`, `/if_x`, `/if-x` and `/if.x` may well be macros).
 */
const GLUE_RE = /[(/;,:"'`[{$!?*+=<>|&^~#@]/;

/**
 * A block keyword at `start` glued to what follows it (`/if(1)`, `/else/echo b`, `/endif;`): tf
 * reads a keyword up to a blank, `%` or `)` (keyword_parse() in expand.c), so it takes the whole
 * word as the name of a command, and finds none ("if(1): no such command or macro", proven; and
 * `/endif;` leaves its /if open, rev-s4 s09). The keyword's name, where it ends, and where the
 * word tf runs ends (at a blank or `%`). Only with no prefix or one `@`, as a keyword is written.
 */
export function gluedKeywordAt(s: string, start: number): { word: string; nameEnd: number; tokenEnd: number } | undefined {
  if (s[start] !== "/") return undefined;
  let p = start + 1;
  if (s[p] === "@") p += 1;
  let q = p;
  while (q < s.length && /[A-Za-z]/.test(s[q] as string)) q += 1;
  const word = s.slice(p, q).toLowerCase();
  if (!GLUABLE_KEYWORDS.has(word) || !GLUE_RE.test(s[q] ?? "")) return undefined;
  let e = q;
  while (e < s.length && !isTfSpace(s[e]) && s[e] !== "%") e += 1;
  return { word, nameEnd: q, tokenEnd: e };
}

/**
 * Where the text after the parenthesis at `open` and its matching `)` starts, past the blanks
 * after it (strings skipped as expressions read them); the end of `s` if it never closes.
 */
function afterParens(s: string, open: number): number {
  let depth = 0;
  for (let p = open; p < s.length; p += 1) {
    const ch = s[p];
    if (ch === '"' || ch === "'" || ch === "`") {
      p += 1;
      while (p < s.length && s[p] !== ch) p += s[p] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) {
      let q = p + 1;
      while (isTfSpace(s[q])) q += 1;
      return q;
    }
  }
  return s.length;
}

/** The command a statement at `start` runs, lower case, without its `/` and any `@` or `!` (commandParts). */
export function commandWord(s: string, start: number): string {
  return commandParts(s, start).word;
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "0" && ch <= "9";
}

/** `text` as a Markdown code span, for the hover explanations (which are Markdown). */
export function code(text: string): string {
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
}

function charName(ch: string): string {
  if (ch === " ") return "space";
  if (ch === "\t") return "tab";
  if (ch === "\r") return "carriage return";
  return ch < " " ? `control character U+${ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}` : `'${ch}'`;
}

/**
 * The hover for a top-level block still open where its command ends. In a file, tf runs each line
 * as a command of its own unless it ends in `\` (load_file() in command.c): this is true of every
 * command, not only of `/if`, so a block has to be complete within one command.
 */
const CONTINUATION_EXPLANATION =
  `In a file, every command ends at the end of its line, unless the line ends in ${code("\\")}: then tf joins the ` +
  `next line on. So a block has to be complete within one command: on one line with ${code("%;")} between its ` +
  `statements, or on lines that each end in ${code("\\")} but the last. (On a top-level line that starts with ` +
  `${code("/if")} or ${code("/while")}, ${code("%;")} separates statements, but ${code("%")} substitutions such as ` +
  `${code("%{x}")} aren't done in its commands; a variable in its condition still works. Put the block in a ` +
  `${code("/def")} to substitute in the commands too.)`;

/**
 * A top-level block still open where its command ends, waiting for `/then`, `/do` (a condition
 * list) or its closer. missingContinuation.ts rewrites the message when a later line holds the
 * keyword that was meant to be part of it.
 */
function continuation(word: "if" | "while", missing: string, conditionList: boolean): IssueDetail {
  return {
    message: conditionList
      ? `This /${word}'s command ends before the /${missing} of its condition list: end each line but the last with \\.`
      : `This /${word}'s command ends without ${missing === "endif" ? "an" : "a"} /${missing}: add %; /${missing}, or end each line but the last with \\.`,
    label: `no /${missing} in this command`,
    explanation: CONTINUATION_EXPLANATION,
  };
}

function describeBlock(block: Block): string {
  switch (block) {
    case "then": return "in an /if body";
    case "do": return "in a /while body";
    case "if": case "elseif": return "in an /if condition, before its /then";
    case "while": return "in a /while condition, before its /do";
    case "else": return "after /else";
    default: return "outside any /if or /while";
  }
}

class Parser {
  private i = 0;
  private block: Block = "";
  private cmdsub = 0;
  /** Where each `$(` the parser is inside starts, outermost first, and whether it is an expression operand. */
  private readonly cmdsubStarts: { at: number; inExpression: boolean }[] = [];
  private depth = 0;
  private readonly open: Open[] = [];
  private readonly mids: MidKeyword[] = [];
  /** Every keyword glued to what follows it, with its issue, to note the problems it leads to on. */
  private readonly glued: { word: string; start: number; issue: StructureIssue }[] = [];
  /** Every keyword glued to punctuation, which may be a macro's name (`/endif;`, `/done:x`). */
  private readonly gluedPunct: { word: string; start: number }[] = [];
  /** Where the last `(condition)` ended (after its blanks), and the keyword it belongs to. */
  private conditionEnd: { at: number; keyword: string } | undefined;
  readonly issues: StructureIssue[] = [];
  /** Every plain command statement read, in order (not `/test`, `/return` or `/result`). */
  readonly statements: Statement[] = [];
  /** Every expression read, in the order each one ended. */
  readonly expressions: ExpressionRegion[] = [];
  /** The inside of every `$(...)` read, which runs in a variable scope of its own. */
  readonly cmdsubs: { start: number; end: number }[] = [];
  /** Every substitution, condition, parenthesis and string read, in the order each one ended. */
  readonly spans: Span[] = [];
  /** Every block that closed, in the order each one closed. */
  readonly blocks: BlockRegion[] = [];
  /** Where the last /endif or /done read ends. */
  private closeEnd = 0;
  /** Compiling stopped at an error, so tf runs none of this text. */
  stopped = false;
  /** /ifs and /endifs swallowed by a /let or /set value (for keyword-mid-statement). */
  readonly swallowed: Swallowed[] = [];
  /** For each "keyword-warning" issue, its keyword and what took it, should it turn out to be the error (parseSettled()). */
  readonly warned = new Map<StructureIssue, { word: string; what: string; command: string }>();
  /** Every statement and block, in the order each one ended, with the list it is in. */
  readonly units: Unit[] = [];
  readonly lists: UnitList[] = [];
  private listId = -1;
  /** The keyword or condition the next statement follows, for an empty statement's message. */
  private emptyAfter: { label: string; warns: boolean } | undefined;
  /** The separator that ended the last statement, and where: an empty statement after `%|` is an error, not a send. */
  private lastSep: { at: number; char: string } | undefined;
  /** The block each open `$(...)` was in: tf's `block` is one global, which a `$(...)` doesn't reset. */
  private readonly cmdsubBlocks: Block[] = [];
  constructor(private readonly s: string, private readonly mode: StructureMode) {}

  run(): void {
    try {
      if (this.mode === "body") this.list(FULL);
      else if (this.mode === "newline") this.list(NEWLINE);
      else this.list(KEYWORD);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      if (!(e instanceof TooDeep)) this.stopped = true;
    }
  }

  /** `is_end_of_statement()`: `%` then `;`, `|` or `\` (`IS_STATEND` in util.c; `%\` proven to separate). */
  private isStatEnd(p: number): boolean {
    const next = this.s[p + 1];
    return this.s[p] === "%" && (next === ";" || next === "|" || next === "\\");
  }

  private isCmdsubEnd(p: number): boolean {
    return this.cmdsub > 0 && this.s[p] === ")";
  }

  private skipSpace(): void {
    while (isTfSpace(this.s[this.i])) this.i += 1;
  }

  /** The keyword starting at `p` (just after its `/`), as `keyword_parse()` reads it. */
  private keywordAt(p: number): { word: string; end: number; next: number } | undefined {
    const start = this.s[p] === "@" ? p + 1 : p;
    let end = start;
    while (end < this.s.length && !isTfSpace(this.s[end]) && this.s[end] !== "%" && this.s[end] !== ")") end += 1;
    const word = this.s.slice(start, end).toLowerCase();
    if (!KEYWORDS.has(word)) return undefined;
    let next = end;
    while (isTfSpace(this.s[next])) next += 1;
    return { word, end, next };
  }

  private fail(kind: StructureKind, start: number, end: number, detail: string | IssueDetail): never {
    const d = typeof detail === "string" ? { message: detail } : detail;
    this.issues.push({ kind, start, end: Math.max(end, start + 1), ...d });
    throw new Stop();
  }

  /** `p` pulled back over the blanks before it, but not over a blank escaped with `\`. */
  private pullBack(p: number): number {
    let q = p;
    while (q > 0 && isTfSpace(this.s[q - 1]) && this.s[q - 2] !== "\\") q -= 1;
    return q;
  }

  /** Where to insert a `%;` so it ends the statement before `p`: after its last non-blank. */
  private separatorBefore(p: number): IssueEdit {
    const q = this.pullBack(p);
    // Glued onto a % it would make %%;, which is text; after a \ the % would be escaped.
    if (q === p || this.s[q - 1] === "%" || this.s[q - 1] === "\\") return { start: p, end: p, newText: "%; " };
    return { start: q, end: q, newText: "%;" };
  }

  /** Insert `text` at `p`, pulled back over the blanks before it (the end of a statement). */
  private insertAtEnd(p: number, text: string): IssueEdit {
    const q = this.pullBack(p);
    return { start: q, end: q, newText: text };
  }

  /** Add the statement `/word` at `p`, the end of the body: after a `%;` if one isn't there already. */
  private appendStatement(p: number, word: string): IssueEdit {
    const q = this.pullBack(p);
    // A lone %; already ends the statement (in %%; the run of %s is text).
    // (Not %| or %\: only a %; separates without doing something else.)
    if (this.s[q - 1] === ";" && this.s[q - 2] === "%" && this.s[q - 3] !== "%") return { start: q, end: q, newText: ` /${word}` };
    // Glued onto a % (or a \) the %; would be text.
    const pad = this.s[q - 1] === "%" || this.s[q - 1] === "\\" ? " " : "";
    return { start: q, end: q, newText: `${pad}%; /${word}` };
  }

  /** The innermost open /if or /while, as a related note. */
  private openNote(): IssueNote[] {
    const open = this.open[this.open.length - 1];
    return open ? [{ start: open.start, end: open.end, message: `this /${open.keyword}` }] : [];
  }

  /**
   * A block error. When `fix`, the keyword that would have fixed it, sits in the middle of a
   * statement since the innermost block opened, point at that instead: the likely fix is a `%;`
   * before it. Keywords inside a block that has since closed, or inside a `$(...)`, don't count.
   */
  private blockError(
    start: number,
    end: number,
    problem: IssueDetail,
    fix: string | undefined,
    kind: StructureKind = "block",
    searchTo = start,
  ): never {
    const since = this.open.length > 0 ? (this.open[this.open.length - 1] as Open).start : -1;
    // The keyword that would have fixed it is there, but glued to what follows it (/endif;, /do/echo):
    // the one problem is reported there.
    if (fix && this.gluedBefore(fix, searchTo, since, { start, end, message: `this /${this.open[this.open.length - 1]?.keyword ?? fix}, left open` })) throw new Stop();
    // A closer read as text before the block's /else or /elseif would close it early, as a statement.
    const closerFrom = fix === "endif" ? Math.max(since, this.open[this.open.length - 1]?.branch ?? -1) : since;
    const fixer = fix ? this.mids.find((m) => m.word === fix && m.start > closerFrom && m.start < searchTo) : undefined;
    // Point at the first keyword of that statement: in "/echo a /else /echo b /endif" it is the /else.
    const mid = fixer && this.mids.find((m) => m.stmt === fixer.stmt && m.start > since);
    if (fixer && mid) this.fail("keyword", mid.start, mid.end, this.midKeyword(mid, fixer, since));
    this.fail(kind, start, end, problem);
  }

  /**
   * A `%;` before each swallowed keyword, and after a swallowed `/endif` or `/done` that has more
   * text after it (which would otherwise be "text after /endif").
   */
  private separateSwallowed(swallowed: MidKeyword[]): IssueEdit[] {
    const at = new Set<number>();
    for (const m of swallowed) {
      at.add(m.start);
      if (m.word !== "endif" && m.word !== "done") continue;
      let k = m.end;
      while (isTfSpace(this.s[k])) k += 1;
      if (k < this.s.length && !this.isStatEnd(k) && !this.isCmdsubEnd(k)) at.add(k);
    }
    return [...at].sort((a, b) => a - b).map((p) => this.separatorBefore(p));
  }

  /**
   * Whether separateSwallowed() would leave text that isn't a command as a statement of its own,
   * after a swallowed keyword: `/echo use /endif to close` would send "to close" to the world
   * (rev-s4 s13), `/set h=use /else branch` "branch" (rev-s4b x11). An /elseif's (condition) is
   * no text. Then there is no fix.
   */
  private leavesText(swallowed: MidKeyword[]): boolean {
    return swallowed.some((m) => {
      let k = m.end;
      while (isTfSpace(this.s[k])) k += 1;
      if (k >= this.s.length || this.isStatEnd(k) || this.isCmdsubEnd(k) || this.s[k] === "/") return false;
      return !(m.word === "elseif" && this.s[k] === "(");
    });
  }

  /**
   * A statement in a condition list that isn't a command (`/if x == 1%; /then`): tf sends it to
   * the world when the condition is tested, and warns "statement starting with 'x' in /IF condition
   * sends text to server" (list() in expand.c). Compiling carries on. No fix: what was meant may
   * be an expression, but the text may not be one.
   */
  private conditionText(start: number): void {
    const keyword = this.block === "while" ? "while" : this.block === "elseif" ? "elseif" : "if";
    const then = keyword === "while" ? "do" : "then";
    let end = start + 1;
    while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end) && !this.isCmdsubEnd(end)) end += 1;
    this.issues.push({
      kind: "condition-text",
      start,
      end,
      message: `This text in the /${keyword}'s condition list isn't a command, so tf sends it to the world: write the condition in parentheses, as in /${keyword} (x == 1).`,
      label: "sent to the world",
      explanation:
        `After ${code(`/${keyword}`)}, commands up to ${code(`/${then}`)} are its condition, and the result of the last ` +
        `one decides it. A statement that doesn't start with ${code("/")} isn't a command: it is text, and tf sends text ` +
        `to the world each time the condition is tested. To test an expression, put it in parentheses, ` +
        `${code(`/${keyword} (x == 1) ...`)}, or test it with ${code("/test")}: ${code(`/${keyword} /test x == 1%; /${then} ...`)}`,
    });
  }

  /**
   * Whether a keyword `word` glued to what follows it sits between `after` and `before`: if so,
   * `note` (the problem it leads to) is added to its issue, and that is the one reported.
   */
  private gluedBefore(word: string, before: number, after: number, note: IssueNote): boolean {
    for (let k = this.glued.length - 1; k >= 0; k -= 1) {
      const g = this.glued[k] as (typeof this.glued)[number];
      if (g.start >= before || g.start <= after || g.word !== word) continue;
      (g.issue.related ??= []).push(note);
      return true;
    }
    return false;
  }

  /**
   * A statement at `start` whose command is a block keyword glued to what follows it (`/if(1)`,
   * `/else/echo b`): keyword_parse() reads the word up to a blank, `%` or `)`, so tf takes the
   * whole of it as a command name, and finds none.
   */
  private gluedKeyword(start: number): void {
    const glued = gluedKeywordAt(this.s, start);
    if (!glued) return;
    const { word, nameEnd, tokenEnd } = glued;
    const written = this.s.slice(start, tokenEnd);
    // With one @, tf looks for a builtin of the rest of the name ("if(1): not a builtin command").
    const named = this.s[start + 1] === "@" ? `the builtin command ${written.slice(2)}` : `a command named ${written.slice(1)}`;
    const next = this.s[nameEnd] as string;
    // /endif, /done and /break end their statement, so a command after them needs a %; too.
    const ends = (word === "endif" || word === "done" || word === "break") && next === "/";
    // /else, /then and /do take no (condition): with a blank, `(1) ...` would be text sent to the
    // world (rev-s4 s10). /else( was likely meant as /elseif.
    const noCondition = next === "(" && (word === "else" || word === "then" || word === "do");
    // Other punctuation may be part of a macro's name (`/def done:x`, `/def if!x`: rev-s4b g2), so
    // that is glued-punct, which keyword-needs-space checks against the file's /defs.
    const punct = next !== "(" && next !== "/";
    const advice = noCondition
      ? word === "else"
        ? `did you mean /elseif ${written.slice(nameEnd - start)}?`
        : `/${word} takes no (condition).`
      : !punct
        ? `put ${ends ? "%;" : "a space"} after /${word}.`
        : `unless a macro named ${written.slice(1)} is defined elsewhere, take the ${next} away or put a blank before it.`;
    const issue: StructureIssue = {
      kind: punct ? "glued-punct" : "glued",
      start,
      end: tokenEnd,
      message: `tf reads ${written} as ${named}, not as /${word}: ${advice}`,
      label: `not /${word}`,
      explanation:
        `tf reads a keyword up to the next blank, ${code("%")} or ${code(")")}, so ${code(written)} isn't ` +
        `${code(`/${word}`)}: tf runs it as ${named}${punct ? ", which is only there if some file defines it" : ", and there is none"}. ` +
        (noCondition
          ? `${code(`/${word}`)} takes no ${code("(condition)")}${word === "else" ? `: a branch with one is ${code("/elseif (...)")}` : ""}.`
          : ends
            ? `${code(`/${word}`)} ends its statement, so the command after it needs a ${code("%;")} before it.`
            : `A blank after ${code(`/${word}`)} makes it the keyword.`),
    };
    // Only before a ( or a /, where the blank surely makes what was meant: /if (1), /else /echo.
    // Not `/while(0)%; /done`: with the blank, the %; straight after the condition sends a blank
    // line (tf warns, probe g1), so the fix would only trade one problem for another.
    if (!noCondition && (next === "/" || (next === "(" && !this.isStatEnd(afterParens(this.s, nameEnd))))) {
      issue.fix = ends
        ? { title: `Put %; after /${word}`, edits: [{ start: nameEnd, end: nameEnd, newText: "%; " }] }
        : { title: `Put a space after /${word}`, edits: [{ start: nameEnd, end: nameEnd, newText: " " }] };
    }
    this.issues.push(issue);
    // A name that may be a macro's is no cause to blame the problems after it on; but no "Add %;
    // /endif" either, which would leave `/endif;` to fail when it runs (rev-s4 s09).
    if (punct) this.gluedPunct.push({ word, start });
    else this.glued.push({ word, start, issue });
  }

  /** A keyword swallowed by the statement it sits in, which leaves its block unfinished. */
  private midKeyword(mid: MidKeyword, fixer: MidKeyword, since: number): IssueDetail {
    const what = swallower(this.s, mid.stmt, mid.command);
    const consequence: Record<string, string> = {
      endif: "the /if is never closed",
      done: "the /while is never closed",
      then: "the /if never reaches its /then",
      do: "the /while never reaches its /do",
    };
    const swallowed = this.mids.filter((m) => m.stmt === mid.stmt && m.start > since);
    const words = swallowed.map((m) => `/${m.word}`);
    const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : `${words[0]}`;
    const reads = takesTheRest(mid.command, mid.word, what);
    return {
      message: `/${mid.word} here is not a keyword: it is part of ${what}, so ${consequence[fixer.word] ?? "its block is never finished"}.`,
      label: `part of ${what}`,
      explanation:
        `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ` +
        `${reads} Put ${code("%;")} before each keyword that should start a statement.`,
      related: [
        ...this.openNote(),
        ...(fixer !== mid ? [{ start: fixer.start, end: fixer.end, message: `/${fixer.word} is text too` }] : []),
      ],
      // Not for text in a condition list (`/while i < 2 /do ...`): with the %; it compiles, and the
      // text is sent to the world each time round (condition-list-text's warning; probe c1 c02).
      // Nor where text after a swallowed /endif would become a statement, sent to the world.
      ...((!mid.command && (fixer.word === "then" || fixer.word === "do")) || this.leavesText(swallowed)
        ? {}
        : { fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(swallowed) } }),
    };
  }

  /**
   * `fn()` one level deeper. Blocks, `$(...)`, `$[...]` and substitution defaults nest by recursion,
   * so a pathological nesting (thousands of `/if`s) would overflow the stack; past MAX_DEPTH the
   * check stops there, and says so. It doesn't count as tf stopping (`stopped`): tf runs the text,
   * so the statements read so far are kept.
   */
  private deeper<T>(fn: () => T): T {
    if (this.depth >= MAX_DEPTH) {
      this.issues.push({
        kind: "too-deep",
        start: this.i,
        end: this.i + 1,
        message: `This command nests more than ${MAX_DEPTH} levels deep, so the rest of it isn't checked.`,
        label: `${MAX_DEPTH} levels deep`,
        explanation:
          `Blocks (${code("/if")}, ${code("/while")}) and substitutions (${code("$(...)")}, ${code("$[...]")}, ` +
          `${code("%{...}")} defaults) nested this deep are past what this check follows. That says nothing about ` +
          "tf: the rest of the command may well be fine, it just isn't checked.",
      });
      throw new TooDeep();
    }
    this.depth += 1;
    try {
      return fn();
    } finally {
      this.depth -= 1;
    }
  }

  private list(subsIn: number): void {
    const outer = this.listId;
    try {
      this.deeper(() => this.listAt(subsIn));
    } finally {
      this.listId = outer;
    }
  }

  /** The statements from here on run in a list of their own. */
  private newList(kind: UnitList["kind"]): void {
    this.lists.push({ kind: this.cmdsub > 0 ? "cmdsub" : kind });
    this.listId = this.lists.length - 1;
  }

  /** The statement or block that started at `start` ends here. */
  private unit(start: number, word: string, block = false): void {
    this.units.push({ start, end: this.i, list: this.listId, word, block });
  }

  private listAt(subsIn: number): void {
    let subs = subsIn;
    this.newList(this.block === "if" || this.block === "elseif" || this.block === "while" ? "condition" : "body");
    let first = true;
    // After a /break, /return or /result, the rest of this part of the block never runs.
    let unreachable = false;
    do {
      if (subs >= NEWLINE) {
        while (isTfSpace(this.s[this.i]) || (this.s[this.i] === "\\" && isTfSpace(this.s[this.i + 1]))) this.i += 1;
        if (!unreachable) this.emptyStatement(first);
      }
      first = false;
      this.emptyAfter = undefined;
      this.lastSep = undefined;
      const stmtStart = this.i;
      let special: "if" | "while" | "" = "";

      if (this.s[this.i] === "/" && this.s[this.i + 1] !== "/") {
        const kw = this.keywordAt(this.i + 1);
        const kwEnd = kw ? kw.end : this.i + 1;
        const word = kw?.word ?? "";
        const label = `/${this.s.slice(stmtStart + 1, kwEnd)}`;
        if (kw) this.i = kw.next;
        switch (word) {
          case "if":
          case "while": {
            this.openBlock(word, stmtStart, kwEnd, subs === KEYWORD ? NEWLINE : subs);
            this.unit(stmtStart, word, true);
            if (subs === KEYWORD) subs = NEWLINE;
            special = word;
            break;
          }
          case "then":
            if (this.block !== "if" && this.block !== "elseif") this.unexpected(word, stmtStart, kwEnd);
            this.block = "then";
            this.bodyStarts();
            this.newList("body");
            this.emptyAfter = { label, warns: false };
            unreachable = false;
            continue;
          case "do":
            if (this.block !== "while") this.unexpected(word, stmtStart, kwEnd);
            this.block = "do";
            this.bodyStarts();
            this.newList("body");
            this.emptyAfter = { label, warns: false };
            unreachable = false;
            continue;
          case "else":
          case "elseif":
            if (this.block !== "then") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.block = word;
            this.newList(word === "else" ? "body" : "condition");
            (this.open[this.open.length - 1] as Open).branch = stmtStart;
            unreachable = false;
            if (word === "else") {
              this.bodyStarts();
              this.emptyAfter = { label, warns: true };
            }
            continue;
          case "endif":
            if (this.block !== "then" && this.block !== "else") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.closeEnd = kwEnd;
            this.block = "endif";
            return;
          case "done":
            if (this.block !== "do") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.closeEnd = kwEnd;
            this.block = "done";
            return;
          case "break":
            this.breakStatement(stmtStart, kwEnd);
            unreachable = true;
            // tf ends a /break's statement as any other's, so a ) right after it ends the $(...).
            if (this.isCmdsubEnd(this.i)) return;
            continue;
          case "test":
          case "return":
          case "result":
            this.expressionStatement(subs, word);
            this.unit(stmtStart, word);
            if (word !== "test") unreachable = true;
            break;
          default:
            this.i = stmtStart;
            if (!kw) this.gluedKeyword(stmtStart);
            this.statement(subs);
            this.unit(stmtStart, commandWord(this.s, stmtStart));
        }
      } else if (this.block === "if" || this.block === "elseif" || this.block === "while") {
        if (this.s[this.i] === "(") {
          const keyword = this.block === "while" ? "/while" : `/${this.block}`;
          this.condition(keyword);
          this.skipSpace();
          this.conditionEnd = { at: this.i, keyword };
          this.block = this.block === "while" ? "do" : "then";
          this.bodyStarts();
          this.newList("body");
          this.emptyAfter = { label: `${keyword} (...)`, warns: true };
          continue;
        }
        // An empty statement is empty-statement's (a blank line is sent either way).
        if (this.i < this.s.length && !this.isStatEnd(this.i) && !this.isCmdsubEnd(this.i)) this.conditionText(stmtStart);
        this.statement(subs);
        this.unit(stmtStart, commandWord(this.s, stmtStart));
      } else {
        this.statement(subs);
        this.unit(stmtStart, commandWord(this.s, stmtStart));
      }

      if (this.isCmdsubEnd(this.i)) return;
      if (this.isStatEnd(this.i)) {
        const sep = { at: this.i, char: this.s[this.i + 1] as string };
        this.i += 2;
        this.skipSpace();
        this.lastSep = sep;
      } else if (this.i < this.s.length) {
        const after = special === "if" ? "/endif" : special === "while" ? "/done" : "";
        let end = this.i + 1;
        while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end)) end += 1;
        this.fail("block", this.i, end, {
          message: after ? `Text after ${after} needs a %; before it.` : "This text needs a %; before it.",
          label: "needs a %; before it",
          explanation: after
            ? `${code(after)} ends its statement, so the next command has to start a new one, after a ${code("%;")}.`
            : `The statement before it has ended, so this has to start a new one, after a ${code("%;")}.`,
          fix: { title: "Put %; before it", edits: [this.separatorBefore(this.i)] },
        });
      }
    } while (this.i < this.s.length);
  }

  /** The innermost open block's current body part starts here. */
  private bodyStarts(): void {
    const open = this.open[this.open.length - 1];
    if (open) open.body = this.i;
  }

  /** The innermost open block's current body part ends at `at` (where its next keyword starts). */
  private endPart(at: number): void {
    const open = this.open[this.open.length - 1];
    if (open?.body !== undefined) open.parts.push({ start: open.body, end: at });
  }

  private openBlock(keyword: "if" | "while", start: number, end: number, subs: number): void {
    const outer = this.block;
    this.block = keyword;
    const opened: Open = { keyword, start, end, cmdsub: this.cmdsub, parts: [] };
    this.open.push(opened);
    this.list(subs);
    // Where the list stopped: /endif or /done if it closed, else whatever block it was in.
    const ended = this.block as Block;
    if (ended === "endif" || ended === "done") this.blocks.push({ start, end: this.closeEnd, parts: opened.parts });
    const to = this.i + 1;
    // It closed, so the keywords it would have taken mid-statement ran as text, with no error.
    if (ended === "endif" || ended === "done") this.takenAsText(start);
    // Where a missing /endif or /done would go: the end of the body, or before the $(...)'s ).
    const where = this.cmdsub > 0 ? "before the )" : this.mode === "top" ? "at the end of the line" : "at the end of the body";
    // Not when that part of the body is empty: after /if (x), /else or /while (x) the %; would
    // send a blank line, and an empty /while loops forever.
    const body = (this.open[this.open.length - 1] as Open).body;
    const empty = body !== undefined && this.s.slice(body, this.i).trim() === "";
    const gluedCloser = (word: string): boolean => this.gluedPunct.some((g) => g.word === word && g.start > start);
    const closer = (word: string): IssueFix | undefined =>
      empty || gluedCloser(word) ? undefined : { title: `Add %; /${word} ${where}`, edits: [this.appendStatement(this.i, word)] };
    const conditionList = (word: string, then: string): IssueDetail => ({
      message: `This /${word}'s condition list has no /${then}.`,
      label: `no /${then}`,
      explanation:
        `When ${code(`/${word}`)} is followed by commands instead of a ${code("(condition)")}, they are its condition, up to ` +
        `a ${code(`/${then}`)} at the start of a statement: ${code(`/${word} /test x%; /${then} ...`)}`,
    });
    // A top-level block still open where its command ends: in a file that is the end of the line,
    // unless the line ends in \ (missing-continuation; rules/missingContinuation.ts finds the
    // lines that were meant to be part of it).
    const top = this.mode === "top" && this.cmdsub === 0 && this.i >= this.s.length;
    if (keyword === "if") {
      if (ended === "if" || ended === "elseif") {
        if (top) this.blockError(start, end, continuation("if", "then", true), "then", "continuation", to);
        else this.blockError(start, end, conditionList("if", "then"), "then", "block", to);
      } else if (ended === "then" || ended === "else") {
        this.blockError(
          start,
          end,
          top
            ? { ...continuation("if", "endif", false), fix: closer("endif") }
            : {
                message: "This /if has no /endif.",
                label: "never closed",
                explanation: `An ${code("/if")} needs an ${code("/endif")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
                fix: closer("endif"),
              },
          "endif",
          top ? "continuation" : "block",
          to,
        );
      }
    } else if (ended === "while") {
      if (top) this.blockError(start, end, continuation("while", "do", true), "do", "continuation", to);
      else this.blockError(start, end, conditionList("while", "do"), "do", "block", to);
    } else if (ended === "do") {
      this.blockError(
        start,
        end,
        top
          ? { ...continuation("while", "done", false), fix: closer("done") }
          : {
              message: "This /while has no /done.",
              label: "never closed",
              explanation: `A ${code("/while")} needs a ${code("/done")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
              fix: closer("done"),
            },
        "done",
        top ? "continuation" : "block",
        to,
      );
    }
    this.open.pop();
    this.dropMids(start);
    this.block = outer;
  }

  /** Forget mid-statement keywords after `from`: they sit in a block or `$(...)` that has closed. */
  private dropMids(from: number): void {
    while (this.mids.length > 0 && (this.mids[this.mids.length - 1] as MidKeyword).start > from) this.mids.pop();
  }

  private unexpected(word: string, start: number, end: number): never {
    const outer = this.block;
    const opener = word === "do" || word === "done" ? "while" : "if";
    const verb = word === "endif" || word === "done" ? "close" : "belong to";
    // Left with no block by an opener glued to what follows it (/if(1)): tf stops compiling here,
    // and the one problem is reported at the cause. (One left by an /if or /while read as text is
    // pairSwallowed()'s, once the whole text is read.)
    if (!outer && this.gluedBefore(opener, start, -1, { start, end, message: `this /${word}, left with no /${opener} to ${verb}` })) throw new Stop();
    const where = outer ? `: it is ${describeBlock(outer)}` : "";
    const problem: IssueDetail = {
      message: `This /${word} has no /${opener} to ${verb}${where}.`,
      label: `no /${opener} to ${verb}`,
      related: this.openNote(),
    };
    // The keyword itself plus the blanks after it, for a fix that drops it.
    let next = end;
    while (isTfSpace(this.s[next])) next += 1;
    // A %; straight after it goes too, or the fix would leave an empty statement (a blank line).
    if (this.isStatEnd(next)) {
      next += 2;
      while (isTfSpace(this.s[next])) next += 1;
    }
    const drop: IssueFix = { title: `Remove /${word}`, edits: [{ start, end: next, newText: "" }] };
    const afterCondition = this.conditionEnd?.at === start ? this.conditionEnd.keyword : undefined;
    if (afterCondition && ((word === "then" && outer === "then") || (word === "do" && outer === "do"))) {
      const list = word === "then" ? "/if" : "/while";
      problem.message = `This /${word} can't follow a (condition): the condition after ${afterCondition} already ends it.`;
      problem.label = "not allowed after a (condition)";
      problem.explanation =
        `${code(`${afterCondition} (condition)`)} takes the next statement as its body, so this ${code(`/${word}`)} is ` +
        `read as the first statement of the body, where tf doesn't expect it. ${code(`/${word}`)} only follows a ` +
        `condition list: ${code(`${list} /test x%; /${word} ...`)}`;
      problem.fix = drop;
    } else if ((word === "then" && outer === "then") || (word === "do" && outer === "do")) {
      problem.message = `This /${word} is inside the /${opener}'s body, where it doesn't belong: /${word} only ends a condition list.`;
      problem.label = `inside the /${opener}'s body`;
    } else if (word === "else" && outer === "else") {
      problem.message = "This is a second /else in the same /if.";
      problem.label = "second /else";
    } else if (word === "elseif" && outer === "else") {
      problem.message = "This /elseif comes after /else: /else has to be last.";
      problem.label = "after /else";
    } else if (outer === "if" || outer === "elseif" || outer === "while") {
      const [keyword, then] = outer === "while" ? ["while", "do"] : ["if", "then"];
      problem.message = `This /${word} comes before the /${then} of the condition list.`;
      problem.label = `before the /${then}`;
      problem.explanation = `A condition list runs up to ${code(`/${then}`)} at the start of a statement: ${code(`/${keyword} /test x%; /${then} ...`)}`;
    }
    if (this.mode === "top" && !outer) {
      const a = opener === "if" ? "an" : "a";
      problem.explanation =
        `In a file, every command ends at the end of its line, unless the line ends in ${code("\\")}. If this ` +
        `belongs to ${a} ${code(`/${opener}`)} on an earlier line, end every line from that ${code(`/${opener}`)} to ` +
        `here with ${code("\\")}.`;
    }
    // Only a missing /then or /do can explain a keyword turning up early in a condition list.
    const fix = outer === "if" || outer === "elseif" ? "then" : outer === "while" ? "do" : undefined;
    this.blockError(start, end, problem, fix);
  }

  /**
   * A statement that starts at a `%;` or `%\`, or at the `)` that ends a `$(...)`, is empty, and
   * `statement()` compiles it as an OP_SEND of nothing: tf sends a blank line to the world each time
   * it runs (the 2026-10-14 step-5 probes, "Not connected." for every shape). tf itself warns only
   * after `/if (...)`, `/elseif (...)` or `/while (...)` (expand.c:1426) and after `/else` (:1587),
   * and, in a condition list, about a statement that isn't a command (:1433). After a `%|` the
   * empty statement is an error instead ("Piping input to a server command"), and a `%|` that ends
   * one is too ("Piping output of a server command"), so neither is reported here. A `%;` at the
   * very end sends nothing: the loop ends there.
   */
  private emptyStatement(first: boolean): void {
    const p = this.i;
    const sep = this.isStatEnd(p) && this.s[p + 1] !== "|";
    const close = !sep && this.isCmdsubEnd(p);
    if ((!sep && !close) || this.lastSep?.char === "|") return;
    // In a condition list tf warns about any statement that isn't a command (expand.c:1433). Its
    // `block` is still the /if's inside a `$(...)` (review rev-s5 p5 d03, d04), which this parser
    // resets to "" there, so that is read from the blocks the open `$(...)`s are in.
    const isCondition = (b: Block | undefined): boolean => b === "if" || b === "elseif" || b === "while";
    const inCondition = isCondition(this.block);
    let tfBlock: Block | undefined = this.block;
    for (let k = this.cmdsubBlocks.length - 1; tfBlock === "" && k >= 0; k -= 1) tfBlock = this.cmdsubBlocks[k];
    const prior = this.lastSep;
    const sepChar = sep ? this.s[p + 1] : undefined;
    const text = this.emptyAfter
      ? `after ${this.emptyAfter.label}`
      : prior
        ? `right after ${prior.char === (sepChar ?? "") ? "another" : "a"} ${this.s.slice(prior.at, prior.at + 2)}`
        : inCondition
          ? `after /${this.block}`
          : this.cmdsub > 0 && first
            ? "at the start of the $(...)"
            : "before the first command";
    const where = { text, warns: isCondition(tfBlock) || (this.emptyAfter?.warns ?? false) };
    const warned = where.warns ? "tf warns about and sends" : "tf sends";
    const what = sep ? this.s.slice(p, p + 2) : ")";
    const explanation =
      `A statement that is empty, like this one, still runs: tf sends it to the world as a blank line, ` +
      (where.warns ? "with a warning when it compiles the text. " : "and doesn't warn. ") +
      `A ${code("%;")} at the very end sends nothing.`;
    // Next to a %|, an empty statement is piped from or into, which tf rejects ("Piping input to"
    // or "output of a server command"), compiling nothing, so nothing is sent (step-5 probe pp:
    // `/else%;%|`, `%|%;)`, `%|%;%;`; review rev-s5 p4 c24): that is a different problem.
    const pipeAt = (q: number): boolean => this.s[q] === "%" && this.s[q + 1] === "|";
    let back = prior ? prior.at : 0;
    while (back > 0 && isTfSpace(this.s[back - 1])) back -= 1;
    if (prior && pipeAt(back - 2)) return;
    if (sep) {
      let next = p + 2;
      while (isTfSpace(this.s[next])) next += 1;
      if (pipeAt(next)) return;
      this.issues.push({
        kind: "empty-statement",
        start: p,
        end: p + 2,
        message: `This ${what} ${where.text} ends an empty statement, which ${warned} to the world as a blank line: remove it.`,
        label: "ends an empty statement",
        explanation,
        // A blank in its place keeps /else from running into the next command (/else/echo is one word).
        fix: {
          title: `Remove the ${what}`,
          edits: [{ start: p, end: p + 2, newText: p + 2 >= this.s.length || isTfSpace(this.s[p + 2]) || isTfSpace(this.s[p - 1]) || p === 0 ? "" : " " }],
        },
      });
      return;
    }
    // The ) of a $(...) whose last statement is empty: drop the separator before it, if there is one.
    const before = prior;
    this.issues.push({
      kind: "empty-statement",
      start: p,
      end: p + 1,
      message: before
        ? `This $(...) ends with an empty statement after its last ${this.s.slice(before.at, before.at + 2)}, which ${warned} to the world as a blank line: remove that ${this.s.slice(before.at, before.at + 2)}.`
        : `This $(...) runs an empty statement, which ${warned} to the world as a blank line: put a command in it, or remove it.`,
      label: "ends an empty statement",
      explanation,
      ...(before ? { fix: { title: `Remove the ${this.s.slice(before.at, before.at + 2)}`, edits: [{ start: before.at, end: before.at + 2, newText: "" }] } } : {}),
    });
  }

  private breakStatement(start: number, end: number): void {
    if (this.i >= this.s.length || this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) {
      this.breakOutOfCmdsub(start, end, 1);
      this.unit(start, "break");
      this.breakSeparator();
      return;
    }
    const digits = this.i;
    while (isDigit(this.s[this.i])) this.i += 1;
    if (this.i === digits || Number(this.s.slice(digits, this.i)) <= 0) {
      this.fail("block", start, end, "/break takes a positive number of loops.");
    }
    this.breakOutOfCmdsub(start, this.i, Number(this.s.slice(digits, this.i)));
    this.unit(start, "break");
    this.breakSeparator();
  }

  /** The separator after a /break, read as the statement loop reads one. */
  private breakSeparator(): void {
    if (!this.isStatEnd(this.i)) return;
    const sep = { at: this.i, char: this.s[this.i + 1] as string };
    this.i += 2;
    this.skipSpace();
    this.lastSep = sep;
  }

  /**
   * A `/break` inside a `$(...)` may only end loops opened inside that `$(...)`. Its jump is
   * resolved by the `/done` of the loop it ends, and jumping out of a `$(...)` skips the code that
   * ends the command substitution. tf dev's `list()` (expand.c, the MAC-5 fix) rejects a /break
   * whose innermost `levels` loops include one opened outside the `$(...)` ("expected a /break
   * that stays inside this $(...)") and compiles nothing; upstream tf compiles it and corrupts its
   * value stack when it runs. A /break with more levels than there are loops, all of them inside
   * the `$(...)`, still compiles in tf dev, and running it stops the macro with "expression stack
   * underflow or dirty" and "invalid frame". Both proven in tf dev, 2026-10-14.
   *
   * Where the rejected /break is in a `$(...)` that is an expression operand (`$[ $(/break) ]`, an
   * `/if` or `/while` condition), at any depth, tf dev prints the same error but still runs the
   * macro, with that `$(...)` giving nothing; elsewhere (a command, `/test` text) the macro doesn't
   * run. Proven in tf dev, 2026-10-14.
   */
  private breakOutOfCmdsub(start: number, end: number, levels: number): void {
    if (this.cmdsub === 0) return;
    const loops = this.open.filter((o) => o.keyword === "while");
    const ended = loops.slice(-levels).reverse();
    const outside = ended.find((o) => o.cmdsub < this.cmdsub);
    const rule =
      `A ${code("/break")} inside ${code("$(...)")} can only end ${code("/while")} loops that are inside the same ` +
      `${code("$(...)")}: tf can't jump out of a command substitution part way through.`;
    if (outside) {
      // The $( it would jump out of: the outermost one the loop isn't inside.
      const cmdsubStart = (this.cmdsubStarts[outside.cmdsub] as { at: number }).at;
      const runs = this.cmdsubStarts.some((c) => c.inExpression);
      const detail: IssueDetail = {
        message: runs
          ? "This /break would jump out of the $(...) around it, so tf reports an error and leaves it out: end the loop outside the $(...)."
          : "This /break would jump out of the $(...) around it, so tf rejects the macro: end the loop outside the $(...).",
        label: "jumps out of the $(...)",
        explanation:
          `${rule} This one would end a loop opened outside it, so tf reports "expected a /break that stays inside ` +
          "this $(...)\" when it compiles the macro. " +
          (runs
            ? `Here the ${code("$(...)")} is inside an expression, so tf still runs the macro, with that ${code("$(...)")} ` +
              `giving nothing and the loop never ended by it.`
            : "The macro then does nothing.") +
          ` Move the ${code("/break")} out of the ${code("$(...)")}, into the loop's own body. (TinyFugue releases before ` +
          "this check compile it, and running it leaves tf's internal state broken.)",
        related: [
          { start: cmdsubStart, end: cmdsubStart + 2, message: "the $(...) it would jump out of" },
          { start: outside.start, end: outside.end, message: "the loop it would end" },
        ],
      };
      // tf stops compiling in a command; in an expression it carries on past the $(...).
      if (!runs) this.fail("block", start, end, detail);
      this.issues.push({ kind: "block", start, end: Math.max(end, start + 1), ...detail });
      return;
    }
    if (levels > loops.length) {
      const cmdsubStart = (this.cmdsubStarts[this.cmdsubStarts.length - 1] as { at: number }).at;
      const advice =
        loops.length === 0
          ? `To end the macro, put the ${code("/break")} outside the ${code("$(...)")}; to skip the rest of the ` +
            `${code("$(...)")}'s commands, wrap them in an ${code("/if")} instead.`
          : `Give the ${code("/break")} no more levels than there are loops inside the ${code("$(...)")}.`;
      this.issues.push({
        kind: "block",
        start,
        end: Math.max(end, start + 1),
        message:
          "This /break would jump out of the $(...) around it, and tf stops the macro with an internal error when it " +
          "runs: only break out of loops inside the $(...).",
        label: "jumps out of the $(...)",
        explanation:
          `${rule} This one has ${loops.length === 0 ? "no loop" : "more levels than there are loops"} to end inside ` +
          `it. tf compiles it, but running it stops the macro with "expression stack underflow or dirty" and ` +
          `"invalid frame". ${advice}`,
        related: [{ start: cmdsubStart, end: cmdsubStart + 2, message: "the $(...) it would jump out of" }],
      });
    }
  }

  /**
   * `/test`, `/return`, `/result`: the text is substituted at the statement's level, then compiled
   * as an expression. On a plain top-level line nothing is substituted, so it is compiled as
   * written (q04: `/test $[1+2` gives "unmatched $["); on an `/if` line only a run of `%`s changes.
   * In a macro body its substitutions (read by `statement()`) make the text, known only when it runs.
   */
  private expressionStatement(subs: number, keyword: string): void {
    const start = this.i;
    this.statement(subs, keyword);
    this.expressions.push({ start, end: this.i, kind: "statement", level: levelOf(subs) });
    const text = this.s.slice(start, this.i);
    if (subs >= FULL ? /[%$\\]/.test(text) : subs >= NEWLINE && text.includes("%%")) return;
    const sub = new Parser(text, this.mode);
    try {
      sub.expression(undefined, 0, `/${keyword}`);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
    // tf reports an error in a fixed expression but carries on compiling.
    for (const issue of sub.issues) this.issues.push(shiftIssue(issue, start));
    for (const span of sub.spans) {
      this.spans.push({
        ...span,
        start: span.start + start,
        end: span.end + start,
        ...(span.inner ? { inner: { start: span.inner.start + start, end: span.inner.end + start } } : {}),
      });
    }
  }

  /** Statement text, as `expand()` scans it, up to a separator, the end, or a `$(...)`'s `)`. */
  private statement(subs: number, keyword = ""): void {
    const start = this.i;
    this.statementText(subs, keyword);
    if (!keyword) {
      this.statements.push({ start, end: this.i, level: levelOf(subs), conditional: this.open.length > 0 });
    }
  }

  private statementText(subs: number, keyword: string): void {
    const s = this.s;
    const stmtStart = this.i;
    let command = keyword;
    // `//x` is text: tf sends it to the world with one `/` dropped.
    if (!command && s[this.i] === "/" && s[this.i + 1] !== "/") {
      const m = /^\/[@!]*([^\s%]*)/.exec(s.slice(this.i));
      command = (m?.[1] ?? "").toLowerCase();
    }
    while (this.i < s.length) {
      const ch = s[this.i];
      if (subs >= NEWLINE && ch === "%") {
        if (this.isStatEnd(this.i)) return;
        this.i += 1;
        if (s[this.i] === "%") {
          while (s[this.i] === "%") this.i += 1;
        } else if (subs >= FULL && (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i]))) {
          this.varsub(this.i - 1);
        }
        continue;
      }
      if (subs >= FULL) {
        if (ch === "\\") {
          this.i += 2;
          continue;
        }
        if (ch === "$") {
          this.i += 1;
          this.dollarsub(this.i - 1);
          continue;
        }
        if (this.isCmdsubEnd(this.i)) return;
      }
      if (ch === "/" && this.i > stmtStart && isTfSpace(s[this.i - 1])) {
        const kw = this.keywordAt(this.i + 1);
        if (kw && INNER_KEYWORDS.has(kw.word)) {
          this.mids.push({ start: this.i, end: kw.end, word: kw.word, command, stmt: stmtStart, taken: this.wouldTake(kw.word, command) });
        }
        // An /if or /while read as text is just text, unless the block it would have opened is what
        // a later keyword needed (pairSwallowed()). Where %; doesn't separate, it can be nothing else.
        // Only in a /let, /set or /setenv value: in other text, as `/echo see /if (x) for help`, a %;
        // before it would turn the text into a command, and send "for help" (rev-s4b p01, x05).
        if (kw && (kw.word === "if" || kw.word === "while") && subs >= NEWLINE && LET_ASSIGNMENT_RE.test(s.slice(stmtStart))) {
          const mid: MidKeyword = { start: this.i, end: kw.end, word: kw.word, command, stmt: stmtStart, taken: false };
          this.swallowed.push({ start: this.i, end: kw.end, word: kw.word, stmt: stmtStart, command, edits: this.separateSwallowed([mid]) });
        }
      }
      this.i += 1;
    }
  }

  /**
   * Whether the innermost open block would have taken `word` as its keyword, had it started a
   * statement (MidKeyword.taken). Not in a /test, /return or /result, whose strings hold text.
   */
  private wouldTake(word: string, command: string): boolean {
    const open = this.open[this.open.length - 1];
    if (!open || open.cmdsub !== this.cmdsub || ["test", "return", "result"].includes(command)) return false;
    if (word === "else" || word === "elseif") return this.block === "then";
    if (word === "endif") return this.block === "then" || this.block === "else";
    return word === "done" && this.block === "do";
  }

  /**
   * The block that opened at `start` closed: each /let or /set statement in it holding a keyword
   * the block would have taken ran it as text, with no error (`/if (1) /set a=1 /else /set b=2%; /endif` sets a to
   * `1 /else /set b=2`). A warning, with the fix pairSwallowed() checks.
   */
  private takenAsText(start: number): void {
    const done = new Set<number>();
    for (const m of this.mids) {
      if (m.start <= start || !m.taken || done.has(m.stmt)) continue;
      // Only in a /let or /set value. Text a command is given may hold a keyword on purpose: an
      // /eval's commands (lib/tf/activity_status.tf), or `/echo use /endif to close`.
      if (!LET_ASSIGNMENT_RE.test(this.s.slice(m.stmt))) continue;
      done.add(m.stmt);
      const group = this.mids.filter((x) => x.stmt === m.stmt && x.start > start && x.taken);
      const words = group.map((x) => `/${x.word}`);
      const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : `${words[0]}`;
      const what = swallower(this.s, m.stmt, m.command);
      const issue: StructureIssue = {
        kind: "keyword-warning",
        start: m.start,
        end: m.end,
        message: `/${m.word} here is not a keyword: it is part of ${what}, so tf runs it as text: put %; before it if it should start a statement.`,
        label: `part of ${what}`,
        explanation:
          `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ` +
          `${takesTheRest(m.command, m.word, what)} The block still closes, so tf loads this without an error, but ` +
          `${code(`/${m.word}`)} is never the block's.`,
        ...(this.leavesText(group) ? {} : { fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(group) } }),
      };
      this.issues.push(issue);
      this.warned.set(issue, { word: m.word, what, command: m.command });
    }
  }

  /** `%{...}` or `%name`, with `this.i` just after the `%` at `percent` (`varsub()`). */
  private varsub(percent: number): void {
    this.deeper(() => this.varsubAt(percent));
  }

  private varsubAt(percent: number): void {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
    const inner = this.i;
    if ((s[this.i] === "#" || s[this.i] === "?") && (!bracket || s[this.i + 1] === "}")) {
      this.i += 1;
    } else {
      let n = -1;
      let except = false;
      let ell = false;
      let pee = false;
      let star = false;
      if (isDigit(s[this.i])) {
        n = 0;
        while (isDigit(s[this.i])) n = n * 10 + Number(s[this.i++]);
      } else {
        if (s[this.i] === "-") {
          except = true;
          this.i += 1;
        }
        ell = s[this.i] === "L";
        pee = s[this.i] === "P";
        star = s[this.i] === "*";
        if (ell || pee || star) this.i += 1;
        if (!star && isDigit(s[this.i])) {
          n = 0;
          while (isDigit(s[this.i])) n = n * 10 + Number(s[this.i++]);
        }
      }
      if ((n < 0 && !star) || (bracket && (ell || pee))) {
        if (isNameChar(s[this.i])) {
          ell = pee = false;
          n = -1;
          while (isNameChar(s[this.i])) this.i += 1;
        }
      }
      // tf's chain: * and P keep a leading -, L and a positive number take it (%-L2, %-1).
      if (!star && !pee && (ell || n > 0)) except = false;
      if (except) {
        this.fail(
          "substitution",
          percent,
          this.i,
          star || pee || n === 0
            ? {
                message: "A leading - only goes with a positive number or L (%-1, %-L2), not with *, P or 0.",
                label: "- not allowed here",
              }
            : {
                message: "%- starts a substitution, but no parameter follows it. Write %%- for a literal %-.",
                label: "not a substitution",
                explanation:
                  `In a macro body, ${code("%-")} always starts a substitution of the parameters after one, like ` +
                  `${code("%-1")} (all but the first) or ${code("%-L")} (all but the last). ${code("%%")} writes a literal ${code("%")}.`,
                fix: { title: "Write %%- for a literal %-", edits: [{ start: percent, end: percent, newText: "%" }] },
              },
        );
      }
    }
    const hasDefault = s[this.i] === "-";
    if (hasDefault) {
      this.i += 1;
      while (this.i < s.length) {
        const ch = s[this.i];
        if (this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) break;
        if (bracket && ch === "}") break;
        if (!bracket && isTfSpace(ch)) break;
        if (ch === "%") {
          this.i += 1;
          if (s[this.i] === "%") while (s[this.i] === "%") this.i += 1;
          else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) this.varsub(this.i - 1);
        } else if (ch === "$") {
          this.i += 1;
          this.dollarsub(this.i - 1);
        } else if (ch === "\\") {
          this.i += 2;
        } else {
          this.i += 1;
        }
      }
    }
    if (!bracket) this.spans.push({ start: percent, end: this.i, kind: "substitution" });
    if (bracket) {
      if (s[this.i] === "}") {
        this.i += 1;
        this.spans.push({ start: percent, end: this.i, kind: "substitution", inner: { start: inner, end: this.i - 1 } });
        return;
      }
      const ch = s[this.i] as string;
      // `%{` written as such, or `{` (an operand of an expression, without the %).
      const opener = s[percent] === "%" ? "%{" : "{";
      const openerEnd = percent + opener.length;
      const ended = this.i >= s.length || this.isStatEnd(this.i) || (ch === "\r" && this.i === s.length - 1);
      if (!ended && !hasDefault && (ch === "%" || ch === "$")) {
        // Another substitution glued onto the selector (`%{foo%{bar}}`): tf says "unmatched { or
        // illegal character '%'" and stops; a substitution only nests in the default (`%{foo-%{bar}}`).
        const selector = s.slice(inner, this.i);
        const other = ch === "%" ? "%{...}" : "$[...]";
        this.fail("substitution", this.i, this.i + 1, {
          message: `${opener}${selector} needs a } or a - after the name: another substitution can't follow it directly.`,
          label: "needs } or - here",
          explanation:
            `After the name in ${code(`${opener}${selector}`)}, tf only accepts ${code("}")}, which ends the substitution, or ` +
            `${code("-")}, which starts a default value. To use another substitution as the default, write ` +
            `${code(`${opener}${selector}-${other}}`)}; to put two values side by side, close the first one: ` +
            `${code(`${opener}${selector}}${other}`)}.`,
          related: [{ start: percent, end: openerEnd, message: `this ${opener}` }],
        });
      }
      // Cut short by a separator with the } it was written with after it (`%{y-%;}`): a } before the
      // separator would leave that one to be sent to the world (review rev-s2c q8m), so no fix.
      const cutShort = this.isStatEnd(this.i) && s.indexOf("}", this.i) >= 0;
      const close: IssueFix | undefined = cutShort ? undefined : { title: "Close it with }", edits: [this.insertAtEnd(this.i, "}")] };
      this.fail(
        "substitution",
        percent,
        openerEnd,
        !ended
          ? {
              message: `This ${opener} needs its } before the ${charName(ch)}.`,
              label: "not closed",
              explanation:
                `${code(`${opener}...}`)} holds the name of a variable or parameter, and a name can't contain a ${charName(ch)}. ` +
                `To put text after the substitution, close it first: ${code(`${opener}name} text`)}.`,
              related: [{ start: this.i, end: this.i + 1, message: `the name stops at this ${charName(ch)}` }],
              fix: { title: `Close it with } before the ${charName(ch)}`, edits: [{ start: this.i, end: this.i, newText: "}" }] },
            }
          : cutShort
            ? {
                message: `This ${opener} is cut short by the ${s.slice(this.i, this.i + 2)} before its }: a separator ends the statement, even inside a substitution.`,
                label: "cut short",
                explanation:
                  `${code(s.slice(this.i, this.i + 2))} ends the statement, even inside a ${code(`${opener}...}`)}, so tf ` +
                  `never reaches the ${code("}")} after it, and rejects the ${code(opener)}. Closing it before the separator ` +
                  `would leave that ${code("}")} to be sent to the world.`,
              }
            : { message: `This ${opener} is never closed: add }.`, label: "never closed", fix: close },
      );
    }
  }

  /**
   * `$$...`, `$[...]`, `$(...)` or `${name}`/`$name`, with `this.i` just after the `$` at `dollar`;
   * `inExpression` when it is an operand of an expression.
   */
  private dollarsub(dollar: number, inExpression = false): void {
    const s = this.s;
    if (s[this.i] === "$") {
      while (s[this.i] === "$") this.i += 1;
    } else if (s[this.i] === "[") {
      this.i += 1;
      const start = this.i;
      this.expression("]", dollar);
      this.expressions.push({ start, end: this.i - 1, kind: "bracket" });
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start, end: this.i - 1 } });
    } else if (s[this.i] === "(") {
      this.i += 1;
      const start = this.i;
      this.cmdsub += 1;
      this.cmdsubStarts.push({ at: dollar, inExpression });
      const outer = this.block;
      this.cmdsubBlocks.push(outer);
      // Known gap (found in review, 2026-10-14, left for later): a keyword such as /endif inside
      // a $(...), as in `$(/endif)`, is reported as a block-structure error here, though tf
      // doesn't treat it that way. Model how tf compiles a keyword in a command substitution
      // before changing this.
      this.block = "";
      this.list(FULL);
      this.block = outer;
      this.cmdsubBlocks.pop();
      this.cmdsub -= 1;
      this.cmdsubStarts.pop();
      this.dropMids(dollar);
      if (s[this.i] !== ")") {
        this.fail("substitution", dollar, dollar + 2, {
          message: "This $( is never closed: add ).",
          label: "never closed",
          fix: { title: "Close it with ) at the end", edits: [this.insertAtEnd(this.i, ")")] },
        });
      }
      this.cmdsubs.push({ start, end: this.i });
      this.i += 1;
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start, end: this.i - 1 } });
    } else {
      this.macsub(dollar);
    }
  }

  /** `${name}` or `$name` (`macsub()`). */
  private macsub(dollar: number): void {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === "\\") {
        this.i += 2;
      } else if (this.isStatEnd(this.i) || this.isCmdsubEnd(this.i) || ch === "}") {
        break;
      } else if (!bracket && isTfSpace(ch)) {
        break;
      } else if (ch === "$") {
        if (s[this.i + 1] === "$") {
          while (s[this.i + 1] === "$") this.i += 1;
          this.i += 1;
        } else if (!bracket) {
          break;
        } else {
          this.i += 1;
        }
      } else if (ch === "%") {
        this.i += 1;
        if (s[this.i] === "%") while (s[this.i] === "%") this.i += 1;
        else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) this.varsub(this.i - 1);
      } else {
        this.i += 1;
      }
    }
    if (bracket) {
      if (s[this.i] !== "}") {
        this.fail("substitution", dollar, dollar + 2, {
          message: "This ${ is never closed: add }.",
          label: "never closed",
          fix: { title: "Close it with }", edits: [this.insertAtEnd(this.i, "}")] },
        });
      }
      this.i += 1;
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start: dollar + 2, end: this.i - 1 } });
    } else if (s[this.i] === "$") {
      this.i += 1;
    }
  }

  /** An `/if (...)` or `/while (...)` condition, with `this.i` at the `(`. */
  private condition(keyword: string): void {
    const open = this.i;
    this.i += 1;
    this.expression(")", open, keyword);
    this.expressions.push({ start: open + 1, end: this.i - 1, kind: "condition" });
    this.spans.push({ start: open, end: this.i, kind: "condition", inner: { start: open + 1, end: this.i - 1 } });
  }

  /**
   * An expression, up to its closing `close` (`]` for `$[`, `)` for a condition), or to the end of
   * the text when `close` is undefined. Only strings and parentheses are followed: enough to find
   * where it ends, not to check its grammar.
   */
  expression(close: "]" | ")" | undefined, open: number, keyword?: string): void {
    this.deeper(() => this.expressionAt(close, open, keyword));
  }

  /**
   * A `$[...]` from `dollar` to `this.i` that is an operand of the expression that started at
   * `from` (`primary_expr()` warns "legal, but redundant"). `$[` compiles its inside with `expr()`,
   * which is `comma_expr()`, the same code `(` compiles, so `(...)` always means the same; when it
   * is a whole condition, `($[x])` can be `(x)`.
   */
  private dollarOperand(dollar: number, from: number, close: "]" | ")" | undefined, keyword: string | undefined, inParens: boolean): void {
    const s = this.s;
    const end = this.i - 1;
    let after = this.i;
    while (isTfSpace(s[after])) after += 1;
    const whole = !inParens && s.slice(from, dollar).trim() === "" && (close ? s[after] === close : after >= s.length);
    const drop = whole && close === ")";
    const what = close === ")" ? "the condition" : close === "]" ? "the $[...] around it" : `${keyword ?? "/test"}'s text`;
    this.issues.push({
      kind: "operand",
      start: dollar,
      end: dollar + 2,
      message: drop
        ? `This $[...] is redundant, as ${what} is already an expression: drop the $[ and ].`
        : `This $[...] is redundant, as ${what} is already an expression: write (...) instead.`,
      label: "redundant",
      explanation:
        `${what[0]?.toUpperCase()}${what.slice(1)} is an expression, and inside an expression ${code("$[...]")} means the ` +
        `same as ${code("(...)")}. tf warns that it is legal, but redundant: once per session, or every time when ` +
        `${code("%pedantic")} is on.`,
      related: [{ start: end, end: end + 1, message: "its ]" }],
      fix: drop
        ? { title: "Remove the $[ and ]", edits: [{ start: dollar, end: dollar + 2, newText: "" }, { start: end, end: end + 1, newText: "" }] }
        : { title: "Write (...) instead of $[...]", edits: [{ start: dollar, end: dollar + 2, newText: "(" }, { start: end, end: end + 1, newText: ")" }] },
    });
  }

  /**
   * A `%x` or `%{x}` from `percent` to `this.i` that is an operand of an expression: `varsub()`
   * reads it as it reads `{x}`, and warns that it "can be confusing". `{x}` is the same read with
   * no warning, so the fix drops the `%`, or puts the selector in braces when there were none (not
   * when its default holds a brace, which would end it early).
   */
  private percentOperand(percent: number): void {
    const text = this.s.slice(percent, this.i);
    const bracket = text[1] === "{";
    const braced = bracket ? text.slice(1) : `{${text.slice(1)}}`;
    const exact = bracket || !/[{}]/.test(text);
    this.issues.push({
      kind: "operand",
      start: percent,
      end: this.i,
      message: `This ${text} works in an expression, but tf warns that it can be confusing: write ${braced} instead.`,
      label: `write ${braced}`,
      explanation:
        `In an expression, ${code("{x}")} reads the variable or parameter ${code("x")}. ${code("%{x}")} reads it too, but tf ` +
        `warns that it can be confusing there, since outside an expression ${code("%{x}")} puts the value into the text ` +
        `before the command runs. tf prints the warning once per session, or every time when ${code("%pedantic")} is on.`,
      ...(exact
        ? { fix: { title: `Write ${braced}`, edits: [bracket ? { start: percent, end: percent + 1, newText: "" } : { start: percent, end: this.i, newText: braced }] } }
        : {}),
    });
  }

  private expressionAt(close: "]" | ")" | undefined, open: number, keyword?: string): void {
    const s = this.s;
    const from = this.i;
    const parens: number[] = [];
    while (this.i < s.length) {
      const ch = s[this.i] as string;
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = this.i;
        this.i += 1;
        while (this.i < s.length && s[this.i] !== ch) this.i += s[this.i] === "\\" ? 2 : 1;
        if (this.i >= s.length) {
          this.fail("expression", quote, quote + 1, {
            message: `This string is never closed: add the closing ${ch}.`,
            label: "never closed",
            explanation:
              `Inside an expression (${code("$[...]")}, a condition or ${code("/test")}), ${code(ch)} starts a string that ` +
              `runs to the next ${code(ch)}. This one never finds its closing ${code(ch)}, so it takes everything after it, including any ${code("]")} or ${code(")")}.`,
          });
        }
        this.i += 1;
        this.spans.push({ start: quote, end: this.i, kind: "string", inner: { start: quote + 1, end: this.i - 1 } });
        continue;
      }
      if (close && this.isStatEnd(this.i)) break;
      // primary_expr() (expr.c) hands these to the body scanners, where quotes are plain text.
      if (ch === "$") {
        const dollar = this.i;
        this.i += 1;
        this.dollarsub(dollar, true);
        if (s[dollar + 1] === "[") this.dollarOperand(dollar, from, close, keyword, parens.length > 0);
        continue;
      }
      // `%x` and `%{x}` are operands too (the only `%` in tf's expression grammar), read as `{x}` is.
      if (ch === "%") {
        const percent = this.i;
        this.i += 1;
        if (s[this.i] === "%") {
          while (s[this.i] === "%") this.i += 1;
        } else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) {
          this.varsub(percent);
          this.percentOperand(percent);
        }
        continue;
      }
      if (ch === "{") {
        this.varsub(this.i);
        continue;
      }
      if (ch === "(") parens.push(this.i);
      else if (ch === ")") {
        if (parens.length === 0) {
          if (close === ")") {
            this.i += 1;
            return;
          }
          this.fail("expression", this.i, this.i + 1, {
            message: close === "]" ? "This ) has no matching ( inside the $[...]." : "This ) has no matching (.",
            label: "no matching (",
            fix: { title: "Remove the )", edits: [{ start: this.i, end: this.i + 1, newText: "" }] },
          });
        }
        const paren = parens.pop() as number;
        this.spans.push({ start: paren, end: this.i + 1, kind: "paren", inner: { start: paren + 1, end: this.i } });
      } else if (ch === "]" && close === "]") {
        if (parens.length > 0) {
          const paren = parens[parens.length - 1] as number;
          this.fail("expression", this.i, this.i + 1, {
            message: "A ( in this $[...] is never closed: add ) before the ].",
            label: "the $[...] ends here",
            related: [{ start: paren, end: paren + 1, message: "this ( is never closed" }],
            fix: { title: "Add ) before the ]", edits: [this.insertAtEnd(this.i, ")".repeat(parens.length))] },
          });
        }
        this.i += 1;
        return;
      }
      this.i += 1;
    }
    if (close === "]") {
      this.fail("expression", open, open + 2, {
        message: "This $[ is never closed: add ].",
        label: "never closed",
        explanation: `A ${code("$[")} runs to its matching ${code("]")}, which has to come before the next ${code("%;")}.`,
        fix: { title: "Close it with ] at the end of the statement", edits: [this.insertAtEnd(this.i, `${")".repeat(parens.length)}]`)] },
      });
    } else if (close === ")") {
      this.fail("expression", open, open + 1, {
        message: `The ${keyword ?? ""} condition's ( is never closed: add ).`,
        label: "never closed",
      });
    } else if (parens.length > 0) {
      const paren = parens[parens.length - 1] as number;
      this.fail("expression", paren, paren + 1, {
        message: "This ( is never closed: add ).",
        label: "never closed",
        fix: { title: "Add ) at the end", edits: [this.insertAtEnd(s.length, ")".repeat(parens.length))] },
      });
    }
  }
}

/** Structural problems in a macro body (`mode` "body") or a top-level command (`mode` "top"). */
export function checkStructure(text: string, mode: StructureMode): StructureIssue[] {
  return parseSettled(text, mode).issues;
}

/** The problems that stop tf compiling: the first of them is where it stops. */
const STOPS = new Set<StructureKind>(["block", "keyword", "continuation"]);

function firstStop(issues: StructureIssue[]): StructureIssue | undefined {
  return issues.find((i) => STOPS.has(i.kind));
}

/** Where `pos`, an offset into `s` with `edits` applied, was before them. */
function unedited(pos: number, edits: IssueEdit[]): number {
  let delta = 0;
  for (const e of [...edits].sort((a, b) => a.start - b.start)) {
    if (pos < e.start + delta + e.newText.length) break;
    delta += e.newText.length - (e.end - e.start);
  }
  return pos - delta;
}

/**
 * Warnings tf gives as it compiles, which a fix mustn't bring in: an empty statement (`/if (1)%;`,
 * `/else%;`: rev-s4b p13, x03) or text in a condition list, sent to the world.
 */
const NOISE = new Set<StructureKind>(["empty-statement", "condition-text"]);

function noise(issues: StructureIssue[]): number {
  let n = 0;
  for (const i of issues) if (NOISE.has(i.kind)) n += 1;
  return n;
}

/**
 * How many fresh parses one text may take to try out fixes, each a parse of the whole text; past
 * them, a fix that would need one isn't offered, and nothing more is paired (as in step 2).
 */
const MAX_TRIES = 64;

/** Tries fixes on `s`, a parse each, up to MAX_TRIES. */
class Trial {
  private tries = 0;
  constructor(
    private readonly s: string,
    private readonly mode: StructureMode,
    private readonly baseNoise: number,
  ) {}

  /**
   * Where tf would first stop in `s` with `edits` applied, as an offset into `s` (Infinity if
   * nowhere); -1 if the edits bring in a warning tf gives that `s` doesn't have, or the budget is spent.
   */
  stopAfter(edits: IssueEdit[]): number {
    if (this.tries >= MAX_TRIES) return -1;
    this.tries += 1;
    let t = this.s;
    for (const e of [...edits].sort((a, b) => b.start - a.start)) t = t.slice(0, e.start) + e.newText + t.slice(e.end);
    const p = new Parser(t, this.mode);
    p.run();
    if (noise(p.issues) > this.baseNoise) return -1;
    const stop = firstStop(p.issues);
    return stop ? unedited(stop.start, edits) : Infinity;
  }
}

/** "This /endif has no /if to close." as the related note on the keyword that caused it. */
function strayNote(issue: StructureIssue): IssueNote {
  return { start: issue.start, end: issue.end, message: issue.message.replace(/^This /, "the ").replace(/(?:: it is .*)?\.$/, "") };
}

/**
 * `s` parsed as tf compiles it, with what a fresh parse of each fix can tell (proven live, reviews
 * of step 4: rev-s4, rev-s4b):
 *  - Where tf stops at a block error (an `/endif` with no `/if`, say) and a keyword a /let or /set
 *    value took would have been the block's ("keyword-warning"), and its fix makes that error go
 *    away, that is the problem: the warning becomes the error, with the block error as its related
 *    location (rev-s4b x04, w09, w19).
 *  - Otherwise, an `/if` or `/while` a /let, /set or /setenv value took (Swallowed), the closest
 *    before the error first (x21) and alone in its value (p05), is the problem when putting `%;`
 *    before it leaves nothing for tf to stop at (p03, p16).
 *    Otherwise it is only text (`/set msg=use /if to branch`), or the fix wouldn't pair it with the
 *    error (inside another `$(...)`, or with blocks in between), and both are left as they are.
 *  - A warning's fix, and a glued keyword's, is kept only if it brings no problem in before the
 *    one there is now: with a real `/endif` later, a `%;` before a swallowed one would close the
 *    `/if` early.
 * No fix may bring in an empty statement or condition-list text tf warns about (NOISE).
 */
function parseSettled(s: string, mode: StructureMode): { issues: StructureIssue[]; swallowed: Swallowed[] } {
  const p = new Parser(s, mode);
  p.run();
  const issues = [...p.issues];
  const swallowed: Swallowed[] = [];
  const trial = new Trial(s, mode, noise(issues));
  const block = issues.find((i) => i.kind === "block");
  // Only a fix that leaves nothing for tf to stop at pairs: with a second stray /endif after it, or
  // a block it leaves open, it would only move the problem on (rev-s4b p03, p04, p16, p19, p25).
  const resolves = (edits: IssueEdit[]): boolean => !!block && trial.stopAfter(edits) === Infinity;
  if (block && block === firstStop(issues)) {
    const before = (x: { start: number }) => x.start < block.start;
    const warning = issues
      // Anywhere: a block left open is reported at its opener, before the keyword that should have
      // closed it (rev-s4b w09: `/if (1) /if (1) /set x=1 /endif%; /endif`).
      .filter((i) => i.kind === "keyword-warning" && i.fix)
      .reverse()
      .find((i) => resolves(i.fix!.edits));
    if (warning) {
      const taken = p.warned.get(warning)!;
      const stray = strayNote(block);
      const turned: StructureIssue = {
        ...warning,
        kind: "keyword",
        message: `/${taken.word} here is not a keyword: it is part of ${taken.what}, so ${stray.message}: put %; before it.`,
        explanation:
          `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ` +
          `${takesTheRest(taken.command, taken.word, taken.what)} That leaves ${code(s.slice(block.start, block.end))} ` +
          "with nothing to belong to, which is the error tf reports.",
        related: [stray],
      };
      issues.splice(issues.indexOf(warning), 1, turned);
      issues.splice(issues.indexOf(block), 1);
    } else {
      // Not where one value holds two of them (`/set v=1 /if (1) /echo a /if (2) ...`): a %; before
      // either runs something else, and which was meant is a guess (rev-s4b p05).
      const alone = (x: Swallowed) => p.swallowed.filter((y) => y.stmt === x.stmt).length === 1;
      const w = [...p.swallowed].reverse().find((x) => x.edits.length > 0 && before(x) && alone(x) && resolves(x.edits));
      if (w) {
        swallowed.push({ ...w, stray: strayNote(block) });
        issues.splice(issues.indexOf(block), 1);
      }
    }
  }
  // The same goes for a glued keyword's blank (rev-s4 gg21: `/if(1) /echo x` with no /endif, or
  // s15: `/else/if (1) ...%; /endif`, whose /endif the inner /if then takes).
  const stop = firstStop(issues)?.start ?? Infinity;
  for (const issue of issues) {
    if ((issue.kind === "keyword-warning" || issue.kind === "glued") && issue.fix) {
      const after = trial.stopAfter(issue.fix.edits);
      if (after < 0 || after < stop) delete issue.fix;
    }
  }
  return { issues, swallowed };
}

// `/@def`, `/@bind` and so on are the builtins themselves; the /trig family is stdlib's. /edit reads
// its options as /def does (macro_spec()); /gag and /hilite split their arguments as /bind does.
const DEF_RE = /^\s*\/@?(?:def|edit)\b/i;
const SPLIT_ARGS_RE = /^\s*\/(?:@?(?:bind|hook|gag|hilite)|trigpc|trigc|trigp|trig)\b/i;
const ALIAS_RE = /^(\s*\/alias\s+\S+\s+)\S/i;

/**
 * Where the body of a macro-defining entry starts, or -1. `/def` reads its options first, so an
 * option argument may hold an `=` (`-t*hp=*`, `-t"a=b"`), then takes the first `=` after them
 * (`macro_spec()`), and so does `/edit`. `/bind`, `/hook`, `/gag`, `/hilite` and `/trig*` take the
 * first `=` of all, quotes or not (`split_args()` in command.c). `/alias NAME` takes the rest of the line (lib/tf/alias.tf).
 */
export function macroBodyStart(text: string): number {
  const alias = ALIAS_RE.exec(text);
  if (alias) return (alias[1] as string).length;
  let from: number;
  const def = DEF_RE.exec(text);
  if (def) from = defOptionsEnd(text, def[0].length);
  else if (SPLIT_ARGS_RE.test(text)) from = 0;
  else return -1;
  const eq = text.indexOf("=", from);
  return eq < 0 ? -1 : eq + 1;
}

/**
 * The command statements tf runs from `text`, read as a macro body (`mode` "body", as `/eval` and
 * a macro read their text) or a top-level command. None when compiling stops at an error: tf
 * then runs nothing of it (proven 2026-10-13: a top-level `/if (1) /load a.tf%; /echo x` with
 * no `/endif` loaded nothing and echoed nothing).
 */
export function parseStatements(text: string, mode: StructureMode): Statement[] {
  const parser = new Parser(text, mode);
  parser.run();
  return parser.stopped ? [] : parser.statements;
}

/**
 * The command statements, expressions and `$(...)`s in `text`, read as parseStatements() reads
 * it. Unlike parseStatements(), what was read before compiling stopped at an error is kept: tf
 * would run none of it, but an editor still wants its names while the error is being fixed.
 */
export function parseRegions(
  text: string,
  mode: StructureMode,
): {
  statements: Statement[];
  expressions: ExpressionRegion[];
  cmdsubs: { start: number; end: number }[];
  spans: Span[];
  blocks: BlockRegion[];
  issues: StructureIssue[];
  /** Compiling stopped at an error (the last of `issues`), so nothing after it was read. */
  stopped: boolean;
} {
  const parser = new Parser(text, mode);
  parser.run();
  return {
    statements: parser.statements,
    expressions: parser.expressions,
    cmdsubs: parser.cmdsubs,
    spans: parser.spans,
    blocks: parser.blocks,
    issues: parser.issues,
    stopped: parser.stopped,
  };
}

/**
 * The statements and blocks of a macro body, each with the list it runs in. `complete` is false
 * when compiling stops at an error (tf runs none of it) or the check gives up on deep nesting.
 */
export function parseUnits(body: string): { units: Unit[]; lists: UnitList[]; complete: boolean } {
  const parser = new Parser(body, "body");
  parser.run();
  return { units: parser.units, lists: parser.lists, complete: !parser.stopped && !parser.issues.some((i) => i.kind === "too-deep") };
}

/**
 * The command statements of a top-level entry, with offsets into `entry.text`: the entry as tf
 * reads a top-level line (one statement to the end of the line, unless it is an `/if` or
 * `/while`), then, for a macro-defining entry, the statements of its body.
 */
export function entryStatements(entry: LogicalEntry): Statement[] {
  const statements = parseStatements(entry.text, "top");
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
  if (body >= 0) {
    for (const st of parseStatements(entry.text.slice(body), "body")) {
      statements.push({ ...st, start: st.start + body, end: st.end + body });
    }
  }
  return statements;
}

interface EntryModel {
  issues: StructureIssue[];
  swallowed: Swallowed[];
}

const cache = new WeakMap<LogicalEntry, EntryModel>();

function entryModel(entry: LogicalEntry): EntryModel {
  let model = cache.get(entry);
  if (!model) {
    const top = parseSettled(entry.text, "top");
    model = { issues: top.issues, swallowed: [...top.swallowed] };
    const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
    if (body >= 0) {
      const parser = parseSettled(entry.text.slice(body), "body");
      for (const issue of parser.issues) model.issues.push(shiftIssue(issue, body));
      for (const w of parser.swallowed) {
        const edits = w.edits.map((e) => ({ ...e, start: e.start + body, end: e.end + body }));
        const stray = w.stray && { ...w.stray, start: w.stray.start + body, end: w.stray.end + body };
        model.swallowed.push({ ...w, start: w.start + body, end: w.end + body, stmt: w.stmt + body, edits, ...(stray ? { stray } : {}) });
      }
    }
    cache.set(entry, model);
  }
  return model;
}

/**
 * Structural problems in a top-level entry, with offsets into `entry.text`: the entry as tf reads
 * a top-level line, and, for a `/def`, `/bind`, `/hook`, `/trig*` or `/alias`, its macro body.
 */
export function entryStructure(entry: LogicalEntry): StructureIssue[] {
  return entryModel(entry).issues;
}

/** The /ifs and /endifs in `entry` that a /let or /set value swallows, offsets into `entry.text`. */
export function entrySwallowed(entry: LogicalEntry): Swallowed[] {
  return entryModel(entry).swallowed;
}
