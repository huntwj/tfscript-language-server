import type { EntryRule, EntryMatch } from "./types";
import { entryStructure } from "../structure";

/**
 * A `$[`, `${`, `$(` or `%{` that never closes, a string or parenthesis left open in an
 * expression, an `/if (...)` condition with no `)`, and a `%-` that names no selector (structure.ts,
 * proven in tests/tfscript/cases/unclosed-*.tf). Only where tf reads them: in a macro body, and in
 * a top-level `/if`/`/while` condition or `/test`; a plain top-level command substitutes nothing,
 * so `/echo $[1+2` there is just text.
 */
export const unclosedSubstitution: EntryRule = {
  id: "unclosed-substitution",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entryStructure(entry)
      .filter((i) => i.kind === "substitution" || i.kind === "expression")
      .map(({ kind: _kind, ...match }) => match);
  },
};
