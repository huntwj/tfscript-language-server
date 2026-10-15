import { entryStructure } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * A block keyword glued to what follows it: `/if(1)`, `/while(x)`, `/else/echo b`, `/endif;`. tf
 * reads a keyword up to a blank, `%` or `)` (keyword_parse() in expand.c), so it takes the whole
 * word as a command name. Proven live: `/if(1) /echo a%; /echo b%; /endif` at the top level gives
 * "if(1): no such command or macro", and `/while(0)%; /done` "while(0): ...". In a macro body the
 * block the keyword should have opened or closed is left wrong, and that error (the `/endif` with
 * no `/if`) is a related location here rather than a problem of its own.
 *
 * Glued to a `(` or `/` it is an error: no macro name is written so. Glued to other punctuation it
 * may be a macro's name (`/def done:x`, `/def if!x`, `/def then?` all work: rev-s4b g2), so it is
 * left alone where this file defines a macro of that name, and is a warning elsewhere, as another
 * file may define one.
 */
export const keywordNeedsSpace: EntryRule = {
  id: "keyword-needs-space",
  severity: "error",
  scope: "entry",
  check(entry, text): EntryMatch[] {
    const matches: EntryMatch[] = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "glued" && issue.kind !== "glued-punct") continue;
      const { kind, ...match } = issue;
      if (kind === "glued-punct") {
        // With one @, tf looks for a builtin, which no /def makes.
        const name = entry.text.slice(issue.start + 1, issue.end);
        if (!name.startsWith("@") && definesMacro(text, name)) continue;
        matches.push({ ...match, severity: "warning" });
      } else matches.push(match);
    }
    return matches;
  },
};

/** Whether `text` has a `/def` (any options) of `name`, which tf matches ignoring case. */
function definesMacro(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(`(?:^|[\\s;|])/@?def\\b[^\\n=]*?\\s${escaped}\\s*=`, "im").test(text);
}
