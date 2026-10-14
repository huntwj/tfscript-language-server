import type { EntryRule, EntryMatch } from "./types";
import { entrySubstitution } from "../substitution";

/**
 * An expression tf's compiler can't read (expr.c, `exprsub()` in expand.c): a `$[` that never
 * closes, a string or parenthesis left open, a `)` with no `(`, and an `/if` or `/while` condition
 * with no `)`. Expressions are compiled at any level, so this covers a top-level condition and
 * `/test` too (probe q04: `/test $[1+2` gives "unmatched $[", `/test "abc` "unmatched \" in string
 * literal"), as well as `$[...]` wherever tf substitutes it.
 */
export const expressionSyntax: EntryRule = {
  id: "expression-syntax",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entrySubstitution(entry)
      .issues.filter((i) => i.kind === "expression")
      .map(({ kind: _kind, ...match }) => match);
  },
};
