import { describe, expect, it } from "vitest";
import type { Position, Range } from "../src/diagnostics";
import { getSelectionRanges, type SelectionRangeNode } from "../src/selectionRange";

/** The text of each range around the first `|` in `marked`, innermost first. */
function expand(marked: string): string[] {
  const at = marked.indexOf("|");
  const text = marked.slice(0, at) + marked.slice(at + 1);
  const before = text.slice(0, at).split("\n");
  const pos = { line: before.length - 1, character: (before[before.length - 1] as string).length };
  const [node] = getSelectionRanges(text, [pos]);
  return chainOf(node as SelectionRangeNode).map((r) => slice(text, r));
}

function chainOf(node: SelectionRangeNode): Range[] {
  const out: Range[] = [];
  for (let n: SelectionRangeNode | undefined = node; n; n = n.parent) out.push(n.range);
  return out;
}

function offset(text: string, p: Position): number {
  const lines = text.split("\n");
  let o = 0;
  for (let l = 0; l < p.line; l += 1) o += (lines[l] as string).length + 1;
  return o + p.character;
}

function slice(text: string, r: Range): string {
  return text.slice(offset(text, r.start), offset(text, r.end));
}

function contains(outer: Range, inner: Range): boolean {
  const le = (a: Position, b: Position) => a.line < b.line || (a.line === b.line && a.character <= b.character);
  return le(outer.start, inner.start) && le(inner.end, outer.end);
}

describe("getSelectionRanges", () => {
  it("expands from a substitution's name out to the file", () => {
    const text = "/def -i foo = /if (x == 1) /echo %{na|me-def}%; /else /echo no%; /endif\n/echo after\n";
    expect(expand(text)).toEqual([
      "name",
      "name-def",
      "%{name-def}",
      "/echo %{name-def}",
      "/if (x == 1) /echo %{name-def}%; /else /echo no%; /endif",
      "/def -i foo = /if (x == 1) /echo %{name-def}%; /else /echo no%; /endif",
      "/def -i foo = /if (x == 1) /echo %{name-def}%; /else /echo no%; /endif\n/echo after\n",
    ]);
  });

  it("selects a command name with its slash, then the statement", () => {
    expect(expand("/def -i foo = /ech|o hi%; /beep")).toEqual([
      "echo",
      "/echo",
      "/echo hi",
      "/echo hi%; /beep",
      "/def -i foo = /echo hi%; /beep",
    ]);
  });

  it("goes through a condition, its parentheses and a string inside it", () => {
    const text = '/def -i f = /if (strlen("ab|c") > (1 + 2)) /echo y%; /endif';
    expect(expand(text)).toEqual([
      "abc",
      '"abc"',
      '("abc")',
      'strlen("abc") > (1 + 2)',
      '(strlen("abc") > (1 + 2))',
      '/if (strlen("abc") > (1 + 2)) /echo y%; /endif',
      '/def -i f = /if (strlen("abc") > (1 + 2)) /echo y%; /endif',
    ]);
  });

  it("selects a body part of an /if, then the whole block", () => {
    const text = "/def -i g = /if (x) /echo a%; /echo b%; /else /echo c%; /endif%; /echo d";
    expect(expand(text.replace("/echo b", "/ec|ho b"))).toEqual([
      "echo",
      "/echo",
      "/echo b",
      "/echo a%; /echo b",
      "/if (x) /echo a%; /echo b%; /else /echo c%; /endif",
      "/if (x) /echo a%; /echo b%; /else /echo c%; /endif%; /echo d",
      text,
    ]);
  });

  it("nests blocks", () => {
    const text = "/def -i h = /while (i < 3) /if (i) /echo x%; /endif%; /test i += 1%; /done";
    expect(expand(text.replace("/echo x", "/echo |x"))).toEqual([
      "x",
      "/echo x",
      "/if (i) /echo x%; /endif",
      "/if (i) /echo x%; /endif%; /test i += 1",
      "/while (i < 3) /if (i) /echo x%; /endif%; /test i += 1%; /done",
      text,
    ]);
  });

  it("follows a default holding a ${...}, and a parenthesis inside $[...]", () => {
    const text = "/def -i a = /if /test x%; /then /echo $[x * (2 + 3)]%; /elseif (y) /echo %{z-${w}}%; /endif";
    const at = (marker: string) => {
      const k = text.indexOf(marker);
      return `${text.slice(0, k)}|${text.slice(k)}`;
    };
    expect(expand(at("+ 3")).slice(0, 5)).toEqual(["2 + 3", "(2 + 3)", "x * (2 + 3)", "$[x * (2 + 3)]", "/echo $[x * (2 + 3)]"]);
    expect(expand(at("w}}")).slice(0, 5)).toEqual(["w", "${w}", "z-${w}", "%{z-${w}}", "/echo %{z-${w}}"]);
  });

  it("only treats as a substitution what tf substitutes there", () => {
    // A plain top-level command substitutes nothing, so %{x} is just text in it.
    expect(expand("/echo top %{|x}")).toEqual(["x", "/echo top %{x}"]);
  });

  it("covers $[...], $(...) and a /test statement", () => {
    expect(expand("/def -i t = /test v := $[1 + c|ount]")).toEqual([
      "count",
      "1 + count",
      "$[1 + count]",
      "v := $[1 + count]",
      "/test v := $[1 + count]",
      "/def -i t = /test v := $[1 + count]",
    ]);
    expect(expand("/def -i t = /echo $(/ec|ho in)")).toEqual([
      "echo",
      "/echo",
      "/echo in",
      "$(/echo in)",
      "/echo $(/echo in)",
      "/def -i t = /echo $(/echo in)",
    ]);
  });

  it("keeps ranges right across continuation lines, tabs and CRLF", () => {
    const text = ["/def -i k = \\", "\t/if (x) \\", "    /echo %{v|al}%; \\", "  /endif", ""].join("\r\n").replace(/\\\r\n/g, "\\\n");
    const got = expand(text);
    expect(got[0]).toBe("val");
    expect(got[1]).toBe("%{val}");
    expect(got[2]).toBe("/echo %{val}");
    expect(got[3]).toBe("/if (x) \\\n    /echo %{val}%; \\\n  /endif");
    expect(got[got.length - 2]).toBe("/def -i k = \\\n\t/if (x) \\\n    /echo %{val}%; \\\n  /endif");
  });

  it("starts from what holds a position in a continuation line's indentation", () => {
    const text = "/def -i k = \\\n    /if (x) \\\n        /echo y%; \\\n    /endif\n";
    const [node] = getSelectionRanges(text, [{ line: 2, character: 2 }]);
    const ranges = chainOf(node as SelectionRangeNode);
    expect(slice(text, ranges[0] as Range)).toBe("/if (x) \\\n        /echo y%; \\\n    /endif");
    for (const r of ranges) expect(contains(r, { start: { line: 2, character: 2 }, end: { line: 2, character: 2 } })).toBe(true);
  });

  it("counts UTF-16 units on lines with astral characters", () => {
    const text = "/def -i u = /echo 😀 %{nm}";
    const [node] = getSelectionRanges(text, [{ line: 0, character: text.indexOf("nm") + 1 }]);
    expect(node?.range).toEqual({ start: { line: 0, character: text.indexOf("nm") }, end: { line: 0, character: text.indexOf("nm") + 2 } });
  });

  it("gives every parent containing its child, for every position in tf's own shapes", () => {
    const text = [
      ";; a comment",
      "/def -i a = /if /test x%; /then /echo $[x * (2 + 3)]%; /elseif (y) /echo %{z-${w}}%; /endif",
      "/def -i b = \\",
      "    /while (i < 3) \\",
      "        /test i += 1%; \\",
      "    /done",
      "",
      "/echo top %{x}",
    ].join("\n");
    const lines = text.split("\n");
    const positions: Position[] = [];
    lines.forEach((l, line) => {
      for (let c = 0; c <= l.length; c += 1) positions.push({ line, character: c });
    });
    for (const node of getSelectionRanges(text, positions)) {
      const ranges = chainOf(node);
      for (let k = 1; k < ranges.length; k += 1) {
        expect(contains(ranges[k] as Range, ranges[k - 1] as Range)).toBe(true);
        expect(slice(text, ranges[k] as Range)).not.toBe(slice(text, ranges[k - 1] as Range));
      }
    }
  });

  it("answers each position of a request, comment and blank lines included", () => {
    const text = ";; note here\n\n/echo hi\n";
    const nodes = getSelectionRanges(text, [{ line: 0, character: 4 }, { line: 1, character: 0 }, { line: 2, character: 2 }]);
    expect(nodes).toHaveLength(3);
    expect(chainOf(nodes[0] as SelectionRangeNode).map((r) => slice(text, r))).toEqual(["note", ";; note here", text]);
    expect(chainOf(nodes[1] as SelectionRangeNode).map((r) => slice(text, r))).toEqual(["", text]);
    expect(chainOf(nodes[2] as SelectionRangeNode).map((r) => slice(text, r))).toEqual(["echo", "/echo", "/echo hi", text]);
  });
});
