import type { EntryRule, EntryMatch } from "./types";
import { entryStructure } from "../structure";

/**
 * `/if`, `/while` and their keywords as tf's compiler pairs them up (structure.ts, proven in
 * tests/tfscript/cases/block-*.tf): a block with no `/endif`, `/done`, `/then` or `/do`, a
 * keyword with no block to belong to, and text after `/endif` or `/done` with no `%;`. When a
 * keyword that would have fixed it sits in the middle of a statement (`/echo a /endif`), the
 * diagnostic points there, since tf only reads keywords at the start of a statement.
 */
export const blockStructure: EntryRule = {
  id: "block-structure",
  severity: "error",
  scope: "entry",
  check(entry, file): EntryMatch[] {
    return entryStructure(entry, file.tfBuild)
      .filter((i) => i.kind === "block")
      .map(({ kind: _kind, ...match }) => match);
  },
};
