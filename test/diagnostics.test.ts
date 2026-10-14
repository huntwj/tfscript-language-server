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

describe("missing-continuation (rule 2)", () => {
  it("flags an /if left open across top-level lines", () => {
    const text = ['/if (x =~ "")', "  /set x=1", "/endif", ""].join("\n");
    expect(codes(text)).toContain("missing-continuation");
  });

  it("is clean when /if and /endif are joined with %; on one line", () => {
    const text = '/if (x =~ "") /set x=1%; /endif\n';
    expect(codes(text)).not.toContain("missing-continuation");
  });

  it("is clean inside a /def, backslash-continued, even though it is multi-line", () => {
    const text = [
      "/def tfsc_c = \\",
      "  /if (1) \\",
      "    /echo yes%; \\",
      "  /endif",
      "",
    ].join("\n");
    expect(codes(text)).not.toContain("missing-continuation");
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
    expect(message("/eval -soff /echo %{x}")).toBe("%{x} stays as it is in /eval -soff text: leave out the -s option to substitute it.");
    // Review probe p4: an /if in -soff text is raised to the newline level, but it is still -soff text.
    expect(message("/eval -soff /if (1) /load %{x}/f.tf%; /endif")).toBe(
      "%{x} stays as it is in /eval -soff text: leave out the -s option to substitute it.",
    );
    // /test compiles an expression, which /eval would compile too: no promise that it works.
    expect(message("/if (1) /test echo(\"%{x}\")%; /endif")).toBe(
      "%{x} stays as it is in a top-level /if or /while line; /eval in front would substitute the rest of the command too, so check it before using /eval.",
    );
  });

  // rev.tf R6 and R7: /eval without -s substitutes, and -son splits on %;.
  it("offers to leave out an /eval's -s option", () => {
    const text = "/eval -soff /echo %{x}\n";
    const d = getDiagnostics(text).find((x) => x.code === "not-substituted-here");
    expect(d?.fix?.title).toBe("Leave out -soff");
    expect(d?.fix?.edits.map((e) => [e.range.start.character, e.range.end.character, e.newText])).toEqual([[6, 12, ""]]);
  });

  // Review probe p1 (A6-A9): tf prints %{x} for each, in a /def body too, but substitutes the /test's string in a body.
  it("flags a %{...} in a string, where nothing substitutes it", () => {
    const message = (line: string) => getDiagnostics(`${line}\n`).filter((x) => x.code === "not-substituted-here").map((x) => x.message);
    const inString = '%{x} stays as it is inside a string in an expression: take it out of the quotes and write {x}, as in strcat("...", {x}).';
    expect(message('/if (echo("%{x}")) /endif')).toEqual([inString]);
    expect(message('/def body9 = /if (echo("%{x}")) /endif%; /test echo("%{x}")')).toEqual([inString]);
    expect(message('/def b = /echo $["%{x}"]')).toEqual([inString]);
    expect(message('/test echo("%{x}")')).toEqual([
      "%{x} stays as it is in a command at the top level of a file; /eval in front would substitute the rest of the command too, so check it before using /eval.",
    ]);
    // Second review's probes e1 and e3: tf runs these $(...)s as macro bodies, substituting %{x}.
    expect(message('/def e1 = /if ($(/echo "%{x}") =~ "\\"XV\\"") /echo s%; /endif')).toEqual([]);
    expect(message('/def e5 = /echo $[strcat("a", $(/echo "%{x}"))]')).toEqual([]);
    expect(message('/test echo(strcat("a", $(/echo "%{x}")))')).toEqual([]);
    // Third review's probes p1 and n1: P1-P6 print XV; N1's string holds the literal text.
    expect(message('/def p1 = /if ($(/echo \\) "%{x}") =~ ") \\"XV\\"") /echo s%; /endif')).toEqual([]);
    expect(message('/def p2 = /if ($(/if (1) /echo "%{x}"%; /endif) =~ "\\"XV\\"") /echo s%; /endif')).toEqual([]);
    expect(message('/test echo(strcat("a", $(/echo \\) "%{x}")))')).toEqual([]);
    expect(message('/if ($(/while (0) /done%; /echo "%{x}") =~ "\\"XV\\"") /echo s%; /endif')).toEqual([]);
    expect(message('/def n1 = /if ($(/echo \\) x") !~ "" & strlen("%{x}") == 4) /echo l%; /endif')).toEqual([inString]);
  });

  // Third review: tf runs /if(1) as a command named "if(1)", so the line isn't raised to the newline level.
  it("notes a %; on a line starting /if( with no blank, which isn't an /if", () => {
    const [d] = getDiagnostics("/if(1) /echo a%; /echo b%; /endif\n").filter((x) => x.code === "not-substituted-here");
    expect(d?.severity).toBe("information");
  });

  // Review probes p1 (A4) and p2 (B1): the command after /quote's backquote is run as a macro body.
  it("reads /quote's backquoted command, and /at's command, as a macro body", () => {
    expect(codes("/quote -S -decho `/echo %{x}\n")).toEqual([]);
    expect(codes("/quote -S -decho `/echo a%; /echo b\n")).toEqual([]);
    expect(codes('/quote -S `"/echo %{x}"\n')).toEqual([]);
    expect(codes("/quote -S -soff `/echo %{x}\n")).toContain("not-substituted-here");
    expect(codes("/at 12:00 /echo %{x}\n")).toEqual([]);
    expect(codes("/at -v 2030-01-02 12:00 /echo %{x}\n")).toEqual([]);
    expect(codes("/quote -S !echo %{x}\n")).toContain("not-substituted-here");
  });

  // Second review's probe q2: Q2, Q13 and Q16 leave %{x} and %; as written, Q14 and Q15 don't.
  it("names /quote -soff and -son text, and offers to leave out its -s or give it -son", () => {
    const fixes = (line: string) =>
      getDiagnostics(`${line}\n`).map((d) => [d.message, d.fix?.title, d.fix?.edits.map((e) => [e.range.start.character, e.range.end.character, e.newText])]);
    expect(fixes("/quote -S -soff `/echo %{x}")).toEqual([
      ["%{x} stays as it is in /quote -soff text: leave out the -s option to substitute it.", "Leave out -soff", [[10, 16, ""]]],
    ]);
    expect(fixes("/quote -Ssoff `/echo %{x}")).toEqual([
      ["%{x} stays as it is in /quote -soff text: leave out the -s option to substitute it.", "Leave out -soff", [[9, 13, ""]]],
    ]);
    expect(fixes("/quote -S -soff `/echo a%; /echo b")).toEqual([
      [
        "%; doesn't end a command in /quote -soff text, so it and the rest of the line are part of /echo: give the /quote -son, or leave out the -s option.",
        "Give the /quote -son",
        [[10, 15, "-son"]],
      ],
    ]);
    expect(fixes("/quote -Ssoff `/echo a%; /echo b")[0]?.[2]).toEqual([[9, 13, "son"]]);
  });

  it("leaves %name alone outside a load path, and a % in a run", () => {
    expect(codes("/set std_clock_format=%H:%M\n")).toEqual([]);
    expect(codes("/echo %%{x}\n")).toEqual([]);
  });

  it("notes a %; on a plain line, as information", () => {
    const [d, ...rest] = getDiagnostics("/echo a%; /echo b\n");
    expect(rest).toEqual([]);
    expect(d?.code).toBe("not-substituted-here");
    expect(d?.severity).toBe("information");
    expect(d?.message).toBe(
      "%; doesn't end a command on a plain top-level line, so it and the rest of the line are part of /echo: put each command on a line of its own, or start the line with /eval.",
    );
    expect(d?.fix?.edits[0]?.newText).toBe("\n");
  });

  // Proven live (s2/r/sp.tf): an /if split onto a line of its own with no /endif there is
  // "expected /endif, found end"; with its /endif, it runs.
  it("offers no split, or -son, that leaves a block open", () => {
    const fixes = (text: string) =>
      getDiagnostics(`${text}\n`)
        .filter((d) => d.message.startsWith("%; "))
        .map((d) => d.fix?.title ?? "none");
    expect(fixes("/echo H3:%{x}%; /if (1) /echo H3b")).toEqual(["none"]);
    expect(fixes("/eval -soff /echo a%; /if (1) /echo b")).toEqual(["none"]);
    expect(fixes("/echo a%; /if (1) /echo b%; /endif")).toEqual(["Put the next command on a line of its own", "none"]);
  });

  // Review rev-s2d c.tf and d.tf (proven, s2/r/bang.tf): /@if, /@endif and /@else are keywords as
  // /if, /endif and /else are; /!if is no keyword, and split off it is "if: no such command".
  it("reads /@ and /! forms of a keyword as tf does", () => {
    const fixes = (text: string) =>
      getDiagnostics(`${text}\n`)
        .filter((d) => d.message.startsWith("%; "))
        .map((d) => d.fix?.title ?? "none");
    for (const text of ["/echo D01a%; /@endif", "/echo D05a%; /@else", "/echo D02a%; /@while (0) /echo b", "/echo C04a%; /@if (1) /echo b", "/echo C05a%; /!if (1) /echo b"]) {
      expect(fixes(text)).toEqual(["none"]);
    }
    expect(fixes("/echo C08a%; /@if (1) /echo C08b%; /@endif")).toEqual(["Put the next command on a line of its own", "none"]);
  });

  // Proven live (review rev-s2e g.tf): /@@if is no keyword but a builtin lookup of "@if"; /@echo,
  // /@@echo and /!@echo are "not a builtin command" (stdlib's /echo is a macro); /if(1) is "no such
  // command or macro". /!echo runs the macro, and /@if is the keyword.
  it("offers no split before a command tf wouldn't run", () => {
    const fixes = (text: string) =>
      getDiagnostics(`${text}\n`)
        .filter((d) => d.message.startsWith("%; "))
        .map((d) => (d.fix ? "split" : "none"));
    for (const text of [
      "/echo G01a%; /@@if (1) /echo b%; /endif",
      "/echo G05a%; /@@while (0) /echo b%; /done",
      "/echo G08a%; /@@!if (1) /echo b%; /endif",
      "/echo G02a%; /@@echo b",
      "/echo G03a%; /@!echo b",
      "/echo G04a%; /!@echo b",
      "/echo G11a%; /@echo b",
      "/echo G06a%; /if(1) /echo b%; /endif",
    ]) {
      expect(fixes(text)[0]).toBe("none");
    }
    expect(fixes("/echo G10a%; /!echo b")).toEqual(["split"]);
    expect(fixes("/echo G07a%; /@if (1) /echo b%; /endif")[0]).toBe("split");
    expect(fixes("/echo a%; /@def x = /echo y")).toEqual(["split"]);
  });

  it("stays near-linear on a line of thousands of %;", () => {
    const start = Date.now();
    expect(getDiagnostics(`/echo %{x} %{y ${"%; ".repeat(20000)}\n`).length).toBe(20000);
    expect(getDiagnostics(`/eval -soff /echo a${"%; /echo b".repeat(20000)}\n`).length).toBe(20000);
    expect(Date.now() - start).toBeLessThan(3000);
  });

  // Review rev-s2d perf.js: each `%; /if` read the rest of the statement, 8000 of them in 20 s.
  it("checks only so many %; /if splits of one statement, offering no more", () => {
    const start = Date.now();
    const diags = getDiagnostics(`/echo a${"%; /if (1) /echo b%; /endif".repeat(8000)}\n`);
    expect(Date.now() - start).toBeLessThan(3000);
    expect(diags.filter((d) => d.fix?.title === "Put the next command on a line of its own")).toHaveLength(64);
  });

  // Review probe p2 (B5): a value holding %; can be meant, for a later /eval.
  it("says a /set, /let or /setenv value includes the %;, and offers no fix", () => {
    const [d, ...rest] = getDiagnostics("/set cmd=/echo a%; /echo b\n");
    expect(rest).toEqual([]);
    expect(d?.message).toBe(
      "%; doesn't end a command on a plain top-level line, so the /set value includes it and the rest of the line: if they are meant as commands, put each on a line of its own.",
    );
    expect(d?.fix).toBeUndefined();
    expect(getDiagnostics("/eval -soff /let v=a%; b\n")[0]?.fix).toBeUndefined();
  });

  // Review probe p2 (B3): -soff text doesn't split on %;.
  it("advises -son for a %; in /eval -soff text", () => {
    const [d] = getDiagnostics("/eval -soff /echo a%; /echo b\n");
    expect(d?.message).toBe(
      "%; doesn't end a command in /eval -soff text, so it and the rest of the line are part of /echo: give the /eval -son, or leave out the -s option.",
    );
    expect(d?.fix?.title).toBe("Give the /eval -son");
    expect(d?.fix?.edits.map((e) => [e.range.start.character, e.range.end.character, e.newText])).toEqual([[6, 11, "-son"]]);
    // Second review's probes k1 and f1: with -son, a keyword after the %; is "unexpected /ELSE".
    for (const line of ["/eval -soff /echo a%; /else", "/eval -soff /echo a%; /endif"]) {
      const [n] = getDiagnostics(`${line}\n`).filter((x) => x.code === "not-substituted-here");
      expect(n?.severity).toBe("information");
      expect(n?.fix).toBeUndefined();
    }
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
      // tests/cases/52_lua_sample_percent.tf: a %; in a /test's string is meant as text.
      '/test trigger("Bob says hi %; /echo second-command")',
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

describe("substitution-in-expression", () => {
  const operands = (text: string) =>
    getDiagnostics(text)
      .filter((d) => d.code === "substitution-in-expression")
      .map((d) => `${d.range.start.line}:${d.range.start.character}`);
  const redundant = (text: string) =>
    getDiagnostics(text).filter((d) => d.code === "substitution-in-expression" && d.message.startsWith("This $[...]"));

  it("flags $[...] inside an /if condition", () => {
    const text = "/def tfsc_d = /if ($[1+1] > 0) /echo yes%; /endif\n";
    expect(codes(text)).toContain("substitution-in-expression");
  });

  it("is clean with a plain expression", () => {
    const text = "/def tfsc_e = /if (1+1 > 0) /echo yes%; /endif\n";
    expect(codes(text)).not.toContain("substitution-in-expression");
  });

  // Confirmed live: /elseif and /while conditions get the same "legal, but redundant"
  // warning as /if — same expression-evaluation mechanism, not special-cased to /if alone.
  it("flags $[...] inside an /elseif condition", () => {
    const text = "/if (0) /elseif ($[1]) /echo hi%; /endif\n";
    expect(codes(text)).toContain("substitution-in-expression");
  });

  it("flags $[...] inside a /while condition", () => {
    const text = "/while ($[1]) /break%; /done\n";
    expect(codes(text)).toContain("substitution-in-expression");
  });

  // Proven live: there the $[...] is a substitution, and (...) would be text, so the fix would
  // turn /if (%{nosuch-$[1+1]} == 2) from true to false.
  it("leaves a $[...] alone inside a substitution's default, ${...} or $(...)", () => {
    for (const cond of ["%{nosuch-$[1+1]} == 2", "{nosuch-$[1+1]} == 2", "$(/echo $[1+1]) == 2", "${a$[1]} == 2", "$$[1] == 2"]) {
      expect(redundant(`/def a = /if (${cond}) /echo yes%; /endif\n`)).toEqual([]);
    }
    expect(redundant("/def a = /if (%{x-1} + $[1] == 2) /echo yes%; /endif\n")).toHaveLength(1);
  });

  // Proven live with %pedantic on (probe q01): tf warns for a $[ that is an operand anywhere it
  // compiles an expression, and not for a body's /test text, which is substituted first.
  it("flags a $[...] operand in a top-level /test, a $[...] and a top-level /if line's /test", () => {
    expect(operands('/test echo(strcat("x", $[1+1]))\n')).toEqual(["0:23"]);
    expect(operands("/def a = /echo $[1 + $[2]]\n")).toEqual(["0:21"]);
    expect(operands("/if (1) /test echo($[2])%; /endif\n")).toEqual(["0:19"]);
    expect(operands("/def b = /test echo($[3])\n")).toEqual([]);
    expect(operands("/eval /test echo($[3])\n")).toEqual([]);
    expect(operands("/repeat -1 1 /test echo($[4])\n")).toEqual([]);
  });

  // Proven live (probes p04, a.tf): "%{x} substitution in expression is legal, but can be confusing".
  it("flags %x and %{x} as operands, in a condition, a $[...] and a top-level /test", () => {
    expect(operands("/if (%{x} == 5) /echo y%; /endif\n")).toEqual(["0:5"]);
    expect(operands("/def a = /if (%x == 5) /echo y%; /endif\n")).toEqual(["0:14"]);
    expect(operands("/def a = /echo $[%{x} + 1]\n")).toEqual(["0:17"]);
    expect(operands("/test echo(%x)\n")).toEqual(["0:11"]);
  });

  it("leaves %{x} alone in a string, a default, a run of %s and a body's /test text", () => {
    expect(operands('/def a = /if ("%{x}" =~ "") /echo y%; /endif\n')).toEqual([]);
    expect(operands("/def a = /if ({nosuch-%{x}} == 5) /echo y%; /endif\n")).toEqual([]);
    expect(operands("/def a = /if (%%x == 5) /echo y%; /endif\n")).toEqual([]);
    expect(operands("/def a = /test echo(%{x})\n")).toEqual([]);
  });

  it("offers no fix for a %x whose default holds a brace, which {...} would end early", () => {
    const [d] = getDiagnostics("/def a = /if (%x-{y} == 5) /echo y%; /endif\n").filter((x) => x.code === "substitution-in-expression");
    expect(d?.fix).toBeUndefined();
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

  it("missing-continuation reports an /if left open at the end of a top-level line once, with its stray /endif", () => {
    expect(found(["/if (1)", "/echo yes", "/endif", ""].join("\n"))).toEqual(["missing-continuation@0:0"]);
  });

  it("leaves an /endif swallowed by /let to let-swallows-endif", () => {
    expect(found("/def tfsc_a = /if (1) /let v=1 /endif\n")).toEqual(["let-swallows-endif@0:31"]);
  });

  it("expression-syntax in a body, but not in a plain top-level command, which substitutes nothing", () => {
    expect(found("/def go = /echo $[1+2\n")).toEqual(["expression-syntax@0:16"]);
    expect(found("/echo $[1+2\n")).toEqual([]);
    expect(found("/if (1 /echo a%; /endif\n")).toEqual(["expression-syntax@0:4"]);
  });

  it("separator-sends-blank-line warns, and nothing else fires", () => {
    const diags = getDiagnostics("/def go = /if (1)%; /echo a%; /endif\n");
    expect(diags.map((d) => `${d.code}:${d.severity}`)).toEqual(["separator-sends-blank-line:warning"]);
  });

  it("checks /alias bodies", () => {
    expect(found("/alias tt tell %{target %{*}\n")).toEqual(["substitution-syntax@0:15"]);
  });
});

describe("structural rules and the rules they overlap", () => {
  const found = (text: string) => getDiagnostics(text).map((d) => d.code);

  it("reports %{foo%; once, as substitution-syntax", () => {
    expect(found("/def foo = /echo %{foo%; /echo x\n")).toEqual(["substitution-syntax"]);
  });

  it("finds the body of a /def whose trigger pattern holds an =", () => {
    expect(found("/def -t*hp=* -i sh = /if (1) /echo ok%; /endif\n")).toEqual([]);
  });
});

describe("messages", () => {
  // One plain sentence each, for the Problems pane: the problem, then the fix where there is one.
  const cases: [string, string, string][] = [
    [
      "missing-continuation",
      "/if (1)\n  /echo yes\n/endif\n",
      "This /if ends at the end of line 1, which has no \\, so the /endif on line 3 is a separate command: end every line but the last with \\.",
    ],
    [
      "missing-continuation",
      "/if (1)\n  /echo yes\n",
      "This /if ends at the end of line 1, which has no \\, so line 2 starts a separate command: end every line but the last with \\.",
    ],
    ["missing-continuation", "/if (1) /echo\n", "This /if's command ends without an /endif: add %; /endif, or end each line but the last with \\."],
    ["missing-continuation", "/while (1) /echo\n", "This /while's command ends without a /done: add %; /done, or end each line but the last with \\."],
    ["missing-continuation", "/if /test 1\n", "This /if's command ends before the /then of its condition list: end each line but the last with \\."],
    ["not-substituted-here", "/load %{d}/ok.tf\n", "%{d} stays as it is in a command at the top level of a file: put /eval in front of the command to substitute it."],
    ["let-swallows-endif", "/def a = /if (1) /let v=1 /endif\n", "This /endif is part of the /let value, not a command: put %; before it."],
    ["let-swallows-endif", "/set v=1 /if (1) /echo%; /endif\n", "This /if is part of the /set value, not a command: put it on a line of its own."],
    ["substitution-in-expression", "/def a = /if ($[1]) /echo%; /endif\n", "This $[...] is redundant, as the condition is already an expression: drop the $[ and ]."],
    ["substitution-in-expression", "/def a = /if ($[1] + 1) /echo%; /endif\n", "This $[...] is redundant, as the condition is already an expression: write (...) instead."],
    ["indented-line-after-command", "/echo a\n  /echo b\n", "Line 1 has no \\ at the end, so this indented line starts a new command: end line 1 with \\ to continue it, or remove the indentation."],
    ["backslash-not-last", "/echo a \\ \n", "This \\ doesn't continue the line, because whitespace follows it: remove the whitespace."],
    [
      "backslash-not-last",
      "/echo a \\\r\n/echo b\r\n",
      "This \\ doesn't continue the line, because the file's Windows (CRLF) line endings put a carriage return after it: save the file with LF line endings.",
    ],
    [
      "backslash-not-last",
      "/echo a %\\ \n",
      "This %\\ doesn't continue the line, with or without the whitespace after it: to continue, end the line with a \\ that has no % before it.",
    ],
    ["substitution-syntax", "/def f = /echo %{foo%{bar}}\n", "%{foo needs a } or a - after the name: another substitution can't follow it directly."],
    ["substitution-syntax", "/def f = /echo 50%-off\n", "%- starts a substitution, but no parameter follows it. Write %%- for a literal %-."],
    ["expression-syntax", "/test $[1+2\n", "This $[ is never closed: add ]."],
    ["expression-syntax", '/test "abc\n', 'This string is never closed: add the closing ".'],
    ["substitution-in-expression", "/test echo($[1])\n", "This $[...] is redundant, as /test's text is already an expression: write (...) instead."],
    ["substitution-in-expression", "/def a = /echo $[1 + $[2]]\n", "This $[...] is redundant, as the $[...] around it is already an expression: write (...) instead."],
    ["substitution-in-expression", "/if (%{x} == 5) /echo%; /endif\n", "This %{x} works in an expression, but tf warns that it can be confusing: write {x} instead."],
    ["reserved-macro-name", "/def if = /echo\n", '"if" is a reserved word, so tf refuses this /def and defines nothing: pick another name.'],
    ["not-a-command", "hello\n", "This line isn't a command, so tf stops loading the file here: comment it out, or start it with /."],
    [
      "not-a-command",
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
