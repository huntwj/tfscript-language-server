import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BUILTIN_COMMANDS } from "../src/data/builtinCommands.generated";
import { KEYWORD_COMMANDS } from "../src/data/keywordCommands.generated";
import { STDLIB_COMMANDS } from "../src/data/stdlibCommands.generated";
import { tablesFor } from "../src/data/tables";
import { TF_BUILDS } from "../src/tfBuild";
import { ALL_COMMANDS } from "../src/data/commands";
import { COMMAND_DESCRIPTIONS } from "../src/data/commandDescriptions";
import { FUNCTIONS } from "../src/data/functions.generated";
import { SPECIAL_VARIABLES } from "../src/data/variables.generated";
import { splitLogicalEntries } from "../src/logicalEntries";

// Plain JS, required rather than imported: test files aren't in tsconfig's `include`, so
// this isn't type-checked by `npm run build` either way.
const extractor = require("../../../scripts/extract-command-tables");

/**
 * Sync check, same idea as ~/ai/mud's own tinyfugue.pin.json: the src/data/*.generated.ts
 * files are checked in so the server works without a sibling tinyfugue checkout, but if one
 * is present, re-run the real extractor (scripts/extract-command-tables.js, required as a
 * module, not reimplemented here) and fail if it disagrees with what's checked in — a silent
 * drift after a tinyfugue update is exactly the kind of thing this project does not want to
 * find out about by accident.
 *
 * extractStdlibMacros takes src/logicalEntries's own splitLogicalEntries explicitly, rather
 * than letting it fall back to its default (dist/logicalEntries): otherwise this test would
 * silently need `npm run build` to have already run, and could validate against a stale
 * dist/ build without noticing.
 */
const TINYFUGUE_DIR = join(__dirname, "..", "..", "..", "..", "tinyfugue");
const describeOrSkip = existsSync(TINYFUGUE_DIR) ? describe : describe.skip;

describeOrSkip("command tables (vs. the sibling tinyfugue checkout)", () => {
  // The checkout is the fork; its main is upstream, read through jj (extractor.upstreamTree).
  const trees = { fork: extractor.checkoutTree(TINYFUGUE_DIR), upstream: extractor.upstreamTree(TINYFUGUE_DIR) };

  for (const build of TF_BUILDS) {
    it(`matches the ${build}'s commands, usages, functions, variables and library`, () => {
      const t = tablesFor(build);
      const source = extractor.extractTables(trees[build]);
      expect([...t.builtinCommands]).toEqual(source.builtinCommands);
      expect(t.commandUsages).toEqual(source.usages);
      expect(t.functions).toEqual(source.functions);
      expect(t.specialVariables).toEqual(source.variables);
      expect([...t.libraryFiles]).toEqual(source.libraryFiles);
      expect([...t.libraryFilesWithLoaded]).toEqual(source.libraryLoaded);
      expect(t.libraryFiles).toContain("alias.tf");
      expect(t.libraryFilesWithLoaded).toContain("alias.tf");
      expect(t.libraryFilesWithLoaded).not.toContain("stdlib.tf");
    });

    it(`matches the ${build}'s keyword table and stdlib.tf macros, which both builds share`, () => {
      expect([...KEYWORD_COMMANDS]).toEqual(extractor.extractKeywordTable(trees[build].read("src/expand.c")));
      expect([...STDLIB_COMMANDS]).toEqual(extractor.extractStdlibMacros(trees[build].read("lib/tf/stdlib.tf"), splitLogicalEntries));
    });
  }
});

describe("tablesFor", () => {
  it("gives the fork every command, function and variable upstream has, and more", () => {
    const [fork, upstream] = [tablesFor("fork"), tablesFor("upstream")];
    for (const name of upstream.commandSources.keys()) expect(fork.commandSources.has(name), name).toBe(true);
    for (const name of upstream.functionNames) expect(fork.functionNames.has(name), name).toBe(true);
    for (const name of upstream.specialVariableNames) expect(fork.specialVariableNames.has(name), name).toBe(true);
    expect(fork.functionNames.has("strlen_bytes")).toBe(true);
    expect(upstream.functionNames.has("strlen_bytes")).toBe(false);
    expect(upstream.specialVariableNames.has("local_assign")).toBe(false);
    expect(upstream.commandSources.has("python_call_unsafe")).toBe(false);
    expect(fork.functions.find((f) => f.name === "tfwrite")?.max).toBe(3);
    expect(upstream.functions.find((f) => f.name === "tfwrite")?.max).toBe(2);
    expect(tablesFor()).toBe(upstream);
  });

  it("has ALL_COMMANDS hold the fork's commands", () => {
    expect(ALL_COMMANDS).toEqual(tablesFor("fork").commands);
  });
});

describe("FUNCTIONS and SPECIAL_VARIABLES", () => {
  it("keep funclist.h's argument counts, conditions and every form of a synopsis", () => {
    const byName = new Map(FUNCTIONS.map((f) => [f.name, f]));
    expect(byName.get("regmatch")).toMatchObject({ min: 2, max: 2, synopses: ["regmatch(s1, s2)"] });
    expect(byName.get("substr")?.synopses).toEqual(["substr(s, i1)", "substr(s, i1, i2)"]);
    expect(byName.get("strcat")).toMatchObject({ min: 1, max: null });
    expect(byName.get("gmcp")?.requires).toBe("ENABLE_GMCP");
  });

  it("type each variable, with the values an enum or flag takes", () => {
    const byName = new Map(SPECIAL_VARIABLES.map((v) => [v.name, v]));
    expect(byName.get("wrap")).toEqual({ name: "wrap", type: "flag", values: ["off", "on"], default: "on" });
    expect(byName.get("matching")?.values).toEqual(["simple", "glob", "regexp", "substr"]);
    expect(byName.get("binary_eol")?.values).toEqual(["LF", "CR", "CRLF"]);
    // Inside `#if 0` in varlist.h, so tf never has it.
    expect(byName.has("auto_fg")).toBe(false);
    // Defined under both sides of `#if ENABLE_ATCP`; listed once, as the flag it is when built in.
    expect(SPECIAL_VARIABLES.filter((v) => v.name === "atcp")).toEqual([
      { name: "atcp", type: "flag", values: ["off", "on"], default: "on", requires: "ENABLE_ATCP" },
    ]);
  });
});

describe("COMMAND_DESCRIPTIONS", () => {
  it("has exactly one entry per known command", () => {
    const want = ALL_COMMANDS.map((c) => c.name.toLowerCase()).sort();
    expect(Object.keys(COMMAND_DESCRIPTIONS).sort()).toEqual(want);
  });
});

describe("ALL_COMMANDS", () => {
  it("covers every name from all three tables", () => {
    const names = new Set(ALL_COMMANDS.map((c) => c.name));
    for (const name of [...KEYWORD_COMMANDS, ...BUILTIN_COMMANDS, ...STDLIB_COMMANDS]) {
      expect(names.has(name), `missing ${name}`).toBe(true);
    }
  });

  it("has no duplicate names", () => {
    const names = ALL_COMMANDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("knows /echo, /for and /addworld are stdlib macros, not builtins", () => {
    const bySource = new Map(ALL_COMMANDS.map((c) => [c.name, c.source]));
    expect(bySource.get("echo")).toBe("stdlib");
    expect(bySource.get("for")).toBe("stdlib");
    expect(bySource.get("addworld")).toBe("stdlib");
  });

  it("prefers the keyword source for names in both the keyword and builtin tables", () => {
    const overlap = BUILTIN_COMMANDS.filter((n) => KEYWORD_COMMANDS.includes(n));
    expect(overlap.length).toBeGreaterThan(0); // SET, SETENV, LET, EXIT today
    const bySource = new Map(ALL_COMMANDS.map((c) => [c.name, c.source]));
    for (const name of overlap) {
      expect(bySource.get(name)).toBe("keyword");
    }
  });
});
