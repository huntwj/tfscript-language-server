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

// Proven in tf dev, 2026-10-14 (the review's probes): tf reports each of these lines on its own,
// and a join couldn't reach them.
describe("missing-continuation: lines that belong to something else", () => {
  it("doesn't take in a stray or indented line past a blank line or a /def", () => {
    const p4 = ["/if (1) /echo forgot-endif", "", "/def a = /echo a1", "    /echo a2", "", "/def b = /echo b1", "", "/if (1) /echo one%; /endif%; /endif"];
    expect(found(p4)).toEqual(["missing-continuation@0", "indented-line-after-command@3", "block-structure@7"]);
    const p5 = ["/while (0) /echo forgot-done", "", "/def a = /echo a1", "    /echo a2", "", "/done"];
    expect(found(p5)).toEqual(["missing-continuation@0", "indented-line-after-command@3", "block-structure@5"]);
    const p2 = ["/if (1) /echo a%;", "/echo unrelated1", "/def foo = /echo foo", "    /echo indented-under-def", "/echo unrelated2", "/endif"];
    expect(found(p2)).toEqual(["missing-continuation@0", "indented-line-after-command@3", "block-structure@5"]);
  });

  it("doesn't take in a stray in the middle of a complete command", () => {
    expect(found(["/if (1) /echo a%;", "/if (2) /echo b%; /endif%; /endif"])).toEqual(["missing-continuation@0", "block-structure@1"]);
  });

  it("keeps the opener's fixes when the lines aren't taken in", () => {
    const [d] = getDiagnostics("/if (1) /echo forgot-endif\n\n/endif\n");
    expect(d?.fix?.title).toBe("Add %; /endif at the end of the line");
  });

  it("reaches a later block on the opener's line", () => {
    const d = only(["/if (1) /echo a%; /endif%; /if (2) /echo b", "/echo x", "/else", "/endif"]);
    expect(d.range.start).toEqual({ line: 0, character: 27 });
    expect(relatedLines(d)).toEqual([2, 3]);
    expect(d.fix?.title).toBe("Join the /if's lines with \\");
  });
});

describe("missing-continuation fixes", () => {
  it("joins an indented body with no closer below it, and closes it", () => {
    const text = ["/if (1)", "    /echo body", "    /echo more", "/echo after", ""].join("\n");
    const d = only(text.trimEnd().split("\n"));
    expect(d.fix?.title).toBe("Join the /if's lines with \\ and end it with /endif");
    const fixed = applyEdits(text, d.fix!.edits);
    expect(fixed).toBe(["/if (1) \\", "    /echo body%; \\", "    /echo more%; /endif", "/echo after", ""].join("\n"));
    expect(getDiagnostics(fixed)).toEqual([]);
  });

  it("joins a stray /else with no closer below it, and closes it", () => {
    const text = ["/if (0) /echo a%;", "/else /echo b", ""].join("\n");
    const d = only(text.trimEnd().split("\n"));
    expect(relatedLines(d)).toEqual([1]);
    const fixed = applyEdits(text, d.fix!.edits);
    expect(fixed).toBe(["/if (0) /echo a%; \\", "/else /echo b%; /endif", ""].join("\n"));
    expect(getDiagnostics(fixed)).toEqual([]);
  });

  it("keeps the add-a-closer fix when there are related lines but no join works", () => {
    // Joined, the /elseif after /else is still an error, so neither join is offered.
    const d = only(["/if (0) /echo a%;", "/else /echo b", "/elseif (1) /echo c"]);
    expect(relatedLines(d)).toEqual([1, 2]);
    expect(d.fix?.title).toBe("Add %; /endif at the end of the line");
  });

  it("leaves a \\ cut off by whitespace or a CRLF to backslash-not-last, with no closer fix", () => {
    const d = getDiagnostics("/if (1) /echo % a%; \\\r\n/endif\r\n").find((x) => x.code === "missing-continuation");
    expect(relatedLines(d!)).toEqual([1]);
    expect(d?.fix).toBeUndefined();
    // With whitespace the join works: it deletes the whitespace.
    const ws = getDiagnostics("/if (1) /echo % a%; \\ \n/endif\n").find((x) => x.code === "missing-continuation");
    expect(ws?.fix?.title).toBe("Join the /if's lines with \\");
  });

  it("offers nothing on a related line when the opener has no fix", () => {
    const text = "/if (1)\r\n/endif\r\n";
    const d = getDiagnostics(text).find((x) => x.code === "missing-continuation");
    expect(relatedLines(d!)).toEqual([1]);
    expect(d?.fix).toBeUndefined();
    expect(getCodeActions(text, { start: { line: 1, character: 1 }, end: { line: 1, character: 1 } })).toEqual([]);
  });
});

describe("missing-continuation messages", () => {
  it("says when the \\ is there but whitespace or a CRLF line ending follows it", () => {
    // backslash-not-last reports the \ itself, with the fix.
    const ws = getDiagnostics("/if (1) /echo % a%; \\ \n/endif\n");
    expect(ws.map((x) => x.code)).toEqual(["missing-continuation", "backslash-not-last"]);
    expect(ws[0]?.message).toBe(
      "This /if ends at the end of line 1, where whitespace follows the \\, so the /endif on line 2 is a separate command: remove the whitespace.",
    );
    const crlf = getDiagnostics("/if (1) /echo % a%; \\\r\n/endif\r\n").find((x) => x.code === "missing-continuation");
    expect(crlf?.message).toBe(
      "This /if ends at the end of line 1, where the file's Windows (CRLF) line ending puts a carriage return after the \\, so the /endif on line 2 is a separate command: save the file with LF line endings.",
    );
  });
});

function applyEdits(text: string, edits: { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[]): string {
  const lines = text.split("\n");
  for (const e of [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character)) {
    const line = lines[e.range.start.line] ?? "";
    lines[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return lines.join("\n");
}
