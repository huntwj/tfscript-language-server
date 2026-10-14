import { RESERVED_MACRO_NAMES } from "../data/commands";
import { code } from "../structure";
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
      .map((s) => {
        const name = s.name.toLowerCase();
        const what = name === "eval" ? "command" : "keyword";
        return {
          line: s.selectionRange.start.line,
          startChar: s.selectionRange.start.character,
          endChar: s.selectionRange.end.character,
          message: `"${s.name}" is a reserved word, so tf refuses this /def and defines nothing: pick another name.`,
          label: "reserved word",
          explanation:
            `tf won't define a macro named after one of its keywords (the control flow, such as ${code("if")} and ` +
            `${code("while")}, and ${code("let")}, ${code("set")}, ${code("setenv")}, ${code("test")}, ${code("return")}, ` +
            `${code("result")} and ${code("exit")}) or ${code("eval")}. It skips the ` +
            `whole ${code("/def")} with the error ${code(`"${s.name}" is a reserved word.`)}, and ${code(`/${name}`)} keeps ` +
            `meaning tf's own ${what}.`,
        };
      });
  },
};
