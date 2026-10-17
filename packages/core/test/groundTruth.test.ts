import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDiagnostics, quietInTf } from "../src/diagnostics";
import { asLoaded } from "../src/tfBuild";

/**
 * Runs the diagnostics engine over every case in ~/ai/mud/tests/tfscript/cases/ — the
 * project's ground truth, each file proven clean or problem by running real tf
 * (`just tf-script-check`). This repo does not own that directory — it belongs to a
 * separate, private project — so it is read-only here and the test skips gracefully if the
 * sibling checkout is not present (e.g. this repo cloned on its own elsewhere).
 */
// TFSCRIPT_CASES points at another checkout of the cases (a notes workspace with new ones).
const CASES_DIR = process.env.TFSCRIPT_CASES ?? join(__dirname, "..", "..", "..", "..", "tests", "tfscript", "cases");

const describeOrSkip = existsSync(CASES_DIR) ? describe : describe.skip;

/**
 * Cases whose problem only shows outside getDiagnostics(), or that this server leaves alone on
 * purpose, with why. A call of a macro nothing defines, and a /require tf won't find, need the
 * file's load path (src/workspace), so one file on its own reads clean.
 */
const ELSEWHERE: Record<string, string> = {
  "undefined-macro-goes-on.tf": "undefined-macro, from the load path",
  "load-path-tfpath-replaces-libdir.tf": "unresolved-load, from the load path",
  "load-not-loader-dir.tf": "unresolved-load, from the load path",
  // tf warns that the macro conflicts with the builtin, but it works, so invalid-macro-name leaves it alone.
  "builtin-redefined.tf": "nothing: redefining a builtin that isn't reserved works",
  // The problem is in its ;; run: command (a /load of a missing file), not in the file's own text.
  "long-message-not-cut-by-wrap.tf": "nothing: the case checks tf-script-check, through its run command",
};

describeOrSkip("ground truth (~/ai/mud/tests/tfscript/cases)", () => {
  // describe.skip still runs this callback body to collect the (zero) child tests — only the
  // it()s inside are actually skipped — so this must not call readdirSync on a directory that
  // may not exist, or every test file reports a collection-time crash instead of "skipped".
  const files = existsSync(CASES_DIR) ? readdirSync(CASES_DIR).filter((f) => f.endsWith(".tf")) : [];

  it("found at least one case file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files.filter((f) => !(f in ELSEWHERE))) {
    it(`${file} matches its ;; expect: header`, () => {
      const text = readFileSync(join(CASES_DIR, file), "utf8");
      const match = /^;;\s*expect:\s*(clean|problem)\s*$/m.exec(text);
      expect(match, `${file} has no ';; expect: clean|problem' header`).not.toBeNull();

      const expected = match![1];
      // A note or warning on something tf runs without complaint (quietInTf) doesn't make a clean case a problem.
      // The cases are proven in the tf built from ~/ai/mud/tinyfugue, the fork, so the file is read as it reads it.
      const got = getDiagnostics(asLoaded(text, "fork"), { tfBuild: "fork" }).some((d) => !quietInTf(d)) ? "problem" : "clean";
      expect(got).toBe(expected);
    });
  }
});
