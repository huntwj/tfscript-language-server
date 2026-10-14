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

/** `text` as a Markdown code span, for the hover explanations (which are Markdown). */
function code(text: string): string {
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
}

function charName(ch: string): string {
  if (ch === " ") return "space";
  if (ch === "\t") return "tab";
  if (ch === "\r") return "carriage return";
  return ch < " " ? `control character U+${ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}` : `'${ch}'`;
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
  /** Where the last `(condition)` ended (after its blanks), and the keyword it belongs to. */
  private conditionEnd: { at: number; keyword: string } | undefined;
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
    const fixer = fix ? this.mids.find((m) => m.word === fix && m.start > since && m.start < searchTo) : undefined;
    // Point at the first keyword of that statement: in "/echo a /else /echo b /endif" it is the /else.
    const mid = fixer && this.mids.find((m) => m.stmt === fixer.stmt && m.start > since);
    if (fixer && mid) {
      if (fix === "endif" && LET_ASSIGNMENT_RE.test(this.s.slice(mid.stmt, mid.start))) throw new Stop();
      this.fail("block", mid.start, mid.end, this.midKeyword(mid, fixer, since));
    }
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

  /** A keyword swallowed by the statement it sits in, which leaves its block unfinished. */
  private midKeyword(mid: MidKeyword, fixer: MidKeyword, since: number): IssueDetail {
    const expression = ["test", "return", "result"].includes(mid.command);
    const what = !mid.command ? "the text before it" : expression ? `the /${mid.command} expression` : `the /${mid.command} command`;
    const consequence: Record<string, string> = {
      endif: "the /if is never closed",
      done: "the /while is never closed",
      then: "the /if never reaches its /then",
      do: "the /while never reaches its /do",
    };
    const swallowed = this.mids.filter((m) => m.stmt === mid.stmt && m.start > since);
    const words = swallowed.map((m) => `/${m.word}`);
    const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : `${words[0]}`;
    const reads = expression
      ? `${code(`/${mid.command}`)} reads its expression up to the next ${code("%;")}, so ${code(`/${mid.word}`)} becomes part of the expression.`
      : mid.command
        ? `There is no ${code("%;")} before ${code(`/${mid.word}`)}, so ${code(`/${mid.command}`)} takes it, and everything after it up to the next ${code("%;")}, as its own text.`
        : `There is no ${code("%;")} before ${code(`/${mid.word}`)}, so it is read as part of the text before it.`;
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
      fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(swallowed) },
    };
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
          this.conditionEnd = { at: this.i, keyword };
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

  private openBlock(keyword: "if" | "while", start: number, end: number, subs: number): void {
    const outer = this.block;
    this.block = keyword;
    this.open.push({ keyword, start, end });
    this.list(subs);
    // Where the list stopped: /endif or /done if it closed, else whatever block it was in.
    const ended = this.block as Block;
    const to = this.i + 1;
    // Where a missing /endif or /done would go: the end of the body, or before the $(...)'s ).
    const where = this.cmdsub > 0 ? "before the )" : "at the end of the body";
    const closer = (word: string): IssueFix => ({ title: `Add %; /${word} ${where}`, edits: [this.appendStatement(this.i, word)] });
    const conditionList = (word: string, then: string): IssueDetail => ({
      message: `This /${word}'s condition list has no /${then}.`,
      label: `no /${then}`,
      explanation:
        `When ${code(`/${word}`)} is followed by commands instead of a ${code("(condition)")}, they are its condition, up to ` +
        `a ${code(`/${then}`)} at the start of a statement: ${code(`/${word} /test x%; /${then} ...`)}`,
    });
    if (keyword === "if") {
      if (ended === "if" || ended === "elseif") {
        this.blockError(start, end, conditionList("if", "then"), "then", "block", to);
      } else if (ended === "then" || ended === "else") {
        const top = this.mode === "top" && this.cmdsub === 0 && this.i >= this.s.length;
        this.blockError(
          start,
          end,
          top
            ? {
                message: "This /if has no /endif in the same command.",
                label: "no /endif on this line",
                explanation:
                  `tf reads a file one command per line, after joining lines that end in ${code("\\")}. An ${code("/if")} ` +
                  `and its ${code("/endif")} have to end up in the same command: either on one line, separated with ` +
                  `${code("%;")}, or with a trailing ${code("\\")} on every line but the last.`,
              }
            : {
                message: "This /if has no /endif.",
                label: "never closed",
                explanation: `An ${code("/if")} needs an ${code("/endif")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
                fix: closer("endif"),
              },
          "endif",
          top ? "if-top" : "block",
          to,
        );
      }
    } else if (ended === "while") {
      this.blockError(start, end, conditionList("while", "do"), "do", "block", to);
    } else if (ended === "do") {
      this.blockError(
        start,
        end,
        {
          message: "This /while has no /done.",
          label: "never closed",
          explanation: `A ${code("/while")} needs a ${code("/done")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
          fix: closer("done"),
        },
        "done",
        "block",
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
    if (this.mode === "top" && !outer && (word === "endif" || word === "else" || word === "elseif")) {
      problem.explanation =
        `tf reads a file one command per line, after joining lines that end in ${code("\\")}. If this belongs to an ` +
        `${code("/if")} on an earlier line, end every line from that ${code("/if")} to here with a trailing ${code("\\")}.`;
    }
    // Only a missing /then or /do can explain a keyword turning up early in a condition list.
    const fix = outer === "if" || outer === "elseif" ? "then" : outer === "while" ? "do" : undefined;
    this.blockError(start, end, problem, fix);
  }

  private blankLine(after: string, at: number): void {
    const sep = this.s.slice(at, at + 2);
    this.issues.push({
      kind: "blank-line",
      start: at,
      end: at + 2,
      message: `This ${sep} sends a blank line to the world.`,
      label: "ends an empty statement",
      explanation:
        `${code(after)} takes the next statement as its body. A ${code(sep)} straight after it ends an empty statement ` +
        "there, and tf sends an empty statement to the world as a blank line. Drop it.",
      // A blank in its place keeps /else from running into the next command (/else/echo is one word).
      fix: { title: `Remove the ${sep}`, edits: [{ start: at, end: at + 2, newText: isTfSpace(this.s[at + 2]) || at + 2 >= this.s.length ? "" : " " }] },
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
      this.fail("block", start, end, "/break takes a positive number of loops.");
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
    for (const issue of sub.issues) this.issues.push(shiftIssue(issue, start));
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
    if (bracket) {
      if (s[this.i] === "}") {
        this.i += 1;
        return;
      }
      // bad-substitution-selector already explains a substitution glued onto the selector.
      if (!hasDefault && (s[this.i] === "%" || s[this.i] === "$")) throw new Stop();
      const ch = s[this.i] as string;
      const close: IssueFix = { title: "Close it with }", edits: [this.insertAtEnd(this.i, "}")] };
      this.fail(
        "bracket",
        percent,
        percent + 2,
        this.i < s.length && !this.isStatEnd(this.i) && !(ch === "\r" && this.i === s.length - 1)
          ? {
              message: `This %{ needs its } before the ${charName(ch)}.`,
              label: "not closed",
              explanation:
                `${code("%{...}")} holds the name of a variable or parameter, and a name can't contain a ${charName(ch)}. ` +
                `To put text after the substitution, close it first: ${code("%{name} text")}.`,
              related: [{ start: this.i, end: this.i + 1, message: `the name stops at this ${charName(ch)}` }],
              fix: { title: `Close it with } before the ${charName(ch)}`, edits: [{ start: this.i, end: this.i, newText: "}" }] },
            }
          : { message: "This %{ is never closed: add }.", label: "never closed", fix: close },
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
      if (s[this.i] !== ")") {
        this.fail("bracket", dollar, dollar + 2, {
          message: "This $( is never closed: add ).",
          label: "never closed",
          fix: { title: "Close it with ) at the end", edits: [this.insertAtEnd(this.i, ")")] },
        });
      }
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
      if (s[this.i] !== "}") {
        this.fail("bracket", dollar, dollar + 2, {
          message: "This ${ is never closed: add }.",
          label: "never closed",
          fix: { title: "Close it with }", edits: [this.insertAtEnd(this.i, "}")] },
        });
      }
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
    const parens: number[] = [];
    while (this.i < s.length) {
      const ch = s[this.i] as string;
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = this.i;
        this.i += 1;
        while (this.i < s.length && s[this.i] !== ch) this.i += s[this.i] === "\\" ? 2 : 1;
        if (this.i >= s.length) {
          this.fail("bracket", quote, quote + 1, {
            message: `This string is never closed: add the closing ${ch}.`,
            label: "never closed",
            explanation:
              `Inside an expression (${code("$[...]")}, a condition or ${code("/test")}), ${code(ch)} starts a string that ` +
              `runs to the next ${code(ch)}. This one never finds its closing ${code(ch)}, so it takes everything after it, including any ${code("]")} or ${code(")")}.`,
          });
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
      if (ch === "(") parens.push(this.i);
      else if (ch === ")") {
        if (parens.length === 0) {
          if (close === ")") {
            this.i += 1;
            return;
          }
          this.fail("bracket", this.i, this.i + 1, {
            message: close === "]" ? "This ) has no matching ( inside the $[...]." : "This ) has no matching (.",
            label: "no matching (",
            fix: { title: "Remove the )", edits: [{ start: this.i, end: this.i + 1, newText: "" }] },
          });
        }
        parens.pop();
      } else if (ch === "]" && close === "]") {
        if (parens.length > 0) {
          const paren = parens[parens.length - 1] as number;
          this.fail("bracket", this.i, this.i + 1, {
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
      this.fail("bracket", open, open + 2, {
        message: "This $[ is never closed: add ].",
        label: "never closed",
        explanation: `A ${code("$[")} runs to its matching ${code("]")}, which has to come before the next ${code("%;")}.`,
        fix: { title: "Close it with ] at the end of the statement", edits: [this.insertAtEnd(this.i, `${")".repeat(parens.length)}]`)] },
      });
    } else if (close === ")") {
      this.fail("bracket", open, open + 1, {
        message: `The ${keyword ?? ""} condition's ( is never closed: add ).`,
        label: "never closed",
      });
    } else if (parens.length > 0) {
      const paren = parens[parens.length - 1] as number;
      this.fail("bracket", paren, paren + 1, {
        message: "This ( is never closed: add ).",
        label: "never closed",
        fix: { title: "Add ) at the end", edits: [this.insertAtEnd(s.length, ")".repeat(parens.length))] },
      });
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
        issues.push(shiftIssue(issue, body));
      }
    }
    cache.set(entry, issues);
  }
  return issues;
}
