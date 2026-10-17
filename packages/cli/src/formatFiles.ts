import { chmodSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
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
  /** Files left as they are because they aren't UTF-8. */
  notUtf8: string[];
  /** Paths that couldn't be formatted: each a sentence saying why and what to do. */
  problems: string[];
}

/** Writes a file; throws when it can't. */
export type WriteFile = (file: string, text: string) => void;

/** Reads a file's bytes; throws when it can't. */
export type ReadBytes = (file: string) => Uint8Array;

/**
 * Writes `text` to a new file beside `file`, then renames it over `file`, so a write that fails
 * part way leaves the old file whole. The new file takes the old one's permissions.
 */
export const writeFileAtomic: WriteFile = (file, text) => {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.tfscript-${process.pid}.tmp`);
  try {
    writeFileSync(temp, text);
    chmodSync(temp, statSync(file).mode);
    renameSync(temp, file);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
};

// ignoreBOM keeps a byte order mark in the text, so writing it back keeps it in the file.
const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/**
 * Formats each file `paths` name, the way the language server formats a document (core's
 * formatDocument(), in its one style), finding a folder's tf scripts as `tfscript check` does. A
 * file that isn't valid UTF-8 is left alone: decoding it would turn its other bytes into U+FFFD,
 * and writing that back would lose them.
 */
export function formatFiles(request: FormatRequest, host: CheckHost, write: WriteFile, read: ReadBytes = (f) => readFileSync(f)): FormatOutcome {
  const problems: string[] = [];
  const outcome: FormatOutcome = { files: [], changed: [], crlf: [], notUtf8: [], problems };
  for (const { file, real } of expandPaths(request.paths, request.cwd, host, problems)) {
    const shown = path.relative(request.cwd, file) || file;
    let bytes: Uint8Array;
    try {
      bytes = read(real);
    } catch {
      problems.push(`${shown} can't be read: check that it is a file you may read.`);
      continue;
    }
    outcome.files.push(file);
    let text: string;
    try {
      text = UTF8.decode(bytes);
    } catch {
      outcome.notUtf8.push(file);
      continue;
    }
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
