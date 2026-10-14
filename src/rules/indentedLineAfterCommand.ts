import {
  continuesToNextLine,
  isCommentLine,
  isTfSpace,
  leadingWhitespaceLength,
  splitRawLines,
} from "../logicalEntries";
import { code } from "../structure";
import type { FileRule, LineMatch } from "./types";

/**
 * tf's own warning (tinyfugue/src/command.c, load_file(), lines ~574-600; proven by
 * tests/tfscript/cases/indented-line-after-command.tf, added 2026-10-11): when a line starts
 * a new top-level command (the previous line did not end in
 * a continuing `\`) and that line is itself indented, and there was already a prior command
 * in the file, tf warns "possibly missing trailing \" — the indentation looks like it was
 * meant to continue the previous command, but a missing `\` means it didn't.
 *
 * This is a whole-file, line-by-line state machine (new_cmd / last_cmd_line in the source),
 * not a per-command check — see the FileRule scope in ./types.
 *
 * The fix (joining the lines with `\`) needs the lines around this one, so diagnostics.ts adds
 * it afterwards; see joinFix.ts.
 *
 * Not modelled: tf's separate "whitespace following final '\'" warning is its own rule,
 * trailingSpaceAfterBackslash.ts.
 */
function check(text: string): LineMatch[] {
  const lines = splitRawLines(text);
  const matches: LineMatch[] = [];

  let newCmd = true;
  let lastCmdLine = 0; // 1-based; 0 means no command seen yet

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";

    if (isCommentLine(line)) continue; // comments never touch newCmd/lastCmdLine

    const i = leadingWhitespaceLength(line);
    const isBlank = i >= line.length;

    if (isBlank) {
      lastCmdLine = 0;
      newCmd = true;
      continue;
    }

    const startsIndented = i > 0;
    if (newCmd && startsIndented && lastCmdLine > 0) {
      const previous = lastCmdLine - 1;
      const prevLine = lines[previous] ?? "";
      let prevEnd = prevLine.length;
      while (prevEnd > 0 && isTfSpace(prevLine[prevEnd - 1])) prevEnd -= 1;
      matches.push({
        line: idx,
        startChar: 0,
        endChar: i,
        message: `Line ${lastCmdLine} has no \\ at the end, so this indented line starts a new command: end line ${lastCmdLine} with \\ to continue it, or remove the indentation.`,
        label: "starts a new command",
        explanation:
          `tf joins a line onto the one before it only when that one ends in ${code("\\")}. This line is indented ` +
          `as if it continued line ${lastCmdLine}, but tf runs it as a command of its own, and warns ` +
          `${code("possibly missing trailing \\")}.`,
        related: [{ line: previous, startChar: Math.max(prevEnd - 1, 0), endChar: prevEnd, message: "no \\ at the end of this line" }],
      });
    }
    lastCmdLine = idx + 1;

    newCmd = !continuesToNextLine(line);
  }

  return matches;
}

export const indentedLineAfterCommand: FileRule = {
  id: "indented-line-after-command",
  severity: "warning",
  scope: "file",
  check,
};
