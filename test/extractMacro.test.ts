import { describe, expect, it } from "vitest";
import type { Range, TfTextEdit } from "../src/diagnostics";
import { getExtractActions } from "../src/extractMacro";

/** Applies edits, last first, so earlier positions stay valid. */
function apply(text: string, edits: TfTextEdit[]): string {
  const lines = text.split("\n");
  const offset = (p: { line: number; character: number }): number => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  let out = text;
  for (const e of [...edits].sort((a, b) => offset(b.range.start) - offset(a.range.start))) {
    out = out.slice(0, offset(e.range.start)) + e.newText + out.slice(offset(e.range.end));
  }
  return out;
}

/** The range of `sub` in `text` (its first occurrence at or after `from`). */
function rangeOf(text: string, sub: string, from = 0): Range {
  const at = text.indexOf(sub, from);
  if (at < 0) throw new Error(`no ${sub}`);
  const pos = (o: number): { line: number; character: number } => {
    const before = text.slice(0, o).split("\n");
    return { line: before.length - 1, character: (before[before.length - 1] as string).length };
  };
  return { start: pos(at), end: pos(at + sub.length) };
}

function extract(text: string, sub: string, from = 0): string | undefined {
  const [action] = getExtractActions(text, rangeOf(text, sub, from));
  if (!action || action.disabled) return undefined;
  return apply(text, action.edits);
}

function reason(text: string, sub: string): string | undefined {
  return getExtractActions(text, rangeOf(text, sub))[0]?.disabled;
}

describe("extract to a new macro", () => {
  it("moves statements of a one-line body into a /def above it", () => {
    const text = "/def -i greet = /echo hi%; /echo there%; /echo bye\n";
    expect(extract(text, "/echo hi%; /echo there")).toBe(
      ["/def -i greet_extracted = \\", "    /echo hi%;\\", "    /echo there", "", "/def -i greet = /greet_extracted%; /echo bye", ""].join("\n"),
    );
  });

  it("keeps a single statement on one line", () => {
    const text = "/def greet = /echo hi%; /echo bye\n";
    expect(extract(text, "/echo bye")).toBe(["/def greet_extracted = /echo bye", "", "/def greet = /echo hi%; /greet_extracted", ""].join("\n"));
  });

  it("passes the arguments on when the statements use them", () => {
    const text = "/def greet = /echo hi %1%; /echo bye\n";
    expect(extract(text, "/echo hi %1")).toBe(["/def greet_extracted = /echo hi %1", "", "/def greet = /greet_extracted %*%; /echo bye", ""].join("\n"));
  });

  it("works on a continued body, and on a block's branch", () => {
    const text = ["/def -i t = \\", "    /if (x) \\", "        /echo a%;\\", "        /echo b%;\\", "    /endif%;\\", "    /echo c", ""].join("\n");
    expect(extract(text, "/echo a%;\\\n        /echo b")).toBe(
      [
        "/def -i t_extracted = \\",
        "    /echo a%;\\",
        "    /echo b",
        "",
        "/def -i t = \\",
        "    /if (x) \\",
        "        /t_extracted%;\\",
        "    /endif%;\\",
        "    /echo c",
        "",
      ].join("\n"),
    );
  });

  it("moves a whole block", () => {
    const text = "/def t = /echo a%; /if (x) /echo b%; /endif%; /echo c\n";
    expect(extract(text, "/if (x) /echo b%; /endif")).toBe(
      ["/def t_extracted = \\", "    /if (x) \\", "        /echo b%;\\", "    /endif", "", "/def t = /echo a%; /t_extracted%; /echo c", ""].join("\n"),
    );
  });

  it("goes above the macro's ;;; doc comment, and numbers a name that is taken", () => {
    const text = ["/def t_extracted = /x", "", ";;; Says hi.", "/def t = /echo a%; /echo b", ""].join("\n");
    const out = extract(text, "/echo a");
    expect(out?.split("\n").slice(2, 6)).toEqual(["/def t_extracted2 = /echo a", "", ";;; Says hi.", "/def t = /t_extracted2%; /echo b"]);
  });

  it("isn't offered for half a statement, half a block, or the head", () => {
    const text = "/def t = /echo a%; /if (x) /echo b%; /endif%; /echo c\n";
    expect(getExtractActions(text, rangeOf(text, "/echo b%; /endif"))).toEqual([]);
    expect(getExtractActions(text, rangeOf(text, "cho a"))).toEqual([]);
    expect(getExtractActions(text, rangeOf(text, "t = /echo a"))).toEqual([]);
    expect(getExtractActions(text, rangeOf(text, "/if (x)"))).toEqual([]);
  });

  it("says why it can't extract", () => {
    expect(reason("/def t = /echo a%; /return 1\n", "/echo a%; /return 1")).toMatch(/^\/return in the selection would end the new macro/);
    expect(reason("/def t = /let x=1%; /echo %x\n", "/let x=1")).toMatch(/^x is \/let in the selection.*uses it outside/);
    expect(reason("/def t = /let x=1%; /foo\n", "/let x=1")).toMatch(/also runs \/foo/);
    expect(reason("/def t = /echo %0%; /echo b\n", "/echo %0")).toMatch(/^%0 is the running macro's name/);
    expect(reason("/def t = /while (1) /echo a%; /break%; /done\n", "/echo a%; /break")).toMatch(/^This \/break would end the new macro/);
    expect(reason("/def t = /echo a %| /echo b\n", "/echo a")).toMatch(/^A %\| or %\\ ties the selection/);
    expect(reason("/def t = /echo $(/echo a%; /echo b)\n", "/echo a")).toMatch(/inside a \$\(\.\.\.\)/);
    expect(reason("/def t = /shift%; /echo a\n", "/shift")).toMatch(/^\/shift/);
    expect(reason("/def t = /test regmatch(\"a\", x)%; /echo %P0\n", "/test regmatch(\"a\", x)")).toMatch(/^regmatch\(\)/);
    expect(reason("/def t = /echo a\tb%; /echo c\n", "/echo a\tb")).toMatch(/tab/);
    expect(reason("/def t = /getx%; /test getopts(\"a\")%; /echo b\n", "/test getopts(\"a\")")).toMatch(/^getopts\(\)/);
    expect(reason("/def t = /while /test 1%; /do /echo a%; /done\n", "/test 1")).toMatch(/condition list/);
    const commented = ["/def t = \\", "    /echo a%;\\", "; a note", "    /echo b%;\\", "    /echo c", ""].join("\n");
    expect(reason(commented, "/echo a%;\\\n; a note\n    /echo b")).toMatch(/comment lines/);
  });

  it("passes a trigger's or hook's arguments on, and names the new macro after a trigger", () => {
    expect(extract("/def -i -t\"go *\" = /echo [%*]%; /echo done\n", "/echo [%*]")).toBe(
      ["/def -i extracted = /echo [%*]", "", "/def -i -t\"go *\" = /extracted %*%; /echo done", ""].join("\n"),
    );
    expect(extract("/def -i -hLOAD hk = /echo %1%; /echo x\n", "/echo %1")?.split("\n")[2]).toBe("/def -i -hLOAD hk = /hk_extracted %*%; /echo x");
  });

  it("doesn't pass arguments on for %Pn and %?, which aren't arguments", () => {
    expect(extract("/def -mregexp -t\"(a)\" t = /echo %P1 %?%; /echo x\n", "/echo %P1 %?")?.split("\n")[2]).toBe("/def -mregexp -t\"(a)\" t = /t_extracted%; /echo x");
  });

  it("takes whole lines selected in a continued body, separators and all", () => {
    const text = ["/def t = \\", "    /echo a%;\\", "    /echo b%;\\", "    /echo c", ""].join("\n");
    const lines = text.split("\n");
    const range = { start: { line: 1, character: 0 }, end: { line: 3, character: 0 } };
    const [action] = getExtractActions(text, range);
    expect(action?.title).toBe("Extract to a new macro, /t_extracted");
    expect(apply(text, action?.edits ?? []).split("\n").slice(-4)).toEqual(["/def t = \\", "    /t_extracted%;\\", "    /echo c", ""]);
    expect(lines.length).toBe(5);
  });

  it("isn't offered in an /alias, or a file with CRLF line endings", () => {
    expect(getExtractActions("/alias go /echo a%; /echo b\n", rangeOf("/alias go /echo a%; /echo b\n", "/echo a"))).toEqual([]);
    expect(getExtractActions("/def t = /echo a%; /echo b\r\n", rangeOf("/def t = /echo a%; /echo b\r\n", "/echo a"))).toEqual([]);
  });

  it("allows a /let used only inside the selection, and a /break in a /while it moves", () => {
    expect(extract("/def t = /let x=1%; /echo %x%; /echo b\n", "/let x=1%; /echo %x")).toBeDefined();
    expect(extract("/def t = /while (1) /break%; /done%; /echo b\n", "/while (1) /break%; /done")).toBeDefined();
  });
});
