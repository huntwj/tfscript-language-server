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
 *
 * Every physical line also has its leading whitespace stripped before being appended to the
 * joined command text — `command.c`'s `load_file()` does this unconditionally for every line
 * it reads, first line and continuation lines alike (`for (i = 0; is_space(line->data[i]);
 * i++)` before the `SStringocat` that appends from offset `i`), not only for continuations.
 * Keeping it would otherwise splice stray indentation into the middle of a joined command.
 *
 * CRLF: tf's own line reader (`tfio.c`'s `tfgetS()`) only breaks a line on `\n` — every other
 * byte, `\r` included, stays part of the line. So this module splits on `\n` only and keeps
 * any trailing `\r`, which has two consequences, both confirmed live against real tf:
 *  - a line ending `\<CR>` does not continue (its literal last character is `\r`, not `\`) —
 *    tf warns "whitespace following final '\'", same as `\` followed by a space (see
 *    backslashNotLast.ts, and isTfSpace below);
 *  - a line that *isn't* a failed continuation keeps its trailing `\r` as part of the command
 *    text tf actually runs. This module does the same: nothing strips it back out.
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
  /**
   * True when this entry is a `/for` command. Proven 2026-10-11 against
   * tinyfugue/lib/tf/color.tf: `%{var}` inside a top-level `/for` body (no `/def` involved)
   * is substituted on every iteration (`/for i 0 2 /nosuchcmd_%{i}` raised three distinctly
   * named "no such command" errors — nosuchcmd_0, nosuchcmd_1, nosuchcmd_2 — not one). So a
   * `/for` body is exempt from the same rule a `/def` body is, just for a different reason:
   * a `/def` body is deferred (rule 1), a `/for` body is substituted eagerly but per
   * iteration, not by load_file()'s single top-level pass. (Which text tf substitutes, `/for`
   * and `/repeat` included, is substitution.ts's table; this flag is the load graph's.)
   */
  isForLoop: boolean;
  /**
   * True when this entry creates a macro body the same way `/def` does, just under a
   * different command: `/bind`, `/hook`, and `/trig`/`/trigc`/`/trigp` (stdlib macros that
   * just reorder arguments onto the real builtin, `/trigpc` — see lib/tf/stdlib.tf). Confirmed
   * live for `/bind`, `/hook` and `/trig` directly: a `%{var}` in each one's body is accepted
   * with no "not expanded" complaint, same deferred-substitution behaviour as a `/def` body.
   * `/alias` (lib/tf/alias.tf, `/def -i alias`) is the same: its `%-1` becomes the body of
   * `~alias_body_NAME`, so a `%{*}` in the alias text stays literal until the alias runs.
   * Checked and deliberately NOT included: `/trigger` (runs existing triggers, does not define
   * one) and `/redef` (a `/set redef` toggle, nothing to do with macro bodies) — both looked
   * plausible by name alone, which is exactly why they were checked instead of assumed.
   */
  isOtherMacroBody: boolean;
  /** 0-based line number of the entry's first physical line. */
  startLine: number;
  /** 0-based line number of the entry's last physical line. */
  endLine: number;
  /**
   * True when the entry's last physical line still ended in a continuing `\` but the file
   * ended before another line arrived to join onto it. tf's load_file() only runs the
   * invalid-command / abort check once a command is completed by a *non*-continuing line
   * (confirmed live: a trailing `\` at true EOF just prints "last command is incomplete
   * because of trailing \" at the very end and is silently dropped — never aborts, never
   * runs). Such an entry must be excluded from every rule, including the abort check itself,
   * the same way nothing after a real abort is checked: tf never executes it either way.
   */
  incomplete: boolean;
  parts: EntryPart[];
  /** Maps each character offset in `text` back to a position in the original document. */
  offsetMap: { line: number; character: number }[];
}

// `/@def`, `/@bind` and `/@hook` are the builtins themselves; /alias and the /trig family are stdlib's.
const DEF_RE = /^\s*\/@?def\b/i;
const FOR_RE = /^\s*\/for\b/i;
const OTHER_MACRO_BODY_RE = /^\s*\/(?:alias|@?(?:bind|hook)|trigpc|trigc|trigp|trig)\b/i;

/**
 * Matches tf's own `is_space()` (`port.h`: `isspace((unsigned char)c)`), minus `\n` — already
 * consumed by splitting the file into lines, so it never appears within one. A byte like the
 * UTF-8 BOM is deliberately NOT included: it isn't ASCII whitespace to tf either, even though
 * JavaScript's own `\s` regex class (confusingly) treats U+FEFF as whitespace.
 */
export function isTfSpace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\r" || ch === "\f" || ch === "\v";
}

/** Index of the first character that is not `isTfSpace`, or `line.length` if there is none. */
export function leadingWhitespaceLength(line: string): number {
  let i = 0;
  while (i < line.length && isTfSpace(line[i])) i += 1;
  return i;
}

export function isCommentLine(line: string): boolean {
  const first = line[leadingWhitespaceLength(line)];
  return first === ";" || first === "#";
}

export function isBlankLine(line: string): boolean {
  return leadingWhitespaceLength(line) === line.length;
}

export function continuesToNextLine(line: string): boolean {
  if (!line.endsWith("\\")) return false;
  // "%\" is an escaped literal backslash, not a continuation marker.
  return !(line.length >= 2 && line[line.length - 2] === "%");
}

/**
 * The document's lines, split on `\n` only. A final newline leaves an empty piece after it: that
 * is a line to an editor (the cursor can sit there), so positions keep it, but it is not a line
 * tf reads — see fileLineCount().
 */
export function splitRawLines(text: string): string[] {
  return text.split("\n");
}

/**
 * How many of splitRawLines(text) tf reads as lines: all of them, less the empty piece after a
 * final newline. tf's tfgetS() returns a line at each `\n`, and at end of file only if text is
 * left, so "a\\\n" is one line ending in `\`, not a `\` followed by an empty line (proven
 * 2026-10-14: `/def -i z = /echo a%;\` then `/echo b\` then a final newline defined nothing,
 * and tf said "last command is incomplete because of trailing \").
 */
export function fileLineCount(lines: string[]): number {
  return lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}

export function splitLogicalEntries(text: string): LogicalEntry[] {
  const lines = splitRawLines(text);
  const count = fileLineCount(lines);
  const entries: LogicalEntry[] = [];

  let i = 0;
  while (i < count) {
    const firstLine = lines[i] ?? "";
    if (isCommentLine(firstLine)) {
      i += 1;
      continue;
    }

    const startLine = i;
    const parts: EntryPart[] = [];
    const partLeadingLens: number[] = [];
    let lineIdx = i;
    let incomplete = false;
    while (true) {
      const line = lines[lineIdx] ?? "";
      const continues = continuesToNextLine(line);
      const sliced = continues ? line.slice(0, -1) : line;
      const leadingLen = leadingWhitespaceLength(sliced);
      parts.push({ line: lineIdx, text: sliced.slice(leadingLen) });
      partLeadingLens.push(leadingLen);
      if (!continues) break;

      let nextIdx = lineIdx + 1;
      while (nextIdx < count && isCommentLine(lines[nextIdx] ?? "")) {
        nextIdx += 1;
      }
      if (nextIdx >= count) {
        incomplete = true;
        break;
      }
      lineIdx = nextIdx;
    }

    const joinedText = parts.map((p) => p.text).join("");
    const offsetMap: { line: number; character: number }[] = [];
    parts.forEach((part, idx) => {
      const leadingLen = partLeadingLens[idx] ?? 0;
      for (let c = 0; c < part.text.length; c += 1) {
        offsetMap.push({ line: part.line, character: leadingLen + c });
      }
    });

    entries.push({
      text: joinedText,
      isDefBody: DEF_RE.test(joinedText),
      isForLoop: FOR_RE.test(joinedText),
      isOtherMacroBody: OTHER_MACRO_BODY_RE.test(joinedText),
      startLine,
      endLine: lineIdx,
      incomplete,
      parts,
      offsetMap,
    });

    i = lineIdx + 1;
  }

  return entries;
}
