import { describe, expect, it } from "vitest";
import { encodeSemanticTokens, getSemanticTokens } from "../src/semanticTokens";

/** Each token as "text:type[+modifiers]". */
function tokens(text: string): string[] {
  const lines = text.split("\n");
  return getSemanticTokens(text).map((t) => {
    const word = (lines[t.line] as string).slice(t.character, t.character + t.length);
    return [`${word}:${t.type}`, ...t.modifiers].join("+");
  });
}

describe("getSemanticTokens", () => {
  it("tells your macros, tf's commands and keywords apart", () => {
    expect(tokens("/def -i greet = /if (1) /echo hi%; /greet%; /@eval x%; /nosuch%; /endif\n")).toEqual([
      "def:function+defaultLibrary",
      "greet:function+declaration",
      "if:keyword",
      "echo:function+defaultLibrary",
      "greet:function",
      "eval:function+defaultLibrary",
      "endif:keyword",
    ]);
  });

  it("colours a keyword as one even when a macro of that name is attempted", () => {
    expect(tokens("/def then = /echo\n/then\n")).toContain("then:keyword");
  });

  it("marks macro substitutions, and tf's selectors apart from variables", () => {
    expect(tokens("/def g = /echo ${g} %1 %{*} %{-L} %{P2} %{name} %{name-dflt} %who %% %%{x}\n")).toEqual([
      "def:function+defaultLibrary",
      "g:function+declaration",
      "echo:function+defaultLibrary",
      "g:macro",
      "1:parameter",
      "*:parameter",
      "-L:parameter",
      "P2:parameter",
      "name:variable",
      "name:variable",
      "who:variable",
    ]);
  });

  it("marks the variable /set, /let and /setenv declare, and the one /unset names", () => {
    expect(tokens("/set hp=10\n/let x 1\n/unset hp\n")).toEqual([
      "set:function+defaultLibrary",
      "hp:variable+declaration",
      "let:function+defaultLibrary",
      "x:variable+declaration",
      "unset:function+defaultLibrary",
      "hp:variable",
    ]);
  });

  it("skips comments and %{a%{b}} (not a valid selector)", () => {
    expect(tokens(";; /echo %1\n/echo %{a%{b}}\n")).toEqual(["echo:function+defaultLibrary", "b:variable"]);
  });

  it("uses the load path: macros from other files and the tf library", () => {
    const ctx = {
      uri: "file:///a.tf",
      files: [],
      macros: [
        { uri: "file:///b.tf", label: "b.tf", lines: [], library: false, loaded: true, symbol: { name: "helper" } },
        { uri: "file:///lib/alias.tf", label: "alias.tf", lines: [], library: true, loaded: true, symbol: { name: "alias" } },
        { uri: "file:///lib/kb.tf", label: "kb.tf", lines: [], library: true, loaded: false, symbol: { name: "kb_x" } },
      ],
    } as never;
    const t = getSemanticTokens("/helper%; /alias%; /kb_x\n", ctx).map((x) => `${x.type}${x.modifiers.length ? "+" : ""}${x.modifiers.join("+")}`);
    expect(t).toEqual(["function", "function+defaultLibrary"]);
  });
});

describe("encodeSemanticTokens", () => {
  it("writes positions relative to the previous token", () => {
    const data = encodeSemanticTokens([
      { line: 0, character: 1, length: 3, type: "function", modifiers: ["defaultLibrary"] },
      { line: 0, character: 6, length: 2, type: "parameter", modifiers: [] },
      { line: 2, character: 4, length: 5, type: "function", modifiers: ["declaration"] },
    ]);
    expect(data).toEqual([0, 1, 3, 0, 2, 0, 5, 2, 4, 0, 2, 4, 5, 0, 1]);
  });
});
