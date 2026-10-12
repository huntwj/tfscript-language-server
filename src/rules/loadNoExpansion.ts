import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 4 (scripting.md): `%{var}` is not expanded in a top-level command. `/def` bodies are
 * exempt (substitution happens normally while a macro runs), and so are `/for` bodies —
 * proven 2026-10-11 against a false positive on tinyfugue/lib/tf/color.tf and confirmed
 * directly (see LogicalEntry.isForLoop's doc comment): a top-level `/for` body gets %{var}
 * substituted on every iteration, unlike an ordinary top-level line. `/bind`, `/hook` and
 * `/trig`/`/trigc`/`/trigp`/`/trigpc` bodies are exempt for the same reason `/def` is — see
 * LogicalEntry.isOtherMacroBody. A top-level line already starting with `/eval` is exempt
 * too, since that forces one substitution pass.
 */
const EVAL_PREFIX_RE = /^\s*\/eval\b/i;
const PERCENT_BRACE_RE = /%\{[^}]*\}/g;

export const loadNoExpansion: EntryRule = {
  id: "load-no-expansion",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    if (entry.isDefBody || entry.isForLoop || entry.isOtherMacroBody) return [];
    if (EVAL_PREFIX_RE.test(entry.text)) return [];

    const matches = [...entry.text.matchAll(PERCENT_BRACE_RE)];
    return matches
      .filter((m) => m.index !== undefined)
      .map((m) => ({
        start: m.index as number,
        end: (m.index as number) + m[0].length,
        message:
          `${m[0]} is not expanded in a top-level command — tf reads this line literally. ` +
          "Prefix the command with /eval to force substitution.",
      }));
  },
};
