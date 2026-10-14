import type { EntryRule, EntryMatch } from "./types";
import { entrySubstitution } from "../substitution";

/**
 * A substitution tf can't read: a `%{` that never closes or has another substitution glued onto
 * its selector (`%{foo%{bar}}`, "unmatched { or illegal character '%'"), a `%-` that names no
 * parameter, and a `${` or `$(` that never closes (`varsub()`, `macsub()` and `cmdsub()` in
 * expand.c; proven in tests/tfscript/cases/unclosed-*.tf and the 2026-10-14 probes). Only where tf
 * substitutes (substitution.ts): in a macro body, `/eval`, `/repeat` or `/for` text, and an
 * expression. A plain top-level command substitutes nothing, so `/echo %{foo%{bar}}` there just
 * prints itself (probe p05).
 */
export const substitutionSyntax: EntryRule = {
  id: "substitution-syntax",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entrySubstitution(entry)
      .issues.filter((i) => i.kind === "substitution")
      .map(({ kind: _kind, ...match }) => match);
  },
};
