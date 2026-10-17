import type { TfBuild } from "../tfBuild";
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
  /** In place of the rule's own severity, for a variant that is milder or worse. */
  severity?: Severity;
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

/** What a rule may need to know about the rest of the file. */
export interface FileFacts {
  /** Which tf runs the file (tfBuild.ts). */
  tfBuild: TfBuild;
  /** Names the file reads as a macro's value, `${name}`, lower case: such a macro holds a value, not commands. */
  valueMacros: ReadonlySet<string>;
  /**
   * The macros the file's commands define, lower case: each `/def` tf reads, at the top level and
   * before any line that aborts the load, not a comment or a /def inside another command's text.
   */
  macros: ReadonlySet<string>;
}

export interface EntryRule {
  /** The diagnostic code; src/rules/table.ts puts each one in a rule section. */
  id: string;
  severity: Severity;
  scope: "entry";
  check(entry: LogicalEntry, file: FileFacts): EntryMatch[];
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
