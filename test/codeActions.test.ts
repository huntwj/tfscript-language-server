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
    expect(elseif?.message).toBe("This /then can't follow a (condition): the condition after /elseif already ends it.");
  });

  it("puts the %; on the right physical line of a continued body", () => {
    const text = ["/def -i a = \\", "    /if (1) \\", "        /echo yes \\", "    /else \\", "        /echo no \\", "    /endif", ""].join("\n");
    const fixed = applyEdits(text, getCodeActions(text, WHOLE_FILE)[0]!.edits);
    expect(fixed.split("\n").slice(2, 5)).toEqual(["        /echo yes%; \\", "    /else \\", "        /echo no%; \\"]);
    expect(codes(fixed)).toEqual([]);
  });
});

describe("rule fixes", () => {
  // [code, before, after]: the one fix offered for `code`, which leaves the file clean.
  const cases: [string, string[], string[]][] = [
    ["dollar-bracket-in-if", ["/def -i a = /if ($[x]) /echo y%; /endif"], ["/def -i a = /if (x) /echo y%; /endif"]],
    ["dollar-bracket-in-if", ["/def -i a = /if ($[1+1] * 3 == 6) /echo y%; /endif"], ["/def -i a = /if ((1+1) * 3 == 6) /echo y%; /endif"]],
    ["dollar-bracket-in-if", ['/def -i a = /while ($["]"] =~ "]") /echo y%; /done'], ['/def -i a = /while (("]") =~ "]") /echo y%; /done']],
    ["let-swallows-endif", ["/def -i a = /if (1) /let x=1 /endif"], ["/def -i a = /if (1) /let x=1%; /endif"]],
    ["let-swallows-endif", ["/def -i a = /if (1) /set x=1 /endif /echo b"], ["/def -i a = /if (1) /set x=1%; /endif%; /echo b"]],
    ["let-swallows-endif", ["/def -i a = /let x=50% /if (1) /echo%; /endif"], ["/def -i a = /let x=50% %; /if (1) /echo%; /endif"]],
    ["let-swallows-endif", ["/if (1) /let x=1 /endif"], ["/if (1) /let x=1%; /endif"]],
    // No second %; where the statement ends anyway: the ) of a $(...), or %\ (proven live: one sends a blank line).
    ["let-swallows-endif", ["/def -i lf = /echo [$(/if (1) /let x=7 /endif)] x=%x"], ["/def -i lf = /echo [$(/if (1) /let x=7%; /endif)] x=%x"]],
    ["let-swallows-endif", ["/def -i lh = /if (1) /let x=8 /endif%\\ /echo lh x=%x"], ["/def -i lh = /if (1) /let x=8%; /endif%\\ /echo lh x=%x"]],
    // Only the first swallowed /endif can close the /if, so only it gets a fix.
    [
      "let-swallows-endif",
      ["/def -i ld = /if (1) /let x=4 /endif%; /let z=5 /endif%; /echo ld x=%x z=%z"],
      ["/def -i ld = /if (1) /let x=4%; /endif%; /let z=5 /endif%; /echo ld x=%x z=%z"],
    ],
    ["bare-line-after-command", ["hello world", "/echo x"], ["; hello world", "/echo x"]],
    ["bare-line-after-command", ["hello \\", "  world", "/echo x"], ["; hello \\", "  ; world", "/echo x"]],
    // Proven live: tf aborts at a line starting with a byte order mark, even before a /.
    ["bare-line-after-command", ["/echo x", "\uFEFF/echo hi", "/echo y"], ["/echo x", "/echo hi", "/echo y"]],
    ["bare-line-after-command", ["/echo x", "\uFEFF; a note", "/echo y"], ["/echo x", "; a note", "/echo y"]],
    // Without the mark the line still wouldn't be a command, so it is commented out, mark and all.
    ["bare-line-after-command", ["/echo x", "\uFEFFhello", "/echo y"], ["/echo x", "; \uFEFFhello", "/echo y"]],
    ["if-multiline-top-level", ["/if (1)", "  /echo yes", "/endif"], ["/if (1) \\", "  /echo yes%; \\", "/endif"]],
    [
      "if-multiline-top-level",
      ["/if (1)", "    /echo yes", "/else", "    /echo no", "/endif"],
      ["/if (1) \\", "    /echo yes%; \\", "/else \\", "    /echo no%; \\", "/endif"],
    ],
    ["if-multiline-top-level", ["/if (1)", "; a note", "  /echo yes", "/endif"], ["/if (1) \\", "; a note", "  /echo yes%; \\", "/endif"]],
    ["block-structure", ["/if /test 1", "/then /echo x", "/endif"], ["/if /test 1%; \\", "/then /echo x%; \\", "/endif"]],
    ["block-structure", ["/while (i < 3)", "  /test ++i", "/done"], ["/while (i < 3) \\", "  /test ++i%; \\", "/done"]],
    ["block-structure", ["/while /test i < 3", "/do /test ++i", "/done"], ["/while /test i < 3%; \\", "/do /test ++i%; \\", "/done"]],
    ["if-multiline-top-level", ["/if (1) /echo 50%", "/endif"], ["/if (1) /echo 50% %; \\", "/endif"]],
    ["indented-line-after-command", ["/def -i a = /echo one", "    /echo two"], ["/def -i a = /echo one%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /echo one%;", "    /echo two"], ["/def -i a = /echo one%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a =", "    /echo two"], ["/def -i a = \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /if (1)", "    /echo yes", "/endif"], ["/def -i a = /if (1) \\", "    /echo yes%; \\", "/endif"]],
    ["indented-line-after-command", ["/set x=1", "  /set y=2"], ["/set x=1", "/set y=2"]],
    // Only a real separator counts (proven live): =, %%; and \%; at the end of a body line are text.
    ["if-multiline-top-level", ["/if (1)", "  /set x=", "  /echo y", "/endif"], ["/if (1) \\", "  /set x=%; \\", "  /echo y%; \\", "/endif"]],
    ["indented-line-after-command", ["/def -i a = /echo 100%%;", "    /echo two"], ["/def -i a = /echo 100%%;%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /echo a\\%;", "    /echo two"], ["/def -i a = /echo a\\%;%; \\", "    /echo two"]],
    // A run of indented lines continues the /def above them as a whole, not just the first.
    [
      "indented-line-after-command",
      ["/def -i a = /echo one", "    /echo two", "    /echo three"],
      ["/def -i a = /echo one%; \\", "    /echo two%; \\", "    /echo three"],
    ],
    // Proven live in a /def body: \\%; and \%%; separate (\ escapes one character), \\\%; is text.
    ["indented-line-after-command", ["/def -i a = /echo a\\\\%;", "    /echo two"], ["/def -i a = /echo a\\\\%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /echo pct\\%%;", "    /echo two"], ["/def -i a = /echo pct\\%%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /echo a\\\\\\%;", "    /echo two"], ["/def -i a = /echo a\\\\\\%;%; \\", "    /echo two"]],
    // A top-level line does no \ processing, so there \%; does separate, and \%%; doesn't.
    ["if-multiline-top-level", ["/if (1)", "  /echo a\\%;", "  /echo b", "/endif"], ["/if (1) \\", "  /echo a\\%; \\", "  /echo b%; \\", "/endif"]],
    ["if-multiline-top-level", ["/if (1)", "  /echo a\\%%;", "  /echo b", "/endif"], ["/if (1) \\", "  /echo a\\%%;%; \\", "  /echo b%; \\", "/endif"]],
  ];
  for (const [code, before, after] of cases) {
    it(`${code}: ${before.join(" | ")}`, () => {
      const text = `${before.join("\n")}\n`;
      // Several diagnostics can share one fix; the action is offered once, under the first of them.
      const fixes = new Set(getDiagnostics(text).flatMap((d) => (d.code === code && d.fix ? [JSON.stringify(d.fix.edits)] : [])));
      expect(fixes.size).toBe(1);
      const actions = getCodeActions(text, WHOLE_FILE).filter((a) => fixes.has(JSON.stringify(a.edits)));
      expect(actions).toHaveLength(1);
      const fixed = applyEdits(text, actions[0]!.edits);
      expect(fixed).toBe(`${after.join("\n")}\n`);
      expect(codes(fixed)).toEqual([]);
    });
  }

  it("offers the /if's fix once, for the indented lines inside it too", () => {
    const text = ["/if (1)", "    /echo yes", "/else", "    /echo no", "/endif", ""].join("\n");
    expect(getCodeActions(text, WHOLE_FILE).map((a) => a.title)).toEqual(["Join the /if's lines with \\"]);
    for (const line of [1, 2, 3, 4]) expect(getCodeActions(text, at(line, 2)).map((a) => a.title)).toEqual(["Join the /if's lines with \\"]);
  });

  it("drops the add-an-/endif fix when joining the lines brings in the real one", () => {
    const text = ["/def -i a = /if (1)", "    /echo yes", "/endif", ""].join("\n");
    expect(getCodeActions(text, WHOLE_FILE).map((a) => a.title)).toEqual(["Join these lines with \\"]);
  });

  it("doesn't close a block whose body is empty, which would send a blank line or loop forever", () => {
    const top = ["/while (1)", "  /echo x", ""].join("\n");
    expect(getCodeActions(top, WHOLE_FILE).map((a) => a.title)).not.toContain("Add %; /done at the end of the line");
    for (const body of ["/def a = /if (1)\n", "/def a = /while (1)\n", "/def a = /if (1) /echo a%; /else\n", "/def a = /if /test 1%; /then\n"]) {
      expect(getCodeActions(body, WHOLE_FILE).filter((a) => a.title.startsWith("Add %; /"))).toEqual([]);
    }
    expect(getCodeActions("/def a = /while (1) /echo x\n", WHOLE_FILE).map((a) => a.title)).toEqual(["Add %; /done at the end of the body"]);
  });

  it("leaves a macro clean with every let-swallows-endif fix applied at once", () => {
    for (const text of [
      "/def -i ld = /if (1) /let x=4 /endif%; /let z=5 /endif%; /echo ld x=%x z=%z\n",
      "/def -i lb = /set y=2 /let x=1 /endif /if (1) /echo%; /endif\n",
      "/def -i lc = /let a=1 /let b=2 /if (1) /echo%; /endif\n",
      "/def -i le = /if (1) /let x=1 /endif%; /if (2) /set y=2 /endif%; /echo\n",
      // After an /else or /elseif a %; before the swallowed /endif would leave that one stray (proven live).
      "/def -i e1 = /if (1) /let x=1 /endif%; /else /echo e\n",
      "/def -i e2 = /if (1) /let x=1 /endif%; /elseif (0) /echo e\n",
      "/def -i e3 = /if (0) /echo a%; /else /let x=1 /endif\n",
      // The /if is unclosed even though the block left open at the end is a /while.
      "/def -i w1 = /if (1) /let x=1 /endif%; /while (0) /echo y\n",
    ]) {
      const fixed = applyEdits(text, getCodeActions(text, WHOLE_FILE).flatMap((a) => a.edits));
      expect(codes(fixed), fixed).toEqual([]);
    }
  });

  it("gives every line of an indented run the same fix", () => {
    const text = ["/def -i a = /echo one", "    /echo two", "    /echo three", "    /echo four", ""].join("\n");
    for (const line of [1, 2, 3]) expect(getCodeActions(text, at(line, 2)).map((a) => a.title)).toEqual(["Join these lines with \\"]);
  });

  it("keeps the cost of trying joins local to each diagnostic", () => {
    // Nothing here ever closes, so none of these /ifs can be joined; the good one at the end still is.
    const lines = Array.from({ length: 300 }, (_, i) => ["/if (x)", "    /echo one", "    /echo two"][i % 3] as string);
    const text = [...lines, "/if (1)", "  /echo ok", "/endif", ""].join("\n");
    const good = getDiagnostics(text).find((d) => d.code === "if-multiline-top-level" && d.range.start.line === 300);
    expect(good?.fix?.title).toBe("Join the /if's lines with \\");
  });

  it("bounds the cost of trying joins over a whole file", () => {
    // Every line holds an /endif or /done, so every join has candidates to try.
    const lines = Array.from({ length: 3000 }, (_, i) => ["/while (1)", "  /if (x) /echo /done", "  /echo /endif"][i % 3] as string);
    const start = Date.now();
    getCodeActions(`${lines.join("\n")}\n`, WHOLE_FILE);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("continues a line of text without a %;", () => {
    const text = ["/def -i a = /echo one", "    two", "/echo x", ""].join("\n");
    const [action] = getCodeActions(text, WHOLE_FILE).filter((a) => a.diagnostic.code === "indented-line-after-command");
    expect(applyEdits(text, action!.edits)).toBe(["/def -i a = /echo one \\", "    two", "/echo x", ""].join("\n"));
  });

  it("offers no fix where a %; would only be text, or on a CRLF line", () => {
    expect(getCodeActions("/set v=1 /if (1) /echo%; /endif\n", WHOLE_FILE)).toEqual([]);
    const crlf = ["/def -i a = /echo one\r", "    /echo two\r", ""].join("\n");
    expect(codes(crlf)).toContain("indented-line-after-command");
    expect(getCodeActions(crlf, WHOLE_FILE)).toEqual([]);
  });

  it("leaves a \\ followed by whitespace to the trailing-space fix", () => {
    const text = ["/def -i a = /echo one%; \\ ", "    /echo two", ""].join("\n");
    expect(getCodeActions(text, WHOLE_FILE).map((a) => a.diagnostic.code)).toEqual(["trailing-space-after-backslash"]);
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
    const unfixable = "/def f = /echo %{foo%{bar}}\n";
    expect(codes(unfixable)).toContain("bad-substitution-selector");
    expect(getCodeActions(unfixable, WHOLE_FILE)).toEqual([]);
  });
});

describe("diagnostics from the workspace", () => {
  it("offers the fixes of the diagnostics it is given, such as the load-path ones the server adds", () => {
    const text = "/def a = /helpr\n";
    const edit = { range: { start: { line: 0, character: 10 }, end: { line: 0, character: 15 } }, newText: "helper" };
    const workspace = [{ range: edit.range, message: "x", code: "undefined-macro", severity: "warning" as const, fix: { title: "Change to /helper", edits: [edit] } }];
    expect(getCodeActions(text, WHOLE_FILE, workspace).map((a) => a.title)).toEqual(["Change to /helper"]);
    expect(getCodeActions(text, WHOLE_FILE)).toEqual([]);
  });
});
