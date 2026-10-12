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

const TRAILING_COMMAND_WORD = /\/(\w*)$/;

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
