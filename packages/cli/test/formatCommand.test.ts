import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseArgs, UsageError } from "../src/args";
import { writeFileAtomic } from "../src/formatFiles";
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

  it("leaves a file that isn't UTF-8 alone, byte for byte, saying why", () => {
    // Latin-1 "café": decoded leniently, the é would be written back as U+FFFD (ef bf bd).
    const latin1 = Buffer.from("/def go = /echo caf\xe9%; /echo b\n", "latin1");
    writeFileSync(path.join(dir, "latin1.tf"), latin1);
    const { code, out, err } = run(["format", "latin1.tf"]);
    expect({ code, out }).toEqual({ code: EXIT_OK, out: "" });
    expect(err).toBe("tfscript: latin1.tf isn't UTF-8, so it was left as it is, as formatting it would lose the bytes that aren't: convert it to UTF-8 to format it.\n");
    expect(readFileSync(path.join(dir, "latin1.tf")).equals(latin1)).toBe(true);
  });

  it("keeps a UTF-8 file's byte order mark and its other characters", () => {
    writeFileSync(path.join(dir, "bom.tf"), "﻿;; café\n/def go = /echo café%; /echo b\n");
    expect(run(["format", "bom.tf"]).code).toBe(EXIT_OK);
    expect(read("bom.tf")).toBe("﻿;; café\n/def go = \\\n  /echo café%;\\\n  /echo b\n");
  });

  it("writes through a file beside the old one, renamed over it, leaving nothing behind", () => {
    const file = path.join(dir, "scripts", "a.tf");
    writeFileAtomic(file, LAID_OUT);
    expect(read("scripts/a.tf")).toBe(LAID_OUT);
    expect(readdirSync(path.join(dir, "scripts")).sort()).toEqual(["a.tf", "b.tf"]);
    // A file that can't be replaced keeps its old text, and no temporary file is left.
    expect(() => writeFileAtomic(path.join(dir, "scripts", "missing.tf"), LAID_OUT)).toThrow();
    expect(readdirSync(path.join(dir, "scripts")).sort()).toEqual(["a.tf", "b.tf"]);
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
