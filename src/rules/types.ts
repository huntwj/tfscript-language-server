import type { LogicalEntry } from "../logicalEntries";

export type Severity = "error" | "warning";

export interface RuleMatch {
  /** Offset range within `entry.text`, not the original document. */
  start: number;
  end: number;
  message: string;
}

export interface Rule {
  /** Matches the case-id style used in scripting.md and tests/tfscript/cases/. */
  id: string;
  severity: Severity;
  check(entry: LogicalEntry): RuleMatch[];
}
