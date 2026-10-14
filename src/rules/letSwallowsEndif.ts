import { code, entrySwallowed } from "../structure";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 5 (scripting.md): `/let` (and `/set`) take the rest of the command, up to the next
 * `%;`. Applies everywhere (top level and inside /def bodies alike): it is a property of
 * how tf's command parser reads these two commands, not of where they run. Proven live: after
 * `/let v=1 /echo hi`, `%v` is `1 /echo hi`, and after `/set y=2 /let x=1 ...` the whole rest is
 * `y`'s value: the statement's first command takes it.
 *
 * structure.ts's model of tf's compiler finds the keywords (entrySwallowed): an `/if`, or an
 * `/endif` while its `/if` is really open, in the value of a statement that is a /let or /set
 * assignment (scripting.md's case, tests/tfscript/cases/let-swallows-endif.tf). So an `/if` that
 * is only text elsewhere (`/echo use /if to branch`) doesn't count, a stray `/endif` is left to
 * block-structure, each statement gives at most one, and only the first `/endif` per `/if` is
 * flagged: at most one can close it. The fix's `%;`s are placed as structure.ts places its own
 * (separateSwallowed): never glued onto a `%`, and none after the keyword when the statement ends
 * there anyway (a `%;`, `%|`, `%\` or the `)` of a `$(...)`). A plain top-level line reads `%;` as
 * text, so there the diagnostic has no fix.
 */
const ASSIGNMENT_RE = /^\/(let|set)\b\s+([^\s=]+)/i;

export const letSwallowsEndif: EntryRule = {
  id: "let-swallows-endif",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const text = entry.text;
    return entrySwallowed(entry).flatMap((w): EntryMatch[] => {
      const assignment = ASSIGNMENT_RE.exec(text.slice(w.stmt, w.start));
      if (!assignment) return [];
      const command = `/${(assignment[1] as string).toLowerCase()}`;
      const name = assignment[2] as string;
      const keyword = text.slice(w.start, w.end);
      const separates = w.edits.length > 0;
      return [
        {
          start: w.start,
          end: w.end,
          message: separates
            ? `This ${keyword} is part of the ${command} value, not a command: put %; before it.`
            : `This ${keyword} is part of the ${command} value, not a command: put it on a line of its own.`,
          label: `part of the ${command} value`,
          explanation:
            `${code(command)} takes the rest of the statement, up to the next ${code("%;")}, as the value, so ` +
            `${code(keyword)} ends up in the value of ${code(name)} and never runs.` +
            (separates ? "" : ` On a plain line at the top level of a file ${code("%;")} doesn't separate commands, so put ${code(keyword)} on a line of its own.`),
          related: [{ start: w.stmt, end: w.stmt + command.length, message: `this ${command}` }],
          ...(separates ? { fix: { title: `Put %; before ${keyword}`, edits: w.edits } } : {}),
        },
      ];
    });
  },
};
