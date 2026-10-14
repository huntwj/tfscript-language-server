import { isTfSpace } from "../logicalEntries";
import { code, type IssueEdit } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 5 (scripting.md): `/let` (and `/set`) take the rest of the command, up to the next
 * `%;`. Applies everywhere (top level and inside /def bodies alike): it is a property of
 * how tf's command parser reads these two commands, not of where they run. Proven live: after
 * `/let v=1 /echo hi`, `%v` is `1 /echo hi`.
 *
 * Heuristic: split the entry on literal `%;` (not quote- or brace-aware yet — a known
 * limitation), then within each segment look for a `/let`/`/set` assignment followed, before
 * the segment ends, by `/if` or `/endif`. Deliberately narrow: a value like `/set d=/script`
 * is completely ordinary (a path), so flagging "looks like another command" for any `/word`
 * after the assignment is a false-positive machine. `/if` and `/endif` are the only two
 * keywords scripting.md's own proven case actually shows being swallowed this way; widen
 * this list only once another keyword is proven the same way (a case in
 * tests/tfscript/cases/, run with `just test-tfscript`).
 *
 * The fix, a `%;` before the keyword, only works where `%;` separates statements: in a macro
 * body, and in a top-level line that starts with `/if` or `/while` (structure.ts). A plain
 * top-level line reads `%;` as text, so there the diagnostic has no fix.
 */
const SEGMENT_SEPARATOR = "%;";
const ASSIGNMENT_RE = /\/(let|set)\b\s+([^\s=]+)\s*=/gi;
const TRAILING_COMMAND_RE = /\/(?:if|endif)\b/;
const TOP_BLOCK_RE = /^\/(?:if|while)\b/i;

/** Where to insert a `%;` that ends the statement before `p` (structure.ts's separatorBefore). */
function separatorBefore(text: string, p: number): IssueEdit {
  let q = p;
  while (q > 0 && isTfSpace(text[q - 1]) && text[q - 2] !== "\\") q -= 1;
  // Glued onto a % it would make %%;, which is text; after a \ the % would be escaped.
  if (q === p || text[q - 1] === "%" || text[q - 1] === "\\") return { start: p, end: p, newText: "%; " };
  return { start: q, end: q, newText: "%;" };
}

export const letSwallowsEndif: EntryRule = {
  id: "let-swallows-endif",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];
    const separates = entry.isDefBody || entry.isOtherMacroBody || TOP_BLOCK_RE.test(entry.text);
    let segmentStart = 0;

    while (segmentStart <= entry.text.length) {
      const sepIndex = entry.text.indexOf(SEGMENT_SEPARATOR, segmentStart);
      const segmentEnd = sepIndex === -1 ? entry.text.length : sepIndex;
      const segment = entry.text.slice(segmentStart, segmentEnd);

      for (const assignment of segment.matchAll(ASSIGNMENT_RE)) {
        if (assignment.index === undefined) continue;
        const assignStart = segmentStart + assignment.index;
        const valueStart = assignStart + assignment[0].length;
        const valueText = entry.text.slice(valueStart, segmentEnd);
        const trailing = TRAILING_COMMAND_RE.exec(valueText);
        if (!trailing || trailing.index === undefined) continue;

        const start = valueStart + trailing.index;
        const end = start + trailing[0].length;
        const keyword = trailing[0];
        const command = `/${(assignment[1] as string).toLowerCase()}`;
        const name = assignment[2] as string;
        // A swallowed /endif with more text after it needs a %; after it too.
        let next = end;
        while (isTfSpace(entry.text[next])) next += 1;
        const edits = [separatorBefore(entry.text, start)];
        if (keyword.toLowerCase() === "/endif" && next < segmentEnd) edits.push(separatorBefore(entry.text, next));

        matches.push({
          start,
          end,
          message: separates
            ? `This ${keyword} is part of the ${command} value, not a command: put %; before it.`
            : `This ${keyword} is part of the ${command} value, not a command.`,
          label: `part of the ${command} value`,
          explanation:
            `${code(command)} takes the rest of the statement, up to the next ${code("%;")}, as the value, so ` +
            `${code(keyword)} ends up in the value of ${code(name)} and never runs.` +
            (separates ? "" : ` On a plain line at the top level of a file ${code("%;")} doesn't separate commands, so put ${code(keyword)} on a line of its own.`),
          related: [{ start: assignStart, end: assignStart + command.length, message: `this ${command}` }],
          ...(separates ? { fix: { title: `Put %; before ${keyword}`, edits } } : {}),
        });
      }

      if (sepIndex === -1) break;
      segmentStart = sepIndex + SEGMENT_SEPARATOR.length;
    }

    return matches;
  },
};
