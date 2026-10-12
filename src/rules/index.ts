import { ifMultilineTopLevel } from "./ifMultilineTopLevel";
import { percentVarTopLevel } from "./percentVarTopLevel";
import { letSwallowsEndif } from "./letSwallowsEndif";
import { dollarBracketInIf } from "./dollarBracketInIf";
import type { Rule } from "./types";

export const RULES: Rule[] = [
  ifMultilineTopLevel,
  percentVarTopLevel,
  letSwallowsEndif,
  dollarBracketInIf,
];

export type { Rule, RuleMatch, Severity } from "./types";
