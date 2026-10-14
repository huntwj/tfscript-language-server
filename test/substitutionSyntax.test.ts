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

  // Proven live (review rev-s2b q5): stdlib compiles VAR and START as `/let VAR=START` and END in
  // `/while ( VAR <= END )`, so tf rejects each of these, as it does a broken COMMAND.
  it("reads a /for's VAR, START and END where stdlib puts them", () => {
    const found = (text: string) =>
      getDiagnostics(text)
        .filter((d) => d.severity === "error")
        .map((d) => `${d.code}@${d.range.start.character}`);
    expect(found("/for i %{q 2 /echo %% R1:%i\n")).toEqual(["substitution-syntax@7"]);
    expect(found("/for i 1 $[1+ /echo %% R2:%i\n")).toEqual(["expression-syntax@12"]);
    expect(found("/for %{x 1 1 /echo %% R10:%i\n")).toEqual(["substitution-syntax@5"]);
    expect(getDiagnostics("/for %{x 1 1 /echo x\n")[0]?.message).toBe("This %{ needs its } before the '='.");
    expect(found("/for i 1 1 /echo %% R11 $[1+\n")).toEqual(["expression-syntax@24"]);
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

  // Proven live (review rev-s2b q1e): under /eval each default is read to its own }, however long,
  // and the %{y} after it is a substitution of its own.
  it("reads a %{...} to the end of its statement, however long its default", () => {
    const named = (text: string) =>
      getDiagnostics(text)
        .filter((d) => d.code === "not-substituted-here")
        .map((d) => text.slice(d.range.start.character, d.range.end.character).length);
    const long = "A".repeat(5000);
    expect(named(`/echo Q1:%{x-${long}}\n`)).toEqual([5005]);
    expect(named(`/echo Q2:%{x-{${long}} Q2b:%{y}\n`)).toEqual([5006, 4]);
  });

  it("skips a %{ it can't read to where tf would end it, and reads on after it", () => {
    const named = (text: string) =>
      getDiagnostics(text)
        .filter((d) => d.code === "not-substituted-here")
        .map((d) => text.slice(d.range.start.character, d.range.end.character));
    // The %{bar} is the glued substitution's own; the %{y} after the } that ends it is not.
    expect(named("/echo %{foo%{bar}} %{y}\n")).toEqual(["%{y}"]);
    expect(named("/echo %{foo%{bar}x} %{y}\n")).toEqual(["%{y}"]);
  });

  it("stays near-linear on a line with thousands of %{...}", () => {
    const text = `/echo ${"%{x} ".repeat(5000)}%{x%{y}} ${"%{x-%{y}} ".repeat(5000)}\n`;
    const start = Date.now();
    expect(getDiagnostics(text).filter((d) => d.code === "not-substituted-here")).toHaveLength(10000);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  // Review rev-s2c: skipping one it can't read recursed once per %{ nested in it, which overflowed
  // the stack on this line and took every diagnostic of the file with it.
  it("skips thousands of unclosed %{ without overflowing the stack", () => {
    const codes = getDiagnostics(`/echo ${"%{x ".repeat(12000)}\n/def a = /echo $[1+2\n`).map((d) => d.code);
    expect(codes).toEqual(["expression-syntax"]);
  });

  // Proven live (s2/r/v.tf): /eval /echo %{x-} %{x%{y}} is "unmatched { or illegal character '%'",
  // where the line without /eval prints as it is.
  it("offers no substituting fix for a command /eval couldn't read", () => {
    const [plain] = getDiagnostics("/echo %{x-} %{x%{y}}\n").filter((d) => d.code === "not-substituted-here");
    expect(plain?.fix).toBeUndefined();
    const [soff] = getDiagnostics("/eval -soff /echo %{x-} %{x%{y}}\n").filter((d) => d.code === "not-substituted-here");
    expect(soff?.fix).toBeUndefined();
    expect(getDiagnostics("/echo %{x-} %{y}\n").find((d) => d.code === "not-substituted-here")?.fix?.title).toBe(
      "Put /eval in front of the command",
    );
  });

  // Proven live (s2/r/w.tf): each line prints its text as it is, and each with /eval in front, or
  // without its -soff, is an error ("unmatched { or illegal character", "expected operand").
  it("words the message without the /eval advice there, naming what tf couldn't read", () => {
    const message = (text: string) => getDiagnostics(text).find((d) => d.code === "not-substituted-here")?.message;
    expect(message("/echo %{x-} %{x%{y}}\n")).toBe(
      "%{x-} stays as it is in a command at the top level of a file, and /eval would reject this command as written: fix %{x%{y}} first.",
    );
    expect(message("/eval -soff /echo %{x-} %{x%{y}}\n")).toBe(
      "%{x-} stays as it is in /eval -soff text, and without -s tf would reject this text as written: fix %{x%{y}} first.",
    );
    expect(message("/if (1) /echo %{x-} %{x y%; /endif\n")).toBe(
      "%{x-} stays as it is in a top-level /if or /while line, and /eval would reject this command as written: fix %{x first.",
    );
    expect(message("/echo %{x-} $[1+\n")).toBe(
      "%{x-} stays as it is in a command at the top level of a file, and /eval would reject this command as written: fix $[1+ first.",
    );
  });

  // Proven live (s2/r/x.tf): inside a top-level /if line /eval gets each run of %s one shorter, so
  // %%{y reaches it as %{y ("unmatched { or bad substitution"), and %%%{y as %%{y, which is text.
  it("reads the command as an /if line hands it to /eval", () => {
    const fixOf = (text: string) => getDiagnostics(text).find((d) => d.code === "not-substituted-here");
    const ifLine = fixOf("/if (1) /echo %%%% X1:%{x} %%{y%; /endif\n");
    expect(ifLine?.message).toBe(
      "%{x} stays as it is in a top-level /if or /while line, and /eval would reject this command as written: fix %%{y first.",
    );
    expect(ifLine?.fix).toBeUndefined();
    expect(fixOf("/if (1) /eval -s0 /echo %% X2:%{x} %%{y%; /endif\n")?.fix).toBeUndefined();
    expect(fixOf("/if (1) /echo %%%% X3:%{x} %%%{y%; /endif\n")?.fix?.title).toBe("Put /eval in front of the command");
  });

  // Review rev-s2b q7: each of these is rejected under /eval (proven, s2/r/q7all.tf).
  it("names what tf couldn't read from the opener of the substitution it is in", () => {
    const named = (text: string) =>
      /fix (.*) first\.$/.exec(getDiagnostics(text).find((d) => d.code === "not-substituted-here")?.message ?? "")?.[1];
    expect(named("/echo T18:%{x} $[%y + (]\n")).toBe("$[%y + (]");
    expect(named("/echo T16:%{x} $[(1]\n")).toBe("$[(1]");
    expect(named("/echo T21:%{x} %{y-$[}\n")).toBe("%{y-$[}");
    expect(named("/echo T13:%{x} ${y\n")).toBe("${y");
  });
});
