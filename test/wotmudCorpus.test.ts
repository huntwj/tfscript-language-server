import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDiagnostics } from "../src/diagnostics";

/**
 * ~/ai/wotmud/tf/*.tf are real, in-use tf scripts from a separate, sibling project
 * (read-only here, never edit). This is a fast regression guard,
 * not a correctness oracle: no Docker, so it can't ask real tf anything new. It records
 * today's diagnostic output (cross-checked once against real tf via tf-script-check,
 * mounting the repo read-only at /wotmud — see scripts/check-corpus-live.js for the repeatable
 * version of that check) and fails if it ever changes, so a rule change that starts
 * misfiring on real scripts is caught immediately.
 */
const CORPUS_DIR = join(__dirname, "..", "..", "..", "wotmud", "tf");
const describeOrSkip = existsSync(CORPUS_DIR) ? describe : describe.skip;

// Cross-checked against real tf 2026-10-11: `tf_script_check.py --mount <wotmud>=/wotmud
// /wotmud/tf/wotmud.tf` (which /loads logging.tf and mapping.tf in turn) reported 0 problem
// lines. If this ever needs to change, re-run that check before updating it.
const EXPECTED_CLEAN = new Set(["logging.tf", "mapping.tf", "wotmud.tf"]);

describeOrSkip("WoTMUD corpus (~/ai/wotmud/tf, read-only)", () => {
  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".tf"));

  it("found the expected scripts", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} does not crash the diagnostics engine`, () => {
      const text = readFileSync(join(CORPUS_DIR, file), "utf8");
      expect(() => getDiagnostics(text)).not.toThrow();
    });

    if (EXPECTED_CLEAN.has(file)) {
      it(`${file} stays clean`, () => {
        const text = readFileSync(join(CORPUS_DIR, file), "utf8");
        const diags = getDiagnostics(text);
        expect(diags, JSON.stringify(diags, null, 2)).toEqual([]);
      });
    }
  }
});
