import type { ContextFile, Location, NavContext, TextEditAt } from "./navigation";
import type { Position, Range } from "./symbols";
import { findVariables, isVariableName, readSelector, SPECIAL_VARIABLE_NAMES, type VariableOccurrence } from "./variables";

/**
 * Go-to-definition, references, rename and highlights for variables, on top of findVariables().
 * A global is one name across this file and the others on its load path; a macro body's own
 * `/let` variable is only that body's (see variables.ts for how scopes are decided, and what is
 * approximated).
 */

function contains(range: Range, pos: Position): boolean {
  const afterStart = pos.line > range.start.line || (pos.line === range.start.line && pos.character >= range.start.character);
  const beforeEnd = pos.line < range.end.line || (pos.line === range.end.line && pos.character <= range.end.character);
  return afterStart && beforeEnd;
}

/** The variable under the cursor; a cursor right after a name counts, unless another name starts there (getopts("ab")). */
export function variableAt(text: string, pos: Position): VariableOccurrence | undefined {
  const all = findVariables(text).filter((v) => contains(v.range, pos));
  return all.find((v) => v.range.end.line !== pos.line || v.range.end.character !== pos.character) ?? all[0];
}

const DEFINES = new Set(["set", "setenv", "let", "getopts"]);

interface Found extends VariableOccurrence {
  uri: string;
}

/** The occurrences of the variable `target` means, in this file and (for a global) `files`. */
function occurrencesOf(target: VariableOccurrence, text: string, self: string, files: ContextFile[]): Found[] {
  const pick = (uri: string, fileText: string): Found[] =>
    findVariables(fileText)
      .filter((v) => v.name === target.name && v.scope === target.scope)
      .map((v) => ({ ...v, uri }));
  const here = pick(self, text);
  return target.scope === "global" ? [...here, ...files.flatMap((f) => pick(f.uri, f.text))] : here;
}

const toLocation = (v: Found): Location => ({ uri: v.uri, range: v.range });

/**
 * Where the variable under the cursor is set: its `/set`, `/setenv` or `/let`, in this file and
 * the files on its load path, tf's library included; failing those, its expression assignments.
 */
export function variableDefinition(text: string, pos: Position, ctx?: NavContext): Location[] | undefined {
  const target = variableAt(text, pos);
  if (!target) return undefined;
  const all = occurrencesOf(target, text, ctx?.uri ?? "", [...(ctx?.files ?? []), ...(ctx?.libraryFiles ?? [])]);
  const sets = all.filter((v) => DEFINES.has(v.access));
  return (sets.length > 0 ? sets : all.filter((v) => v.access === "assign")).map(toLocation);
}

export function variableReferences(text: string, pos: Position, includeDeclaration: boolean, ctx?: NavContext): Location[] | undefined {
  const target = variableAt(text, pos);
  if (!target) return undefined;
  return occurrencesOf(target, text, ctx?.uri ?? "", ctx?.files ?? [])
    .filter((v) => includeDeclaration || !DEFINES.has(v.access))
    .map(toLocation);
}

export type HighlightKind = "read" | "write";

/** Every occurrence of the variable under the cursor in this file, as a read or a write. */
export function variableHighlights(text: string, pos: Position): { range: Range; kind: HighlightKind }[] | undefined {
  const target = variableAt(text, pos);
  if (!target) return undefined;
  return occurrencesOf(target, text, "", []).map((v) => ({ range: v.range, kind: v.access === "read" ? "read" : "write" }));
}

type RenameCheck = { ok: true; target: VariableOccurrence } | { ok: false; reason: string } | undefined;

function renameCheck(text: string, pos: Position, ctx?: NavContext): RenameCheck {
  const target = variableAt(text, pos);
  if (!target) return undefined;
  if (target.scope === "global" && SPECIAL_VARIABLE_NAMES.has(target.name)) {
    return { ok: false, reason: `${target.name} is one of tf's special variables, so it can't be renamed.` };
  }
  if (findVariables(text).some((v) => v.access === "getopts" && v.name === target.name && v.scope === target.scope)) {
    return { ok: false, reason: `${target.name} is set by getopts(), which names it after its option letter, so it can't be renamed.` };
  }
  if (target.scope === "global") {
    for (const f of ctx?.libraryFiles ?? []) {
      const set = findVariables(f.text).find((v) => v.name === target.name && v.scope === "global" && v.access !== "read");
      if (set) return { ok: false, reason: `${target.name} is set in tf's library, which isn't yours to rename.` };
    }
  }
  return { ok: true, target };
}

export function prepareVariableRename(text: string, pos: Position, ctx?: NavContext): { range: Range; placeholder: string } | { error: string } | undefined {
  const check = renameCheck(text, pos, ctx);
  if (!check) return undefined;
  return check.ok ? { range: check.target.range, placeholder: check.target.name } : { error: check.reason };
}

/** Why tf wouldn't read `name` as a variable in `%name` or `%{name}`, if it wouldn't. */
function badName(name: string): string | undefined {
  if (!isVariableName(name)) {
    return `"${name}" can't be a variable name: use letters, digits and _, not starting with a digit.`;
  }
  if (readSelector(name, 0)?.name !== name || readSelector(`{${name}}`, 0)?.name !== name) {
    return `"${name}" can't be a variable name here: tf reads %${name} as a positional or special substitution, not a variable.`;
  }
  if (SPECIAL_VARIABLE_NAMES.has(name)) {
    return `"${name}" is one of tf's special variables: pick another name.`;
  }
  return undefined;
}

/**
 * Renames the variable under the cursor: every `/set`, `/setenv`, `/let`, `/unset` and `/export`
 * of it and every `%name`, `%{name}`, `{name}` and `name` read or assignment, in this file and,
 * for a global, the others on its load path. A body's own `/let` variable only changes in that
 * body, and a global leaves those bodies' locals alone.
 *
 * Not renamed, because nothing here can tell them from ordinary text: names in strings or built
 * at runtime (`/eval /set %{prefix}_x=1`, `getopts("x:")`), `/listvar` patterns, and comments.
 */
export function variableRenameEdits(text: string, pos: Position, newName: string, ctx?: NavContext): TextEditAt[] | { error: string } | undefined {
  const check = renameCheck(text, pos, ctx);
  if (!check) return undefined;
  if (!check.ok) return { error: check.reason };
  const bad = badName(newName);
  if (bad) return { error: bad };
  return occurrencesOf(check.target, text, ctx?.uri ?? "", ctx?.files ?? []).map((v) => ({ uri: v.uri, range: v.range, newText: newName }));
}
