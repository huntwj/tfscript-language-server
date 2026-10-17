import * as path from "node:path";
import { applyFormatEdits, formatDocument } from "@tfscript/core/formatting";
import { expandPaths, type CheckHost } from "./check";

export interface FormatRequest {
  /** Files and folders to format, absolute or relative to `cwd`. */
  paths: string[];
  /** Only say which files would change; write nothing. */
  check: boolean;
  cwd: string;
}

export interface FormatOutcome {
  /** Every file looked at, absolute, as it was named. */
  files: string[];
  /** The files formatting changes (or, with `check`, would change). */
  changed: string[];
  /** Files left as they are because of their CRLF line endings. */
  crlf: string[];
  /** Paths that couldn't be formatted: each a sentence saying why and what to do. */
  problems: string[];
}

/** Writes a file; throws when it can't. */
export type WriteFile = (file: string, text: string) => void;

/**
 * Formats each file `paths` name, the way the language server formats a document (core's
 * formatDocument(), in its one style), finding a folder's tf scripts as `tfscript check` does.
 */
export function formatFiles(request: FormatRequest, host: CheckHost, write: WriteFile): FormatOutcome {
  const problems: string[] = [];
  const outcome: FormatOutcome = { files: [], changed: [], crlf: [], problems };
  for (const { file, real } of expandPaths(request.paths, request.cwd, host, problems)) {
    const shown = path.relative(request.cwd, file) || file;
    const text = host.fs.readFile(real);
    if (text === undefined) {
      problems.push(`${shown} can't be read: check that it is a file you may read.`);
      continue;
    }
    outcome.files.push(file);
    const result = formatDocument(text);
    if (result.crlf) outcome.crlf.push(file);
    if (result.edits.length === 0) continue;
    if (!request.check) {
      try {
        write(real, applyFormatEdits(text, result.edits));
      } catch {
        problems.push(`${shown} can't be written: check that it is a file you may change.`);
        continue;
      }
    }
    outcome.changed.push(file);
  }
  return outcome;
}
