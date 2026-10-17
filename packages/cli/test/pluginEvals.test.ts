import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The Claude Code plugin's eval suite (editors/claude-code/evals): each case's regex graders
 * pass a script known to be right and fail one known to be wrong. Each right one was run in
 * real tf (tf_script_check, 2026-10-17) and did what its case asks; each wrong one didn't
 * (scripts/score-evals-live.js scores real runs the same way).
 */
const EVALS = fileURLToPath(new URL("../../../editors/claude-code/evals/", import.meta.url));

/** A regex grader of a case, as `claude plugin eval` applies it: whether the grader passes for `text`. */
function grader(name: string, file: string): (text: string) => boolean {
  const t = readFileSync(path.join(EVALS, name, "graders", `${file}.md`), "utf8");
  const pattern = (/^pattern: '((?:[^']|'')*)'$/m.exec(t)?.[1] ?? "").replace(/''/g, "'");
  const flags = /^flags: (\w+)$/m.exec(t)?.[1] ?? "";
  const match = /^match: (\S+)$/m.exec(t)?.[1];
  return (text) => {
    const found = new RegExp(pattern, flags).test(text);
    return match === "contains" ? found : !found;
  };
}

const L = (...l: string[]) => `${l.join("\n")}\n`;

/** Case, grader, a script, and whether the grader should pass it. */
const CHECKS: [string, string, string, boolean][] = [
  ["top-level-if", "if-lines-continue", L('/if (hp_warn =~ "") \\', "  /set hp_warn=50%;\\", "  /echo hp_warn defaulted to 50%;\\", "/endif"), true],
  ["top-level-if", "if-lines-continue", L('/if (hp_warn =~ "") /set hp_warn=50%; /echo x%; /endif'), true],
  ["top-level-if", "if-lines-continue", L('/if (hp_warn =~ "")', "  /set hp_warn=50", "/endif"), false],
  ["load-from-variable", "load-not-substituted", L("/set mydir=/home/me/tf", "/eval /load %{mydir}/extra.tf"), true],
  ["load-from-variable", "load-not-substituted", L("/set mydir=/home/me/tf", "/load %{mydir}/extra.tf"), false],
  ["load-from-variable", "uses-eval", L("/eval /load %{mydir}/extra.tf"), true],
  ["load-from-variable", "uses-eval", L("/load %{mydir}/extra.tf"), false],
  ["if-else-in-macro", "endif-then-separator", L("/def checkhp = \\", "  /if (hp < 30) \\", "    /echo LOW%;\\", "  /else \\", "    /echo ok%;\\", "  /endif%;\\", "  /echo done"), true],
  ["if-else-in-macro", "endif-then-separator", L("/def checkhp = /if (hp < 30) /echo LOW%; /else /echo ok%; /endif /echo done"), false],
  ["if-else-in-macro", "endif-then-separator", L("/def checkhp = \\", "  /if (hp < 30) /echo LOW%; /endif\\", "  /echo done"), false],
  ["if-else-in-macro", "no-empty-statement-after-condition", L("/def checkhp = /if (hp < 30) /echo LOW%; /endif%; /echo done"), true],
  ["if-else-in-macro", "no-empty-statement-after-condition", L("/def checkhp = /if (hp < 30)%; /echo LOW%; /endif%; /echo done"), false],
  ["trigger-condition", "no-substitution-in-condition", L("/def -mregexp -t'^You get (.*) from the corpse\\.$' loot = /if (strstr({P1}, \"gold\") >= 0) /echo GOLD!%; /endif"), true],
  ["trigger-condition", "no-substitution-in-condition", L("/def -mregexp -t'^You get (.*) from the corpse\\.$' loot = /if ($[strstr({P1}, \"gold\")] >= 0) /echo GOLD!%; /endif"), false],
  ["trigger-condition", "no-substitution-in-condition", L("/def -mregexp -t'^You get (.*) from the corpse\\.$' loot = /if (strstr(\"%{P1}\", \"gold\") >= 0) /echo GOLD!%; /endif"), false],
  ["literal-percent", "percent-dash-escaped", L("/def sale = /echo Everything is 50%%-off today"), true],
  ["literal-percent", "percent-dash-escaped", L("/def sale = /echo Everything is 50%-off today"), false],
  ["multi-line-def", "body-lines-continue", L("/def prep = \\", "  wield sword%;\\", "  wear shield%;\\", "  stand"), true],
  ["multi-line-def", "body-lines-continue", L("/def prep = \\", "  /send wield sword%;\\", "  /send wear shield%;\\", "  /send stand"), true],
  ["multi-line-def", "body-lines-continue", L("/def prep = \\", "  wield sword%;", "  wear shield%;", "  stand"), false],
  ["top-level-echo-var", "top-level-echo-substituted", L("/set greeting=hello", '/if (greeting !~ "") /eval /echo greeting is %{greeting}%; /endif'), true],
  ["top-level-echo-var", "top-level-echo-substituted", L("/set greeting=hello", '/if (greeting !~ "") /echo greeting is %{greeting}%; /endif'), false],
  ["top-level-echo-var", "top-level-echo-substituted", L("/set greeting=hello", '/if (greeting !~ "") \\', "  /echo greeting is $[greeting]%;\\", "/endif"), false],
  ["macro-makes-trigger", "inner-line-deferred", L("/def mktrig = /def -mglob -t'*%{1}*' saw_%{1} = /echo saw: %%*"), true],
  ["macro-makes-trigger", "inner-line-deferred", L("/def mktrig = /def -mregexp -t'%{1}' saw_%{1} = /echo saw: %%{*}"), true],
  ["macro-makes-trigger", "inner-line-deferred", L("/def mktrig = /def -mregexp -t'%{1}' saw_%{1} = /echo saw: %{*}"), false],
  ["macro-makes-trigger", "inner-line-deferred", L("/def mktrig = /def -mglob -t'*%{1}*' saw_%{1} = /echo saw: %*"), false],
  ["literal-separator", "separator-escaped", L("/def legend = /echo Use %%; to separate commands"), true],
  ["literal-separator", "separator-escaped", L("/def legend = /echo Use %; to separate commands"), false],
];

describe("the plugin's eval suite", () => {
  it("has a prompt, a file grader and a judge in each case", () => {
    const cases = readdirSync(EVALS, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "results").map((d) => d.name);
    expect(cases.length).toBeGreaterThanOrEqual(10);
    for (const c of cases) {
      const graders = readdirSync(path.join(EVALS, c, "graders"));
      expect(readdirSync(path.join(EVALS, c)), c).toContain("prompt.md");
      expect(graders, c).toEqual(expect.arrayContaining(["file-written.md", "tf-correct.md"]));
    }
  });

  for (const [name, file, text, pass] of CHECKS) {
    it(`${name}/${file} ${pass ? "passes" : "fails"} ${text.split("\n")[pass ? 0 : 1] ?? ""}`, () => {
      expect(grader(name, file)(text)).toBe(pass);
    });
  }
});
