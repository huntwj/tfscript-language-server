import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

/**
 * Fixtures below mirror the proven cases in ~/ai/mud/tests/tfscript/cases/ (ground truth is
 * `just tf-script-check` against real tf; see scripting.md). They're kept in sync by hand;
 * groundTruth.test.ts separately runs the real cases directly, when that sibling checkout is
 * present, so drift between the two doesn't go unnoticed for long.
 */

function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

describe("if-multiline-top-level (rule 2)", () => {
  it("flags an /if left open across top-level lines", () => {
    const text = ['/if (x =~ "")', "  /set x=1", "/endif", ""].join("\n");
    expect(codes(text)).toContain("if-multiline-top-level");
  });

  it("is clean when /if and /endif are joined with %; on one line", () => {
    const text = '/if (x =~ "") /set x=1%; /endif\n';
    expect(codes(text)).not.toContain("if-multiline-top-level");
  });

  it("is clean inside a /def, backslash-continued, even though it is multi-line", () => {
    const text = [
      "/def tfsc_c = \\",
      "  /if (1) \\",
      "    /echo yes%; \\",
      "  /endif",
      "",
    ].join("\n");
    expect(codes(text)).not.toContain("if-multiline-top-level");
  });
});

describe("not-substituted-here (rule 4)", () => {
  it("flags %{var} in a top-level command", () => {
    const text = ["/set d=/script", "/load %{d}/ok.tf", ""].join("\n");
    expect(codes(text)).toContain("not-substituted-here");
  });

  it("is clean when the command is prefixed with /eval", () => {
    const text = ["/set d=/script", "/eval /load %{d}/ok.tf", ""].join("\n");
    expect(codes(text)).not.toContain("not-substituted-here");
  });

  it("does not flag an ordinary /set assignment with no %{...}", () => {
    expect(codes("/set d=/script\n")).not.toContain("not-substituted-here");
  });

  // Regression: found as a real false positive against tinyfugue/lib/tf/color.tf. Confirmed
  // directly that %{i} inside a top-level /for body is substituted on every iteration
  // (/for i 0 2 /nosuchcmd_%{i} raised three distinctly-named "no such command" errors, not
  // one), unlike an ordinary top-level line.
  it("does not flag %{var} inside a /for body, not just a /def body", () => {
    const text = "/for i 0 2 /set x%{i}=hello\n";
    expect(codes(text)).not.toContain("not-substituted-here");
  });

  // Confirmed live: /bind, /hook and /trig (and its stdlib siblings /trigc, /trigp, /trigpc)
  // all defer %{var} substitution into the macro body exactly like /def — an undefined %{x}
  // in any of these loads with no complaint.
  it.each(["/bind ^[a = /echo %{x}", "/hook CONNECT = /echo %{x}", "/trig '*' = /echo %{x}"])(
    "does not flag %{var} inside a macro-body command (%s)",
    (line) => {
      expect(codes(`${line}\n`)).not.toContain("not-substituted-here");
    },
  );

  // Proven 2026-10-14 (review probes p1 and p2): /@def and /@bind are the builtins, with a body.
  it.each(["/@def pd = /echo %{x}", "/@def pd2 = /echo a%; /echo b", "/@bind ^a = /echo %{x}", "/@hook LOAD = /echo a%; /echo b"])(
    "reads the body of %s as a macro body",
    (line) => {
      expect(codes(`${line}\n`)).not.toContain("not-substituted-here");
    },
  );

  // Proven 2026-10-14 (rule analysis p04, q05, p10 and r2.tf): tf substitutes each of these.
  it.each([
    "/if (%{x} == 5) /echo yes%; /endif",
    "/test %{x} + 1",
    "/repeat -0 1 /echo %{x}",
    "/repeat -S 1 /echo %{x}",
    "/if (1) /repeat -0 1 /echo %%{x}%; /endif",
    "/for j %{lo} 3 /echo %{j}",
    "/eval -sfull /echo %{x}",
    "/if (1) /eval /load %%{d}/a.tf%; /endif",
    "/if (1) /echo a%; /else /eval /echo %{W}%; /endif",
  ])("does not flag what tf substitutes: %s", (line) => {
    expect(codes(`${line}\n`)).not.toContain("not-substituted-here");
  });

  // Proven the same way: tf leaves each of these as written.
  it.each([
    ["/if (1) /echo x=%{x}%; /endif", "%{x}"],
    ["/eval -s0 /echo %{x}", "%{x}"],
    ["/eval -son /echo %{x}", "%{x}"],
    ["/set y=$[%{x}+1]", "%{x}"],
    ["/load %dir/x.tf", "%dir"],
  ])("flags what tf leaves as written: %s", (line, written) => {
    const d = getDiagnostics(`${line}\n`).filter((x) => x.code === "not-substituted-here");
    expect(d.map((x) => line.slice(x.range.start.character, x.range.end.character))).toEqual([written]);
  });

  it("names where the text isn't substituted", () => {
    const message = (line: string) => getDiagnostics(`${line}\n`).find((x) => x.code === "not-substituted-here")?.message;
    expect(message("/if (1) /echo %{x}%; /endif")).toBe(
      "%{x} stays as it is in a top-level /if or /while line: put /eval in front of the command to substitute it.",
    );
    expect(message("/eval -soff /echo %{x}")).toBe("%{x} stays as it is in /eval -soff text: put /eval in front of the command to substitute it.");
  });

  it("leaves %name alone outside a load path, and a % in a run", () => {
    expect(codes("/set std_clock_format=%H:%M\n")).toEqual([]);
    expect(codes("/echo %%{x}\n")).toEqual([]);
  });

  it("notes a %; on a plain line, as information", () => {
    const [d, ...rest] = getDiagnostics("/set a=1%; /set b=2\n");
    expect(rest).toEqual([]);
    expect(d?.code).toBe("not-substituted-here");
    expect(d?.severity).toBe("information");
    expect(d?.message).toBe(
      "%; doesn't end a command on a plain top-level line, so it and the rest of the line are part of /set: put each command on a line of its own, or start the line with /eval.",
    );
    expect(d?.fix?.edits[0]?.newText).toBe("\n");
  });

  // Review probes p3 (C5) and p4 (D1, D2): these %;s separate.
  it("doesn't note a %; that separates, ends the line, or sits in a definition", () => {
    for (const line of [
      "/if (1) /set a=1%; /endif",
      "/eval /set a=1%; /set b=2",
      "/let _x=1%;",
      "/def -E'/undef b%; /undef c' -t'*' a = /echo a",
      "/eval -son /echo a%; /echo b",
      "/eval -soff /if (1) /echo a%; /echo b%; /endif",
      "/eval -s1 /set a=1%; /echo a=%a",
      "/@def pd2 = /echo a%; /echo b",
    ]) {
      expect(codes(`${line}\n`)).not.toContain("not-substituted-here");
    }
  });
});

describe("let-swallows-endif (rule 5)", () => {
  it("flags /endif swallowed into a /let value", () => {
    const text = "/def tfsc_a = /if (1) /let v=1 /endif\n";
    expect(codes(text)).toContain("let-swallows-endif");
  });

  it("is clean when %; closes the /let before /endif", () => {
    const text = "/def tfsc_b = /if (1) /let v=1%; /endif\n";
    expect(codes(text)).not.toContain("let-swallows-endif");
  });

  it("does not flag a /set value that happens to look like a path", () => {
    expect(codes("/set d=/script\n")).not.toContain("let-swallows-endif");
  });

  it("does not flag /set when the value is a plain word", () => {
    expect(codes("/set world=wotmud\n")).not.toContain("let-swallows-endif");
  });

  it("only counts /if or /endif as a word of its own, not inside a path or URL", () => {
    expect(codes("/def a = /set path=/usr/local/if/x\n")).not.toContain("let-swallows-endif");
    expect(codes("/def a = /let url=http://if.example.com\n")).not.toContain("let-swallows-endif");
    expect(codes("/def a = /set p=/endif/x\n")).not.toContain("let-swallows-endif");
    expect(codes("/def a = /if (1) /let v=1 /ENDIF\n")).toContain("let-swallows-endif");
  });

  it("leaves an /endif with no /if open to block-structure", () => {
    expect(codes("/def a = /let x=1 /endif\n")).not.toContain("let-swallows-endif");
    expect(codes("/def a = /if (1) /echo%; /endif%; /let x=1 /endif\n")).not.toContain("let-swallows-endif");
  });

  // Which /ifs are open comes from structure.ts's model of tf's compiler, not from counting words.
  it("doesn't count an /if that is only text, or /if( which isn't the keyword", () => {
    expect(codes("/def -i a = /echo use /if to branch%; /set x=1 /endif%; /echo x=%x\n")).not.toContain("let-swallows-endif");
    expect(codes("/def -i a = /if(x) /let v=1 /endif\n")).not.toContain("let-swallows-endif");
  });

  // Proven live: each of these runs clean, and with a %; before the swallowed /endif it fails
  // ("unexpected /ENDIF in outer block"): a real /endif closes the /if later, so that one is text.
  it("says nothing about a swallowed /endif when a real one closes the /if later", () => {
    for (const text of [
      "/def -i p1 = /if (1) /let x=1 /endif%; /endif%; /echo p1 x=%x\n",
      "/def -i p2 = /if (1) /let x=1 /endif%; /else /echo no%; /endif%; /echo p2 x=%x\n",
      "/def -i p3 = /if (1) /let x=1 /endif%; /elseif (2) /echo no%; /endif%; /echo p3 x=%x\n",
      "/def -i p4 = /if (1) /if (2) /let x=1 /endif%; /endif%; /endif%; /echo p4 x=%x\n",
    ]) {
      expect(codes(text), text).toEqual([]);
    }
  });

  // At most one /endif can close the /if, so fixing a later one too would leave it stray (proven live).
  it("flags only the first /endif swallowed while the /if is open", () => {
    const found = getDiagnostics("/def a = /if (1) /let x=1 /endif%; /let y=2 /endif\n").filter((d) => d.code === "let-swallows-endif");
    expect(found.map((d) => d.range.start.character)).toEqual([26]);
  });

  // Proven live: the statement's first command takes the rest, so the /if is in /set y's value.
  it("blames the statement's first /let or /set, once", () => {
    const [set, ...rest] = getDiagnostics("/def -i b = /set y=2 /let x=1 /endif /if (1) /echo%; /endif\n").filter((d) => d.code === "let-swallows-endif");
    expect(set?.message).toBe("This /if is part of the /set value, not a command: put %; before it.");
    expect(rest).toEqual([]);
    expect(codes("/def -i c = /let a=1 /let b=2 /if (1) /echo%; /endif\n").filter((c) => c === "let-swallows-endif")).toHaveLength(1);
  });

  it("stays linear on one long line", () => {
    const text = `/def a = ${"/let x=1 /endif%; ".repeat(5000)}\n`;
    const start = Date.now();
    getDiagnostics(text);
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe("dollar-bracket-in-if (rule 6)", () => {
  it("flags $[...] inside an /if condition", () => {
    const text = "/def tfsc_d = /if ($[1+1] > 0) /echo yes%; /endif\n";
    expect(codes(text)).toContain("dollar-bracket-in-if");
  });

  it("is clean with a plain expression", () => {
    const text = "/def tfsc_e = /if (1+1 > 0) /echo yes%; /endif\n";
    expect(codes(text)).not.toContain("dollar-bracket-in-if");
  });

  // Confirmed live: /elseif and /while conditions get the same "legal, but redundant"
  // warning as /if — same expression-evaluation mechanism, not special-cased to /if alone.
  it("flags $[...] inside an /elseif condition", () => {
    const text = "/if (0) /elseif ($[1]) /echo hi%; /endif\n";
    expect(codes(text)).toContain("dollar-bracket-in-if");
  });

  it("flags $[...] inside a /while condition", () => {
    const text = "/while ($[1]) /break%; /done\n";
    expect(codes(text)).toContain("dollar-bracket-in-if");
  });

  // Proven live: there the $[...] is a substitution, and (...) would be text, so the fix would
  // turn /if (%{nosuch-$[1+1]} == 2) from true to false.
  it("leaves a $[...] alone inside a substitution's default, ${...} or $(...)", () => {
    for (const cond of ["%{nosuch-$[1+1]} == 2", "{nosuch-$[1+1]} == 2", "$(/echo $[1+1]) == 2", "${a$[1]} == 2", "$$[1] == 2"]) {
      expect(codes(`/def a = /if (${cond}) /echo yes%; /endif\n`)).not.toContain("dollar-bracket-in-if");
    }
    expect(codes("/def a = /if (%{x-1} + $[1] == 2) /echo yes%; /endif\n")).toContain("dollar-bracket-in-if");
  });
});

describe("getDiagnostics ranges", () => {
  it("points at the offending token, not the whole line", () => {
    const text = '/if (x =~ "") /set x=1\n/endif\n';
    const [diag] = getDiagnostics(text);
    expect(diag).toBeDefined();
    expect(diag!.range.start.line).toBe(0);
    expect(diag!.range.start.character).toBe(0);
    expect(diag!.range.end.character).toBe(3); // "/if"
  });
});

describe("structural rules (structure.ts)", () => {
  function found(text: string): string[] {
    return getDiagnostics(text).map((d) => `${d.code}@${d.range.start.line}:${d.range.start.character}`);
  }

  it("block-structure points at a keyword swallowed mid-statement, on its own continuation line", () => {
    const text = ["/def go = \\", "    /if (1) /echo yes \\", "    /else /echo no \\", "    /endif", ""].join("\n");
    // "/echo yes /else /echo no /endif" is one statement, so the /if is never closed. (With a %;
    // before /endif it would be valid, if not what was meant: /echo prints "yes /else /echo no".)
    expect(found(text)).toEqual(["block-structure@2:4"]);
  });

  it("block-structure reports a stray keyword in a macro body, and at the top level", () => {
    expect(found("/def go = /echo a%; /endif\n")).toEqual(["block-structure@0:20"]);
    expect(found("/if (1) /echo a%; /endif\n/endif\n")).toEqual(["block-structure@1:0"]);
  });

  it("if-multiline-top-level still owns an /if left open at the end of a top-level line", () => {
    expect(found(["/if (1)", "/echo yes", "/endif", ""].join("\n"))).toEqual([
      "if-multiline-top-level@0:0",
      "block-structure@2:0",
    ]);
  });

  it("leaves an /endif swallowed by /let to let-swallows-endif", () => {
    expect(found("/def tfsc_a = /if (1) /let v=1 /endif\n")).toEqual(["let-swallows-endif@0:31"]);
  });

  it("unclosed-substitution in a body, but not in a plain top-level command, which substitutes nothing", () => {
    expect(found("/def go = /echo $[1+2\n")).toEqual(["unclosed-substitution@0:16"]);
    expect(found("/echo $[1+2\n")).toEqual([]);
    expect(found("/if (1 /echo a%; /endif\n")).toEqual(["unclosed-substitution@0:4"]);
  });

  it("separator-sends-blank-line warns, and nothing else fires", () => {
    const diags = getDiagnostics("/def go = /if (1)%; /echo a%; /endif\n");
    expect(diags.map((d) => `${d.code}:${d.severity}`)).toEqual(["separator-sends-blank-line:warning"]);
  });

  it("checks /alias bodies", () => {
    expect(found("/alias tt tell %{target %{*}\n")).toEqual(["unclosed-substitution@0:15"]);
  });
});

describe("structural rules and the rules they overlap", () => {
  const found = (text: string) => getDiagnostics(text).map((d) => d.code);

  it("reports %{foo%; once, as bad-substitution-selector", () => {
    expect(found("/def foo = /echo %{foo%; /echo x\n")).toEqual(["bad-substitution-selector"]);
  });

  it("finds the body of a /def whose trigger pattern holds an =", () => {
    expect(found("/def -t*hp=* -i sh = /if (1) /echo ok%; /endif\n")).toEqual([]);
  });
});

describe("messages", () => {
  // One plain sentence each, for the Problems pane: the problem, then the fix where there is one.
  const cases: [string, string, string][] = [
    ["if-multiline-top-level", "/if (1)\n  /echo yes\n/endif\n", "This /if has no /endif in the same command."],
    ["block-structure", "/while (1) /echo\n", "This /while has no /done in the same command."],
    ["not-substituted-here", "/load %{d}/ok.tf\n", "%{d} stays as it is in a command at the top level of a file: put /eval in front of the command to substitute it."],
    ["let-swallows-endif", "/def a = /if (1) /let v=1 /endif\n", "This /endif is part of the /let value, not a command: put %; before it."],
    ["let-swallows-endif", "/set v=1 /if (1) /echo%; /endif\n", "This /if is part of the /set value, not a command: put it on a line of its own."],
    ["dollar-bracket-in-if", "/def a = /if ($[1]) /echo%; /endif\n", "This $[...] is redundant, as the condition is already an expression: drop the $[ and ]."],
    ["dollar-bracket-in-if", "/def a = /if ($[1] + 1) /echo%; /endif\n", "This $[...] is redundant, as the condition is already an expression: write (...) instead."],
    ["indented-line-after-command", "/echo a\n  /echo b\n", "Line 1 has no \\ at the end, so this indented line starts a new command: end line 1 with \\ to continue it, or remove the indentation."],
    ["trailing-space-after-backslash", "/echo a \\ \n", "This \\ doesn't continue the line, because whitespace follows it: remove the whitespace."],
    [
      "trailing-space-after-backslash",
      "/echo a \\\r\n/echo b\r\n",
      "This \\ doesn't continue the line, because the file's Windows (CRLF) line endings put a carriage return after it: save the file with LF line endings.",
    ],
    [
      "trailing-space-after-backslash",
      "/echo a %\\ \n",
      "This %\\ doesn't continue the line, with or without the whitespace after it: to continue, end the line with a \\ that has no % before it.",
    ],
    ["bad-substitution-selector", "/def f = /echo %{foo%{bar}}\n", "%{foo needs a } or a - after the name: another substitution can't follow it directly."],
    ["reserved-macro-name", "/def if = /echo\n", '"if" is a reserved word, so tf refuses this /def and defines nothing: pick another name.'],
    ["bare-line-after-command", "hello\n", "This line isn't a command, so tf stops loading the file here: comment it out, or start it with /."],
    [
      "bare-line-after-command",
      "\uFEFF/echo hi\n",
      "This line starts with a byte order mark (U+FEFF), which tf reads as text, so it stops loading the file here: delete the mark.",
    ],
  ];
  for (const [code, text, message] of cases) {
    it(`${code}: ${JSON.stringify(text)}`, () => {
      const d = getDiagnostics(text).find((x) => x.code === code);
      expect(d?.message).toBe(message);
      expect(d?.explanation).toBeTruthy();
    });
  }
});
