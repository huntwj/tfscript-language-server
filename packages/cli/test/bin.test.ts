import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES, runBin } from "./fixtures";

describe("the built tfscript bin", () => {
  it("reports a folder's diagnostics as lines and exits 1 on errors", () => {
    const { status, stdout, stderr } = runBin(["check", "--library-path", "../tflib", "."]);
    expect(stdout).toBe(
      [
        "main.tf:3:24: warning undefined-macro: There's no macro or command /gret: did you mean /greet?",
        "main.tf:3:46: information undefined-macro: /extra is defined in extra.tf, which isn't on this file's load path: add /require extra.tf.",
        "main.tf:4:6: error invalid-macro-name: This /def has no = after its name, so tf takes all of \"oops /echo the\" as the name, which can't hold a space, and defines nothing: put = after oops.",
        "tfrc:4:7: warning unresolved-load: tf won't find \"missing.tf\": fix the path, or give --working-directory the folder tf runs in.",
        "",
      ].join("\n"),
    );
    expect(stderr).toBe("1 error, 2 warnings, 1 note in 4 files.\n");
    expect(status).toBe(1);
  });

  it("writes JSON, exits 0 without errors, and 2 on a bad command line", () => {
    const json = runBin(["check", "--format=json", "--root", "ws", "ws/tfrc", "ws/lib.tf"], FIXTURES);
    expect(json.status).toBe(0);
    const report = JSON.parse(json.stdout) as { files: string[]; diagnostics: { file: string; code: string; range: { start: { line: number; column: number; offset: number } } }[] };
    expect(report.files).toEqual([path.join("ws", "lib.tf"), path.join("ws", "tfrc")]);
    expect(report.diagnostics).toMatchObject([{ file: path.join("ws", "tfrc"), code: "unresolved-load", range: { start: { line: 4, column: 7, offset: 80 } } }]);

    const bad = runBin(["check"]);
    expect(bad).toEqual({ status: 2, stdout: "", stderr: "tfscript: Nothing to check: name the .tf files or folders, as in tfscript check tfrc scripts/.\n" });
    expect(runBin(["--help"]).stdout).toContain("Usage: tfscript check [options] <file or folder>...");
  });
});
