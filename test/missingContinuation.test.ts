import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";
import { getCodeActions } from "../src/codeActions";

const WHOLE_FILE = { start: { line: 0, character: 0 }, end: { line: 9999, character: 0 } };
const found = (lines: string[]) => getDiagnostics(`${lines.join("\n")}\n`).map((d) => `${d.code}@${d.range.start.line}`);
const only = (lines: string[]) => {
  const ds = getDiagnostics(`${lines.join("\n")}\n`);
  expect(ds.map((d) => d.code)).toEqual(["missing-continuation"]);
  return ds[0]!;
};
const relatedLines = (d: ReturnType<typeof only>) => (d.related ?? []).map((r) => r.range.start.line);

// Each shape proven in tf dev, 2026-10-14: tf reports the opener ("expected /endif, found end"),
// then each stray keyword ("unexpected /ENDIF in outer block") and indented line ("possibly
// missing trailing \").
describe("missing-continuation", () => {
  it("reports an /if and its stray /endif once, at the /if", () => {
    const d = only(["/if (1) /echo yes%;", "/endif"]);
    expect(d.range.start).toEqual({ line: 0, character: 0 });
    expect(d.message).toBe("This /if ends at the end of line 1, which has no \\, so the /endif on line 2 is a separate command: end every line but the last with \\.");
    expect(relatedLines(d)).toEqual([1]);
  });

  it("takes in the indented lines too, noting an indented stray once", () => {
    expect(relatedLines(only(["/if (1) /echo yes%;", "    /endif"]))).toEqual([1]);
    expect(relatedLines(only(["/if (1)", "    /echo yes", "/else", "    /echo no", "/endif"]))).toEqual([1, 2, 3, 4]);
  });

  it("covers /while and its /done, and condition lists", () => {
    expect(only(["/while (i < 2) /test i:=i+1%;", "/done"]).message).toContain("the /done on line 2 is a separate command");
    expect(only(["/if /test 1", "/then /echo x%; /endif"]).message).toContain("the /then on line 2 is a separate command");
    expect(only(["/while /test i < 3", "/do /test ++i", "/done"]).message).toContain("the /done on line 3 is a separate command");
  });

  it("with no stray keyword, takes in the indented lines straight after it", () => {
    const d = only(["/if (1)", "    /echo body", "    /echo more", "/echo after"]);
    expect(d.message).toBe("This /if ends at the end of line 1, which has no \\, so line 2 starts a separate command: end every line but the last with \\.");
    expect(relatedLines(d)).toEqual([1, 2]);
  });

  it("with nothing after it, says what is missing and offers the closer", () => {
    const d = only(["/if (1) /echo yes"]);
    expect(d.message).toBe("This /if's command ends without an /endif: add %; /endif, or end each line but the last with \\.");
    expect(d.fix?.title).toBe("Add %; /endif at the end of the line");
  });

  it("pairs strays with the nearest open block of their kind", () => {
    const text = ["/while (i < 2) /test ++i%;", "/if (1) /echo a%;", "/endif", "/done"];
    expect(found(text)).toEqual(["missing-continuation@0", "missing-continuation@1"]);
    const [w, i] = getDiagnostics(`${text.join("\n")}\n`);
    expect(relatedLines(w!)).toEqual([3]);
    expect(relatedLines(i!)).toEqual([2]);
  });

  it("leaves a stray that no open block takes, and one in a macro body, to block-structure", () => {
    expect(found(["/endif"])).toEqual(["block-structure@0"]);
    expect(found(["/if (1) /echo a%;", "/endif", "/endif"])).toEqual(["missing-continuation@0", "block-structure@2"]);
    expect(found(["/while (1) /echo a%;", "/endif"])).toEqual(["missing-continuation@0", "block-structure@1"]);
    expect(found(["/if (1) /echo a%;", "/def f = /echo b%; /endif"])).toEqual(["missing-continuation@0", "block-structure@1"]);
  });

  it("offers its join fix on the lines it takes in, and the result is clean", () => {
    const text = ["/if (1)", "    /echo yes", "/endif", ""].join("\n");
    for (const line of [0, 1, 2]) {
      const range = { start: { line, character: 1 }, end: { line, character: 1 } };
      expect(getCodeActions(text, range).map((a) => a.title)).toEqual(["Join the /if's lines with \\"]);
    }
  });
});
