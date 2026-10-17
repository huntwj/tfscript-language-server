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
  it("skips %%;, %%%;, brackets and quotes inside brackets", () => {
    expect(topLevelSeparators("/a%; /b %%; c%;d")).toEqual([2, 13]);
    expect(topLevelSeparators("/a %%%; /b%; /c")).toEqual([10]);
    expect(topLevelSeparators('/echo $[x%;y]%; %{a%;}%; $["]%;"]%; /b')).toEqual([13, 22, 33]);
  });

  it("counts no quote outside brackets, as tf reads none there", () => {
    // Real tf: `/echo "a%; /echo b"` is two /echos, and `say don't%; say it's ok` two sends.
    expect(topLevelSeparators('/echo "a%;b"%; c')).toEqual([8, 12]);
    expect(topLevelSeparators("say don't%; say it's ok%; /x")).toEqual([9, 23]);
  });

  it("opens no bracket at a bare [ or { in text, only after a $ or %", () => {
    // Real tf: `/echo [a%; /echo b]` is two /echos.
    expect(topLevelSeparators("/echo [a%; /echo {b%; c")).toEqual([8, 19]);
    expect(topLevelSeparators("/def -ib'^[x' = /k%; /y")).toEqual([18]);
    expect(topLevelSeparators("/x ${a%;}%; %{b%;}%; $[c%;]%; /y")).toEqual([9, 18, 27]);
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

  it("re-indents an already-split body, oddly indented, and joins the author's breaks inside a statement", () => {
    const text = lines("/def go = \\", "/while (i < 3) \\", "         /test ++i%;\\", "/done%;\\", "  /echo -p a \\", "long tail");
    expect(format(text)).toBe(lines("/def go = \\", "  /while (i < 3) \\", "    /test ++i%;\\", "  /done%;\\", "  /echo -p a long tail"));
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

  it("ends a split /def's head ` = \\` however it was spaced, and leaves the head's options as written", () => {
    expect(format("/def x=/a%;/b\n")).toBe(lines("/def x = \\", "  /a%;\\", "  /b"));
    expect(format("/def   x   =   /a%;/b\n")).toBe(lines("/def   x = \\", "  /a%;\\", "  /b"));
    expect(format("/def -i x\t=\\\n/a%;/b\n")).toBe(lines("/def -i x = \\", "  /a%;\\", "  /b"));
    // A body left on its line keeps its head as it is.
    expect(format("/def x=/a\n")).toBe("/def x=/a\n");
    expect(format('/def -p10 -mglob -t"a = b" -F h = /a%; /b\n')).toBe(lines('/def -p10 -mglob -t"a = b" -F h = \\', "  /a%;\\", "  /b"));
  });

  it("lays out /bind, /hook, /trig and /alias bodies too, and joins a nested /def that fits", () => {
    expect(format("/hook CONNECT = /a%; /b\n")).toBe(lines("/hook CONNECT = \\", "  /a%;\\", "  /b"));
    expect(format("/alias go /a %; /b\n")).toBe(lines("/alias go \\", "  /a%;\\", "  /b"));
    const text = lines("/def log = \\", "/if (c) \\", "/def -t'x' inner =\\", "/echo hi%;\\", "/endif");
    expect(format(text)).toBe(lines("/def log = \\", "  /if (c) \\", "    /def -t'x' inner =/echo hi%;\\", "  /endif"));
  });

  it("leaves a one-statement body on its line", () => {
    expect(format("/def go = /echo a b\n")).toBe("/def go = /echo a b\n");
  });

  it("keeps an entry's first line where it is, indented or not", () => {
    expect(format("/echo x\n  /def go = /echo a%; /echo b\n")).toBe("/echo x\n  /def go = \\\n  /echo a%;\\\n  /echo b\n");
  });
});

describe("formatText: long lines", () => {
  const widest = (text: string) => Math.max(...text.split("\n").map((l) => l.length));

  it("joins a one-statement macro that fits in 100 columns, and moves the body of one that doesn't", () => {
    expect(format(lines("/def -i idle_warn = \\", "    /echo -aCyellow You have been idle \\", "        for $[idle()] seconds."))).toBe(
      lines("/def -i idle_warn = /echo -aCyellow You have been idle for $[idle()] seconds."),
    );
    expect(format("/def -i idle_warn = /echo -aCyellow You have been idle for $[idle()] seconds, which is longer than allowed.\n")).toBe(
      lines("/def -i idle_warn = \\", "  /echo -aCyellow You have been idle for $[idle()] seconds, which is longer than allowed."),
    );
  });

  it("fills a head with as many options as fit, then hangs the rest four spaces in, a quoted value whole", () => {
    const head = "/def -i -F -p100 -mregexp -ag -c50 -w'wotmud' -T'diku' -t'^(\\w+) tells you, \\'(.*) and more text here\\'$' tell = /echo %{P1}%; /beep\n";
    expect(format(head)).toBe(
      lines("/def -i -F -p100 -mregexp -ag -c50 -w'wotmud' -T'diku' \\", "    -t'^(\\w+) tells you, \\'(.*) and more text here\\'$' tell = \\", "  /echo %{P1}%;\\", "  /beep"),
    );
  });

  it("breaks a condition before its own & or |, hanging four spaces past the /if", () => {
    expect(format("/def check_it = /if (hp_current < hp_max / 3 & !in_combat & target_name =~ \"\" & auto_heal_enabled & mana_current > 40) /cast heal%; /endif\n")).toBe(
      lines(
        "/def check_it = \\",
        "  /if (hp_current < hp_max / 3 & !in_combat & target_name =~ \"\" & auto_heal_enabled \\",
        "      & mana_current > 40) \\",
        "    /cast heal%;\\",
        "  /endif",
      ),
    );
  });

  it("refills text to 100 columns at blanks between words, after the command's options", () => {
    // lib/tf/kbfunc.tf's message, split by its author in three.
    const text = lines(
      "/def -i -ag -mregexp -h'NOMACRO ^key_' no_named_key_macro = \\",
      '    /echo -p %% The key "@{B}%PR@{n}" is undefined; \\',
      '\tyou may use "@{B}/def key_%PR = <commands>@{n}" to define it.  \\',
      '\tSee "@{B}/help keys@{n}".',
    );
    const out = format(text);
    expect(out).toBe(
      lines(
        "/def -i -ag -mregexp -h'NOMACRO ^key_' no_named_key_macro = \\",
        '  /echo -p %% The key "@{B}%PR@{n}" is undefined; you may use "@{B}/def key_%PR = <commands>@{n}" \\',
        '      to define it.  See "@{B}/help keys@{n}".',
      ),
    );
    expect(joined(out)).toEqual(joined(text));
  });

  it("never starts a line with a ; or #, which tf would skip as a comment", () => {
    const out = format("/def h = /echo aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee ffffffffff gggggggggg hhhhhhhhh #1 is here%; /x\n");
    expect(out).toBe(lines("/def h = \\", "  /echo aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee ffffffffff gggggggggg hhhhhhhhh #1 \\", "      is here%;\\", "  /x"));
    expect(out.split("\n").some((l) => /^\s*[;#]/.test(l))).toBe(false);
  });

  it("breaks a nested macro where its body starts, then after its own %%;", () => {
    const text =
      "/def outer = /def -i -p1 -n1 -w -mregexp -h'PROMPT login: *$$' ~detect_worldtype_telnet_${world_name} = /echo -e %%% This looks like a telnet world.%%; /addworld -Ttelnet ${world_name}%%; /set lp=1%%; /localecho on%; /x\n";
    const out = format(text);
    expect(out).toBe(
      lines(
        "/def outer = \\",
        "  /def -i -p1 -n1 -w -mregexp -h'PROMPT login: *$$' ~detect_worldtype_telnet_${world_name} = \\",
        "      /echo -e %%% This looks like a telnet world.%%; /addworld -Ttelnet ${world_name}%%; \\",
        "      /set lp=1%%; /localecho on%;\\",
        "  /x",
      ),
    );
    expect(widest(out)).toBeLessThanOrEqual(100);
  });

  it("decides whether a body fits on its head's line by the line as laid out, so formatting again changes nothing", () => {
    const a = "a".repeat(80);
    // Wider than 100 only for blanks the layout drops: kept on one line, without them.
    expect(format(`/def x =            /echo ${a}\n`)).toBe(`/def x = /echo ${a}\n`);
    expect(format(`/def x = /echo ${a}         %;\n`)).toBe(`/def x = /echo ${a}%;\n`);
  });

  it("fits a line of exactly 100 columns, and breaks one of 101", () => {
    const at = (n: number) => `/def x = /echo ${"w ".repeat(n)}end\n`;
    const hundred = at((100 - "/def x = /echo end".length) / 2);
    expect(hundred.length - 1).toBe(100);
    expect(format(hundred)).toBe(hundred);
    const over = hundred.replace("end", "endx");
    expect(format(over).split("\n").length).toBeGreaterThan(2);
    expect(widest(format(over))).toBeLessThanOrEqual(100);
  });

  it("doesn't cut a command off from one long word it can't break", () => {
    const text = `/def x = /echo ${"a".repeat(95)}%; /y\n`;
    expect(format(text)).toBe(lines("/def x = \\", `  /echo ${"a".repeat(95)}%;\\`, "  /y"));
  });

  it("hangs a line after a %| at the statement it starts, as wide as it was measured", () => {
    const words = Array.from({ length: 17 }, (_, i) => `w${String(i).padStart(3, "0")}`).join(" ");
    const out = format(`/def x = /echo ${words} %| w000 w001 w002 w003 w004%; /y\n`);
    expect(widest(out)).toBeLessThanOrEqual(100);
    expect(joined(out)).toEqual(joined(`/def x = /echo ${words} %| w000 w001 w002 w003 w004%;/y\n`));
  });

  it("leaves a statement with nowhere to break long, and an entry with a comment line as its author broke it", () => {
    const set = "/def s = /set list=aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp qqqq rrrr%; /x\n";
    expect(format(set)).toBe(lines("/def s = \\", "  /set list=aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp qqqq rrrr%;\\", "  /x"));
    expect(format(lines("/def c = \\", "; a comment", "/echo a \\", "b%;\\", "/x"))).toBe(lines("/def c = \\", "  ; a comment", "  /echo a \\", "      b%;\\", "  /x"));
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

  it("splits text with an apostrophe in it, which tf reads as no quote", () => {
    expect(format("/def go = say don't%; /b\n")).toBe(lines("/def go = \\", "  say don't%;\\", "  /b"));
  });

  it("only re-indents a body where a bracket in its text leaves a %; uncertain", () => {
    expect(format("/def go = say :-(%; /b\n")).toBe("/def go = say :-(%; /b\n");
    expect(format("/def go = \\\nsay :-(%; /b\n")).toBe("/def go = \\\n  say :-(%; /b\n");
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

  it("leaves a plain command's continuation lines as the author indented them", () => {
    expect(format(lines("/set greeting=hello \\", "      there"))).toBe(lines("/set greeting=hello \\", "      there"));
    // Nested /for lines (tf's color.tf) read better as written than flattened to one level.
    const text = lines("/for i 0 2 \\", "\t/set a%%%{i}=\\", "\t\tx%%%; \\", "/set b%%%{i}=y");
    expect(format(text)).toBe(text);
  });
});

describe("formatText: an entry with a comment or blank line among its lines", () => {
  const reindented = (text: string) => formatDocument(text).entries.filter((e) => e.reindentOnly).length;

  it("is re-indented only: no text moves, and no statement is split", () => {
    const text = lines("/def go = \\", "      /a%; /b%;\\", ";; note", "        /c");
    expect(format(text)).toBe(lines("/def go = \\", "  /a%; /b%;\\", "  ;; note", "  /c"));
    expect(reindented(text)).toBe(1);
  });

  it("keeps a comment straight after the head in the body", () => {
    expect(format(lines("/def go = \\", ";   explained here", "    /a%;\\", "    /b"))).toBe(lines("/def go = \\", "  ;   explained here", "  /a%;\\", "  /b"));
  });

  it("re-indents the comment lines of a body whose code is laid out already", () => {
    expect(format(lines("/def qzf=\\", "  /echo -- F1%;\\", "# c \\", "  /echo -- F2"))).toBe(lines("/def qzf=\\", "  /echo -- F1%;\\", "  # c \\", "  /echo -- F2"));
  });

  it("leaves a plain top-level command's comment lines where they are", () => {
    const text = lines("/set greeting=hello \\", "; why", "      there");
    expect(format(text)).toBe(text);
  });

  it("keeps a comment before /endif inside its /else branch (map-helper.tf)", () => {
    const text = lines("/def go = \\", "    /if (x) \\", ";        /echo Unknown%;\\", "        /test ++n%;\\", "    /else \\", ";        /echo Known.%;\\", "    /endif");
    expect(format(text)).toBe(
      lines("/def go = \\", "  /if (x) \\", "    ;        /echo Unknown%;\\", "    /test ++n%;\\", "  /else \\", "    ;        /echo Known.%;\\", "  /endif"),
    );
  });

  it("keeps a blank line that ends the entry, and its line's final \\", () => {
    const text = lines("/def a = \\", "    /let x=1%;\\", "    /result x%;\\", "", "/def b = /echo");
    expect(format(text)).toBe(lines("/def a = \\", "  /let x=1%;\\", "  /result x%;\\", "", "/def b = /echo"));
  });

  it("joins back to the same text tf reads", () => {
    const text = lines("/def go = \\", "\t/if (x) \\", "; one", "# two", "\t\t/a%; \\", "\t/endif");
    expect(joined(format(text))).toEqual(joined(text));
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

  it("a document holding U+FFFD, which a byte that wasn't UTF-8 became when the file was read", () => {
    // A Latin-1 file opened as UTF-8: an edit anywhere would get it saved with EF BF BD bytes.
    const text = "/def a = /x%; /y\n/def go = /echo caf\uFFFD%; /echo b\n";
    expect(formatText(text)).toEqual([]);
    expect(formatDocument(text).replacement).toBe(true);
  });

  it("a file with CRLF line endings, where \\ continues nothing", () => {
    expect(format("/def go = /a%; /b\r\n")).toBe("/def go = /a%; /b\r\n");
    expect(formatDocument("/def go = /a%; /b\r\n").crlf).toBe(true);
  });

  it("comment lines", () => {
    expect(format(";; /def go = /a%; /b\n")).toBe(";; /def go = /a%; /b\n");
  });

  it("but a keyword is at home in a command whose text is commands", () => {
    expect(format("/def go = /eval /if (1) /echo a%%; /endif%; /echo b\n")).toBe(lines("/def go = \\", "  /eval /if (1) /echo a%%; /endif%;\\", "  /echo b"));
  });

  it("but not over several lines, whose author indented the inner blocks", () => {
    // stdlib.tf's /for: one hanging level would flatten the /while inside the /eval.
    unchanged(lines("/def -i for = \\", "    /@eval \\", "        /while (x) \\", "            /y%%; \\", "        /done"), "keyword-mid-statement");
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

  it("leaves out the line a selection of whole lines ends at the start of", () => {
    const text = lines("/def a = /x%; /y", "/def b = /x%; /y");
    const edits = formatText(text, {}, { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } });
    expect(applyFormatEdits(text, edits)).toBe(lines("/def a = \\", "  /x%;\\", "  /y", "/def b = /x%; /y"));
    // A selection that starts and ends on that line is still that line's.
    expect(formatText(text, {}, { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } })).toHaveLength(1);
  });
});
