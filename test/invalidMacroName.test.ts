import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";
import { getDefinition, getHover } from "../src/navigation";

const invalid = (text: string) => getDiagnostics(text).filter((d) => d.code === "invalid-macro-name");

// Every refusal below was run in tf dev (2026-10-14, step-5 probe n1): "DEF: illegal macro name" or
// "DEF: "if" is a reserved word.", and the macro wasn't defined.
describe("invalid-macro-name: a reserved word", () => {
  it("flags /def of a keyword or eval, in any case, at the name", () => {
    const found = invalid("/def if = /echo\n/def -i SET = /echo\n/def eval = /echo\n");
    expect(found.map((d) => d.range.start)).toEqual([
      { line: 0, character: 5 },
      { line: 1, character: 8 },
      { line: 2, character: 5 },
    ]);
    expect(found[0]?.severity).toBe("error");
    expect(found[0]?.message).toBe('"if" is a reserved word, so tf refuses this /def and defines nothing: pick another name.');
  });

  it("leaves builtins tf lets you redefine, and ordinary names, alone", () => {
    expect(invalid("/def -i quote = /echo\n/def lcd = /echo\n/def iffy = /echo\n")).toEqual([]);
  });
});

describe("invalid-macro-name: an illegal name", () => {
  it("flags a name starting with #, @, ! or /", () => {
    for (const ch of ["#", "@", "!", "/"]) {
      const [d] = invalid(`/def ${ch}x = /echo\n`);
      expect(d?.message, ch).toBe(`"${ch}x" can't be a macro name, as it starts with ${ch}, so tf refuses this /def and defines nothing: pick another name.`);
      expect(d?.range).toEqual({ start: { line: 0, character: 5 }, end: { line: 0, character: 7 } });
    }
  });

  it("flags a name holding a space or a tab, read up to the = as tf reads it", () => {
    expect(invalid("/def a b = /echo\n")[0]?.message).toBe(
      "\"a b\" can't be a macro name, as it holds a space, so tf refuses this /def and defines nothing: pick a name of one word.",
    );
    expect(invalid("/def a\tb = /echo\n")[0]?.message).toContain("a tab, which tf reads as a space");
  });

  it("reads past the options, and through /@def and /!def", () => {
    expect(invalid("/def -i -p2 #x = /echo\n")[0]?.range.start.character).toBe(12);
    expect(invalid('/def -t"a b" ok = /echo\n')).toEqual([]);
    expect(invalid("/@def #x = /echo\n")[0]?.range.start.character).toBe(6);
    expect(invalid("/!def @x = /echo\n")[0]?.range.start.character).toBe(6);
    expect(invalid("/@def if = /echo\n")[0]?.message).toContain("reserved word");
    // /@@def asks for a builtin named @def, which isn't one: no /def at all.
    expect(invalid("/@@def #x = /echo\n")).toEqual([]);
  });

  it("leaves legal names alone: a # inside, a name only, an anonymous trigger", () => {
    expect(invalid("/def n#1 = /echo\n/def lonely\n/def -t\"x*\" = /echo\n/def -i ok = /echo\n")).toEqual([]);
  });

  it("says a /def with no = after its name has the = missing, and puts it in", () => {
    const [d] = invalid("/def greet /echo hi\n");
    expect(d?.message).toBe(
      'This /def has no = after its name, so tf takes all of "greet /echo hi" as the name, which can\'t hold a space, and defines nothing: put = after greet.',
    );
    expect(d?.fix?.title).toBe("Put = after greet");
    expect(d?.fix?.edits.map((e) => [e.range.start.character, e.newText])).toEqual([[10, " ="]]);
    // An = later in the body doesn't change that: tf's name runs up to it.
    expect(invalid("/def n /set v=1\n")[0]?.fix?.title).toBe("Put = after n");
    // Not when the first word couldn't be a name either, or the second isn't a command.
    expect(invalid("/def #n /echo hi\n")[0]?.fix).toBeUndefined();
    expect(invalid("/def a b = /echo\n")[0]?.fix).toBeUndefined();
  });
});

describe("navigation around a refused /def", () => {
  it("does not treat it as a definition: /let still means the keyword", () => {
    const text = "/def let = /echo no\n/let x 1\n";
    expect(getDefinition(text, { line: 1, character: 2 })).toEqual([]);
    expect(getHover(text, { line: 1, character: 2 })?.markdown).toContain("control-flow keyword");
  });
});
