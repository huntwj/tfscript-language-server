import { entryStructure } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Text in an `/if`, `/elseif` or `/while` condition list: a statement there that isn't a command,
 * which tf sends to the world each time the condition is tested. tf warns "statement starting with
 * 'x' in /IF condition sends text to server, which is probably not what was intended" when it
 * compiles it (list() in expand.c), proven live with `/if x == 1%; /then ...` and
 * `/while i < 2 /do ...`. structure.ts finds them as it reads the list ("condition-text" issues).
 */
export const conditionListText: EntryRule = {
  id: "condition-list-text",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "condition-text") continue;
      const { kind: _kind, ...match } = issue;
      matches.push(match);
    }
    return matches;
  },
};
