import { describe, expect, it } from "vitest";
import { getCodeActions } from "../src/codeActions";
import { getDiagnostics } from "../src/diagnostics";
import { formatText } from "../src/formatting";
import { fileLineCount, splitLogicalEntries, splitRawLines } from "../src/logicalEntries";
import { getDocumentSymbols } from "../src/symbols";

const ALL = { start: { line: 0, character: 0 }, end: { line: 9999, character: 0 } };
const FORMAT = { indent: "    ", splitStatements: true };
const shape = (text: string) => splitLogicalEntries(text).map((e) => `${e.startLine}-${e.endLine}${e.incomplete ? " incomplete" : ""}`);

/**
 * The empty piece after a final newline is not a line tf reads (proven 2026-10-14 with
 * tf-script-check: `/def -i z1 = /echo a%;\`, `/echo b\` and a final newline defined no z1, and
 * tf said "last command is incomplete because of trailing \"; with a real blank line after the
 * last `\` instead, the macro was defined).
 */
describe("the end of the file", () => {
  it("counts the lines tf reads", () => {
    expect(fileLineCount(splitRawLines("a\nb\n"))).toBe(2);
    expect(fileLineCount(splitRawLines("a\nb"))).toBe(2);
    expect(fileLineCount(splitRawLines("a\n\n"))).toBe(2);
    expect(fileLineCount(splitRawLines(""))).toBe(0);
  });

  it("doesn't let a final newline complete a continued command", () => {
    expect(shape("/def -i z = /echo a%;\\\n    /echo b\\\n")).toEqual(["0-1 incomplete"]);
    expect(shape("/def -i z = /echo a%;\\\n    /echo b\\")).toEqual(["0-1 incomplete"]);
    expect(shape("/def -i z = /echo a%;\\\n; a comment\n")).toEqual(["0-0 incomplete"]);
  });

  it("lets a real blank line complete one", () => {
    expect(shape("/def -i z = /echo a%;\\\n    /echo b\\\n\n")).toEqual(["0-2"]);
  });

  it("makes no entry of the empty piece after a final newline", () => {
    expect(shape("/echo a\n")).toEqual(["0-0"]);
    expect(shape("/echo a\n\n")).toEqual(["0-0", "1-1"]);
  });

  it("leaves a macro tf drops out of the outline", () => {
    expect(getDocumentSymbols("/def -i z = /echo a%;\\\n    /echo b\\\n").map((s) => s.name)).toEqual([]);
  });
});

describe("incomplete-continuation", () => {
  for (const eol of ["", "\n"]) {
    it(`warns on the last command's \\${eol ? " before a final newline" : " at the very end"}, with a fix`, () => {
      const text = `/echo first\n/def -i z = /echo a%;\\\n    /echo b\\${eol}`;
      const [d] = getDiagnostics(text);
      expect(d).toMatchObject({
        code: "incomplete-continuation",
        severity: "warning",
        message: "The last command ends in \\, so tf drops it: remove the \\ or add the rest of the command.",
        range: { start: { line: 2, character: 11 }, end: { line: 2, character: 12 } },
      });
      const [action] = getCodeActions(text, d!.range);
      expect(action?.title).toBe("Remove the \\");
      expect(action?.edits).toEqual([{ range: d!.range, newText: "" }]);
    });
  }

  it("is quiet when the command is complete", () => {
    expect(getDiagnostics("/def -i z = /echo a%;\\\n    /echo b\n")).toEqual([]);
    expect(getDiagnostics("/def -i z = /echo a%;\\\n    /echo b\\\n\n")).toEqual([]);
  });

  it("isn't reported past a line that aborts the load", () => {
    expect(getDiagnostics("hello\n/def -i z = /echo a%;\\\n").map((d) => d.code)).toEqual(["not-a-command"]);
  });
});

describe("formatting at the end of the file", () => {
  it("leaves a command tf drops alone", () => {
    expect(formatText("/def -i z = /echo a%; /echo b%;\\\n", FORMAT)).toEqual([]);
  });

  for (const eol of ["", "\n"]) {
    it(`keeps a body's final %; on its last line${eol ? " (final newline)" : " (no final newline)"}`, () => {
      const [edit] = formatText(`/def -i z = /echo a%; /echo b%; ${eol}`, FORMAT);
      expect(edit?.newText).toBe("/def -i z = \\\n    /echo a%;\\\n    /echo b%;");
      expect(edit?.range.end).toEqual({ line: 0, character: 32 });
    });
  }
});
