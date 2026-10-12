import { CompletionItem, CompletionItemKind } from "vscode-languageserver/node";
import { ALL_COMMANDS, type CommandSource } from "./data/commands";

const SOURCE_DETAIL: Record<CommandSource, string> = {
  keyword: "tf control-flow keyword",
  builtin: "tf built-in command",
  stdlib: "stdlib.tf macro (always loaded)",
};

const ITEMS: CompletionItem[] = ALL_COMMANDS.map((c) => ({
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
  return TRAILING_COMMAND_WORD.test(linePrefix) ? ITEMS : null;
}
