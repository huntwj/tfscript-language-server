import type { EntryRule, EntryMatch } from "./types";
import { entryStructure } from "../structure";

/**
 * Not a problem in tf: structure.ts stops following a command past MAX_DEPTH levels of nested
 * blocks and substitutions (it recurses, and would otherwise overflow the stack), and this says
 * so, rather than leaving the rest of the command silently unchecked.
 */
export const nestingTooDeep: EntryRule = {
  id: "nesting-too-deep",
  severity: "information",
  scope: "entry",
  check(entry, file): EntryMatch[] {
    return entryStructure(entry, file.tfBuild)
      .filter((i) => i.kind === "too-deep")
      .map(({ kind: _kind, ...match }) => match);
  },
};
