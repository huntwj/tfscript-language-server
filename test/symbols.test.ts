import { describe, expect, it } from "vitest";
import { SymbolKind } from "vscode-languageserver/node";
import { getDocumentSymbols, toDocumentSymbol } from "../src/symbols";

function names(text: string): string[] {
  return getDocumentSymbols(text).map((s) => s.name);
}

describe("/def names", () => {
  it("lists a plain /def", () => {
    const [sym] = getDocumentSymbols("/def greet = /echo hi\n");
    expect(sym).toMatchObject({ name: "greet", kind: "def", detail: "/def" });
  });

  it("skips flag options before the name, grouped or separate", () => {
    expect(names("/def -i -q foo = /echo\n")).toEqual(["foo"]);
    expect(names("/def -iq foo = /echo\n")).toEqual(["foo"]);
    expect(names("/def -F -p5 -n1 foo = /echo\n")).toEqual(["foo"]);
  });

  it("skips string options whose quoted argument contains spaces, = and -", () => {
    expect(names('/def -mregexp -t"you say -x = y" foo = /echo\n')).toEqual(["foo"]);
    expect(names("/def -t'a = b' -h\"SEND foo\" bar = /echo\n")).toEqual(["bar"]);
    expect(names("/def -t`x y` baz = /echo\n")).toEqual(["baz"]);
  });

  it("handles an escaped quote inside a quoted option argument (stringliteral())", () => {
    expect(names('/def -t"say \\"hi\\" there" foo = /echo\n')).toEqual(["foo"]);
  });

  it("keeps the macro options as the symbol's detail", () => {
    const [sym] = getDocumentSymbols('/def -i -mglob -h"send {%1}*" ~alias_call_x = /shift\n');
    expect(sym?.detail).toBe('/def -i -mglob -h"send {%1}*"');
  });

  it("ends the options at -- or a lone -", () => {
    expect(names("/def -i -- foo = /echo\n")).toEqual(["foo"]);
    expect(names("/def -i - foo = /echo\n")).toEqual(["foo"]);
  });

  it("ends the options at a = glued to the last one (/def -t\"foo\"=bar)", () => {
    const [sym] = getDocumentSymbols('/def -t"foo"=bar\n');
    expect(sym).toMatchObject({ name: "foo", kind: "trig" });
  });

  it("treats a /def with no = as a name-only definition", () => {
    expect(names("/def foo\n")).toEqual(["foo"]);
  });

  it("shows an anonymous trigger, hook or binding under its pattern", () => {
    expect(getDocumentSymbols('/def -t"^You are hungry" = /eat\n')[0]).toMatchObject({
      name: "^You are hungry",
      kind: "trig",
    });
    expect(getDocumentSymbols("/def -hCONNECT = /echo\n")[0]).toMatchObject({ name: "CONNECT", kind: "hook" });
    expect(getDocumentSymbols("/def -b'^[x' = /echo\n")[0]).toMatchObject({ name: "^[x", kind: "bind" });
  });

  it("lists nothing for a /def with neither a name nor a trigger, hook or key", () => {
    expect(names("/def -i = /echo\n")).toEqual([]);
    expect(names("/def\n")).toEqual([]);
  });

  it("is case-insensitive on the command but keeps the name's case", () => {
    expect(names("/DEF Foo = /echo\n")).toEqual(["Foo"]);
  });
});

describe("other defining commands", () => {
  it("lists /alias by its first word, and not a bare /alias listing", () => {
    expect(getDocumentSymbols("/alias n north\n")[0]).toMatchObject({ name: "n", kind: "alias", detail: "/alias" });
    expect(names("/alias\n")).toEqual([]);
    expect(names("/alias n\n")).toEqual([]);
  });

  it("lists /bind by its key sequence", () => {
    expect(getDocumentSymbols("/bind ^[1 = /fg 1\n")[0]).toMatchObject({ name: "^[1", kind: "bind" });
  });

  it("lists /hook by its event, but not the on/off toggles", () => {
    expect(getDocumentSymbols("/hook CONNECT = /echo connected\n")[0]).toMatchObject({
      name: "CONNECT",
      kind: "hook",
    });
    expect(names("/hook\n/hook on\n/hook OFF\n")).toEqual([]);
  });

  it("lists /trig, /trigc, /trigp and /trigpc by their pattern, past the leading numbers", () => {
    const text = [
      "/trig *hungry* = /eat",
      "/trigc 50 *thirsty* = /drink",
      "/trigp 10 *tired* = /sleep",
      "/trigpc 10 50 *bored* = /play",
      "",
    ].join("\n");
    const symbols = getDocumentSymbols(text);
    expect(symbols.map((s) => [s.name, s.detail])).toEqual([
      ["*hungry*", "/trig"],
      ["*thirsty*", "/trigc"],
      ["*tired*", "/trigp"],
      ["*bored*", "/trigpc"],
    ]);
    expect(symbols.every((s) => s.kind === "trig")).toBe(true);
  });

  it("does not mistake /trigger (runs triggers) or /redef for definitions", () => {
    expect(names("/trigger foo\n/redef on\n")).toEqual([]);
  });
});

describe("what counts as a definition", () => {
  it("ignores comments, blank lines and ordinary commands", () => {
    const text = [";; /def commented = /echo", "# /def also = /echo", "", "/echo hi", "/set x=1", ""].join("\n");
    expect(names(text)).toEqual([]);
  });

  it("does not list a /def nested inside another top-level command", () => {
    expect(names("/if (1) /def inner = /echo%; /endif\n")).toEqual([]);
  });

  it("lists a /def whose name arrives on a continuation line", () => {
    const text = ["/def -i \\", "   foo = \\", "   /echo hi", ""].join("\n");
    const [sym] = getDocumentSymbols(text);
    expect(sym?.name).toBe("foo");
    expect(sym?.selectionRange).toEqual({ start: { line: 1, character: 3 }, end: { line: 1, character: 6 } });
  });

  it("skips a definition left incomplete by a trailing \\ at end of file", () => {
    expect(names("/def foo = \\")).toEqual([]);
  });
});

describe("ranges", () => {
  it("spans the whole continued entry and selects just the name", () => {
    const text = ["/echo first", "/def -i foo = \\", "  /echo one%; \\", "  /echo two", "/echo last", ""].join("\n");
    const [sym] = getDocumentSymbols(text);
    expect(sym?.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 3, character: 11 } });
    expect(sym?.selectionRange).toEqual({ start: { line: 1, character: 8 }, end: { line: 1, character: 11 } });
  });

  it("falls back to the command word for an anonymous trigger's selection range", () => {
    const [sym] = getDocumentSymbols('  /def -t"x" = /echo\n');
    expect(sym?.selectionRange).toEqual({ start: { line: 0, character: 2 }, end: { line: 0, character: 3 } });
  });
});

describe("toDocumentSymbol", () => {
  it("maps kinds onto LSP symbol kinds", () => {
    const text = ["/def a = /echo", "/alias b c", "/bind d = /e", "/hook F = /g", "/trig h = /i", ""].join("\n");
    const kinds = getDocumentSymbols(text).map((s) => toDocumentSymbol(s).kind);
    expect(kinds).toEqual([
      SymbolKind.Function,
      SymbolKind.Function,
      SymbolKind.Key,
      SymbolKind.Event,
      SymbolKind.Event,
    ]);
  });

  it("keeps the selection range inside the full range", () => {
    const [sym] = getDocumentSymbols("/def -i foo = /echo\n").map(toDocumentSymbol);
    expect(sym?.selectionRange.start.line).toBeGreaterThanOrEqual(sym!.range.start.line);
    expect(sym?.selectionRange.end.character).toBeLessThanOrEqual(sym!.range.end.character);
  });
});
