import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

const syntax = (text: string) => getDiagnostics(text).filter((d) => d.code === "substitution-syntax");

describe("substitution-syntax: a selector with another substitution glued on", () => {
  it("flags a second substitution glued directly onto a %{selector}", () => {
    expect(codes("/def f = /echo %{foo%{bar}}\n")).toContain("substitution-syntax");
    expect(codes("/def f = /echo %{foo$[1+1]}\n")).toContain("substitution-syntax");
  });

  it("points at the offending sigil only, with the %{ as a related location", () => {
    const [d] = syntax("/def f = /echo %{foo%{bar}}\n");
    expect(d?.range).toEqual({ start: { line: 0, character: 20 }, end: { line: 0, character: 21 } });
    expect(d?.related?.map((r) => r.range.start.character)).toEqual([15]);
    expect(d?.fix).toBeUndefined();
  });

  it("accepts nesting through the default value", () => {
    expect(codes("/def f = /echo %{foo-%{bar}}\n")).not.toContain("substitution-syntax");
  });

  it("does not treat the '-' default separator as part of the selector (no range form exists)", () => {
    expect(codes("/def f = /echo %{2-%{1}}\n")).not.toContain("substitution-syntax");
  });

  it("ignores %%{ (percent compression), not a fresh substitution", () => {
    expect(codes("/def f = /echo %%{foo%{bar}}\n")).not.toContain("substitution-syntax");
  });

  it("accepts a plain selector", () => {
    expect(codes("/def f = /echo %{foo} %{1} %{*} %{-L1}\n")).not.toContain("substitution-syntax");
  });

  it("calls a %{ cut off by a %; never closed", () => {
    expect(syntax("/def foo = /echo %{foo%; /echo x\n").map((d) => d.message)).toEqual(["This %{ is never closed: add }."]);
  });
});

describe("substitution-syntax only where tf substitutes", () => {
  // Proven live (probe p05): a plain top-level line prints %{foo%{bar}} as it is; the same text
  // in a body is "unmatched { or illegal character '%'".
  it("leaves a plain top-level command alone, and a top-level /if line's commands", () => {
    expect(codes("/echo %{foo%{bar}}\n")).not.toContain("substitution-syntax");
    expect(codes("/if (1) /echo %{foo%{bar}}%; /endif\n")).not.toContain("substitution-syntax");
  });

  it("reads /eval, /repeat and /for text, which tf substitutes", () => {
    expect(codes("/eval /echo %{foo%{bar}}\n")).toContain("substitution-syntax");
    expect(codes("/repeat -1 1 /echo %{foo%{bar}}\n")).toContain("substitution-syntax");
    expect(codes("/for i 1 2 /echo %{foo%{bar}}\n")).toContain("substitution-syntax");
    expect(codes("/eval -soff /echo %{foo%{bar}}\n")).not.toContain("substitution-syntax");
  });

  it("reports one problem once, though /for's words are read twice", () => {
    expect(syntax("/for i 1 2 /echo %{foo\n")).toHaveLength(1);
  });

  // Proven live (review rev-s2 p3): tf runs these clean. Read as one body, the whole of /for's
  // text has its COMMAND mid-statement, where the /if's (...) would be no condition.
  it("reads a /for's COMMAND as a command list, not its whole text", () => {
    for (const text of [
      '/for i 1 2 /if ("%{" !~ "x") /echo %% C1:%{i}%; /endif\n',
      '/for i 1 1 /if (strlen("a%{b") == 4) /echo %% C2:ok%; /endif\n',
      '/for i 1 1 /if (i =~ "$[") /echo %% C3:no%; /else /echo %% C3:else%; /endif\n',
    ]) {
      expect(getDiagnostics(text).filter((d) => d.severity === "error")).toEqual([]);
    }
  });

  it("reads a body handed on by a top-level /if line, with no fix once a run of %s was shortened", () => {
    const [d] = syntax("/if (1) /def g = /echo %{foo%; /endif\n");
    expect(d?.message).toBe("This %{ is never closed: add }.");
    expect(d?.fix?.title).toBe("Close it with }");
    // The /if line hands the body on as "/echo %x %{foo": an edit there isn't one in the file.
    const [shortened] = syntax("/if (1) /def g = /echo %%x %{foo%; /endif\n");
    expect(shortened?.range.start.character).toBe(27);
    expect(shortened?.fix).toBeUndefined();
  });

  // Review rev-s2 p5: the /if line hands /eval "%{x", and tf says "unmatched { or bad
  // substitution". The %{ it names is the last two characters of the %%{ written.
  it("marks the %{ an /if line handed on, not the whole %%{ it was shortened from", () => {
    const [d] = syntax("/if (1) /eval /echo %%{x%; /endif\n");
    expect(d?.message).toBe("This %{ is never closed: add }.");
    expect([d?.range.start.character, d?.range.end.character]).toEqual([21, 23]);
  });

  it("names a { in an expression as {, not %{", () => {
    expect(getDiagnostics("/def f = /if ({x == 1) /echo%; /endif\n").find((d) => d.code === "substitution-syntax")?.message).toBe(
      "This { needs its } before the space.",
    );
  });
});

describe("not-substituted-here and /alias", () => {
  it("does not flag %{...} in a top-level /alias body (deferred like a /def body)", () => {
    expect(codes("/alias pc /diku_putContainer %{*}\n")).not.toContain("not-substituted-here");
  });

  it("still flags an ordinary top-level command", () => {
    expect(codes("/echo %{*}\n")).toContain("not-substituted-here");
  });
});

describe("not-substituted-here and /eval inside a joined /if", () => {
  const joined = ["/if (0) \\", "  /echo no%; \\", "/else \\", "  /eval /echo %{W}%; \\", "/endif", ""].join("\n");

  it("does not flag %{...} after an /eval in the same segment", () => {
    expect(codes(joined)).not.toContain("not-substituted-here");
  });

  it("still flags %{...} after a %; that ends the /eval's segment", () => {
    expect(codes("/if (1) /eval /echo a%; /echo %{W}%; /endif\n")).toContain("not-substituted-here");
  });
});

describe("not-substituted-here and nested or malformed %{", () => {
  it("names a %{...} with a substitution in its default whole", () => {
    expect(getDiagnostics("/echo %{x-%{y}} z\n").find((d) => d.code === "not-substituted-here")?.message).toBe(
      "%{x-%{y}} stays as it is in a command at the top level of a file: put /eval in front of the command to substitute it.",
    );
  });

  // /eval in front would make tf report "unmatched { or illegal character '%'" for text that
  // prints as it is today (probe p05).
  it("leaves a %{ with a substitution glued onto its selector alone", () => {
    expect(codes("/echo %{foo%{bar}}\n")).not.toContain("not-substituted-here");
  });

  // Proven live (review rev-s2 p6, scratchpad s2/r/v.tf, under /eval): a default ends at the first }
  // no nested substitution takes. %{foo-{} prints {, %{foo-a{b}c} prints a{bc}, and
  // %{x-{} and %{y} is two substitutions.
  it("ends a %{...} where tf ends it, at the first } its default doesn't take", () => {
    const named = (text: string) =>
      getDiagnostics(text)
        .filter((d) => d.code === "not-substituted-here")
        .map((d) => text.slice(d.range.start.character, d.range.end.character));
    expect(named("/echo F1:%{foo-{}\n")).toEqual(["%{foo-{}"]);
    expect(named("/echo F2:%{foo-a{b}c}\n")).toEqual(["%{foo-a{b}"]);
    expect(named("/echo F7:%{x-{} and %{y}\n")).toEqual(["%{x-{}", "%{y}"]);
    expect(named("/echo F5:%{x-$[1]} F6:%{x-${y}}\n")).toEqual(["%{x-$[1]}", "%{x-${y}}"]);
  });
});
