import { leadingWhitespaceLength, type LogicalEntry } from "../logicalEntries";

export interface AbortMatch {
  /** Index into the entries array; everything from here on is never read by tf. */
  entryIndex: number;
  line: number;
  startChar: number;
  endChar: number;
  message: string;
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
 */
export function findAbortEntry(entries: LogicalEntry[]): AbortMatch | null {
  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    if (!entry) continue;

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

    return {
      entryIndex: idx,
      line: start.line,
      startChar: start.character,
      endChar: lastChar.character + 1,
      message:
        "this line is not blank, a comment (; or #), or a command (starting with /) — tf " +
        'aborts the rest of this file\'s load here ("Invalid command. Aborting."). Nothing ' +
        "after this line in the file is read.",
    };
  }
  return null;
}
