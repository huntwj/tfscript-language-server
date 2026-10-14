import { describe, expect, it } from "vitest";
import { getCodeActions, type Range, type TfTextEdit } from "../src/codeActions";
import { getDiagnostics } from "../src/diagnostics";

const WHOLE_FILE: Range = { start: { line: 0, character: 0 }, end: { line: 9999, character: 0 } };

function at(line: number, character: number): Range {
  return { start: { line, character }, end: { line, character } };
}

/** Applies single-line edits, last-first so earlier offsets stay valid. */
function applyEdits(text: string, edits: TfTextEdit[]): string {
  const lines = text.split("\n");
  const ordered = [...edits].sort(
    (a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character,
  );
  for (const edit of ordered) {
    const { start, end } = edit.range;
    const line = lines[start.line] ?? "";
    lines[start.line] = line.slice(0, start.character) + edit.newText + line.slice(end.character);
  }
  return lines.join("\n");
}

function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

describe("trailing-space-after-backslash", () => {
  const text = ["/def foo = \\ ", "  /echo one%; \\\t", "  /echo two", ""].join("\n");

  it("offers to strip the whitespace after each trailing backslash", () => {
    const actions = getCodeActions(text, WHOLE_FILE);
    expect(actions.map((a) => a.diagnostic.code)).toEqual([
      "trailing-space-after-backslash",
      "trailing-space-after-backslash",
    ]);
    expect(actions[0]?.title).toContain("whitespace");
  });

  it("produces a fix that makes the diagnostic go away and restores the continuation", () => {
    const fixed = applyEdits(text, getCodeActions(text, WHOLE_FILE).flatMap((a) => a.edits));
    expect(fixed).toBe(["/def foo = \\", "  /echo one%; \\", "  /echo two", ""].join("\n"));
    expect(codes(fixed)).toEqual([]);
  });

  it("keeps the backslash itself", () => {
    const [action] = getCodeActions("/echo a \\  \n", WHOLE_FILE);
    expect(action?.edits).toEqual([
      { range: { start: { line: 0, character: 9 }, end: { line: 0, character: 11 } }, newText: "" },
    ]);
  });

  it("does not offer a fix when the only trailing whitespace is a CRLF's \\r", () => {
    const crlf = ["/if (1) \\\r", "/echo yes%; \\\r", "/endif\r", ""].join("\n");
    expect(codes(crlf)).toContain("trailing-space-after-backslash");
    expect(getCodeActions(crlf, WHOLE_FILE)).toEqual([]);
  });
});

describe("load-no-expansion", () => {
  it("offers to prefix the command with /eval", () => {
    const text = ["/set d=/script", "/load %{d}/ok.tf", ""].join("\n");
    const [action] = getCodeActions(text, WHOLE_FILE);
    expect(action?.diagnostic.code).toBe("load-no-expansion");
    expect(action?.title).toContain("/eval");
    const fixed = applyEdits(text, action!.edits);
    expect(fixed).toBe(["/set d=/script", "/eval /load %{d}/ok.tf", ""].join("\n"));
    expect(codes(fixed)).toEqual([]);
  });

  it("inserts before the command even when the line is indented", () => {
    const text = "  /load %{d}/ok.tf\n";
    const [action] = getCodeActions(text, WHOLE_FILE);
    expect(applyEdits(text, action!.edits)).toBe("  /eval /load %{d}/ok.tf\n");
  });

  it("offers one fix per entry, not one per %{...}", () => {
    const text = "/load %{a}/%{b}/ok.tf\n/echo %{c}\n";
    const actions = getCodeActions(text, WHOLE_FILE);
    expect(actions.map((a) => a.edits[0]?.range.start.line)).toEqual([0, 1]);
  });

  it("inserts at the entry's first line when the %{...} is on a continuation line", () => {
    const text = ["/load \\", "  %{d}/ok.tf", ""].join("\n");
    const [action] = getCodeActions(text, WHOLE_FILE);
    expect(action?.edits[0]?.range.start).toEqual({ line: 0, character: 0 });
    expect(codes(applyEdits(text, action!.edits))).toEqual([]);
  });
});

describe("structural fixes", () => {
  // Each fix is the one the diagnostic's hover shows, and leaves the file clean.
  const cases: [string, string][] = [
    ["/def -i a = /if (1) /echo yes /else /echo no /endif", "/def -i a = /if (1) /echo yes%; /else /echo no%; /endif"],
    ["/def -i a = /if /test 1 /then /echo x%; /endif", "/def -i a = /if /test 1%; /then /echo x%; /endif"],
    ["/def -i a = /if (1) /echo a%; /endif /echo b", "/def -i a = /if (1) /echo a%; /endif%; /echo b"],
    ["/def -i a = /if (1) /echo a", "/def -i a = /if (1) /echo a%; /endif"],
    ["/def -i a = /while (0) /echo a ", "/def -i a = /while (0) /echo a%; /done "],
    ["/def -i a = /if (1) /then /echo x%; /endif", "/def -i a = /if (1) /echo x%; /endif"],
    ["/def -i a = /if (1)%; /echo a%; /endif", "/def -i a = /if (1) /echo a%; /endif"],
    ["/def -i a = /echo $[1 + 2", "/def -i a = /echo $[1 + 2]"],
    ["/def -i a = /echo $[1 + 2 %; /echo b", "/def -i a = /echo $[1 + 2] %; /echo b"],
    ["/def -i a = /echo $[(1+2]", "/def -i a = /echo $[(1+2)]"],
    ["/def -i a = /test (1 + 2", "/def -i a = /test (1 + 2)"],
    ["/def -i a = /test 1)", "/def -i a = /test 1"],
    ["/def -i a = /echo $(/echo x", "/def -i a = /echo $(/echo x)"],
    ["/def -i a = /echo ${foo", "/def -i a = /echo ${foo}"],
    ["/def -i a = /echo %{foo", "/def -i a = /echo %{foo}"],
    ["/def -i a = /echo %{target %{*}", "/def -i a = /echo %{target} %{*}"],
    ["/def -i a = /echo 50%-off", "/def -i a = /echo 50%%-off"],
    // Review findings: none of these may leave %%;, an empty statement, or a keyword glued on.
    ["/def -i a = /if (1) /echo 50%", "/def -i a = /if (1) /echo 50% %; /endif"],
    ["/def -i a = /if (1) /echo b%; ", "/def -i a = /if (1) /echo b%; /endif "],
    ["/def -i a = /if (1) /echo a%; /else%;/echo b%; /endif", "/def -i a = /if (1) /echo a%; /else /echo b%; /endif"],
    ["/def -i a = /if (1) /then%; /echo a%; /endif", "/def -i a = /if (1) /echo a%; /endif"],
    ["/def -i a = /if (1) /echo a\\ /endif", "/def -i a = /if (1) /echo a\\ %; /endif"],
    ["/def -i a = /if (1) /echo b /endif /echo c", "/def -i a = /if (1) /echo b%; /endif%; /echo c"],
    ["/def -i a = /echo $[(1+2", "/def -i a = /echo $[(1+2)]"],
    ["/def -i a = /if (1) /echo a%; /elseif (2) /then /echo b%; /endif", "/def -i a = /if (1) /echo a%; /elseif (2) /echo b%; /endif"],
  ];
  for (const [before, after] of cases) {
    it(`fixes ${before.slice(12)}`, () => {
      const actions = getCodeActions(`${before}\n`, WHOLE_FILE);
      expect(actions).toHaveLength(1);
      const fixed = applyEdits(`${before}\n`, actions[0]!.edits);
      expect(fixed).toBe(`${after}\n`);
      expect(codes(fixed)).toEqual([]);
    });
  }

  it("doesn't take a trailing %| for a separator, or a stray ) for the end of a $(...)", () => {
    const pipe = "/def a = /if (1) /echo b%|\n";
    expect(applyEdits(pipe, getCodeActions(pipe, WHOLE_FILE)[0]!.edits)).toBe("/def a = /if (1) /echo b%|%; /endif\n");
    const paren = "/def a = /if (1) /echo x /endif)\n";
    expect(applyEdits(paren, getCodeActions(paren, WHOLE_FILE)[0]!.edits)).toBe("/def a = /if (1) /echo x%; /endif%; )\n");
  });

  it("blames a second /then on the (condition) only when one comes straight before it", () => {
    const [list] = getDiagnostics("/def a = /if /test a%; /then /echo a%; /then /echo b%; /endif\n");
    expect(list?.message).toBe("This /then is inside the /if's body, where it doesn't belong: /then only ends a condition list.");
    expect(list?.fix).toBeUndefined();
    const [elseif] = getDiagnostics("/def a = /if (1) /echo a%; /elseif (2) /then /echo b%; /endif\n");
    expect(elseif?.message).toBe("This /then is not needed: the (condition) after /elseif already ends it.");
  });

  it("puts the %; on the right physical line of a continued body", () => {
    const text = ["/def -i a = \\", "    /if (1) \\", "        /echo yes \\", "    /else \\", "        /echo no \\", "    /endif", ""].join("\n");
    const fixed = applyEdits(text, getCodeActions(text, WHOLE_FILE)[0]!.edits);
    expect(fixed.split("\n").slice(2, 5)).toEqual(["        /echo yes%; \\", "    /else \\", "        /echo no%; \\"]);
    expect(codes(fixed)).toEqual([]);
  });
});

describe("range filtering", () => {
  const text = ["/load %{d}/one.tf", "/echo plain", "/echo x \\ ", ""].join("\n");

  it("returns only the fixes overlapping the requested range", () => {
    expect(getCodeActions(text, at(0, 8)).map((a) => a.diagnostic.code)).toEqual(["load-no-expansion"]);
    expect(getCodeActions(text, at(2, 9)).map((a) => a.diagnostic.code)).toEqual([
      "trailing-space-after-backslash",
    ]);
    expect(getCodeActions(text, at(1, 3))).toEqual([]);
  });

  it("matches a cursor sitting right at either end of the diagnostic", () => {
    expect(getCodeActions(text, at(0, 6))).toHaveLength(1);
    expect(getCodeActions(text, at(0, 10))).toHaveLength(1);
    expect(getCodeActions(text, at(0, 11))).toHaveLength(0);
  });

  it("offers nothing for diagnostics without a mechanical fix", () => {
    const unfixable = ["/if (1)", "  /echo yes", "/endif", ""].join("\n");
    expect(codes(unfixable)).toContain("if-multiline-top-level");
    expect(getCodeActions(unfixable, WHOLE_FILE)).toEqual([]);
  });
});
