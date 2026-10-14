import { entryLoads } from "../loadCommands";
import { isTfSpace } from "../logicalEntries";
import { code, parseRegions, type IssueEdit } from "../structure";
import { entrySubstitution, type ContextStatement, type EvalLevel, type LevelOption } from "../substitution";
import type { EntryRule, EntryMatch } from "./types";

/**
 * Rule 4 (scripting.md): text tf doesn't substitute, where it was surely meant to be. tf reads a
 * plain top-level line without substitution, a top-level `/if` or `/while` line with only `%;`
 * separating, and `/eval -soff` and `-son` text the same ways (substitution.ts has the table, and
 * the proofs). So:
 *
 *  - `%{name}` there stays as it is: `/load %{d}/a.tf` looks for a file called `%{d}/a.tf`.
 *    Not in a macro body, an `/eval`, a `/repeat`'s, `/at`'s or `/quote`'s command, or a `/for`,
 *    which are substituted, nor as an operand in an expression, which reads it as a variable.
 *  - Nor in a string in a condition or `$[...]`, even in a macro body: nothing substitutes it.
 *  - `%name` is only flagged in a `/load` or `/require` path, where it can only be meant as a
 *    variable: elsewhere a top-level `%name` is usually meant as text (`/set
 *    std_clock_format=%H:%M` in tfstatus.tf).
 *  - `%;` on a plain line doesn't separate: `/set a=1%; /set b=2` sets a to `1%; /set b=2`. tf
 *    runs it without complaint, so this is information, not a warning, and a value that holds it
 *    (`/set cmd=/echo a%; /echo b`, for a later `/eval`) may hold it on purpose.
 *
 * A `%` in a run of them (`%%{x}`) is left alone: whoever wrote it was thinking about escapes.
 */
const PERCENT_NAME_RE = /%[A-Za-z_][A-Za-z0-9_]*/g;
const SEPARATOR_RE = /%;/g;
const BLOCK_KEYWORDS = new Set(["then", "else", "elseif", "endif", "do", "done"]);
const VALUE_COMMANDS = new Set(["set", "let", "setenv"]);
/** How far past a `%{` its end is looked for: a substitution is a few words, not a file. */
const SUBSTITUTION_LIMIT = 4096;

/**
 * Each `%{...}` in `text` that tf could read if it substituted there, as `/eval` would, not one in
 * a run of `%`s. Where it ends is the structure parser's to say: a default ends at the first `}`
 * a nested substitution doesn't take (expand.c `varsub()`, review rev-s2 p6: `%{foo-a}b}` prints
 * `ab}`), so `%{x-%{y}}` is one and `%{x-{} and %{y}` two. Not one tf can't read at all, such as
 * `%{foo%{bar}}` (substitution-syntax): putting `/eval` in front of that would only make an error
 * of text that prints today.
 */
function percentBraces(text: string): { index: number; text: string }[] {
  const found: { index: number; text: string }[] = [];
  for (let at = text.indexOf("%{"); at >= 0; at = text.indexOf("%{", at + 1)) {
    if (text[at - 1] === "%") continue;
    const read = parseRegions(text.slice(at, at + SUBSTITUTION_LIMIT), "body").spans.find(
      (s) => s.start === 0 && s.kind === "substitution" && s.inner,
    );
    if (read) {
      found.push({ index: at, text: text.slice(at, at + read.end) });
      at += read.end - 1;
      continue;
    }
    // Unreadable: nothing in it is a substitution of its own either (the `%{bar}` of
    // `%{foo%{bar}}`), so skip to the } that balances its {, or to the end.
    let end = at + 2;
    for (let depth = 1; end < text.length; end += 1) {
      if (text[end] === "{") depth += 1;
      else if (text[end] === "}" && (depth -= 1) === 0) break;
    }
    at = end;
  }
  return found;
}

/** The innermost statement holding `offset`. */
function statementAt(statements: ContextStatement[], offset: number): ContextStatement | undefined {
  let found: ContextStatement | undefined;
  for (const st of statements) if (st.start <= offset && offset < st.end) found = st;
  return found;
}

/** `/eval -soff`'s or `/quote -son`'s name, as written in the advice. */
function evalName(e: EvalLevel): string {
  return `/${e.command} -s${e.mode === "top" ? "off" : "on"}`;
}

/** An `-s` option as the advice names it: `-soff` for the `soff` in `-Ssoff` too. */
function optionName(text: string, o: LevelOption): string {
  return `${o.whole ? "" : "-"}${text.slice(o.start, o.end)}`;
}

export const notSubstitutedHere: EntryRule = {
  id: "not-substituted-here",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    const text = entry.text;
    const { contexts, inExpression, statements } = entrySubstitution(entry);
    const unsubstituted = (at: number): boolean => {
      const c = contexts[at];
      if (c !== "keyword" && c !== "newline") return false;
      // A macro definition's options aren't substituted either, but the body is what matters.
      const st = statementAt(statements, at);
      return !(st && st.body !== undefined && at < st.body);
    };
    /** Edits that take an `/eval`'s or `/quote`'s `-s` options out, a word with the blanks after it. */
    const dropOptions = (e: EvalLevel): IssueEdit[] =>
      e.options.map((o) => {
        let end = o.end;
        while (o.whole && end < text.length && isTfSpace(text[end])) end += 1;
        return { start: o.start, end, newText: "" };
      });
    const out: EntryMatch[] = [];

    /**
     * Whether `st` can be substituted as written: its text, read as `/eval` reads it, has no
     * substitution tf can't read. Else a fix that substitutes it would only make an error of a line
     * that runs today (review rev-s2 p6: `/echo %{x-} %{x%{y}}`).
     */
    const readable = (st: ContextStatement | undefined): boolean =>
      !st || !parseRegions(text.slice(st.start, st.end), "body").issues.some((i) => i.kind === "substitution" || i.kind === "expression");

    const variable = (start: number, written: string): void => {
      const st = statementAt(statements, start);
      const at = st?.start ?? 0;
      const base = {
        start,
        end: start + written.length,
        label: "not substituted",
      };
      const safe = readable(st);
      if (st?.viaEval) {
        const name = evalName(st.viaEval);
        out.push({
          ...base,
          message: `${written} stays as it is in ${name} text: leave out the -s option to substitute it.`,
          explanation:
            `${code(name)} runs its text ${st.viaEval.mode === "top" ? "as a plain line of a file is run" : "as a top-level /if line is run"}, ` +
            `without substituting variables, so the command gets the text ${code(written)}. Without ${code("-s")}, ` +
            (st.viaEval.command === "eval"
              ? `${code("/eval")} substitutes its text once and then runs it.`
              : `${code("/quote")} runs the command as a macro body is run, substituting it.`),
          ...(safe ? { fix: { title: `Leave out ${optionName(text, st.viaEval.options.at(-1)!)}`, edits: dropOptions(st.viaEval) } } : {}),
        });
        return;
      }
      out.push({
        ...base,
        message: `${written} stays as it is ${st?.level === "newline" ? "in a top-level /if or /while line" : "in a command at the top level of a file"}: put /eval in front of the command to substitute it.`,
        explanation:
          `tf runs the commands in a file without substituting variables, so the command gets the text ${code(written)}, ` +
          `not the variable's value. Inside a top-level ${code("/if")} or ${code("/while")} line, ${code("%;")} separates ` +
          `commands but still nothing is substituted. In a ${code("/def")} body it would be substituted when the macro ` +
          `runs, and in a condition or ${code("/test")} it is read as a variable. ${code("/eval")} substitutes the rest ` +
          `of the command once and then runs it: ${code(`/eval ${text.slice(at).split(/\s/, 1)[0]} ...`)}`,
        ...(safe ? { fix: { title: "Put /eval in front of the command", edits: [{ start: at, end: at, newText: "/eval " }] } } : {}),
      });
    };

    for (const m of percentBraces(text)) {
      const at = m.index;
      if (unsubstituted(at)) {
        variable(at, m.text);
      } else if (contexts[at] === "string") {
        const name = /^%\{([^}-]*)/.exec(m.text)?.[1] ?? "";
        out.push({
          start: at,
          end: at + m.text.length,
          message: `${m.text} stays as it is inside a string in an expression: take it out of the quotes and write {${name}}, as in strcat("...", {${name}}).`,
          label: "not substituted",
          explanation:
            `An expression doesn't substitute inside its strings, and nothing else does in a condition or ${code("$[...]")}, ` +
            `even in a macro body, so the string holds the text ${code(m.text)}. Outside the quotes, ${code(`{${name}}`)} reads ` +
            `the variable: ${code(`strcat("a", {${name}}, "b")`)}.`,
        });
      }
    }
    for (const load of entryLoads(entry)) {
      if (load.pending.includes("full")) continue;
      for (const m of text.slice(load.start, load.end).matchAll(PERCENT_NAME_RE)) {
        const at = load.start + (m.index as number);
        if (text[at - 1] !== "%" && unsubstituted(at)) variable(at, m[0]);
      }
    }

    for (const m of text.matchAll(SEPARATOR_RE)) {
      const at = m.index as number;
      if (text[at - 1] === "%" || contexts[at] !== "keyword" || inExpression[at]) continue;
      const st = statementAt(statements, at);
      // A macro definition's options (an -E expression) and body are read later, their own way.
      if (!st || st.body !== undefined) continue;
      let next = at + 2;
      while (next < st.end && isTfSpace(text[next])) next += 1;
      // A %; with nothing after it is a body line whose /def is missing (missing-continuation's case).
      if (next >= st.end) continue;
      const name = st.word ? `/${st.word}` : "the text";
      const where = st.viaEval ? `in ${evalName(st.viaEval)} text` : "on a plain top-level line";
      const value = VALUE_COMMANDS.has(st.word);
      const advice = st.viaEval
        ? `give the /${st.viaEval.command} -son, or leave out the -s option`
        : value
          ? "if they are meant as commands, put each on a line of its own"
          : "put each command on a line of its own, or start the line with /eval";
      const match: EntryMatch = {
        start: at,
        end: at + 2,
        severity: "information",
        message: value
          ? `%; doesn't end a command ${where}, so the ${name} value includes it and the rest of the line: ${advice}.`
          : `%; doesn't end a command ${where}, so it and the rest of the line are part of ${name}: ${advice}.`,
        label: "not a separator",
        explanation:
          `tf reads ${st.viaEval ? `${code(evalName(st.viaEval))} text as a plain line of a file is read` : "a plain line of a file"} ` +
          `without substitution, so ${code("%;")} is just text there and ${name === "the text" ? "the line" : code(name)} ` +
          `gets all of ${code(text.slice(st.start, st.end))}. ${code("%;")} separates commands in a ${code("/def")} body, in ` +
          `${code("/eval")} text, and on a line that starts with ${code("/if")} or ${code("/while")}.` +
          (value ? ` A value holding ${code("%;")} can be meant, for a later ${code("/eval")} to run.` : ""),
      };
      // Not before a keyword: split off, /endif or /else is no command but a stray keyword
      // (keyword-mid-statement's case; second review's probe k1: -son made "unexpected /ELSE").
      const nextWord = /^\/([A-Za-z]*)/.exec(text.slice(next))?.[1]?.toLowerCase();
      const command = nextWord !== undefined && !BLOCK_KEYWORDS.has(nextWord);
      if (command && !value) {
        if (st.viaEval) {
          const last = st.viaEval.options.at(-1)!;
          match.fix = {
            title: `Give the /${st.viaEval.command} -son`,
            edits: [{ start: last.start, end: last.end, newText: last.whole ? "-son" : "son" }],
          };
        } else {
          match.fix = { title: "Put the next command on a line of its own", edits: [{ start: at, end: next, newText: "\n" }] };
        }
      }
      out.push(match);
    }
    return out;
  },
};
