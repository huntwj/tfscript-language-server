import { describe, expect, it } from "vitest";
import { detectIndent, getRefactorActions, sameProgram } from "../src/bodyLayout";
import { getDiagnostics } from "../src/diagnostics";
import { rejoin } from "../src/formatting";

const ALL = { start: { line: 0, character: 0 }, end: { line: 9999, character: 0 } };
const at = (line: number) => ({ start: { line, character: 0 }, end: { line, character: 0 } });

function apply(text: string, range = ALL): string[] {
  return getRefactorActions(text, range).map((a) => `${a.title}\n${a.edits[0]?.newText}`);
}

/** The text after applying one whole-line edit. */
function edited(text: string, range = ALL): string {
  const [action] = getRefactorActions(text, range);
  const edit = action!.edits[0]!;
  const lines = text.split("\n");
  const tail = (lines[edit.range.end.line] ?? "").slice(edit.range.end.character);
  return [...lines.slice(0, edit.range.start.line), edit.newText + tail, ...lines.slice(edit.range.end.line + 1)].join("\n");
}

describe("split", () => {
  it("puts each statement on its own line and indents blocks", () => {
    const text = "/def -i a = /let x=1 %; /if (x) /echo yes%; /elseif (2) /echo two%; /else /echo no%; /endif%; /echo done\n";
    const [action] = getRefactorActions(text, ALL);
    expect(action?.title).toBe("Split /a's body onto separate lines");
    expect(action?.edits[0]?.newText).toBe(
      [
        "/def -i a = \\",
        "    /let x=1%;\\",
        "    /if (x) \\",
        "        /echo yes%;\\",
        "    /elseif (2) \\",
        "        /echo two%;\\",
        "    /else \\",
        "        /echo no%;\\",
        "    /endif%;\\",
        "    /echo done",
      ].join("\n"),
    );
    expect(action?.edits[0]?.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: text.length - 1 } });
  });

  it("keeps a condition list on the /if line, and %| and $(...) inside their statement", () => {
    expect(apply("/def -i c = /if /test 1%; /then /echo yes%; /endif\n")).toEqual([
      "Split /c's body onto separate lines\n/def -i c = \\\n    /if /test 1%; /then \\\n        /echo yes%;\\\n    /endif",
    ]);
    expect(apply("/def -i p = /echo a %| /echo b%; /echo $(/echo x%; /echo y)\n")).toEqual([
      "Split /p's body onto separate lines\n/def -i p = \\\n    /echo a %| /echo b%;\\\n    /echo $(/echo x%; /echo y)",
    ]);
  });

  it("works for the other macro definers, and takes a tab before a /def's = with the head's blanks", () => {
    expect(apply("/trig zz = /echo a%; /echo b\n")[0]).toBe("Split this trigger's body onto separate lines\n/trig zz = \\\n    /echo a%;\\\n    /echo b");
    expect(apply("/def -i t\t= /echo a%; /echo b\n")[0]).toBe("Split /t's body onto separate lines\n/def -i t = \\\n    /echo a%;\\\n    /echo b");
  });

  it("uses the file's own indentation unit", () => {
    const text = "/def -i a = \\\n  /echo one\n/def -i b = /echo a%; /echo b\n";
    expect(detectIndent(text)).toBe("  ");
    expect(apply(text, at(2))[0]).toBe("Split /b's body onto separate lines\n/def -i b = \\\n  /echo a%;\\\n  /echo b");
  });

  it("isn't offered for a single statement, a top-level command, or a tab that would move", () => {
    expect(apply("/def -i one = /echo only\n")).toEqual([]);
    expect(apply("/def -i one = /echo only%;\n")).toEqual([]);
    expect(apply("/echo a%; /echo b\n")).toEqual([]);
    expect(apply("/def -i a = /echo [\t]%; /echo b\n")).toEqual([]);
  });

  it("isn't offered on a CRLF line, where a \\ before the \\r continues nothing", () => {
    expect(apply("/def -i a = /echo a%; /echo b\r\n")).toEqual([]);
  });

  it("treats %%; as text, not a place to split", () => {
    expect(apply("/def -i a = /echo 50%%; off\n")).toEqual([]);
  });

  // A trailing %; ends the body: the last line must not end in \, or at the end of the file tf
  // drops the command (proven 2026-10-14: the split below, at the end of a file, defined z6).
  for (const eol of ["", "\n"]) {
    it(`keeps a body's final %; on its last line, at the end of the file${eol ? " with a final newline" : ""}`, () => {
      const text = `/def -i z6 = /echo a%; /echo b%;${eol}`;
      expect(edited(text)).toBe(`/def -i z6 = \\\n    /echo a%;\\\n    /echo b%;${eol}`);
      expect(getDiagnostics(edited(text))).toEqual([]);
    });
  }

  it("keeps a body's final %; on its last line before the next command", () => {
    expect(edited("/def -i z = /echo a%; /echo b%;\n/echo next\n")).toBe("/def -i z = \\\n    /echo a%;\\\n    /echo b%;\n/echo next\n");
  });
});

describe("join", () => {
  it("joins the lines the way tf reads them, with one blank after each %;", () => {
    const text = ["/def -i a = \\", "    /let x=1%;\\", "    /if (x) \\", "        /echo yes%;\\", "    /endif", ""].join("\n");
    expect(apply(text)).toEqual(["Join /a's body onto one line\n/def -i a = /let x=1%; /if (x) /echo yes%; /endif"]);
  });

  it("keeps the first line's indentation and the head as written", () => {
    expect(apply("  /def -i -t\"x *\" a = \\\n      /echo a %; \\\n      /echo b\n")).toEqual([
      "Join /a's body onto one line\n  /def -i -t\"x *\" a = /echo a%; /echo b",
    ]);
  });

  it("names a body by what defines it", () => {
    expect(apply("/hook CONNECT = \\\n    /echo a\n")[0]?.split("\n")[0]).toBe("Join this hook's body onto one line");
    expect(apply("/def -i -t\"go *\" = \\\n    /echo a\n")[0]?.split("\n")[0]).toBe("Join this trigger's body onto one line");
  });

  it("is offered for a single statement on the line after the head", () => {
    expect(apply("/def -i a = \\\n    /echo only\n")).toEqual(["Join /a's body onto one line\n/def -i a = /echo only"]);
  });

  it("isn't offered across comment lines, which joining would delete", () => {
    expect(apply("/def -i a = \\\n    /echo a%;\\\n; a note\n    /echo b\n")).toEqual([]);
  });

  it("isn't offered when a later line has a tab after its indentation", () => {
    expect(apply("/def -i a = \\\n    /echo [\t]%;\\\n    /echo b\n")).toEqual([]);
  });

  // tf drops a command the file ends inside (proven 2026-10-14: no z1 was defined, with or
  // without the final newline), so joining it would define a macro tf never had.
  for (const eol of ["", "\n"]) {
    it(`isn't offered on an entry the file ends inside${eol ? ", final newline and all" : ""}`, () => {
      expect(apply(`/def -i z1 = /echo a%;\\\n    /echo b\\${eol}`)).toEqual([]);
    });
  }

  it("takes in a real blank line the last \\ continues onto, as tf does", () => {
    expect(apply("/def -i a = \\\n    /echo a%;\\\n\n/echo next\n")).toEqual(["Join /a's body onto one line\n/def -i a = /echo a%;"]);
  });

  for (const eol of ["", "\n"]) {
    it(`joins the file's last entry and keeps how the file ends${eol ? " (with a final newline)" : ""}`, () => {
      expect(edited(`/def -i z = \\\n    /echo a%;\\\n    /echo b${eol}`)).toBe(`/def -i z = /echo a%; /echo b${eol}`);
    });
  }

  it("only touches the entry the range is on", () => {
    const text = "/def -i a = \\\n    /echo a\n/def -i b = /echo a%; /echo b\n";
    expect(getRefactorActions(text, at(1)).map((a) => a.title)).toEqual(["Join /a's body onto one line"]);
    expect(getRefactorActions(text, at(2)).map((a) => a.title)).toEqual(["Split /b's body onto separate lines"]);
  });
});

describe("round trip", () => {
  const bodies = [
    "/def -i a = /let x=%1 %; /if (x == 1) /echo one%; /elseif (x == 2) /echo two%; /else /echo other%; /endif%; /echo x=[%x]",
    "/def -i w = /let i=0%; /while (i < 3) /test i += 1%; /echo %i%; /done",
    "/def -i v = /let v=$(/echo -e x%; /echo -e y) %; /echo v=[%v] s=[$(/echo inner%; /echo two)]",
    "/def -i s = /let v=a  b   %; /echo v=[%v]%; /set g=c d  %; /echo g=[%{g}]",
    "/def -i b = /let v=a\\\\%; /echo v=[%v]%; /echo w=[50%%;]",
    "/def -i n = /while (0) /echo never%; /done%; /if (1) /if (0) /echo x%; /else /echo nested%; /endif%; /endif",
    "/def -i e = /echo a%; /echo b%;",
  ];
  for (const body of bodies) {
    it(`splits and joins back to the same program: ${body.slice(0, 30)}`, () => {
      const [split] = getRefactorActions(`${body}\n`, ALL);
      const lines = split!.edits[0]!.newText;
      expect(sameProgram(body, rejoin(lines.split("\n")))).toBe(true);
      const [join] = getRefactorActions(`${lines}\n`, ALL);
      expect(join?.title).toMatch(/^Join \/\w's body onto one line$/);
      expect(sameProgram(body, join!.edits[0]!.newText)).toBe(true);
    });
  }

  it("tells different programs apart", () => {
    expect(sameProgram("/def a = /echo a%; /echo b", "/def a = /echo a %; /echo b")).toBe(true);
    expect(sameProgram("/def a = /echo a%; /echo b", "/def a = /echo a%%; /echo b")).toBe(false);
    expect(sameProgram("/def a = /echo a%; /echo b", "/def b = /echo a%; /echo b")).toBe(false);
    expect(sameProgram("/def a = /echo a b", "/def a = /echo a  b")).toBe(false);
  });
});
