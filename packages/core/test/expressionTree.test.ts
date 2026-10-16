import { describe, expect, it } from "vitest";
import { alwaysEvaluated, ExprSyntaxError, parseExpression, pathTo, type ExprNode } from "../src/expressionTree";

/** The tree as nested parentheses, operands by their text. */
function show(s: string, n: ExprNode): string {
  const t = (x: ExprNode): string => show(s, x);
  switch (n.kind) {
    case "paren":
      return `(${t(n.inner)})`;
    case "bracket":
      return `$[${t(n.inner)}]`;
    case "call":
      return `${n.name}(${n.args.map(t).join(", ")})`;
    case "prefix":
      return `{${n.op} ${t(n.operand)}}`;
    case "binary":
    case "assign":
      return `{${t(n.left)} ${n.op} ${t(n.right)}}`;
    case "conditional":
      return n.then ? `{${t(n.test)} ? ${t(n.then)} : ${t(n.otherwise)}}` : `{${t(n.test)} ?: ${t(n.otherwise)}}`;
    default:
      return s.slice(n.start, n.end);
  }
}

/** Substitution spans for `{...}`, `%name` and `$(...)`, found the simple way, for these tests. */
function spans(s: string): (start: number) => number | undefined {
  return (start) => {
    if (s[start] === "{") return s.indexOf("}", start) + 1;
    if (s[start] === "%") {
      const m = /^%\{?[A-Za-z0-9_]+\}?/.exec(s.slice(start));
      return m ? start + m[0].length : undefined;
    }
    if (s.startsWith("$(", start)) return s.indexOf(")", start) + 1;
    return undefined;
  };
}

function tree(s: string): string {
  return show(s, parseExpression(s, 0, s.length, spans(s)));
}

describe("the expression tree", () => {
  it("follows tf's precedence, loosest first", () => {
    expect(tree("a, b := c ? d | e & f == g + h * -i : j")).toBe("{a , {b := {c ? {d | {e & {f == {g + {h * {- i}}}}}} : j}}}");
  });

  it("groups left to right, except assignments", () => {
    expect(tree("a - b - c")).toBe("{{a - b} - c}");
    expect(tree("a < b < c")).toBe("{{a < b} < c}");
    expect(tree("a & b & c")).toBe("{{a & b} & c}");
    expect(tree("a := b += c")).toBe("{a := {b += c}}");
  });

  it("reads each relation, and a single = as a comparison", () => {
    for (const op of ["=", "==", "=~", "=/", "!=", "!~", "!/", "<", "<=", ">", ">="]) expect(tree(`a ${op} b`)).toBe(`{a ${op} b}`);
    expect(tree("a=b")).toBe("{a = b}");
  });

  it("reads the assignments, and += apart from +", () => {
    for (const op of [":=", "+=", "-=", "*=", "/="]) expect(tree(`a${op}1`)).toBe(`{a ${op} 1}`);
    expect(tree("a++b")).toBe("{a + {+ b}}");
    expect(tree("a--b")).toBe("{a - {- b}}");
    expect(tree("++a")).toBe("{++ a}");
    expect(tree("!-a")).toBe("{! {- a}}");
  });

  it("reads ?: and the ?: with no middle", () => {
    expect(tree("a ? b : c ? d : e")).toBe("{a ? b : {c ? d : e}}");
    expect(tree("a ?: b")).toBe("{a ?: b}");
    expect(tree("a ? b, c : d")).toBe("{a ? {b , c} : d}");
  });

  it("reads operands: numbers, strings, names, calls, parentheses and substitutions", () => {
    expect(tree('strlen("a\\"b") + 1.5e3 * 1:30')).toBe('{strlen("a\\"b") + {1.5e3 * 1:30}}');
    expect(tree("f() + g(a, b := 1)")).toBe("{f() + g(a, {b := 1})}");
    expect(tree("$[a + b] * (c)")).toBe("{$[{a + b}] * (c)}");
    expect(tree("{x} + %y - $(/echo 1)")).toBe("{{{x} + %y} - $(/echo 1)}");
  });

  it("gives node spans without the blanks around them", () => {
    const s = "  a +  b * c  ";
    const root = parseExpression(s, 0, s.length);
    expect(s.slice(root.start, root.end)).toBe("a +  b * c");
    expect(pathTo(root, s.indexOf("b"), s.indexOf("c") + 1)?.map((n) => s.slice(n.start, n.end))).toEqual(["a +  b * c", "b * c"]);
    expect(pathTo(root, s.indexOf("a"), s.indexOf("b") + 1)).toBeUndefined();
  });

  it("rejects what tf rejects", () => {
    for (const bad of ["a || b", "a +", "(a", "a)", '"open', "3(1)", "a ? b", "", "f(a b)", "'it''s'"]) {
      expect(() => parseExpression(bad, 0, bad.length), bad).toThrow(ExprSyntaxError);
    }
  });

  it("knows which operands only run some of the time", () => {
    const s = "a & b | c ? d : e";
    const root = parseExpression(s, 0, s.length);
    const at = (text: string): ExprNode[] => pathTo(root, s.indexOf(text), s.indexOf(text) + text.length) ?? [];
    const always = (text: string): boolean => {
      const path = at(text);
      return path.every((n, k) => k === 0 || alwaysEvaluated(path[k - 1] as ExprNode, n));
    };
    expect(always("a")).toBe(true);
    expect(always("a & b")).toBe(true);
    expect(always("b")).toBe(false);
    expect(always("c")).toBe(false);
    expect(always("d")).toBe(false);
    expect(always("e")).toBe(false);
  });
});
