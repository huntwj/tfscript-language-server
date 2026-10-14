import { missingContinuation } from "./missingContinuation";
import { notSubstitutedHere } from "./notSubstitutedHere";
import { letSwallowsEndif } from "./letSwallowsEndif";
import { dollarBracketInIf } from "./dollarBracketInIf";
import { indentedLineAfterCommand } from "./indentedLineAfterCommand";
import { backslashNotLast } from "./backslashNotLast";
import { substitutionSyntax } from "./substitutionSyntax";
import { reservedMacroName } from "./reservedMacroName";
import { blockStructure } from "./blockStructure";
import { expressionSyntax } from "./expressionSyntax";
import { separatorSendsBlankLine } from "./separatorSendsBlankLine";
import { nestingTooDeep } from "./nestingTooDeep";
import { incompleteContinuation } from "./incompleteContinuation";
import { bodyContinuesWithoutBackslash } from "./bodyContinuesWithoutBackslash";
import type { Rule } from "./types";

// notACommand.ts is deliberately not in this list: it doesn't just report a
// diagnostic, it also decides where the other rules' view of the file gets truncated (tf
// never reads past the line it aborts on), so diagnostics.ts drives it separately.
export const RULES: Rule[] = [
  missingContinuation,
  notSubstitutedHere,
  letSwallowsEndif,
  dollarBracketInIf,
  indentedLineAfterCommand,
  backslashNotLast,
  substitutionSyntax,
  reservedMacroName,
  blockStructure,
  expressionSyntax,
  separatorSendsBlankLine,
  nestingTooDeep,
  incompleteContinuation,
  bodyContinuesWithoutBackslash,
];

export type { EntryRule, FileRule, Rule, EntryMatch, LineMatch, LineSpan, Severity } from "./types";
