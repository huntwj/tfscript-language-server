import { LIBRARY_FILES_WITH_LOADED } from "../data/libraryLoaded.generated";
import { isTfSpace } from "../logicalEntries";
import { code, commandParts, macroBodyStart, parseLayout } from "../structure";
import { defFiresOnEvent, defHasInvalidOption } from "../symbols";
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

/** A `/set` or `/let` statement's variable: its name and where the name and the command word are, offsets into `s`. */
const SET_LET_RE = /^\/[@!]*(set|let)[ \t]+([A-Za-z_][A-Za-z0-9_]*)(=|[ \t]|$)/i;

/** Commands whose text is commands of another level (a nested /def), where a /set or tfread belongs to that level. */
const NESTED_TEXT = new Set(["def", "edit", "bind", "hook", "trig", "trigc", "trigp", "trigpc", "alias", "eval", "repeat", "quote", "at", "for"]);

interface BodyStatement {
  start: number;
  end: number;
  word: string;
}

/** A macro entry's body and its statements, offsets into the body, in order; undefined for no body tf runs. */
function bodyStatements(entry: LogicalEntry, file: FileFacts): { body: number; text: string; units: BodyStatement[] } | undefined {
  if (!(entry.isDefBody || entry.isOtherMacroBody) || refused(entry, file)) return undefined;
  const body = macroBodyStart(entry.text);
  if (body < 0) return undefined;
  const text = entry.text.slice(body);
  const layout = parseLayout(text, "body");
  if (layout.stopped) return undefined;
  const units = layout.units.filter((u) => layout.lists[u.list]?.kind === "body").map((u) => {
    let s = u.start;
    while (isTfSpace(text[s])) s += 1;
    return { start: s, end: u.end, word: u.word };
  });
  return { body, text, units: units.sort((a, b) => a.start - b.start) };
}

/** The names a body's `/let` statements make local, each with where its first `/let` starts. */
function letsOf(text: string, units: BodyStatement[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const u of units) {
    if (u.word !== "let") continue;
    const m = SET_LET_RE.exec(text.slice(u.start, u.end));
    if (m && !out.has(m[2] as string)) out.set(m[2] as string, u.start);
  }
  return out;
}

/**
 * A `/set` in a macro body writes a global variable, always: even where the macro made a local of
 * that name with `/let`, whose value its own reads then go on seeing (case
 * set-writes-global-over-local). Flagged where the macro has such a local, and, with
 * tfscript.diagnostics.localPrefix, for a name the project keeps for locals. The fix writes `/let`.
 */
export const setWritesGlobal: EntryRule = {
  id: "set-writes-global",
  severity: "warning",
  scope: "entry",
  check(entry, file): EntryMatch[] {
    const found = bodyStatements(entry, file);
    if (!found) return [];
    const { body, text, units } = found;
    const lets = letsOf(text, units);
    const out: EntryMatch[] = [];
    for (const u of units) {
      if (u.word !== "set") continue;
      const m = SET_LET_RE.exec(text.slice(u.start, u.end));
      if (!m) continue;
      const name = m[2] as string;
      const local = (lets.get(name) ?? Infinity) < u.start;
      const prefixed = file.localPrefix !== undefined && name.startsWith(file.localPrefix);
      if (!local && !prefixed) continue;
      const word = u.start + (m[0].toLowerCase().indexOf(m[1]!.toLowerCase()));
      out.push({
        start: body + u.start,
        end: body + u.start + m[0].length - (m[3] ? m[3].length : 0),
        message: local
          ? `This /set writes the global ${name}, not the local this macro made with /let, which its own reads go on seeing: write /let ${name}=... to change the local, or ${IGNORE.replace(/`/g, "")} if the global is meant.`
          : `This /set writes the global ${name}, though names starting with ${file.localPrefix} are locals in this project: write /let ${name}=... for a local, or ${IGNORE.replace(/`/g, "")} if the global is meant.`,
        label: "writes the global",
        explanation:
          `In a macro, ${code("/set")} always writes the global variable, even where a ${code("/let")} made a local of that ` +
          `name, and the macro's reads of the name still see the local. ` +
          (local ? `This macro has ${code(`/let ${name}`)} before it. ` : `By this project's convention (${code("tfscript.diagnostics.localPrefix")}), a name starting with ${code(file.localPrefix ?? "")} is only ever a local. `) +
          `${code(`/let ${name}=...`)} sets the local; if the global is meant, ${IGNORE}.`,
        ...(m[3] === "=" ? { fix: { title: "Write /let", edits: [{ start: body + word, end: body + word + 3, newText: "let" }] } } : {}),
      });
    }
    return out;
  },
};

/** A tfread() call's variable, the name it writes: tfread(name) or tfread(handle, name). */
const TFREAD_RE = /\btfread[ \t]*\([ \t]*(?:[^,()]*,[ \t]*)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*\)/g;

/**
 * `tfread()` writes the variable it is given by name: the macro's local where a `/let` made one,
 * else a global, which outlives the macro (case tfread-writes-global-without-let; tf's own
 * kv-textlog.tf left its `_l` behind this way). Information, or a warning with
 * tfscript.diagnostics.localPrefix for a name the project keeps for locals. The fix puts the `/let`
 * before the statement.
 */
export const tfreadWithoutLet: EntryRule = {
  id: "tfread-without-let",
  severity: "information",
  scope: "entry",
  check(entry, file): EntryMatch[] {
    const found = bodyStatements(entry, file);
    if (!found) return [];
    const { body, text, units } = found;
    const lets = letsOf(text, units);
    const out: EntryMatch[] = [];
    for (const m of text.matchAll(TFREAD_RE)) {
      const at = m.index as number;
      const within = units.filter((u) => u.start <= at && at < u.end);
      if (within.length === 0 || within.some((u) => NESTED_TEXT.has(u.word))) continue;
      const statement = within[0] as BodyStatement;
      const name = m[1] as string;
      if ((lets.get(name) ?? Infinity) < statement.start) continue;
      const prefixed = file.localPrefix !== undefined && name.startsWith(file.localPrefix);
      const nameAt = at + m[0].lastIndexOf(name);
      out.push({
        start: body + nameAt,
        end: body + nameAt + name.length,
        ...(prefixed ? { severity: "warning" as const } : {}),
        message: `This tfread writes the global ${name}, as the macro has no local of that name: put /let ${name}= before it for a local, or ${IGNORE.replace(/`/g, "")} if the global is meant.`,
        label: "writes a global",
        explanation:
          `${code("tfread()")} writes the variable it is given by name: the macro's local where a ${code("/let")} made one ` +
          `first, else a global, which is still set after the macro ends.` +
          (prefixed ? ` By this project's convention (${code("tfscript.diagnostics.localPrefix")}), ${code(name)} is only ever a local.` : "") +
          ` If the global is meant, ${IGNORE}.`,
        fix: { title: `Put /let ${name}= before it`, edits: [{ start: body + statement.start, end: body + statement.start, newText: `/let ${name}=%; ` }] },
      });
    }
    return out;
  },
};

export const LINT_RULES = [emptyMacroBody, loadOfLibraryFile, setWritesGlobal, tfreadWithoutLet];

/**
 * A comment that turns the lint tier off for the line after it: all of it, or the codes it names
 * (words like `empty-macro-body`; anything else on the line, a reason, say, is just a comment).
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
