import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDiagnostics } from "../src/diagnostics";

/**
 * Runs the diagnostics engine over every case in ~/ai/mud/tests/tfscript/cases/ — the
 * project's ground truth, each file proven clean or problem by running real tf
 * (`just tf-script-check`). This repo does not own that directory — it belongs to a
 * separate, private project — so it is read-only here and the test skips gracefully if the
 * sibling checkout is not present (e.g. this repo cloned on its own elsewhere).
 */
const CASES_DIR = join(__dirname, "..", "..", "tests", "tfscript", "cases");

const describeOrSkip = existsSync(CASES_DIR) ? describe : describe.skip;

describeOrSkip("ground truth (~/ai/mud/tests/tfscript/cases)", () => {
  // describe.skip still runs this callback body to collect the (zero) child tests — only the
  // it()s inside are actually skipped — so this must not call readdirSync on a directory that
  // may not exist, or every test file reports a collection-time crash instead of "skipped".
  const files = existsSync(CASES_DIR) ? readdirSync(CASES_DIR).filter((f) => f.endsWith(".tf")) : [];

  it("found at least one case file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} matches its ;; expect: header`, () => {
      const text = readFileSync(join(CASES_DIR, file), "utf8");
      const match = /^;;\s*expect:\s*(clean|problem)\s*$/m.exec(text);
      expect(match, `${file} has no ';; expect: clean|problem' header`).not.toBeNull();

      const expected = match![1];
      const got = getDiagnostics(text).length > 0 ? "problem" : "clean";
      expect(got).toBe(expected);
    });
  }
});
