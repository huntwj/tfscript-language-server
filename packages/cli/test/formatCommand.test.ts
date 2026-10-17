import { chmodSync, ftruncateSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseArgs, UsageError } from "../src/args";
import { BackupKept, writeFileInPlace } from "../src/formatFiles";
import { EXIT_OK, EXIT_PROBLEMS, EXIT_USAGE, main } from "../src/main";
import { USAGE } from "../src/usage";
import { runBin, testHost } from "./fixtures";

const usageError = (argv: string[]): string => {
  try {
    parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) return error.message;
    throw error;
  }
  throw new Error(`parsed: ${argv.join(" ")}`);
};

describe("parseArgs: format", () => {
  it("reads format, --check and the paths", () => {
    expect(parseArgs(["format", "a.tf", "scripts"])).toEqual({ kind: "format", paths: ["a.tf", "scripts"], check: false });
    expect(parseArgs(["format", "--check", "a.tf"])).toEqual({ kind: "format", paths: ["a.tf"], check: true });
  });

  it("takes no check option, and check takes no --check", () => {
    expect(usageError(["format", "--root", "ws", "a.tf"])).toBe("--root only goes with tfscript check: tfscript format takes only --check.");
    expect(usageError(["format", "--no-undefined-macros", "a.tf"])).toBe("--no-undefined-macros only goes with tfscript check: tfscript format takes only --check.");
    expect(usageError(["format"])).toBe("Nothing to format: name the .tf files or folders, as in tfscript format tfrc scripts/.");
    expect(usageError(["check", "--check", "a.tf"])).toBe("--check only goes with tfscript format: leave it out, as tfscript check never changes a file.");
  });
});

const ONE_LINE = "/def go = /echo a%; /echo b\n";
const LAID_OUT = "/def go = \\\n  /echo a%;\\\n  /echo b\n";

describe("tfscript format", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "tfscript-format-"));
    mkdirSync(path.join(dir, "scripts"));
    writeFileSync(path.join(dir, "scripts", "a.tf"), ONE_LINE);
    writeFileSync(path.join(dir, "scripts", "b.tf"), LAID_OUT);
    writeFileSync(path.join(dir, "crlf.tf"), "/def go = /echo a%; /echo b\r\n");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (argv: string[]) => {
    let out = "";
    let err = "";
    const code = main(argv, { cwd: dir, out: (t) => (out += t), err: (t) => (err += t) }, testHost());
    return { code, out, err };
  };
  const read = (file: string) => readFileSync(path.join(dir, file), "utf8");

  it("rewrites the files that change, names them, and counts them", () => {
    expect(run(["format", "scripts"])).toEqual({ code: EXIT_OK, out: `${path.join("scripts", "a.tf")}\n`, err: "Reformatted 1 of 2 files.\n" });
    expect(read("scripts/a.tf")).toBe(LAID_OUT);
    expect(read("scripts/b.tf")).toBe(LAID_OUT);
    // Formatted already: nothing to say.
    expect(run(["format", "scripts"])).toEqual({ code: EXIT_OK, out: "", err: "" });
  });

  it("with --check, changes nothing and exits 1 when a file would change", () => {
    expect(run(["format", "--check", "scripts"])).toEqual({
      code: EXIT_PROBLEMS,
      out: `${path.join("scripts", "a.tf")}\n`,
      err: "1 of 2 files would be reformatted: run tfscript format on it.\n",
    });
    expect(read("scripts/a.tf")).toBe(ONE_LINE);
    expect(run(["format", "--check", "scripts/b.tf"])).toEqual({ code: EXIT_OK, out: "", err: "" });
  });

  it("leaves a CRLF file alone, saying why", () => {
    const { code, out, err } = run(["format", "crlf.tf"]);
    expect({ code, out }).toEqual({ code: EXIT_OK, out: "" });
    expect(err).toBe("tfscript: crlf.tf has CRLF line endings, where tf doesn't join a line ending in \\ to the next, so it was left as it is: convert it to LF to format it.\n");
    expect(read("crlf.tf")).toBe("/def go = /echo a%; /echo b\r\n");
  });

  it("leaves a file that isn't UTF-8 alone, byte for byte, and exits 2, --check or not", () => {
    // Latin-1 "café": decoded leniently, the é would be written back as U+FFFD (ef bf bd).
    const latin1 = Buffer.from("/def go = /echo caf\xe9%; /echo b\n", "latin1");
    writeFileSync(path.join(dir, "latin1.tf"), latin1);
    const note = "tfscript: latin1.tf isn't UTF-8, so it can't be formatted or checked, as formatting it would lose the bytes that aren't: convert it to UTF-8.\n";
    expect(run(["format", "latin1.tf"])).toEqual({ code: EXIT_USAGE, out: "", err: note });
    expect(run(["format", "--check", "latin1.tf"])).toEqual({ code: EXIT_USAGE, out: "", err: note });
    expect(readFileSync(path.join(dir, "latin1.tf")).equals(latin1)).toBe(true);
  });

  it("leaves a file holding U+FFFD alone, and exits 2", () => {
    writeFileSync(path.join(dir, "fffd.tf"), "/def go = /echo caf\uFFFD%; /echo b\n");
    expect(run(["format", "--check", "fffd.tf"])).toEqual({
      code: EXIT_USAGE,
      out: "",
      err: "tfscript: fffd.tf holds U+FFFD, the mark of a byte that wasn't UTF-8, so it can't be formatted or checked: put back the character it stood for.\n",
    });
  });

  it("keeps a UTF-8 file's byte order mark and its other characters", () => {
    writeFileSync(path.join(dir, "bom.tf"), "﻿;; café\n/def go = /echo café%; /echo b\n");
    expect(run(["format", "bom.tf"]).code).toBe(EXIT_OK);
    expect(read("bom.tf")).toBe("﻿;; café\n/def go = \\\n  /echo café%;\\\n  /echo b\n");
  });

  describe("writing in place", () => {
    const file = () => path.join(dir, "scripts", "a.tf");
    const listing = () => readdirSync(path.join(dir, "scripts")).sort();

    it("writes the new text into the same file and leaves no copy behind", () => {
      writeFileInPlace(file(), LAID_OUT);
      expect(read("scripts/a.tf")).toBe(LAID_OUT);
      expect(listing()).toEqual(["a.tf", "b.tf"]);
    });

    it("keeps hard links to the file", () => {
      const link = path.join(dir, "link.tf");
      linkSync(file(), link);
      writeFileInPlace(file(), LAID_OUT);
      expect(readFileSync(link, "utf8")).toBe(LAID_OUT);
    });

    it("refuses a read-only file and leaves it untouched", () => {
      chmodSync(file(), 0o444);
      try {
        expect(() => writeFileInPlace(file(), LAID_OUT)).toThrow();
        expect(read("scripts/a.tf")).toBe(ONE_LINE);
        expect(listing()).toEqual(["a.tf", "b.tf"]);
        expect(run(["format", "scripts/a.tf"]).code).toBe(EXIT_USAGE);
      } finally {
        chmodSync(file(), 0o644);
      }
    });

    it("puts the old text back when the write fails part way", () => {
      let calls = 0;
      const failFirst = (fd: number, data: Uint8Array) => {
        calls += 1;
        if (calls === 1) throw new Error("disk full");
        ftruncateSync(fd, 0);
        writeSync(fd, data, 0, data.length, 0);
      };
      expect(() => writeFileInPlace(file(), LAID_OUT, failFirst)).toThrow("disk full");
      expect(read("scripts/a.tf")).toBe(ONE_LINE);
      expect(listing()).toEqual(["a.tf", "b.tf"]);
    });

    it("keeps the copy, and names it, when the old text can't be put back either", () => {
      const failAll = () => {
        throw new Error("disk full");
      };
      let error: unknown;
      try {
        writeFileInPlace(file(), LAID_OUT, failAll);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BackupKept);
      const backup = (error as BackupKept).backup;
      expect(readFileSync(backup, "utf8")).toBe(ONE_LINE);
      expect(path.dirname(backup)).toBe(path.join(dir, "scripts"));
      rmSync(backup);
    });
  });

  it("exits 2 on a path it can't read or write", () => {
    expect(run(["format", "missing.tf"])).toEqual({ code: EXIT_USAGE, out: "", err: "tfscript: missing.tf doesn't exist: check the path.\n" });
    let err = "";
    const code = main(["format", "scripts/a.tf"], { cwd: dir, out: () => {}, err: (t) => (err += t) }, testHost(), () => {
      throw new Error("read-only");
    });
    expect(code).toBe(EXIT_USAGE);
    expect(err).toBe(`tfscript: ${path.join("scripts", "a.tf")} can't be written: check that it is a file you may change.\n`);
  });

  it("is in the usage text, and runs from the built bin", () => {
    expect(USAGE).toContain("Usage: tfscript format [--check] <file or folder>...");
    expect(runBin(["format", "--check", path.join(dir, "scripts", "b.tf")], dir)).toEqual({ status: 0, stdout: "", stderr: "" });
  });
});
