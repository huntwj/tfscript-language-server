import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

describe("trailing-space-after-backslash", () => {
  it("flags whitespace after a final backslash", () => {
    const text = ["/echo before \\ ", "/echo after", ""].join("\n");
    expect(codes(text)).toContain("trailing-space-after-backslash");
  });

  it("does not flag a real continuation (backslash is the literal last char)", () => {
    const text = ["/if (1) \\", "/echo yes%; \\", "/endif", ""].join("\n");
    expect(codes(text)).not.toContain("trailing-space-after-backslash");
  });

  it("does not flag a line with no backslash at all", () => {
    expect(codes("/echo hello\n")).not.toContain("trailing-space-after-backslash");
  });
});

describe("bare-line-after-command", () => {
  it("flags a line that is not blank, a comment, or a command", () => {
    const text = ["/echo first", "tfscw localhost 4000", "/echo never", ""].join("\n");
    expect(codes(text)).toContain("bare-line-after-command");
  });

  it("does not flag ordinary commands, comments, and blank lines", () => {
    const text = ["/echo first", "", "; a comment", "/echo second", ""].join("\n");
    expect(codes(text)).not.toContain("bare-line-after-command");
  });

  it("suppresses diagnostics for everything after the abort line, since tf never reads it", () => {
    // The line after the bare line has an obvious rule-2 violation that would normally be
    // flagged, but tf never gets there once it aborts.
    const text = [
      "/echo first",
      "tfscw localhost 4000",
      '/if (x =~ "")',
      "/endif",
      "",
    ].join("\n");
    const found = codes(text);
    expect(found).toContain("bare-line-after-command");
    expect(found).not.toContain("if-multiline-top-level");
  });

  it("does not flag a /def body, which starts with /", () => {
    expect(codes("/def tfsc_f = /echo hi\n")).not.toContain("bare-line-after-command");
  });
});
