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

describe("load-no-expansion (rule 4)", () => {
  it("flags %{var} in a top-level command", () => {
    const text = ["/set d=/script", "/load %{d}/ok.tf", ""].join("\n");
    expect(codes(text)).toContain("load-no-expansion");
  });

  it("is clean when the command is prefixed with /eval", () => {
    const text = ["/set d=/script", "/eval /load %{d}/ok.tf", ""].join("\n");
    expect(codes(text)).not.toContain("load-no-expansion");
  });

  it("does not flag an ordinary /set assignment with no %{...}", () => {
    expect(codes("/set d=/script\n")).not.toContain("load-no-expansion");
  });

  // Regression: found as a real false positive against tinyfugue/lib/tf/color.tf. Confirmed
  // directly that %{i} inside a top-level /for body is substituted on every iteration
  // (/for i 0 2 /nosuchcmd_%{i} raised three distinctly-named "no such command" errors, not
  // one), unlike an ordinary top-level line.
  it("does not flag %{var} inside a /for body, not just a /def body", () => {
    const text = "/for i 0 2 /set x%{i}=hello\n";
    expect(codes(text)).not.toContain("load-no-expansion");
  });

  // Confirmed live: /bind, /hook and /trig (and its stdlib siblings /trigc, /trigp, /trigpc)
  // all defer %{var} substitution into the macro body exactly like /def — an undefined %{x}
  // in any of these loads with no complaint.
  it.each(["/bind ^[a = /echo %{x}", "/hook CONNECT = /echo %{x}", "/trig '*' = /echo %{x}"])(
    "does not flag %{var} inside a macro-body command (%s)",
    (line) => {
      expect(codes(`${line}\n`)).not.toContain("load-no-expansion");
    },
  );
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
    ["load-no-expansion", "/load %{d}/ok.tf\n", "%{d} stays as it is in a command at the top level of a file: put /eval in front to substitute it."],
    ["let-swallows-endif", "/def a = /if (1) /let v=1 /endif\n", "This /endif is part of the /let value, not a command: put %; before it."],
    ["let-swallows-endif", "/set v=1 /if (1) /echo%; /endif\n", "This /if is part of the /set value, not a command."],
    ["dollar-bracket-in-if", "/def a = /if ($[1]) /echo%; /endif\n", "This $[...] is redundant, as the condition is already an expression: drop the $[ and ]."],
    ["dollar-bracket-in-if", "/def a = /if ($[1] + 1) /echo%; /endif\n", "This $[...] is redundant, as the condition is already an expression: write (...) instead."],
    ["indented-line-after-command", "/echo a\n  /echo b\n", "Line 1 has no \\ at the end, so this indented line starts a new command."],
    ["trailing-space-after-backslash", "/echo a \\ \n", "This \\ doesn't continue the line, because whitespace follows it."],
    [
      "trailing-space-after-backslash",
      "/echo a \\\r\n/echo b\r\n",
      "This \\ doesn't continue the line: the file's Windows (CRLF) line endings put a carriage return after it.",
    ],
    ["bad-substitution-selector", "/def f = /echo %{foo%{bar}}\n", "%{foo needs a } or a - after the name: another substitution can't follow it directly."],
    ["reserved-macro-name", "/def if = /echo\n", '"if" is a reserved word, so tf refuses this /def and defines nothing: pick another name.'],
    ["bare-line-after-command", "hello\n", "This line isn't a command, so tf stops loading the file here."],
  ];
  for (const [code, text, message] of cases) {
    it(`${code}: ${JSON.stringify(text)}`, () => {
      const d = getDiagnostics(text).find((x) => x.code === code);
      expect(d?.message).toBe(message);
      expect(d?.explanation).toBeTruthy();
    });
  }
});
