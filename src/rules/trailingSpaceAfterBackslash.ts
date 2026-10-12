import { isBlankLine, isCommentLine } from "../logicalEntries";
import type { FileRule, LineMatch } from "./types";

/**
 * tf's warning (tinyfugue/src/command.c, load_file(); proven by
 * tests/tfscript/cases/trailing-space-after-backslash.tf, added 2026-10-11): a line is only
 * a continuation if `\` is its literal last character. If `\` is
 * followed by whitespace, tf warns "whitespace following final '\'" and does **not**
 * continue the line — it is a complete command on its own, same as logicalEntries.ts's
 * continuesToNextLine already treats it (that function requires line.endsWith("\\")), so
 * this rule only adds the warning tf itself prints; it changes no continuation behaviour.
 */
function check(text: string): LineMatch[] {
  const lines = text.split(/\r\n|\r|\n/);
  const matches: LineMatch[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";
    if (isCommentLine(line) || isBlankLine(line)) continue;
    if (line.endsWith("\\")) continue; // a real continuation, not this case

    let end = line.length - 1;
    while (end > 0 && (line[end] === " " || line[end] === "\t")) end -= 1;
    if (line[end] !== "\\") continue;

    matches.push({
      line: idx,
      startChar: end,
      endChar: line.length,
      message:
        "whitespace following final '\\' — this line is NOT continued onto the next one " +
        "(tf's own warning). Remove the trailing whitespace if continuation was intended.",
    });
  }

  return matches;
}

export const trailingSpaceAfterBackslash: FileRule = {
  id: "trailing-space-after-backslash",
  severity: "warning",
  scope: "file",
  check,
};
