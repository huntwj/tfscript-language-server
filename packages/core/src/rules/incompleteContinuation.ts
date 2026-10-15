import { splitLogicalEntries, splitRawLines } from "../logicalEntries";
import { code } from "../structure";
import type { FileRule, LineMatch } from "./types";

/**
 * A file whose last command ends in a continuing `\`: tf's load_file() reaches the end of the file
 * still waiting for the next line, prints "last command is incomplete because of trailing \",
 * and drops the command (proven 2026-10-14 with tf-script-check: `/def -i z1 = /echo a%;\`,
 * `/echo b\` and a final newline defined no z1, with and without that newline). The empty piece
 * after a final newline isn't a line tf reads (logicalEntries.ts, fileLineCount), so it doesn't
 * complete the command; a real blank line after the `\` does.
 */
function check(text: string): LineMatch[] {
  const entry = splitLogicalEntries(text).at(-1);
  if (!entry?.incomplete) return [];
  const lastPart = entry.parts[entry.parts.length - 1];
  if (!lastPart) return [];
  const line = splitRawLines(text)[lastPart.line] ?? "";
  if (!line.endsWith("\\")) return [];
  const at = line.length - 1;
  return [
    {
      line: lastPart.line,
      startChar: at,
      endChar: line.length,
      message: "The last command ends in \\, so tf drops it: remove the \\ or add the rest of the command.",
      label: "continues past the end of the file",
      explanation:
        `A ${code("\\")} at the end of a line joins the next line onto this command, but the file ends here, so ` +
        `there is no next line. tf warns ${code("last command is incomplete because of trailing \\")} and runs ` +
        "nothing of the command: a macro it would define isn't defined.",
      fix: { title: "Remove the \\", edits: [{ line: lastPart.line, startChar: at, endChar: line.length, newText: "" }] },
    },
  ];
}

export const incompleteContinuation: FileRule = {
  id: "incomplete-continuation",
  severity: "warning",
  scope: "file",
  check,
};
