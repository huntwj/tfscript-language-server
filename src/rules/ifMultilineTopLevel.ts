import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 2 (scripting.md): a multi-line `/if` ... `/endif` is rejected at the top level of a
 * file — tf's loader reads one *logical* line (after joining any `\`-continued physical
 * lines) per command, so /if and /endif must end up in the same one.
 *
 * logicalEntries.ts already performs that joining for every top-level line, /def or not
 * (confirmed by running tf: a plain, non-/def `/if (1) \` / ... / `/endif` across three
 * physical lines loads clean). So this check does not need a separate /def exemption: once
 * joining is done correctly, counting /if vs /endif tokens in the resulting entry is already
 * right for both cases, and it also catches a genuinely unterminated /if inside a /def body
 * (rule 1: that error surfaces the first time the macro runs, but it is still a real bug).
 *
 * Heuristic, not a real parser: counts tokens rather than tracking nesting, so nested-if
 * ordering is not checked.
 */
const IF_RE = /\/if\b/gi;
const ENDIF_RE = /\/endif\b/gi;

export const ifMultilineTopLevel: EntryRule = {
  id: "if-multiline-top-level",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const ifMatches = [...entry.text.matchAll(IF_RE)];
    if (ifMatches.length === 0) return [];
    const endifCount = [...entry.text.matchAll(ENDIF_RE)].length;
    if (ifMatches.length <= endifCount) return [];

    const first = ifMatches[0];
    if (!first || first.index === undefined) return [];
    return [
      {
        start: first.index,
        end: first.index + first[0].length,
        message:
          "/if has no matching /endif in the same top-level command. tf reads a file one " +
          "command per line (after joining any \\-continued lines), so /if and /endif must " +
          "end up in that same joined line — either on one line with %;, or continued with " +
          "a trailing \\ on every line but the last.",
      },
    ];
  },
};
