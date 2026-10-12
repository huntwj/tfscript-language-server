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

  // Regression: findAbortEntry used to look only at an entry's first physical part, so a
  // continuation whose first line is itself blank (just a lone `\`) was wrongly treated as a
  // blank entry and the abort was missed, even though tf joins it with the next line and
  // sees the same bare command.
  it("detects the abort even when the aborting entry's first physical line is just a backslash", () => {
    const text = ["\\", "tfscw localhost 4000", ""].join("\n");
    expect(codes(text)).toContain("bare-line-after-command");
  });

  // Regression: tf reads every physical line of the aborting entry (joining any backslash
  // continuation) before it checks the assembled command and aborts, so the other rules'
  // truncation boundary has to be the entry's LAST line, not wherever its first non-blank
  // character happens to land.
  it("still runs file-scoped rules on every physical line of the aborting entry itself", () => {
    const text = ["/echo first", "  tfscw localhost 4000", ""].join("\n");
    const found = codes(text);
    expect(found).toContain("bare-line-after-command");
    expect(found).toContain("indented-line-after-command");
  });

  it("truncates after the aborting entry's last continued line, not its first", () => {
    const text = ["tfscw localhost 4000 \\", "/more", "/echo never", ""].join("\n");
    const found = codes(text);
    expect(found).toContain("bare-line-after-command");
    // Nothing on or after the never-read third line should be flagged.
    expect(found).not.toContain("if-multiline-top-level");
  });

  // Confirmed live: a trailing `\` at the true end of the file never reaches tf's
  // invalid-command check at all — load_file()'s abort check only runs once a command is
  // *completed* by a non-continuing line, and this one never is. tf just warns "last command
  // is incomplete because of trailing \" and drops it; it does not abort the file.
  it("does not abort on a trailing backslash with nothing left to join it to", () => {
    const text = "/echo a\nfoo \\";
    expect(codes(text)).not.toContain("bare-line-after-command");
  });

  it("does still abort when a trailing backslash joins onto more invalid content", () => {
    const text = ["/echo a", "foo \\", "/echo b", ""].join("\n");
    expect(codes(text)).toContain("bare-line-after-command");
  });
});
