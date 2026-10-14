import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";
import { splitLogicalEntries } from "../src/logicalEntries";

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

describe("isDefBody / isForLoop recognise a /def or /for whose first physical line is blank", () => {
  // command.c's load_file() reads /def's name and %{var} expansion as one joined command
  // regardless of which physical line the leading /def actually falls on, so checking only
  // parts[0] (the lone "\" line) would wrongly treat a leading-blank-line /def as an ordinary
  // top-level command and flag its %{x} as not-substituted-here.
  it("still recognises a /def whose entry starts with a lone continuation line", () => {
    const text = ["\\", "/def foo = /echo %{x}", ""].join("\n");
    const [entry] = splitLogicalEntries(text);
    expect(entry?.isDefBody).toBe(true);
    expect(codes(text)).not.toContain("not-substituted-here");
  });

  it("still recognises a /for whose entry starts with a lone continuation line", () => {
    const text = ["\\", "/for i 0 2 /echo %{i}", ""].join("\n");
    const [entry] = splitLogicalEntries(text);
    expect(entry?.isForLoop).toBe(true);
    expect(codes(text)).not.toContain("not-substituted-here");
  });
});

describe("continuation lines have their leading whitespace stripped, same as tf's loader", () => {
  // command.c strips leading whitespace from every physical line before appending it to the
  // joined command (`for (i = 0; is_space(line->data[i]); i++)` runs unconditionally, not
  // only for continuation lines), so indentation on a continuation line must not survive into
  // the joined text — otherwise it can splice stray whitespace into the middle of a token.
  it("does not insert the continuation line's indentation into the joined text", () => {
    const text = ["/if (1) /echo x%; /end\\", "   if", ""].join("\n");
    const [entry] = splitLogicalEntries(text);
    expect(entry?.text).toBe("/if (1) /echo x%; /endif");
    expect(codes(text)).not.toContain("if-multiline-top-level");
  });

  it("still maps offsets in the joined text back to the right original position", () => {
    const secondLine = "   /echo yes%{x}";
    const text = ["/if (1) \\", secondLine, ""].join("\n");
    const [entry] = splitLogicalEntries(text);
    expect(entry).toBeDefined();
    const percentOffset = entry!.text.indexOf("%{x}");
    expect(entry!.offsetMap[percentOffset]).toEqual({
      line: 1,
      character: secondLine.indexOf("%{x}"), // the original, unstripped column
    });
  });
});

describe("CRLF line endings", () => {
  // Confirmed live: tf's own line reader (tfio.c's tfgetS()) only breaks a line on `\n`, so a
  // `\r` left over from a CRLF line stays on as the line's literal last byte. A real
  // CRLF-encoded version of the exact script already proven clean as LF instead produced 4
  // problem lines from real tf: every `\`-continuation broke (each `\<CR>` is "whitespace
  // following final '\'", not a continuation), and the entry's reassembled command — three
  // independent, broken commands instead of one joined /if...endif — was a macro syntax error.
  it("does not treat a backslash followed by \\r as a continuation", () => {
    const text = ["/if (1) \\\r", "/echo yes%; \\\r", "/endif\r", ""].join("\n");
    expect(codes(text)).toContain("if-multiline-top-level"); // /if and /endif never join
    expect(codes(text)).toContain("trailing-space-after-backslash"); // \<CR> warns, same as \<space>
  });

  it("still loads the equivalent LF script clean, for comparison", () => {
    const text = ["/if (1) \\", "/echo yes%; \\", "/endif", ""].join("\n");
    expect(codes(text)).toEqual([]);
  });

  it("treats a lone trailing \\r as a blank line, same as tf's is_space()", () => {
    const text = ["/echo first", "\r", "/echo second", ""].join("\n");
    expect(codes(text)).not.toContain("bare-line-after-command");
  });
});
