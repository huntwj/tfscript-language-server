import { describe, expect, it } from "vitest";
import { getCommandCompletions, getCompletions } from "../src/completions";

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

  it("does not offer completions for a / that's part of a path-like value, not a command", () => {
    // Previously any "/" at all triggered completion, even mid-value — noisy for ordinary
    // path-shaped assignments and %{var}-built /load paths.
    expect(getCommandCompletions("/set d=/scr")).toBeNull();
    expect(getCommandCompletions("/load %{d}/ok")).toBeNull();
  });

  it("tags /echo, /for and /addworld as stdlib macros in their detail", () => {
    const items = getCommandCompletions("/")!;
    const byLabel = new Map(items.map((i) => [i.label, i.detail]));
    for (const name of ["echo", "for", "addworld"]) {
      expect(byLabel.get(name)).toContain("stdlib.tf");
    }
  });
});

describe("getCompletions", () => {
  /** Labels offered with the cursor at the `|` in `marked`. */
  function labels(marked: string): string[] {
    const lines = marked.split("\n");
    const line = lines.findIndex((l) => l.includes("|"));
    const character = (lines[line] as string).indexOf("|");
    return getCompletions(marked.replace("|", ""), { line, character }).map((i) => i.label);
  }

  it("offers functions and variables in every kind of expression", () => {
    for (const text of ["/test strl|", "/def x = /echo $[strl|", "/if (strl|", "/def x = /while (i < strl|", "/def x = /return strl|"]) {
      const got = labels(text);
      expect(got, text).toContain("strlen");
      expect(got, text).toContain("wrap");
    }
  });

  it("offers nothing inside a string literal, a comment, or plain text", () => {
    expect(labels('/test strcat("str|')).toEqual([]);
    expect(labels(";; /test strl|")).toEqual([]);
    expect(labels("/echo hello wor|")).toEqual([]);
    expect(labels("/test 12|")).toEqual([]);
  });

  it("knows an expression ends: after /if (...) the next word is a command again", () => {
    expect(labels("/if (x) /ec|")).toContain("echo");
    expect(labels("/if (x) /ec|")).not.toContain("strlen");
  });

  it("offers selectors and variables after %{, variables after a bare %", () => {
    const braced = labels("/def x = /echo %{|");
    expect(braced.slice(0, 3)).toEqual(["*", "#", "?"]);
    expect(braced).toContain("wrap");
    expect(labels("/def x = /echo %wr|")).toContain("wrap");
    expect(labels("/def x = /echo %wr|")).not.toContain("*");
  });

  it("offers variable names after /set and /unset, and an enum's values after /set name=", () => {
    expect(labels("/set wr|")).toContain("wrapsize");
    expect(labels("/unset |")).toContain("matching");
    expect(labels("/set matching=|")).toEqual(["simple", "glob", "regexp", "substr"]);
    expect(labels("/set wrap |")).toEqual(["off", "on"]);
    expect(labels("/set wrapsize=|")).toEqual([]);
  });

  it("offers the script's own variables and macros", () => {
    const text = "/set hp_max=100\n/def -i heal = /echo\n/def x = /test hp_max - |";
    const got = labels(text);
    expect(got).toContain("hp_max");
    expect(got).toContain("heal");
    expect(labels("/def -i heal = /echo\n/he|")).toContain("heal");
  });

  it("works across continuation lines and after %;", () => {
    expect(labels("/def x = \\\n    /let a=1%;\\\n    /test strl|")).toContain("strlen");
    expect(labels("/def x = /test 1%; /ec|")).toContain("echo");
  });

  it("inserts a function with its parentheses and opens its signature", () => {
    const item = getCompletions("/test strl", { line: 0, character: 10 }).find((i) => i.label === "strlen");
    expect(item).toMatchObject({ insertText: "strlen($0)", command: { command: "editor.action.triggerParameterHints" } });
  });
});
