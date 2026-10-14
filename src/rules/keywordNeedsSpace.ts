import { entryStructure } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * A block keyword glued to a `(` or `/` after it: `/if(1)`, `/while(x)`, `/else/echo b`. tf reads
 * a keyword up to a blank, `%` or `)` (keyword_parse() in expand.c), so it takes the whole word as
 * a command name and finds none. Proven live: `/if(1) /echo a%; /echo b%; /endif` at the top level
 * gives "if(1): no such command or macro", and `/while(0)%; /done` "while(0): ...". In a macro
 * body the block the keyword should have opened or closed is left wrong, and that error (the
 * `/endif` with no `/if`) is a related location here rather than a problem of its own.
 */
export const keywordNeedsSpace: EntryRule = {
  id: "keyword-needs-space",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "glued") continue;
      const { kind: _kind, ...match } = issue;
      matches.push(match);
    }
    return matches;
  },
};
