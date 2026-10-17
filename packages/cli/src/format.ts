import * as path from "node:path";
import type { Position, TfDiagnostic } from "@tfscript/core/diagnostics";
import { codeHref, findCode } from "@tfscript/core/rules/table";
import type { CheckedFile } from "./check";
import { forCommandLine } from "./settingNames";

/** How a message names the settings it mentions (forCommandLine() unless told otherwise). */
export type Namer = (text: string) => string;

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
  /** Core's message, with any tfscript.* setting it names put as the option (forCommandLine()), or as the tfscript.json key with --setting-names config. */
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
  /** The paths that couldn't be checked, each a sentence saying why and what to do (also on stderr). */
  problems: string[];
  summary: Summary;
}

/** How a file is named in the output: relative to the current folder when inside it, else absolute. */
export function displayPath(file: string, cwd: string): string {
  const rel = path.relative(cwd, file);
  // A name of its own that starts with .. (..x.tf) is still inside; only a .. segment leaves it.
  const outside = rel === ".." || rel.startsWith(`..${path.sep}`) || rel.startsWith("../");
  return rel === "" || outside || path.isAbsolute(rel) ? file : rel;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The files by name (as the output names them), and each file's diagnostics by line, then
 * column; diagnostics at the same place keep core's order. Both formats print in this order.
 */
export function inOrder(files: CheckedFile[], cwd: string): CheckedFile[] {
  return files
    .map((f) => ({ f, name: displayPath(f.file, cwd) }))
    .sort((a, b) => compare(a.name, b.name))
    .map(({ f }) => ({
      ...f,
      diagnostics: [...f.diagnostics].sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character),
    }));
}

export function summarize(files: CheckedFile[]): Summary {
  const all = files.flatMap((f) => f.diagnostics);
  const count = (s: TfDiagnostic["severity"]) => all.filter((d) => d.severity === s).length;
  return { files: files.length, errors: count("error"), warnings: count("warning"), information: count("information") };
}

/** One line per diagnostic, in order (inOrder()): `path:line:col: severity code: message`, line and column 1-based. */
export function formatHuman(files: CheckedFile[], cwd: string, names: Namer = forCommandLine): string {
  return inOrder(files, cwd)
    .flatMap((f) =>
      f.diagnostics.map(
        (d) => `${displayPath(f.file, cwd)}:${d.range.start.line + 1}:${d.range.start.character + 1}: ${d.severity} ${d.code}: ${names(d.message)}\n`,
      ),
    )
    .join("");
}

/** The JSON report, in the same order as the human format (inOrder()). */
export function toJsonReport(unordered: CheckedFile[], cwd: string, problems: string[] = [], names: Namer = forCommandLine): JsonReport {
  const files = inOrder(unordered, cwd);
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
        message: names(d.message),
        codeDescription: findCode(d.code) ? { href: codeHref(d.code) } : null,
        fixes: [d.fix, d.alternative].flatMap((fix) => (fix ? [fix.title] : [])),
        related: (d.related ?? []).map((r) => ({ range: range(r.range), message: names(r.message) })),
      }),
    );
  });
  return { version: JSON_VERSION, files: files.map((f) => displayPath(f.file, cwd)), diagnostics, problems, summary: summarize(files) };
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The line after the diagnostics, on stderr: what was found in how many files. */
export function formatSummary(s: Summary): string {
  const found = [plural(s.errors, "error", "errors"), plural(s.warnings, "warning", "warnings"), plural(s.information, "note", "notes")];
  return `${found.join(", ")} in ${plural(s.files, "file", "files")}.\n`;
}
