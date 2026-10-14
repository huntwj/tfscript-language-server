import { describe, expect, it } from "vitest";
import { getDiagnostics } from "../src/diagnostics";

type Edit = { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string };

function applyEdits(text: string, edits: Edit[]): string {
  const lines = text.split("\n");
  const off = (p: { line: number; character: number }) => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  let out = text;
  for (const e of [...edits].sort((a, b) => off(b.range.start) - off(a.range.start))) {
    out = out.slice(0, off(e.range.start)) + e.newText + out.slice(off(e.range.end));
  }
  return out;
}

const empties = (text: string) => getDiagnostics(text).filter((d) => d.code === "empty-statement");
/** Where each empty statement is, as `line:column`. */
const at = (text: string) => empties(text).map((d) => `${d.range.start.line}:${d.range.start.character}`);
/** The text with the first empty statement's fix applied. */
const fixed = (text: string) => {
  const [d] = empties(text);
  return d?.fix ? applyEdits(text, d.fix.edits) : undefined;
};

// Every shape below was run in tf dev (2026-10-14, the step-5 probes e1 and e2): each flagged one
// printed "Not connected." when it ran, which is tf sending a blank line to the world.
describe("empty-statement: a statement with nothing in it sends a blank line", () => {
  it("flags a %; or %\\ that starts a statement, after another separator", () => {
    expect(at("/def f = /echo a%;%; /echo b\n")).toEqual(["0:18"]);
    expect(at("/def f = /echo a%; %; /echo b\n")).toEqual(["0:19"]);
    expect(at("/def f = /echo a%\\%; /echo b\n")).toEqual(["0:18"]);
    expect(at("/def f = /echo a%; %;\n")).toEqual(["0:19"]);
  });

  it("flags one after /then, /do, /else and a (condition), and one before the first command", () => {
    expect(at("/def f = /if /test 1%; /then%; /echo a%; /endif\n")).toEqual(["0:28"]);
    expect(at("/def f = /while /test i<1%; /do%; /test ++i%; /done\n")).toEqual(["0:31"]);
    expect(at("/def f = /if (0) /echo x%; /else%; /echo a%; /endif\n")).toEqual(["0:32"]);
    expect(at("/def f = /if (1)%; /echo a%; /endif\n")).toEqual(["0:16"]);
    expect(at("/def f = /if (0) /echo x%; /elseif (1)%; /echo a%; /endif\n")).toEqual(["0:38"]);
    expect(at("/def f = %; /echo a\n")).toEqual(["0:9"]);
  });

  it("flags one in a condition list, which tf warns about as text sent to the server", () => {
    const [d] = empties("/def f = /if%; /test 1%; /then /echo a%; /endif\n");
    expect(d?.message).toBe("This %; after /if ends an empty statement, which tf warns about and sends to the world as a blank line: remove it.");
  });

  it("says whether tf warns about it itself", () => {
    expect(empties("/def f = /if (0) /echo x%; /else%; /echo a%; /endif\n")[0]?.message).toContain("tf warns about and sends");
    expect(empties("/def f = /if /test 1%; /then%; /echo a%; /endif\n")[0]?.message).toContain("which tf sends");
    expect(empties("/def f = /echo a%;%; /echo b\n")[0]?.message).toBe(
      "This %; right after another %; ends an empty statement, which tf sends to the world as a blank line: remove it.",
    );
    expect(empties("/def f = /echo a%\\%; /echo b\n")[0]?.message).toContain("right after a %\\");
  });

  it("flags the empty statement at the end of a $(...), and an empty $(...)", () => {
    const d = empties("/def f = /echo [$(/echo in%;)]\n");
    expect(at("/def f = /echo [$(/echo in%;)]\n")).toEqual(["0:28"]);
    expect(d[0]?.message).toBe(
      "This $(...) ends with an empty statement after its last %;, which tf sends to the world as a blank line: remove that %;.",
    );
    expect(fixed("/def f = /echo [$(/echo in%;)]\n")).toBe("/def f = /echo [$(/echo in)]\n");
    expect(at("/def f = /echo [$(/echo in%; )]\n")).toEqual(["0:29"]);
    expect(at("/def f = /echo [$()]\n")).toEqual(["0:18"]);
    expect(empties("/def f = /echo [$( )]\n")[0]?.fix).toBeUndefined();
    expect(at("/def f = /echo [$(%; /echo in)]\n")).toEqual(["0:18"]);
  });

  it("is found in every text tf compiles: a top-level /if line, /eval, /repeat and /for", () => {
    expect(at("/if (1) /echo a%;%; /echo b%; /endif\n")).toEqual(["0:17"]);
    expect(at("/if (0) /echo x%; /else%; /echo a%; /endif\n")).toEqual(["0:23"]);
    expect(at("/eval /echo a%;%; /echo b\n")).toEqual(["0:15"]);
    expect(at("/repeat -0 1 %; /echo a\n")).toEqual(["0:13"]);
    expect(at("/for i 1 1 /echo a%;%; /echo b\n")).toEqual(["0:20"]);
  });

  it("leaves alone what sends nothing, or is an error instead", () => {
    // A %; at the very end: the statement loop ends there (e09).
    expect(at("/def f = /echo a%;\n")).toEqual([]);
    expect(at("/def f = /echo a%;   \n")).toEqual([]);
    // %%; is text, so the statement after it is text sent to the world, not an empty one (e28).
    expect(at("/def f = /echo a%;%%; /echo b\n")).toEqual([]);
    // After or before a %|, tf reports a piping error instead (e15).
    expect(at("/def f = /echo a%;%| /echo b\n")).toEqual([]);
    expect(at("/def f = /echo a%|%; /echo b\n")).toEqual([]);
    // A plain top-level line has no separators at all.
    expect(at("/echo a%;%; /echo b\n")).toEqual([]);
    // A /break's statement ends at the ) of its $(...), as any other's.
    expect(at("/def f = /while (1) /echo [$(/while (1) /break%; /done)]%; /break%; /done\n")).toEqual([]);
    // After a /break, /return or /result the rest of that part never runs, so sends nothing (e31).
    expect(at("/def f = /while (n < 1) /echo a%; /break%;%; /done\n")).toEqual([]);
    expect(at("/def f = /if (x) /return 1%;%; /else /echo y%; /endif\n")).toEqual([]);
    // ...but the next part, or what follows the block, does.
    expect(at("/def f = /while (n < 1) /echo a%; /break%; /done%;%; /echo b\n")).toEqual(["0:50"]);
    expect(at("/def f = /if (x) /return 1%; /else%; /echo y%; /endif\n")).toEqual(["0:34"]);
    expect(at("/def f = /if (1) /echo a%; /endif\n")).toEqual([]);
    expect(at("/def f = /if (1) /echo a%; /else /echo b%; /endif\n")).toEqual([]);
  });

  it("removes the separator, keeping a word from running into the one after it", () => {
    expect(fixed("/def f = /echo a%;%; /echo b\n")).toBe("/def f = /echo a%; /echo b\n");
    expect(fixed("/def f = /if (0) /echo x%; /else%;/echo a%; /endif\n")).toBe("/def f = /if (0) /echo x%; /else /echo a%; /endif\n");
    expect(fixed("/def f = /if (1)%; /echo a%; /endif\n")).toBe("/def f = /if (1) /echo a%; /endif\n");
    expect(fixed("/def f = %; /echo a\n")).toBe("/def f =  /echo a\n");
    expect(fixed("/def f = /echo a%; %;\n")).toBe("/def f = /echo a%; \n");
  });
});
