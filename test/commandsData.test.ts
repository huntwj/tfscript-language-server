import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUILTIN_COMMANDS } from "../src/data/builtinCommands.generated";
import { KEYWORD_COMMANDS } from "../src/data/keywordCommands.generated";
import { STDLIB_COMMANDS } from "../src/data/stdlibCommands.generated";
import { ALL_COMMANDS } from "../src/data/commands";
import { COMMAND_DESCRIPTIONS } from "../src/data/commandDescriptions";
import { COMMAND_USAGES } from "../src/data/commandUsages.generated";
import { splitLogicalEntries } from "../src/logicalEntries";

// Plain JS, required rather than imported: test files aren't in tsconfig's `include`, so
// this isn't type-checked by `npm run build` either way.
const extractor = require("../scripts/extract-command-tables");

/**
 * Sync check, same idea as ~/ai/mud's own tinyfugue.pin.json: the three src/data/*.generated.ts
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
const TINYFUGUE_DIR = join(__dirname, "..", "..", "tinyfugue");
const describeOrSkip = existsSync(TINYFUGUE_DIR) ? describe : describe.skip;

describeOrSkip("command tables (vs. the sibling tinyfugue checkout)", () => {
  it("matches tinyfugue/src/expand.c's keyword_table[]", () => {
    const text = readFileSync(join(TINYFUGUE_DIR, "src", "expand.c"), "utf8");
    expect([...KEYWORD_COMMANDS]).toEqual(extractor.extractKeywordTable(text));
  });

  it("matches tinyfugue/src/cmdlist.h's defcmd(...) entries", () => {
    const text = readFileSync(join(TINYFUGUE_DIR, "src", "cmdlist.h"), "utf8");
    expect([...BUILTIN_COMMANDS]).toEqual(extractor.extractBuiltinCmds(text));
  });

  it("matches lib/tf/stdlib.tf's top-level /def macros", () => {
    const text = readFileSync(join(TINYFUGUE_DIR, "lib", "tf", "stdlib.tf"), "utf8");
    expect([...STDLIB_COMMANDS]).toEqual(extractor.extractStdlibMacros(text, splitLogicalEntries));
  });

  it("matches htmldoc/commands/*.html's usage synopses", () => {
    const pages = extractor.readCommandPages(join(TINYFUGUE_DIR, "htmldoc", "commands"));
    expect(COMMAND_USAGES).toEqual(extractor.extractCommandUsages(pages));
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
