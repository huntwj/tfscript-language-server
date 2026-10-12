import { continuesToNextLine, isCommentLine } from "../logicalEntries";

/**
 * tf's own warning (tinyfugue/src/command.c, load_file(), lines ~574-600; proven by
 * tests/tfscript/cases/indented-line-after-command.tf, added by the tf dev session
 * 2026-10-11): when a line starts a new top-level command (the previous line did not end in
 * a continuing `\`) and that line is itself indented, and there was already a prior command
 * in the file, tf warns "possibly missing trailing \" — the indentation looks like it was
 * meant to continue the previous command, but a missing `\` means it didn't.
 *
 * This is a whole-file, line-by-line state machine (new_cmd / last_cmd_line in the source),
 * not a per-LogicalEntry check, so it does not fit the Rule interface the other rules use —
 * it runs directly over the raw lines in diagnostics.ts.
 *
 * Not modelled: tf's separate "whitespace following final '\'" warning (a trailing `\`
 * followed by whitespace, so it does NOT continue) — not yet backed by a proven case.
 */
export interface LineMatch {
  line: number;
  startChar: number;
  endChar: number;
  message: string;
}

export function indentedLineAfterCommand(text: string): LineMatch[] {
  const lines = text.split(/\r\n|\r|\n/);
  const matches: LineMatch[] = [];

  let newCmd = true;
  let lastCmdLine = 0; // 1-based; 0 means no command seen yet

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";

    if (isCommentLine(line)) continue; // comments never touch newCmd/lastCmdLine

    let i = 0;
    while (i < line.length && (line[i] === " " || line[i] === "\t")) i += 1;
    const isBlank = i >= line.length;

    if (isBlank) {
      lastCmdLine = 0;
      newCmd = true;
      continue;
    }

    const startsIndented = line[0] === " " || line[0] === "\t";
    if (newCmd && startsIndented && lastCmdLine > 0) {
      matches.push({
        line: idx,
        startChar: 0,
        endChar: i,
        message:
          `possibly missing trailing \\ on line ${lastCmdLine}: this indented line starts a ` +
          "new top-level command instead of continuing the previous one.",
      });
    }
    lastCmdLine = idx + 1;

    if (continuesToNextLine(line)) {
      newCmd = false;
    } else {
      newCmd = true;
    }
  }

  return matches;
}
