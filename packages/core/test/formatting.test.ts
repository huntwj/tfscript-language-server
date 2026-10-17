import { describe, expect, it } from "vitest";
import { applyFormatEdits, formatDocument, formatText, normalise, topLevelSeparators, type FormatOptions } from "../src/formatting";
import { splitLogicalEntries } from "../src/logicalEntries";

/** The text formatted, checking on the way that formatting it again changes nothing. */
function format(text: string, options: Partial<FormatOptions> = {}): string {
  const once = applyFormatEdits(text, formatText(text, options));
  expect(applyFormatEdits(once, formatText(once, options)), "formatting twice changes nothing").toBe(once);
  return once;
}

const lines = (...l: string[]) => [...l, ""].join("\n");
const joined = (text: string) => splitLogicalEntries(text).map((e) => e.text);
const refusals = (text: string) => formatDocument(text).entries.map((e) => e.refused ?? (e.changed ? "changed" : "same"));

describe("topLevelSeparators", () => {
  it("skips %%;, %%%;, quotes and brackets", () => {
    expect(topLevelSeparators("/a%; /b %%; c%;d")).toEqual([2, 13]);
    expect(topLevelSeparators("/a %%%; /b%; /c")).toEqual([10]);
    expect(topLevelSeparators('/echo "a%;b"%; $[x%;y]%; %{a%;}')).toEqual([12, 22]);
  });
});

describe("normalise", () => {
  it("drops the blanks beside a body's %;, but not ones that keep it from gluing to a %, \\, $ or /", () => {
    expect(normalise("/def x = /a %;  /b", 8)).toBe("/def x = /a%;/b");
    expect(normalise("/def x = /echo 50% %; /b", 8)).toBe("/def x = /echo 50% %;/b");
    expect(normalise("/def x = /echo a\\ %; /b", 8)).toBe("/def x = /echo a\\ %;/b");
  });
});

describe("formatText: the style", () => {
  it("puts a /def body on the lines after `= \\`, one statement each, the last with no %;", () => {
    expect(format("/def my_fn = /echo 1%; /echo 2\n")).toBe(lines("/def my_fn = \\", "  /echo 1%;\\", "  /echo 2"));
  });

  it("lays out /if blocks the way targeting.tf does", () => {
    expect(format('/def do_kill = /set target=%{1-%{target}}%; /if (target =~ "") /echo No target set (yet)%; /return%; /endif%; kill %{target}\n')).toBe(
      lines(
        "/def do_kill = \\",
        "  /set target=%{1-%{target}}%;\\",
        '  /if (target =~ "") \\',
        "    /echo No target set (yet)%;\\",
        "    /return%;\\",
        "  /endif%;\\",
        "  kill %{target}",
      ),
    );
  });

  it("indents nested blocks one more level each, lining /elseif, /else, /endif and /done up with their keyword", () => {
    expect(format("/def -i go = /while (i < 3) /if (x) /echo a%; /elseif (y) /echo b%; /else /if (z) /echo c%; /endif%; /endif%; /test ++i%; /done%; /echo e\n")).toBe(
      lines(
        "/def -i go = \\",
        "  /while (i < 3) \\",
        "    /if (x) \\",
        "      /echo a%;\\",
        "    /elseif (y) \\",
        "      /echo b%;\\",
        "    /else \\",
        "      /if (z) \\",
        "        /echo c%;\\",
        "      /endif%;\\",
        "    /endif%;\\",
        "    /test ++i%;\\",
        "  /done%;\\",
        "  /echo e",
      ),
    );
  });

  it("re-indents an already-split body, oddly indented, and keeps the author's breaks inside a statement", () => {
    const text = lines("/def go = \\", "/while (i < 3) \\", "         /test ++i%;\\", "/done%;\\", "  /echo -p a \\", "long tail");
    expect(format(text)).toBe(lines("/def go = \\", "  /while (i < 3) \\", "    /test ++i%;\\", "  /done%;\\", "  /echo -p a \\", "    long tail"));
  });

  it("keeps a /while list /do or /if list /then condition on one line", () => {
    expect(format("/def go = /while /shift%; /@test {#} > 1%; /do /echo %1%; /done\n")).toBe(
      lines("/def go = \\", "  /while /shift%; /@test {#} > 1%; /do \\", "    /echo %1%;\\", "  /done"),
    );
    expect(format("/def go = /if /test x%; /then /a%; /b%; /endif\n")).toBe(lines("/def go = \\", "  /if /test x%; /then \\", "    /a%;\\", "    /b%;\\", "  /endif"));
  });

  it("keeps a body's final %; on its last line", () => {
    expect(format("/def go = /a%; /b%; \n")).toBe(lines("/def go = \\", "  /a%;\\", "  /b%;"));
  });

  it("gives `/def x=body` the blank of `= \\`, and leaves the head's options as written", () => {
    expect(format("/def x=/a%;/b\n")).toBe(lines("/def x= \\", "  /a%;\\", "  /b"));
    expect(format('/def -p10 -mglob -t"a = b" -F h = /a%; /b\n')).toBe(lines('/def -p10 -mglob -t"a = b" -F h = \\', "  /a%;\\", "  /b"));
  });

  it("lays out /bind, /hook, /trig and /alias bodies too, and hangs a nested /def's body", () => {
    expect(format("/hook CONNECT = /a%; /b\n")).toBe(lines("/hook CONNECT = \\", "  /a%;\\", "  /b"));
    expect(format("/alias go /a %; /b\n")).toBe(lines("/alias go \\", "  /a%;\\", "  /b"));
    const text = lines("/def log = \\", "/if (c) \\", "/def -t'x' inner =\\", "/echo hi%;\\", "/endif");
    expect(format(text)).toBe(lines("/def log = \\", "  /if (c) \\", "    /def -t'x' inner =\\", "      /echo hi%;\\", "  /endif"));
  });

  it("leaves a one-statement body on its line", () => {
    expect(format("/def go = /echo a b\n")).toBe("/def go = /echo a b\n");
  });

  it("keeps an entry's first line where it is, indented or not", () => {
    expect(format("/echo x\n  /def go = /echo a%; /echo b\n")).toBe("/echo x\n  /def go = \\\n  /echo a%;\\\n  /echo b\n");
  });
});

describe("formatText: only whitespace tf ignores changes", () => {
  it("drops only the blanks beside a body's %; separators", () => {
    const text = "/def go = /if (x) /echo a %; /else /send hi   there %; /endif %; /echo  end  \n";
    expect(joined(format(text))).toEqual([(joined(text)[0] as string).replace(/\s*%;\s*/g, "%;")]);
  });

  it("keeps the blanks that stop a %; gluing to a % or \\ before it", () => {
    expect(format("/def x = /echo 50% %; /echo b\n")).toBe(lines("/def x = \\", "  /echo 50% %;\\", "  /echo b"));
    expect(format("/def x = /echo a\\ %; /echo b\n")).toBe(lines("/def x = \\", "  /echo a\\ %;\\", "  /echo b"));
  });

  it("doesn't touch a %; inside a string or brackets of an expression, or inside $(...)", () => {
    expect(format('/def x = /if ("a%;  b" =~ x) /echo $[strlen("c%;  d")]%; /endif\n')).toBe(
      lines("/def x = \\", '  /if ("a%;  b" =~ x) \\', '    /echo $[strlen("c%;  d")]%;\\', "  /endif"),
    );
    expect(format("/def x = /echo $(/a%;  /b)%; /c\n")).toBe(lines("/def x = \\", "  /echo $(/a%;  /b)%;\\", "  /c"));
  });

  it("only re-indents a body whose quotes leave a %; uncertain", () => {
    expect(format("/def go = say don't%; /b\n")).toBe("/def go = say don't%; /b\n");
    expect(format("/def go = \\\nsay don't%; /b\n")).toBe("/def go = \\\n  say don't%; /b\n");
  });

  it("doesn't split %%; or %|", () => {
    expect(format("/def go = /a%%; /b%; /c %| /d\n")).toBe(lines("/def go = \\", "  /a%%; /b%;\\", "  /c %| /d"));
  });

  it("never makes a statement into a comment line", () => {
    expect(format("/def go = /a%; ;not a comment\n")).toBe("/def go = /a%; ;not a comment\n");
  });
});

describe("formatText: top-level commands", () => {
  it("indents the children of a top-level /if one level, without splitting top-level %;", () => {
    const text = lines("/if (1) \\", "/echo a%;\\", "/echo b%;\\", "/endif", "/let v=cd %; /echo x");
    expect(format(text)).toBe(lines("/if (1) \\", "  /echo a%;\\", "  /echo b%;\\", "/endif", "/let v=cd %; /echo x"));
  });

  it("re-indents a plain command's continuation lines, changing nothing else", () => {
    expect(format(lines("/set greeting=hello \\", "      there"))).toBe(lines("/set greeting=hello \\", "  there"));
  });
});

describe("formatText: what it leaves exactly as written", () => {
  const unchanged = (text: string, reason: string) => {
    expect(format(text)).toBe(text);
    expect(refusals(text)).toContain(reason);
  };

  it("an unbalanced /if, a keyword in the middle of a statement, or an empty statement", () => {
    // An error diagnostic as well, which is what stops it first.
    unchanged("/def go = /if (x) /echo a%; /echo b\n", "error");
    unchanged("/def go = /if (x) /echo a /else /echo b%; /endif%; /c\n", "keyword-mid-statement");
    unchanged("/def go = /if (1) /set a=1 /else /set b=2%; /endif%; /c\n", "structure");
    unchanged("/def go = /a%;%; /b\n", "structure");
  });

  it("a comment or blank line among an entry's lines", () => {
    unchanged(lines("/def go = \\", "/a%;\\", ";; note", "/b"), "comment");
    unchanged(lines("/def a = \\", "/let x=1%;\\", "/result x%;\\", "", "/def b = /echo"), "blank-line");
  });

  it("a %\\, or a \\ followed by blanks", () => {
    unchanged("/def go = /echo a%; /echo b%\\\n", "percent-backslash");
    unchanged("/def go = /echo a%; /echo b\\ \n", "space-after-backslash");
  });

  it("a tab after a line's indentation, which tf expands by column", () => {
    unchanged(lines("/def q = \\", "  /setenv p=\\", "      /x[ \t]*/%; /echo"), "tab");
    // Tabs used as indentation are fine: they become spaces that are stripped.
    expect(format("/def q = \\\n\t/a%;\\\n\t/b\n")).toBe("/def q = \\\n  /a%;\\\n  /b\n");
  });

  it("an entry with an error diagnostic", () => {
    unchanged("/def if = /echo a%; /echo b\n", "error");
  });

  it("a command the file ends in the middle of", () => {
    unchanged("/def go = /a%; /b%;\\\n", "incomplete");
  });

  it("a file with CRLF line endings, where \\ continues nothing", () => {
    expect(format("/def go = /a%; /b\r\n")).toBe("/def go = /a%; /b\r\n");
    expect(formatDocument("/def go = /a%; /b\r\n").crlf).toBe(true);
  });

  it("comment lines, and a top-level command's text", () => {
    expect(format(";; /def go = /a%; /b\n")).toBe(";; /def go = /a%; /b\n");
    // Only the continuation lines move (tabs as indentation are stripped all the same).
    const text = lines("/for i 0 2 \\", "\t/set a%%%{i}=\\", "\t\tx%%%; \\", "/set b%%%{i}=y");
    expect(format(text)).toBe(lines("/for i 0 2 \\", "  /set a%%%{i}=\\", "  x%%%; \\", "  /set b%%%{i}=y"));
  });
});

describe("formatText: options", () => {
  it("takes the indentation width", () => {
    expect(format("/def go = /if (x) /a%; /endif\n", { indentWidth: 4 })).toBe(lines("/def go = \\", "    /if (x) \\", "        /a%;\\", "    /endif"));
  });

  it("can re-indent without splitting", () => {
    expect(format("/def go = /a%; /b\n", { splitStatements: false })).toBe("/def go = /a%; /b\n");
    expect(format("/def go = \\\n/a%; /b\n", { splitStatements: false })).toBe("/def go = \\\n  /a%; /b\n");
  });

  it("formats only the entries a range touches", () => {
    const text = lines("/def a = /x%; /y", "/def b = /x%; /y");
    const edits = formatText(text, {}, { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } });
    expect(applyFormatEdits(text, edits)).toBe(lines("/def a = /x%; /y", "/def b = \\", "  /x%;\\", "  /y"));
  });
});
