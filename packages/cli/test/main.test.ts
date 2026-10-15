import { describe, expect, it } from "vitest";
import { EXIT_OK, EXIT_PROBLEMS, EXIT_USAGE, main } from "../src/main";
import { USAGE } from "../src/usage";
import { testHost, WS } from "./fixtures";

function run(argv: string[]): { code: number; out: string; err: string } {
  let out = "";
  let err = "";
  const code = main(argv, { cwd: WS, out: (t) => (out += t), err: (t) => (err += t) }, testHost());
  return { code, out, err };
}

describe("main", () => {
  it("exits 1 when there are errors, after printing every diagnostic and a summary on stderr", () => {
    const { code, out, err } = run(["check", "--library-path", "../tflib", "."]);
    expect(code).toBe(EXIT_PROBLEMS);
    expect(out.trimEnd().split("\n")).toHaveLength(4);
    expect(out).toContain("main.tf:4:6: error invalid-macro-name: ");
    expect(err).toBe("1 error, 2 warnings, 1 note in 4 files.\n");
  });

  it("exits 0 when there are only warnings, unless --max-warnings is exceeded", () => {
    expect(run(["check", "tfrc"]).code).toBe(EXIT_OK);
    expect(run(["check", "--max-warnings", "1", "tfrc"]).code).toBe(EXIT_OK);
    const over = run(["check", "--max-warnings", "0", "tfrc"]);
    expect(over.code).toBe(EXIT_PROBLEMS);
    expect(over.err).toContain("tfscript: 1 warning is more than --max-warnings 0 allows: fix some, or raise the limit.\n");
  });

  it("prints nothing for a clean file", () => {
    expect(run(["check", "lib.tf"])).toEqual({ code: EXIT_OK, out: "", err: "" });
  });

  it("prints one JSON report, and no summary", () => {
    const { code, out, err } = run(["check", "--format", "json", "--library-path", "../tflib", "main.tf", "lib.tf"]);
    expect(code).toBe(EXIT_PROBLEMS);
    expect(err).toBe("");
    const report = JSON.parse(out) as { files: string[]; diagnostics: { code: string }[] };
    // In the human format's order: by file, then line, then column.
    expect(report.files).toEqual(["lib.tf", "main.tf"]);
    expect(report.diagnostics.map((d) => d.code)).toEqual(["undefined-macro", "undefined-macro", "invalid-macro-name"]);
  });

  it("exits 2 on a wrong command line or a path it can't check, saying why", () => {
    expect(run(["check", "--fix", "a.tf"])).toEqual({ code: EXIT_USAGE, out: "", err: "tfscript: There's no option --fix: run tfscript --help to see the options.\n" });
    const missing = run(["check", "missing.tf", "main.tf"]);
    expect(missing.code).toBe(EXIT_USAGE);
    expect(missing.out).toContain("main.tf:4:6: error");
    expect(missing.err).toContain("tfscript: missing.tf doesn't exist: check the path.\n");
  });

  it("prints the usage and the version", () => {
    expect(run(["--help"])).toEqual({ code: EXIT_OK, out: USAGE, err: "" });
    expect(run(["--version"])).toEqual({ code: EXIT_OK, out: "0.2.0\n", err: "" });
  });
});
