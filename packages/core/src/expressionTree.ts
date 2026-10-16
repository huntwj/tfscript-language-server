import { isTfSpace } from "./logicalEntries";

/**
 * A tf expression's syntax tree, read the way tf's compiler reads it (expr.c, `comma_expr()` down
 * to `primary_expr()`), character by character, so a node is exactly the text tf compiles as one
 * operand. Precedence, loosest first: `,`; the assignments `:=`, `+=`, `-=`, `*=`, `/=` (right to
 * left); `?:` and `? :`; `|`; `&`; the relations `=`, `==`, `=~`, `=/`, `!=`, `!~`, `!/`, `<`, `<=`,
 * `>`, `>=`; `+` and `-`; `*` and `/` (each left to right); the prefixes `!`, `+`, `-`, `++`, `--`;
 * a function call `name(...)`. A single `=` is a comparison, not an assignment, and `||` is no
 * operator (tf reads `|` and then fails on the second).
 *
 * The operands: a number, a string in `"`, `'` or backquotes, a name, `(...)`, `$[...]` (compiled
 * like `(...)`), and the substitutions `{x}`, `%x`, `%{x}`, `$(...)` and `${x}`. The extent of a
 * substitution comes from the caller (the structure parser's spans), as it isn't expression syntax.
 */

export type ExprNode =
  | { kind: "number" | "string" | "name"; start: number; end: number }
  /** `{x}`, `%x` or `%{x}` (`"variable"`), `$(...)` (`"command"`) or `${x}` (`"macro"`). */
  | { kind: "substitution"; what: "variable" | "command" | "macro"; start: number; end: number }
  | { kind: "paren" | "bracket"; start: number; end: number; inner: ExprNode }
  | { kind: "call"; start: number; end: number; name: string; args: ExprNode[] }
  | { kind: "prefix"; op: "!" | "+" | "-" | "++" | "--"; start: number; end: number; operand: ExprNode }
  | { kind: "binary"; op: string; start: number; end: number; left: ExprNode; right: ExprNode }
  | { kind: "assign"; op: string; start: number; end: number; left: ExprNode; right: ExprNode }
  | { kind: "conditional"; start: number; end: number; test: ExprNode; then?: ExprNode; otherwise: ExprNode };

export class ExprSyntaxError extends Error {
  constructor(readonly at: number) {
    super("expression syntax error");
  }
}

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= "0" && c <= "9";
const isNameFirst = (c: string | undefined): boolean => c !== undefined && (/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 0x80);
const isNameChar = (c: string | undefined): boolean => isNameFirst(c) || isDigit(c);
const NUMBER_RE = /(?:[0-9]+(?::[0-9]*)*(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y;

class Reader {
  private i: number;
  constructor(
    private readonly s: string,
    from: number,
    private readonly to: number,
    private readonly substitutionEnd: (start: number) => number | undefined,
  ) {
    this.i = from;
  }

  private ch(k = 0): string {
    return this.i + k < this.to ? (this.s[this.i + k] as string) : "";
  }

  private space(): void {
    while (this.i < this.to && isTfSpace(this.s[this.i])) this.i += 1;
  }

  private fail(): never {
    throw new ExprSyntaxError(this.i);
  }

  whole(): ExprNode {
    this.space();
    const node = this.comma();
    this.space();
    if (this.i !== this.to) this.fail();
    return node;
  }

  private comma(): ExprNode {
    let node = this.assignment();
    while (this.ch() === ",") {
      this.i += 1;
      const right = this.assignment();
      node = { kind: "binary", op: ",", start: node.start, end: right.end, left: node, right };
    }
    return node;
  }

  private assignment(): ExprNode {
    const left = this.conditional();
    if (":+-*/".includes(this.ch() || " ") && this.ch(1) === "=") {
      const op = `${this.ch()}=`;
      this.i += 2;
      const right = this.assignment();
      return { kind: "assign", op, start: left.start, end: right.end, left, right };
    }
    return left;
  }

  private conditional(): ExprNode {
    const test = this.or();
    if (this.ch() !== "?") return test;
    this.i += 1;
    this.space();
    if (this.ch() === ":") {
      this.i += 1;
      const otherwise = this.conditional();
      return { kind: "conditional", start: test.start, end: otherwise.end, test, otherwise };
    }
    const then = this.comma();
    if (this.ch() !== ":") this.fail();
    this.i += 1;
    const otherwise = this.conditional();
    return { kind: "conditional", start: test.start, end: otherwise.end, test, then, otherwise };
  }

  private or(): ExprNode {
    let node = this.and();
    while (this.ch() === "|") {
      this.i += 1;
      const right = this.and();
      node = { kind: "binary", op: "|", start: node.start, end: right.end, left: node, right };
    }
    return node;
  }

  private and(): ExprNode {
    let node = this.relational();
    while (this.ch() === "&") {
      this.i += 1;
      const right = this.relational();
      node = { kind: "binary", op: "&", start: node.start, end: right.end, left: node, right };
    }
    return node;
  }

  private relational(): ExprNode {
    let node = this.additive();
    for (;;) {
      const c = this.ch();
      const n = this.ch(1);
      let op: string;
      if (c === "=") op = "~/=".includes(n || " ") ? `=${n}` : "=";
      else if (c === "!" && "~/=".includes(n || " ")) op = `!${n}`;
      else if (c === ">" || c === "<") op = n === "=" ? `${c}=` : c;
      else break;
      this.i += op.length;
      const right = this.additive();
      node = { kind: "binary", op, start: node.start, end: right.end, left: node, right };
    }
    return node;
  }

  private additive(): ExprNode {
    let node = this.multiplicative();
    while ((this.ch() === "+" || this.ch() === "-") && this.ch(1) !== "=") {
      const op = this.ch();
      this.i += 1;
      const right = this.multiplicative();
      node = { kind: "binary", op, start: node.start, end: right.end, left: node, right };
    }
    return node;
  }

  private multiplicative(): ExprNode {
    let node = this.unary();
    while ((this.ch() === "*" || this.ch() === "/") && this.ch(1) !== "=") {
      const op = this.ch();
      this.i += 1;
      const right = this.unary();
      node = { kind: "binary", op, start: node.start, end: right.end, left: node, right };
    }
    return node;
  }

  private unary(): ExprNode {
    this.space();
    const start = this.i;
    const c = this.ch();
    if (c === "!" || c === "+" || c === "-") {
      const op = (c !== "!" && this.ch(1) === c ? `${c}${c}` : c) as "!" | "+" | "-" | "++" | "--";
      this.i += op.length;
      const operand = this.unary();
      return { kind: "prefix", op, start, end: operand.end, operand };
    }
    const primary = this.primary();
    if (this.ch() !== "(") return primary;
    // A function call: tf requires the operand before the ( to be a name.
    if (primary.kind !== "name") this.fail();
    this.i += 1;
    this.space();
    const args: ExprNode[] = [];
    if (this.ch() !== ")") {
      for (;;) {
        args.push(this.assignment());
        if (this.ch() === ")") break;
        if (this.ch() !== ",") this.fail();
        this.i += 1;
      }
    }
    this.i += 1;
    const end = this.i;
    this.space();
    return { kind: "call", start, end, name: this.s.slice(primary.start, primary.end), args };
  }

  private primary(): ExprNode {
    this.space();
    const start = this.i;
    const c = this.ch();
    let node: ExprNode;
    if (isDigit(c) || (c === "." && isDigit(this.ch(1)))) {
      NUMBER_RE.lastIndex = this.i;
      const m = NUMBER_RE.exec(this.s);
      this.i = Math.min(this.to, this.i + (m?.[0].length ?? 1));
      node = { kind: "number", start, end: this.i };
    } else if (c === '"' || c === "'" || c === "`") {
      this.i += 1;
      while (this.i < this.to && this.s[this.i] !== c) this.i += this.s[this.i] === "\\" && (this.s[this.i + 1] === c || this.s[this.i + 1] === "\\") ? 2 : 1;
      if (this.i >= this.to) this.fail();
      this.i += 1;
      node = { kind: "string", start, end: this.i };
    } else if (isNameFirst(c)) {
      while (isNameChar(this.ch())) this.i += 1;
      node = { kind: "name", start, end: this.i };
    } else if (c === "$" && this.ch(1) === "[") {
      this.i += 2;
      const inner = this.comma();
      if (this.ch() !== "]") this.fail();
      this.i += 1;
      node = { kind: "bracket", start, end: this.i, inner };
    } else if (c === "(") {
      this.i += 1;
      const inner = this.comma();
      if (this.ch() !== ")") this.fail();
      this.i += 1;
      node = { kind: "paren", start, end: this.i, inner };
    } else if (c === "{" || c === "%" || c === "$") {
      const end = this.substitutionEnd(start);
      if (end === undefined || end > this.to) this.fail();
      this.i = end;
      const what = c !== "$" ? "variable" : this.s[start + 1] === "(" ? "command" : "macro";
      node = { kind: "substitution", what, start, end };
    } else {
      this.fail();
    }
    this.space();
    return node;
  }
}

/**
 * The tree of the expression `s[from, to)`; `substitutionEnd(start)` gives where a substitution
 * starting there ends. Throws ExprSyntaxError where tf would report a syntax error.
 */
export function parseExpression(s: string, from: number, to: number, substitutionEnd: (start: number) => number | undefined = () => undefined): ExprNode {
  return new Reader(s, from, to, substitutionEnd).whole();
}

/** A node's operands, in the order tf evaluates them. */
export function children(node: ExprNode): ExprNode[] {
  switch (node.kind) {
    case "paren":
    case "bracket":
      return [node.inner];
    case "call":
      return node.args;
    case "prefix":
      return [node.operand];
    case "binary":
    case "assign":
      return [node.left, node.right];
    case "conditional":
      return node.then ? [node.test, node.then, node.otherwise] : [node.test, node.otherwise];
    default:
      return [];
  }
}

/**
 * Whether tf always evaluates `child` when it evaluates `parent`: not the right of `&` or `|`,
 * which only runs when the left doesn't decide, nor a branch of `?:`.
 */
export function alwaysEvaluated(parent: ExprNode, child: ExprNode): boolean {
  if (parent.kind === "binary" && (parent.op === "&" || parent.op === "|")) return child === parent.left;
  if (parent.kind === "conditional") return child === parent.test;
  return true;
}

/** The chain of nodes from `root` down to the one spanning exactly `[start, end)`, or undefined. */
export function pathTo(root: ExprNode, start: number, end: number): ExprNode[] | undefined {
  if (root.start === start && root.end === end) {
    // Prefer the innermost of nodes sharing a span: there are none, a node and its operands differ.
    return [root];
  }
  if (root.start > start || root.end < end) return undefined;
  for (const child of children(root)) {
    const path = pathTo(child, start, end);
    if (path) return [root, ...path];
  }
  return undefined;
}

/** Every node of the tree, `root` first. */
export function nodes(root: ExprNode): ExprNode[] {
  const out: ExprNode[] = [];
  const walk = (n: ExprNode): void => {
    out.push(n);
    for (const c of children(n)) walk(c);
  };
  walk(root);
  return out;
}
