import type { LogicalEntry } from "../logicalEntries";
import type { IssueDetail } from "../structure";

export type Severity = "error" | "warning" | "information";

/**
 * Offset range within `entry.text`, used by entry-scoped rules. The optional details (a label for
 * the span, a hover explanation, related spans and a fix) use offsets into `entry.text` too.
 */
export interface EntryMatch extends IssueDetail {
  start: number;
  end: number;
}

/** A span of one physical line. */
export interface LineSpan {
  line: number;
  startChar: number;
  endChar: number;
}

/**
 * A direct document position, used by file-scoped rules (they see raw lines, not offsets). The
 * optional details mirror EntryMatch's, with line positions in place of offsets.
 */
export interface LineMatch extends LineSpan {
  message: string;
  label?: string;
  explanation?: string;
  related?: (LineSpan & { message: string })[];
  fix?: { title: string; edits: (LineSpan & { newText: string })[] };
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
