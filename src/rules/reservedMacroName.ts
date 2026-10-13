import { RESERVED_MACRO_NAMES } from "../data/commands";
import { getDocumentSymbols } from "../symbols";
import type { FileRule, LineMatch } from "./types";

/**
 * `/def` of a name tf reserves — the control-flow keywords (`if`, `then`, `let`, `set`, `test`,
 * ...) and `eval` — is refused outright: tf prints `"name" is a reserved word.` and defines
 * nothing, so every `/name` keeps meaning the keyword or builtin. See RESERVED_MACRO_NAMES for
 * the proof. Other builtins (`/quote`, `/lcd`, ...) can be redefined; tf only warns about the
 * conflict, so they are not flagged here.
 */
export const reservedMacroName: FileRule = {
  id: "reserved-macro-name",
  severity: "error",
  scope: "file",
  check(text: string): LineMatch[] {
    return getDocumentSymbols(text)
      .filter((s) => s.kind === "def" && RESERVED_MACRO_NAMES.has(s.name.toLowerCase()))
      .map((s) => ({
        line: s.selectionRange.start.line,
        startChar: s.selectionRange.start.character,
        endChar: s.selectionRange.end.character,
        message: `tf refuses this /def: "${s.name}" is a reserved word, so nothing is defined and /${s.name.toLowerCase()} keeps meaning tf's own ${s.name.toLowerCase() === "eval" ? "command" : "keyword"}.`,
      }));
  },
};
