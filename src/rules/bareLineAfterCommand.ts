import type { LogicalEntry } from "../logicalEntries";

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
 * Aborting." — confirmed by the tf dev session with
 * tests/tfscript/cases/bare-line-after-command.tf and by reading command.c directly. The
 * implicit-/addworld fallback for such lines is NOT available to /load-ed files: `tinytalk`
 * is a do_file_load() parameter only main.c's startup read of ~/.tinytalk sets to TRUE (tf
 * dev verified this by trying a bare line in a /load-ed file and getting the abort).
 *
 * splitLogicalEntries() has already dropped comment lines and joined backslash
 * continuations, so this only has to look at each entry's first physical line.
 */
export function findAbortEntry(entries: LogicalEntry[]): AbortMatch | null {
  for (let idx = 0; idx < entries.length; idx += 1) {
    const firstPart = entries[idx]?.parts[0];
    if (!firstPart) continue;

    const leading = /^[ \t]*/.exec(firstPart.text);
    const leadingLen = leading ? leading[0].length : 0;
    const firstChar = firstPart.text[leadingLen];
    if (firstChar === undefined) continue; // blank entry: fine, tf just moves on
    if (firstChar === "/") continue; // a real command

    return {
      entryIndex: idx,
      line: firstPart.line,
      startChar: leadingLen,
      endChar: firstPart.text.length,
      message:
        "this line is not blank, a comment (; or #), or a command (starting with /) — tf " +
        'aborts the rest of this file\'s load here ("Invalid command. Aborting."). Nothing ' +
        "after this line in the file is read.",
    };
  }
  return null;
}
