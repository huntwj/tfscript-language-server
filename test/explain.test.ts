import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";
import { diagnosticHover, explainCode, explainDiagnostic } from "../src/explain";
import { findCode } from "../src/rules/table";

function explain(text: string): string | undefined {
  const [d] = getDiagnostics(text);
  return d && explainDiagnostic(text, d);
}

describe("explainDiagnostic", () => {
  it("marks the range and its related spans under the source line, then explains and shows the fix", () => {
    const text = "/def a = /if (1) /echo yes /else /echo no /endif\n";
    expect(explain(text)).toBe(
      [
        "```text",
        "1 | /def a = /if (1) /echo yes /else /echo no /endif",
        "  |          ---               ^^^^^          ------ /endif is text too",
        "  |          |                 |",
        "  |          |                 part of the /echo command",
        "  |          |",
        "  |          this /if",
        "```",
        "",
        "tf only reads a keyword at the start of a statement, and statements are separated by `%;`. There is no `%;` " +
          "before `/else`, so `/echo` takes it, and everything after it up to the next `%;`, as its own text. Put `%;` " +
          "before each keyword that should start a statement.",
        "",
        "**Quick fix:** Put %; before /else and /endif",
        "",
        "```tf",
        "/def a = /if (1) /echo yes%; /else /echo no%; /endif",
        "```",
      ].join("\n"),
    );
  });

  it("shows the physical lines from the first mark to the last, numbered", () => {
    const text = ["/def -i a = \\", "    /if (1) \\", "        /echo a%;\\", "        /echo b \\", "    /endif", ""].join("\n");
    const [excerpt] = (explain(text) ?? "").split("\n\n");
    expect(excerpt).toBe(
      [
        "```text",
        "2 |     /if (1) \\",
        "  |     --- this /if",
        "3 |         /echo a%;\\",
        "4 |         /echo b \\",
        "5 |     /endif",
        "  |     ^^^^^^ part of the /echo command",
        "```",
      ].join("\n"),
    );
  });

  it("skips a long stretch between marks with ...", () => {
    const filler = Array.from({ length: 10 }, (_, k) => `        /echo ${k}%;\\`);
    const text = ["/def -i a = \\", "    /if (1) \\", ...filler, "        /echo b \\", "    /endif", ""].join("\n");
    const [excerpt] = (explain(text) ?? "").split("\n\n");
    expect(excerpt).toContain("  |     --- this /if\n   ...\n14 |     /endif");
  });

  it("lines marks up under tabs the way the editor shows them", () => {
    const [excerpt] = (explain("/def a = /echo\t$[1\n") ?? "").split("\n\n");
    expect(excerpt).toContain("1 | /def a = /echo  $[1\n  |                 ^^ never closed");
  });

  it("keeps the primary ^s where a related mark overlaps it, and its label off a wider mark", () => {
    const text = "/def a = /echo 50%{foo bar}\n";
    const [excerpt] = (explain(text) ?? "").split("\n\n");
    expect(excerpt).toContain("  |                  ^^   - the name stops at this space\n");
  });

  it("counts columns in UTF-16 units, as LSP positions do", () => {
    const [, source, marks] = (explain("/def a = /echo 😀😀%; /if (a) /echo b /endif\n") ?? "").split("\n");
    expect(marks?.indexOf("---")).toBe(source?.indexOf("/if"));
    expect(marks?.indexOf("^^^^^^ ")).toBe(source?.indexOf("/endif"));
  });

  it("has nothing to add for a diagnostic with only a message", () => {
    const range = { start: { line: 0, character: 6 }, end: { line: 0, character: 13 } };
    const d = { range, message: "Not found.", code: "load-path", severity: "warning" as const };
    expect(explainDiagnostic("/load nope.tf\n", d)).toBeUndefined();
  });
});

describe("explainCode", () => {
  it("says what a code means from the rule table, with a link to its entry in docs/rules.md", () => {
    expect(explainCode("empty-statement")).toBe(
      "**empty-statement** (R5, empty statements): An empty statement sends a blank line to the world each time it " +
        "runs. Remove the separator or the empty `$()` that makes it, or put a command " +
        "in it. [About this rule]" +
        "(https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md#empty-statement)",
    );
  });

  it("has nothing for a code the table doesn't know", () => {
    expect(explainCode("load-path")).toBeUndefined();
  });
});

/**
 * One input per message variant whose fix differs from the others'. The code's line in the hover is
 * the same for every variant, so it must not give one variant's fix as if it were all of them':
 * where the fixes differ, it leaves the fix to the message.
 */
const VARIANTS: { text: string; code: string; message: RegExp }[] = [
  { text: '/def t = /if (echo("%{x}")) /endif\n', code: "not-substituted-here", message: /inside a string/ },
  { text: "/echo a%; /echo b\n", code: "not-substituted-here", message: /%; doesn't end a command/ },
  { text: "/eval -soff /echo %{x}\n", code: "not-substituted-here", message: /leave out the -s/ },
  { text: "/load %{dir}/x.tf\n", code: "not-substituted-here", message: /put \/eval in front/ },
  { text: "/def t = /if (1) /echo a%; /endif/echo b\n", code: "keyword-needs-space", message: /put %; after \/endif/ },
  { text: "/def t = /if(1) /echo a%; /endif\n", code: "keyword-needs-space", message: /put a space after \/if/ },
  { text: "/def t = /set a=1%;%; /set b=2\n", code: "empty-statement", message: /right after another %;/ },
  { text: "/def t = /echo $()\n", code: "empty-statement", message: /put a command in it/ },
  { text: "/echo before \\ \n/echo after\n", code: "backslash-not-last", message: /whitespace follows it/ },
  { text: "/echo before \\\r\n/echo after\r\n", code: "backslash-not-last", message: /CRLF/ },
  { text: "/echo before %\\ \n/echo after\n", code: "backslash-not-last", message: /This %\\ doesn't continue/ },
];

describe("the hover's code line for each message variant", () => {
  for (const { text, code, message } of VARIANTS) {
    it(`${code}: ${JSON.stringify(text)}`, () => {
      const all = getDiagnostics(text);
      const d = all.find((x) => x.code === code && message.test(x.message));
      expect(d, all.map((x) => `${x.code}: ${x.message}`).join("\n")).toBeDefined();
      const line = explainCode(code) ?? "";
      expect((diagnosticHover(text, d!) ?? "").endsWith(line)).toBe(true);
      // The code's line names no fix that only some variants' messages give.
      if (code === "not-substituted-here") expect(findCode(code)?.entry.summary).not.toMatch(/\/eval|\/def|-s/);
      if (code === "keyword-needs-space") expect(line).toMatch(/as the message says/);
      if (code === "backslash-not-last") expect(line).toMatch(/whitespace or a CRLF line ending follows it, or a `%` comes before it/);
      if (code === "empty-statement") expect(line).toMatch(/the separator or the empty `\$\(\)`/);
    });
  }
});

describe("diagnosticHover", () => {
  it("puts what the code means after the excerpt and explanation", () => {
    const text = "/def a = /if (1) /echo yes /else /echo no /endif\n";
    const [d] = getDiagnostics(text);
    const hover = diagnosticHover(text, d!) ?? "";
    expect(hover.startsWith(explainDiagnostic(text, d!) ?? "?")).toBe(true);
    expect(hover.endsWith(explainCode("keyword-mid-statement") ?? "?")).toBe(true);
  });

  it("has only the code's meaning for a diagnostic with only a message", () => {
    const range = { start: { line: 0, character: 6 }, end: { line: 0, character: 13 } };
    const d = { range, message: "Not found.", code: "unresolved-load", severity: "warning" as const };
    expect(diagnosticHover("/load nope.tf\n", d)).toBe(explainCode("unresolved-load"));
  });
});
