import { splitLogicalEntries } from "./logicalEntries";
import { RULES, type Severity } from "./rules";
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
  // tf still reads every physical line of the aborting entry itself before it gives up (the
  // abort check only runs once the whole, possibly backslash-joined, command is assembled),
  // so the cut is after that entry's last line (endLine), not its first.
  const abort = findAbortEntry(entries);
  const usableEntries = abort ? entries.slice(0, abort.entryIndex) : entries;
  const readableLineCount = abort ? (entries[abort.entryIndex]?.endLine ?? abort.line) + 1 : undefined;
  const textForFileRules =
    readableLineCount !== undefined
      ? text.split(/\r\n|\r|\n/).slice(0, readableLineCount).join("\n")
      : text;

  for (const rule of RULES) {
    if (rule.scope === "entry") {
      for (const entry of usableEntries) {
        for (const match of rule.check(entry)) {
          if (match.end <= match.start) continue;
          const start = entry.offsetMap[match.start];
          // offsetMap has one entry per character; match.end is exclusive, so the last
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
    } else {
      for (const match of rule.check(textForFileRules)) {
        diagnostics.push({
          range: {
            start: { line: match.line, character: match.startChar },
            end: { line: match.line, character: match.endChar },
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

  return diagnostics;
}
