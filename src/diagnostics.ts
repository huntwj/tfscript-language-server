import { splitLogicalEntries } from "./logicalEntries";
import { RULES, type Severity } from "./rules";
import { indentedLineAfterCommand } from "./rules/indentedLineAfterCommand";
import { trailingSpaceAfterBackslash } from "./rules/trailingSpaceAfterBackslash";
import { findAbortEntry } from "./rules/bareLineAfterCommand";

export interface Position {
  line: number;
  character: number;
}

export interface TfDiagnostic {
  range: { start: Position; end: Position };
  message: string;
  code: string;
  severity: Severity;
}

export function getDiagnostics(text: string): TfDiagnostic[] {
  const entries = splitLogicalEntries(text);
  const diagnostics: TfDiagnostic[] = [];

  // A bare (non-blank, non-comment, non-"/") line aborts tf's load of the rest of the file.
  // Nothing after that point ever runs, so the other rules only look at what's before it.
  const abort = findAbortEntry(entries);
  const usableEntries = abort ? entries.slice(0, abort.entryIndex) : entries;

  for (const entry of usableEntries) {
    for (const rule of RULES) {
      for (const match of rule.check(entry)) {
        if (match.end <= match.start) continue;
        const start = entry.offsetMap[match.start];
        // offsetMap has one entry per character; the match's end is exclusive, so the last
        // included character is at match.end - 1.
        const lastChar = entry.offsetMap[match.end - 1];
        if (!start || !lastChar) continue;

        diagnostics.push({
          range: {
            start: { line: start.line, character: start.character },
            end: { line: lastChar.line, character: lastChar.character + 1 },
          },
          message: match.message,
          code: rule.id,
          severity: rule.severity,
        });
      }
    }
  }

  if (abort) {
    diagnostics.push({
      range: {
        start: { line: abort.line, character: abort.startChar },
        end: { line: abort.line, character: abort.endChar },
      },
      message: abort.message,
      code: "bare-line-after-command",
      severity: "error",
    });
  }

  // The two line-by-line checks below read raw physical lines directly, so they need the
  // same "nothing after the abort line was read" truncation applied by hand.
  const textForLineRules = abort
    ? text.split(/\r\n|\r|\n/).slice(0, abort.line).join("\n")
    : text;

  for (const match of indentedLineAfterCommand(textForLineRules)) {
    diagnostics.push({
      range: {
        start: { line: match.line, character: match.startChar },
        end: { line: match.line, character: match.endChar },
      },
      message: match.message,
      code: "indented-line-after-command",
      severity: "warning",
    });
  }

  for (const match of trailingSpaceAfterBackslash(textForLineRules)) {
    diagnostics.push({
      range: {
        start: { line: match.line, character: match.startChar },
        end: { line: match.line, character: match.endChar },
      },
      message: match.message,
      code: "trailing-space-after-backslash",
      severity: "warning",
    });
  }

  return diagnostics;
}
