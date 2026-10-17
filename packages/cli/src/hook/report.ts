import type { JsonDiagnostic, JsonReport } from "../format";
import { plural } from "../format";

/** How much of a report the hook passes on. */
export interface ReportOptions {
  /** How many warnings are listed; the rest are counted. */
  warningLimit: number;
  /** Whether information notes are listed (and counted). */
  showInformation: boolean;
  /**
   * The most characters the text may have. Claude Code's documented cap is 10,000 characters for
   * a hook's additionalContext (and its plain stdout): a longer one is moved into a file Claude
   * isn't asked to read. The docs don't give a cap for a block's reason, so the same budget is
   * kept there too, to be safe. The list stops short of it and says how many it left out.
   */
  budget?: number;
  /** The command that lists everything, named where some are left out. */
  fullCommand?: string;
}

export const DEFAULT_WARNING_LIMIT = 20;
export const DEFAULT_BUDGET = 9000;

/** What the hook tells Claude about one check. */
export interface ShapedReport {
  /** Whether there are errors: the hook reports them as a block on the edit, the rest as context. */
  errors: number;
  text: string;
}

/** One diagnostic's line. `label` names the file as the first line does (the hook checks one file). */
function line(d: JsonDiagnostic, label: string): string {
  const where = `${label}:${d.range.start.line}:${d.range.start.column}`;
  const fixes = d.fixes.length === 0 ? "" : ` Quick fix${d.fixes.length === 1 ? "" : "es"} an editor offers: ${d.fixes.join("; ")}.`;
  return `- ${where}: ${d.severity} ${d.code}: ${d.message}${fixes}`;
}

function counts(errors: number, warnings: number, information: number): string {
  const parts = [errors > 0 ? plural(errors, "error", "errors") : "", warnings > 0 ? plural(warnings, "warning", "warnings") : "", information > 0 ? plural(information, "information note", "information notes") : ""].filter(Boolean);
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The text the hook gives Claude for `report` (tfscript check --format json on the file it
 * edited), or undefined when there is nothing worth saying: every error, the first
 * `warningLimit` warnings, and information notes only if asked for, each on a line with its
 * place, code, message and the titles of its fixes. The hook never applies a fix; the titles
 * let Claude make the change itself.
 */
export function shapeReport(report: JsonReport, label: string, options: ReportOptions): ShapedReport | undefined {
  const errors = report.diagnostics.filter((d) => d.severity === "error");
  const warnings = report.diagnostics.filter((d) => d.severity === "warning");
  const information = options.showInformation ? report.diagnostics.filter((d) => d.severity === "information") : [];
  if (errors.length + warnings.length + information.length === 0) return undefined;

  const chosen = [...errors, ...warnings.slice(0, options.warningLimit), ...information];
  const budget = options.budget ?? DEFAULT_BUDGET;
  const head = `tfscript found ${counts(errors.length, warnings.length, information.length)} in ${label}:`;
  const lines = [head];
  let length = head.length;
  let listed = 0;
  // Room for the closing line.
  const reserve = 300;
  for (const d of chosen) {
    const text = line(d, label);
    if (length + 1 + text.length > budget - reserve) break;
    lines.push(text);
    length += 1 + text.length;
    listed++;
  }
  const left = errors.length + warnings.length + information.length - listed;
  if (left > 0) {
    const run = options.fullCommand === undefined ? "" : `; to see them all, run ${options.fullCommand}`;
    lines.push(`- ${plural(left, "more is", "more are")} not listed${run}.`);
  }
  return { errors: errors.length, text: lines.join("\n") };
}
