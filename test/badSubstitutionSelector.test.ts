import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

describe("bad-substitution-selector", () => {
  it("flags a second substitution glued directly onto a %{selector}", () => {
    expect(codes("/def f = /echo %{foo%{bar}}\n")).toContain("bad-substitution-selector");
    expect(codes("/def f = /echo %{foo$[1+1]}\n")).toContain("bad-substitution-selector");
  });

  it("points at the offending sigil only", () => {
    const [d] = getDiagnostics("/def f = /echo %{foo%{bar}}\n").filter((x) => x.code === "bad-substitution-selector");
    expect(d?.range).toEqual({ start: { line: 0, character: 20 }, end: { line: 0, character: 21 } });
  });

  it("accepts nesting through the default value", () => {
    expect(codes("/def f = /echo %{foo-%{bar}}\n")).not.toContain("bad-substitution-selector");
  });

  it("does not treat the '-' default separator as part of the selector (no range form exists)", () => {
    expect(codes("/def f = /echo %{2-%{1}}\n")).not.toContain("bad-substitution-selector");
  });

  it("ignores %%{ (percent compression), not a fresh substitution", () => {
    expect(codes("/def f = /echo %%{foo%{bar}}\n")).not.toContain("bad-substitution-selector");
  });

  it("accepts a plain selector", () => {
    expect(codes("/def f = /echo %{foo} %{1} %{*} %{-L1}\n")).not.toContain("bad-substitution-selector");
  });
});
