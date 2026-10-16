import { describe, expect, it } from "vitest";
import type { Range, TfTextEdit } from "../src/diagnostics";
import { getExtractVariableActions } from "../src/extractVariable";
import { getRenameEdits } from "../src/navigation";

/** Applies edits, last first, so earlier positions stay valid. */
function apply(text: string, edits: TfTextEdit[]): string {
  const lines = text.split("\n");
  const offset = (p: { line: number; character: number }): number => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  let out = text;
  for (const e of [...edits].sort((a, b) => offset(b.range.start) - offset(a.range.start))) {
    out = out.slice(0, offset(e.range.start)) + e.newText + out.slice(offset(e.range.end));
  }
  return out;
}

/** The range of `sub` in `text` (its first occurrence at or after `from`). */
function rangeOf(text: string, sub: string, from = 0): Range {
  const at = text.indexOf(sub, from);
  if (at < 0) throw new Error(`no ${sub}`);
  const pos = (o: number): { line: number; character: number } => {
    const before = text.slice(0, o).split("\n");
    return { line: before.length - 1, character: (before[before.length - 1] as string).length };
  };
  return { start: pos(at), end: pos(at + sub.length) };
}

function extract(text: string, sub: string, from = 0, mentionedOutside?: (n: string) => boolean): string | undefined {
  const [action] = getExtractVariableActions(text, rangeOf(text, sub, from), mentionedOutside ? { mentionedOutside } : {});
  if (!action || action.disabled) return undefined;
  return apply(text, action.edits);
}

function reason(text: string, sub: string, from = 0): string | undefined {
  return getExtractVariableActions(text, rangeOf(text, sub, from))[0]?.disabled;
}

function actions(text: string, sub: string, from = 0) {
  return getExtractVariableActions(text, rangeOf(text, sub, from));
}

describe("extract to a local variable", () => {
  describe("where the selection is", () => {
    it("takes part of an /if condition, and puts the /let before the /if", () => {
      const text = "/def f = /echo hi%; /if (hp * 100 / maxhp < 30) /echo low%; /endif%; /echo done\n";
      expect(extract(text, "hp * 100 / maxhp")).toBe(
        "/def f = /echo hi%; /let value=%; /test value:=(hp * 100 / maxhp)%; /if ({value} < 30) /echo low%; /endif%; /echo done\n",
      );
      expect(actions(text, "hp * 100 / maxhp")[0]?.title).toBe("Extract to a local variable");
    });

    it("takes a whole condition, with or without its parentheses", () => {
      const text = "/def f = /if (a > b) /echo yes%; /endif%; /echo done\n";
      const want = "/def f = /let value=%; /test value:=(a > b)%; /if ({value}) /echo yes%; /endif%; /echo done\n";
      expect(extract(text, "a > b")).toBe(want);
      expect(extract(text, "(a > b)")).toBe(want);
    });

    it("takes an operand inside a $[...] in command text", () => {
      const text = "/def f = /echo total: $[base + bonus * 2]\n";
      expect(extract(text, "bonus * 2")).toBe("/def f = /let value=%; /test value:=(bonus * 2)%; /echo total: $[base + {value}]\n");
    });

    it("replaces a whole $[...] in command text with %{value}", () => {
      const text = "/def f = /echo total: $[base + 1] points\n";
      expect(extract(text, "$[base + 1]")).toBe("/def f = /let value=%; /test value:=(base + 1)%; /echo total: %{value} points\n");
    });

    it("replaces a whole $[...] in a /test's text with %{value}, as that text is substituted", () => {
      const text = "/def f = /test $[a + 1] > 3\n";
      expect(extract(text, "$[a + 1]")).toBe("/def f = /let value=%; /test value:=(a + 1)%; /test %{value} > 3\n");
    });

    it("takes a whole $[...] operand in a condition as {value}", () => {
      const text = "/def f = /if ($[a + 1] > 3) /echo y%; /endif%; /echo n\n";
      expect(extract(text, "$[a + 1]")).toBe("/def f = /let value=%; /test value:=(a + 1)%; /if ({value} > 3) /echo y%; /endif%; /echo n\n");
    });

    it("takes part of a /test, /return or /result text", () => {
      expect(extract("/def f = /test x := a * (b + c)\n", "b + c")).toBe("/def f = /let value=%; /test value:=(b + c)%; /test x := a * ({value})\n");
      expect(extract("/def f = /return a * (b + c)\n", "b + c")).toBe("/def f = /let value=%; /test value:=(b + c)%; /return a * ({value})\n");
      expect(extract("/def f = /result strlen(name) + 1\n", "strlen(name)")).toBe(
        "/def f = /let value=%; /test value:=(strlen(name))%; /result {value} + 1\n",
      );
    });

    it("works in a branch, inserting before the statement inside it", () => {
      const text = "/def f = /if (x) /echo $[a + b]%; /else /echo $[a - b]%; /endif\n";
      expect(extract(text, "a - b")).toBe("/def f = /if (x) /echo $[a + b]%; /else /let value=%; /test value:=(a - b)%; /echo $[{value}]%; /endif\n");
    });

    it("works in a /while's body, where it runs on each turn", () => {
      const text = "/def f = /while (i < 3) /echo $[i * 2]%; /test ++i%; /done\n";
      expect(extract(text, "i * 2")).toBe("/def f = /while (i < 3) /let value=%; /test value:=(i * 2)%; /echo $[{value}]%; /test ++i%; /done\n");
    });

    it("works in a trigger's and a hook's body", () => {
      expect(extract("/def -t'* hits you' hit = /echo ouch $[hp - 1]\n", "hp - 1")).toBe(
        "/def -t'* hits you' hit = /let value=%; /test value:=(hp - 1)%; /echo ouch $[{value}]\n",
      );
      expect(extract("/hook CONNECT = /echo $[n + 1]\n", "n + 1")).toBe("/hook CONNECT = /let value=%; /test value:=(n + 1)%; /echo $[{value}]\n");
    });

    it("snaps blanks at either end of the selection", () => {
      const text = "/def f = /echo $[a +  b * c ]\n";
      expect(extract(text, "  b * c ")).toBe("/def f = /let value=%; /test value:=(b * c)%; /echo $[a +  {value} ]\n");
    });

    it("takes the left of & and |, which always runs", () => {
      expect(extract("/def f = /if (a + 1 & b) /echo y%; /endif%; /echo n\n", "a + 1")).toBe(
        "/def f = /let value=%; /test value:=(a + 1)%; /if ({value} & b) /echo y%; /endif%; /echo n\n",
      );
    });

    it("isn't offered outside a macro body, nor where the selection holds no expression", () => {
      expect(actions("/if (a + 1 > 2) /echo y%; /endif\n", "a + 1")).toEqual([]);
      expect(actions("/test a + 1\n", "a + 1")).toEqual([]);
      expect(actions("/alias f /echo $[a + 1]\n", "a + 1")).toEqual([]);
      expect(actions("/def f = /echo hi there\n", "hi there")).toEqual([]);
      expect(actions("/def f = /echo $[a + 1]%; /echo b\n", "/echo $[a + 1]%; /echo b")).toEqual([]);
    });

    it("isn't offered on a CRLF file", () => {
      expect(actions("/def f = /echo $[a + 1]\r\n", "a + 1")).toEqual([]);
    });
  });

  describe("the layout", () => {
    it("puts the statements on lines of their own, indented, when the statement starts a continued line", () => {
      const text = ["/def f = \\", "    /echo a%;\\", "    /if (hp < max / 2) \\", "        /echo low%;\\", "    /endif%;\\", "    /echo b", ""].join("\n");
      expect(extract(text, "max / 2")).toBe(
        [
          "/def f = \\",
          "    /echo a%;\\",
          "    /let value=%;\\",
          "    /test value:=(max / 2)%;\\",
          "    /if (hp < {value}) \\",
          "        /echo low%;\\",
          "    /endif%;\\",
          "    /echo b",
          "",
        ].join("\n"),
      );
    });

    it("ends the new lines the way the body's do", () => {
      const text = ["/def f = \\", "    /echo a%; \\", "    /echo $[x + 1]", ""].join("\n");
      expect(extract(text, "x + 1")).toBe(["/def f = \\", "    /echo a%; \\", "    /let value=%; \\", "    /test value:=(x + 1)%; \\", "    /echo $[{value}]", ""].join("\n"));
    });

    it("stays on the line when the statement doesn't start one", () => {
      const text = ["/def f = /echo a%; /echo $[x + 1]%;\\", "    /echo b", ""].join("\n");
      expect(extract(text, "x + 1")).toBe(["/def f = /echo a%; /let value=%; /test value:=(x + 1)%; /echo $[{value}]%;\\", "    /echo b", ""].join("\n"));
    });

    it("takes a selection over a continued line", () => {
      const text = ["/def f = /echo $[a + \\", "    b]", ""].join("\n");
      expect(extract(text, "a + \\\n    b")).toBe(["/def f = /let value=%; /test value:=(a + b)%; /echo $[{value}]", ""].join("\n"));
    });

    it("keeps a whole $[...] after a % as $[...], where %{value} would make an escaped %", () => {
      expect(extract("/def f = /echo 50%$[1 + 2] x\n", "$[1 + 2]")).toBe("/def f = /let value=%; /test value:=(1 + 2)%; /echo 50%$[{value}] x\n");
      expect(extract("/def f = /echo 50%%$[1 + 2] x\n", "$[1 + 2]")).toBe("/def f = /let value=%; /test value:=(1 + 2)%; /echo 50%%$[{value}] x\n");
      expect(extract("/def f = /echo 50%%%$[1 + 2] x\n", "$[1 + 2]")).toBe("/def f = /let value=%; /test value:=(1 + 2)%; /echo 50%%%$[{value}] x\n");
    });

    it("joins the statements and the reference when the statement starts with the selection", () => {
      const text = "/def f = /echo x%; $[a + 1]\n";
      expect(extract(text, "$[a + 1]")).toBe("/def f = /echo x%; /let value=%; /test value:=(a + 1)%; %{value}\n");
    });
  });

  describe("the name", () => {
    it("is value, numbered past any name the file mentions", () => {
      expect(extract("/def f = /set value=1%; /echo $[a + 1]\n", "a + 1")).toBe("/def f = /set value=1%; /let value2=%; /test value2:=(a + 1)%; /echo $[{value2}]\n");
      expect(extract("; Value and value2 are taken\n/def f = /echo $[a + 1]\n", "a + 1")?.split("\n")[1]).toBe("/def f = /let value3=%; /test value3:=(a + 1)%; /echo $[{value3}]");
    });

    it("is a local that rename then changes everywhere at once", () => {
      const out = extract("/def f = /echo $[a + 1] %{n}\n", "$[a + 1]") as string;
      const edits = getRenameEdits(out, { line: 0, character: out.indexOf("value") + 1 }, "total");
      expect(Array.isArray(edits) ? edits.length : edits).toBe(3);
      expect(apply(out, Array.isArray(edits) ? edits : [])).toBe("/def f = /let total=%; /test total:=(a + 1)%; /echo %{total} %{n}\n");
    });

    it("says where the name is once the edits are applied, for the rename after", () => {
      const at = (text: string, sub: string) => {
        const [a] = actions(text, sub);
        const out = apply(text, a?.edits ?? []).split("\n");
        const p = a?.rename as { line: number; character: number };
        return (out[p.line] ?? "").slice(p.character, p.character + 5);
      };
      expect(at("/def f = /echo $[a + 1]\n", "a + 1")).toBe("value");
      expect(at("/def f = /echo x%; $[a + 1]\n", "$[a + 1]")).toBe("value");
      expect(at(["/def f = \\", "    /echo a%;\\", "    /echo $[x + 1]", ""].join("\n"), "x + 1")).toBe("value");
    });

    it("skips a name another file mentions", () => {
      expect(extract("/def f = /echo $[a + 1]\n", "a + 1", 0, (n) => n === "value")).toBe("/def f = /let value2=%; /test value2:=(a + 1)%; /echo $[{value2}]\n");
    });
  });

  describe("what isn't one whole operand", () => {
    it("refuses a selection that cuts a token", () => {
      expect(reason("/def f = /echo $[alpha + 1]\n", "pha + 1")).toBe("The selection cuts alpha in two: select the whole of it.");
      expect(reason('/def f = /echo $[strlen("abc") + 1]\n', 'bc") + 1')).toMatch(/^The selection cuts "abc" in two/);
    });

    it("refuses one that splits a parenthesis", () => {
      expect(reason("/def f = /echo $[(a + b) * c]\n", "(a + b")).toBe("The selection has a parenthesis without its partner: select both, or neither.");
    });

    it("refuses one tf groups differently", () => {
      expect(reason("/def f = /echo $[a - b - c]\n", "b - c")).toMatch(/^The selection isn't one whole operand, as tf groups/);
      expect(reason("/def f = /echo $[a * b + c]\n", "b + c")).toMatch(/^The selection isn't one whole operand/);
    });

    it("refuses one that runs past its expression", () => {
      expect(reason("/def f = /echo $[a + b] c\n", "b] c")).toBe("The selection runs past the end of the expression it starts in: select part of one expression.");
    });
  });

  describe("what would change", () => {
    it("refuses side effects in the selection", () => {
      expect(reason("/def f = /echo $[(x := 2) + 1]\n", "(x := 2)")).toMatch(/^In the selection, x := 2 assigns a variable, and it would be evaluated earlier/);
      expect(reason("/def f = /echo $[++i * 2]\n", "++i")).toMatch(/^In the selection, \+\+i changes a variable/);
      expect(reason("/def f = /echo $[rand(6) + 1]\n", "rand(6)")).toMatch(/^In the selection, rand\(\) has side effects/);
      expect(reason("/def f = /echo $[mine(1) + 1]\n", "mine(1)")).toMatch(/^In the selection, mine\(\) isn't one of tf's functions, so it may be a macro/);
      expect(reason("/def f = /echo $[regmatch('a', x) + 1]\n", "regmatch('a', x)")).toMatch(/^In the selection, regmatch\(\) has side effects/);
    });

    it("refuses side effects in the rest of the statement", () => {
      expect(reason("/def f = /echo $[x := 1] $[x + 1]\n", "x + 1")).toMatch(/^Before the selection, x := 1 assigns a variable/);
      expect(reason("/def f = /if (++i + (j + 1) > 3) /echo y%; /endif%; /echo n\n", "j + 1")).toMatch(/^Before the selection, \+\+i changes/);
      expect(reason("/def f = /echo $(/foo) $[x + 1]\n", "x + 1")).toBe("The statement runs a $(...) before the selection, which would now be evaluated first: it can't be extracted.");
    });

    it("allows side effects the statement has after the selection, which come after it either way", () => {
      expect(extract("/def f = /test total := base + bonus * 2\n", "bonus * 2")).toBe("/def f = /let value=%; /test value:=(bonus * 2)%; /test total := base + {value}\n");
      expect(extract("/def f = /echo $[x + 1] $[y := 2] $(/echo z)\n", "x + 1")).toBe("/def f = /let value=%; /test value:=(x + 1)%; /echo $[{value}] $[y := 2] $(/echo z)\n");
      expect(extract('/def f = /test tfwrite(strcat("a", x + 1))\n', "x + 1")).toBe('/def f = /let value=%; /test value:=(x + 1)%; /test tfwrite(strcat("a", {value}))\n');
    });

    it("allows pure functions and ones that only read tf's state", () => {
      expect(extract('/def f = /echo $[strlen(toupper(name)) + columns()]\n', "strlen(toupper(name))")).toBe(
        "/def f = /let value=%; /test value:=(strlen(toupper(name)))%; /echo $[{value} + columns()]\n",
      );
    });

    it("refuses a call with the wrong number of arguments", () => {
      expect(reason("/def f = /echo $[strlen(a, b) + 1]\n", "strlen(a, b)")).toMatch(/^strlen\(\) has the wrong number of arguments/);
    });

    it("refuses what is only evaluated some of the time", () => {
      expect(reason("/def f = /if (ok & hp - 1) /echo y%; /endif%; /echo n\n", "hp - 1")).toMatch(/^The selection is on the right of &, which tf only evaluates some of the time/);
      expect(reason("/def f = /echo $[a | b + 1]\n", "b + 1")).toMatch(/^The selection is on the right of \|/);
      expect(reason("/def f = /echo $[a ?: b + 1]\n", "b + 1")).toMatch(/^The selection is in a branch of \?:/);
      expect(reason("/def f = /echo %{x-$[a + 1]}\n", "a + 1")).toMatch(/^The selection is in the default of a substitution/);
    });

    it("refuses a ? : in the selection, which crashes tf, and a , in a $[...] in command text", () => {
      expect(reason("/def f = /echo $[(a ? 1 : 2) + 1]\n", "(a ? 1 : 2)")).toMatch(/^The selection has a \? : in it, which crashes tf/);
      expect(reason("/def f = /echo $[(a, b + 1)]\n", "b + 1")).toMatch(/^tf mis-compiles the , in this \$\[\.\.\.\]/);
      expect(extract("/def f = /if ((a, b + 1)) /echo y%; /else /echo n%; /endif\n", "b + 1")).toBeDefined();
    });

    it("refuses a %, $ or \\ that the /test would substitute again", () => {
      expect(reason('/def f = /if (x =~ "50%%") /echo y%; /endif%; /echo n\n', 'x =~ "50%%"')).toMatch(/^The selection has a %, \$ or \\/);
      expect(reason('/def f = /echo $[strcat("a\\"b", x)]\n', 'strcat("a\\"b", x)')).toMatch(/^The selection has a %, \$ or \\/);
      expect(reason("/def f = /test %{n} * 2 + 1\n", "2 + 1")).toMatch(/^This text is substituted before tf evaluates it/);
    });

    it("refuses an /elseif or /while condition, and a condition list", () => {
      expect(reason("/def f = /while (i < n + 1) /test ++i%; /done\n", "n + 1")).toMatch(/^A \/while's condition is evaluated on every turn/);
      expect(reason("/def f = /if (a) /echo a%; /elseif (b + 1) /echo b%; /endif\n", "b + 1")).toMatch(/^An \/elseif's condition/);
      expect(reason("/def f = /if /test a + 1%; /then /echo y%; /endif\n", "a + 1")).toMatch(/^The selection is in an \/if or \/while condition list/);
    });

    it("refuses inside a $(...)", () => {
      expect(reason("/def f = /echo $(/echo $[a + 1])\n", "a + 1")).toMatch(/^The selection is inside a \$\(\.\.\.\)/);
    });

    it("refuses where %?, the last result, would be seen", () => {
      expect(reason("/def f = /echo %? $[a + 1]\n", "a + 1")).toMatch(/^This statement reads %\?, the last command's result/);
      expect(reason("/def f = /show $[a + 1]\n", "a + 1")).toMatch(/^This statement runs \/show, which can read %\?/);
      expect(reason("/def f = /if (a + 1) /show%; /endif%; /echo n\n", "a + 1")).toMatch(/^The first statement of a branch runs \/show/);
      expect(reason("/def f = /if (a + 1) /echo y%; /endif\n", "a + 1")).toMatch(/^When none of this \/if's branches runs, it leaves %\?/);
      expect(reason("/def f = /if (a + 1) /echo y%; /endif%; /echo %?\n", "a + 1")).toMatch(/^The statement after this \/if reads %\?/);
      expect(extract("/def f = /if (a + 1) /echo y%; /else /echo n%; /endif\n", "a + 1")).toBeDefined();
    });

    it("refuses whatis()'s argument, where a variable reads differently from a value", () => {
      expect(reason("/def f = /echo $[whatis(1 / 3.0)]\n", "1 / 3.0")).toMatch(/^whatis\(\) would see a variable/);
      expect(reason("/def f = /echo $[whatis((a, 1 / 3.0))]\n", "1 / 3.0")).toMatch(/^whatis\(\) would see a variable/);
      expect(extract("/def f = /echo $[whatis(1 / 3.0 + 1)]\n", "1 / 3.0")).toBe("/def f = /let value=%; /test value:=(1 / 3.0)%; /echo $[whatis({value} + 1)]\n");
    });

    it("refuses a variable tf assigns to, which {value} would replace with another", () => {
      const target = /^The selection is the variable this assigns to/;
      expect(reason("/def f = /test x := 5\n", "x")).toMatch(target);
      expect(reason("/def f = /test x += 2\n", "x")).toMatch(target);
      expect(reason("/def f = /test ++x\n", "x")).toMatch(target);
      expect(reason("/def f = /test --x\n", "x")).toMatch(target);
      expect(reason("/def f = /echo $[x := 7]\n", "x")).toMatch(target);
      expect(reason("/def f = /test (x) := 9\n", "(x)")).toMatch(target);
      expect(reason("/def f = /test (x) := 9\n", "x")).toMatch(target);
      expect(reason("/def f = /test tfread(fh, line)\n", "line")).toMatch(/^The selection is the variable tfread\(\) reads into/);
      expect(reason("/def f = /test tfread(line)\n", "line")).toMatch(/^The selection is the variable tfread\(\) reads into/);
      // The value assigned is fine, and so is tfread()'s handle.
      expect(extract("/def f = /test x := y + 1\n", "y + 1")).toBe("/def f = /let value=%; /test value:=(y + 1)%; /test x := {value}\n");
      expect(extract("/def f = /test tfread(fh + 0, line)\n", "fh + 0")).toBe("/def f = /let value=%; /test value:=(fh + 0)%; /test tfread({value}, line)\n");
    });

    it("refuses a statement tied to the one before by %|", () => {
      expect(reason("/def f = /echo a %| /echo $[x + 1]\n", "x + 1")).toMatch(/^A %\| or %\\ ties this statement/);
    });

    it("refuses a tab in the selection, and comment lines inside it", () => {
      expect(reason("/def f = /echo $[a +\tb]\n", "a +\tb")).toMatch(/^The selection has a tab in it/);
      expect(reason(["/def f = /echo $[a + \\", "; note", "    b]", ""].join("\n"), "a + \\\n; note\n    b")).toMatch(/^The selection has comment lines/);
    });
  });
});
