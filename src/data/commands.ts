import { BUILTIN_COMMANDS } from "./builtinCommands.generated";
import { KEYWORD_COMMANDS } from "./keywordCommands.generated";
import { STDLIB_COMMANDS } from "./stdlibCommands.generated";

export type CommandSource = "keyword" | "builtin" | "stdlib";

export interface CommandInfo {
  name: string;
  /**
   * - "keyword": compiled specially by the bytecode compiler (control flow — /if, /while, ...).
   * - "builtin": a C command handler (src/cmdlist.h).
   * - "stdlib": a library macro from lib/tf/stdlib.tf — not C code, but always available,
   *   since stdlib.tf loads automatically on startup. Many everyday commands are this, not
   *   "builtin" — /echo, /for and /addworld all are (found 2026-10-11).
   */
  source: CommandSource;
}

// Keyed by lowercase name: completions.ts lowercases every label regardless of how the
// source table cased it, so two tables disagreeing only on case would otherwise still
// produce two distinct completion items for what is, in practice, the same command.
function dedupe(infos: CommandInfo[]): CommandInfo[] {
  const seen = new Map<string, CommandInfo>();
  for (const info of infos) {
    const key = info.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, info);
  }
  return [...seen.values()];
}

/**
 * Every top-level command name this engine knows about, from the three sources
 * scripts/extract-command-tables.js pulls from tinyfugue. A handful of names (EXIT, LET,
 * SET, SETENV) appear in both the keyword and builtin tables; "keyword" wins there, since
 * the bytecode compiler sees them first.
 */
export const ALL_COMMANDS: readonly CommandInfo[] = dedupe([
  ...KEYWORD_COMMANDS.map((name): CommandInfo => ({ name, source: "keyword" })),
  ...BUILTIN_COMMANDS.map((name): CommandInfo => ({ name, source: "builtin" })),
  ...STDLIB_COMMANDS.map((name): CommandInfo => ({ name, source: "stdlib" })),
]);
