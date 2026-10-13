import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDiagnostics } from "../src/diagnostics";

/**
 * tinyfugue/lib/tf/*.tf are the scripts bundled with tf itself (stdlib.tf, color.tf, the
 * keybinding sets, and the rest) — tinyfugue/ is a sibling, private checkout of upstream
 * TinyFugue, so this is read-only, same as the WoTMUD corpus. This is the primary
 * real-script corpus: bigger and more varied than any user-land script, and worth trusting
 * first since it's tf's own code.
 *
 * Fast regression guard, not a correctness oracle — see scripts/check-corpus-live.js for
 * the slow, Docker-backed version that actually asks real tf. Cross-checked against it
 * 2026-10-11 (all 46 files clean, after fixing one real false positive this comparison
 * found: %{var} inside a top-level /for body is substituted per iteration, same as inside a
 * /def — see LogicalEntry.isForLoop in logicalEntries.ts).
 */
const CORPUS_DIR = join(__dirname, "..", "..", "tinyfugue", "lib", "tf");
const describeOrSkip = existsSync(CORPUS_DIR) ? describe : describe.skip;

/**
 * Real bugs in tf's own scripts, each proven by running it in real tf. Everything else must stay
 * clean: a new entry here needs that proof, not just a diagnostic that fires.
 */
const KNOWN: Record<string, string[]> = {
  // /session: the inner "/def %1 = ... %%*%;/else ..." ends at %; in the outer body, so its /else
  // lands outside any /if: tf prints "session: unexpected /ELSE in outer block" (2026-10-13).
  "tintin.tf": ["block-structure@59"],
};

describeOrSkip("tinyfugue lib/tf corpus (read-only)", () => {
  // describe.skip still runs this callback body to collect the (zero) child tests — only the
  // it()s inside are actually skipped — so this must not call readdirSync on a directory that
  // may not exist, or every test file reports a collection-time crash instead of "skipped".
  const files = existsSync(CORPUS_DIR) ? readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".tf")) : [];

  it("found the expected number of scripts", () => {
    // Not a magic number to preserve exactly — just a floor. If this ever fails because
    // tinyfugue/ added files, that's good news (a bigger corpus); update the number.
    expect(files.length).toBeGreaterThanOrEqual(40);
  });

  for (const file of files) {
    it(`${file} does not crash the diagnostics engine`, () => {
      const text = readFileSync(join(CORPUS_DIR, file), "utf8");
      expect(() => getDiagnostics(text)).not.toThrow();
    });

    it(`${file} has only its known problems`, () => {
      const text = readFileSync(join(CORPUS_DIR, file), "utf8");
      const diags = getDiagnostics(text).map((d) => `${d.code}@${d.range.start.line + 1}`);
      expect(diags).toEqual(KNOWN[file] ?? []);
    });
  }
});
