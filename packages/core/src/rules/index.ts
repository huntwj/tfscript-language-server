import { missingContinuation } from "./missingContinuation";
import { notSubstitutedHere } from "./notSubstitutedHere";
import { keywordMidStatement } from "./keywordMidStatement";
import { conditionListText } from "./conditionListText";
import { keywordNeedsSpace } from "./keywordNeedsSpace";
import { substitutionInExpression } from "./substitutionInExpression";
import { indentedLineAfterCommand } from "./indentedLineAfterCommand";
import { backslashNotLast } from "./backslashNotLast";
import { substitutionSyntax } from "./substitutionSyntax";
import { invalidMacroName } from "./invalidMacroName";
import { blockStructure } from "./blockStructure";
import { expressionSyntax } from "./expressionSyntax";
import { emptyStatement } from "./emptyStatement";
import { nestingTooDeep } from "./nestingTooDeep";
import { incompleteContinuation } from "./incompleteContinuation";
import { bodyContinuesWithoutBackslash } from "./bodyContinuesWithoutBackslash";
import { LINT_RULES } from "./lint";
import type { Rule } from "./types";

// notACommand.ts is deliberately not in this list: it doesn't just report a
// diagnostic, it also decides where the other rules' view of the file gets truncated (tf
// never reads past the line it aborts on), so diagnostics.ts drives it separately.
export const RULES: Rule[] = [
  missingContinuation,
  notSubstitutedHere,
  keywordMidStatement,
  substitutionInExpression,
  indentedLineAfterCommand,
  backslashNotLast,
  substitutionSyntax,
  invalidMacroName,
  blockStructure,
  conditionListText,
  keywordNeedsSpace,
  expressionSyntax,
  emptyStatement,
  nestingTooDeep,
  incompleteContinuation,
  bodyContinuesWithoutBackslash,
  ...LINT_RULES,
];

export type { EntryRule, FileRule, Rule, EntryMatch, LineMatch, LineSpan, Severity } from "./types";
