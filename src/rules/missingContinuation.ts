import type { EntryRule, EntryMatch } from "./types";
import type { TfDiagnostic } from "../diagnostics";
import { splitRawLines, type LogicalEntry } from "../logicalEntries";
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
  strays: { d: TfDiagnostic; word: string }[];
}

type Related = NonNullable<TfDiagnostic["related"]>[number];

/** The entry holding `line` (entries are in line order). */
function entryAt(entries: LogicalEntry[], line: number): LogicalEntry | undefined {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const e = entries[mid] as LogicalEntry;
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return e;
  }
  return undefined;
}

const byPosition = (a: { range: TfDiagnostic["range"] }, b: { range: TfDiagnostic["range"] }): number =>
  a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character;

/**
 * Pairs each missing-continuation opener with the later top-level lines that were meant to be
 * part of it: the stray keywords of its block (the nearest open opener of the right kind takes
 * each one, and an `/endif` or `/done` closes it), and the indented lines up to the last of those,
 * or, with none, the indented lines straight after it. Their own diagnostics are dropped, they
 * become the opener's related locations, and its message names the line that was cut off.
 */
export function consolidateContinuations(text: string, entries: LogicalEntry[], diagnostics: TfDiagnostic[]): TfDiagnostic[] {
  if (!diagnostics.some((d) => d.code === "missing-continuation")) return diagnostics;
  const lines = splitRawLines(text);
  const topLevel = (d: TfDiagnostic): LogicalEntry | undefined => {
    const e = entryAt(entries, d.range.start.line);
    return e && !e.isDefBody && !e.isOtherMacroBody ? e : undefined;
  };
  const candidates = diagnostics
    .filter((d) => d.code === "missing-continuation" || (d.code === "block-structure" && STRAY_RE.test(d.message)))
    .sort(byPosition);
  const openers: Opener[] = [];
  const open: Opener[] = [];
  const dropped = new Set<TfDiagnostic>();

  for (const d of candidates) {
    const entry = topLevel(d);
    if (!entry) continue;
    if (d.code === "missing-continuation") {
      const at = d.range.start;
      const word = OPENER_RE.exec((lines[at.line] ?? "").slice(at.character))?.[1]?.toLowerCase();
      if (word !== "if" && word !== "while") continue;
      const opener: Opener = { d, word, endLine: entry.endLine, strays: [] };
      openers.push(opener);
      open.push(opener);
      continue;
    }
    const word = (STRAY_RE.exec(d.message) as RegExpExecArray)[1] as string;
    const block = word === "do" || word === "done" ? "while" : "if";
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
    const lastStray = opener.strays[opener.strays.length - 1]?.d.range.start.line;
    // With no stray keyword, the run of indented lines that starts on the line after it.
    let next = opener.endLine + 1;
    for (const d of indented) {
      const line = d.range.start.line;
      if (line <= opener.endLine || dropped.has(d)) continue;
      if (lastStray !== undefined ? line > lastStray : line !== next) continue;
      next = (entryAt(entries, line)?.endLine ?? line) + 1;
      dropped.add(d);
      // An indented stray keyword is noted once, as the keyword.
      if (opener.strays.some((s) => s.d.range.start.line === line)) continue;
      related.push({ range: d.range, message: "a command of its own: the line before it has no \\" });
    }
    for (const s of opener.strays) {
      const verb = s.word === "endif" || s.word === "done" ? "close" : "belong to";
      related.push({ range: s.d.range, message: `a command of its own, so this /${s.word} doesn't ${verb} the /${opener.word}` });
    }
    if (related.length === 0) continue;
    related.sort(byPosition);
    opener.d.related = [...(opener.d.related ?? []), ...related];
    const closer = opener.strays.find((s) => s.word === "endif" || s.word === "done") ?? opener.strays[0];
    const what = closer
      ? `the /${closer.word} on line ${closer.d.range.start.line + 1} is a separate command`
      : `line ${(related[0] as Related).range.start.line + 1} starts a separate command`;
    opener.d.message = `This /${opener.word} ends at the end of line ${opener.endLine + 1}, which has no \\, so ${what}: end every line but the last with \\.`;
    opener.d.label = `its command ends on line ${opener.endLine + 1}`;
    // Adding the closer to this line would leave the real one behind as a stray.
    if (opener.d.fix?.title.startsWith("Add %; /")) delete opener.d.fix;
  }

  return diagnostics.filter((d) => !dropped.has(d));
}
