import type { EntryRule, EntryMatch } from "./types";
import { entrySubstitution } from "../substitution";

/**
 * An empty statement, which tf sends to the world as a blank line each time it runs: a `%;` or
 * `%\` straight after another separator, after `/then`, `/do`, `/else` or a `(condition)`, before
 * the first command, or before the `)` of a `$(...)` (structure.ts `emptyStatement()`). Found in
 * every text tf compiles (substitution.ts), so in `/eval`, `/repeat` and `/for` text too. tf warns
 * about only some of these itself, and the message says which.
 */
export const emptyStatement: EntryRule = {
  id: "empty-statement",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entrySubstitution(entry)
      .issues.filter((i) => i.kind === "empty-statement")
      .map(({ kind: _kind, ...match }) => match);
  },
};
