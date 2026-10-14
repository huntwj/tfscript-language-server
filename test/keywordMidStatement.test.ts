import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

const CODE = "keyword-mid-statement";
const found = (text: string) => getDiagnostics(`${text}\n`).map((d) => `${d.code}@${d.range.start.character}`);
const first = (text: string) => getDiagnostics(`${text}\n`).find((d) => d.code === CODE);
/** This rule's code at the column of the last `word` in `text`, alone. */
const at = (text: string, word: string) => [`${CODE}@${text.lastIndexOf(word)}`];

// Proven in tf dev, 2026-10-14 (scratchpad s4/k1.tf, k2.tf, q03.tf).
describe("keyword-mid-statement", () => {
  it("reports a keyword another command takes as text, wherever it sits", () => {
    // tf: "expected /endif, found end" for each.
    for (const text of ["/def a = /if (1) /setenv QV=1 /endif", "/def a = /if (1) /let lv 1 /endif", "/def a = /if (1) /echo x /endif"]) {
      expect(found(text)).toEqual(at(text, "/endif"));
    }
    expect(found("/def a = /while (0) /echo x /done")).toEqual(at("/def a = /while (0) /echo x /done", "/done"));
    expect(first("/def a = /if (1) /return 1 /endif")?.message).toBe(
      "/endif here is not a keyword: it is part of the /return expression, so the /if is never closed.",
    );
  });

  it("reports an /if a /set value swallowed once, with the /endif tf stops at as related", () => {
    // tf: only "unexpected /ENDIF in outer block"; the cause is the /if.
    const text = "/def a = /set v=1 /if (1) /echo x%; /endif";
    expect(found(text)).toEqual(at(text, "/if"));
    const d = first(text)!;
    expect(d.message).toBe("This /if is part of the /set value, not a command: put %; before it.");
    expect(d.related?.map((r) => `${r.range.start.character}:${r.message}`)).toEqual([`${text.indexOf("/set")}:this /set`, `${text.indexOf("/endif")}:this /endif, left with no /if to close`]);
    expect(d.explanation).toContain("which is the error tf reports");
    // An /else or /elseif left with no /if is the same (tf: "unexpected /ELSE in outer block").
    const elsed = "/def a = /let y=2 /if (1) /echo a%; /else /echo b%; /endif";
    expect(found(elsed)).toEqual([`${CODE}@${elsed.indexOf("/if")}`]);
    const inner = "/def a = /echo $(/set c=1 /if (1) /echo x%; /endif)";
    expect(found(inner)).toEqual([`${CODE}@${inner.indexOf("/if")}`]);
  });

  it("reads /@set and /@let as /set and /let", () => {
    expect(first("/def a = /@set z=1 /@if (1) /echo x%; /@endif")?.message).toBe("This /@if is part of the /set value, not a command: put %; before it.");
  });

  it("offers no %; for text in a condition list, which would then be sent to the world", () => {
    // tf, with the %;: "statement starting with 'i' in /WHILE condition", and the text is sent.
    const d = first("/def a = /set i=0%; /while i < 2 /do /test i:=i+1%; /done");
    expect(d?.message).toBe("/do here is not a keyword: it is part of the text before it, so the /while never reaches its /do.");
    expect(d?.fix).toBeUndefined();
    // A command's expression keeps its fix: /if /test 1%; /then is what was meant.
    expect(first("/def a = /if /test 1 /then /echo x%; /endif")?.fix?.title).toBe("Put %; before /then");
  });
});
