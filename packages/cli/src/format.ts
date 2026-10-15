import * as path from "node:path";
import type { Position, TfDiagnostic } from "@tfscript/core/diagnostics";
import { codeHref, findCode } from "@tfscript/core/rules/table";
import type { CheckedFile } from "./check";

/** The JSON output's shape; documented in the README. Bump `version` on any change that isn't an added field. */
export const JSON_VERSION = 1;

export interface JsonPosition {
  /** 1-based. */
  line: number;
  /** 1-based, in UTF-16 code units (as LSP counts). */
  column: number;
  /** 0-based, in UTF-16 code units from the start of the file. */
  offset: number;
}

export interface JsonRange {
  start: JsonPosition;
  end: JsonPosition;
}

export interface JsonDiagnostic {
  file: string;
  range: JsonRange;
  severity: TfDiagnostic["severity"];
  code: string;
  message: string;
  codeDescription: { href: string } | null;
  /** The titles of the quick fixes an editor offers for it, likelier first. */
  fixes: string[];
  related: { range: JsonRange; message: string }[];
}

export interface Summary {
  files: number;
  errors: number;
  warnings: number;
  information: number;
}

export interface JsonReport {
  version: number;
  files: string[];
  diagnostics: JsonDiagnostic[];
  summary: Summary;
}

/** How a file is named in the output: relative to the current folder when inside it, else absolute. */
export function displayPath(file: string, cwd: string): string {
  const rel = path.relative(cwd, file);
  return rel === "" || rel.startsWith("..") || path.isAbsolute(rel) ? file : rel;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

export function summarize(files: CheckedFile[]): Summary {
  const all = files.flatMap((f) => f.diagnostics);
  const count = (s: TfDiagnostic["severity"]) => all.filter((d) => d.severity === s).length;
  return { files: files.length, errors: count("error"), warnings: count("warning"), information: count("information") };
}

/** One line per diagnostic: `path:line:col: severity code: message`, line and column 1-based. */
export function formatHuman(files: CheckedFile[], cwd: string): string {
  return files
    .flatMap((f) =>
      f.diagnostics.map(
        (d) => `${displayPath(f.file, cwd)}:${d.range.start.line + 1}:${d.range.start.character + 1}: ${d.severity} ${d.code}: ${d.message}\n`,
      ),
    )
    .join("");
}

export function toJsonReport(files: CheckedFile[], cwd: string): JsonReport {
  const diagnostics = files.flatMap((f) => {
    const starts = lineStarts(f.text);
    const position = (p: Position): JsonPosition => ({ line: p.line + 1, column: p.character + 1, offset: (starts[p.line] ?? f.text.length) + p.character });
    const range = (r: TfDiagnostic["range"]): JsonRange => ({ start: position(r.start), end: position(r.end) });
    const file = displayPath(f.file, cwd);
    return f.diagnostics.map(
      (d): JsonDiagnostic => ({
        file,
        range: range(d.range),
        severity: d.severity,
        code: d.code,
        message: d.message,
        codeDescription: findCode(d.code) ? { href: codeHref(d.code) } : null,
        fixes: [d.fix, d.alternative].flatMap((fix) => (fix ? [fix.title] : [])),
        related: (d.related ?? []).map((r) => ({ range: range(r.range), message: r.message })),
      }),
    );
  });
  return { version: JSON_VERSION, files: files.map((f) => displayPath(f.file, cwd)), diagnostics, summary: summarize(files) };
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The line after the diagnostics, on stderr: what was found in how many files. */
export function formatSummary(s: Summary): string {
  const found = [plural(s.errors, "error", "errors"), plural(s.warnings, "warning", "warnings"), plural(s.information, "note", "notes")];
  return `${found.join(", ")} in ${plural(s.files, "file", "files")}.\n`;
}
