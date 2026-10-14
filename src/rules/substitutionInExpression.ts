import type { EntryRule, EntryMatch } from "./types";
import { entrySubstitution } from "../substitution";

/**
 * A `$[...]`, `%x` or `%{x}` that is itself an operand of an expression: an `/if`, `/elseif` or
 * `/while` condition, a `$[...]`, or the text of a `/test`, `/return` or `/result` that is compiled
 * as written (at the top level). tf warns "$[...] substitution in expression is legal, but
 * redundant" (expr.c `primary_expr()`) and "%{x} substitution in expression is legal, but can be
 * confusing" (expand.c `varsub()`), once per session unless `%pedantic` is on (probes q01, p04).
 * Not inside a string, nor inside a substitution's default, `${...}` or `$(...)`, where they are
 * ordinary substitutions; and not in a macro body's `/test` text, which is substituted before it
 * is compiled (q01: `/test $[3]` in a body gives no warning).
 */
export const substitutionInExpression: EntryRule = {
  id: "substitution-in-expression",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entrySubstitution(entry)
      .issues.filter((i) => i.kind === "operand")
      .map(({ kind: _kind, ...match }) => match);
  },
};
