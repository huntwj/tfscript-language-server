import { code, entryStructure, entrySwallowed, swallower, takesTheRest } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * A keyword in the middle of a statement, which tf reads as text: keyword_parse() only runs at the
 * start of a statement, and the statement's first command takes the rest of it, up to the next
 * `%;` (as its value, its expression, or its arguments). Proven live (rev-s4 r1, r2; s4 k1, k2):
 *  - An error where that leaves the block unfinished, which is where tf stops: `/if (1) /setenv
 *    QV=1 /endif`, `/let lv 1 /endif`, `/echo x /endif` give "expected /endif, found end".
 *    structure.ts points at the keyword instead of the block ("keyword" issues).
 *  - An error for an `/if` or `/while` read as text whose block a later keyword needed: `/set v=1
 *    /if (1) /echo x%; /endif` gives "unexpected /ENDIF in outer block", which is its related
 *    location rather than a problem of its own (structure.ts's parseSettled()). An `/if` that is
 *    only text (`/set msg=use /if to branch`) is nothing.
 *  - A warning for a keyword its block would have taken, in a block that still closes: `/if (1)
 *    /set a=1 /else /set b=2%; /endif` loads clean, and sets a to `1 /else /set b=2`.
 * The fix puts `%;` before each keyword of the statement (never glued onto a `%`, and none after
 * the keyword when the statement ends there anyway). It changes what runs, so it is only ever
 * applied as asked, never by the join fixes' settle step.
 */
export const keywordMidStatement: EntryRule = {
  id: "keyword-mid-statement",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "keyword" && issue.kind !== "keyword-warning") continue;
      const { kind, ...match } = issue;
      matches.push(kind === "keyword-warning" ? { ...match, severity: "warning" } : match);
    }
    const text = entry.text;
    for (const w of entrySwallowed(entry)) {
      if (!w.stray) continue;
      const what = swallower(text, w.stmt, w.start, w.command);
      const keyword = text.slice(w.start, w.end);
      matches.push({
        start: w.start,
        end: w.end,
        message: what.endsWith(" value")
          ? `This ${keyword} is part of ${what}, not a command, so ${w.stray.message}: put %; before it.`
          : `${keyword} here is not a keyword: it is part of ${what}, so ${w.stray.message}: put %; before it.`,
        label: `part of ${what}`,
        explanation:
          `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ` +
          `${takesTheRest(w.command, w.word, what)} So the block it would have opened isn't there, and ` +
          `${code(text.slice(w.stray.start, w.stray.end))} after it has nothing to belong to, which is the error tf reports.`,
        related: [{ start: w.stray.start, end: w.stray.end, message: w.stray.message }],
        fix: { title: `Put %; before ${keyword}`, edits: w.edits },
      });
    }
    return matches;
  },
};
