import { describe, expect, it } from "vitest";
import { parseUnits } from "../src/structure";

/** Each unit as `list:word=text`, in the order they ended. */
function units(body: string): string[] {
  const { units: us, lists } = parseUnits(body);
  return us.map((u) => `${lists[u.list]?.kind}${u.list}:${u.word}${u.block ? "{}" : ""}=${body.slice(u.start, u.end).trim()}`);
}

describe("parseUnits", () => {
  it("lists a body's statements in one list", () => {
    expect(units("/echo a%; /set x=1%; hello%; /test 1")).toEqual(["body0:echo=/echo a", "body0:set=/set x=1", "body0:=hello", "body0:test=/test 1"]);
  });

  it("gives a block's branches lists of their own, and the block itself a unit in the outer list", () => {
    expect(units("/echo a%; /if (x) /echo b%; /echo c%; /else /echo d%; /endif%; /echo e")).toEqual([
      "body0:echo=/echo a",
      "body2:echo=/echo b",
      "body2:echo=/echo c",
      "body3:echo=/echo d",
      "body0:if{}=/if (x) /echo b%; /echo c%; /else /echo d%; /endif",
      "body0:echo=/echo e",
    ]);
  });

  it("puts a condition list's statements in a condition list", () => {
    expect(units("/while /test i < 3%; /do /test ++i%; /done")).toEqual([
      "condition1:test=/test i < 3",
      "body2:test=/test ++i",
      "body0:while{}=/while /test i < 3%; /do /test ++i%; /done",
    ]);
  });

  it("puts the statements of a $(...) in a cmdsub list, and the statement around it in its own", () => {
    expect(units("/echo $(/echo a%; /echo b) c")).toEqual(["cmdsub1:echo=/echo a", "cmdsub1:echo=/echo b", "body0:echo=/echo $(/echo a%; /echo b) c"]);
  });

  it("records /break, /return and /@ forms by their command", () => {
    expect(units("/while (1) /break 2%; /done%; /return 3%; /@echo x%; /!foo")).toEqual([
      "body2:break=/break 2",
      "body0:while{}=/while (1) /break 2%; /done",
      "body0:return=/return 3",
      "body0:echo=/@echo x",
      "body0:foo=/!foo",
    ]);
  });

  it("says when compiling stops", () => {
    expect(parseUnits("/if (1) /echo a").complete).toBe(false);
    expect(parseUnits("/if (1) /echo a%; /endif").complete).toBe(true);
  });
});
