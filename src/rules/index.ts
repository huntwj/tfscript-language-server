import { ifMultilineTopLevel } from "./ifMultilineTopLevel";
import { percentVarTopLevel } from "./percentVarTopLevel";
import { letSwallowsEndif } from "./letSwallowsEndif";
import { dollarBracketInIf } from "./dollarBracketInIf";
import { indentedLineAfterCommand } from "./indentedLineAfterCommand";
import { trailingSpaceAfterBackslash } from "./trailingSpaceAfterBackslash";
import type { Rule } from "./types";

// bareLineAfterCommand.ts is deliberately not in this list: it doesn't just report a
// diagnostic, it also decides where the other rules' view of the file gets truncated (tf
// never reads past the line it aborts on), so diagnostics.ts drives it separately.
export const RULES: Rule[] = [
  ifMultilineTopLevel,
  percentVarTopLevel,
  letSwallowsEndif,
  dollarBracketInIf,
  indentedLineAfterCommand,
  trailingSpaceAfterBackslash,
];

export type { EntryRule, FileRule, Rule, EntryMatch, LineMatch, Severity } from "./types";
