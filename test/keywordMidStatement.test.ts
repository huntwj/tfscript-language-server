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
    expect(d.message).toBe("This /if is part of the /set value, not a command, so the /endif has no /if to close: put %; before it.");
    expect(d.related?.map((r) => `${r.range.start.character}:${r.message}`)).toEqual([`${text.indexOf("/endif")}:the /endif has no /if to close`]);
    expect(d.explanation).toContain("which is the error tf reports");
    // An /else or /elseif left with no /if is the same (tf: "unexpected /ELSE in outer block").
    const elsed = "/def a = /let y=2 /if (1) /echo a%; /else /echo b%; /endif";
    expect(found(elsed)).toEqual([`${CODE}@${elsed.indexOf("/if")}`]);
    const inner = "/def a = /echo $(/set c=1 /if (1) /echo x%; /endif)";
    expect(found(inner)).toEqual([`${CODE}@${inner.indexOf("/if")}`]);
  });

  it("reads /@set and /@let as /set and /let", () => {
    expect(first("/def a = /@set z=1 /@if (1) /echo x%; /@endif")?.message).toBe("This /@if is part of the /set value, not a command, so the /endif has no /if to close: put %; before it.");
  });

  it("offers no %; for text in a condition list, which would then be sent to the world", () => {
    // tf, with the %;: "statement starting with 'i' in /WHILE condition", and the text is sent.
    const d = first("/def a = /set i=0%; /while i < 2 /do /test i:=i+1%; /done");
    expect(d?.message).toBe("/do here is not a keyword: it is part of the text before it, so the /while never reaches its /do.");
    expect(d?.fix).toBeUndefined();
    // A command's expression keeps its fix: /if /test 1%; /then is what was meant.
    expect(first("/def a = /if /test 1 /then /echo x%; /endif")?.fix?.title).toBe("Put %; before /then");
  });

  // Review of step 4 (rev-s4 r1, r2), proven in tf: an /if in a value is only text, unless tf stops
  // at what its missing block leaves behind.
  it("says nothing about an /if or /while a value takes when nothing needs its block", () => {
    for (const text of [
      "/def a = /set msg=use /if to branch%; /echo %msg",
      "/def a = /set v3=x /if (1) y /endif%; /echo %v3",
      "/def a = /if (1) /set v18=a /if (0) b%; /endif",
      "/def a = /set w=x /while (0) y",
      "/set tv20=x /if (1) /echo y%; /endif",
    ]) {
      expect(getDiagnostics(`${text}\n`).filter((d) => d.code === CODE), text).toEqual([]);
    }
  });

  it("leaves a stray keyword its own error where a %; before the /if wouldn't pair them", () => {
    // tf: "unexpected /ENDIF in outer block" each time; the /if is in another $(...), behind a
    // block that takes the /endif, or would open a condition list with no /then.
    for (const text of [
      "/def s03 = /set v3=see /if%; /if (1) /echo s03a%; /endif%; /endif",
      "/def s04 = /if (1) /set v4=see /if%; /endif%; /echo s04b%; /endif",
      "/def s05 = /echo [$(/set v5=a /if (1) /echo b)]%; /endif",
      "/def r10 = /set v10=x /if y%; /echo [%v10]%; /endif",
      "/def r17 = /if (1) /set v17=x /if y%; /endif%; /endif",
    ]) {
      expect(getDiagnostics(`${text}\n`).map((d) => d.code), text).toEqual(["block-structure"]);
    }
  });

  it("warns about a keyword a /let or /set value takes in a block that still closes, with a fix only where it is safe", () => {
    // tf loads it clean and sets a to "1 /else /set b=2".
    const text = "/def a = /if (1) /set a=1 /else /set b=2%; /endif\n";
    const d = getDiagnostics(text).find((x) => x.code === CODE)!;
    expect(d.severity).toBe("warning");
    expect(d.fix?.title).toBe("Put %; before /else");
    // With a real /endif later, a %; before the swallowed one would close the /if early.
    expect(first("/def a = /if (1) /let x=1 /endif%; /endif")?.fix).toBeUndefined();
    // Not in text a command is given, which may hold a keyword on purpose.
    expect(found("/def a = /if (0) /echo x /else /echo y%; /endif")).toEqual([]);
    expect(found("/def a = /if (1) /eval /if (x) /set y=1%%; /endif%; /endif")).toEqual([]);
  });

  it("puts %; before every keyword a /set value took, as for any command", () => {
    const d = first("/def a = /if (1) /set v27=x /else /set w27=y /endif");
    expect(d?.severity).toBe("error");
    expect(d?.fix?.title).toBe("Put %; before /else and /endif");
  });

  it("names //x as text, which tf sends with one / dropped", () => {
    expect(first("/def a = /if //x /then /echo y%; /endif")?.message).toBe(
      "/then here is not a keyword: it is part of the text before it, so the /if never reaches its /then.",
    );
  });
});
