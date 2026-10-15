import { describe, expect, it } from "vitest";
import { getFoldingRanges } from "../src/folding";

describe("continued entries", () => {
  it("folds a backslash-continued /def body as one region", () => {
    const text = ["/def foo = \\", "  /echo one%; \\", "  /echo two", "/echo after", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([{ startLine: 0, endLine: 2 }]);
  });

  it("folds a top-level /if ... /endif that is joined with backslashes", () => {
    const text = ["/if (1) \\", "  /echo yes%; \\", "/endif", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([{ startLine: 0, endLine: 2 }]);
  });

  it("does not fold an /if whose lines are separate entries (nothing joins them)", () => {
    const text = ["/if (1)", "  /echo yes", "/endif", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([]);
  });

  it("does not fold a single-line entry", () => {
    expect(getFoldingRanges("/def foo = /echo hi\n/echo x\n")).toEqual([]);
  });

  it("keeps a comment line in the middle of a continuation inside the entry's fold", () => {
    const text = ["/def foo = \\", ";; explains the next line", ";; and more", "  /echo one", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([{ startLine: 0, endLine: 3 }]);
  });

  it("does not treat %\\ (an escaped backslash) as continuation", () => {
    expect(getFoldingRanges("/echo a%\\\n/echo b\n")).toEqual([]);
  });

  it("still folds an entry left incomplete by a trailing \\ at end of file", () => {
    expect(getFoldingRanges("/def foo = \\\n  /echo one \\")).toEqual([{ startLine: 0, endLine: 1 }]);
  });
});

describe("comment runs", () => {
  it("folds two or more consecutive comment lines as a comment", () => {
    const text = [";; header line one", ";; header line two", "# and a hash one", "/echo x", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([{ startLine: 0, endLine: 2, kind: "comment" }]);
  });

  it("does not fold a lone comment line", () => {
    expect(getFoldingRanges(";; just one\n/echo x\n")).toEqual([]);
  });

  it("splits comment runs on a blank line", () => {
    const text = [";; a", ";; b", "", ";; c", ";; d", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([
      { startLine: 0, endLine: 1, kind: "comment" },
      { startLine: 3, endLine: 4, kind: "comment" },
    ]);
  });

  it("folds a comment run that ends at end of file", () => {
    expect(getFoldingRanges("/echo x\n;; a\n;; b")).toEqual([{ startLine: 1, endLine: 2, kind: "comment" }]);
  });

  it("returns ranges in document order when comments and entries interleave", () => {
    const text = [";; a", ";; b", "/def foo = \\", "  /echo", ";; c", ";; d", ""].join("\n");
    expect(getFoldingRanges(text)).toEqual([
      { startLine: 0, endLine: 1, kind: "comment" },
      { startLine: 2, endLine: 3 },
      { startLine: 4, endLine: 5, kind: "comment" },
    ]);
  });
});
