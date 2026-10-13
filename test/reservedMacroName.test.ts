import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";
import { getDefinition, getHover } from "../src/navigation";

const reserved = (text: string) => getDiagnostics(text).filter((d) => d.code === "reserved-macro-name");

describe("reserved-macro-name", () => {
  it("flags /def of a keyword or eval, in any case, at the name", () => {
    const found = reserved("/def if = /echo\n/def -i SET = /echo\n/def eval = /echo\n");
    expect(found.map((d) => d.range.start)).toEqual([
      { line: 0, character: 5 },
      { line: 1, character: 8 },
      { line: 2, character: 5 },
    ]);
    expect(found[0]?.severity).toBe("error");
  });

  it("leaves builtins tf lets you redefine, and ordinary names, alone", () => {
    expect(reserved("/def -i quote = /echo\n/def lcd = /echo\n/def iffy = /echo\n")).toEqual([]);
  });
});

describe("navigation around a refused /def", () => {
  it("does not treat it as a definition: /let still means the keyword", () => {
    const text = "/def let = /echo no\n/let x 1\n";
    expect(getDefinition(text, { line: 1, character: 2 })).toEqual([]);
    expect(getHover(text, { line: 1, character: 2 })?.markdown).toContain("control-flow keyword");
  });
});
