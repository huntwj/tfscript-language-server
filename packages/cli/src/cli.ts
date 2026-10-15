#!/usr/bin/env node
import { EXIT_USAGE, main } from "./main";

try {
  process.exitCode = main(process.argv.slice(2), {
    cwd: process.cwd(),
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
  });
} catch (error) {
  // Not 1, which would read as "errors found".
  process.stderr.write(`tfscript: the check failed with an internal error, which is a bug: please report it with this output.\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = EXIT_USAGE;
}
