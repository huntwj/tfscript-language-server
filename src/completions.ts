import { CompletionItem, CompletionItemKind, InsertTextFormat } from "vscode-languageserver/node";
import { ALL_COMMANDS, RESERVED_MACRO_NAMES, type CommandSource } from "./data/commands";
import { FUNCTIONS } from "./data/functions.generated";
import { SELECTORS } from "./data/selectors";
import type { TfVariable } from "./data/types";
import { SPECIAL_VARIABLES } from "./data/variables.generated";
import { cursorContext, textBefore } from "./expressions";
import { functionSynopses } from "./functionSynopses";
import { isCommentLine, splitRawLines } from "./logicalEntries";
import type { NavContext } from "./navigation";
import { getDocumentSymbols, type Position } from "./symbols";

const SOURCE_DETAIL: Record<CommandSource, string> = {
  keyword: "tf control-flow keyword",
  builtin: "tf built-in command",
  stdlib: "stdlib.tf macro (always loaded)",
};

const COMMAND_ITEMS: CompletionItem[] = ALL_COMMANDS.map((c) => ({
  label: c.name.toLowerCase(),
  kind: CompletionItemKind.Function,
  detail: SOURCE_DETAIL[c.source],
}));

// The `/` must start the line or follow whitespace, `(`, or `;` (as in a `%;` command
// separator) — not just any `/`, or `/set d=/script` and `/load %{d}/file` would offer every
// command name while typing an ordinary path-like value. This does mean a command typed as a
// /def's inline value (`/def x=/echo`) won't get completions; that's an acceptable trade-off.
const TRAILING_COMMAND_WORD = /(?:^|[\s;(])\/(\w*)$/;

/**
 * Command-name completion: tf commands are conventionally typed lowercase (every example in
 * stdlib.tf, the WoTMUD scripts and the proven test cases is lowercase), even though the C
 * tables store them uppercase — see src/data/commands.ts.
 *
 * `linePrefix` is the current line's text up to the cursor. Returns completions only when the
 * cursor sits right after a `/` and optional partial word (so typing in the middle of an
 * expression, a string, or after a finished command doesn't pop up every tf command).
 */
export function getCommandCompletions(linePrefix: string): CompletionItem[] | null {
  return TRAILING_COMMAND_WORD.test(linePrefix) ? COMMAND_ITEMS : null;
}

function variableDetail(v: TfVariable): string {
  const parts: string[] = [`tf ${v.type} variable`];
  if (v.default !== undefined) parts.push(`default ${v.default === "" ? '""' : v.default}`);
  if (v.values && v.type !== "flag") parts.push(v.values.join(" | "));
  if (v.requires) parts.push(`needs ${v.requires}`);
  return parts.join(", ");
}

const FUNCTION_ITEMS: CompletionItem[] = FUNCTIONS.map((f) => ({
  label: f.name,
  kind: CompletionItemKind.Function,
  detail: functionSynopses(f).join("  |  "),
  ...(f.requires ? { documentation: `Only in a tf built with ${f.requires}.` } : {}),
  insertText: f.max === 0 ? `${f.name}()` : `${f.name}($0)`,
  insertTextFormat: InsertTextFormat.Snippet,
  // Open the signature popup inside the new parentheses.
  ...(f.max === 0 ? {} : { command: { title: "", command: "editor.action.triggerParameterHints" } }),
}));

const SPECIAL_VARIABLE_ITEMS: CompletionItem[] = SPECIAL_VARIABLES.map((v) => ({
  label: v.name,
  kind: CompletionItemKind.Variable,
  detail: variableDetail(v),
}));

const SELECTOR_ITEMS: CompletionItem[] = SELECTORS.map((s, i) => ({
  label: s.label,
  kind: CompletionItemKind.Constant,
  detail: s.detail,
  // Before the variables, in the table's order.
  sortText: `0${String(i).padStart(2, "0")}`,
}));

const ASSIGN_RE = /(?:^|[\s;|(])\/@?(?:set|let|setenv)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
const EXPR_ASSIGN_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:=/g;

/** Variables a script sets — `/set`, `/let`, `/setenv`, `name := ...` — that tf doesn't define itself. */
function scriptVariables(texts: string[]): Map<string, string> {
  const special = new Set(SPECIAL_VARIABLES.map((v) => v.name));
  const found = new Map<string, string>();
  for (const text of texts) {
    for (const line of splitRawLines(text)) {
      if (isCommentLine(line)) continue;
      for (const m of [...line.matchAll(ASSIGN_RE), ...line.matchAll(EXPR_ASSIGN_RE)]) {
        const name = m[1] as string;
        if (!special.has(name) && !found.has(name)) found.set(name, /:=/.test(m[0]) ? "assigned in an expression" : `set with ${m[0].trim().split(/\s+/)[0]}`);
      }
    }
  }
  return found;
}

function scriptVariableItems(text: string, ctx: NavContext | undefined): CompletionItem[] {
  return [...scriptVariables([text, ...(ctx?.files ?? []).map((f) => f.text)])].map(([name, how]) => ({
    label: name,
    kind: CompletionItemKind.Variable,
    detail: `script variable (${how})`,
  }));
}

/** Macros a file can call: its own `/def`s and those on its load path. */
function macroItems(text: string, ctx: NavContext | undefined, asFunction: boolean): CompletionItem[] {
  const seen = new Set<string>();
  const items: CompletionItem[] = [];
  const add = (name: string, detail: string): void => {
    const key = name.toLowerCase();
    if (seen.has(key) || RESERVED_MACRO_NAMES.has(key) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
    seen.add(key);
    items.push({
      label: name,
      kind: asFunction ? CompletionItemKind.Method : CompletionItemKind.Function,
      detail,
      ...(asFunction ? { insertText: `${name}($0)`, insertTextFormat: InsertTextFormat.Snippet } : {}),
    });
  };
  for (const s of getDocumentSymbols(text)) if (s.kind === "def") add(s.name, "macro in this file");
  for (const m of ctx?.macros ?? []) if (m.loaded) add(m.symbol.name, `macro in ${m.label}`);
  return items;
}

/**
 * Completion for the cursor's context (see expressions.ts): command names after `/` (tf's and
 * your macros), `%{` selectors and variables, variable names after `/set` and friends, the
 * values an enum or flag variable takes after `/set name=`, and functions and variables in an
 * expression. Nothing inside comments or string literals.
 */
export function getCompletions(text: string, pos: Position, ctx?: NavContext): CompletionItem[] {
  const before = textBefore(text, pos);
  if (before === undefined) return [];
  const context = cursorContext(before);
  switch (context.kind) {
    case "command": {
      const tf = new Set(COMMAND_ITEMS.map((i) => i.label));
      return [...COMMAND_ITEMS, ...macroItems(text, ctx, false).filter((i) => !tf.has(i.label.toLowerCase()))];
    }
    case "substitution":
      return context.braced || context.partial === ""
        ? [...SELECTOR_ITEMS, ...SPECIAL_VARIABLE_ITEMS, ...scriptVariableItems(text, ctx)]
        : [...SPECIAL_VARIABLE_ITEMS, ...scriptVariableItems(text, ctx)];
    case "variable-name":
      return [...SPECIAL_VARIABLE_ITEMS, ...scriptVariableItems(text, ctx)];
    case "variable-value": {
      const v = SPECIAL_VARIABLES.find((s) => s.name === context.variable);
      return (v?.values ?? []).map((value, i) => ({
        label: value,
        kind: CompletionItemKind.EnumMember,
        detail: `${v?.name} = ${value} (or ${i})${value === v?.default ? ", the default" : ""}`,
      }));
    }
    case "expression": {
      if (context.inNumber) return [];
      const fns = new Set(FUNCTIONS.map((f) => f.name));
      return [
        ...FUNCTION_ITEMS,
        ...SPECIAL_VARIABLE_ITEMS,
        ...scriptVariableItems(text, ctx),
        ...macroItems(text, ctx, true).filter((i) => !fns.has(i.label)),
      ];
    }
    default:
      return [];
  }
}

