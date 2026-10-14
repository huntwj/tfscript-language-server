import { describe, expect, it } from "vitest";
import { getDefinition, getReferences, getRenameEdits, prepareRename, type NavContext } from "../src/navigation";

const pos = (line: number, character: number) => ({ line, character });
const at = (text: string, needle: string, nth = 0, shift = 0) => {
  const lines = text.split("\n");
  let seen = 0;
  for (let line = 0; line < lines.length; line += 1) {
    let from = 0;
    for (;;) {
      const i = (lines[line] as string).indexOf(needle, from);
      if (i < 0) break;
      if (seen++ === nth) return pos(line, i + shift);
      from = i + 1;
    }
  }
  throw new Error(`no ${needle} #${nth}`);
};
const starts = (locs: { uri: string; range: { start: { line: number; character: number } } }[]) =>
  locs.map((l) => `${l.uri || "self"}:${l.range.start.line}:${l.range.start.character}`);

describe("variable definition and references", () => {
  const text = [
    "/set greeting=hi",
    "/def -i a = /echo %{greeting} %greeting%; /test greeting := 'yo'",
    "/def -i b = /let greeting=local%; /echo %greeting%; /set greeting=g",
    "/def -i c = /if (greeting =~ 'hi') /echo {greeting}%; /endif",
    "",
  ].join("\n");

  it("jumps from a read to the global's /set lines, not to a body's /let", () => {
    expect(starts(getDefinition(text, at(text, "%{greeting}", 0, 3)))).toEqual(["self:0:5", "self:2:57"]);
  });

  it("jumps from a local read to its /let", () => {
    expect(starts(getDefinition(text, at(text, "%greeting", 1, 2)))).toEqual(["self:2:17"]);
  });

  it("lists the global's references, leaving out the body that has its own /let", () => {
    // {greeting} in a command is text, not a substitution: only an expression reads {name}.
    expect(starts(getReferences(text, pos(0, 6), false))).toEqual(["self:1:20", "self:1:31", "self:1:48", "self:3:17"]);
    expect(starts(getReferences(text, pos(0, 6), true))).toEqual([
      "self:0:5",
      "self:1:20",
      "self:1:31",
      "self:1:48",
      "self:2:57",
      "self:3:17",
    ]);
  });

  it("lists a local's references within its body only", () => {
    expect(starts(getReferences(text, at(text, "%greeting", 1, 2), true))).toEqual(["self:2:17", "self:2:41"]);
  });

  it("falls back to assignments when nothing /sets the variable", () => {
    const t = "/def -i a = /test count := 0%; /echo %count\n";
    expect(starts(getDefinition(t, at(t, "%count", 0, 2)))).toEqual(["self:0:18"]);
  });

  it("follows a global into the other files on the load path, tf's library included for definitions", () => {
    const ctx: NavContext = {
      uri: "file:///main.tf",
      files: [{ uri: "file:///other.tf", text: "/set width=80\n/echo %width\n" }],
      libraryFiles: [{ uri: "file:///lib/stdlib.tf", text: "/set width=72\n" }],
      macros: [],
    };
    const t = "/def -i a = /echo %{width}\n";
    expect(starts(getDefinition(t, pos(0, 22), ctx))).toEqual(["file:///other.tf:0:5", "file:///lib/stdlib.tf:0:5"]);
    expect(starts(getReferences(t, pos(0, 22), true, ctx))).toEqual(["file:///main.tf:0:20", "file:///other.tf:0:5", "file:///other.tf:1:7"]);
  });

  it("jumps from an opt_ variable to its getopts() letter, even between two letters", () => {
    const t = '/def -i a = /if (!getopts("lig", "")) /return%; /endif%; /echo %opt_i\n';
    expect(starts(getDefinition(t, at(t, "%opt_i", 0, 2)))).toEqual(["self:0:28"]);
    // The cursor right after "l" is on "i" too: the name starting there wins.
    expect(starts(getReferences(t, pos(0, 28), true))).toEqual(["self:0:28", "self:0:64"]);
  });

  it("leaves macro navigation alone", () => {
    const t = "/def -i greet = /echo %{name}\n/greet\n";
    expect(starts(getDefinition(t, pos(1, 2)))).toEqual(["self:0:8"]);
  });
});

describe("variable rename", () => {
  const apply = (text: string, edits: { range: { start: { line: number; character: number }; end: { character: number } }; newText: string }[]) => {
    const lines = text.split("\n");
    for (const e of [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character)) {
      const l = lines[e.range.start.line] as string;
      lines[e.range.start.line] = l.slice(0, e.range.start.character) + e.newText + l.slice(e.range.end.character);
    }
    return lines.join("\n");
  };

  it("renames a global everywhere but in a body's own /let variable", () => {
    const text = ["/set n=1", "/def -i a = /echo %n %{n-0} $[n + {n}]%; /unset n", "/def -i b = /let n=2%; /echo %n%; /set n=3", ""].join("\n");
    const edits = getRenameEdits(text, pos(0, 5), "count");
    expect(Array.isArray(edits)).toBe(true);
    expect(apply(text, edits as never)).toBe(
      ["/set count=1", "/def -i a = /echo %count %{count-0} $[count + {count}]%; /unset count", "/def -i b = /let n=2%; /echo %n%; /set count=3", ""].join("\n"),
    );
  });

  it("renames a /let variable only in its own body", () => {
    const text = "/def -i a = /let i=0%; /while (i < 3) /test ++i%; /done%; /echo %i\n/def -i b = /echo %i\n";
    const edits = getRenameEdits(text, at(text, "/let i", 0, 5), "idx");
    expect(apply(text, edits as never)).toBe("/def -i a = /let idx=0%; /while (idx < 3) /test ++idx%; /done%; /echo %idx\n/def -i b = /echo %i\n");
  });

  it("renames across the files on the load path", () => {
    const ctx: NavContext = { uri: "file:///main.tf", files: [{ uri: "file:///other.tf", text: "/echo %{w}\n" }], macros: [] };
    const edits = getRenameEdits("/set w=1\n", pos(0, 5), "width", ctx);
    expect(edits).toEqual([
      { uri: "file:///main.tf", range: { start: pos(0, 5), end: pos(0, 6) }, newText: "width" },
      { uri: "file:///other.tf", range: { start: pos(0, 8), end: pos(0, 9) }, newText: "width" },
    ]);
  });

  it("offers the name's range for a rename", () => {
    expect(prepareRename("/def -i a = /echo %{foo}\n", pos(0, 21))).toEqual({ range: { start: pos(0, 20), end: pos(0, 23) }, placeholder: "foo" });
  });

  it("refuses tf's special variables and variables tf's library sets", () => {
    expect(prepareRename("/set wrapspace=4\n", pos(0, 6))).toEqual({ error: "wrapspace is one of tf's special variables, so it can't be renamed." });
    const ctx: NavContext = { uri: "file:///a.tf", files: [], libraryFiles: [{ uri: "file:///lib/x.tf", text: "/set libvar=1\n" }], macros: [] };
    expect(prepareRename("/echo %libvar\n", pos(0, 8), ctx)).toEqual({ error: "libvar is set in tf's library, which isn't yours to rename." });
  });

  it("refuses a getopts() variable, whose name comes from its option letter", () => {
    const t = '/def -i a = /if (!getopts("q", "")) /return%; /endif%; /echo %opt_q\n';
    expect(prepareRename(t, at(t, "%opt_q", 0, 2))).toEqual({
      error: "opt_q is set by getopts(), which names it after its option letter, so it can't be renamed.",
    });
  });

  it("refuses a new name tf wouldn't read as a variable", () => {
    const text = "/set foo=1\n";
    expect(getRenameEdits(text, pos(0, 5), "2x")).toEqual({ error: '"2x" can\'t be a variable name: use letters, digits and _, not starting with a digit.' });
    expect(getRenameEdits(text, pos(0, 5), "L")).toEqual({
      error: '"L" can\'t be a variable name here: tf reads %L as a positional or special substitution, not a variable.',
    });
    expect(getRenameEdits(text, pos(0, 5), "R")).toHaveProperty("error");
    expect(getRenameEdits(text, pos(0, 5), "L2")).toHaveProperty("error");
    expect(getRenameEdits(text, pos(0, 5), "TFPATH")).toEqual({ error: '"TFPATH" is one of tf\'s special variables: pick another name.' });
    expect(Array.isArray(getRenameEdits(text, pos(0, 5), "Lx"))).toBe(true);
  });
});
