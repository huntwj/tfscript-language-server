import type { Position, Range, TfDiagnostic, TfTextEdit } from "./diagnostics";
import { splitRawLines } from "./logicalEntries";
import { codeHref, findCode } from "./rules/table";

/**
 * The hover body for a diagnostic, in the style of Rust's and Elm's compiler errors: the source
 * lines involved with the diagnostic's range underlined (^) and its related ranges marked (-),
 * each with its label, then the prose explanation, then the lines as the quick fix would leave
 * them. The diagnostic's own message is already at the top of the hover (VS Code shows it above
 * any hover content), so it isn't repeated.
 */

interface Mark {
  line: number;
  /** Display columns (tabs expanded), end exclusive. */
  from: number;
  to: number;
  label: string;
  primary: boolean;
}

const TAB = 8;
/** The most lines between the first and last mark that are shown whole. */
const CONTEXT = 8;

/**
 * `text` with tabs expanded to 8-column stops, and the display column of each UTF-16 unit (LSP
 * positions count those). A character outside the BMP is two units, and in a monospace font it is
 * usually two columns wide too, so counting units keeps the marks lined up.
 */
function expand(text: string): { shown: string; column: (character: number) => number } {
  const columns: number[] = [];
  let shown = "";
  for (let k = 0; k < text.length; k += 1) {
    const ch = text[k] as string;
    columns.push(shown.length);
    shown += ch === "\t" ? " ".repeat(TAB - (shown.length % TAB)) : ch;
  }
  columns.push(shown.length);
  return { shown, column: (c) => columns[Math.min(c, columns.length - 1)] as number };
}

function lineText(lines: string[], line: number): string {
  return (lines[line] ?? "").replace(/\r$/, "");
}

function markOf(lines: string[], range: Range, label: string, primary: boolean): Mark {
  const { column } = expand(lineText(lines, range.start.line));
  const from = column(range.start.character);
  // A range running onto later lines is marked to the end of its first line.
  const to = range.end.line === range.start.line ? column(range.end.character) : column(lineText(lines, range.start.line).length);
  return { line: range.start.line, from, to: Math.max(to, from + 1), label, primary };
}

function put(row: string[], at: number, text: string): void {
  while (row.length < at) row.push(" ");
  for (let k = 0; k < text.length; k += 1) row[at + k] = text[k] as string;
}

/**
 * The rows under one source line: the underlines, then each label on a `|` leading down from its
 * mark, rightmost first, so no label crosses another mark.
 */
function annotate(marks: Mark[]): string[] {
  const sorted = [...marks].sort((a, b) => a.from - b.from);
  const underline: string[] = [];
  // Related marks first, so where they overlap the primary its ^s win.
  for (const m of [...sorted].sort((a, b) => Number(a.primary) - Number(b.primary))) {
    put(underline, m.from, (m.primary ? "^" : "-").repeat(m.to - m.from));
  }
  const labelled = sorted.filter((m) => m.label);
  const last = sorted[sorted.length - 1];
  const reach = Math.max(...sorted.map((m) => m.to));
  // The rightmost mark's label fits on the underline row itself, unless another mark runs past it.
  if (last && last.label && labelled[labelled.length - 1] === last && last.to === reach) {
    put(underline, last.to + 1, last.label);
    labelled.pop();
  }
  const rows = [underline.join("")];
  for (let j = labelled.length - 1; j >= 0; j -= 1) {
    const connector: string[] = [];
    for (let k = 0; k <= j; k += 1) put(connector, (labelled[k] as Mark).from, "|");
    const label: string[] = [];
    for (let k = 0; k < j; k += 1) put(label, (labelled[k] as Mark).from, "|");
    put(label, (labelled[j] as Mark).from, (labelled[j] as Mark).label);
    rows.push(connector.join(""), label.join(""));
  }
  return rows.map((r) => r.trimEnd());
}

/** The lines in `shown`, numbered, each followed by its annotation rows; `...` marks skipped lines. */
function excerpt(lines: string[], shown: number[], marks: Mark[]): string {
  const width = String(Math.max(...shown) + 1).length;
  const gutter = (n: string) => `${n.padStart(width)} | `;
  const out: string[] = [];
  let previous: number | undefined;
  for (const line of shown) {
    if (previous !== undefined && line > previous + 1) out.push(`${" ".repeat(width)} ...`);
    out.push(`${gutter(String(line + 1))}${expand(lineText(lines, line)).shown}`.trimEnd());
    const here = marks.filter((m) => m.line === line);
    if (here.length > 0) for (const row of annotate(here)) out.push(`${gutter("")}${row}`.trimEnd());
    previous = line;
  }
  return out.join("\n");
}

function compare(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

/** `lines` with `edits` applied; the edits must not overlap or add line breaks. */
function applyEdits(lines: string[], edits: TfTextEdit[]): string[] {
  const result = [...lines];
  for (const e of [...edits].sort((a, b) => compare(b.range.start, a.range.start))) {
    const { start, end } = e.range;
    const head = (result[start.line] ?? "").slice(0, start.character);
    const tail = (result[end.line] ?? "").slice(end.character);
    result.splice(start.line, end.line - start.line + 1, head + e.newText + tail);
  }
  return result;
}

/** A Markdown code block that no backtick run in `body` can end early. */
function fence(body: string, language = ""): string {
  let ticks = "```";
  while (body.includes(ticks)) ticks += "`";
  return `${ticks}${language}\n${body}\n${ticks}`;
}

/** The hover body for `d` in `text`, or undefined when it has nothing to add to the message. */
export function explainDiagnostic(text: string, d: TfDiagnostic): string | undefined {
  if (!d.explanation && !d.label && !d.related && !d.fix) return undefined;
  const lines = splitRawLines(text);
  const marks = [
    markOf(lines, d.range, d.label ?? "", true),
    ...(d.related ?? []).map((r) => markOf(lines, r.range, r.message, false)),
  ];
  const marked = [...new Set(marks.map((m) => m.line))].sort((a, b) => a - b);
  const first = marked[0] as number;
  const last = marked[marked.length - 1] as number;
  // The lines between the marks too, unless that's a long stretch.
  const shown = last - first <= CONTEXT ? Array.from({ length: last - first + 1 }, (_, k) => first + k) : marked;
  const parts = [fence(excerpt(lines, shown, marks), "text")];
  if (d.explanation) parts.push(d.explanation);
  if (d.fix && d.fix.edits.every((e) => !e.newText.includes("\n"))) {
    const fixed = applyEdits(lines, d.fix.edits);
    const changed = [...new Set(d.fix.edits.flatMap((e) => [e.range.start.line, e.range.end.line]))].sort((a, b) => a - b);
    const body = changed.map((l) => expand(lineText(fixed, l)).shown).join("\n");
    parts.push(`**Quick fix:** ${d.fix.title}`, fence(body, "tf"));
  }
  return parts.join("\n\n");
}

/**
 * What `code` means, from the rule table (src/rules/table.ts): its rule section, its summary and a
 * link to its entry in docs/rules.md. Undefined for a code the table doesn't know.
 */
export function explainCode(code: string): string | undefined {
  const found = findCode(code);
  if (!found) return undefined;
  const { section, entry } = found;
  return `**${code}** (${section.id}, ${section.title.toLowerCase()}): ${entry.summary} [About this rule](${codeHref(code)})`;
}

/** The whole hover for `d`: its excerpt and explanation, then what its code means. */
export function diagnosticHover(text: string, d: TfDiagnostic): string | undefined {
  const parts = [explainDiagnostic(text, d), explainCode(d.code)].filter((p): p is string => p !== undefined);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/** Whether `pos` is inside `range` (its end included, so a hover just after a short range still counts). */
export function rangeContains(range: Range, pos: Position): boolean {
  return compare(range.start, pos) <= 0 && compare(pos, range.end) <= 0;
}
