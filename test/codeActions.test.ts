import { describe, expect, it } from "vitest";
import { getCodeActions, routeCodeActions, toLspCodeAction, type Range, type TfTextEdit } from "../src/codeActions";
import { getDiagnostics } from "../src/diagnostics";
import { timeBudget } from "./timeBudget";

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

describe("backslash-not-last", () => {
  const text = ["/def foo = \\ ", "  /echo one%; \\\t", "  /echo two", ""].join("\n");

  it("offers to strip the whitespace after each trailing backslash", () => {
    const actions = getCodeActions(text, WHOLE_FILE);
    expect(actions.map((a) => a.diagnostic.code)).toEqual([
      "backslash-not-last",
      "backslash-not-last",
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
    expect(codes(crlf)).toContain("backslash-not-last");
    expect(getCodeActions(crlf, WHOLE_FILE)).toEqual([]);
  });
});

describe("not-substituted-here", () => {
  it("offers to prefix the command with /eval", () => {
    const text = ["/set d=/script", "/load %{d}/ok.tf", ""].join("\n");
    const [action] = getCodeActions(text, WHOLE_FILE);
    expect(action?.diagnostic.code).toBe("not-substituted-here");
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
    // A %; before the /endif and after it makes the ) a statement, sent to the world as text in a
    // body is: offered all the same (policy, 2026-10-15).
    const paren = "/def a = /if (1) /echo x /endif)\n";
    expect(applyEdits(paren, getCodeActions(paren, WHOLE_FILE)[0]!.edits)).toBe("/def a = /if (1) /echo x%; /endif%; )\n");
  });

  // rev-s4b g08, g14: with a %; the text is a statement, sent to the world as text in a body is,
  // and the fix is offered all the same (policy, 2026-10-15).
  // rev-s4e r1, proven in tf: appended after the CR, "%; /endif" follows a \ that escapes it, and
  // tf says "endif: no such command or macro". backslash-not-last's advice (save with LF) is the fix.
  it("adds no closer after a \\ a CR or whitespace cuts off", () => {
    for (const text of ["/def g = /if (1) /echo a%; /endif\\\r\n/g\r\n", "/def g = /if (1) /echo a%; /endif\\ \n/g\n"]) {
      const block = getDiagnostics(text).find((d) => d.code === "block-structure");
      expect(block?.message, JSON.stringify(text)).toBe("This /if has no /endif.");
      expect(block?.fix, JSON.stringify(text)).toBeUndefined();
    }
  });

  it("puts %; after an /endif before a command or text", () => {
    for (const text of ["/def a = /if (1) /echo x%; /endif)\n", '/def a = /if (1) /echo x%; /endif "x"\n', "/def a = /if (1) /echo x%; /endif /echo y\n"]) {
      const [d] = getDiagnostics(text);
      expect(d?.message, text).toBe("Text after /endif needs a %; before it.");
      expect(d?.fix?.title, text).toBe("Put %; before it");
    }
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
    ["substitution-in-expression", ["/def -i a = /if ($[x]) /echo y%; /endif"], ["/def -i a = /if (x) /echo y%; /endif"]],
    ["substitution-in-expression", ["/def -i a = /if ($[1+1] * 3 == 6) /echo y%; /endif"], ["/def -i a = /if ((1+1) * 3 == 6) /echo y%; /endif"]],
    ["substitution-in-expression", ['/def -i a = /while ($["]"] =~ "]") /echo y%; /done'], ['/def -i a = /while (("]") =~ "]") /echo y%; /done']],
    // Proven live (scratchpad a.tf): each fix leaves tf's output as it was, without the warning.
    ["substitution-in-expression", ["/test echo($[1+1])"], ["/test echo((1+1))"]],
    ["substitution-in-expression", ["/def -i a = /echo $[1 + $[2]]"], ["/def -i a = /echo $[1 + (2)]"]],
    ["substitution-in-expression", ["/def -i a = /if (%{x} == 5) /echo y%; /endif"], ["/def -i a = /if ({x} == 5) /echo y%; /endif"]],
    ["substitution-in-expression", ["/def -i a = /if (%x == 5) /echo y%; /endif"], ["/def -i a = /if ({x} == 5) /echo y%; /endif"]],
    ["substitution-in-expression", ["/def -i a = /if (%-1 =~ '') /echo y%; /endif"], ["/def -i a = /if ({-1} =~ '') /echo y%; /endif"]],
    ["substitution-in-expression", ["/def -i a = /if (%{n-7} == 7) /echo y%; /endif"], ["/def -i a = /if ({n-7} == 7) /echo y%; /endif"]],
    ["keyword-mid-statement", ["/def -i a = /if (1) /let x=1 /endif"], ["/def -i a = /if (1) /let x=1%; /endif"]],
    ["keyword-mid-statement", ["/def -i a = /if (1) /set x=1 /endif /echo b"], ["/def -i a = /if (1) /set x=1%; /endif%; /echo b"]],
    ["keyword-mid-statement", ["/def -i a = /let x=50% /if (1) /echo%; /endif"], ["/def -i a = /let x=50% %; /if (1) /echo%; /endif"]],
    ["keyword-mid-statement", ["/if (1) /let x=1 /endif"], ["/if (1) /let x=1%; /endif"]],
    // No second %; where the statement ends anyway: the ) of a $(...), or %\ (proven live: one sends a blank line).
    ["keyword-mid-statement", ["/def -i lf = /echo [$(/if (1) /let x=7 /endif)] x=%x"], ["/def -i lf = /echo [$(/if (1) /let x=7%; /endif)] x=%x"]],
    ["keyword-mid-statement", ["/def -i lh = /if (1) /let x=8 /endif%\\ /echo lh x=%x"], ["/def -i lh = /if (1) /let x=8%; /endif%\\ /echo lh x=%x"]],
    // Only the first swallowed /endif can close the /if, so only it gets a fix.
    [
      "keyword-mid-statement",
      ["/def -i ld = /if (1) /let x=4 /endif%; /let z=5 /endif%; /echo ld x=%x z=%z"],
      ["/def -i ld = /if (1) /let x=4%; /endif%; /let z=5 /endif%; /echo ld x=%x z=%z"],
    ],
    ["not-a-command", ["hello world", "/echo x"], ["; hello world", "/echo x"]],
    ["not-a-command", ["hello \\", "  world", "/echo x"], ["; hello \\", "  ; world", "/echo x"]],
    // Proven live: tf aborts at a line starting with a byte order mark, even before a /.
    ["not-a-command", ["/echo x", "\uFEFF/echo hi", "/echo y"], ["/echo x", "/echo hi", "/echo y"]],
    ["not-a-command", ["/echo x", "\uFEFF; a note", "/echo y"], ["/echo x", "; a note", "/echo y"]],
    // Without the mark the line still wouldn't be a command, so it is commented out, mark and all.
    ["not-a-command", ["/echo x", "\uFEFFhello", "/echo y"], ["/echo x", "; \uFEFFhello", "/echo y"]],
    ["missing-continuation", ["/if (1)", "  /echo yes", "/endif"], ["/if (1) \\", "  /echo yes%; \\", "/endif"]],
    [
      "missing-continuation",
      ["/if (1)", "    /echo yes", "/else", "    /echo no", "/endif"],
      ["/if (1) \\", "    /echo yes%; \\", "/else \\", "    /echo no%; \\", "/endif"],
    ],
    ["missing-continuation", ["/if (1)", "; a note", "  /echo yes", "/endif"], ["/if (1) \\", "; a note", "  /echo yes%; \\", "/endif"]],
    ["missing-continuation", ["/if /test 1", "/then /echo x", "/endif"], ["/if /test 1%; \\", "/then /echo x%; \\", "/endif"]],
    ["missing-continuation", ["/while (i < 3)", "  /test ++i", "/done"], ["/while (i < 3) \\", "  /test ++i%; \\", "/done"]],
    ["missing-continuation", ["/while /test i < 3", "/do /test ++i", "/done"], ["/while /test i < 3%; \\", "/do /test ++i%; \\", "/done"]],
    ["missing-continuation", ["/if (1) /echo 50%", "/endif"], ["/if (1) /echo 50% %; \\", "/endif"]],
    ["indented-line-after-command", ["/def -i a = /echo one", "    /echo two"], ["/def -i a = /echo one%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /echo one%;", "    /echo two"], ["/def -i a = /echo one%; \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a =", "    /echo two"], ["/def -i a = \\", "    /echo two"]],
    ["indented-line-after-command", ["/def -i a = /if (1)", "    /echo yes", "/endif"], ["/def -i a = /if (1) \\", "    /echo yes%; \\", "/endif"]],
    ["indented-line-after-command", ["/set x=1", "  /set y=2"], ["/set x=1", "/set y=2"]],
    // After a top-level block that already ends with /endif or /done, a join would run the line
    // after the block whatever it decides (/else's body unconditionally, or /while (i < 3) /done,
    // which never ends): proven in tf dev, 2026-10-14. So the indentation is what goes.
    [
      "indented-line-after-command",
      ["/if (0) \\", "    /echo % a%; \\", "/else /endif", "    /echo % b", "/echo % after"],
      ["/if (0) \\", "    /echo % a%; \\", "/else /endif", "/echo % b", "/echo % after"],
    ],
    [
      "indented-line-after-command",
      ["/set i=0", "/while (i < 3) \\", "/done", "    /test ++i", "/echo % i"],
      ["/set i=0", "/while (i < 3) \\", "/done", "/test ++i", "/echo % i"],
    ],
    // Only a real separator counts (proven live): =, %%; and \%; at the end of a body line are text.
    ["missing-continuation", ["/if (1)", "  /set x=", "  /echo y", "/endif"], ["/if (1) \\", "  /set x=%; \\", "  /echo y%; \\", "/endif"]],
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
    // (A line with a %; or a %% of its own is joined into a top-level /if no more: see "refuses a
    // join that changes what a line means".)
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

  it("counts a block ending in /endif%; or /done%; as closed too, and joins nothing onto it", () => {
    // v01, v03, v04, v05 (tf dev, 2026-10-14): joined on, the lines run after the block whatever it decides.
    // v06: after %| tf reports "Piping output of a special command" for the joined line.
    for (const first of ["/if (0) /echo % a%; /endif%;", "/while (0) /echo % a%; /done%;", "/if (0) /echo % a%; /endif %;", "/if (0) /echo % a%; /endif%|"]) {
      const text = `${first}\n    /echo % b\n/echo % after\n`;
      const d = getDiagnostics(text).find((x) => x.code === "indented-line-after-command");
      expect(d?.fix?.title).toBe("Remove the indentation");
    }
  });

  it("offers nothing for an indented line of text after a top-level block that ends with /endif", () => {
    // r51, r35 (tf dev, 2026-10-14): joined, the text is sent to the world whatever the /if decides;
    // unindented, it aborts the load.
    for (const text of ["/if (0) /echo % a%; /endif\n    b\n/echo % after\n", "/if (1) /echo % a%; /endif\n    more text\n/echo % after\n"]) {
      const d = getDiagnostics(text).find((x) => x.code === "indented-line-after-command");
      expect(d).toBeDefined();
      expect(d?.fix).toBeUndefined();
    }
  });

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

  it("leaves a macro clean with the keyword-mid-statement fixes applied round by round", () => {
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
      // tf stops at the first error, so each round's fix shows the next one, as it would to a user.
      let fixed = text;
      for (let round = 0; round < 6; round += 1) {
        const edits = getCodeActions(fixed, WHOLE_FILE).flatMap((a) => a.edits);
        if (edits.length === 0) break;
        fixed = applyEdits(fixed, edits);
      }
      // A swallowed /endif ahead of an /else stays a warning: tf runs it, as text in x's value.
      expect(getDiagnostics(fixed).filter((d) => d.severity === "error").map((d) => d.code), fixed).toEqual([]);
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
    const good = getDiagnostics(text).find((d) => d.code === "missing-continuation" && d.range.start.line === 300);
    expect(good?.fix?.title).toBe("Join the /if's lines with \\");
  });

  it("bounds the cost of trying joins over a whole file", () => {
    // Every line holds an /endif or /done, so every join has candidates to try.
    const lines = Array.from({ length: 3000 }, (_, i) => ["/while (1)", "  /if (x) /echo /done", "  /echo /endif"][i % 3] as string);
    const start = Date.now();
    getCodeActions(`${lines.join("\n")}\n`, WHOLE_FILE);
    expect(Date.now() - start).toBeLessThan(timeBudget(1000));
  });

  it("still joins a macro body's line with a %; of its own, which keeps its meaning in the body", () => {
    // e30 (tf dev, 2026-10-14): joined, the /def's /if runs its /else and prints "b".
    const e30 = ["/def f = \\", "    /if (0) \\", "        /echo % a%; \\", "    /else", "        /echo % b%; \\", "    /endif", "/f", ""].join("\n");
    const fix = getCodeActions(e30, WHOLE_FILE).find((a) => a.title === "End line 4 with \\");
    expect(applyEdits(e30, fix!.edits)).toBe(["/def f = \\", "    /if (0) \\", "        /echo % a%; \\", "    /else \\", "        /echo % b%; \\", "    /endif", "/f", ""].join("\n"));
    // e37: the second line's two commands become the body's; tf then prints a, b and c from /f.
    const e37 = ["/def f = /echo % a", "    /echo % b%; /echo % c", "/f", ""].join("\n");
    expect(getCodeActions(e37, WHOLE_FILE).map((a) => a.title)).toContain("End line 1 with \\");
    // f10: an inner /def written with %%; for its own separator joins, and tf prints h1 and h2 from /g.
    const f10 = ["/def f = /echo % f10a", "    /def g = /echo % h1%%; /echo % h2", "/f", "/g", ""].join("\n");
    expect(getCodeActions(f10, WHOLE_FILE).map((a) => a.title)).toContain("End line 1 with \\");
  });

  it("writes no %; after a /do or /then that ends a line, which would send a blank line", () => {
    // s10, s96 (tf dev, 2026-10-14): the joined loop runs, with no blank line sent.
    const s96 = ["/if /test 1", "/then", "    /echo % a", "/endif", "/echo % after", ""].join("\n");
    const [then] = getCodeActions(s96, WHOLE_FILE);
    expect(applyEdits(s96, then!.edits)).toBe(["/if /test 1%; \\", "/then \\", "    /echo % a%; \\", "/endif", "/echo % after", ""].join("\n"));
    const s10 = ["/set i=0", "/while /test i < 3", "/do", "    /test ++i", "/done", ""].join("\n");
    const loop = getCodeActions(s10, WHOLE_FILE).find((a) => a.title === "Join the /while's lines with \\");
    expect(applyEdits(s10, loop!.edits)).toBe(["/set i=0", "/while /test i < 3%; \\", "/do \\", "    /test ++i%; \\", "/done", ""].join("\n"));
  });

  it("refuses a join that changes what a line means", () => {
    // tf dev, 2026-10-14 (the fourth review's probes): a line's own %; (in a /def body, or as text
    // on a plain line) would split the block's statements instead (u01, u02, u06, u07); a line of
    // text would become the previous command's arguments (x01, x02, x04, and a /def body's).
    const joins = (lines: string[]) =>
      getCodeActions(`${lines.join("\n")}\n`, WHOLE_FILE).filter((a) => /^(?:Join|End line)/.test(a.title)).map((a) => a.title);
    for (const shape of [
      ["/if (1)", "    /def foo = /echo % x%; /echo % y", "/foo"],
      ["/if (1)", "    /def foo = /echo % x%; /echo % y", "/endif", "/foo"],
      ["/if (1)", "    /set v=1%; /echo % set", "/echo % after"],
      ["/if (1)", '    /def -t"x*" trig = /echo % t1%; /echo % t2', "/echo % after"],
      ["/if (1)", "  /echo a\\%;", "  /echo b", "/endif"],
      ["/if (1)", "    /echo % a", "    say hello", "/endif"],
      ["/if (1)", "    /echo % a", "    say hello", "/echo % after"],
      ["/while (0)", "    /echo % a", "    north", "/done"],
      ["/def -i a = /echo one", "    two", "/echo x"],
      // f09, f13, f14, f15: an inner /def's or /repeat's %; would end the outer body's statement,
      // and the inner body would lose its second command.
      ["/def f = /echo % f09a", "    /def g = /echo % g1%; /echo % g2", "/g"],
      // p01-p03: /edit, /gag and /hilite store their = body as a macro body too.
      ["/def g = /echo % p01old", "/def f = /echo % p01a", "    /edit g = /echo % p01g1%; /echo % p01g2", "/f"],
      ["/def f = /echo % p02a", "    /gag p02zz = /echo % p02g1%; /echo % p02g2", "/f"],
      ["/def f = /echo % p03a", "    /hilite p03zz = /echo % p03h1%; /echo % p03h2", "/f"],
      ["/def f = /echo % f13a", "    /repeat -0 1 /echo % f13r1%; /echo % f13r2", "/f"],
      ["/def f = /echo % f14a", "    /def -i g = /echo % f14g1%; /echo % f14g2", "/g"],
      ["/def f = \\", "    /echo % f15a", "        /def g = /echo % f15g1%; /echo % f15g2", "/g"],
      // f07: one separator either way, but in different places (\%; read without \ processing,
      // \%%; with it); f03: a \%; that separates only without it.
      ["/def f = /echo % f07a", "    /echo % f07b p\\%; q\\%%; /echo % f07c", "/f"],
      ["/def f = /echo % f03a", "    /echo % f03b a\\%;b", "/f"],
      // e06: in a body \%%; separates (the \ takes one %), though the line reads as text; ambiguous.
      ["/def foo = /echo % x", "    /echo % a\\%%;/echo % b", "/foo"],
      // A %% joined into a top-level /if loses one %: k05, e03, e04, e08, e09, e40, e41.
      ["/if (1)", "    /echo % a%%;b", "/echo % after"],
      ["/if (1)", "    /echo % a%%%;b", "/echo % after"],
      ["/if (1)", "    /echo % a\\%%;/echo % b", "/echo % after"],
      ["/if (1)", "    /def foo = /echo % x%%; /echo % y", "/foo"],
      ["/if (1)", "    /def foo = /echo % x%%; /echo % y", "/endif", "/foo"],
      ["/set i=0", "/while (i < 1)", "    /test ++i", "    /def bar = /echo % p%%; /echo % q", "/bar"],
    ]) {
      expect(joins(shape)).toEqual([]);
    }
  });

  it("offers no fix where a %; would only be text, or on a CRLF line", () => {
    expect(getCodeActions("/set v=1 /if (1) /echo%; /endif\n", WHOLE_FILE)).toEqual([]);
    const crlf = ["/def -i a = /echo one\r", "    /echo two\r", ""].join("\n");
    expect(codes(crlf)).toContain("indented-line-after-command");
    expect(getCodeActions(crlf, WHOLE_FILE)).toEqual([]);
  });

  it("leaves a \\ followed by whitespace to the trailing-space fix", () => {
    const text = ["/def -i a = /echo one%; \\ ", "    /echo two", ""].join("\n");
    expect(getCodeActions(text, WHOLE_FILE).map((a) => a.diagnostic.code)).toEqual(["backslash-not-last"]);
  });
});

describe("range filtering", () => {
  const text = ["/load %{d}/one.tf", "/echo plain", "/echo x \\ ", ""].join("\n");

  it("returns only the fixes overlapping the requested range", () => {
    expect(getCodeActions(text, at(0, 8)).map((a) => a.diagnostic.code)).toEqual(["not-substituted-here"]);
    expect(getCodeActions(text, at(2, 9)).map((a) => a.diagnostic.code)).toEqual([
      "backslash-not-last",
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
    expect(codes(unfixable)).toContain("substitution-syntax");
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

describe("preferred fixes", () => {
  const whole = { start: { line: 0, character: 0 }, end: { line: 99, character: 0 } };
  const lsp = (text: string) => routeCodeActions(text, { range: whole, only: ["quickfix"] }).map((a) => toLspCodeAction(a, "file:///x.tf", (d) => d.code));

  it("marks keyword-needs-space's likelier fix isPreferred, through to the LSP action", () => {
    const actions = lsp("/def g = /if (1) /echo a%; /endif\\\n/def h = /echo b\n");
    expect(actions.map((a) => [a.title, a.isPreferred ?? false])).toEqual([
      ["Remove the \\ at the end of line 1", true],
      ["Put %; before the \\ on line 1", false],
    ]);
    expect(actions[0]?.diagnostics).toEqual(["keyword-needs-space"]);
  });

  // rev-s4d m2: keyword-mid-statement's pair, the keyword or its block's closer, is an even choice.
  it("marks neither of keyword-mid-statement's two fixes preferred", () => {
    const actions = lsp("/def c91 = /if (1) /if (0) /set m91=see /endif%; /echo x%; /endif%; /echo after\n");
    expect(actions.map((a) => a.title)).toEqual(["Put %; before /endif", "Add %; /endif at the end of the body"]);
    expect(actions.some((a) => "isPreferred" in a)).toBe(false);
  });
});
