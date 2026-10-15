import { describe, expect, it } from "vitest";
import { getCodeActions } from "../src/codeActions";
import { getDiagnostics } from "../src/diagnostics";

const CODE = "keyword-mid-statement";
const WHOLE = { start: { line: 0, character: 0 }, end: { line: 99999, character: 0 } };
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

  // Second review of step 4 (rev-s4b), each proven in tf with the fix applied.
  it("pairs an /if only in a /let, /set or /setenv value, never in other command text", () => {
    // p01, x05: a %; before the /if would make "for help" a command sent to the world.
    for (const text of [
      "/def p01 = /echo see /if (x) for help%; /echo b%; /endif",
      "/def p02 = /echo type /while (1) to loop%; /echo b%; /done",
      "/def p12 = /echo p12 /if (1) a%; /echo b%; /else /echo c%; /endif",
    ]) {
      expect(getDiagnostics(`${text}\n`).map((d) => d.code), text).toEqual(["block-structure"]);
    }
    for (const text of ["/def p09 = /!set v9=1 /if (1) /echo a%; /endif", "/def p08 = /@set v8=1 /if (1) /echo a%; /endif", "/def s = /setenv V=1 /if (1) /echo a%; /endif"]) {
      expect(first(text)?.severity, text).toBe("error");
    }
  });

  it("pairs only where the fix leaves nothing for tf to stop at, and only an /if alone in its value", () => {
    for (const text of [
      // p03: a second stray /endif after it.
      "/def p03 = /set v3=1 /if (1) /echo a%; /endif%; /endif",
      // p05: two /ifs in one value; a %; before either runs something else.
      "/def p05 = /set v5=1 /if (1) /echo a /if (2) /echo b%; /endif",
      // p25: text after the /endif.
      "/def p25 = /set v25=1 /if (1) /echo a%; /endif /echo b",
    ]) {
      expect(found(text).filter((c) => c.startsWith(CODE)), text).toEqual([]);
    }
    // x21: the closest before the stray is the one.
    const x22 = "/def x22 = /set v22=a /if (0) /echo a%; /set w22=b /if (1) /echo b%; /endif";
    expect(found(x22)).toEqual([`${CODE}@${x22.lastIndexOf("/if")}`]);
  });

  it("makes a value's /else the error where its fix clears what tf stops at", () => {
    // x04, w19: the /else, not the /if after it; w09: the /endif, for an /if left open.
    for (const [text, word] of [
      ["/def x04 = /if (0) /set v4=1 /else /if (1) /echo inner%; /endif%; /endif", "/else"],
      ["/def w19 = /if (1) /set x19=1 /else /if (1) /echo a%; /endif%; /endif", "/else"],
      ["/def w09 = /if (1) /if (1) /set x9=1 /endif%; /endif%; /echo x", "/endif"],
    ] as const) {
      const all = getDiagnostics(`${text}\n`);
      expect(all.map((d) => `${d.code}:${d.severity}@${d.range.start.character}`), text).toEqual([`${CODE}:error@${text.indexOf(word)}`]);
      expect(all[0]?.fix?.title, text).toBe(`Put %; before ${word}`);
    }
  });

  it("offers no fix that sends text, or brings in an empty statement", () => {
    // x11: "branch" would become the /else's body; x03: `/else%;` an empty statement.
    expect(first("/def x11 = /if (h) /set h=use /else branch%; /endif")?.fix).toBeUndefined();
    expect(first("/def x03 = /if (1) /set h3=a /else%; /endif")?.fix).toBeUndefined();
    // p13: `/if (1)%;` would be an empty statement.
    expect(found("/def p13 = /set v13=a /if (1)%; /echo b%; /endif")).toEqual(["block-structure@" + "/def p13 = /set v13=a /if (1)%; /echo b%; ".length]);
  });

  it("warns about /!set and a /set without = like any value", () => {
    expect(first("/def w13 = /if (1) /!set x13=1 /else /set y13=2%; /endif")?.message).toContain("part of the /set value");
    expect(first("/def w18 = /if (1) /set x18 1 /else /set y18=2%; /endif")?.message).toContain("part of the /set value");
  });

  // Third review of step 4 (rev-s4c), proven in tf.
  it("pairs no /if followed by text, which the fix would send to the world", () => {
    for (const text of [
      "/def c92 = /set v92=use /if (1) to branch%; /echo b%; /endif",
      '/def c28 = /set v28=a /if (1) "quoted text"%; /endif',
      "/def c32 = /set v32=a /if (1) x%; /endif",
    ]) {
      expect(found(text).filter((c) => c.startsWith(CODE)), text).toEqual([]);
    }
  });

  it("offers the block's own closer too where the keyword may be text, and says so", () => {
    const text = "/def c91 = /if (1) /if (0) /set m91=see /endif%; /echo only-if-0%; /endif%; /echo after\n";
    const d = getDiagnostics(text).find((x) => x.code === CODE)!;
    expect(d.message).toBe(
      "/endif here is not a keyword: it is part of the /set value, so the /if has no /endif: put %; before it, or if it is meant as text, add %; /endif at the end of the body.",
    );
    expect(getCodeActions(text, WHOLE).map((a) => a.title)).toEqual(["Put %; before /endif", "Add %; /endif at the end of the body"]);
  });

  it("reads an assignment from its own statement, with a name tf takes, and leaves no `/set name` query", () => {
    // c93, c94: a %; before the first word of a `name value` value would leave `/set name`.
    expect(first("/def c93 = /if (1) /set v93 /else /echo no%; /endif")?.fix).toBeUndefined();
    expect(found("/def c94 = /set v94 /if (1) /echo in%; /endif%; /echo x").filter((c) => c.startsWith(CODE))).toEqual([]);
    // c49, c55, c56, c43: tf's "illegal variable name", with no value to be in.
    for (const text of [
      "/def c49 = /if (1) /set /else%; /endif",
      "/def c55 = /if (1) /setenv /else%; /endif",
      "/def c56 = /if (1) /let /else /echo b%; /endif",
      "/def c43 = /if (1) /set -x x43=1 /else /set y43=2%; /endif",
    ]) {
      expect(found(text), text).toEqual([]);
    }
  });
});
