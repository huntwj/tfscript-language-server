import type { EntryRule, EntryMatch } from "./types";
import { entryStructure } from "../structure";

/**
 * `/if (...)%;` and `/else%;`: the `%;` ends an empty statement, which sends a blank line to the
 * world. tf warns about exactly these two when it compiles the body (expand.c), and runs it anyway.
 */
export const separatorSendsBlankLine: EntryRule = {
  id: "separator-sends-blank-line",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entryStructure(entry)
      .filter((i) => i.kind === "blank-line")
      .map(({ start, end, message }) => ({ start, end, message }));
  },
};
