import type { Rule, RuleMatch } from "./types";

/**
 * Rule 5 (scripting.md): `/let` (and `/set`) take the rest of the command, up to the next
 * `%;`. Applies everywhere (top level and inside /def bodies alike): it is a property of
 * how tf's command parser reads these two commands, not of where they run.
 *
 * Heuristic: split the entry on literal `%;` (not quote- or brace-aware yet — a known
 * limitation), then within each segment look for a `/let`/`/set` assignment followed, before
 * the segment ends, by `/if` or `/endif`. Deliberately narrow: a value like `/set d=/script`
 * is completely ordinary (a path), so flagging "looks like another command" for any `/word`
 * after the assignment is a false-positive machine. `/if` and `/endif` are the only two
 * keywords scripting.md's own proven case actually shows being swallowed this way; widen
 * this list only once another keyword is proven the same way (a case in
 * tests/tfscript/cases/, run with `just test-tfscript`).
 */
const SEGMENT_SEPARATOR = "%;";
const ASSIGNMENT_RE = /\/(let|set)\b\s+[^\s=]+\s*=/gi;
const TRAILING_COMMAND_RE = /\/(?:if|endif)\b/;

export const letSwallowsEndif: Rule = {
  id: "let-swallows-endif",
  severity: "error",
  check(entry): RuleMatch[] {
    const matches: RuleMatch[] = [];
    let segmentStart = 0;

    while (segmentStart <= entry.text.length) {
      const sepIndex = entry.text.indexOf(SEGMENT_SEPARATOR, segmentStart);
      const segmentEnd = sepIndex === -1 ? entry.text.length : sepIndex;
      const segment = entry.text.slice(segmentStart, segmentEnd);

      for (const assignment of segment.matchAll(ASSIGNMENT_RE)) {
        if (assignment.index === undefined) continue;
        const valueStart = segmentStart + assignment.index + assignment[0].length;
        const valueText = entry.text.slice(valueStart, segmentEnd);
        const trailing = TRAILING_COMMAND_RE.exec(valueText);
        if (!trailing || trailing.index === undefined) continue;

        matches.push({
          start: valueStart + trailing.index,
          end: valueStart + trailing.index + trailing[0].length,
          message:
            `${trailing[0]} looks like it was meant to be a separate command, but /${assignment[1]} ` +
            "takes the rest of the command up to the next %; and will swallow it into the " +
            `assigned value. Insert %; before ${trailing[0]}.`,
        });
      }

      if (sepIndex === -1) break;
      segmentStart = sepIndex + SEGMENT_SEPARATOR.length;
    }

    return matches;
  },
};
