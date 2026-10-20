import { isCommentLine, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { RULES, type Severity } from "./rules";
import type { EntryMatch, FileFacts, LineMatch, LineSpan } from "./rules/types";
import { definedMacro } from "./symbols";
import { findAbortEntry } from "./rules/notACommand";
import { addJoinFixes } from "./joinFix";
import { consolidateContinuations } from "./rules/missingContinuation";
import { DEFAULT_TF_BUILD, type TfBuild } from "./tfBuild";
import { ignoredByComment, LINT_RULES } from "./rules/lint";

/** The lint tier's codes (rule table section L1): warnings about shapes tf runs without a word. */
export const LINT_CODES: ReadonlySet<string> = new Set(LINT_RULES.map((r) => r.id));

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface TfTextEdit {
  range: Range;
  newText: string;
}

export interface TfDiagnostic {
  range: Range;
  /** One sentence that reads on its own in the Problems pane. */
  message: string;
  code: string;
  severity: Severity;
  /** A few words marking the range in the hover's source excerpt. */
  label?: string;
  /** Markdown prose for the hover, below the excerpt. */
  explanation?: string;
  related?: { range: Range; message: string }[];
  fix?: { title: string; edits: TfTextEdit[] };
  /** A second fix, for a problem that can be read two ways. */
  alternative?: { title: string; edits: TfTextEdit[] };
}

/** Where `offset` of `entry.text` is in the document; `entry.text.length` is just after its last character. */
function positionOf(entry: LogicalEntry, offset: number): Position | undefined {
  const at = entry.offsetMap[offset];
  if (at) return { line: at.line, character: at.character };
  const last = entry.offsetMap[offset - 1];
  return last ? { line: last.line, character: last.character + 1 } : undefined;
}

/** The document range of `entry.text`'s `start`..`end` (exclusive), or undefined if it can't be mapped. */
function rangeOf(entry: LogicalEntry, start: number, end: number): Range | undefined {
  const from = positionOf(entry, start);
  if (end <= start) return from && { start: from, end: from };
  // offsetMap has one entry per character; end is exclusive, so the last included character is at end - 1.
  const lastChar = entry.offsetMap[end - 1];
  return from && lastChar ? { start: from, end: { line: lastChar.line, character: lastChar.character + 1 } } : undefined;
}

function entryDiagnostic(entry: LogicalEntry, match: EntryMatch, code: string, severity: Severity): TfDiagnostic | undefined {
  if (match.end <= match.start) return undefined;
  const range = rangeOf(entry, match.start, match.end);
  if (!range) return undefined;
  const d: TfDiagnostic = { range, message: match.message, code, severity: match.severity ?? severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  const related = (match.related ?? []).flatMap((n) => {
    const r = rangeOf(entry, n.start, n.end);
    return r ? [{ range: r, message: n.message }] : [];
  });
  if (related.length > 0) d.related = related;
  const mapped = (fix: NonNullable<EntryMatch["fix"]>): TfDiagnostic["fix"] => {
    const edits = fix.edits.map((e) => {
      const r = rangeOf(entry, e.start, e.end);
      return r && { range: r, newText: e.newText };
    });
    return edits.length > 0 && edits.every((e) => e) ? { title: fix.title, edits: edits as TfTextEdit[] } : undefined;
  };
  const fix = match.fix && mapped(match.fix);
  if (fix) d.fix = fix;
  const alternative = match.alternative && mapped(match.alternative);
  if (alternative) d.alternative = alternative;
  return d;
}

function spanRange(s: LineSpan): Range {
  return { start: { line: s.line, character: s.startChar }, end: { line: s.line, character: s.endChar } };
}

function lineDiagnostic(match: LineMatch, code: string, severity: Severity): TfDiagnostic {
  const d: TfDiagnostic = { range: spanRange(match), message: match.message, code, severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  if (match.related && match.related.length > 0) d.related = match.related.map((n) => ({ range: spanRange(n), message: n.message }));
  if (match.fix) d.fix = { title: match.fix.title, edits: match.fix.edits.map((e) => ({ range: spanRange(e), newText: e.newText })) };
  return d;
}

/**
 * Where a rule that throws is reported: on stderr, as unhandled rejections are (rejections.ts),
 * which the client shows in the server's output.
 */
let reportRuleError = (rule: string, error: unknown): void => {
  process.stderr.write(`tfscript: rule ${rule} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
};

/** Report a rule that throws somewhere else (tests); returns the reporter it replaced. */
export function onRuleError(report: (rule: string, error: unknown) => void): (rule: string, error: unknown) => void {
  const previous = reportRuleError;
  reportRuleError = report;
  return previous;
}

/**
 * Whether `d` is on something tf runs without a word, perhaps not as meant: an information note
 * (a plain-line `%;` is text), or keyword-mid-statement's warning for a keyword a /let or /set value
 * took (`/if (1) /set a=1 /else /set b=2%; /endif` loads clean), or a lint warning (LINT_CODES) on a
 * shape that may be deliberate. Such a diagnostic doesn't make a
 * file tf loads clean a problem, in the ground-truth test or the live corpus check.
 */
export function quietInTf(d: TfDiagnostic): boolean {
  return d.severity === "information" || LINT_CODES.has(d.code) || (d.code === "keyword-mid-statement" && d.severity === "warning");
}

/**
 * Every diagnostic for `text`. `joinFixes: false` leaves out the line-joining fixes (joinFix.ts),
 * which try out candidate fixes with this function and so must not recurse into themselves.
 */
export function getDiagnostics(
  text: string,
  {
    joinFixes = true,
    tfBuild = DEFAULT_TF_BUILD,
    localPrefix,
    projectMacro,
  }: { joinFixes?: boolean; tfBuild?: TfBuild; localPrefix?: string; projectMacro?: (name: string) => boolean } = {},
): TfDiagnostic[] {
  const entries = splitLogicalEntries(text);
  let diagnostics: TfDiagnostic[] = [];

  // A bare (non-blank, non-comment, non-"/") line aborts tf's load of the rest of the file.
  // tf still reads every physical line of the aborting entry itself before it gives up (the
  // abort check only runs once the whole, possibly backslash-joined, command is assembled),
  // so the cut is after that entry's last line (endLine), not its first.
  const abort = findAbortEntry(entries);
  // An incomplete trailing entry (file ended mid-continuation) is excluded the same way as
  // everything after an abort: tf never executes it, so no rule should look inside it either.
  const usableEntries = (abort ? entries.slice(0, abort.entryIndex) : entries).filter(
    (entry) => !entry.incomplete,
  );
  const readableLineCount = abort ? (entries[abort.entryIndex]?.endLine ?? abort.line) + 1 : undefined;
  const textForFileRules =
    readableLineCount !== undefined
      ? splitRawLines(text).slice(0, readableLineCount).join("\n")
      : text;

  const macros = new Set<string>();
  for (const entry of usableEntries) {
    const name = definedMacro(entry);
    if (name) macros.add(name.toLowerCase());
  }
  const facts: FileFacts = { macros, tfBuild, ...(localPrefix ? { localPrefix } : {}), ...(projectMacro ? { projectMacro } : {}) };

  for (const rule of RULES) {
    // A rule that throws loses its own diagnostics, for that command, not every rule's for the file.
    let failed = false;
    const guarded = (run: () => void): void => {
      try {
        run();
      } catch (error) {
        if (!failed) reportRuleError(rule.id, error);
        failed = true;
      }
    };
    if (rule.scope === "entry") {
      for (const entry of usableEntries) {
        guarded(() => {
          const found: TfDiagnostic[] = [];
          for (const match of rule.check(entry, facts)) {
            const d = entryDiagnostic(entry, match, rule.id, rule.severity);
            if (d) found.push(d);
          }
          for (const d of found) diagnostics.push(d);
        });
      }
    } else {
      guarded(() => {
        const found = rule.check(textForFileRules).map((match) => lineDiagnostic(match, rule.id, rule.severity));
        for (const d of found) diagnostics.push(d);
      });
    }
  }

  if (abort) diagnostics.push(lineDiagnostic(abort, "not-a-command", "error"));
  // One missing \ makes the lines after a top-level /if or /while commands of their own: say so once.
  diagnostics = consolidateContinuations(text, entries, diagnostics);
  unjoinGluedKeywords(text, entries, diagnostics);
  if (joinFixes) {
    const again = { joinFixes: false, tfBuild, ...(localPrefix ? { localPrefix } : {}), ...(projectMacro ? { projectMacro } : {}) };
    addJoinFixes(text, diagnostics, (t) => getDiagnostics(t, again));
  }

  // A lint diagnostic the comment on the line before turns off (`; tflint:ignore-nextline`).
  const rawLines = splitRawLines(text);
  return diagnostics.filter((d) => !(LINT_CODES.has(d.code) && ignoredByComment(rawLines, d.range.start.line, d.code)));
}

/**
 * A keyword glued to the next line by a `\` at the end of its own: `/endif\` and then `/def h = ...`
 * is `/endif/def h = ...` to tf, which leaves the /if open (proven, 2026-10-15: "expected /endif,
 * found end"). The line joined on is the next one that isn't a comment: tf skips a line starting
 * `;` or `#` even inside a continuation (load_file() in command.c; rev-s4d c1, c5, a3).
 *
 * A closer (/endif, /done) ends its block, so both fixes are offered, either reading being
 * possible: a %; before the `\`, which keeps the next line in the command (`/endif%;\`), and
 * removing the `\`, which makes it a command of its own. Which goes first depends on what the next
 * line looks like: part of the same body if it is indented, or the chain goes on past it (it ends
 * in `\` too), or the command is a macro body and the next line isn't a column-0 /def or a call of
 * the macro being defined; its own command otherwise. In tf, both run as they read with a column-0
 * /def after it; with an indented body line, removing the `\` runs that line once at load, and tf
 * warns "possibly missing trailing \" (s4/j3.tf).
 *
 * /break ends its statement but not its /while, whose /done comes later: removing the `\` would cut
 * the /while off from it, so a %; before the `\` is the one fix (rev-s4e k1-k5).
 *
 * Any other keyword (/if, /while, /elseif, /then, /do, /else) goes on into the next line, so the
 * one fix is a blank before the `\`: `/if \` and `(1) ...` read as `/if (1) ...` (rev-s4d c2-c4,
 * s4/k7.tf). Neither a %; nor removing the `\` works there (rev-s4d a1, a2, a5, b2, b3), and a blank
 * at the start of the next line doesn't either, as tf strips it (command.c). Where keyword-needs-space
 * withholds its fix on purpose (/else(, /then(, /do(, or a %; straight after the condition), it is
 * withheld here too, with the join said in the message (rev-s4e w1-w4).
 */
function unjoinGluedKeywords(text: string, entries: LogicalEntry[], diagnostics: TfDiagnostic[]): void {
  let lines: string[] | undefined;
  for (const d of diagnostics) {
    if (d.code !== "keyword-needs-space" || d.range.end.line <= d.range.start.line) continue;
    lines ??= splitRawLines(text);
    const n = d.range.start.line;
    // A \ followed by a CR doesn't join the next line on (backslash-not-last), so isn't one of these.
    const raw = lines[n] ?? "";
    const keyword = raw.slice(d.range.start.character, raw.length - 1);
    if (!raw.endsWith("\\") || !/^\/@?[A-Za-z]+$/.test(keyword)) continue;
    const line = n + 1;
    let m = n + 1;
    while (m < lines.length && isCommentLine(lines[m] ?? "")) m += 1;
    const next = lines[m] ?? "";
    // The word tf runs, as it reads it: up to a blank or a %, and on across each further join where
    // the word runs to a line's final \ (rev-s4g c7: /endif/g/echo, c8: /break/x/y).
    const glued = keyword + joinedWord(lines, m);
    const at = { line: n, character: raw.length - 1 };
    const word = keyword.replace(/^\/@?/, "").toLowerCase();
    const keep = { title: `Put %; before the \\ on line ${line}`, edits: [{ range: { start: at, end: at }, newText: "%;" }] };
    if (word === "endif" || word === "done") {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put %; before the \\, or remove the \\.`;
      const split = {
        title: `Remove the \\ at the end of line ${line}`,
        edits: [{ range: { start: at, end: { line: n, character: raw.length } }, newText: "" }],
      };
      const entry = entries.find((e) => e.startLine <= n && n <= e.endLine);
      // A column-0 /def, or a call of the macro being defined (`/g` after `/def g = ...`: rev-s4d
      // a3), is a command of its own.
      const defined = entry && definedMacro(entry)?.toLowerCase();
      // Not /@g: one @ looks only for a builtin, and tf says "g: not a builtin command" (rev-s4f c1).
      // A call whose line goes on in a \ carries the chain on, so it reads as part of the body (c7).
      const calls = next.endsWith("\\") ? undefined : /^\/([^\s%@\\]+)/.exec(next)?.[1]?.toLowerCase();
      const ownCommand = /^\/@?def\b/i.test(next) || (!!defined && calls === defined);
      const sameBody = !ownCommand && (/^[ \t\f\v]/.test(next) || next.endsWith("\\") || !!entry?.isDefBody || !!entry?.isOtherMacroBody);
      d.fix = sameBody ? keep : split;
      d.alternative = sameBody ? split : keep;
    } else if (word === "break") {
      // /break ends its statement, but its /while's /done always comes later: removing the \ would
      // cut the /while off from it (rev-s4e k2, k4). A %; before the \ is the one fix.
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put %; before the \\.`;
      d.fix = keep;
      delete d.alternative;
    } else if (!d.fix) {
      // Where keyword-needs-space withholds its fix on purpose, it is withheld here too, with its own
      // advice put where it can be followed: a blank at the start of the next line is stripped, so
      // it goes before the \ (rev-s4e w1-w5, rev-s4f w1a, w4a, w5a).
      const rest = next.trimStart();
      const paren = rest.startsWith("(") ? parenthesized(rest) : "";
      const head = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command`;
      if (paren && word === "else") d.message = `${head}: did you mean /elseif ${paren}? Then put a space before the \\.`;
      else if (paren && (word === "then" || word === "do")) d.message = `${head}: /${word} takes no (condition).`;
      // A command between the ) and the %; only where a %; follows it (rev-s4g x0: `(1)` alone).
      else if (paren && /^[ \t]*%[;|\\]/.test(rest.slice(paren.length))) d.message = `${head}: put a space before the \\, and a command between the ${paren} and the %;.`;
      else if (paren) d.message = `${head}: put a space before the \\.`;
      else d.message = `${head}: unless a macro named ${glued.slice(1)} is defined elsewhere, put a space before the \\.`;
    } else {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put a space before the \\.`;
      d.fix = { title: `Put a space before the \\ on line ${line}`, edits: [{ range: { start: at, end: at }, newText: " " }] };
      delete d.alternative;
    }
  }
}

/** The `(...)` that `text` starts with, up to its matching `)` (strings skipped); "" if it never closes. */
function parenthesized(text: string): string {
  let depth = 0;
  for (let p = 0; p < text.length; p += 1) {
    const ch = text[p];
    if (ch === '"' || ch === "'" || ch === "`") {
      p += 1;
      while (p < text.length && text[p] !== ch) p += text[p] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return text.slice(0, p + 1);
  }
  return "";
}

/**
 * The word tf reads from line `m` of a continuation on: its first word (up to a blank or `%`), and,
 * where that runs to the line's final `\`, on into the next line that isn't a comment, as tf joins
 * them (`/g\` then `/echo` is `/g/echo`).
 */
function joinedWord(lines: string[], m: number): string {
  let word = "";
  for (let k = m; k < lines.length; ) {
    const rest = (lines[k] ?? "").trimStart();
    const part = /^[^\s%]*/.exec(rest)?.[0] ?? "";
    if (!part.endsWith("\\") || part.length !== rest.length) return word + part;
    word += part.slice(0, -1);
    k += 1;
    while (k < lines.length && isCommentLine(lines[k] ?? "")) k += 1;
  }
  return word;
}
