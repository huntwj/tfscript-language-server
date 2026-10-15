import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

const CODE = "condition-list-text";
const found = (text: string) => getDiagnostics(`${text}\n`).filter((d) => d.code === CODE).map((d) => `${d.range.start.character}-${d.range.end.character}`);

// Proven in tf dev, 2026-10-14 (scratchpad s4/c1.tf): tf warns "statement starting with 'x' in /IF
// condition sends text to server", and sends it ("Not connected").
describe("condition-list-text", () => {
  it("warns about text in an /if, /elseif or /while condition list", () => {
    expect(found("/def a = /if x == 1%; /then /echo y%; /endif")).toEqual(["13-14"]);
    expect(found("/def a = /set i=0%; /while i < 2%; /do /test i:=i+1%; /done")).toEqual(["27-28"]);
    const elseif = "/def a = /if /test 0%; /then /echo a%; /elseif hello%; /then /echo b%; /endif";
    expect(found(elseif)).toEqual([`${elseif.indexOf("hello")}-${elseif.indexOf("hello") + 5}`]);
    // //x sends /x, the first / dropped.
    expect(found("/def a = /if //x%; /then /echo y%; /endif")).toEqual(["13-16"]);
    // On a top-level line too.
    expect(found("/if x%; /then /echo y%; /endif")).toEqual(["4-5"]);
    const [d] = getDiagnostics("/def a = /if x == 1%; /then /echo y%; /endif\n").filter((x) => x.code === CODE);
    expect(d?.severity).toBe("warning");
    expect(d?.message).toBe(
      "This text in the /if's condition list isn't a command, so tf sends it to the world: write the condition in parentheses, as in /if (x == 1).",
    );
    expect(d?.fix).toBeUndefined();
  });

  it("leaves commands, a (condition) and an empty statement alone", () => {
    expect(found("/def a = /if /test 1%; /then /echo y%; /endif")).toEqual([]);
    expect(found("/def a = /if /echo cond%; /then /echo y%; /endif")).toEqual([]);
    expect(found("/def a = /if (1) /echo y%; /endif")).toEqual([]);
    expect(found("/def a = /while /test 0%; /do /echo y%; /done")).toEqual([]);
    // An empty statement sends a blank line: that is empty-statement's, not this rule's.
    expect(found("/def a = /if %; /then /echo y%; /endif")).toEqual([]);
    expect(found("/def a = /if%; /test 1%; /then /echo y%; /endif")).toEqual([]);
  });
});
