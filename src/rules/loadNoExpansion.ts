import { code } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 4 (scripting.md): `%{var}` is not expanded in a top-level command. `/def` bodies are
 * exempt (substitution happens normally while a macro runs), and so are `/for` bodies —
 * proven 2026-10-11 against a false positive on tinyfugue/lib/tf/color.tf and confirmed
 * directly (see LogicalEntry.isForLoop's doc comment): a top-level `/for` body gets %{var}
 * substituted on every iteration, unlike an ordinary top-level line. `/bind`, `/hook` and
 * `/trig`/`/trigc`/`/trigp`/`/trigpc` bodies are exempt for the same reason `/def` is — see
 * LogicalEntry.isOtherMacroBody. A top-level line already starting with `/eval` is exempt
 * too, since that forces one substitution pass — and so is a `%{...}` after an `/eval` further
 * into the entry (e.g. in an `/else` branch of a joined top-level `/if`), as long as no `%;`
 * separates them; proven live 2026-10-12 (`/else /eval /echo %{W}` prints W's value).
 *
 * The fix puts `/eval ` at the start of the command, once per command however many `%{...}` it
 * holds (codeActions.ts offers a fix shared by several diagnostics once). "Without substitution":
 * load_file() runs each line with SUB_KEYWORD (tinyfugue/src/command.c).
 */
const EVAL_PREFIX_RE = /^\s*\/eval\b/i;
const EVAL_BEFORE_RE = /\/eval\b(?:(?!%;).)*$/is;
const PERCENT_BRACE_RE = /%\{[^}]*\}/g;

export const loadNoExpansion: EntryRule = {
  id: "load-no-expansion",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    if (entry.isDefBody || entry.isForLoop || entry.isOtherMacroBody) return [];
    if (EVAL_PREFIX_RE.test(entry.text)) return [];

    const fix = { title: "Put /eval in front of the command", edits: [{ start: 0, end: 0, newText: "/eval " }] };
    return [...entry.text.matchAll(PERCENT_BRACE_RE)]
      .filter((m) => m.index !== undefined)
      .filter((m) => !EVAL_BEFORE_RE.test(entry.text.slice(0, m.index)))
      .map((m) => ({
        start: m.index as number,
        end: (m.index as number) + m[0].length,
        message: `${m[0]} stays as it is in a command at the top level of a file: put /eval in front to substitute it.`,
        label: "not substituted",
        explanation:
          `tf runs the commands in a file without substitution, so the command gets the text ${code(m[0])}, not the ` +
          `variable's value. In a ${code("/def")} body it would be substituted when the macro runs. ${code("/eval")} ` +
          `substitutes the rest of the line once and then runs it: ${code(`/eval ${entry.text.split(/\s/, 1)[0]} ...`)}`,
        fix,
      }));
  },
};
