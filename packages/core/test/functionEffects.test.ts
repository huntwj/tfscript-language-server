import { describe, expect, it } from "vitest";
import { FUNCTION_EFFECTS } from "../src/data/functionEffects";
import { FUNCTIONS } from "../src/data/functions.generated";

describe("the function effects table", () => {
  it("classifies every function tf has, and nothing else", () => {
    expect(Object.keys(FUNCTION_EFFECTS).sort()).toEqual(FUNCTIONS.map((f) => f.name).sort());
  });

  it("marks the functions that change tf's state as having effects", () => {
    for (const name of ["substitute", "regmatch", "rand", "getopts", "echo", "send", "eval", "test", "kbgoto"]) expect(FUNCTION_EFFECTS[name], name).toBe("effects");
  });
});
