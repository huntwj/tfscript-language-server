import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

/**
 * Fixtures below mirror the proven cases in ~/ai/mud/tests/tfscript/cases/ (ground truth is
 * `just tf-script-check` against real tf; see scripting.md). Keep them in sync by hand — this
 * repo does not read that directory at test time, so there is nothing to keep itself honest
 * beyond "do these still look like the real cases".
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
