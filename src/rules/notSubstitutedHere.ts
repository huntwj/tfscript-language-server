import { entryLoads, shortened } from "../loadCommands";
import { BUILTIN_COMMANDS } from "../data/builtinCommands.generated";
import { isTfSpace } from "../logicalEntries";
import { code, commandParts, gluedKeywordAt, parseRegions, type IssueEdit, type StructureMode } from "../structure";
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
/** How many `%; /if` splits of one statement are checked for leaving a block open (see blockChecksLeft). */
const MAX_BLOCK_CHECKS = 64;
/**
 * Where the substitution opened at `at` (`%{`, `${`, `$[` or `$(`) ends, as tf ends it: after the
 * first closer a nested substitution doesn't take (expand.c `varsub()`: `%{foo-a}b}` prints `ab}`),
 * or at `limit` when there is none.
 */
function substitutionEnd(text: string, at: number, limit: number): number {
  const closer = (opener: string | undefined): string => (opener === "{" ? "}" : opener === "[" ? "]" : ")");
  // The closer each open substitution waits for, innermost last: a loop, not recursion, so a line
  // of thousands nested (`%{x %{x %{x ...`) can't overflow the stack.
  const open = [closer(text[at + 1])];
  let i = at + 2;
  while (i < limit) {
    const ch = text[i];
    const next = text[i + 1];
    if ((ch === "%" || ch === "$") && next === ch) {
      while (text[i + 1] === ch) i += 1;
      i += 1;
    } else if (((ch === "%" || ch === "$") && next === "{") || (ch === "$" && (next === "[" || next === "("))) {
      open.push(closer(next));
      i += 2;
    } else if (ch === open[open.length - 1]) {
      open.pop();
      i += 1;
      if (open.length === 0) return i;
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
      // The parser gave up on nesting past its depth (review rev-s2c deep.tf): the %{ it was in
      // ends where tf ends it, and reading goes on after that, rather than at the statement's end.
      const deep = read.issues.find((i) => i.kind === "too-deep");
      const opener = deep ? text.indexOf("%{", at + covered) : -1;
      if (opener < 0 || opener >= at + deep!.start) {
        pos = Math.max(pos, limit);
        continue;
      }
      const end = substitutionEnd(text, opener, limit);
      if (text[end - 1] === "}") found.push({ index: opener, text: text.slice(opener, end) });
      pos = Math.max(pos, end);
      continue;
    }
    // The %{ the parser couldn't read (nothing in it is a substitution of its own either, such as
    // the %{bar} of %{foo%{bar}}), skipped to where tf would end it; or past whatever else stopped it.
    const opener = text.lastIndexOf("%{", at + stop);
    pos = Math.max(pos, opener >= at + covered ? substitutionEnd(text, opener, limit) : at + stop + 1);
  }
  return found;
}

/** What `/eval` would make of a command (see `judge`). */
type Judgement = { kind: "plain" } | { kind: "rejected"; bad: string } | { kind: "other" };

/** A selector of a variable or parameter: `name`, `1`, `#`, `?`, `*`, `R`, `L`, `L2`, `-1`, `-L2`, `P1`. */
const SELECTOR_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[#?*]|-L?[0-9]*|L[0-9]*|P[0-9]+)$/;
/** What a default may hold to be plain text: nothing /eval would substitute, escape or end it with. */
const PLAIN_DEFAULT_RE = /^[^%${}\\]*$/;
const BUILTINS = new Set(BUILTIN_COMMANDS.map((c) => c.toLowerCase()));

/**
 * Whether tf would refuse a command, written with this prefix and name, as no builtin: after any
 * `!`s, one `@` asks for a builtin by the rest of the name, any further `@` or `!` included (proven,
 * rev-s2e g.tf: `/@echo` is "echo: not a builtin command", stdlib's /echo being a macro; `/@@echo`
 * "@echo: ...", `/!@echo` "echo: ..."; `/!echo` runs the macro).
 */
function notABuiltin(parts: { prefix: string; word: string }): boolean {
  const afterBangs = parts.prefix.replace(/^!*/, "");
  if (!afterBangs.startsWith("@")) return false;
  return !BUILTINS.has(`${afterBangs.slice(1)}${parts.word}`);
}

/** The commands whose text /eval wouldn't run as a plain command with its text. */
const NOT_PLAIN_COMMAND_RE = /^\/[@!]*(?:if|elseif|else|endif|while|do|done|then|break|test|return|result|exit)(?![^\s%])/i;

/**
 * Whether `s`, a command as `/eval` would get it, holds nothing `/eval` would compile beyond plain
 * variable substitutions: `%{name}` or `%{name-default}` with a default of plain text, `%name`
 * (with or without a plain `-default`), and the positional forms. A `$` of any kind, a `\`, a run
 * of `%`s, a separator, any other `%`, or a keyword command makes it more than that.
 */
function plainSubstitutions(s: string): boolean {
  if (NOT_PLAIN_COMMAND_RE.test(s.trimStart())) return false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "$" || ch === "\\") return false;
    if (ch !== "%") continue;
    if (s[i + 1] === "{") {
      const close = s.indexOf("}", i + 2);
      if (close < 0) return false;
      const inner = s.slice(i + 2, close);
      // The selector ends at the first - that isn't its own (-1, -L2): then comes the default.
      const m = /^(-L?[0-9]*|[^-]*)(?:-(.*))?$/s.exec(inner);
      if (!m || !SELECTOR_RE.test(m[1] as string) || (m[2] !== undefined && !PLAIN_DEFAULT_RE.test(m[2]))) return false;
      i = close;
      continue;
    }
    const m = /^%(-L?[0-9]+|-L|[0-9]+|[#?*]|[A-Za-z_][A-Za-z0-9_]*)(-[^\s]*)?/.exec(s.slice(i));
    if (!m || (m[2] !== undefined && !PLAIN_DEFAULT_RE.test(m[2].slice(1)))) return false;
    i += m[0].length - 1;
  }
  return true;
}

/**
 * The statements of an entry, looked up by position: the innermost holding an offset, and whether
 * a statement is inside a top-level /if or /while line. Built once (statements come outermost
 * first, so an inner one overwrites the one around it), as a line can hold thousands of them.
 */
function statementIndex(statements: ContextStatement[], length: number) {
  const owner = new Int32Array(length).fill(-1);
  const inIfLine = new Array<boolean>(statements.length).fill(false);
  statements.forEach((st, k) => {
    const around = st.start < length ? (owner[st.start] as number) : -1;
    const outer = around >= 0 ? (statements[around] as ContextStatement) : undefined;
    inIfLine[k] = st.level === "newline" || (outer !== undefined && st.end <= outer.end && (inIfLine[around] as boolean));
    owner.fill(k, Math.max(0, st.start), Math.min(length, st.end));
  });
  const position = new Map(statements.map((st, k) => [st, k]));
  return {
    at: (offset: number): ContextStatement | undefined => {
      const k = offset >= 0 && offset < length ? (owner[offset] as number) : -1;
      return k >= 0 ? statements[k] : undefined;
    },
    inIfLine: (st: ContextStatement): boolean => inIfLine[position.get(st) ?? -1] ?? false,
  };
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
    const index = statementIndex(statements, text.length);
    const unsubstituted = (at: number): boolean => {
      const c = contexts[at];
      if (c !== "keyword" && c !== "newline") return false;
      // A macro definition's options aren't substituted either, but the body is what matters.
      const st = index.at(at);
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
     * What `/eval` would make of `st`, as it would get it (inside a top-level /if or /while line,
     * with each run of %s one shorter: proven, `/if (1) /eval /echo %%{y%; /endif` is "unmatched {").
     *
     *  - "plain": nothing in it but plain variable substitutions, so substituting it only puts in
     *    the values, and a fix can say so.
     *  - "rejected": a `%{`, `${`, `$(` or `%-` tf can't read, which tf rejects whenever it
     *    substitutes the text (proven for each: tests/tfscript/cases/unclosed-*.tf, golden 249,
     *    s2/r/w.tf), named as written in the file.
     *  - "other": anything else `/eval` would compile as well, such as a `$[...]`, a `%;` or a `\`,
     *    whose grammar this check doesn't model (review rev-s2c g.tf, h.tf): no fix, and no promise.
     */
    const judge = (st: ContextStatement | undefined): Judgement => {
      if (!st) return { kind: "other" };
      const written = text.slice(st.start, st.end);
      const identity = { text: written, map: Array.from({ length: written.length + 1 }, (_, k) => k) };
      const { text: s, map } = index.inIfLine(st) ? shortened(identity, 0, written.length) : identity;
      const issue = parseRegions(s, "body").issues.find((i) => i.kind === "substitution");
      if (issue) {
        // From its opener (a related location, for a selector with something glued on) to the end of the word.
        const from = Math.min(issue.start, ...(issue.related ?? []).map((n) => n.start));
        let to = issue.end;
        while (to < s.length && !isTfSpace(s[to])) to += 1;
        return { kind: "rejected", bad: written.slice(map[from], to > from ? (map[to - 1] as number) + 1 : map[from]) };
      }
      // A run of %s as written is an escape someone meant, even where an /if line shortens it: in
      // `/if (1) /echo %%{x}%; /endif` the %%{x} would be substituted under /eval (review rev-s2d c.tf).
      return plainSubstitutions(s) && !written.includes("%%") ? { kind: "plain" } : { kind: "other" };
    };
    // Once per statement: a line can hold thousands of %{...}, each asking about the same statement.
    const judged = new Map<ContextStatement | undefined, Judgement>();
    const judgeOnce = (st: ContextStatement | undefined): Judgement => {
      if (!judged.has(st)) judged.set(st, judge(st));
      return judged.get(st) as Judgement;
    };
    /** Whether `s`, read as `mode`, leaves a block open or stray (for the %; fixes below). */
    const blockError = (s: string, mode: StructureMode): boolean =>
      parseRegions(s, mode).issues.some((i) => i.kind === "block" || i.kind === "continuation");
    // Each block check reads the rest of the statement, so a statement with thousands of `%; /if`
    // would be read thousands of times (review rev-s2d: 8000 took 20 s). Past this many, a split
    // before an /if or /while goes unchecked, so unoffered.
    const blockChecks = new Map<ContextStatement, number>();
    const blockChecksLeft = (st: ContextStatement): boolean => {
      const used = blockChecks.get(st) ?? 0;
      blockChecks.set(st, used + 1);
      return used < MAX_BLOCK_CHECKS;
    };
    // Read with -son, once per statement: an /eval's text can hold thousands of %;.
    const openWithSon = new Map<ContextStatement, boolean>();
    const blockErrorOnce = (st: ContextStatement): boolean => {
      if (!openWithSon.has(st)) openWithSon.set(st, blockError(text.slice(st.start, st.end), "newline"));
      return openWithSon.get(st) as boolean;
    };
    const rejected = (bad: string): string =>
      `It also holds ${code(bad)}, which tf can't read as a substitution. Substituting the command as written ` +
      `would make tf reject it, where today it runs with the text as it is, so fix that first.`;
    const compiled =
      `It also holds more than variables to substitute, such as a ${code("$[...]")}, a ${code("%;")} or a ` +
      `${code("\\")}, and substituting it would compile those too, so look at what that would do first.`;

    const variable = (start: number, written: string): void => {
      const st = index.at(start);
      const at = st?.start ?? 0;
      const base = {
        start,
        end: start + written.length,
        label: "not substituted",
      };
      const judgement = judgeOnce(st);
      if (st?.viaEval) {
        const name = evalName(st.viaEval);
        const runs =
          `${code(name)} runs its text ${st.viaEval.mode === "top" ? "as a plain line of a file is run" : "as a top-level /if line is run"}, ` +
          `without substituting variables, so the command gets the text ${code(written)}.`;
        out.push({
          ...base,
          message:
            judgement.kind === "rejected"
              ? `${written} stays as it is in ${name} text, and without -s tf would reject this text as written: fix ${judgement.bad} first.`
              : judgement.kind === "other"
                ? `${written} stays as it is in ${name} text; without -s the rest of the text would be substituted too, so check it before leaving out the -s.`
                : `${written} stays as it is in ${name} text: leave out the -s option to substitute it.`,
          explanation:
            judgement.kind === "rejected"
              ? `${runs} ${rejected(judgement.bad)}`
              : judgement.kind === "other"
                ? `${runs} ${compiled}`
                : `${runs} Without ${code("-s")}, ` +
                  (st.viaEval.command === "eval"
                    ? `${code("/eval")} substitutes its text once and then runs it.`
                    : `${code("/quote")} runs the command as a macro body is run, substituting it.`),
          ...(judgement.kind === "plain"
            ? { fix: { title: `Leave out ${optionName(text, st.viaEval.options.at(-1)!)}`, edits: dropOptions(st.viaEval) } }
            : {}),
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
        message:
          judgement.kind === "rejected"
            ? `${written} stays as it is ${where}, and /eval would reject this command as written: fix ${judgement.bad} first.`
            : judgement.kind === "other"
              ? `${written} stays as it is ${where}; /eval in front would substitute the rest of the command too, so check it before using /eval.`
              : `${written} stays as it is ${where}: put /eval in front of the command to substitute it.`,
        explanation:
          judgement.kind === "rejected"
            ? `${runs} ${rejected(judgement.bad)}`
            : judgement.kind === "other"
              ? `${runs} ${compiled}`
              : `${runs} In a ${code("/def")} body it would be substituted when the macro ` +
                `runs, and in a condition or ${code("/test")} it is read as a variable. ${code("/eval")} substitutes the rest ` +
                `of the command once and then runs it: ${code(`/eval ${text.slice(at).split(/\s/, 1)[0]} ...`)}`,
        ...(judgement.kind === "plain"
          ? { fix: { title: "Put /eval in front of the command", edits: [{ start: at, end: at, newText: "/eval " }] } }
          : {}),
      });
    };

    for (const m of percentBraces(text, (at) => index.at(at)?.end ?? text.length)) {
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
      const st = index.at(at);
      // A macro definition's options (an -E expression) and body are read later, their own way.
      if (!st || st.body !== undefined) continue;
      // `/if(1) ...%; /endif`: the %; would separate, but for the missing blank (keyword-needs-space's).
      const gluedAt = gluedKeywordAt(text, st.start);
      if (gluedAt && (text[gluedAt.nameEnd] === "(" || text[gluedAt.nameEnd] === "/")) continue;
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
      // As tf reads a command word: /@endif and /!if are /endif and /if (review rev-s2d d.tf).
      const parts = text[next] === "/" ? commandParts(text, next) : undefined;
      const nextWord = parts?.word;
      // A keyword's name with any prefix but none or one @ is no keyword to tf, nor a command it
      // has: /!if is "if: no such command or macro", /@@if "@if: not a builtin command" (review
      // rev-s2d c.tf, rev-s2e g.tf, proven).
      const keywordName = nextWord === "if" || nextWord === "while" || BLOCK_KEYWORDS.has(nextWord ?? "");
      // `/if(1)` is no /if either, but a command `if(1)` (proven: "if(1): no such command or macro").
      const glued = /^(?:if|elseif|while)\(/.test(nextWord ?? "");
      const notAKeyword = glued || (keywordName && parts!.prefix !== "" && parts!.prefix !== "@");
      // /@if is the keyword itself (keyword_parse() takes one @), not a builtin lookup.
      const keyword = keywordName && (parts!.prefix === "" || parts!.prefix === "@");
      const command = nextWord !== undefined && !BLOCK_KEYWORDS.has(nextWord) && !notAKeyword && (keyword || !notABuiltin(parts!));
      // Nor where the commands it would split off open a block they don't close (review rev-s2c
      // h.tf: `/echo a%; /if (1) /echo b` on lines of their own is an /if with no /endif).
      // A line split off can only leave a block open if it starts one; -son reads the whole text.
      const opensBlock = nextWord === "if" || nextWord === "while";
      const splits = st.viaEval
        ? !blockErrorOnce(st)
        : !opensBlock || (blockChecksLeft(st) && !blockError(text.slice(next, st.end), "top"));
      // In /eval text, -son makes text after the %; a statement of its own, sent to the world as
      // text in a body is: offered all the same (policy, 2026-10-15; s4/n1.tf). On a plain line a
      // line of text would abort the load, so there it isn't.
      const sendsText = st.viaEval !== undefined && nextWord === undefined;
      if ((command || sendsText) && !value && splits) {
        if (st.viaEval) {
          const last = st.viaEval.options.at(-1)!;
          match.fix = {
            title: `Give the /${st.viaEval.command} -son`,
            edits: [{ start: last.start, end: last.end, newText: last.whole ? "-son" : "son" }],
          };
        } else if (entry.offsetMap[at]?.line === entry.offsetMap[next]?.line) {
          // Only with the next command on the same line: across a \ the edit can't reach past the
          // \, and would leave it behind (s4/j5.tf).
          match.fix = { title: "Put the next command on a line of its own", edits: [{ start: at, end: next, newText: "\n" }] };
        }
      }
      out.push(match);
    }
    return out;
  },
};
