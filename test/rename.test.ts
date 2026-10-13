import { describe, expect, it } from "vitest";
import { getRenameEdits, prepareRename, type TextEditAt } from "../src/navigation";

const pos = (line: number, character: number) => ({ line, character });

/** Applies edits to a single-file text (all edits have uri ""), last-first. */
function apply(text: string, edits: TextEditAt[]): string {
  const lines = text.split("\n");
  const ordered = [...edits].sort(
    (a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character,
  );
  for (const e of ordered) {
    const line = lines[e.range.start.line] ?? "";
    lines[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return lines.join("\n");
}

function rename(text: string, at: { line: number; character: number }, newName: string): string {
  const edits = getRenameEdits(text, at, newName);
  if ("error" in edits) throw new Error(edits.error);
  return apply(text, edits);
}

describe("rename", () => {
  const text = ["/def -i greet = /echo hi", "/greet bob", "/GREET", "/@greet", "/echo ${greet} $greet", ""].join("\n");

  it("renames the /def, every call (any case) and both substitution forms, but not /@ calls", () => {
    expect(rename(text, pos(1, 2), "welcome")).toBe(
      ["/def -i welcome = /echo hi", "/welcome bob", "/welcome", "/@greet", "/echo ${welcome} $welcome", ""].join("\n"),
    );
  });

  it("works from the /def name itself", () => {
    expect(rename(text, pos(0, 9), "welcome")).toContain("/welcome bob");
  });

  it("braces a bare $name when the new name is not a plain identifier", () => {
    expect(rename(text, pos(1, 2), "say.hi")).toContain("/echo ${say.hi} ${say.hi}");
  });

  it("leaves comments alone", () => {
    const withDoc = [";;; /greet <name>", "/def greet = /echo", "/greet", ""].join("\n");
    expect(rename(withDoc, pos(2, 2), "hello")).toBe([";;; /greet <name>", "/def hello = /echo", "/hello", ""].join("\n"));
  });

  it("rejects new names tf would not read as a macro name", () => {
    for (const bad of ["two words", "a=b", "x%y", "", "a;b"]) {
      expect(getRenameEdits(text, pos(1, 2), bad), bad).toHaveProperty("error");
    }
  });
});

describe("prepareRename", () => {
  it("returns the name's range and current spelling", () => {
    expect(prepareRename("/def greet = /echo\n/Greet\n", pos(1, 3))).toEqual({
      range: { start: pos(1, 1), end: pos(1, 6) },
      placeholder: "Greet",
    });
  });

  it("refuses built-ins, /@ calls, and names with no /def to rename alongside", () => {
    expect(prepareRename("/echo hi\n", pos(0, 2))).toMatchObject({ error: expect.stringContaining("tf command") });
    expect(prepareRename("/def x = 1\n/@x\n", pos(1, 2))).toMatchObject({ error: expect.stringContaining("built-in") });
    expect(prepareRename("/nosuch\n", pos(0, 2))).toMatchObject({ error: expect.stringContaining("No /def") });
    expect(prepareRename("/echo hi\n", pos(0, 7))).toMatchObject({ error: expect.stringContaining("cursor") });
  });
});
