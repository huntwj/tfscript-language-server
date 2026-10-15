import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RULES } from "../src/rules";
import { RULE_SECTIONS, codeHref, findCode, sectionSlug } from "../src/rules/table";

const SRC = join(__dirname, "..", "src");
// TFSCRIPT_CASES points at another checkout of the cases (a notes workspace with new ones).
const CASES_DIR = process.env.TFSCRIPT_CASES ?? join(__dirname, "..", "..", "tests", "tfscript", "cases");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

/**
 * Every code the server can emit: each rule's id (diagnostics.ts reports a rule's matches under
 * it), and each code written out where a diagnostic is built by hand (`code: "x"`, or
 * `lineDiagnostic(match, "x", ...)` for not-a-command). Not in the table or its renderer, which
 * name every code, so a code only they named would pass unnoticed.
 */
function emittedCodes(): Set<string> {
  const codes = new Set<string>(RULES.map((r) => r.id));
  const skip = new Set([join(SRC, "rules", "table.ts"), join(SRC, "rules", "render.ts")]);
  for (const file of sourceFiles(SRC).filter((f) => !skip.has(f))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/\bcode: "([a-z0-9]+(?:-[a-z0-9]+)*)"/g)) codes.add(m[1] as string);
    for (const m of text.matchAll(/\blineDiagnostic\(\w+, "([a-z0-9]+(?:-[a-z0-9]+)*)"/g)) codes.add(m[1] as string);
  }
  return codes;
}

describe("the rule table", () => {
  const emitted = emittedCodes();
  const listed = RULE_SECTIONS.flatMap((s) => s.codes.map((c) => c.code));

  it("finds the codes the rules emit", () => {
    // A sanity check on the scan: the hand-built ones are found too.
    for (const code of ["not-a-command", "unresolved-load", "undefined-macro", "missing-continuation"]) {
      expect(emitted).toContain(code);
    }
  });

  it("puts every emitted code in exactly one section", () => {
    for (const code of emitted) {
      const sections = RULE_SECTIONS.filter((s) => s.codes.some((c) => c.code === code)).map((s) => s.id);
      expect(sections, `${code} should be in exactly one section`).toHaveLength(1);
    }
  });

  it("lists no code the server doesn't emit, and none twice", () => {
    expect(listed.filter((c) => !emitted.has(c))).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("has sections R1 to R9 in order", () => {
    expect(RULE_SECTIONS.map((s) => s.id)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"]);
  });

  it("gives each rule's code its default severity first", () => {
    for (const rule of RULES) {
      expect(findCode(rule.id)?.entry.severity.split(" ")[0], rule.id).toBe(rule.severity);
    }
  });

  it("gives every section a statement, a case, a source location and a fix", () => {
    for (const s of RULE_SECTIONS) {
      expect(s.statement.length, s.id).toBeGreaterThan(0);
      expect(s.cases.length, s.id).toBeGreaterThan(0);
      expect(s.fix.length, s.id).toBeGreaterThan(0);
      for (const ref of s.source) expect(ref.at, s.id).toMatch(/^[a-z]+\.[ch]:\d+(-\d+)?$/);
    }
  });

  it("links each code to its heading's anchor", () => {
    expect(codeHref("block-structure")).toBe(
      "https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md#block-structure",
    );
    expect(sectionSlug(RULE_SECTIONS[1]!)).toBe("r2-substitution-level");
  });

  it("names each proof case once", () => {
    const named = RULE_SECTIONS.flatMap((s) => s.cases);
    expect(named.filter((c, k) => named.indexOf(c) !== k)).toEqual([]);
  });

  it.skipIf(!existsSync(CASES_DIR))("names only proof cases that exist", () => {
    const cases = new Set(readdirSync(CASES_DIR).map((f) => f.replace(/\.tf$/, "")));
    for (const s of RULE_SECTIONS) for (const c of s.cases) expect(cases, `${s.id}: ${c}`).toContain(c);
  });
});
