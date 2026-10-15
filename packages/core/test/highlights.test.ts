import { describe, expect, it } from "vitest";
import { getDocumentHighlights } from "../src/navigation";

const pos = (line: number, character: number) => ({ line, character });
const show = (text: string, line: number, character: number) =>
  getDocumentHighlights(text, pos(line, character)).map((h) => `${h.kind}@${h.range.start.line}:${h.range.start.character}`);

describe("getDocumentHighlights", () => {
  it("marks a variable's sets and assignments as writes, and its reads as reads", () => {
    const text = "/set n=1\n/def -i a = /test n := n + 1%; /echo %n %{n-0}%; /unset n\n";
    expect(show(text, 0, 5)).toEqual(["write@0:5", "write@1:18", "read@1:23", "read@1:38", "read@1:42", "write@1:56"]);
  });

  it("keeps a body's /let variable apart from the global of the same name", () => {
    const text = "/set n=1\n/def -i a = /let n=2%; /echo %n\n/def -i b = /echo %n\n";
    expect(show(text, 1, 30)).toEqual(["write@1:17", "read@1:30"]);
    expect(show(text, 0, 5)).toEqual(["write@0:5", "read@2:19"]);
  });

  it("marks a macro's /def name as a write and its calls as reads", () => {
    const text = "/def -i greet = /echo hi\n/greet%; /@greet\n/echo ${greet}\n";
    expect(show(text, 1, 2)).toEqual(["write@0:8", "read@1:1", "read@2:8"]);
  });

  it("highlights nothing on plain text", () => {
    expect(show("/echo hello\n", 0, 8)).toEqual([]);
  });
});
