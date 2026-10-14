import { isTfSpace, type LogicalEntry } from "../logicalEntries";
import { code, entrySwallowedEndifs, type IssueEdit } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 5 (scripting.md): `/let` (and `/set`) take the rest of the command, up to the next
 * `%;`. Applies everywhere (top level and inside /def bodies alike): it is a property of
 * how tf's command parser reads these two commands, not of where they run. Proven live: after
 * `/let v=1 /echo hi`, `%v` is `1 /echo hi`.
 *
 * Two cases, both proven by scripting.md's case (tests/tfscript/cases/let-swallows-endif.tf):
 *  - An `/endif` swallowed while its `/if` is open. structure.ts's model of tf's compiler finds
 *    these (entrySwallowedEndifs): it knows which `/if`s are really open, so an `/if` that is only
 *    text (`/echo use /if to branch`) doesn't count, and a stray `/endif` is left to
 *    block-structure. There `%;` always separates statements, so the fix is a `%;` before it.
 *  - An `/if` swallowed into the value. This one is still a heuristic: split the entry on literal
 *    `%;` (not quote- or brace-aware), then look for `/if`, as a word of its own, after a
 *    `/let`/`/set` assignment in the same segment. A value like `/set d=/script` is ordinary (a
 *    path), so other `/word`s aren't flagged. The fix only works where `%;` separates statements:
 *    in a macro body, and in a top-level line that starts with `/if` or `/while`. A plain top-level
 *    line reads `%;` as text, so there the diagnostic has no fix.
 */
const SEGMENT_SEPARATOR = "%;";
const ASSIGNMENT_RE = /\/(let|set)\b\s+([^\s=]+)\s*=/gi;
const STATEMENT_ASSIGNMENT_RE = /^\/(let|set)\b\s+([^\s=]+)/i;
// A word of its own, as a keyword would be: after a blank (or the = itself), and ending where
// keyword_parse() ends one (a blank, % or ), not a ( — so /if(x) isn't the keyword either).
const TRAILING_IF_RE = /(?<![^ \t])\/if(?=[ \t\r\f\v%)]|$)/i;
const TOP_BLOCK_RE = /^\/(?:if|while)\b/i;

/** Where to insert a `%;` that ends the statement before `p` (structure.ts's separatorBefore). */
function separatorBefore(text: string, p: number): IssueEdit {
  let q = p;
  while (q > 0 && isTfSpace(text[q - 1]) && text[q - 2] !== "\\") q -= 1;
  // Glued onto a % it would make %%;, which is text; after a \ the % would be escaped.
  if (q === p || text[q - 1] === "%" || text[q - 1] === "\\") return { start: p, end: p, newText: "%; " };
  return { start: q, end: q, newText: "%;" };
}

function swallowedMatch(
  entry: LogicalEntry,
  assignStart: number,
  start: number,
  end: number,
  command: string,
  name: string,
  separates: boolean,
  edits: IssueEdit[],
): EntryMatch {
  const keyword = entry.text.slice(start, end);
  return {
    start,
    end,
    message: separates
      ? `This ${keyword} is part of the ${command} value, not a command: put %; before it.`
      : `This ${keyword} is part of the ${command} value, not a command: put it on a line of its own.`,
    label: `part of the ${command} value`,
    explanation:
      `${code(command)} takes the rest of the statement, up to the next ${code("%;")}, as the value, so ` +
      `${code(keyword)} ends up in the value of ${code(name)} and never runs.` +
      (separates ? "" : ` On a plain line at the top level of a file ${code("%;")} doesn't separate commands, so put ${code(keyword)} on a line of its own.`),
    related: [{ start: assignStart, end: assignStart + command.length, message: `this ${command}` }],
    ...(separates ? { fix: { title: `Put %; before ${keyword}`, edits } } : {}),
  };
}

export const letSwallowsEndif: EntryRule = {
  id: "let-swallows-endif",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const text = entry.text;
    const matches: EntryMatch[] = [];

    for (const w of entrySwallowedEndifs(entry)) {
      const assignment = STATEMENT_ASSIGNMENT_RE.exec(text.slice(w.stmt, w.start));
      if (!assignment) continue;
      // A swallowed /endif with more text after it in the statement needs a %; after it too.
      let next = w.end;
      while (isTfSpace(text[next])) next += 1;
      const edits = [separatorBefore(text, w.start)];
      if (next < text.length && !text.startsWith(SEGMENT_SEPARATOR, next)) edits.push(separatorBefore(text, next));
      const command = `/${(assignment[1] as string).toLowerCase()}`;
      matches.push(swallowedMatch(entry, w.stmt, w.start, w.end, command, assignment[2] as string, true, edits));
    }

    const separates = entry.isDefBody || entry.isOtherMacroBody || TOP_BLOCK_RE.test(text);
    let segmentStart = 0;
    while (segmentStart <= text.length) {
      const sepIndex = text.indexOf(SEGMENT_SEPARATOR, segmentStart);
      const segmentEnd = sepIndex === -1 ? text.length : sepIndex;
      const segment = text.slice(segmentStart, segmentEnd);
      for (const assignment of segment.matchAll(ASSIGNMENT_RE)) {
        if (assignment.index === undefined) continue;
        const assignStart = segmentStart + assignment.index;
        const valueStart = assignStart + assignment[0].length;
        const trailing = TRAILING_IF_RE.exec(text.slice(valueStart, segmentEnd));
        if (!trailing) continue;
        const start = valueStart + trailing.index;
        const command = `/${(assignment[1] as string).toLowerCase()}`;
        const edits = [separatorBefore(text, start)];
        matches.push(swallowedMatch(entry, assignStart, start, start + trailing[0].length, command, assignment[2] as string, separates, edits));
      }
      if (sepIndex === -1) break;
      segmentStart = sepIndex + SEGMENT_SEPARATOR.length;
    }

    return matches.sort((a, b) => a.start - b.start);
  },
};
