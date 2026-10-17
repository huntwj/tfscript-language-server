import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDiagnostics } from "../src/diagnostics";
import { applyFormatEdits, formatText, normalise } from "../src/formatting";
import { splitLogicalEntries } from "../src/logicalEntries";
import { macroBodyStart } from "../src/structure";
import { timeBudget } from "./timeBudget";

/**
 * Formatting real scripts, read only: tf's library, the WoTMUD scripts and the tf-* repos. Fast
 * guards, no Docker; scripts/check-format-live.js is the slow check that loads both versions into
 * real tf and compares the macros it stores and what they do.
 */
const PARENT = join(__dirname, "..", "..", "..", "..");
const tfFix = join(PARENT, "..", "mud-ws", "tf-fix");
const CORPORA: [string, string[]][] = [
  ["tinyfugue lib/tf", [join(PARENT, "tinyfugue", "lib", "tf")]],
  ["WoTMUD", [join(PARENT, "..", "wotmud", "tf")]],
  ["tf-* repos", existsSync(tfFix) ? readdirSync(tfFix).filter((d) => d.startsWith("tf-")).map((d) => join(tfFix, d)) : []],
];

/** What an entry runs: its joined text, the blanks formatting may drop (beside a body's %;, after its =) dropped. */
function program(text: string): string[] {
  return splitLogicalEntries(text).map((e) => {
    const body = e.isDefBody || e.isOtherMacroBody ? macroBodyStart(e.text) : -1;
    if (body < 0) return e.text;
    const head = e.text.slice(0, body);
    return normalise(head + e.text.slice(body).replace(/^[ \t]+/, ""), head.length);
  });
}

const diagnosticKeys = (text: string) => getDiagnostics(text).map((d) => `${d.severity} ${d.code}: ${d.message}`).sort();

for (const [name, dirs] of CORPORA) {
  const files = dirs.filter(existsSync).flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".tf")).map((f) => join(d, f)));
  const describeOrSkip = files.length > 0 ? describe : describe.skip;

  describeOrSkip(`formatting the ${name} corpus (read-only)`, () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      it(`${file.slice(PARENT.length + 1)}: the same program and diagnostics, and formatting again changes nothing`, () => {
        const once = applyFormatEdits(text, formatText(text));
        expect(applyFormatEdits(once, formatText(once))).toBe(once);
        expect(program(once)).toEqual(program(text));
        // Positions move; what is reported may not change.
        expect(diagnosticKeys(once)).toEqual(diagnosticKeys(text));
      });
    }

    it("takes a moment, not minutes", () => {
      const started = Date.now();
      for (const file of files) formatText(readFileSync(file, "utf8"));
      expect(Date.now() - started).toBeLessThan(timeBudget(10_000));
    });
  });
}
