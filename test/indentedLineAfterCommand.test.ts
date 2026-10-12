import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

/**
 * Mirrors tests/tfscript/cases/indented-line-after-command.tf (added 2026-10-11): tf warns
 * "possibly missing trailing \" when an indented line starts a new
 * top-level command right after one that did not continue.
 */
function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

describe("indented-line-after-command", () => {
  it("flags an indented line right after a non-continuing command", () => {
    const text = ["/echo first", "  /echo second", ""].join("\n");
    expect(codes(text)).toContain("indented-line-after-command");
  });

  it("does not flag an indented line that is a backslash continuation", () => {
    const text = ["/if (1) \\", "  /echo yes%; \\", "/endif", ""].join("\n");
    expect(codes(text)).not.toContain("indented-line-after-command");
  });

  it("does not flag the very first line of a file, even if indented", () => {
    const text = "  /echo first\n";
    expect(codes(text)).not.toContain("indented-line-after-command");
  });

  it("does not flag an indented comment line", () => {
    const text = ["/echo first", "   ; a comment, not a command", ""].join("\n");
    expect(codes(text)).not.toContain("indented-line-after-command");
  });

  it("resets after a blank line", () => {
    const text = ["/echo first", "", "  /echo second", ""].join("\n");
    expect(codes(text)).not.toContain("indented-line-after-command");
  });
});
