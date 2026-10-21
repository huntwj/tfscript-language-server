import { posix } from "node:path";
import type { ContextFile, Location, NavContext, TextEditAt } from "./navigation";
import type { Position, Range } from "./symbols";
import { tablesFor } from "./data/tables";
import { findVariables, isVariableName, readSelector, type VariableOccurrence } from "./variables";

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
  if (target.scope === "global" && tablesFor(ctx?.tfBuild).specialVariableNames.has(target.name)) {
    return { ok: false, reason: `${target.name} is one of tf's special variables, so it can't be renamed.` };
  }
  if (findVariables(text).some((v) => v.access === "getopts" && v.name === target.name && v.scope === target.scope)) {
    return { ok: false, reason: `${target.name} is set by getopts(), which names it after its option letter, so it can't be renamed.` };
  }
  if (target.scope === "global") {
    for (const f of ctx?.libraryFiles ?? []) {
      if (findVariables(f.text).some((v) => v.name === target.name && v.scope === "global")) {
        return { ok: false, reason: `${target.name} is used by tf's library, which a rename here can't change, so it can't be renamed.` };
      }
    }
  }
  const passed = passedOn(target, text, ctx);
  if (passed) return { ok: false, reason: passed };
  return { ok: true, target };
}

const WRITES = new Set(["set", "setenv", "assign"]);

/**
 * Why `target` may be a local one macro hands to another, which a rename can't follow: tf's
 * scoping is dynamic, so a macro reads the locals of the macro that called it (proven: a callee's
 * `%_pattern` read its caller's `/let _pattern`, as grep.tf, map.tf and stdlib.tf rely on). When
 * nothing on the load path sets a global of the name, a read of it outside any `/let` is most
 * likely such a callee, and a `/let` of it most likely such a caller.
 */
function passedOn(target: VariableOccurrence, text: string, ctx?: NavContext): string | undefined {
  const name = target.name;
  const self = ctx?.uri ?? "";
  const files = [
    { uri: self, text, library: false },
    ...(ctx?.files ?? []).map((f) => ({ ...f, library: false })),
    ...(ctx?.libraryFiles ?? []).map((f) => ({ ...f, library: true })),
  ];
  type Found = VariableOccurrence & { uri: string; library: boolean };
  const all: Found[] = files.flatMap((f) =>
    findVariables(f.text)
      .filter((v) => v.name === name)
      .map((v) => ({ ...v, uri: f.uri, library: f.library })),
  );
  if (all.some((v) => v.scope === "global" && WRITES.has(v.access))) return undefined;
  const where = (v: Found): string => {
    const at = `line ${v.range.start.line + 1}, column ${v.range.start.character + 1}`;
    return v.uri === self ? at : `${fileLabel(v.uri, self, v.library)} ${at}`;
  };
  const advice = "Rename both by hand if they are the same variable.";
  if (target.scope !== "global") {
    const reads = all.filter((v) => v.scope === "global" && v.access === "read");
    const elsewhere = reads.find((v) => v.uri !== self || v.entry !== target.entry);
    if (elsewhere) {
      return `${name} is also read on ${where(elsewhere)}, outside this one's scope, and nothing sets a global ${name}, so tf's dynamic scoping probably hands it this one. ${advice}`;
    }
    const here = reads[0];
    if (here) {
      return `This macro also reads ${name} on ${where(here)}, where this one doesn't reach, and nothing sets a global ${name}, so that read gets whatever a macro calling this one has. ${advice}`;
    }
    return undefined;
  }
  const bound = all.find((v) => v.access === "let" || v.access === "getopts");
  if (!bound) return undefined;
  const kind = bound.access === "getopts" ? "getopts() option" : bound.form === "loop-variable" ? `/for ${name} loop variable` : `/let ${name}`;
  return `Nothing sets a global ${name}, so its reads probably get the ${kind} on ${where(bound)} through tf's dynamic scoping. ${advice}`;
}

/** How to name another file in a message: a tf library file by its name, a workspace file relative to this one's folder. */
function fileLabel(uri: string, self: string, library: boolean): string {
  const filePath = (u: string): string => {
    try {
      return decodeURIComponent(new URL(u).pathname);
    } catch {
      return u;
    }
  };
  const other = filePath(uri);
  if (library || !self) return posix.basename(other);
  return posix.relative(posix.dirname(filePath(self)), other);
}

/**
 * Why renaming `target` to `newName` would change what the script does, if it would: the new
 * name already means a variable the renamed one would merge with, or a macro body's own
 * variable would take over the renamed one there (or the other way round).
 */
function collision(target: VariableOccurrence, newName: string, text: string, ctx?: NavContext): string | undefined {
  const old = target.name;
  const everywhere = [{ uri: ctx?.uri ?? "", text }, ...(ctx?.files ?? []), ...(ctx?.libraryFiles ?? [])];
  const globalNamed = everywhere.some((f) => findVariables(f.text).some((v) => v.name === newName && v.scope === "global"));
  if (target.scope === "global") {
    if (globalNamed) {
      return `${newName} is already a variable on this file's load path, so renaming ${old} to it would merge the two. Pick a name that isn't used yet.`;
    }
    for (const f of everywhere) {
      const all = findVariables(f.text);
      const uses = new Set(all.filter((v) => v.name === old && v.scope === "global").map((v) => v.entry));
      if (all.some((v) => v.name === newName && v.scope !== "global" && uses.has(v.entry))) {
        return `A macro that uses ${old} has its own /let ${newName}, which would take over ${old} there after the rename. Pick another name.`;
      }
    }
    return undefined;
  }
  if (findVariables(text).some((v) => v.name === newName && v.entry === target.entry)) {
    return `This macro body already uses ${newName}, so renaming ${old} to it would merge the two. Pick another name.`;
  }
  if (globalNamed) {
    return `${newName} is already a global variable on this file's load path, and a /let ${newName} would hide it from this macro and any macro it calls. Pick another name.`;
  }
  return undefined;
}

export function prepareVariableRename(text: string, pos: Position, ctx?: NavContext): { range: Range; placeholder: string } | { error: string } | undefined {
  const check = renameCheck(text, pos, ctx);
  if (!check) return undefined;
  return check.ok ? { range: check.target.range, placeholder: check.target.name } : { error: check.reason };
}

/** Why tf wouldn't read `name` as a variable in `%name` or `%{name}`, if it wouldn't. */
function badName(name: string, ctx?: NavContext): string | undefined {
  if (!isVariableName(name)) {
    return `"${name}" can't be a variable name: use letters, digits and _, not starting with a digit.`;
  }
  if (readSelector(name, 0)?.name !== name || readSelector(`{${name}}`, 0)?.name !== name) {
    return `"${name}" can't be a variable name here: tf reads %${name} as a positional or special substitution, not a variable.`;
  }
  if (tablesFor(ctx?.tfBuild).specialVariableNames.has(name)) {
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
 * Refused: tf's special variables, variables tf's library uses, the `opt_` variables getopts()
 * names after its option letters, and a new name that is already taken where the rename would
 * merge or capture variables (see collision()). Not renamed, because nothing here can tell them
 * from ordinary text: names in strings tf doesn't substitute or built at run time
 * (`/eval /set %{prefix}_x=1`), `/listvar` patterns, and comments.
 */
export function variableRenameEdits(text: string, pos: Position, newName: string, ctx?: NavContext): TextEditAt[] | { error: string } | undefined {
  const check = renameCheck(text, pos, ctx);
  if (!check) return undefined;
  if (!check.ok) return { error: check.reason };
  const bad = badName(newName, ctx);
  if (bad) return { error: bad };
  if (newName !== check.target.name) {
    const taken = collision(check.target, newName, text, ctx);
    if (taken) return { error: taken };
  }
  return occurrencesOf(check.target, text, ctx?.uri ?? "", ctx?.files ?? []).map((v) => ({ uri: v.uri, range: v.range, newText: newName }));
}
