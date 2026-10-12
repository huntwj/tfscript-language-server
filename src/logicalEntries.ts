/**
 * Splits a tfscript file's text into "logical top-level entries": the units tf's file
 * loader (`load_file()` in tinyfugue/src/command.c) treats as one command.
 *
 * Confirmed by reading that function and by running `tf-script-check` directly (not just
 * from scripting.md, which did not have a case for this):
 *  - A line is a comment, and is skipped entirely, when its first non-whitespace character
 *    is `;` or `#`. This holds even in the middle of a backslash continuation (the
 *    continuation is not broken; the comment line simply contributes nothing).
 *  - A line continues onto the next physical line when it ends in `\`, UNLESS the character
 *    before it is `%` (a literal `%\` is an escaped backslash, not continuation). This is a
 *    general file-reading rule, true for any top-level line, not only `/def` bodies — rule 3
 *    on scripting.md undersells this; verified 2026-10-11 with a plain `/if (1) \ ... /endif`
 *    spanning three lines at the top level, no `/def`, which loaded clean.
 *
 * Not modelled (known limitations, low value for v1): a blank line's effect on an in-progress
 * continuation, and the exact "whitespace following final backslash" warning tf prints.
 */

export interface EntryPart {
  /** 0-based line number in the original document. */
  line: number;
  /** Text of this physical line contributing to the entry, with any continuing `\` stripped. */
  text: string;
}

export interface LogicalEntry {
  /** Joined text of every part, concatenated with no separator. */
  text: string;
  /** True when this entry is a `/def` command, so its body is macro text, not top-level commands. */
  isDefBody: boolean;
  /** 0-based line number of the entry's first physical line. */
  startLine: number;
  /** 0-based line number of the entry's last physical line. */
  endLine: number;
  parts: EntryPart[];
  /** Maps each character offset in `text` back to a position in the original document. */
  offsetMap: { line: number; character: number }[];
}

const DEF_RE = /^\s*\/def\b/i;

export function isCommentLine(line: string): boolean {
  const first = /\S/.exec(line);
  return first !== null && (first[0] === ";" || first[0] === "#");
}

export function continuesToNextLine(line: string): boolean {
  if (!line.endsWith("\\")) return false;
  // "%\" is an escaped literal backslash, not a continuation marker.
  return !(line.length >= 2 && line[line.length - 2] === "%");
}

export function splitLogicalEntries(text: string): LogicalEntry[] {
  const lines = text.split(/\r\n|\r|\n/);
  const entries: LogicalEntry[] = [];

  let i = 0;
  while (i < lines.length) {
    const firstLine = lines[i] ?? "";
    if (isCommentLine(firstLine)) {
      i += 1;
      continue;
    }

    const startLine = i;
    const parts: EntryPart[] = [];
    let lineIdx = i;
    while (true) {
      const line = lines[lineIdx] ?? "";
      const continues = continuesToNextLine(line);
      const partText = continues ? line.slice(0, -1) : line;
      parts.push({ line: lineIdx, text: partText });
      if (!continues) break;

      let nextIdx = lineIdx + 1;
      while (nextIdx < lines.length && isCommentLine(lines[nextIdx] ?? "")) {
        nextIdx += 1;
      }
      if (nextIdx >= lines.length) break;
      lineIdx = nextIdx;
    }

    const joinedText = parts.map((p) => p.text).join("");
    const offsetMap: { line: number; character: number }[] = [];
    for (const part of parts) {
      for (let c = 0; c < part.text.length; c += 1) {
        offsetMap.push({ line: part.line, character: c });
      }
    }

    entries.push({
      text: joinedText,
      isDefBody: DEF_RE.test(parts[0]?.text ?? ""),
      startLine,
      endLine: lineIdx,
      parts,
      offsetMap,
    });

    i = lineIdx + 1;
  }

  return entries;
}
