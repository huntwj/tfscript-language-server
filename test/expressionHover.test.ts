import { describe, expect, it } from "vitest";
import { getHover } from "../src/navigation";
import type { HelpEntry } from "../src/workspace/tfHelp";

/** Hover markdown with the cursor at the `|` in `marked`. */
function hover(marked: string, help?: Map<string, HelpEntry>): string | undefined {
  const lines = marked.split("\n");
  const line = lines.findIndex((l) => l.includes("|"));
  const character = (lines[line] as string).indexOf("|");
  const ctx = help ? { uri: "file:///x.tf", files: [], macros: [], help } : undefined;
  return getHover(marked.replace("|", ""), { line, character }, ctx)?.markdown;
}

describe("hover on functions, special variables and selectors", () => {
  it("shows a function's synopsis and argument count in an expression", () => {
    const md = hover("/test reg|match(x, y)") ?? "";
    expect(md).toContain("regmatch(s1, s2)");
    expect(md).toContain("tf function, 2 arguments");
    expect(hover("/def x = /echo $[subs|tr(s, 1)]")).toContain("substr(s, i1, i2)");
  });

  it("uses tf-help's description, but not a command page that shares the function's name", () => {
    const help = new Map<string, HelpEntry>([
      ["strlen()", { usage: ["strlen(s)"], summary: "(int) Length of <s>." }],
      ["echo()", { usage: ["/echo [-peA] <text>"], summary: "Displays text." }],
    ]);
    expect(hover("/test strl|en(x)", help)).toContain("(int) Length of \\<s\\>.");
    const echo = hover("/test ec|ho(x)", help) ?? "";
    expect(echo).toContain("echo(s1 [,attrs [,inline [,dest]]])");
    expect(echo).not.toContain("Displays text.");
  });

  it("shows a special variable in %{...}, %name, an expression, or after /set", () => {
    for (const text of ["/def x = /echo %{wr|ap}", "/def x = /echo %wr|ap", "/test wr|ap & 1", "/set wr|ap=off"]) {
      const md = hover(text) ?? "";
      expect(md, text).toContain("wrap=on");
      expect(md, text).toContain("tf flag variable");
    }
  });

  it("explains selectors", () => {
    expect(hover("/def x = /echo %{P|2}")).toContain("last successful regexp match");
    expect(hover("/def x = /echo %{-|L}")).toContain("every argument except the last");
    expect(hover("/def x = /echo %{3|}")).toContain("the first argument");
  });

  it("stays quiet on ordinary words, unknown functions and a function name outside an expression", () => {
    expect(hover("/echo wr|ap")).toBeUndefined();
    expect(hover("/test nosuch|fn(1)")).toBeUndefined();
    expect(hover("/echo strl|en(x)")).toBeUndefined();
  });
});
