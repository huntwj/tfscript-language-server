import * as path from "node:path";
import { describe, expect, it } from "vitest";
import type { TfDiagnostic } from "@tfscript/core/diagnostics";
import type { CheckedFile } from "../src/check";
import { displayPath, formatHuman, formatSummary, inOrder, summarize, toJsonReport } from "../src/format";

const CWD = path.resolve("/work");
const at = (line: number, character: number) => ({ line, character });

const error: TfDiagnostic = {
  range: { start: at(1, 5), end: at(1, 9) },
  message: "This /def has no = after its name.",
  code: "invalid-macro-name",
  severity: "error",
  fix: { title: "Put = after oops", edits: [] },
  related: [{ range: { start: at(0, 0), end: at(0, 2) }, message: "here" }],
};
const pair: TfDiagnostic = {
  range: { start: at(2, 0), end: at(2, 3) },
  message: "Two readings.",
  code: "keyword-needs-space",
  severity: "warning",
  fix: { title: "Add a space", edits: [] },
  alternative: { title: "Escape it", edits: [] },
};
const unknownCode: TfDiagnostic = { range: { start: at(0, 0), end: at(0, 0) }, message: "Noted.", code: "not-in-the-table", severity: "information" };

const files: CheckedFile[] = [
  // Out of order, as core may give them: inOrder() sorts them.
  { file: path.join(CWD, "sub", "a.tf"), text: "ab\n/def oops /echo\n/if\n", diagnostics: [pair, error] },
  { file: path.join(CWD, "b.tf"), text: "", diagnostics: [unknownCode] },
  { file: path.join(CWD, "clean.tf"), text: "", diagnostics: [] },
];

describe("the human format", () => {
  it("prints path:line:col: severity code: message, 1-based, a path relative to the current folder when inside it", () => {
    expect(formatHuman(files, CWD)).toBe(
      [
        "b.tf:1:1: information not-in-the-table: Noted.",
        `${path.join("sub", "a.tf")}:2:6: error invalid-macro-name: This /def has no = after its name.`,
        `${path.join("sub", "a.tf")}:3:1: warning keyword-needs-space: Two readings.`,
        "",
      ].join("\n"),
    );
    expect(displayPath(CWD, CWD)).toBe(CWD);
    expect(displayPath(path.resolve("/elsewhere/b.tf"), CWD)).toBe(path.resolve("/elsewhere/b.tf"));
  });

  it("names a file whose name starts with .. relative, and one above the current folder absolute", () => {
    expect(displayPath(path.join(CWD, "..x.tf"), CWD)).toBe("..x.tf");
    expect(displayPath(path.join(CWD, "..", "x.tf"), CWD)).toBe(path.join(CWD, "..", "x.tf"));
  });

  it("sorts by file, then line, then column, keeping core's order at the same place", () => {
    const d = (line: number, character: number, code: string): TfDiagnostic => ({
      range: { start: at(line, character), end: at(line, character) },
      message: "",
      code,
      severity: "warning",
    });
    const sorted = inOrder(
      [
        { file: path.join(CWD, "y.tf"), text: "", diagnostics: [] },
        { file: path.join(CWD, "x.tf"), text: "", diagnostics: [d(1, 5, "a"), d(0, 3, "b"), d(1, 0, "c"), d(1, 5, "d")] },
      ],
      CWD,
    );
    expect(sorted.map((f) => path.basename(f.file))).toEqual(["x.tf", "y.tf"]);
    expect(sorted[0]?.diagnostics.map((x) => x.code)).toEqual(["b", "c", "a", "d"]);
  });

  it("sums up what it found", () => {
    expect(summarize(files)).toEqual({ files: 3, errors: 1, warnings: 1, information: 1 });
    expect(formatSummary(summarize(files))).toBe("1 error, 1 warning, 1 note in 3 files.\n");
    expect(formatSummary({ files: 1, errors: 2, warnings: 0, information: 3 })).toBe("2 errors, 0 warnings, 3 notes in 1 file.\n");
  });
});

describe("the JSON format", () => {
  it("gives each diagnostic its file, range with offsets, code link and fix titles", () => {
    const report = toJsonReport(files, CWD);
    expect(report.version).toBe(1);
    expect(report.problems).toEqual([]);
    expect(toJsonReport(files, CWD, ["x.tf doesn't exist: check the path."]).problems).toEqual(["x.tf doesn't exist: check the path."]);
    expect(report.files).toEqual(["b.tf", "clean.tf", path.join("sub", "a.tf")]);
    expect(report.summary).toEqual({ files: 3, errors: 1, warnings: 1, information: 1 });
    expect(report.diagnostics[0]).toMatchObject({ file: "b.tf", codeDescription: null, fixes: [], related: [] });
    expect(report.diagnostics[1]).toEqual({
      file: path.join("sub", "a.tf"),
      range: { start: { line: 2, column: 6, offset: 8 }, end: { line: 2, column: 10, offset: 12 } },
      severity: "error",
      code: "invalid-macro-name",
      message: "This /def has no = after its name.",
      codeDescription: { href: "https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md#invalid-macro-name" },
      fixes: ["Put = after oops"],
      related: [{ range: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 3, offset: 2 } }, message: "here" }],
    });
    expect(report.diagnostics[2]?.fixes).toEqual(["Add a space", "Escape it"]);
    // The offset is into the text as read, so it finds the diagnostic's text.
    const oops = report.diagnostics[1];
    expect(files[0]?.text.slice(oops?.range.start.offset, oops?.range.end.offset)).toBe("oops");
  });
});
