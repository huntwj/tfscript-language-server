import { isBlankLine, isCommentLine, isTfSpace, splitRawLines } from "../logicalEntries";
import { code } from "../structure";
import type { FileRule, LineMatch } from "./types";

/**
 * tf's warning (tinyfugue/src/command.c, load_file(); proven by
 * tests/tfscript/cases/trailing-space-after-backslash.tf, added 2026-10-11): a line is only
 * a continuation if `\` is its literal last character. If `\` is
 * followed by whitespace, tf warns "whitespace following final '\'" and does **not**
 * continue the line — it is a complete command on its own, same as logicalEntries.ts's
 * continuesToNextLine already treats it (that function requires line.endsWith("\\")), so
 * this rule only adds the warning tf itself prints; it changes no continuation behaviour.
 *
 * A CRLF file's trailing `\r` is exactly this case (confirmed live): `\<CR>` is a backslash
 * followed by whitespace tf's own is_space() recognises, same as a backslash followed by a
 * space or tab — see isTfSpace. The fix (deleting the whitespace) is not offered on such a line:
 * deleting one line's `\r` would leave mixed line endings, and converting the whole file is the
 * editor's job. Nor after `%\`, which is an escaped backslash and doesn't continue either way.
 */
function check(text: string): LineMatch[] {
  const lines = splitRawLines(text);
  const matches: LineMatch[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";
    if (isCommentLine(line) || isBlankLine(line)) continue;
    if (line.endsWith("\\")) continue; // a real continuation, not this case

    let end = line.length - 1;
    while (end > 0 && isTfSpace(line[end])) end -= 1;
    if (line[end] !== "\\") continue;

    const after = line.slice(end + 1);
    const detail =
      line[end - 1] === "%"
        ? {
            message: "This %\\ doesn't continue the line, with or without the whitespace after it: to continue, end the line with a \\ that has no % before it.",
            label: "%\\ never continues",
            explanation:
              `tf continues a line onto the next one only when its very last character is a ${code("\\")} that doesn't ` +
              `follow a ${code("%")}: a line ending in ${code("%\\")} is a complete command. tf also warns ` +
              `${code("whitespace following final '\\'")} about the whitespace after it.`,
          }
        : after === "\r"
        ? {
            message: "This \\ doesn't continue the line, because the file's Windows (CRLF) line endings put a carriage return after it: save the file with LF line endings.",
            label: "carriage return after the \\",
            explanation:
              `A line continues onto the next one only when ${code("\\")} is its very last character. tf keeps the ` +
              "carriage return of a CRLF line ending as part of the line, and counts it as whitespace, so no line in " +
              "this file can continue. Save the file with LF line endings.",
          }
        : {
            message: "This \\ doesn't continue the line, because whitespace follows it: remove the whitespace.",
            label: "whitespace after the \\",
            explanation:
              `A line continues onto the next one only when ${code("\\")} is its very last character. With whitespace ` +
              `after it, tf runs this line as a command of its own, and warns ${code("whitespace following final '\\'")}.`,
          };
    const fixable = !after.includes("\r") && line[end - 1] !== "%";
    matches.push({
      line: idx,
      startChar: end,
      endChar: line.length,
      ...detail,
      ...(fixable
        ? { fix: { title: "Remove the whitespace after the \\", edits: [{ line: idx, startChar: end + 1, endChar: line.length, newText: "" }] } }
        : {}),
    });
  }

  return matches;
}

export const backslashNotLast: FileRule = {
  id: "backslash-not-last",
  severity: "warning",
  scope: "file",
  check,
};
