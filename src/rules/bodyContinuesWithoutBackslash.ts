import { isCommentLine, isTfSpace, leadingWhitespaceLength, splitLogicalEntries, splitRawLines } from "../logicalEntries";
import { code } from "../structure";
import { defOptionsEnd } from "../symbols";
import type { FileRule, LineMatch } from "./types";

/**
 * A macro body whose last line ends in `%;` but not in `\`, with a command on the next line: the
 * `%;` says another statement was meant to follow, but without the `\` the body ends there, and the
 * next line is a command of its own, run once when the file loads. tf says nothing (proven
 * 2026-10-14: `/def p07 = /echo one%;` then `/echo two` printed "two" at load, and `/p07` only
 * "one").
 *
 * It is a guess, so it is information, not a warning: a trailing `%;` is harmless, and the next
 * line may well be meant to run at load. It only looks at an unindented `/` line straight after
 * the body: an indented one is indented-line-after-command's, a body that ends at a blank line
 * (tf's library ends `\`-continued bodies that way) is ended on purpose, and anything else is
 * not-a-command's. Nor at a line that runs the macro just defined, which is meant to run at load,
 * or that defines another macro.
 * tinyfugue's lib/tf, wotmud/tf and the tf-* repos have none.
 */
function check(text: string): LineMatch[] {
  const lines = splitRawLines(text);
  const matches: LineMatch[] = [];
  const entries = splitLogicalEntries(text);
  entries.forEach((entry, index) => {
    if (!(entry.isDefBody || entry.isOtherMacroBody) || entry.incomplete) return;
    const last = lines[entry.endLine] ?? "";
    let end = last.length;
    while (end > 0 && isTfSpace(last[end - 1])) end -= 1;
    // A real %;: a run of two or more %s is text, and so is a \%; (the \ escapes the %).
    if (end < 2 || last.slice(end - 2, end) !== "%;" || last[end - 3] === "%" || last[end - 3] === "\\") return;
    const next = lines[entry.endLine + 1];
    if (next === undefined || isCommentLine(next) || leadingWhitespaceLength(next) > 0 || !next.startsWith("/")) return;
    // Another definition (/def, /bind, /hook, /trig..., /alias) is a new macro, not more of this one.
    const following = entries[index + 1];
    if (following && following.startLine === entry.endLine + 1 && (following.isDefBody || following.isOtherMacroBody)) return;
    // Running the macro just defined is a line meant to run at load.
    const name = /^\/def\b/i.test(entry.text) ? entry.text.slice(defOptionsEnd(entry.text, 4)).split("=")[0]?.trim().toLowerCase() : undefined;
    if (name && /^\/[@!]*(\S*)/.exec(next)?.[1]?.toLowerCase() === name) return;
    matches.push({
      line: entry.endLine,
      startChar: end - 2,
      endChar: end,
      message: `The macro body ends here, so line ${entry.endLine + 2} is a command of its own, run when the file loads: end this line with \\ if it belongs to the body.`,
      label: "the body ends here",
      explanation:
        `The ${code("%;")} says another statement follows, but a line only continues onto the next one when it ` +
        `ends in ${code("\\")}. So the body ends here, and tf runs line ${entry.endLine + 2} once, as it loads the ` +
        `file. If it is meant to run then, drop the ${code("%;")}.`,
      related: [{ line: entry.endLine + 1, startChar: 0, endChar: next.length, message: "runs when the file loads" }],
      fix: { title: `End line ${entry.endLine + 1} with \\`, edits: [{ line: entry.endLine, startChar: end, endChar: last.length, newText: " \\" }] },
    });
  });
  return matches;
}

export const bodyContinuesWithoutBackslash: FileRule = {
  id: "body-continues-without-backslash",
  severity: "information",
  scope: "file",
  check,
};
