import type { LogicalEntry } from "../logicalEntries";

export type Severity = "error" | "warning" | "information";

/** Offset range within `entry.text`, used by entry-scoped rules. */
export interface EntryMatch {
  start: number;
  end: number;
  message: string;
}

/** A direct document position, used by file-scoped rules (they see raw lines, not offsets). */
export interface LineMatch {
  line: number;
  startChar: number;
  endChar: number;
  message: string;
}

export interface EntryRule {
  /** Matches the case-id style used in scripting.md and tests/tfscript/cases/. */
  id: string;
  severity: Severity;
  scope: "entry";
  check(entry: LogicalEntry): EntryMatch[];
}

/**
 * A rule that needs the whole file's line sequence rather than one command at a time (e.g. it
 * tracks state across lines, like tf's own load_file() does for continuation and "possibly
 * missing trailing \" warnings).
 */
export interface FileRule {
  id: string;
  severity: Severity;
  scope: "file";
  check(text: string): LineMatch[];
}

export type Rule = EntryRule | FileRule;
