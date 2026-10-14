import { describe, expect, it } from "vitest";
import { QUICK_FIX, REFACTOR_EXTRACT, REFACTOR_REWRITE, routeCodeActions, TRIGGER_AUTOMATIC, TRIGGER_INVOKED } from "../src/codeActions";

// One line with a quick fix (whitespace after the \) and a body that can be split.
const TEXT = "/def -i a = /echo a%; /echo b\n/echo x \\ \n";
const LINE0 = { start: { line: 0, character: 3 }, end: { line: 0, character: 3 } };
const LINE1 = { start: { line: 1, character: 8 }, end: { line: 1, character: 8 } };
const kinds = (r: ReturnType<typeof routeCodeActions>) => r.map((a) => `${a.kind}: ${a.title}`);

describe("routeCodeActions", () => {
  it("offers a quick fix for the diagnostic under the cursor", () => {
    expect(kinds(routeCodeActions(TEXT, { range: LINE1 }))).toEqual(["quickfix: Remove the whitespace after the \\"]);
  });

  it("offers refactorings on an invoked request, or one that doesn't say how it was made", () => {
    expect(kinds(routeCodeActions(TEXT, { range: LINE0, triggerKind: TRIGGER_INVOKED }))).toEqual(["refactor.rewrite: Split /a's body onto separate lines"]);
    expect(kinds(routeCodeActions(TEXT, { range: LINE0 }))).toEqual(["refactor.rewrite: Split /a's body onto separate lines"]);
  });

  it("leaves refactorings out of the automatic lightbulb check, unless text is selected", () => {
    expect(routeCodeActions(TEXT, { range: LINE0, triggerKind: TRIGGER_AUTOMATIC })).toEqual([]);
    const selection = { start: { line: 0, character: 0 }, end: { line: 0, character: 8 } };
    expect(kinds(routeCodeActions(TEXT, { range: selection, triggerKind: TRIGGER_AUTOMATIC }))).toEqual(["refactor.rewrite: Split /a's body onto separate lines"]);
  });

  it("honours `only`, a kind covering the kinds nested under it", () => {
    const all = { start: { line: 0, character: 0 }, end: { line: 1, character: 10 } };
    expect(routeCodeActions(TEXT, { range: all, only: [QUICK_FIX] }).map((a) => a.kind)).toEqual(["quickfix"]);
    expect(routeCodeActions(TEXT, { range: all, only: [REFACTOR_REWRITE] }).map((a) => a.kind)).toEqual(["refactor.rewrite"]);
    expect(routeCodeActions(TEXT, { range: all, only: ["refactor"] }).map((a) => a.kind)).toEqual(["refactor.rewrite"]);
    expect(routeCodeActions(TEXT, { range: all, only: [""] }).map((a) => a.kind)).toEqual(["quickfix", "refactor.rewrite"]);
    expect(routeCodeActions(TEXT, { range: all, only: ["source"] })).toEqual([]);
  });

  it("carries the diagnostic a quick fix belongs to, and none on a refactoring", () => {
    const [fix, refactor] = routeCodeActions(TEXT, { range: { start: { line: 0, character: 0 }, end: { line: 1, character: 10 } } });
    expect(fix?.diagnostic?.code).toBe("trailing-space-after-backslash");
    expect(refactor?.diagnostic).toBeUndefined();
  });

  describe("extract to a new macro", () => {
    const body = "/def -i a = /echo a%; /echo b%; /return 1\n";
    // "/echo a" and "/echo b%; /return 1".
    const first = { start: { line: 0, character: 12 }, end: { line: 0, character: 19 } };
    const withReturn = { start: { line: 0, character: 22 }, end: { line: 0, character: 41 } };

    it("offers it for a selection of whole statements, on the automatic check too", () => {
      expect(kinds(routeCodeActions(body, { range: first, triggerKind: TRIGGER_AUTOMATIC, only: [REFACTOR_EXTRACT] }))).toEqual([
        "refactor.extract: Extract to a new macro, /a_extracted",
      ]);
      expect(routeCodeActions(body, { range: first, only: ["refactor"] }).map((a) => a.kind)).toEqual(["refactor.rewrite", "refactor.extract"]);
      expect(routeCodeActions(body, { range: first, only: [REFACTOR_REWRITE] }).map((a) => a.kind)).toEqual(["refactor.rewrite"]);
    });

    it("names the new macro past the names the request says are taken", () => {
      const [action] = routeCodeActions(body, { range: first, only: [REFACTOR_EXTRACT], isTaken: (n) => n === "a_extracted" });
      expect(action?.title).toBe("Extract to a new macro, /a_extracted2");
    });

    it("shows a selection it can't extract as disabled, with the reason, only where the client can", () => {
      expect(routeCodeActions(body, { range: withReturn, only: [REFACTOR_EXTRACT] })).toEqual([]);
      const [action] = routeCodeActions(body, { range: withReturn, only: [REFACTOR_EXTRACT], disabledSupport: true });
      expect(action).toMatchObject({ kind: "refactor.extract", edits: [], disabled: expect.stringMatching(/^\/return in the selection/) });
    });
  });
});
