import { code } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * `%{selector}` / `%{selector-default}`: confirmed directly in tinyfugue/src/expand.c's
 * varsub() that after the selector is scanned, the very next character must be `-` (starting
 * a default value) or `}` (closing the substitution) — nothing else. Confirmed live:
 * `%{foo%{bar}}` (a selector directly followed by another substitution, no `-`) produces
 * tf's own "unmatched { or illegal character" and aborts the macro; `%{foo-%{bar}}` (the `-`
 * default form, which may itself contain further substitutions per
 * tinyfugue/htmldoc/topics/substitution.html) loads and runs fine. Nesting only works through
 * the default value, never by gluing a second substitution directly onto the selector.
 *
 * Selector shape per tinyfugue/htmldoc/topics/substitution.html's own documented list —
 * verified directly, not guessed: name, 0/1/2/3/etc, #, *, ?, -1/-2/etc, L1/L2/etc (bare "L"
 * means "L1"), -L1/-L2/etc (bare "-L" means "-L1"), Pn, R. There is NO "1-5"-style range form
 * in tf's selector grammar at all — an earlier version of this pattern invented one, which
 * caused exactly the false positive this comment is now warning against: it swallowed the
 * valid default-value separator in %{2-%{1}} (real, working code from tinyfugue's own
 * filexfer.tf) as if it were part of the selector, firing on correct code. Caught by testing
 * against real-world scripts, not just hand-written cases — the reason this project treats a
 * corpus check as part of proving a rule, not an optional afterthought.
 *
 * Deliberately narrow beyond matching the real grammar: only flags when the character right
 * after the selector is itself the start of another substitution (% or $) — the one case
 * actually proven live — not any other stray character tf's own selector grammar might also
 * reject (its #/?/* special-cases have additional corner conditions this does not attempt to
 * replicate), to avoid guessing past what's actually been verified.
 *
 * `(?<!%)` guards against %%{...} — percent compression ("sequences of %'s are replaced by a
 * sequence of one fewer %'s") — found as a second real false positive in the very same
 * corpus check (kbstack.tf's "%%{_line}" etc.): without the lookbehind, the second % of an
 * escaped %% pair reads as if it were a fresh %{ opener. Only handles exactly one escaping %,
 * same as continuesToNextLine's own single-character %\ check elsewhere in this project — an
 * odd run of three or more %'s immediately before { is a corner this doesn't attempt either.
 */
const PERCENT_BRACE_SELECTOR_RE = /(?<!%)%\{([A-Za-z_][A-Za-z0-9_]*|[#?*]|[0-9]+|-(?:L[0-9]*|[0-9]+))/g;

export const badSubstitutionSelector: EntryRule = {
  id: "bad-substitution-selector",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];

    for (const m of entry.text.matchAll(PERCENT_BRACE_SELECTOR_RE)) {
      if (m.index === undefined) continue;
      const afterSelector = m.index + m[0].length;
      const nextChar = entry.text[afterSelector];
      if (nextChar !== "%" && nextChar !== "$") continue;

      const selector = m[1] as string;
      matches.push({
        start: afterSelector,
        end: afterSelector + 1,
        message: `%{${selector} needs a } or a - after the name: another substitution can't follow it directly.`,
        label: "needs } or - here",
        explanation:
          `After the name in ${code(`%{${selector}`)}, tf only accepts ${code("}")}, which ends the substitution, or ` +
          `${code("-")}, which starts a default value. To use another substitution as the default, write ` +
          `${code(`%{${selector}-${nextChar === "%" ? "%{...}" : "$[...]"}}`)}; to put two values side by side, close the ` +
          `first one: ${code(`%{${selector}}${nextChar === "%" ? "%{...}" : "$[...]"}`)}.`,
        related: [{ start: m.index, end: m.index + 2, message: "this %{" }],
      });
    }

    return matches;
  },
};
