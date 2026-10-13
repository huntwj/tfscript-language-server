import type { EntryRule, EntryMatch } from "./types";
import { entryStructure } from "../structure";

/**
 * Rule 2 (scripting.md): a multi-line `/if` ... `/endif` is rejected at the top level of a
 * file — tf's loader reads one *logical* line (after joining any `\`-continued physical
 * lines) per command, so /if and /endif must end up in the same one.
 *
 * logicalEntries.ts already performs that joining for every top-level line, /def or not
 * (confirmed by running tf: a plain, non-/def `/if (1) \` / ... / `/endif` across three
 * physical lines loads clean). The check itself is structure.ts's model of tf's compiler, which
 * follows nesting and knows a keyword only counts at the start of a statement. This rule is the
 * top-level `/if` that reaches the end of its line still open; every other block problem,
 * including an unclosed `/if` in a macro body, is block-structure's.
 */
export const ifMultilineTopLevel: EntryRule = {
  id: "if-multiline-top-level",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entryStructure(entry)
      .filter((i) => i.kind === "if-top")
      .map(({ start, end, message }) => ({ start, end, message }));
  },
};
