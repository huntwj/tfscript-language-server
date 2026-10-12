import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

/**
 * Regression tests for two facts about tf's file loader (tinyfugue/src/command.c,
 * load_file()), confirmed by reading that function and by running tf-script-check directly
 * — not by guessing from scripting.md, which undersold both:
 *  - a line is a comment, and contributes nothing, when its first non-whitespace character
 *    is `;` or `#` (not just the `;;` convention the test-case headers happen to use);
 *  - backslash continuation joins any top-level line onto the next, /def or not.
 */

function codes(text: string): string[] {
  return getDiagnostics(text).map((d) => d.code);
}

describe("comment lines", () => {
  it("does not scan a ;; comment line for rule violations", () => {
    const text = ';; rule: %{var} is not expanded; /if without /endif looks bad here too\n/echo ok\n';
    expect(codes(text)).toEqual([]);
  });

  it("does not scan a # comment line either", () => {
    const text = "# /if (1) /let v=1 /endif, all on a comment line\n/echo ok\n";
    expect(codes(text)).toEqual([]);
  });

  it("skips a comment line in the middle of a continuation without breaking it", () => {
    const text = [
      "/if (1) \\",
      ";; this line should be skipped, not joined in",
      "/echo yes%; \\",
      "/endif",
      "",
    ].join("\n");
    expect(codes(text)).not.toContain("if-multiline-top-level");
  });
});

describe("backslash continuation at the top level (not just inside /def)", () => {
  it("is clean for a plain /if continued with backslashes, no /def involved", () => {
    // Proven by running tf-script-check directly on this exact script (2026-10-11): 0 problems.
    const text = ["/if (1) \\", "/echo yes%; \\", "/endif", ""].join("\n");
    expect(codes(text)).not.toContain("if-multiline-top-level");
  });

  it("still flags a genuinely unterminated /if even when it could have continued", () => {
    const text = ["/if (1)", "/echo yes", ""].join("\n");
    expect(codes(text)).toContain("if-multiline-top-level");
  });
});
