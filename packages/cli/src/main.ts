import { parseArgs, UsageError } from "./args";
import { check, nodeHost, type CheckHost } from "./check";
import { formatHuman, formatSummary, plural, summarize, toJsonReport } from "./format";
import { NAMERS } from "./settingNames";
import { USAGE, VERSION } from "./usage";

/** No errors (and no more warnings than --max-warnings allows). */
export const EXIT_OK = 0;
/** Errors found, or more warnings than --max-warnings allows. */
export const EXIT_PROBLEMS = 1;
/** The command line was wrong, or a file or folder couldn't be read. */
export const EXIT_USAGE = 2;

export interface Io {
  cwd: string;
  out(text: string): void;
  err(text: string): void;
}

/** Runs the command line `argv` (without node and the script) and returns the exit status. */
export function main(argv: readonly string[], io: Io, host: CheckHost = nodeHost()): number {
  let command;
  try {
    command = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.err(`tfscript: ${error.message}\n`);
    return EXIT_USAGE;
  }
  if (command.kind === "help") {
    io.out(USAGE);
    return EXIT_OK;
  }
  if (command.kind === "version") {
    io.out(`${VERSION}\n`);
    return EXIT_OK;
  }

  const result = check(
    {
      paths: command.paths,
      settings: command.settings,
      cwd: io.cwd,
      ...(command.root === undefined ? {} : { root: command.root }),
      ...(command.config === undefined ? {} : { config: command.config }),
    },
    host,
  );
  const names = NAMERS[command.settingNames];
  if (command.format === "json") io.out(`${JSON.stringify(toJsonReport(result.files, io.cwd, result.problems, names), null, 2)}\n`);
  else io.out(formatHuman(result.files, io.cwd, names));
  for (const problem of result.problems) io.err(`tfscript: ${problem}\n`);

  const summary = summarize(result.files);
  if (command.format === "human" && summary.errors + summary.warnings + summary.information > 0) io.err(formatSummary(summary));
  if (result.problems.length > 0) return EXIT_USAGE;
  if (summary.errors > 0) return EXIT_PROBLEMS;
  if (command.maxWarnings !== undefined && summary.warnings > command.maxWarnings) {
    io.err(`tfscript: ${plural(summary.warnings, "warning is", "warnings are")} more than --max-warnings ${command.maxWarnings} allows: fix some, or raise the limit.\n`);
    return EXIT_PROBLEMS;
  }
  return EXIT_OK;
}
