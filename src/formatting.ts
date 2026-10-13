import { isBlankLine, isCommentLine, leadingWhitespaceLength, splitLogicalEntries, splitRawLines, type LogicalEntry } from "./logicalEntries";
import { CALL_RE } from "./navigation";
import type { Range } from "./symbols";
import { macroBodyStart } from "./structure";

/**
 * Formatting that cannot change what tf runs.
 *
 * Two facts make it safe, both checked against real tf:
 *  - tf's load_file() strips the leading whitespace of every physical line before joining a
 *    `\`-continued entry (see logicalEntries.ts), so re-indenting a continuation line changes
 *    nothing, and inserting `\`, a newline and indentation after whitespace, or after a `%;`,
 *    joins back to the same text.
 *  - Inside a macro body, whitespace on either side of a `%;` separator is dropped when the body
 *    runs: `/let v=ab %; ...`, `/let v=ab%;     ...` and `/echo -e x[%; ...` all behaved as if
 *    the spaces weren't there (proven 2026-10-12 with tf-script-check). At the top level `%;`
 *    is not a separator at all (`/let v=cd %; /echo ...` sets v to the whole rest of the line),
 *    so statements are only split inside macro bodies.
 *
 * What it does, per logical entry:
 *  - In a `/def`, `/bind`, `/hook` or `/trig*` body with more than one statement (or an
 *    `/if`/`/while` block), puts each `%;`-separated statement on its own line ending `%;\`,
 *    starts the body on the line after `= \`, and breaks after `/if (...) `, `/elseif (...) `,
 *    `/while (...) ` and `/else ` so a block's children sit on their own lines. Line breaks you
 *    already had are kept.
 *  - Indents continuation lines one level, plus one more inside each `/if`...`/endif` and
 *    `/while`...`/done`; `/else`, `/elseif`, `/endif` and `/done` line up with their `/if` or
 *    `/while`. A top-level entry that opens a block (`/if (x) \`) indents its children one level.
 *  - Leaves alone: an entry's first line (an indented one is what tf's "possibly missing
 *    trailing \" warning is about, and hiding it would hide the bug), comment and blank lines,
 *    trailing whitespace, entries tf never finishes (a final `\` at end of file), and whole
 *    files with CRLF line endings (where `\` never continues a line).
 *
 * Every rebuilt entry is checked by joining it again the way load_file() does; if the result
 * differs from the original by anything except whitespace beside a `%;`, that entry is only
 * re-indented.
 */

export interface FormatOptions {
  /** One level of indentation (four spaces, a tab...). */
  indent: string;
  /** Split `%;`-separated statements in macro bodies onto their own lines. */
  splitStatements: boolean;
}

export interface FormatEdit {
  range: Range;
  newText: string;
}

/**
 * Offsets of the `%` of every `%;` separator in `s` that is outside quotes and brackets, and
 * not part of a longer run of `%`s: tf copies a run of two or more whole, so `%%;` and `%%%;` are
 * both text (proven, `separator-literal-forms`). Quotes don't actually protect a `%;` outside an
 * expression, and unbalanced text (an apostrophe in a line sent to the world, `:-(`) stops the
 * search early; both only ever mean fewer splits.
 */
export function topLevelSeparators(s: string): number[] {
  const out: number[] = [];
  let quote = "";
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i] as string;
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "%") {
      let n = 1;
      while (s[i + n] === "%") n += 1;
      if (n === 1 && s[i + n] === ";" && depth === 0) out.push(i);
      i += n - 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
  }
  return out;
}

/** End (exclusive) of the parenthesised group starting at `open`, or -1. */
function closeParen(s: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let i = open; i < s.length; i += 1) {
    const ch = s[i] as string;
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return i + 1;
  }
  return -1;
}

// After these, the next word is a command of its own.
const COMMAND_START_RE = /(?:^\s*|=\s*|\)\s*|\/@?(?:if|then|else|elseif|while|do)\s+)$/i;
const OPENERS = new Set(["if", "while"]);
const CLOSERS = new Set(["endif", "done"]);
const MIDDLES = new Set(["else", "elseif"]);

/** The control-flow keywords in command position on one line, in order. */
function keywordsIn(line: string): string[] {
  const found: string[] = [];
  const cuts = [-2, ...topLevelSeparators(line), line.length];
  for (let k = 0; k + 1 < cuts.length; k += 1) {
    const seg = line.slice((cuts[k] as number) + 2, cuts[k + 1]);
    for (const m of seg.matchAll(CALL_RE)) {
      const slash = (m.index ?? 0) + (m[1] as string).length;
      if (!COMMAND_START_RE.test(seg.slice(0, slash))) continue;
      const name = (m[4] as string).toLowerCase();
      if (OPENERS.has(name) || CLOSERS.has(name) || MIDDLES.has(name)) found.push(name);
    }
  }
  return found;
}

/**
 * The joined text with the whitespace beside each separator in the body removed: the parts of
 * an entry formatting may change. Two entries that normalise the same run the same.
 */
function normalise(joined: string, body: number): string {
  if (body < 0) return joined;
  const seps = topLevelSeparators(joined).filter((s) => s >= body);
  let out = "";
  let from = 0;
  for (const s of seps) {
    out += joined.slice(from, s).replace(/[ \t\f\v]+$/, "") + "%;";
    from = s + 2;
    while (/[ \t\f\v]/.test(joined[from] ?? "")) from += 1;
  }
  return out + joined.slice(from);
}

/** The macro body's text with separator whitespace dropped, and where to break it into lines. */
function plannedLines(entry: LogicalEntry): string[] | undefined {
  const joined = entry.text;
  const body = macroBodyStart(joined);
  if (body < 0) return undefined;
  const text = normalise(joined, body);
  const seps = topLevelSeparators(text).filter((s) => s >= body);

  const breaks = new Set<number>();
  // Each statement goes on its own line, after the `%;` before it — except inside the
  // condition of `/if list /then` or `/while list /do`, which is itself a list of statements
  // and stays on the `/if` line up to and including its `/then` or `/do`. After a block head —
  // `/if (...)`, `/elseif (...)`, `/while (...)`, `/else`, `/then`, `/do` — and its whitespace,
  // the command that follows starts a new line too.
  const starts = [body, ...seps.map((s) => s + 2)];
  const stmtEnd = (k: number): number => seps[k] ?? text.length;
  const joinedSeps = new Set<number>();
  let blocks = 0;
  let inCondition = false;
  starts.forEach((st, k) => {
    let at = st;
    while (/\s/.test(text[at] ?? "")) at += 1;
    if (k > 0) (inCondition ? joinedSeps : breaks).add(st);
    for (;;) {
      const m = /^\/@?(if|elseif|while|else|then|do)\b/i.exec(text.slice(at));
      if (!m) break;
      const kw = (m[1] as string).toLowerCase();
      if (kw === "then" || kw === "do") inCondition = false;
      else blocks += 1;
      let after = at + m[0].length;
      if (kw === "if" || kw === "elseif" || kw === "while") {
        let p = after;
        while (/\s/.test(text[p] ?? "")) p += 1;
        if (text[p] !== "(") {
          // The list form: its /then or /do is later in this statement, or in a later one.
          const rest = text.slice(p, stmtEnd(k));
          const head = /(?:^|\s)(\/@?(?:then|do))\b/i.exec(rest);
          if (!head) {
            inCondition = true;
            break;
          }
          at = p + (head.index ?? 0) + head[0].length - (head[1] as string).length;
          continue;
        }
        after = closeParen(text, p);
        if (after < 0) break;
      }
      let next = after;
      while (/[ \t]/.test(text[next] ?? "")) next += 1;
      // Only after whitespace, and only when a command follows on the same statement.
      if (next === after || next >= text.length || text.startsWith("%;", next)) break;
      breaks.add(next);
      at = next;
    }
  });
  if (seps.length === 0 && blocks === 0) return undefined;

  // The body itself starts on its own line, after the `=` and any space that follows it.
  let first = body;
  while (/[ \t]/.test(text[first] ?? "")) first += 1;
  if (first < text.length) breaks.add(first);

  // Keep the breaks the author already had (mapped through the whitespace removal: the
  // normalised text is the joined text minus some spaces, so match by non-space position).
  let offset = 0;
  const own: number[] = [];
  for (const part of entry.parts.slice(0, -1)) {
    offset += part.text.length;
    own.push(offset);
  }
  for (const o of own) {
    const mapped = mapOffset(joined, text, o);
    // Including one at the very end: an entry whose last `\` continues onto a blank line.
    if (mapped > 0) breaks.add(mapped);
  }

  // A condition kept on one line reads `/shift%; /@test x`: one space after each `%;`.
  const spaced = (a: number, b: number): string => {
    let out = "";
    for (let i = a; i < b; i += 1) out += (joinedSeps.has(i) ? " " : "") + (text[i] as string);
    return out;
  };
  const cuts = [...breaks].filter((b) => b > 0 && b <= text.length).sort((a, b) => a - b);
  const lines: string[] = [];
  let from = 0;
  for (const c of cuts) {
    lines.push(spaced(from, c));
    from = c;
  }
  lines.push(spaced(from, text.length));
  return lines.filter((l, i) => i === 0 || i === lines.length - 1 || l !== "");
}

/** Where offset `o` of `a` falls in `b`, which is `a` with some whitespace removed. */
function mapOffset(a: string, b: string, o: number): number {
  let i = 0;
  let j = 0;
  while (i < o && j <= b.length) {
    if (a[i] === b[j]) j += 1;
    i += 1;
  }
  return j;
}

/**
 * Whether the line after `prev` starts a statement — prev ends in a `%;` or a block head
 * (`/if (...)`, `/else`, `/then`, `/do`) — rather than continuing one, like the second line of
 * a long expression.
 */
function endsStatement(prev: string): boolean {
  const s = prev.replace(/\\$/, "").replace(/\s+$/, "");
  if (/(?:^|[^%])(?:%%)*%;$/.test(s)) return true;
  if (/\/@?(?:else|then|do)$/i.test(s)) return true;
  return s.endsWith(")") && keywordsIn(s).some((k) => k === "if" || k === "elseif" || k === "while");
}

function indentLines(lines: string[], firstIndent: string, macroBody: boolean, unit: string): string[] {
  // A macro body sits one level in; a top-level entry's lines are either a block's children
  // (by depth) or the hanging continuation of its one command.
  const base = macroBody ? 1 : 0;
  let depth = 0;
  let prev = lines[0] ?? "";
  return lines.map((line, i) => {
    // Comment lines inside a continuation are tf's to skip and the author's to place.
    if (i > 0 && (isCommentLine(line) || isBlankLine(line))) return line;
    const content = i === 0 ? line : line.slice(leadingWhitespaceLength(line));
    const keywords = keywordsIn(content);
    const lead = /^\/@?(\w+)/.exec(content)?.[1]?.toLowerCase() ?? "";
    let level = depth;
    if (CLOSERS.has(lead) || MIDDLES.has(lead)) level = Math.max(0, depth - 1);
    for (const k of keywords) {
      if (OPENERS.has(k)) depth += 1;
      else if (CLOSERS.has(k)) depth = Math.max(0, depth - 1);
    }
    // In a macro body the line after the head starts the body, whatever the head ends with
    // (`= \`, or `/alias name \`); a later line ending `=`, like a nested /def's, hangs.
    const startsBody = i === 1 && macroBody;
    const hanging = i > 0 && !startsBody && !endsStatement(prev) ? 1 : 0;
    prev = content;
    if (i === 0) return firstIndent + content;
    return unit.repeat(base + level + hanging) + content;
  });
}

function rejoin(lines: string[]): string {
  return splitLogicalEntries(lines.join("\n"))[0]?.text ?? "";
}

function formatEntry(entry: LogicalEntry, original: string[], options: FormatOptions): string[] {
  const macroBody = entry.isDefBody || entry.isOtherMacroBody;
  const firstIndent = (original[0] ?? "").slice(0, leadingWhitespaceLength(original[0] ?? ""));
  const contiguous = entry.parts.every((p, i) => p.line === entry.startLine + i);
  // tf turns each tab into spaces as it reads the file, out to the next tab stop counted from
  // the start of the physical line (tfio.c's tfgetS(), with %tabsize, whatever %expand_tabs
  // says). A tab after a line's indentation therefore becomes a different number of spaces
  // when the line is re-indented or split: proven with lib/tf/quoter.tf's qmac, whose
  // `[ <tab>]` is stored as `[    ]` and became `[  ]` once re-indented. Such entries are left
  // exactly as written. Tabs in the indentation itself become spaces that are stripped anyway.
  if (original.some((l) => !isCommentLine(l) && /\S[^\t]*\t/.test(l))) return original;
  // At the top level `%;` separates nothing, so there are no statements to line up; only a
  // block (`/if (x) \`) has a shape to indent. Anything else is left as the author wrote it.
  if (!macroBody && !keywordsIn(original[0] ?? "").some((k) => OPENERS.has(k))) return original;

  if (options.splitStatements && macroBody && contiguous) {
    const planned = plannedLines(entry);
    if (planned) {
      const withSlashes = planned.map((l, i) => (i < planned.length - 1 ? `${l}\\` : l));
      const rebuilt = indentLines(withSlashes, firstIndent, true, options.indent);
      const body = macroBodyStart(entry.text);
      const ok = !rebuilt.some((l, i) => i > 0 && isCommentLine(l)) && normalise(rejoin(rebuilt), body) === normalise(entry.text, body);
      if (ok) return rebuilt;
    }
  }
  return indentLines(original, firstIndent, macroBody, options.indent);
}

export function formatText(text: string, options: FormatOptions, range?: Range): FormatEdit[] {
  if (text.includes("\r")) return [];
  const lines = splitRawLines(text);
  const edits: FormatEdit[] = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    if (range && (entry.endLine < range.start.line || entry.startLine > range.end.line)) continue;
    const original = lines.slice(entry.startLine, entry.endLine + 1);
    const formatted = formatEntry(entry, original, options);
    if (formatted.join("\n") === original.join("\n")) continue;
    const last = original[original.length - 1] ?? "";
    edits.push({
      range: { start: { line: entry.startLine, character: 0 }, end: { line: entry.endLine, character: last.length } },
      newText: formatted.join("\n"),
    });
  }
  return edits;
}
