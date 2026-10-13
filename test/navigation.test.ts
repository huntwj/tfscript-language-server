import { describe, expect, it } from "vitest";
import { findUsages, getDefinition, getHover, getReferences } from "../src/navigation";

const pos = (line: number, character: number) => ({ line, character });

describe("findUsages", () => {
  it("finds calls, /@ calls and both substitution forms", () => {
    const text = "/def go = /echo hi%; /@echo raw%; /x ${greet} $greet\n";
    expect(findUsages(text).map((u) => `${u.kind}:${u.name}`)).toEqual([
      "call:def",
      "call:echo",
      "builtin-call:echo",
      "call:x",
      "substitution:greet",
      "substitution:greet",
    ]);
  });

  it("reads /!name (run and negate) as a call to name", () => {
    const [, u] = findUsages("/if /!ismacro x%; /then /endif\n");
    expect(u).toMatchObject({ name: "ismacro", kind: "call", range: { start: pos(0, 6) } });
  });

  it("does not read a path as a call", () => {
    const names = findUsages("/set d=/script\n/load %{d}/ok.tf\n").map((u) => u.name);
    expect(names).toEqual(["set", "load"]);
  });

  it("skips comment lines and $$ escapes", () => {
    expect(findUsages(";; /foo\n# /bar\n/echo $$notsubst\n").map((u) => u.name)).toEqual(["echo"]);
  });

  it("ranges cover just the name", () => {
    const [, u] = findUsages("  /echo %; /@foo\n");
    expect(u?.range).toEqual({ start: pos(0, 13), end: pos(0, 16) });
  });
});

describe("getDefinition", () => {
  const text = ["/def -i greet = /echo hi", "/greet", "/GREET", "/@greet", "/echo ${greet}", ""].join("\n");

  it("jumps from a call to its /def name, case-insensitively", () => {
    const want = [{ start: pos(0, 8), end: pos(0, 13) }];
    expect(getDefinition(text, pos(1, 3)).map((l) => l.range)).toEqual(want);
    expect(getDefinition(text, pos(2, 3)).map((l) => l.range)).toEqual(want);
    expect(getDefinition(text, pos(4, 9)).map((l) => l.range)).toEqual(want);
  });

  it("does not treat /@name as a reference to the macro", () => {
    expect(getDefinition(text, pos(3, 4))).toEqual([]);
  });

  it("returns every /def of a redefined macro", () => {
    expect(getDefinition("/def a = 1\n/def a = 2\n/a\n", pos(2, 1))).toHaveLength(2);
  });

  it("finds nothing for a builtin or unknown name", () => {
    expect(getDefinition(text, pos(4, 2))).toEqual([]);
    expect(getDefinition("/nosuch\n", pos(0, 2))).toEqual([]);
  });
});

describe("getReferences", () => {
  const text = ["/def greet = /echo hi", "/greet", "/@greet", "/echo ${greet} $greet", ""].join("\n");

  it("lists calls and substitutions, not /@ calls, with or without the declaration", () => {
    expect(getReferences(text, pos(1, 2), false).map((r) => r.range.start)).toEqual([pos(1, 1), pos(3, 8), pos(3, 16)]);
    expect(getReferences(text, pos(1, 2), true).map((r) => r.range.start)).toEqual([
      pos(0, 5),
      pos(1, 1),
      pos(3, 8),
      pos(3, 16),
    ]);
  });

  it("works from the /def name itself", () => {
    expect(getReferences(text, pos(0, 6), false)).toHaveLength(3);
  });
});

describe("getHover", () => {
  it("shows a builtin's usage synopsis", () => {
    const hover = getHover("/let x 1\n", pos(0, 2));
    expect(hover?.markdown).toContain("/let name");
    expect(hover?.markdown).toContain("control-flow keyword");
  });

  it("shows a local macro's definition, and notes it shadows a builtin", () => {
    const text = "/def -i echo = /@echo -p %*\n/echo hi\n";
    const hover = getHover(text, pos(1, 2));
    expect(hover?.markdown).toContain("/def -i echo");
    expect(hover?.markdown).toContain("line 1");
    expect(hover?.markdown).toContain("stdlib.tf");
  });

  it("shows the ;;; doc comment directly above a /def", () => {
    const text = [
      ";; section notes, not docs",
      ";;; /greet <name>",
      ";;;   Says hello to <name>.",
      "/def greet = /echo hi %1",
      "/greet bob",
      "",
    ].join("\n");
    const md = getHover(text, pos(4, 2))?.markdown ?? "";
    expect(md).toContain("/greet \\<name\\>  \n  Says hello to \\<name\\>.");
    expect(md).not.toContain("section notes");
  });

  it("escapes doc-comment text so <placeholders>, _ and * survive Markdown rendering", () => {
    const text = [";;; /kb_push [-w<world>] %*", "/def kb_push = /echo", "/kb_push", ""].join("\n");
    expect(getHover(text, pos(2, 2))?.markdown).toContain("/kb\\_push \\[-w\\<world\\>\\] %\\*");
  });

  it("ignores a ;;; block separated from the /def by a blank line, and ;/ code", () => {
    const text = [";;; stale doc", "", ";/def old = /echo", "/def greet = /echo hi", "/greet", ""].join("\n");
    const md = getHover(text, pos(4, 2))?.markdown ?? "";
    expect(md).not.toContain("stale doc");
    expect(md).not.toContain("old");
  });

  it("shows the builtin for /@name even when a macro shadows it", () => {
    const text = "/def -i quote = /echo no\n/@quote -S x\n";
    expect(getHover(text, pos(1, 3))?.markdown).toContain("built-in");
    expect(getHover(text, pos(1, 3))?.markdown).toContain("/quote");
  });

  it("adds nothing between synopsis and label while a COMMAND_DESCRIPTIONS entry is empty", () => {
    const hover = getHover("/let x 1\n", pos(0, 2))?.markdown ?? "";
    expect(hover).toMatch(/```\n\ntf control-flow keyword/);
  });

  it("returns nothing for unknown names or plain text", () => {
    expect(getHover("/nosuch\n", pos(0, 2))).toBeUndefined();
    expect(getHover("/echo hello\n", pos(0, 9))).toBeUndefined();
  });
});
