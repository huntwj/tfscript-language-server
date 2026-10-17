import { randomBytes } from "node:crypto";
import { closeSync, ftruncateSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
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
  /** Files that couldn't be formatted or checked because they aren't UTF-8. */
  notUtf8: string[];
  /** Files that couldn't be formatted or checked because they hold U+FFFD (core leaves those alone). */
  replacement: string[];
  /** Paths that couldn't be formatted: each a sentence saying why and what to do. */
  problems: string[];
}

/** Writes a file; throws when it can't. */
export type WriteFile = (file: string, text: string) => void;

/** Reads a file's bytes; throws when it can't. */
export type ReadBytes = (file: string) => Uint8Array;

/** A write that failed part way, whose old text couldn't be put back either: it is in `backup`. */
export class BackupKept extends Error {
  constructor(readonly backup: string) {
    super(`the old text couldn't be put back; it is in ${backup}`);
  }
}

/** Writes all of `data` at the start of the open file `fd` and cuts the file there. */
function overwrite(fd: number, data: Uint8Array): void {
  ftruncateSync(fd, 0);
  let done = 0;
  while (done < data.length) done += writeSync(fd, data, done, data.length - done, done);
}

/**
 * Writes `text` over `file` in place, as gofmt does: first a copy of the old file beside it,
 * created exclusively under a name nobody can guess (so a planted link is never followed), then
 * the new text into the same file, which keeps its inode, hard links, owner, permissions,
 * attributes and streams, and is refused when the file is read-only. The copy goes once the write
 * is done. If the write fails part way the old text is written back; if that fails too, the copy
 * stays and the error (BackupKept) names it. `write` is for tests, to make a write fail.
 */
export function writeFileInPlace(file: string, text: string, write: (fd: number, data: Uint8Array) => void = overwrite): void {
  const old = readFileSync(file);
  const backup = path.join(path.dirname(file), `.${path.basename(file)}.tfscript-${randomBytes(8).toString("hex")}.bak`);
  writeFileSync(backup, old, { flag: "wx" });
  let fd: number;
  try {
    // r+ opens without cutting the file, so one that can't be written is refused untouched.
    fd = openSync(file, "r+");
  } catch (error) {
    rmSync(backup, { force: true });
    throw error;
  }
  try {
    write(fd, Buffer.from(text, "utf8"));
  } catch (error) {
    try {
      write(fd, old);
    } catch {
      closeSync(fd);
      throw new BackupKept(backup);
    }
    closeSync(fd);
    rmSync(backup, { force: true });
    throw error;
  }
  closeSync(fd);
  rmSync(backup, { force: true });
}

// ignoreBOM keeps a byte order mark in the text, so writing it back keeps it in the file.
const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/**
 * Formats each file `paths` name, the way the language server formats a document (core's
 * formatDocument(), in its one style), finding a folder's tf scripts as `tfscript check` does. A
 * file that isn't valid UTF-8 is left alone: decoding it would turn its other bytes into U+FFFD,
 * and writing that back would lose them. So is one holding U+FFFD, which core won't touch.
 */
export function formatFiles(request: FormatRequest, host: CheckHost, write: WriteFile, read: ReadBytes = (f) => readFileSync(f)): FormatOutcome {
  const problems: string[] = [];
  const outcome: FormatOutcome = { files: [], changed: [], crlf: [], notUtf8: [], replacement: [], problems };
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
    if (result.replacement) outcome.replacement.push(file);
    if (result.edits.length === 0) continue;
    if (!request.check) {
      try {
        write(real, applyFormatEdits(text, result.edits));
      } catch (error) {
        problems.push(
          error instanceof BackupKept
            ? `${shown} was only partly written, and its old text couldn't be put back: it is in ${path.relative(request.cwd, error.backup) || error.backup}, so copy it back.`
            : `${shown} can't be written: check that it is a file you may change.`,
        );
        continue;
      }
    }
    outcome.changed.push(file);
  }
  return outcome;
}
