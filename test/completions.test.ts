import { describe, expect, it } from "vitest";
import { getCommandCompletions } from "../src/completions";

describe("getCommandCompletions", () => {
  it("offers every known command right after a bare /", () => {
    const items = getCommandCompletions("/");
    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThan(100); // keyword + builtin + stdlib tables combined
  });

  it("offers completions while typing a partial command name", () => {
    const items = getCommandCompletions("  /ec");
    expect(items).not.toBeNull();
    expect(items!.some((i) => i.label === "echo")).toBe(true);
  });

  it("offers completions after a chained command (%; /...)", () => {
    const items = getCommandCompletions('/if (1) /echo yes%; /ec');
    expect(items).not.toBeNull();
  });

  it("returns null in the middle of plain text, not after a /", () => {
    expect(getCommandCompletions("/echo hello wor")).toBeNull();
  });

  it("returns null on an empty line", () => {
    expect(getCommandCompletions("")).toBeNull();
  });

  it("labels commands lowercase even though the source tables are uppercase", () => {
    const items = getCommandCompletions("/")!;
    expect(items.every((i) => i.label === i.label.toLowerCase())).toBe(true);
  });

  it("tags /echo, /for and /addworld as stdlib macros in their detail", () => {
    const items = getCommandCompletions("/")!;
    const byLabel = new Map(items.map((i) => [i.label, i.detail]));
    for (const name of ["echo", "for", "addworld"]) {
      expect(byLabel.get(name)).toContain("stdlib.tf");
    }
  });
});
