import { splitLogicalEntries } from "./logicalEntries";
import { RULES, type Severity } from "./rules";

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

  for (const entry of entries) {
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

  return diagnostics;
}
