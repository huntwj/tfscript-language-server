import { code, entryStructure, entrySwallowed } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * A keyword in the middle of a statement, which tf reads as text: keyword_parse() only runs at the
 * start of a statement, and the statement's first command takes the rest of it, up to the next
 * `%;` (as its value, its expression, or its arguments). So the keyword's block is never
 * finished. Proven live: `/if (1) /setenv QV=1 /endif`, `/let lv 1 /endif` and `/echo x /endif` in
 * a body each give "expected /endif, found end" (tests/tfscript/cases/block-*.tf).
 *
 * structure.ts finds these where its model of tf's compiler would otherwise report the block
 * error, and points at the keyword instead ("keyword" issues). A `/let` or `/set` assignment has its
 * own wording, from the swallowed keywords structure.ts records (entrySwallowed): an `/if`, or an
 * `/endif` while its `/if` is really open, in the value. So an `/if` that is only text elsewhere
 * (`/echo use /if to branch`) doesn't count, each statement gives at most one, and only the first
 * `/endif` per `/if` is flagged: at most one can close it. A swallowed `/if` leaves the `/endif`
 * after it with no `/if`, which is where tf stops ("unexpected /ENDIF in outer block"); that
 * `/endif` is a related location here, not a problem of its own. The fix's `%;`s are placed as
 * structure.ts places its own (never glued onto a `%`, and none after the keyword when the
 * statement ends there anyway). A plain top-level line reads `%;` as text, so there the assignment
 * variant has no fix.
 */
const ASSIGNMENT_RE = /^\/@?(let|set)\b\s+([^\s=]+)/i;

export const keywordMidStatement: EntryRule = {
  id: "keyword-mid-statement",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "keyword") continue;
      const { kind: _kind, ...match } = issue;
      matches.push(match);
    }
    const text = entry.text;
    for (const w of entrySwallowed(entry)) {
      const assignment = ASSIGNMENT_RE.exec(text.slice(w.stmt, w.start));
      if (!assignment) continue;
      const command = `/${(assignment[1] as string).toLowerCase()}`;
      const name = assignment[2] as string;
      const keyword = text.slice(w.start, w.end);
      const separates = w.edits.length > 0;
      matches.push({
        start: w.start,
        end: w.end,
        message: separates
          ? `This ${keyword} is part of the ${command} value, not a command: put %; before it.`
          : `This ${keyword} is part of the ${command} value, not a command: put it on a line of its own.`,
        label: `part of the ${command} value`,
        explanation:
          `${code(command)} takes the rest of the statement, up to the next ${code("%;")}, as the value, so ` +
          `${code(keyword)} ends up in the value of ${code(name)} and never runs.` +
          (w.stray ? ` That leaves the ${code(text.slice(w.stray.start, w.stray.end))} after it with no ${code("/if")}, which is the error tf reports.` : "") +
          (separates ? "" : ` On a plain line at the top level of a file ${code("%;")} doesn't separate commands, so put ${code(keyword)} on a line of its own.`),
        related: [{ start: w.stmt, end: w.stmt + command.length, message: `this ${command}` }, ...(w.stray ? [w.stray] : [])],
        ...(separates ? { fix: { title: `Put %; before ${keyword}`, edits: w.edits } } : {}),
      });
    }
    return matches;
  },
};
