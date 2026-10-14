import { leadingWhitespaceLength, type LogicalEntry } from "../logicalEntries";
import { code } from "../structure";
import type { LineMatch } from "./types";

export interface AbortMatch extends LineMatch {
  /** Index into the entries array; everything from here on is never read by tf. */
  entryIndex: number;
}

/**
 * tf's load_file() aborts the WHOLE load when a (joined) command's first character is not
 * `/` and the line wasn't already filtered out as blank or a comment: "Invalid command.
 * Aborting." — confirmed with tests/tfscript/cases/bare-line-after-command.tf (run against
 * real tf) and by reading command.c directly. The implicit-/addworld fallback for such lines
 * is NOT available to /load-ed files: `tinytalk` is a do_file_load() parameter only main.c's
 * startup read of ~/.tinytalk sets to TRUE, confirmed by trying a bare line in a /load-ed
 * file and getting the abort.
 *
 * Looks at the entry's full joined `text`, not just its first physical part: a backslash
 * continuation whose first line is itself blank (e.g. a lone `\`) still joins onto the next
 * line to form the real command, and that command's first character can only be found by
 * scanning the joined text — checking just `parts[0]` would wrongly treat such an entry as
 * blank and miss the abort.
 *
 * The fix comments out every physical line of the command: a comment line is skipped even in
 * the middle of a continuation, so a `;` on only the first line would leave the rest to run as
 * commands of their own (load_file() checks for a comment before it looks for a trailing `\`).
 */
export function findAbortEntry(entries: LogicalEntry[]): AbortMatch | null {
  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    if (!entry) continue;
    // An incomplete trailing entry (file ended mid-continuation) never reaches tf's
    // invalid-command check at all — see LogicalEntry.incomplete.
    if (entry.incomplete) continue;

    const leadingLen = leadingWhitespaceLength(entry.text);
    const firstChar = entry.text[leadingLen];
    if (firstChar === undefined) continue; // blank entry: fine, tf just moves on
    if (firstChar === "/") continue; // a real command

    const start = entry.offsetMap[leadingLen];
    if (!start) continue; // defensive; offsetMap always covers entry.text in practice

    // Highlight to the end of whichever physical line that first character is on.
    let end = leadingLen;
    while (end < entry.offsetMap.length && entry.offsetMap[end]?.line === start.line) {
      end += 1;
    }
    const lastChar = entry.offsetMap[end - 1] ?? start;

    // The first character of each physical line of the command, where a `; ` comments it out.
    const firsts = new Map<number, number>();
    for (const at of entry.offsetMap) if (!firsts.has(at.line)) firsts.set(at.line, at.character);

    // A UTF-8 byte order mark is no blank to tf: proven live, a line that starts with one aborts
    // the load, even when a / follows it. Deleting it is the fix, not commenting the line out, but
    // only when the rest is a command or a comment: otherwise the line still wouldn't be one, and
    // commenting it out (below) is the fix.
    const after = entry.text.slice(leadingLen + 1);
    const rest = after[leadingWhitespaceLength(after)];
    if (firstChar === "\uFEFF" && (rest === "/" || rest === ";" || rest === "#")) {
      return {
        entryIndex: idx,
        line: start.line,
        startChar: start.character,
        endChar: start.character + 1,
        message: "This line starts with a byte order mark (U+FEFF), which tf reads as text, so it stops loading the file here: delete the mark.",
        label: "byte order mark",
        explanation:
          `Some editors save UTF-8 files with an invisible byte order mark at the start. tf doesn't skip it, so ` +
          `the line doesn't start with ${code("/")}, ${code(";")} or ${code("#")}: tf reports ` +
          `${code("Invalid command. Aborting.")} and reads nothing after it. Save the file as UTF-8 without a BOM.`,
        fix: { title: "Delete the byte order mark", edits: [{ line: start.line, startChar: start.character, endChar: start.character + 1, newText: "" }] },
      };
    }

    return {
      entryIndex: idx,
      line: start.line,
      startChar: start.character,
      endChar: lastChar.character + 1,
      message: "This line isn't a command, so tf stops loading the file here: comment it out, or start it with /.",
      label: "not a command",
      explanation:
        `tf joins the lines of a file that end in ${code("\\")} onto the line after, and runs each resulting ` +
        `command. Apart from blank lines and comments (starting with ${code(";")} or ${code("#")}), each command has to ` +
        `start with ${code("/")}; at any other command tf reports ${code("Invalid command. Aborting.")} and reads nothing ` +
        `after it. If the line belongs to the command above it, end that command's last line with ${code("\\")}; if ` +
        `it is a note, make it a comment.`,
      fix: {
        title: firsts.size > 1 ? "Comment out these lines" : "Comment out the line",
        edits: [...firsts].map(([line, character]) => ({ line, startChar: character, endChar: character, newText: "; " })),
      },
    };
  }
  return null;
}
