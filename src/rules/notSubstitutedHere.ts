import { entryLoads, shortened } from "../loadCommands";
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
/**
 * Where the substitution opened at `at` (`%{`, `${`, `$[` or `$(`) ends, as tf ends it: after the
 * first closer a nested substitution doesn't take (expand.c `varsub()`: `%{foo-a}b}` prints `ab}`),
 * or at `limit` when there is none.
 */
function substitutionEnd(text: string, at: number, limit: number): number {
  const close = text[at + 1] === "{" ? "}" : text[at + 1] === "[" ? "]" : ")";
  let i = at + 2;
  while (i < limit) {
    const ch = text[i];
    const next = text[i + 1];
    if ((ch === "%" || ch === "$") && next === ch) {
      while (text[i + 1] === ch) i += 1;
      i += 1;
    } else if (((ch === "%" || ch === "$") && next === "{") || (ch === "$" && (next === "[" || next === "("))) {
      i = substitutionEnd(text, i, limit);
    } else if (ch === close) {
      return i + 1;
    } else {
      i += 1;
    }
  }
  return limit;
}

/**
 * Each `%{...}` in `text` that tf could read if it substituted there, as `/eval` would, not one in
 * a run of `%`s, nor one in another's default. Where it ends is the structure parser's to say: a
 * default ends at the first `}` a nested substitution doesn't take (expand.c `varsub()`, review
 * rev-s2 p6: `%{foo-a}b}` prints `ab}`), so `%{x-%{y}}` is one and `%{x-{} and %{y}` two. Not one
 * tf can't read at all, such as `%{foo%{bar}}` (substitution-syntax): putting `/eval` in front of
 * that would only make an error of text that prints today.
 *
 * The text is read from a `%{` to the end of its statement (`limitOf`) once, which finds every
 * substitution up to where the parser stops at one it can't read; that one is skipped to where tf
 * would end it, and reading goes on from there.
 */
function percentBraces(text: string, limitOf: (at: number) => number): { index: number; text: string }[] {
  const found: { index: number; text: string }[] = [];
  let pos = 0;
  for (let at = text.indexOf("%{"); at >= 0; at = text.indexOf("%{", pos)) {
    pos = at + 2;
    if (text[at - 1] === "%") continue;
    const limit = Math.max(limitOf(at), at + 2);
    const read = parseRegions(text.slice(at, limit), "body");
    const stop = read.stopped ? (read.issues[read.issues.length - 1]?.start ?? 0) : limit - at;
    let covered = 0;
    for (const span of [...read.spans].sort((a, b) => a.start - b.start || b.end - a.end)) {
      if (span.start >= stop) break;
      if (span.kind !== "substitution" || !span.inner || span.start < covered) continue;
      if (text[at + span.start] !== "%" || text[at + span.start + 1] !== "{") continue;
      found.push({ index: at + span.start, text: text.slice(at + span.start, at + span.end) });
      covered = span.end;
    }
    if (!read.stopped) {
      pos = Math.max(pos, limit);
      continue;
    }
    // The %{ the parser couldn't read (nothing in it is a substitution of its own either, such as
    // the %{bar} of %{foo%{bar}}), skipped to where tf would end it; or past whatever else stopped it.
    const opener = text.lastIndexOf("%{", at + stop);
    pos = Math.max(pos, opener >= at + covered ? substitutionEnd(text, opener, limit) : at + stop + 1);
  }
  return found;
}

/**
 * Where the outermost `%{`, `${`, `$[` or `$(` still open at `at` in `s` starts, or `at` when none
 * is: enough to name a problem by the substitution it is in.
 */
function openerOf(s: string, at: number): number {
  const open: { at: number; close: string; opener: boolean }[] = [];
  for (let i = 0; i < at; i += 1) {
    const ch = s[i];
    const next = s[i + 1];
    if ((ch === "%" || ch === "$") && next === ch) {
      while (s[i + 1] === ch) i += 1;
    } else if ((ch === "%" || ch === "$") && next === "{") {
      open.push({ at: i, close: "}", opener: true });
      i += 1;
    } else if (ch === "$" && (next === "[" || next === "(")) {
      open.push({ at: i, close: next === "[" ? "]" : ")", opener: true });
      i += 1;
    } else if (ch === "(" && open.length > 0) {
      open.push({ at: i, close: ")", opener: false });
    } else if (ch === open[open.length - 1]?.close) {
      open.pop();
    }
  }
  return open.find((o) => o.opener)?.at ?? at;
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
     * What in `st` tf couldn't read if it substituted the command, as `/eval` does: the text of the
     * first substitution or expression problem, or undefined when there is none. Where there is one,
     * advice or a fix to substitute it would only make an error of a line that runs today (review
     * rev-s2 p6: `/echo %{x-} %{x%{y}}`).
     */
    const unreadable = (st: ContextStatement | undefined): string | undefined => {
      if (!st) return undefined;
      // Inside a top-level /if or /while line, tf hands /eval the text with each run of %s one
      // shorter (proven: `/if (1) /eval /echo %%{y%; /endif` is "unmatched {").
      const written = text.slice(st.start, st.end);
      const inIfLine = statements.some((o) => o.level === "newline" && o.start <= st.start && st.end <= o.end);
      const identity = { text: written, map: Array.from({ length: written.length + 1 }, (_, k) => k) };
      const { text: s, map } = inIfLine ? shortened(identity, 0, written.length) : identity;
      const issue = parseRegions(s, "body").issues.find((i) => i.kind === "substitution" || i.kind === "expression");
      if (!issue) return undefined;
      // From the opener of the substitution it is in (`$[` for the `(` of `$[%y + (]`) to the end of
      // the word, named as written in the file.
      const from = openerOf(s, Math.min(issue.start, ...(issue.related ?? []).map((n) => n.start)));
      let to = issue.end;
      while (to < s.length && !isTfSpace(s[to])) to += 1;
      return written.slice(map[from], to > from ? (map[to - 1] as number) + 1 : map[from]);
    };
    // Once per statement: a line can hold thousands of %{...}, each asking about the same statement.
    const judged = new Map<ContextStatement | undefined, string | undefined>();
    const unreadableOnce = (st: ContextStatement | undefined): string | undefined => {
      if (!judged.has(st)) judged.set(st, unreadable(st));
      return judged.get(st);
    };
    const rejected = (bad: string): string =>
      `It also holds ${code(bad)}, which tf can't read as a substitution or an expression. Substituting the ` +
      `command as written would make tf reject it, where today it runs with the text as it is, so fix that first.`;

    const variable = (start: number, written: string): void => {
      const st = statementAt(statements, start);
      const at = st?.start ?? 0;
      const base = {
        start,
        end: start + written.length,
        label: "not substituted",
      };
      const bad = unreadableOnce(st);
      if (st?.viaEval) {
        const name = evalName(st.viaEval);
        const runs =
          `${code(name)} runs its text ${st.viaEval.mode === "top" ? "as a plain line of a file is run" : "as a top-level /if line is run"}, ` +
          `without substituting variables, so the command gets the text ${code(written)}.`;
        out.push({
          ...base,
          message: bad
            ? `${written} stays as it is in ${name} text, and without -s tf would reject this text as written: fix ${bad} first.`
            : `${written} stays as it is in ${name} text: leave out the -s option to substitute it.`,
          explanation: bad
            ? `${runs} ${rejected(bad)}`
            : `${runs} Without ${code("-s")}, ` +
              (st.viaEval.command === "eval"
                ? `${code("/eval")} substitutes its text once and then runs it.`
                : `${code("/quote")} runs the command as a macro body is run, substituting it.`),
          ...(bad ? {} : { fix: { title: `Leave out ${optionName(text, st.viaEval.options.at(-1)!)}`, edits: dropOptions(st.viaEval) } }),
        });
        return;
      }
      const where = st?.level === "newline" ? "in a top-level /if or /while line" : "in a command at the top level of a file";
      const runs =
        `tf runs the commands in a file without substituting variables, so the command gets the text ${code(written)}, ` +
        `not the variable's value. Inside a top-level ${code("/if")} or ${code("/while")} line, ${code("%;")} separates ` +
        `commands but still nothing is substituted.`;
      out.push({
        ...base,
        message: bad
          ? `${written} stays as it is ${where}, and /eval would reject this command as written: fix ${bad} first.`
          : `${written} stays as it is ${where}: put /eval in front of the command to substitute it.`,
        explanation: bad
          ? `${runs} ${rejected(bad)}`
          : `${runs} In a ${code("/def")} body it would be substituted when the macro ` +
            `runs, and in a condition or ${code("/test")} it is read as a variable. ${code("/eval")} substitutes the rest ` +
            `of the command once and then runs it: ${code(`/eval ${text.slice(at).split(/\s/, 1)[0]} ...`)}`,
        ...(bad ? {} : { fix: { title: "Put /eval in front of the command", edits: [{ start: at, end: at, newText: "/eval " }] } }),
      });
    };

    for (const m of percentBraces(text, (at) => statementAt(statements, at)?.end ?? text.length)) {
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
