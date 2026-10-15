import { describe, expect, it } from "vitest";

// Plain JS, required rather than imported: see commandsData.test.ts for why.
const { tokenize } = require("../scripts/extract-command-tables");

/**
 * Unit tests for extract-command-tables.js's shell-style tokenizer, used to pull a /def's
 * macro name out past its flag tokens (some of which carry a quoted value containing spaces,
 * e.g. `-h'SEND help'`) when deriving src/data/stdlibCommands.generated.ts.
 */
describe("tokenize", () => {
  it("splits on unquoted whitespace", () => {
    expect(tokenize("/def foo = /echo hi")).toEqual(["/def", "foo", "=", "/echo", "hi"]);
  });

  it("keeps a quoted value with embedded spaces as one token", () => {
    expect(tokenize("/def -h'SEND help' foo = /echo hi")).toEqual([
      "/def",
      "-h'SEND help'",
      "foo",
      "=",
      "/echo",
      "hi",
    ]);
  });

  it("handles a double-quoted value the same way", () => {
    expect(tokenize('/def -t"a pattern" foo = /echo hi')).toEqual([
      "/def",
      '-t"a pattern"',
      "foo",
      "=",
      "/echo",
      "hi",
    ]);
  });

  it("handles a /def with no body at all", () => {
    expect(tokenize("/def foo")).toEqual(["/def", "foo"]);
  });

  it("handles a name immediately followed by = with no space", () => {
    expect(tokenize("/def foo=/echo hi")).toEqual(["/def", "foo=/echo", "hi"]);
  });

  it("collapses runs of whitespace between tokens", () => {
    expect(tokenize("/def   foo   =   /echo hi")).toEqual(["/def", "foo", "=", "/echo", "hi"]);
  });
});
