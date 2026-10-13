import { describe, expect, it } from "vitest";
import { formatText, topLevelSeparators, type FormatOptions } from "../src/formatting";
import { splitLogicalEntries } from "../src/logicalEntries";

const OPTIONS: FormatOptions = { indent: "    ", splitStatements: true };

/** Applies the edits (bottom-up, whole lines) and returns the new text. */
function format(text: string, options: Partial<FormatOptions> = {}): string {
  const lines = text.split("\n");
  const edits = formatText(text, { ...OPTIONS, ...options });
  for (const e of [...edits].reverse()) {
    lines.splice(e.range.start.line, e.range.end.line - e.range.start.line + 1, ...e.newText.split("\n"));
  }
  return lines.join("\n");
}

const joined = (text: string) => splitLogicalEntries(text).map((e) => e.text);

describe("topLevelSeparators", () => {
  it("skips %%;, %%%;, quotes and brackets", () => {
    expect(topLevelSeparators("/a%; /b %%; c%;d")).toEqual([2, 13]);
    expect(topLevelSeparators("/a %%%; /b%; /c")).toEqual([10]);
    expect(topLevelSeparators('/echo "a%;b"%; $[x%;y]%; %{a%;}')).toEqual([12, 22]);
  });
});

describe("formatText", () => {
  it("splits a /def body's statements onto %;\\ lines", () => {
    expect(format("/def go = /echo a %; /echo b%;/echo c\n")).toBe(
      ["/def go = \\", "    /echo a%;\\", "    /echo b%;\\", "    /echo c", ""].join("\n"),
    );
  });

  it("indents /if children one more level, lining /else and /endif up with the /if", () => {
    expect(format("/def -i go = /if (x) /echo a%; /echo b%; /elseif (y) /echo c%; /else /echo d%; /endif%; /echo e\n")).toBe(
      [
        "/def -i go = \\",
        "    /if (x) \\",
        "        /echo a%;\\",
        "        /echo b%;\\",
        "    /elseif (y) \\",
        "        /echo c%;\\",
        "    /else \\",
        "        /echo d%;\\",
        "    /endif%;\\",
        "    /echo e",
        "",
      ].join("\n"),
    );
  });

  it("re-indents an already-split body and keeps the author's own breaks", () => {
    const text = ["/def go = \\", "/while (i < 3) \\", "/test ++i%;\\", "/done%;\\", "  /echo -p a \\", "long tail", ""].join("\n");
    expect(format(text)).toBe(
      ["/def go = \\", "    /while (i < 3) \\", "        /test ++i%;\\", "    /done%;\\", "    /echo -p a \\", "        long tail", ""].join("\n"),
    );
  });

  it("indents the children of a top-level /if one level, without splitting top-level %;", () => {
    const text = ["/if (1) \\", "/echo a%;\\", "/echo b%;\\", "/endif", "/let v=cd %; /echo x", ""].join("\n");
    expect(format(text)).toBe(["/if (1) \\", "    /echo a%;\\", "    /echo b%;\\", "/endif", "/let v=cd %; /echo x", ""].join("\n"));
  });

  it("only changes whitespace tf ignores: the joined text is the same up to space beside %;", () => {
    const text = "/def go = /if (x) /echo a %; /else /send hi   there %; /endif %; /echo  end  \n";
    const before = joined(text)[0] as string;
    const after = joined(format(text))[0] as string;
    expect(after).toBe(before.replace(/\s*%;\s*/g, "%;"));
  });

  it("leaves one-statement bodies, the first line's indentation, comments and CRLF files alone", () => {
    expect(format("/def go = /echo a b\n")).toBe("/def go = /echo a b\n");
    expect(format("/echo x\n  /def go = /echo a%; /echo b\n")).toBe("/echo x\n  /def go = \\\n    /echo a%;\\\n    /echo b\n");
    expect(format(";; /def go = /a%; /b\n")).toBe(";; /def go = /a%; /b\n");
    expect(format("/def go = /a%; /b\r\n")).toBe("/def go = /a%; /b\r\n");
  });

  it("does not split what isn't a separator, or text that would become a comment line", () => {
    expect(format("/def go = /echo don't%; /b\n")).toBe("/def go = /echo don't%; /b\n");
    expect(format("/def go = /a%; ;not a comment\n")).toBe("/def go = /a%; ;not a comment\n");
  });

  it("keeps comment lines inside a continuation, re-indenting only", () => {
    const text = ["/def go = \\", "/a%;\\", ";; note", "/b", ""].join("\n");
    expect(format(text)).toBe(["/def go = \\", "    /a%;\\", ";; note", "    /b", ""].join("\n"));
  });

  it("keeps a final %;\\ that continues onto a blank line, and the blank line", () => {
    const text = ["/def a = \\", "/let x=1%;\\", "/result x%;\\", "", "/def b = /echo", ""].join("\n");
    expect(format(text)).toBe(["/def a = \\", "    /let x=1%;\\", "    /result x%;\\", "", "/def b = /echo", ""].join("\n"));
  });

  it("hangs a nested /def's body, and starts an /alias body at one level", () => {
    const text = ["/def log = \\", "/if (c) \\", "/def -t'x' inner =\\", "/echo hi%;\\", "/endif", "/alias go \\", "/a %;\\", "/b", ""].join("\n");
    expect(format(text)).toBe(
      ["/def log = \\", "    /if (c) \\", "        /def -t'x' inner =\\", "            /echo hi%;\\", "    /endif", "/alias go \\", "    /a%;\\", "    /b", ""].join(
        "\n",
      ),
    );
  });

  it("keeps a /while list /do or /if list /then condition on one line", () => {
    expect(format("/def go = /while /shift%; /@test {#} > 1%; /do /echo %1%; /done\n")).toBe(
      ["/def go = \\", "    /while /shift%; /@test {#} > 1%; /do \\", "        /echo %1%;\\", "    /done", ""].join("\n"),
    );
    expect(format("/def go = /if /test x%; /then /a%; /b%; /endif\n")).toBe(
      ["/def go = \\", "    /if /test x%; /then \\", "        /a%;\\", "        /b%;\\", "    /endif", ""].join("\n"),
    );
  });

  it("leaves a top-level entry that isn't a block exactly as written", () => {
    const text = ["/for i 0 2 \\", "\t/set a%%%{i}=\\", "\t\tx%%%; \\", "/set b%%%{i}=y", ""].join("\n");
    expect(format(text)).toBe(text);
  });

  it("leaves an entry alone when a tab follows a line's indentation (tf expands it by column)", () => {
    const text = ["/def q = \\", "  /setenv p=\\", "      /x[ \t]*/%; /echo", ""].join("\n");
    expect(format(text)).toBe(text);
    // Tabs used as indentation are fine: they become spaces that are stripped.
    expect(format("/def q = \\\n\t/a%;\\\n\t/b\n")).toBe("/def q = \\\n    /a%;\\\n    /b\n");
  });

  it("can re-indent without splitting", () => {
    expect(format("/def go = /a%; /b\n", { splitStatements: false })).toBe("/def go = /a%; /b\n");
    expect(format("/def go = \\\n/a%; /b\n", { splitStatements: false })).toBe("/def go = \\\n    /a%; /b\n");
  });
});
