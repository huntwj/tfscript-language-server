import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

const CODE = "body-continues-without-backslash";
const diags = (lines: string[]) => getDiagnostics(`${lines.join("\n")}\n`).filter((d) => d.code === CODE);

function applyEdits(text: string, edits: { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[]): string {
  const lines = text.split("\n");
  for (const e of [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character)) {
    const line = lines[e.range.start.line] ?? "";
    lines[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return lines.join("\n");
}

// Proven in tf dev, 2026-10-14: the next line runs at load, and tf says nothing; with " \" added
// it is part of the body; `%%;` is text, so a body ending in it doesn't count.
describe("body-continues-without-backslash", () => {
  it("notes a body ending in %; with a command on the next line, and the fix joins them", () => {
    const text = ["/def p07 = /echo one%;", "/echo two", "/p07", ""].join("\n");
    const [d, ...rest] = getDiagnostics(text).filter((x) => x.code === CODE);
    expect(rest).toEqual([]);
    expect(d?.severity).toBe("information");
    expect(d?.range.start).toEqual({ line: 0, character: 20 });
    expect(d?.message).toBe("The macro body ends here, so line 2 is a command of its own, run when the file loads: end this line with \\ if it belongs to the body.");
    const fixed = applyEdits(text, d!.fix!.edits);
    expect(fixed).toBe(["/def p07 = /echo one%; \\", "/echo two", "/p07", ""].join("\n"));
    expect(getDiagnostics(fixed)).toEqual([]);
  });

  it("leaves bodies that end on purpose, or that other rules cover", () => {
    expect(diags(["/def a = /echo one%; \\", "", "/echo two"])).toEqual([]); // ended by a blank line
    expect(diags(["/def a = /echo 100%%;", "/echo two"])).toEqual([]); // %%; is text
    expect(diags(["/def a = /echo a\\%;", "/echo two"])).toEqual([]); // \%; is text
    expect(diags(["/def a = /echo one%;", "    /echo two"])).toEqual([]); // indented-line-after-command's
    expect(diags(["/def a = /echo one%;", "; a note"])).toEqual([]);
    expect(diags(["/def a = /echo one", "/echo two"])).toEqual([]);
    expect(diags(["/echo one%;", "/echo two"])).toEqual([]); // not a body
    expect(diags(["/def -i go = /echo one%;", "/go"])).toEqual([]); // runs the macro just defined
    // Another definition is a new macro, not more of this body.
    for (const next of ["/def p08 = /echo two", "/bind ^A = /echo a", "/hook CONNECT = /echo c", "/trig x = /echo t", "/alias aa /echo a"]) {
      expect(diags(["/def p07 = /echo one%;", next])).toEqual([]);
    }
  });

  it("strips trailing blanks in the fix, so the \\ is last", () => {
    const [d] = diags(["/def a = /echo one%;  ", "/echo two"]);
    expect(d?.fix?.edits[0]).toMatchObject({ range: { start: { line: 0, character: 20 }, end: { line: 0, character: 22 } }, newText: " \\" });
  });
});
