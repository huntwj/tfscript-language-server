import { afterEach, describe, expect, it } from "vitest";
import { getDiagnostics, onRuleError } from "../src/diagnostics";
import { RULES, type Rule } from "../src/rules";

describe("a rule that throws", () => {
  const thrower: Rule = {
    id: "throws",
    severity: "error",
    scope: "entry",
    check() {
      throw new RangeError("Maximum call stack size exceeded");
    },
  };
  let restore: ReturnType<typeof onRuleError> | undefined;

  afterEach(() => {
    RULES.splice(RULES.indexOf(thrower), 1);
    if (restore) onRuleError(restore);
  });

  it("loses only its own diagnostics, and is reported once", () => {
    const reported: string[] = [];
    restore = onRuleError((rule, error) => reported.push(`${rule}: ${(error as Error).message}`));
    RULES.unshift(thrower);
    const codes = getDiagnostics("/def a = /echo $[1+2\n/def b = /echo $[3\n").map((d) => d.code);
    expect(codes).toEqual(["expression-syntax", "expression-syntax"]);
    expect(reported).toEqual(["throws: Maximum call stack size exceeded"]);
  });
});

describe("a rule with very many diagnostics", () => {
  // Review rev-s2d spread.js: push(...found) passed every diagnostic as an argument, and overflowed
  // the stack at about 120000 of them.
  // Review rev-s2d perf.js: loadCommands.ts read each nested /eval by recursion, and 2000 of them
  // overflowed the stack (the rule's try/catch then lost not-substituted-here for the command).
  it("follows /evals nested 2000 deep without a rule failing", () => {
    const reported: string[] = [];
    const restore = onRuleError((rule) => reported.push(rule));
    try {
      getDiagnostics(`${"/eval -s0 ".repeat(2000)}/echo %{x}%; /echo y\n`);
    } finally {
      onRuleError(restore);
    }
    expect(reported).toEqual([]);
  });

  it("keeps 150000 diagnostics from one command", () => {
    const codes = getDiagnostics(`/echo ${"%{x} ".repeat(150000)}\n`).map((d) => d.code);
    expect(codes.filter((c) => c === "not-substituted-here")).toHaveLength(150000);
  });
});
