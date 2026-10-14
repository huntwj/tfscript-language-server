import { code } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 6 (scripting.md): writing `$[...]` inside an `/if (...)` condition is legal but
 * redundant (the condition is already an expression). Applies everywhere, top level and
 * inside /def bodies alike. Confirmed live that `/elseif` and `/while` conditions get the
 * same "legal, but redundant" warning as `/if` — same expression-evaluation mechanism.
 *
 * The fix rests on tinyfugue/src/expr.c and expand.c: in an expression, `$[` is an operand that
 * compiles its contents inline with expr() (exprsub() with in_expr set, no OP_APPEND), the same
 * code `(` compiles with comma_expr(). So `$[x]` can always become `(x)` — tf's own warning says
 * "Try using (...) instead." — and when it is the whole condition, `($[x])` can become `(x)`.
 */
const IF_OPEN_RE = /\/(?:if|elseif|while)\b\s*\(/gi;

export const dollarBracketInIf: EntryRule = {
  id: "dollar-bracket-in-if",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    const text = entry.text;
    const matches: EntryMatch[] = [];

    for (const open of text.matchAll(IF_OPEN_RE)) {
      if (open.index === undefined) continue;
      const condStart = open.index + open[0].length;
      const closeIndex = findClose(text, condStart, "(", ")");
      if (closeIndex === -1) continue;

      for (let i = condStart; i < closeIndex; i += 1) {
        const ch = text[i] as string;
        if (isQuote(ch)) {
          i = skipString(text, i);
          continue;
        }
        if (ch !== "$" || text[i + 1] !== "[") continue;
        const end = findClose(text, i + 2, "[", "]");
        if (end === -1 || end > closeIndex) break;
        const whole = text.slice(condStart, i).trim() === "" && text.slice(end + 1, closeIndex).trim() === "";
        matches.push({
          start: i,
          end: i + 2,
          message: "This $[...] is redundant: the condition is already an expression.",
          label: "redundant",
          explanation:
            `The ${code("(...)")} after ${code("/if")}, ${code("/elseif")} or ${code("/while")} is an expression, and inside ` +
            `an expression ${code("$[...]")} means the same as ${code("(...)")}. tf warns that it is legal, but redundant.`,
          related: [{ start: end, end: end + 1, message: "its ]" }],
          fix: whole
            ? {
                title: "Remove the $[ and ]",
                edits: [
                  { start: i, end: i + 2, newText: "" },
                  { start: end, end: end + 1, newText: "" },
                ],
              }
            : {
                title: "Write (...) instead of $[...]",
                edits: [
                  { start: i, end: i + 2, newText: "(" },
                  { start: end, end: end + 1, newText: ")" },
                ],
              },
        });
        i = end;
      }
    }

    return matches;
  },
};

function isQuote(ch: string | undefined): boolean {
  return ch === '"' || ch === "'" || ch === "`";
}

/** `i` is at an opening quote; returns the index of its closing quote, or the end of `text`. */
function skipString(text: string, i: number): number {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== quote) j += text[j] === "\\" ? 2 : 1;
  return j;
}

/** `from` is just after an opening `open`; returns the index of its matching `close`, or -1. Skips strings. */
function findClose(text: string, from: number, open: string, close: string): number {
  let depth = 1;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (isQuote(ch)) i = skipString(text, i);
    else if (ch === open) depth += 1;
    else if (ch === close && (depth -= 1) === 0) return i;
  }
  return -1;
}
