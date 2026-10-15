import type { EntryRule, EntryMatch } from "./types";
import type { TfDiagnostic } from "../diagnostics";
import { isBlankLine, isCommentLine, leadingWhitespaceLength, splitRawLines, type LogicalEntry } from "../logicalEntries";
import { JOIN_MAX_LINES } from "../joinFix";
import { entryStructure } from "../structure";

/**
 * In a file, every command ends at the end of its line unless the line ends in `\`
 * (tinyfugue/src/command.c, load_file()), so a top-level `/if` or `/while` has to be complete
 * within one command. When it isn't, tf reports the opener ("expected /endif, found end") and then
 * every line that was meant to be part of it: a stray `/then`, `/else`, `/endif`, `/do` or `/done`
 * is a command of its own ("unexpected /ENDIF in outer block"), and an indented line draws
 * "possibly missing trailing \". Proven in tf dev, 2026-10-14: an `/if` and a `/while` split over
 * lines, a condition list with its `/then` on the next line, an `/else` on its own line, and an
 * indented body with no closer at all.
 *
 * All of those come from one missing `\`, so this reports them once, at the opener. The entry rule
 * is structure.ts's model of the compiler (it follows nesting, and knows a keyword only counts at
 * the start of a statement); consolidateContinuations() then finds the later lines that belong to
 * it, makes them related locations, and drops their own block-structure and
 * indented-line-after-command diagnostics.
 */
export const missingContinuation: EntryRule = {
  id: "missing-continuation",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    return entryStructure(entry)
      .filter((i) => i.kind === "continuation")
      .map(({ kind: _kind, ...match }) => match);
  },
};

/** block-structure's message for a keyword at the top level with no block to belong to. */
const STRAY_RE = /^This \/(then|else|elseif|endif|do|done) has no \/(?:if|while) to (?:close|belong to)\.$/;
const OPENER_RE = /^\/(if|while)\b/i;

interface Opener {
  d: TfDiagnostic;
  word: "if" | "while";
  /** The last line of its command. */
  endLine: number;
  /** The last line of the commands a join could bring into it (spanOf). */
  spanEnd: number;
  strays: { d: TfDiagnostic; word: string }[];
}

type Related = NonNullable<TfDiagnostic["related"]>[number];

const byPosition = (a: { range: TfDiagnostic["range"] }, b: { range: TfDiagnostic["range"] }): number =>
  a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character;

/**
 * The last line of the top-level commands after `entries[index]` that a line join could bring
 * into it: up to a blank line (which ends any join), an unindented macro definition (a new command,
 * not part of the block), or JOIN_MAX_LINES lines past it. Comment lines in between don't matter,
 * as tf skips them even inside a continuation (they aren't entries).
 */
function spanOf(entries: LogicalEntry[], index: number, lines: string[]): number {
  const entry = entries[index] as LogicalEntry;
  let end = entry.endLine;
  for (let k = index + 1; k < entries.length; k += 1) {
    const e = entries[k] as LogicalEntry;
    const first = lines[e.startLine] ?? "";
    // A blank line is an entry of its own.
    if (isBlankLine(first) || e.endLine > entry.endLine + JOIN_MAX_LINES) break;
    if ((e.isDefBody || e.isOtherMacroBody) && leadingWhitespaceLength(first) === 0) break;
    end = e.endLine;
  }
  return end;
}

/** The index of the entry holding `line` (entries are in line order), or -1. */
function entryIndexAt(entries: LogicalEntry[], line: number): number {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const e = entries[mid] as LogicalEntry;
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/**
 * How the opener's last line fails to continue: no `\` at all (in a CRLF file, where one wouldn't
 * work either), a `\` after a `%` (load_file() never continues a line ending in `%\`, `%%\` and all,
 * command.c), or a `\` that whitespace (a CRLF's `\r` among it) follows.
 */
function cutOff(line: string): "none" | "none-crlf" | "percent" | "whitespace" | "crlf" {
  if (/%\\[ \t\f\v\r]*$/.test(line)) return "percent";
  if (!/\\[ \t\f\v\r]+$/.test(line)) return line.endsWith("\r") ? "none-crlf" : "none";
  return /\\\r$/.test(line) ? "crlf" : "whitespace";
}

/**
 * Pairs each missing-continuation opener with the later top-level lines that were meant to be
 * part of it, as far as a line join could reach (spanOf): the stray keywords of its block that
 * start a command (the nearest open opener of the right kind takes each one, and an `/endif` or
 * `/done` closes it), and the indented lines up to the last of those, or, with none, the indented
 * lines straight after it. Their own diagnostics are dropped, they become the opener's related
 * locations, and its message names the line that was cut off. A stray in the middle of a command,
 * or past a blank line or a macro definition, is block-structure's, as tf reports it: it belongs
 * to something else. The opener's fix is left to joinFix.ts, which replaces it with a join where
 * one works.
 */
export function consolidateContinuations(text: string, entries: LogicalEntry[], diagnostics: TfDiagnostic[]): TfDiagnostic[] {
  if (!diagnostics.some((d) => d.code === "missing-continuation")) return diagnostics;
  const lines = splitRawLines(text);
  const candidates = diagnostics
    .filter((d) => d.code === "missing-continuation" || (d.code === "block-structure" && STRAY_RE.test(d.message)))
    .sort(byPosition);
  const openers: Opener[] = [];
  const open: Opener[] = [];
  const dropped = new Set<TfDiagnostic>();

  for (const d of candidates) {
    const index = entryIndexAt(entries, d.range.start.line);
    const entry = entries[index];
    if (!entry || entry.isDefBody || entry.isOtherMacroBody) continue;
    if (d.code === "missing-continuation") {
      const at = d.range.start;
      const word = OPENER_RE.exec((lines[at.line] ?? "").slice(at.character))?.[1]?.toLowerCase();
      if (word !== "if" && word !== "while") continue;
      const opener: Opener = { d, word, endLine: entry.endLine, spanEnd: spanOf(entries, index, lines), strays: [] };
      openers.push(opener);
      open.push(opener);
      continue;
    }
    // Only a keyword that starts a command: one later in a command belongs to that command's own blocks.
    const first = entry.offsetMap[0];
    if (!first || first.line !== d.range.start.line || first.character !== d.range.start.character) continue;
    const word = (STRAY_RE.exec(d.message) as RegExpExecArray)[1] as string;
    const block = word === "do" || word === "done" ? "while" : "if";
    // Openers whose reach ends before this line can't take it, or anything after it.
    for (let k = open.length - 1; k >= 0; k -= 1) if ((open[k] as Opener).spanEnd < d.range.start.line) open.splice(k, 1);
    let k = open.length - 1;
    while (k >= 0 && (open[k] as Opener).word !== block) k -= 1;
    const opener = open[k];
    if (!opener) continue;
    opener.strays.push({ d, word });
    dropped.add(d);
    if (word === "endif" || word === "done") open.splice(k, 1);
  }

  const indented = diagnostics.filter((d) => d.code === "indented-line-after-command").sort(byPosition);
  for (const opener of openers) {
    const related: Related[] = [];
    const last = opener.strays[opener.strays.length - 1];
    const lastStray = last?.d.range.start.line;
    // The indented lines up to the last stray keyword, and the run of them straight after the
    // opener or a stray /then, /else, /elseif or /do: the body of the branch it starts. A closer
    // starts none, so indented lines after it are left to indented-line-after-command. Comment
    // lines don't break the run, as tf skips them inside a continuation.
    const after = (line: number): number => {
      let next = (entries[entryIndexAt(entries, line)]?.endLine ?? line) + 1;
      while (next < lines.length && isCommentLine(lines[next] ?? "")) next += 1;
      return next;
    };
    const closed = last?.word === "endif" || last?.word === "done";
    let next = closed ? -1 : after(lastStray ?? opener.endLine);
    for (const d of indented) {
      const line = d.range.start.line;
      if (line <= opener.endLine || line > opener.spanEnd || dropped.has(d)) continue;
      if (!(lastStray !== undefined && line <= lastStray) && line !== next) continue;
      if (line === next) next = after(line);
      dropped.add(d);
      // An indented stray keyword is noted once, as the keyword.
      if (opener.strays.some((s) => s.d.range.start.line === line)) continue;
      related.push({ range: d.range, message: "a command of its own: the line before it has no \\" });
    }
    for (const s of opener.strays) {
      const verb = s.word === "endif" || s.word === "done" ? "close" : "belong to";
      related.push({ range: s.d.range, message: `a command of its own, so this /${s.word} doesn't ${verb} the /${opener.word}` });
    }
    const how = cutOff(lines[opener.endLine] ?? "");
    const closer = opener.strays.find((s) => s.word === "endif" || s.word === "done");
    // The \ is there: backslash-not-last's fix (or LF line endings) is what's needed, not a closer
    // here. And with its own closer taken in, adding one here would leave that one an error: the
    // fix is the join, where there is one.
    const backslash = how === "percent" || how === "whitespace" || how === "crlf";
    if ((backslash || closer) && opener.d.fix?.title.startsWith("Add %; /")) delete opener.d.fix;
    if (related.length === 0) continue;
    related.sort(byPosition);
    opener.d.related = [...(opener.d.related ?? []), ...related];
    const cut = closer ?? opener.strays[0];
    const what = cut
      ? `the /${cut.word} on line ${cut.d.range.start.line + 1} is a separate command`
      : `line ${(related[0] as Related).range.start.line + 1} starts a separate command`;
    const n = opener.endLine + 1;
    opener.d.message =
      how === "percent"
        ? `This /${opener.word} ends at the end of line ${n}, as a \\ after a % doesn't continue a line, so ${what}: end the line with a \\ that has no % before it.`
        : how === "crlf"
        ? `This /${opener.word} ends at the end of line ${n}, where the file's Windows (CRLF) line ending puts a carriage return after the \\, so ${what}: save the file with LF line endings.`
        : how === "whitespace"
          ? `This /${opener.word} ends at the end of line ${n}, where whitespace follows the \\, so ${what}: remove the whitespace.`
          : how === "none-crlf"
          ? `This /${opener.word} ends at the end of line ${n}, which has no \\, so ${what}: save the file with LF line endings, then end every line but the last with \\ (one before a carriage return doesn't continue a line).`
          : `This /${opener.word} ends at the end of line ${n}, which has no \\, so ${what}: end every line but the last with \\.`;
    opener.d.label = `its command ends on line ${n}`;
  }

  return diagnostics.filter((d) => !dropped.has(d));
}
