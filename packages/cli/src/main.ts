import { parseArgs, UsageError } from "./args";
import { check, nodeHost, type CheckHost } from "./check";
import { displayPath, formatHuman, formatSummary, plural, summarize, toJsonReport } from "./format";
import { formatFiles, writeFileInPlace, type WriteFile } from "./formatFiles";
import { NAMERS } from "./settingNames";
import { USAGE, VERSION } from "./usage";

/** No errors (and no more warnings than --max-warnings allows); for format, every file formatted. */
export const EXIT_OK = 0;
/** Errors found, or more warnings than --max-warnings allows; for format --check, a file that would change. */
export const EXIT_PROBLEMS = 1;
/** The command line was wrong, or a file or folder couldn't be read. */
export const EXIT_USAGE = 2;

export interface Io {
  cwd: string;
  out(text: string): void;
  err(text: string): void;
}

/** Runs the command line `argv` (without node and the script) and returns the exit status. */
export function main(argv: readonly string[], io: Io, host: CheckHost = nodeHost(), write: WriteFile = (f, t) => writeFileInPlace(f, t)): number {
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

  if (command.kind === "format") return format(command.paths, command.check, io, host, write);

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

/**
 * `tfscript format`: each changed file's name on stdout (with --check, each that would change),
 * then a count on stderr.
 */
function format(paths: string[], checkOnly: boolean, io: Io, host: CheckHost, write: WriteFile): number {
  const outcome = formatFiles({ paths, check: checkOnly, cwd: io.cwd }, host, write);
  const names = (files: string[]) => files.map((f) => displayPath(f, io.cwd)).sort();
  for (const name of names(outcome.changed)) io.out(`${name}\n`);
  for (const name of names(outcome.crlf)) {
    io.err(`tfscript: ${name} has CRLF line endings, where tf doesn't join a line ending in \\ to the next, so it was left as it is: convert it to LF to format it.\n`);
  }
  for (const name of names(outcome.notUtf8)) {
    io.err(`tfscript: ${name} isn't UTF-8, so it can't be formatted or checked, as formatting it would lose the bytes that aren't: convert it to UTF-8.\n`);
  }
  for (const name of names(outcome.replacement)) {
    io.err(`tfscript: ${name} holds U+FFFD, the mark of a byte that wasn't UTF-8, so it can't be formatted or checked: put back the character it stood for.\n`);
  }
  for (const problem of outcome.problems) io.err(`tfscript: ${problem}\n`);
  const of = `${outcome.changed.length} of ${plural(outcome.files.length, "file", "files")}`;
  if (checkOnly && outcome.changed.length > 0) io.err(`${of} would be reformatted: run tfscript format on ${outcome.changed.length === 1 ? "it" : "them"}.\n`);
  else if (!checkOnly && outcome.changed.length > 0) io.err(`Reformatted ${of}.\n`);
  // A file that couldn't be looked at isn't known to be formatted, so --check can't pass it.
  if (outcome.problems.length > 0 || outcome.notUtf8.length > 0 || outcome.replacement.length > 0) return EXIT_USAGE;
  return checkOnly && outcome.changed.length > 0 ? EXIT_PROBLEMS : EXIT_OK;
}
