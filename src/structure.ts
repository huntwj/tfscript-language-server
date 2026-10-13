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
 *  - `/break` outside a loop is accepted.
 *
 * Only the first error is reported, as tf stops compiling there. Warnings tf prints without
 * stopping (a `%;` straight after `/if (...)` or `/else` sends a blank line) are collected as
 * they come.
 */

export type StructureMode = "body" | "top";

export type StructureKind =
  /** Block structure: an unclosed or unexpected keyword, or text after /endif or /done. */
  | "block"
  /** A top-level /if whose /endif is not in the same (joined) line. */
  | "if-top"
  /** A substitution, command substitution, string or condition that never closes. */
  | "bracket"
  /** A %; right after /if (...) or /else, which sends a blank line to the world. */
  | "blank-line";

export interface StructureIssue {
  kind: StructureKind;
  /** Offsets into the text given to `checkStructure`. */
  start: number;
  end: number;
  message: string;
}

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

interface MidKeyword {
  start: number;
  end: number;
  word: string;
  /** The command the keyword sits in, lowercase without its slash, or "" for plain text. */
  command: string;
  /** Where that statement starts. */
  stmt: number;
}

/** let-swallows-endif's own pattern: it explains an /endif swallowed by an assignment like this. */
const LET_ASSIGNMENT_RE = /^\/(?:let|set)\b\s+[^\s=]+\s*=/i;

interface Open {
  keyword: "if" | "while";
  start: number;
  end: number;
}

function isNameChar(ch: string | undefined): boolean {
  return ch !== undefined && (/[A-Za-z0-9_]/.test(ch) || ch.charCodeAt(0) >= 0x80);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "0" && ch <= "9";
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
  private readonly open: Open[] = [];
  private readonly mids: MidKeyword[] = [];
  readonly issues: StructureIssue[] = [];
  constructor(private readonly s: string, private readonly mode: StructureMode) {}

  run(): void {
    try {
      if (this.mode === "body") this.list(FULL);
      else this.list(KEYWORD);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
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

  private fail(kind: StructureKind, start: number, end: number, message: string): never {
    this.issues.push({ kind, start, end: Math.max(end, start + 1), message });
    throw new Stop();
  }

  /**
   * A block error. When `fix`, the keyword that would have fixed it, sits in the middle of a
   * statement since the innermost block opened, point at that instead: the likely fix is a `%;`
   * before it. Keywords inside a block that has since closed, or inside a `$(...)`, don't count.
   */
  private blockError(
    start: number,
    end: number,
    problem: string,
    tf: string,
    fix: string | undefined,
    kind: StructureKind = "block",
    searchTo = start,
  ): never {
    const since = this.open.length > 0 ? (this.open[this.open.length - 1] as Open).start : -1;
    const fixer = fix ? this.mids.find((m) => m.word === fix && m.start > since && m.start < searchTo) : undefined;
    // Point at the first keyword of that statement: in "/echo a /else /echo b /endif" it is the /else.
    const mid = fixer && this.mids.find((m) => m.stmt === fixer.stmt && m.start > since);
    if (mid) {
      if (fix === "endif" && LET_ASSIGNMENT_RE.test(this.s.slice(mid.stmt, mid.start))) throw new Stop();
      const where = mid.command ? `the /${mid.command} statement` : "the statement before it";
      this.fail(
        "block",
        mid.start,
        mid.end,
        `/${mid.word} is part of ${where}, not a keyword: tf only reads keywords at the start of a ` +
          `statement. Put %; before it. (tf: "${tf}")`,
      );
    }
    this.fail(kind, start, end, `${problem} (tf: "${tf}")`);
  }

  private list(subsIn: number): void {
    let subs = subsIn;
    do {
      if (subs >= NEWLINE) {
        while (isTfSpace(this.s[this.i]) || (this.s[this.i] === "\\" && isTfSpace(this.s[this.i + 1]))) this.i += 1;
      }
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
            if (subs === KEYWORD) subs = NEWLINE;
            special = word;
            break;
          }
          case "then":
            if (this.block !== "if" && this.block !== "elseif") this.unexpected(word, stmtStart, kwEnd);
            this.block = "then";
            continue;
          case "do":
            if (this.block !== "while") this.unexpected(word, stmtStart, kwEnd);
            this.block = "do";
            continue;
          case "else":
          case "elseif":
            if (this.block !== "then") this.unexpected(word, stmtStart, kwEnd);
            this.block = word;
            if (word === "else" && this.isStatEnd(this.i)) this.blankLine(label, this.i);
            continue;
          case "endif":
            if (this.block !== "then" && this.block !== "else") this.unexpected(word, stmtStart, kwEnd);
            this.block = "endif";
            return;
          case "done":
            if (this.block !== "do") this.unexpected(word, stmtStart, kwEnd);
            this.block = "done";
            return;
          case "break":
            this.breakStatement(stmtStart, kwEnd);
            continue;
          case "test":
          case "return":
          case "result":
            this.expressionStatement(subs, word);
            break;
          default:
            this.i = stmtStart;
            this.statement(subs);
        }
      } else if (this.block === "if" || this.block === "elseif" || this.block === "while") {
        if (this.s[this.i] === "(") {
          const keyword = this.block === "while" ? "/while" : `/${this.block}`;
          this.condition(keyword);
          this.skipSpace();
          if (this.isStatEnd(this.i)) this.blankLine(`${keyword} (...)`, this.i);
          this.block = this.block === "while" ? "do" : "then";
          continue;
        }
        this.statement(subs);
      } else {
        this.statement(subs);
      }

      if (this.isCmdsubEnd(this.i)) return;
      if (this.isStatEnd(this.i)) {
        this.i += 2;
        this.skipSpace();
      } else if (this.i < this.s.length) {
        const after = special === "if" ? " after /endif" : special === "while" ? " after /done" : "";
        let end = this.i + 1;
        while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end)) end += 1;
        this.fail(
          "block",
          this.i,
          end,
          `Expected %; or the end of the line${after}, but found more text. (tf: "macro syntax error: ` +
            `expected end of statement${after}... Possibly missing '%;'")`,
        );
      }
    } while (this.i < this.s.length);
  }

  private openBlock(keyword: "if" | "while", start: number, end: number, subs: number): void {
    const outer = this.block;
    this.block = keyword;
    this.open.push({ keyword, start, end });
    this.list(subs);
    // Where the list stopped: /endif or /done if it closed, else whatever block it was in.
    const ended = this.block as Block;
    const found = this.errorText(this.i);
    const to = this.i + 1;
    if (keyword === "if") {
      if (ended === "if" || ended === "elseif") {
        this.blockError(start, end, "This /if's condition list has no /then.", `macro syntax error: expected /then, found ${found}.`, "then", "block", to);
      } else if (ended === "then" || ended === "else") {
        const top = this.mode === "top" && this.cmdsub === 0 && found === "end of body";
        this.blockError(
          start,
          end,
          top
            ? "/if has no matching /endif in the same top-level command. tf reads a file one command per " +
                "line (after joining any \\-continued lines), so /if and /endif must end up in that same " +
                "joined line: either on one line with %;, or continued with a trailing \\ on every line but " +
                "the last."
            : "This /if has no /endif.",
          `macro syntax error: expected /endif, found ${found}.`,
          "endif",
          top ? "if-top" : "block",
          to,
        );
      }
    } else if (ended === "while") {
      this.blockError(start, end, "This /while's condition list has no /do.", `macro syntax error: expected /do, found ${found}.`, "do", "block", to);
    } else if (ended === "do") {
      this.blockError(start, end, "This /while has no /done.", `macro syntax error: expected /done, found ${found}.`, "done", "block", to);
    }
    this.open.pop();
    this.dropMids(start);
    this.block = outer;
  }

  /** Forget mid-statement keywords after `from`: they sit in a block or `$(...)` that has closed. */
  private dropMids(from: number): void {
    while (this.mids.length > 0 && (this.mids[this.mids.length - 1] as MidKeyword).start > from) this.mids.pop();
  }

  /** What tf's `error_text()` quotes for the text at `p`: a word, one character, or "end of body". */
  private errorText(p: number): string {
    if (p >= this.s.length) return "end of body";
    let end = p + 1;
    if (/[A-Za-z0-9"'`/]/.test(this.s[p] as string)) while (end < this.s.length && /[A-Za-z0-9]/.test(this.s[end] as string)) end += 1;
    return `'${this.s.slice(p, end)}'`;
  }

  private unexpected(word: string, start: number, end: number): never {
    const outer = this.block;
    const label = word.toUpperCase();
    const tf =
      outer === "then" ? `unexpected /${label} in IF body`
        : outer === "do" ? `unexpected /${label} in WHILE body`
          : `unexpected /${label} in ${outer ? outer.toUpperCase() : "outer"} block`;
    let problem = `/${word} ${describeBlock(outer)} doesn't belong to anything here.`;
    if (word === "then" && outer === "then") problem = "/then after an /if (...) condition: the condition already acts as the /then.";
    else if (word === "do" && outer === "do") problem = "/do after a /while (...) condition: the condition already acts as the /do.";
    else if (word === "else" && outer === "else") problem = "A second /else in the same /if.";
    else if (word === "elseif" && outer === "else") problem = "/elseif after /else: /else must come last.";
    else if (outer === "if" || outer === "elseif") problem = `/${word} before the /then of a condition list (/if /test ...%; /then ...).`;
    else if (outer === "while") problem = `/${word} before the /do of a condition list (/while /test ...%; /do ...).`;
    if (this.mode === "top" && !outer && (word === "endif" || word === "else" || word === "elseif")) {
      problem += " If it belongs to an /if on an earlier line, join the lines with a trailing \\.";
    }
    // Only a missing /then or /do can explain a keyword turning up early in a condition list.
    const fix = outer === "if" || outer === "elseif" ? "then" : outer === "while" ? "do" : undefined;
    this.blockError(start, end, problem, tf, fix);
  }

  private blankLine(after: string, at: number): void {
    const sep = this.s.slice(at, at + 2);
    this.issues.push({
      kind: "blank-line",
      start: at,
      end: at + 2,
      message:
        `${sep} straight after ${after} ends an empty statement, which sends a blank line to the world. ` +
        `Drop the ${sep}. (tf warns: "\\"${sep}\\" following \\"${after.toUpperCase()}\\" sends blank line to server, ` +
        `which is probably not what was intended.")`,
    });
  }

  private breakStatement(start: number, end: number): void {
    if (this.i >= this.s.length || this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) {
      if (this.isStatEnd(this.i)) {
        this.i += 2;
        this.skipSpace();
      }
      return;
    }
    const digits = this.i;
    while (isDigit(this.s[this.i])) this.i += 1;
    if (this.i === digits || Number(this.s.slice(digits, this.i)) <= 0) {
      this.fail("block", start, end, `/break takes a positive number of loops. (tf: "/BREAK syntax error: expected positive integer")`);
    }
    if (this.isStatEnd(this.i)) {
      this.i += 2;
      this.skipSpace();
    }
  }

  /** `/test`, `/return`, `/result`: the text is substituted, then (if it's fixed) compiled as an expression. */
  private expressionStatement(subs: number, keyword: string): void {
    const start = this.i;
    this.statement(subs, keyword);
    const text = this.s.slice(start, this.i);
    if (/[%$\\]/.test(text)) return; // generated at runtime: compiled then
    const sub = new Parser(text, this.mode);
    try {
      sub.expression(undefined, 0);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
    // tf reports an error in a fixed expression but carries on compiling.
    for (const issue of sub.issues) this.issues.push({ ...issue, start: issue.start + start, end: issue.end + start });
  }

  /** Statement text, as `expand()` scans it, up to a separator, the end, or a `$(...)`'s `)`. */
  private statement(subs: number, keyword = ""): void {
    const s = this.s;
    const stmtStart = this.i;
    let command = keyword;
    if (!command && s[this.i] === "/") {
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
        if (kw && INNER_KEYWORDS.has(kw.word)) this.mids.push({ start: this.i, end: kw.end, word: kw.word, command, stmt: stmtStart });
      }
      this.i += 1;
    }
  }

  /** `%{...}` or `%name`, with `this.i` just after the `%` at `percent` (`varsub()`). */
  private varsub(percent: number): void {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
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
          "bracket",
          percent,
          this.i,
          (star || pee || n === 0
            ? "A leading - only goes with a positive number or L (%-1, %-L2), not with *, P or 0. "
            : "%- starts a substitution (%-1, %-L), but no selector follows it; write %%- for a literal %-. ") +
            `(tf: "illegal character '-' in substitution")`,
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
    if (bracket) {
      if (s[this.i] === "}") {
        this.i += 1;
        return;
      }
      // bad-substitution-selector already explains a substitution glued onto the selector.
      if (!hasDefault && (s[this.i] === "%" || s[this.i] === "$")) throw new Stop();
      const tf = this.i < s.length ? `unmatched { or illegal character '${s[this.i]}'` : "unmatched { or bad substitution";
      this.fail(
        "bracket",
        percent,
        percent + 2,
        this.i < s.length && !this.isStatEnd(this.i)
          ? `This %{ is never closed: tf expects } here. (tf: "${tf}")`
          : `This %{ is never closed. (tf: "${tf}")`,
      );
    }
  }

  /** `$$...`, `$[...]`, `$(...)` or `${name}`/`$name`, with `this.i` just after the `$` at `dollar`. */
  private dollarsub(dollar: number): void {
    const s = this.s;
    if (s[this.i] === "$") {
      while (s[this.i] === "$") this.i += 1;
    } else if (s[this.i] === "[") {
      this.i += 1;
      this.expression("]", dollar);
    } else if (s[this.i] === "(") {
      this.i += 1;
      this.cmdsub += 1;
      const outer = this.block;
      this.block = "";
      this.list(FULL);
      this.block = outer;
      this.cmdsub -= 1;
      this.dropMids(dollar);
      if (s[this.i] !== ")") this.fail("bracket", dollar, dollar + 2, `This $( is never closed. (tf: "unmatched (")`);
      this.i += 1;
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
      if (s[this.i] !== "}") this.fail("bracket", dollar, dollar + 2, `This \${ is never closed. (tf: "unmatched \${")`);
      this.i += 1;
    } else if (s[this.i] === "$") {
      this.i += 1;
    }
  }

  /** An `/if (...)` or `/while (...)` condition, with `this.i` at the `(`. */
  private condition(keyword: string): void {
    const open = this.i;
    this.i += 1;
    this.expression(")", open, keyword);
  }

  /**
   * An expression, up to its closing `close` (`]` for `$[`, `)` for a condition), or to the end of
   * the text when `close` is undefined. Only strings and parentheses are followed: enough to find
   * where it ends, not to check its grammar.
   */
  expression(close: "]" | ")" | undefined, open: number, keyword?: string): void {
    const s = this.s;
    let depth = 0;
    while (this.i < s.length) {
      const ch = s[this.i] as string;
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = this.i;
        this.i += 1;
        while (this.i < s.length && s[this.i] !== ch) this.i += s[this.i] === "\\" ? 2 : 1;
        if (this.i >= s.length) {
          this.fail("bracket", quote, quote + 1, `This string is never closed. (tf: "unmatched ${ch} in string literal")`);
        }
        this.i += 1;
        continue;
      }
      if (close && this.isStatEnd(this.i)) break;
      // primary_expr() (expr.c) hands these to the body scanners, where quotes are plain text.
      if (ch === "$") {
        this.i += 1;
        this.dollarsub(this.i - 1);
        continue;
      }
      if (ch === "{") {
        this.varsub(this.i);
        continue;
      }
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        if (depth === 0) {
          if (close === ")") {
            this.i += 1;
            return;
          }
          this.fail(
            "bracket",
            this.i,
            this.i + 1,
            close === "]"
              ? `This ) has no ( to close inside the $[...]. (tf: "expression syntax error: expected operator or ']', found ')'")`
              : `This ) has no ( to close. (tf: "expression syntax error: expected end of expression, found ')'")`,
          );
        }
        depth -= 1;
      } else if (ch === "]" && close === "]") {
        if (depth > 0) {
          this.fail("bracket", this.i, this.i + 1, `A ( in this $[...] is never closed before its ]. (tf: "expression syntax error: expected ')' after '(...', found ']'")`);
        }
        this.i += 1;
        return;
      }
      this.i += 1;
    }
    if (close === "]") {
      this.fail("bracket", open, open + 2, `This $[ is never closed. (tf: "unmatched $[")`);
    } else if (close === ")") {
      this.fail(
        "bracket",
        open,
        open + 1,
        `The ${keyword ?? ""} condition's ( is never closed. (tf: "condition syntax error: expected operator or ')'")`,
      );
    } else if (depth > 0) {
      this.fail("bracket", open, s.length, `A ( in this expression is never closed. (tf: "expression syntax error: expected ')'")`);
    }
  }
}

/** Structural problems in a macro body (`mode` "body") or a top-level command (`mode` "top"). */
export function checkStructure(text: string, mode: StructureMode): StructureIssue[] {
  const parser = new Parser(text, mode);
  parser.run();
  return parser.issues;
}

const DEF_RE = /^\s*\/def\b/i;
const SPLIT_ARGS_RE = /^\s*\/(?:bind|hook|trigpc|trigc|trigp|trig)\b/i;
const ALIAS_RE = /^(\s*\/alias\s+\S+\s+)\S/i;

/**
 * Where the body of a macro-defining entry starts, or -1. `/def` reads its options first, so an
 * option argument may hold an `=` (`-t*hp=*`, `-t"a=b"`), then takes the first `=` after them
 * (`macro_spec()`). `/bind`, `/hook` and `/trig*` take the first `=` of all, quotes or not
 * (`split_args()` in command.c). `/alias NAME` takes the rest of the line (lib/tf/alias.tf).
 */
export function macroBodyStart(text: string): number {
  const alias = ALIAS_RE.exec(text);
  if (alias) return (alias[1] as string).length;
  let from: number;
  if (DEF_RE.test(text)) from = defOptionsEnd(text, text.search(/\/def/i) + 4);
  else if (SPLIT_ARGS_RE.test(text)) from = 0;
  else return -1;
  const eq = text.indexOf("=", from);
  return eq < 0 ? -1 : eq + 1;
}

const cache = new WeakMap<LogicalEntry, StructureIssue[]>();

/**
 * Structural problems in a top-level entry, with offsets into `entry.text`: the entry as tf reads
 * a top-level line, and, for a `/def`, `/bind`, `/hook`, `/trig*` or `/alias`, its macro body.
 */
export function entryStructure(entry: LogicalEntry): StructureIssue[] {
  let issues = cache.get(entry);
  if (!issues) {
    issues = checkStructure(entry.text, "top");
    const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
    if (body >= 0) {
      for (const issue of checkStructure(entry.text.slice(body), "body")) {
        issues.push({ ...issue, start: issue.start + body, end: issue.end + body });
      }
    }
    cache.set(entry, issues);
  }
  return issues;
}
