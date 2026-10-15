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

  it("offers no closer when it takes in its own, which adding one would leave an error", () => {
    // No join either: joined, the /elseif after /else is still an error.
    const d = only(["/if (0) /echo a%;", "/else /echo b", "/elseif (1) /echo c", "/endif"]);
    expect(relatedLines(d)).toEqual([1, 2, 3]);
    expect(d.fix).toBeUndefined();
  });

  it("keeps the closer fix when the closer below isn't its own: past a blank line or the reach, or another block's", () => {
    const add = "Add %; /endif at the end of the line";
    const mc = (lines: string[]) => getDiagnostics(`${lines.join("\n")}\n`).find((d) => d.code === "missing-continuation");
    const blank = mc(["/if (1) /echo forgot-endif", "", "/endif"]);
    expect(blank?.fix?.title).toBe(add);
    expect(blank?.message).toBe("This /if's command ends without an /endif: add %; /endif, or end each line but the last with \\.");
    expect(mc(["/if (0) /echo % in", ...Array.from({ length: 20 }, (_, k) => `/echo % l${k}`), "/endif", "/echo % after"])?.fix?.title).toBe(add);
    expect(mc(["/if (1) /echo % forgot-endif", "", "/echo % x", "/set foo=1", "    /echo % indented", "", "/endif"])?.fix?.title).toBe(add);
    // r13: the /endif is the second /if's.
    expect(mc(["/if (1) /echo % one", "", "/if (0)", "    /echo % two", "/endif", "/echo % after"])?.fix?.title).toBe(add);
  });

  it("keeps the closer fix when no stray closer of its kind follows", () => {
    expect(getDiagnostics("/if (1) /echo forgot-endif\n\n/echo next\n")[0]?.fix?.title).toBe("Add %; /endif at the end of the line");
    // A /done closes a /while, not this /if.
    expect(getDiagnostics("/if (1) /echo forgot-endif\n\n/done\n")[0]?.fix?.title).toBe("Add %; /endif at the end of the line");
    // A stray /endif above it was meant for something else.
    expect(getDiagnostics("/endif\n/if (1) /echo forgot-endif\n").find((d) => d.code === "missing-continuation")?.fix?.title).toBe(
      "Add %; /endif at the end of the line",
    );
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

  it("offers join-and-close only for the simple shape: an opener alone, an indented body, maybe a lone /else and its body", () => {
    const close = (lines: string[]) =>
      getDiagnostics(`${lines.join("\n")}\n`)
        .find((d) => d.code === "missing-continuation")
        ?.fix?.title.endsWith("and end it with /endif") ?? false;
    // Text on the opener's line, an /else with text on its line, /elseif, a condition list: none.
    expect(close(["/if (0) /echo a%;", "/else /echo b"])).toBe(false);
    expect(close(["/if (0)", "    /echo a", "/else /echo b"])).toBe(false);
    expect(close(["/if (0)", "    /echo a", "/elseif (1)", "    /echo b"])).toBe(false);
    expect(close(["/if /test 1", "    /echo a"])).toBe(false);
    expect(close(["/if (1) /echo % a%;", "    /echo % b"])).toBe(false);
    // The simple shape, with the /else at either indentation.
    expect(close(["/if (0)", "    /echo a", "/else", "    /echo b"])).toBe(true);
    expect(close(["/if (0)", "    /echo a", "    /else", "    /echo b"])).toBe(true);
    expect(close(["/if (0)", "    /echo a"])).toBe(true);
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

  it("says when the line ends in %\\, which never continues", () => {
    expect(only(["/if (1) /echo % 5%\\", "/endif"]).message).toBe(
      "This /if ends at the end of line 1, as a \\ after a % doesn't continue a line, so the /endif on line 2 is a separate command: end the line with a \\ that has no % before it.",
    );
    // s52: %%\ too (load_file() looks only at the character before the \; tf dev, 2026-10-14).
    expect(only(["/if (0) /echo % a %%\\", "    /echo % b", "/endif"]).message).toContain("as a \\ after a % doesn't continue a line");
  });

  it("advises LF line endings in a CRLF file even where no \\ was written", () => {
    // c01 (tf dev, 2026-10-14): in a CRLF file, adding the \ alone wouldn't continue the line.
    const d = getDiagnostics("/if (0)\r\n    /echo % a\r\n/endif\r\n/echo % after\r\n").find((x) => x.code === "missing-continuation");
    expect(d?.message).toBe(
      "This /if ends at the end of line 1, which has no \\, so the /endif on line 3 is a separate command: save the file with LF line endings, then end every line but the last with \\ (one before a carriage return doesn't continue a line).",
    );
  });
});

// The second review's probes (scratchpad rev-r1b), each fix applied and run in tf dev, 2026-10-14.
describe("missing-continuation: what a join can reach", () => {
  const text = (lines: string[]) => `${lines.join("\n")}\n`;
  const opener = (t: string) => getDiagnostics(t).find((d) => d.code === "missing-continuation")!;

  it("joins the body of a stray /else in before closing the block, but not an /elseif's", () => {
    const q06c = ["/if (1)", "    /echo % then-branch", "/else", "    /echo % ELSE-BRANCH", "/echo % after"];
    const fixed = applyEdits(text(q06c), opener(text(q06c)).fix!.edits);
    expect(fixed).toBe(text(["/if (1) \\", "    /echo % then-branch%; \\", "/else \\", "    /echo % ELSE-BRANCH%; /endif", "/echo % after"]));
    expect(getDiagnostics(fixed)).toEqual([]);
    const q11c = ["/if (0)", "    /echo % a", "/elseif (0)", "    /echo % ELSEIF-BRANCH", "/echo % after"];
    expect(opener(text(q11c)).fix).toBeUndefined();
  });

  it("offers no join-and-close that would leave a branch empty", () => {
    // r30, r31, r32, r55 (tf dev, 2026-10-14): joined only through the /else or /elseif, the
    // branch is empty and its unindented body runs whatever the /if decides, and tf loads that
    // without a word.
    const shapes = [
      ["/if (1)", "    /echo % then-branch", "/else", "/echo % ELSE-BODY", "/echo % after"],
      ["/if (0)", "    /echo % a", "/elseif (1)", "/echo % ELSEIF-BODY", "/echo % after"],
      ["/if (1)", "    /echo % then-branch", "/else", "; the else body", "/echo % ELSE-BODY", "/echo % after"],
    ];
    for (const shape of shapes) expect(opener(text(shape)).fix?.title ?? "").not.toMatch(/and end it/);
    // r32: no closer of its own taken in, so the add-a-closer fix stays, and tf still reports the /else.
    expect(opener(text(["/if (1) /echo % then-branch", "/else", "/echo % ELSE-BODY"])).fix?.title).toBe("Add %; /endif at the end of the line");
  });

  it("offers no join-and-close after a stray /do or /then", () => {
    // Joined to the /do line it would read /while (i < 3) /done, which never ends.
    expect(opener(text(["/set i=0", "/while (i < 3)", "/do", "    /test ++i", "/echo % i"])).fix).toBeUndefined();
  });

  it("stops at a blank line, as a join does", () => {
    // No /def in between: blank lines alone keep the later lines apart.
    const q30 = ["/if (1) /echo % forgot-endif", "", "/echo % x", "/set foo=1", "    /echo % indented", "", "/endif"];
    expect(found(q30)).toEqual(["missing-continuation@0", "indented-line-after-command@4", "block-structure@6"]);
    const q31 = ["/if (0) /echo % forgot-endif", "", "/set z=1", "", "/if (1) /echo % one%; /endif", "/endif"];
    expect(found(q31)).toEqual(["missing-continuation@0", "block-structure@5"]);
    // A blank line in the middle of the body: the lines after it aren't taken in, and nothing joins.
    const q04 = ["/if (0)", "    /echo % a", "", "    /echo % b", "/endif"];
    const d = opener(text(q04));
    expect(relatedLines(d)).toEqual([1]);
    expect(d.fix).toBeUndefined();
  });

  it("offers no join-and-close when the body or its closer goes on past the reach", () => {
    const body = Array.from({ length: 23 }, (_, k) => `    /echo % b${k}`);
    expect(opener(text(["/if (0)", ...body, "/echo % after"])).fix).toBeUndefined();
    const q26 = ["/if (0)", ...body.slice(0, 20), "/endif", "/echo % after"];
    expect(opener(text(q26)).fix).toBeUndefined();
    expect(found(q26).filter((c) => !c.startsWith("indented"))).toEqual(["missing-continuation@0", "block-structure@21"]);
  });

  it("drops the add-a-closer fix when whitespace cuts off the \\, with no lines taken in", () => {
    // Added, tf would send the "\ " to the world.
    const t = text(["/if (1) /echo % a%; \\ ", "/echo % b"]);
    expect(opener(t).fix).toBeUndefined();
  });

  it("takes in an indented /def, which a join brings into the block", () => {
    const q03 = ["/if (0)", "    /def foo = /echo % foo", "/endif", "/echo % after"];
    const d = only(q03);
    expect(relatedLines(d)).toEqual([1, 2]);
    const fixed = applyEdits(text(q03), d.fix!.edits);
    expect(fixed).toBe(text(["/if (0) \\", "    /def foo = /echo % foo%; \\", "/endif", "/echo % after"]));
    expect(getDiagnostics(fixed)).toEqual([]);
  });

  it("leaves indented lines after a stray closer to indented-line-after-command: a closer starts no branch", () => {
    // r50, r17 (tf dev, 2026-10-14): the line after the /endif runs after the block either way.
    const r50 = ["/if (0)", "    /echo % a", "/endif", "    /echo % b", "/echo % after"];
    expect(found(r50)).toEqual(["missing-continuation@0", "indented-line-after-command@3"]);
    expect(relatedLines(opener(text(r50)))).toEqual([1, 2]);
    const r17 = ["/if (0)", "    /echo % a", "    /endif", "    /echo % b", "/echo % after"];
    expect(found(r17)).toEqual(["missing-continuation@0", "indented-line-after-command@3"]);
  });

  it("takes in the indented lines after a comment line", () => {
    const d = only(["/if (0)", "; comment", "    /echo % a", "/echo % after"]);
    expect(relatedLines(d)).toEqual([2]);
    expect(d.fix?.title).toBe("Join the /if's lines with \\ and end it with /endif");
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
