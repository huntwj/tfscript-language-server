import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 6 (scripting.md): writing `$[...]` inside an `/if (...)` condition is legal but
 * redundant (the condition is already an expression). Applies everywhere, top level and
 * inside /def bodies alike.
 */
const IF_OPEN_RE = /\/if\s*\(/gi;
const DOLLAR_BRACKET = "$[";

export const dollarBracketInIf: EntryRule = {
  id: "dollar-bracket-in-if",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    const matches: EntryMatch[] = [];

    for (const open of entry.text.matchAll(IF_OPEN_RE)) {
      if (open.index === undefined) continue;
      const condStart = open.index + open[0].length;
      const closeIndex = findMatchingParen(entry.text, condStart - 1);
      if (closeIndex === -1) continue;

      const condition = entry.text.slice(condStart, closeIndex);
      const dollarOffset = condition.indexOf(DOLLAR_BRACKET);
      if (dollarOffset === -1) continue;

      const start = condStart + dollarOffset;
      matches.push({
        start,
        end: start + DOLLAR_BRACKET.length,
        message:
          "$[...] inside an /if condition is legal but redundant — the condition is " +
          "already an expression. Use the plain expression instead.",
      });
    }

    return matches;
  },
};

/** `openIndex` points at the opening `(`. Returns the index of its matching `)`, or -1. */
function findMatchingParen(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
