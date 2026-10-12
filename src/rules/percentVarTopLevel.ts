import type { Rule, RuleMatch } from "./types";

/**
 * Rule 4 (scripting.md): `%{var}` is not expanded in a top-level command. `/def` bodies are
 * exempt (substitution happens normally while a macro runs). A top-level line already
 * starting with `/eval` is exempt too, since that forces one substitution pass.
 */
const EVAL_PREFIX_RE = /^\s*\/eval\b/i;
const PERCENT_BRACE_RE = /%\{[^}]*\}/g;

export const percentVarTopLevel: Rule = {
  id: "load-no-expansion",
  severity: "warning",
  check(entry): RuleMatch[] {
    if (entry.isDefBody) return [];
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
