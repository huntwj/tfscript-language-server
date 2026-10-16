import { describe, expect, it } from "vitest";
import {
  QUICK_FIX,
  REFACTOR_EXTRACT,
  REFACTOR_REWRITE,
  routeCodeActions,
  toLspCodeAction,
  TRIGGER_AUTOMATIC,
  TRIGGER_INVOKED,
  type RoutedCodeAction,
} from "../src/codeActions";

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
    expect(fix?.diagnostic?.code).toBe("backslash-not-last");
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

  describe("extract to a local variable", () => {
    const body = "/def a = /echo $[x + 1]\n";
    // "x + 1".
    const sum = { start: { line: 0, character: 17 }, end: { line: 0, character: 22 } };

    it("offers it as an extract refactoring for a selection in an expression", () => {
      expect(kinds(routeCodeActions(body, { range: sum, triggerKind: TRIGGER_AUTOMATIC, only: [REFACTOR_EXTRACT] }))).toEqual([
        "refactor.extract: Extract to a local variable",
      ]);
      expect(routeCodeActions(body, { range: sum, only: [REFACTOR_REWRITE] })).toEqual([]);
    });

    it("names the variable past the words other files mention", () => {
      const [action] = routeCodeActions(body, { range: sum, only: [REFACTOR_EXTRACT], mentionedOutside: (n) => n === "value" });
      expect(action?.edits.map((e) => e.newText)).toEqual(["/let value2=%; /test value2:=(x + 1)%; ", "{value2}"]);
    });

    it("shows a selection it can't extract as disabled, with the reason, only where the client can", () => {
      const effect = "/def a = /echo $[++x + 1]\n";
      const range = { start: { line: 0, character: 17 }, end: { line: 0, character: 20 } };
      expect(routeCodeActions(effect, { range, only: [REFACTOR_EXTRACT] })).toEqual([]);
      const [action] = routeCodeActions(effect, { range, only: [REFACTOR_EXTRACT], disabledSupport: true });
      expect(action).toMatchObject({ kind: "refactor.extract", edits: [], disabled: expect.stringMatching(/^In the selection, \+\+x changes a variable/) });
    });

    it("asks the client to rename the new name, when the client has a command for it", () => {
      const [action] = routeCodeActions(body, { range: sum, only: [REFACTOR_EXTRACT] });
      expect(action?.rename).toEqual({ at: { line: 0, character: 14 }, name: "value" });
      const lsp = toLspCodeAction(action as RoutedCodeAction, "file:///a.tf", (d) => d, "tfscript.renameAt");
      expect(lsp.command).toEqual({ title: "Rename", command: "tfscript.renameAt", arguments: ["file:///a.tf", { line: 0, character: 14 }, "value"] });
      expect(lsp.edit?.changes["file:///a.tf"]).toEqual(action?.edits);
      // A client that names no command gets the edit alone; so does a disabled action.
      expect(toLspCodeAction(action as RoutedCodeAction, "file:///a.tf", (d) => d)).not.toHaveProperty("command");
      expect(toLspCodeAction({ ...(action as RoutedCodeAction), disabled: "no" }, "file:///a.tf", (d) => d, "tfscript.renameAt")).not.toHaveProperty("command");
      const [macro] = routeCodeActions("/def -i a = /echo a%; /echo b\n", { range: { start: { line: 0, character: 12 }, end: { line: 0, character: 19 } }, only: [REFACTOR_EXTRACT] });
      expect(toLspCodeAction(macro as RoutedCodeAction, "file:///a.tf", (d) => d, "tfscript.renameAt")).not.toHaveProperty("command");
    });
  });
});
