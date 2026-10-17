import { LIBRARY_FILES_WITH_LOADED } from "../data/libraryLoaded.generated";
import { isTfSpace } from "../logicalEntries";
import { code, commandParts, macroBodyStart, parseLayout } from "../structure";
import { definedMacro, defFiresOnEvent, defHasInvalidOption } from "../symbols";
import { invalidMacroName } from "./invalidMacroName";
import type { EntryMatch, EntryRule, FileFacts } from "./types";
import type { LogicalEntry } from "../logicalEntries";

/**
 * The lint tier (rule table section L1): shapes tf runs without a word that may be deliberate.
 * Each is a warning, quiet as far as tf goes (quietInTf()), and a `; tflint:ignore-nextline`
 * comment on the line before turns it off (diagnostics.ts).
 */

const IGNORE = `put ${"`; tflint:ignore-nextline`"} on the line before`;

/** Whether tf defines this entry's macro at all: a /def whose name it refuses (invalid-macro-name) has no body to check. */
const refused = (entry: LogicalEntry, file: FileFacts): boolean => invalidMacroName.check(entry, file).length > 0;

/** Where a top-level `/def`'s options start (just after `def`), or -1 if `text` isn't a `/def` tf reads. */
function defStart(text: string): number {
  let start = 0;
  while (isTfSpace(text[start])) start += 1;
  const { prefix, word } = commandParts(text, start);
  if (word !== "def" || !/^!*@?$/.test(prefix)) return -1;
  const after = start + 1 + prefix.length + word.length;
  return after < text.length && !isTfSpace(text[after]) ? -1 : after;
}

/**
 * A plain `/def` (no trigger, hook or key) whose body is empty: running it sends a blank line to
 * the world, through the SEND hook (case lint-empty-body). An empty-bodied trigger sends nothing
 * when it fires (case lint-empty-trigger-body), so a gag trigger with no body isn't flagged.
 */
export const emptyMacroBody: EntryRule = {
  id: "empty-macro-body",
  severity: "warning",
  scope: "entry",
  check(entry, file): EntryMatch[] {
    if (!entry.isDefBody || refused(entry, file)) return [];
    const text = entry.text;
    const after = defStart(text);
    if (after < 0 || defHasInvalidOption(text, after) || defFiresOnEvent(text, after)) return [];
    const body = macroBodyStart(text);
    if (body < 0 || text.slice(body).trim() !== "") return [];
    let end = body;
    while (end > 0 && isTfSpace(text[end - 1])) end -= 1;
    return [
      {
        start: end - 1,
        end,
        message: `This macro's body is empty, so running it sends a blank line to the world: give it a body, or ${IGNORE.replace(/`/g, "")} if that is what you want.`,
        label: "empty body",
        explanation:
          `tf defines a macro with nothing after its ${code("=")} without a word, and running it sends an empty line to ` +
          `the world (through the ${code("SEND")} hook, as text in a body is sent). A trigger, hook or key binding with ` +
          `an empty body sends nothing when it fires, so those aren't flagged. If the blank line is the point, ${IGNORE}.`,
      },
    ];
  },
};

/** Text that `/send -h` takes as it is: not an option (`-`), and not a substitution that could turn into one. */
const SAFE_SEND_START = /^[^-%$\\{]/;

/**
 * Text in a macro body that tf sends to the world: the same as `/send -h text`, the SEND hook
 * included (case lint-send-h; expand.c sends text through the hook, stdlib.tf's /send passes -h
 * on to send(), socket.c's handle_send_function() runs the hook for it). The quick fix writes the
 * `/send -h`, where the text can't be read as one of /send's options.
 *
 * Not flagged: a macro that holds a value rather than commands (tfrc's `/def LOGFILE = ...`,
 * which stdlib.tf reads as `${LOGFILE}`): one the file reads as `${name}`, or one named in capitals
 * by that convention; and text either side of a `%|`, which tf refuses to pipe ("Piping output of
 * a server command is not allowed"), so it sends nothing, where `/send -h` would.
 */
export const textSentFromBody: EntryRule = {
  id: "text-sent-from-body",
  severity: "warning",
  scope: "entry",
  check(entry, file): EntryMatch[] {
    if (!(entry.isDefBody || entry.isOtherMacroBody) || refused(entry, file)) return [];
    const text = entry.text;
    const body = macroBodyStart(text);
    if (body < 0) return [];
    const name = entry.isDefBody ? definedMacro(entry) : undefined;
    if (name && (file.valueMacros.has(name.toLowerCase()) || (/[A-Z]/.test(name) && name === name.toUpperCase()))) return [];
    const b = text.slice(body);
    const layout = parseLayout(b, "body");
    if (layout.stopped) return [];
    const out: EntryMatch[] = [];
    for (const u of layout.units) {
      if (u.block || u.word !== "" || layout.lists[u.list]?.kind !== "body") continue;
      // The separators either side of it, in its own list.
      const seps = layout.separators.filter((sep) => sep.list === u.list);
      const before = seps.filter((sep) => sep.at < u.start).pop();
      const after = seps.find((sep) => sep.at >= u.start);
      if (before?.char === "|" || (after && after.at <= u.end && after.char === "|")) continue;
      let s = u.start;
      let e = u.end;
      while (s < e && isTfSpace(b[s])) s += 1;
      while (e > s && isTfSpace(b[e - 1])) e -= 1;
      if (s >= e) continue;
      const said = b.slice(s, e);
      const safe = SAFE_SEND_START.test(said);
      out.push({
        start: body + s,
        end: body + e,
        message: `This text is sent to the world: put /send -h in front of it to say so, or ${IGNORE.replace(/`/g, "")}.`,
        label: "sent to the world",
        explanation:
          `Text in a macro body that isn't a command is sent to the world when the macro runs, through the ` +
          `${code("SEND")} hook. ${code("/send -h")} does exactly that, and says it on purpose. ` +
          (safe
            ? ""
            : `The fix isn't offered here: text starting with ${code("-")} or a substitution could be read as an option of ${code("/send")}. `) +
          `If sending it bare is the point, ${IGNORE}.`,
        ...(safe ? { fix: { title: "Write it as /send -h", edits: [{ start: body + s, end: body + s, newText: "/send -h " }] } } : {}),
      });
    }
    return out;
  },
};

/**
 * A top-level `/load` of one of tf's library files that runs `/loaded`, by its bare name (found
 * through `TFPATH` or `TFLIBDIR`): `/require` loads it the same way, but only if it isn't loaded
 * already (stdlib.tf's /require is `/let _required=1%; /load %{-L} %{L}`, and /loaded ends the
 * second load of a file that was loaded with it). A file without /loaded is left alone: /require
 * would load it again anyway.
 */
export const loadOfLibraryFile: EntryRule = {
  id: "load-of-library-file",
  severity: "warning",
  scope: "entry",
  check(entry): EntryMatch[] {
    const text = entry.text;
    let start = 0;
    while (isTfSpace(text[start])) start += 1;
    const m = /^\/load((?:[ \t]+-\S+)*)[ \t]+(\S+)[ \t]*$/.exec(text.slice(start));
    if (!m) return [];
    const file = m[2] as string;
    if (!LIBRARY_FILES_WITH_LOADED.includes(file)) return [];
    const at = start + 1;
    return [
      {
        start: start,
        end: start + 5,
        message: `${file} is one of tf's library files, so /require loads it only if it isn't loaded yet: write /require, or ${IGNORE.replace(/`/g, "")} if loading it again is the point.`,
        label: "a library file",
        explanation:
          `${code(file)} is installed with tf and runs ${code("/loaded")}, so ${code("/require")} loads it just as ` +
          `${code("/load")} does (options and all) the first time, and skips it once it is loaded. ${code("/load")} reads ` +
          `it again each time, redefining its macros. If that is the point, ${IGNORE}.`,
        fix: { title: "Write /require", edits: [{ start: at, end: at + 4, newText: "require" }] },
      },
    ];
  },
};

export const LINT_RULES = [emptyMacroBody, textSentFromBody, loadOfLibraryFile];

/**
 * A comment that turns the lint tier off for the line after it: all of it, or the codes it names
 * (words like `text-sent-from-body`; anything else on the line, a reason, say, is just a comment).
 */
const IGNORE_RE = /^[ \t]*[;#].*?\btflint:ignore-nextline\b(.*)$/;
const CODE_WORD = /^[a-z]+(?:-[a-z]+)+$/;

/** Whether a lint diagnostic of `code` on line `line` is turned off by the comment on the line before. */
export function ignoredByComment(lines: readonly string[], line: number, code: string): boolean {
  const m = IGNORE_RE.exec(lines[line - 1] ?? "");
  if (!m) return false;
  const codes = (m[1] ?? "").split(/[\s,]+/).filter((w) => CODE_WORD.test(w));
  return codes.length === 0 || codes.includes(code);
}
