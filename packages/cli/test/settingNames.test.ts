import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { OPTIONS } from "../src/args";
import { check } from "../src/check";
import { SETTING_SHAPES } from "@tfscript/core/workspace/configFile";
import { forCommandLine, forConfigFile, OPTION_FOR_SETTING, SETTING_NAME } from "../src/settingNames";
import { testHost } from "./fixtures";

describe("tf's own text in a message", () => {
  // Scripts whose tf text looks like a setting's name: a filename, a macro name and a /def name.
  const dir = mkdtempSync(path.join(tmpdir(), "tfscript-names-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, "tfrc"), "/load tfscript.variables\n/def -i caller = /tfscript.pathMappings\n/def bad in tfscript.homeDirectory\n");
  const messages = check({ paths: ["tfrc"], settings: {}, cwd: dir }, testHost()).files.flatMap((f) => f.diagnostics.map((d) => d.message));

  it("is left alone: quoted, or a /name", () => {
    for (const needle of ['"tfscript.variables"', "/tfscript.pathMappings", '"bad in tfscript.homeDirectory"']) {
      const named = messages.filter((m) => m.includes(needle));
      expect(named, needle).toHaveLength(1);
      expect(forCommandLine(named[0] as string)).toContain(needle);
    }
    // The setting the unresolved-load message itself names is still put as the option.
    expect(messages.map(forCommandLine)).toContain('tf won\'t find "tfscript.variables": fix the path, or give --working-directory the folder tf runs in.');
  });

  it("is left alone beside a setting the message names", () => {
    expect(forCommandLine('tf won\'t find "set tfscript.workingDirectory to x": fix the path, or set tfscript.workingDirectory to the folder tf runs in.')).toBe(
      'tf won\'t find "set tfscript.workingDirectory to x": fix the path, or give --working-directory the folder tf runs in.',
    );
    expect(forCommandLine("tf won't find /x/tfscript.variables/a.tf or tfscript.variables.tf: in tfscript.variables.")).toBe(
      "tf won't find /x/tfscript.variables/a.tf or tfscript.variables.tf: with --variable.",
    );
  });
});

describe("a toggle", () => {
  it("is put as its option only where the sentence still reads", () => {
    expect(forCommandLine("To stop this, set tfscript.diagnostics.unresolvedLoads to false.")).toBe("To stop this, use --no-unresolved-loads.");
    expect(forCommandLine("Turned off by tfscript.diagnostics.undefinedMacros.")).toBe("Turned off by --no-undefined-macros.");
    for (const kept of [
      "To check them, set tfscript.diagnostics.unresolvedLoads to true.",
      "Set tfscript.diagnostics.undefinedMacros to on: set tfscript.diagnostics.undefinedMacros.",
      "It is on in tfscript.diagnostics.unresolvedLoads.",
    ]) {
      expect(forCommandLine(kept)).toBe(kept);
    }
  });
});

const CORE_SRC = fileURLToPath(new URL("../../core/src/", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(path.join(dir, e.name)) : e.name.endsWith(".ts") ? [path.join(dir, e.name)] : [],
  );
}

describe("the settings core's messages name", () => {
  it("each have an option, and each option is one the parser takes", () => {
    // tfscript.json (and its schema, tfscript.schema.json) is a file, not a setting.
    const named = new Set(
      sources(CORE_SRC)
        .flatMap((f) => [...readFileSync(f, "utf8").matchAll(SETTING_NAME)].map((m) => m[1] as string))
        .filter((key) => !/(^|\.)json$/.test(key)),
    );
    expect(named.size).toBeGreaterThan(5);
    expect([...named].filter((key) => !(key in OPTION_FOR_SETTING))).toEqual([]);
    for (const option of Object.values(OPTION_FOR_SETTING)) expect(Object.keys(OPTIONS)).toContain(option.slice(2));
  });

  it("are put as the options, in sentences that still read", () => {
    expect(forCommandLine('tf won\'t find "missing.tf": fix the path, or set tfscript.workingDirectory to the folder tf runs in.')).toBe(
      'tf won\'t find "missing.tf": fix the path, or give --working-directory the folder tf runs in.',
    );
    expect(forCommandLine("This load can't be followed here: x, and ~ means tf's HOME: set tfscript.homeDirectory.")).toBe(
      "This load can't be followed here: x, and ~ means tf's HOME: use --home-directory.",
    );
    expect(forCommandLine("To have it checked, give %{dir} a value in tfscript.variables.")).toBe("To have it checked, give %{dir} a value with --variable.");
    expect(forCommandLine("if tf runs where that path exists, map it with tfscript.pathMappings.")).toBe(
      "if tf runs where that path exists, map it with --path-mapping.",
    );
    expect(forCommandLine("add its name to tfscript.diagnostics.ignoreMacros.")).toBe("add its name to --ignore-macro.");
    expect(forCommandLine("tfscript.codeLens.references and tfscript.unknown stay.")).toBe("tfscript.codeLens.references and tfscript.unknown stay.");
  });
});

describe("forConfigFile", () => {
  it("puts each setting as its tfscript.json key, for the Claude Code hook", () => {
    expect(forConfigFile(`tf won't find "missing.tf": fix the path, or set tfscript.workingDirectory to the folder tf runs in.`)).toBe(
      `tf won't find "missing.tf": fix the path, or set workingDirectory in tfscript.json to the folder tf runs in.`,
    );
    expect(forConfigFile("This load can't be followed here: x, and ~ means tf's HOME: set tfscript.homeDirectory.")).toBe(
      "This load can't be followed here: x, and ~ means tf's HOME: set homeDirectory in tfscript.json.",
    );
    expect(forConfigFile("To have it checked, give %{dir} a value in tfscript.variables.")).toBe("To have it checked, give %{dir} a value under variables in tfscript.json.");
    expect(forConfigFile("map it with tfscript.pathMappings.")).toBe("map it with pathMappings in tfscript.json.");
    expect(forConfigFile("To stop this, set tfscript.diagnostics.unresolvedLoads to false.")).toBe("To stop this, set diagnostics.unresolvedLoads in tfscript.json to false.");
    expect(forConfigFile("add its name to tfscript.diagnostics.ignoreMacros.")).toBe("add its name to diagnostics.ignoreMacros in tfscript.json.");
  });

  it("leaves tf's own text, and settings tfscript.json doesn't have, as they are", () => {
    for (const kept of ['/load "tfscript.workingDirectory"', "tfscript.codeLens.references and tfscript.unknown stay.", "/tfscript.workingDirectory"]) {
      expect(forConfigFile(kept)).toBe(kept);
    }
  });

  it("names every setting core's messages name as a key tfscript.json takes", () => {
    for (const key of Object.keys(OPTION_FOR_SETTING)) expect(Object.keys(SETTING_SHAPES), key).toContain(key.split(".")[0]);
  });
});
