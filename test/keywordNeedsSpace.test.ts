import { describe, expect, it } from "vitest";
import { getCodeActions } from "../src/codeActions";
import { getDiagnostics } from "../src/diagnostics";

const CODE = "keyword-needs-space";
const all = (text: string) => getDiagnostics(`${text}\n`);
const first = (text: string) => all(text).find((d) => d.code === CODE);

function applyEdits(text: string, edits: { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[]): string {
  const lines = text.split("\n");
  for (const e of [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character)) {
    const line = lines[e.range.start.line] ?? "";
    lines[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return lines.join("\n");
}

// Proven in tf dev, 2026-10-14 (scratchpad s4/g1.tf): "if(1): no such command or macro" at the
// top level, "unexpected /ENDIF in outer block" in a body, "else/echo: no such command or macro",
// and with one @, "if(1): not a builtin command". Every fix applied there runs as meant.
describe("keyword-needs-space", () => {
  it("reports a keyword glued to a ( and offers the blank, alone on the line", () => {
    const text = "/if(1) /echo a%; /echo b%; /endif";
    expect(all(text).map((d) => d.code)).toEqual([CODE]);
    const d = first(text)!;
    expect(d.severity).toBe("error");
    expect(d.message).toBe("tf reads /if(1) as a command named if(1), not as /if: put a space after /if.");
    const fixed = applyEdits(`${text}\n`, d.fix!.edits);
    expect(fixed).toBe("/if (1) /echo a%; /echo b%; /endif\n");
    expect(getDiagnostics(fixed)).toEqual([]);
  });

  it("notes the stray keyword it leaves in a body, rather than reporting it too", () => {
    const text = "/def g = /if(1) /echo a%; /endif%; /echo end";
    expect(all(text).map((d) => d.code)).toEqual([CODE]);
    expect(first(text)?.related?.map((r) => r.message)).toEqual(["this /endif, left with no /if to close"]);
    expect(all("/def g = /set i=0%; /while(i < 2) /test i:=i+1%; /done").map((d) => d.code)).toEqual([CODE]);
    // A glued closer leaves its block open.
    expect(all("/def g = /if (1) /echo a%; /endif/echo b").map((d) => d.code)).toEqual([CODE]);
  });

  it("puts %; after a glued /endif, /done or /break, which end their statement", () => {
    const d = first("/def g = /if (1) /echo a%; /endif/echo b")!;
    expect(d.message).toBe("tf reads /endif/echo as a command named endif/echo, not as /endif: put %; after /endif.");
    expect(applyEdits("/def g = /if (1) /echo a%; /endif/echo b\n", d.fix!.edits)).toBe("/def g = /if (1) /echo a%; /endif%; /echo b\n");
    expect(first("/def g = /if (1) /echo a%; /else/echo b%; /endif")?.fix?.title).toBe("Put a space after /else");
  });

  // rev-s4g u5, proven in tf (s4/ue.tf): /else/echo is no /else, so the /endif closes the /if and the
  // /while has no /done ("expected /done"); with the space and a /done, it runs clean.
  it("reports /else/echo in a /while, and the /while's missing /done", () => {
    const found = all("/def g = /while (0) /if (0) /echo a%; /else/echo b%; /endif");
    expect(found.map((d) => `${d.code}: ${d.message} [${d.fix?.title}]`)).toEqual([
      "block-structure: This /while has no /done. [Add %; /done at the end of the body]",
      `${CODE}: tf reads /else/echo as a command named else/echo, not as /else: put a space after /else. [Put a space after /else]`,
    ]);
  });

  // rev-s4g e1, proven in tf (s4/ue.tf): an /endif cut off from its \ by a blank still closes nothing
  // ("expected /endif"), and no "Add %; /endif" is offered, which would leave the stray \ behind it.
  it("offers no closer for an /endif followed by a \\ and a blank", () => {
    const found = getDiagnostics("/set i=0\n/def g = /while (i<3) /test ++i%; /if (1) /echo %% x%; /endif\\ \n");
    expect(found.map((d) => `${d.code}: ${d.message} [${d.fix?.title}]`)).toEqual([
      "backslash-not-last: This \\ doesn't continue the line, because whitespace follows it: remove the whitespace. [Remove the whitespace after the \\]",
      "block-structure: This /if has no /endif. [undefined]",
    ]);
  });

  it("names the builtin lookup for /@if(", () => {
    expect(first("/@if(1) /echo a%; /@endif")?.message).toBe("tf reads /@if(1) as the builtin command if(1), not as /if: put a space after /if.");
  });

  it("offers no blank where the %; after the condition would send a blank line", () => {
    const d = first("/while(0)%; /done");
    expect(d?.message).toBe("tf reads /while(0) as a command named while(0), not as /while: put a space after /while, and a command between the (0) and the %;.");
    expect(d?.fix).toBeUndefined();
    // rev-s4g x8, proven in tf: the advice followed runs.
    expect(first("/def g = /if(1)%; /echo a%; /endif")?.message).toBe(
      "tf reads /if(1) as a command named if(1), not as /if: put a space after /if, and a command between the (1) and the %;.",
    );
  });

  it("leaves a macro whose name only starts with a keyword alone", () => {
    expect(all("/def ifx = /echo x%; /ifx%; /if_x%; /done1")).toEqual([]);
  });

  // Review of step 4 (rev-s4 s09, s10, s16), proven in tf.
  it("offers no blank for /else(, /then( or /do(, which take no condition", () => {
    const d = first("/def s10 = /if (0) /echo a%; /else(1) /echo b%; /endif")!;
    expect(d.message).toBe("tf reads /else(1) as a command named else(1), not as /else: did you mean /elseif (1)?");
    expect(d.fix).toBeUndefined();
    const e = first("/def s16 = /while (0) /echo x%; /do(1) /echo y%; /done")!;
    expect(e.message).toBe("tf reads /do(1) as a command named do(1), not as /do: /do takes no (condition).");
    expect(e.fix).toBeUndefined();
  });

  it("warns about /endif; as one word, which may be a macro's name, and offers no fix", () => {
    // tf: "expected /endif, found end", which block-structure reports; an "Add %; /endif" would
    // leave endif; to fail when it runs, so it has no fix.
    const found = all("/def s09 = /if (1) /echo a%; /endif;");
    expect(found.map((d) => `${d.code}:${d.severity}`)).toEqual(["block-structure:error", `${CODE}:warning`]);
    expect(found.every((d) => d.fix === undefined)).toBe(true);
    expect(found[1]?.message).toBe(
      "tf reads /endif; as a command named endif;, not as /endif: unless a macro named endif; is defined elsewhere, take the ; away or put a blank before it.",
    );
  });

  // Review of step 4 (rev-s4b g2), proven in tf: these are macros, and run.
  it("leaves a keyword glued to punctuation alone where the file defines that macro", () => {
    const text = "/def done:x = /echo a\n/def if!x = /echo b\n/def then? = /echo c\n/def g31 = /done:x%; /if!x%; /then?\n";
    expect(getDiagnostics(text)).toEqual([]);
    // With one @, tf looks for a builtin, which no /def makes.
    expect(all("/def done:x = /echo a\n/def g = /@done:x").map((d) => d.code)).toEqual([CODE]);
  });

  // Third review of step 4 (rev-s4c c82, c86, c95), proven in tf: only a /def tf makes counts.
  it("counts only the /defs tf makes: not a comment, an /echo's text, or one after the load aborts", () => {
    expect(all("; /def if!y = /echo a\n/def c82 = /if!y").map((d) => d.code)).toEqual([CODE]);
    expect(all("/echo /def else:k = /echo a\n/def c86 = /else:k").map((d) => d.code)).toEqual([CODE]);
    expect(all("/def c95 = /done:z\nnot a command\n/def done:z = /echo a").map((d) => d.code)).toEqual([CODE, "not-a-command"]);
  });

  // Proven in tf, 2026-10-15 (scratchpad s4/j1.tf, j3.tf, j4.tf): tf reads the joined /endif/def as
  // one command, so the /if never closes. Both fixes are offered, the likelier one first.
  describe("a keyword glued on by a line join", () => {
    const whole = { start: { line: 0, character: 0 }, end: { line: 9, character: 0 } };
    const titles = (text: string) => getCodeActions(text, whole).map((a) => `${a.title}${a.preferred ? " (preferred)" : ""}`);
    const keep = "Put %; before the \\ on line 1";
    const split = "Remove the \\ at the end of line 1";

    it("says both readings", () => {
      const [d] = getDiagnostics("/def g = /if (1) /echo a%; /endif\\\n/def h = /echo b\n");
      expect(d?.message).toBe("Line 1 ends in \\, so tf joins the next line on and reads /endif/def as one command: put %; before the \\, or remove the \\.");
    });

    it("puts removing the \\ first before a column-0 /def, even in a macro body", () => {
      expect(titles("/def g = /if (1) /echo a%; /endif\\\n/def h = /echo b\n")).toEqual([`${split} (preferred)`, keep]);
    });

    it("puts the %; first before an indented line, which reads as part of the body", () => {
      expect(titles("/def g = /if (1) /echo a%; /endif\\\n    /echo b\n")).toEqual([`${keep} (preferred)`, split]);
    });

    it("puts the %; first where the chain carries on past the next line, or a body goes on", () => {
      expect(titles("/def g = /if (1) /echo a%; /endif\\\n/echo b%;\\\n/echo c\n")).toEqual([`${keep} (preferred)`, split]);
      expect(titles("/def g = /if (1) /echo a%; /endif\\\n/echo b\n")).toEqual([`${keep} (preferred)`, split]);
    });

    it("puts removing the \\ first at the top level, where the next line is a command of its own", () => {
      expect(titles("/if (1) /echo a%; /endif\\\n/echo b\n")).toEqual([`${split} (preferred)`, keep]);
    });

    // rev-s4d c1, c5, a3, proven in tf: a comment line inside a continuation is skipped, so the line
    // joined on is the next one that isn't a comment.
    it("joins on the next line that isn't a comment", () => {
      const c1 = "/def g = /if (1) /echo a%; /endif\\\n; comment\n/def h = /echo b\n";
      expect(getDiagnostics(c1)[0]?.message).toContain("reads /endif/def as one command");
      expect(titles(c1)).toEqual([`${split} (preferred)`, keep]);
      const c5 = "/def g = /if (1) /echo a%; /endif\\\n; comment\n/echo b\n";
      expect(getDiagnostics(c5)[0]?.message).toContain("reads /endif/echo as one command");
      expect(titles(c5)).toEqual([`${keep} (preferred)`, split]);
      const a3 = "/def g = /if (1) /echo a%; /endif\\\n;x\n/g\n";
      expect(getDiagnostics(a3)[0]?.message).toContain("reads /endif/g as one command");
    });

    // rev-s4d a1, a2, a5, b2, b3 and c2-c4, and s4/k7.tf, proven in tf: a keyword that goes on into
    // the next line needs a blank before the \; neither a %; nor removing the \ works.
    it("offers only a blank before the \\ for a keyword that goes on into the next line", () => {
      for (const [text, glued] of [
        ["/def g = /if\\\n(1) /echo a%; /endif\n", "/if(1)"],
        ["/def g = /while\\\n(0) /echo a%; /done\n", "/while(0)"],
        ["/def g = /if (0) /echo a%; /elseif\\\n(1) /echo b%; /endif\n", "/elseif(1)"],
        ["/def g = /if /test 1%; /then\\\n/echo b%; /endif\n", "/then/echo"],
        ["/def g = /while /test 0%; /do\\\n/echo b%; /done\n", "/do/echo"],
        ["/def g = /if (0) /echo a%; /else\\\n/echo b%; /endif\n", "/else/echo"],
      ] as const) {
        const [d] = getDiagnostics(text).filter((x) => x.code === CODE);
        expect(d?.message, text).toBe(`Line 1 ends in \\, so tf joins the next line on and reads ${glued} as one command: put a space before the \\.`);
        expect(titles(text), text).toEqual(["Put a space before the \\ on line 1"]);
      }
    });

    // rev-s4e k1-k5, proven in tf: /break ends its statement, but its /while's /done comes later, so
    // removing the \ cuts the /while off; a %; before the \ is the one fix.
    it("offers only a %; before the \\ for /break and /@break", () => {
      for (const text of ["/def g = /while (1) /echo w%; /break\\\n/done\n", "/while (i<3) /test ++i%; /@break\\\n/done\n"]) {
        expect(titles(text), text).toEqual([keep]);
        expect(getDiagnostics(text).filter((d) => d.code === CODE)[0]?.message, text).toMatch(/: put %; before the \\\.$/);
      }
    });

    // rev-s4e w1-w5, proven in tf: where keyword-needs-space withholds its fix, it stays withheld,
    // with its advice put where it can be followed: before the \, since tf strips a blank at the
    // start of the next line (rev-s4f w1a, w4a, w5a; s4/wa.tf runs each piece of advice clean).
    it("keeps keyword-needs-space's withheld fix withheld across a join, with advice that can be followed", () => {
      for (const [text, message] of [
        ["/def g = /while\\\n(0)%; /done\n", "reads /while(0) as one command: put a space before the \\, and a command between the (0) and the %;."],
        ["/def g = /if\\\n(1)%; /echo a%; /endif\n", "reads /if(1) as one command: put a space before the \\, and a command between the (1) and the %;."],
        ["/def g = /if (0) /echo a%; /else\\\n(1) /echo b%; /endif\n", "reads /else(1) as one command: did you mean /elseif (1)? Then put a space before the \\."],
        ["/def g = /if /test 1%; /then\\\n(1) /echo b%; /endif\n", "reads /then(1) as one command: /then takes no (condition)."],
        ["/def g = /if (0) /echo a%; /else\\\n!x%; /endif\n", "reads /else!x as one command: unless a macro named else!x is defined elsewhere, put a space before the \\."],
      ] as const) {
        expect(getDiagnostics(text).find((d) => d.code === CODE)?.message, text).toBe(`Line 1 ends in \\, so tf joins the next line on and ${message}`);
        expect(titles(text), text).toEqual([]);
      }
    });

    it("reads the /@ forms on a line join as their keywords", () => {
      expect(titles("/def g = /@if (1) /echo a%; /@endif\\\n/def h = /echo b\n")).toEqual([`${split} (preferred)`, keep]);
      expect(titles("/def g = /@if\\\n(1) /echo a%; /@endif\n")).toEqual(["Put a space before the \\ on line 1"]);
    });

    // rev-s4d a3 and rev-s4f c1-c6, proven in tf: a call of the macro being defined is a command of
    // its own, as a column-0 /def is, whatever the /def's options or the call's arguments, and
    // ignoring case as tf does. Not /@g, a builtin lookup ("g: not a builtin command"), nor /gg.
    it("puts removing the \\ first before a call of the macro being defined", () => {
      for (const text of [
        "/def g = /if (1) /echo a%; /endif\\\n;x\n/g\n",
        "/def g = /if (1) /echo a%; /endif\\\n/g x y\n",
        "/def -i g = /if (1) /echo a%; /endif\\\n/g\n",
        '/def -p2 -mglob -t"x*" g = /if (1) /echo a%; /endif\\\n/g\n',
        "/def G = /if (1) /echo a%; /endif\\\n/g\n",
      ]) {
        expect(titles(text), text).toEqual([`${split} (preferred)`, keep]);
      }
      for (const text of ["/def g = /if (1) /echo a%; /endif\\\n/@g\n", "/def g = /if (1) /echo a%; /endif\\\n/gg\n"]) {
        expect(titles(text), text).toEqual([`${keep} (preferred)`, split]);
      }
    });

    // rev-s4f c7, proven in tf: a call of it whose line goes on in a \ carries the chain on, so the
    // %; reading comes first (removing the \ gives "g/echo: no such command"). The word named is
    // tf's own, across every join (rev-s4g c7: /list shows /endif/g/echo; c8: "break/x/y").
    it("keeps the %; first before a call of the macro that carries the chain on, and names tf's whole word", () => {
      const text = "/def g = /if (1) /echo a%; /endif\\\n/g\\\n/echo b\n";
      expect(getDiagnostics(text).find((d) => d.code === CODE)?.message).toContain("reads /endif/g/echo as one command");
      expect(titles(text)).toEqual([`${keep} (preferred)`, split]);
      const c8 = "/def g = /while (i<2) /test ++i%; /break\\\n/x\\\n/y%; /done\n";
      expect(getDiagnostics(c8).find((d) => d.code === CODE)?.message).toContain("reads /break/x/y as one command");
    });

    // rev-s4g x0, proven in tf: with nothing after the (1), the advice is the space alone.
    it("asks for a command after the condition only where a %; follows it", () => {
      expect(getDiagnostics("/def g = /if\\\n(1)\n").find((d) => d.code === CODE)?.message).toBe(
        "Line 1 ends in \\, so tf joins the next line on and reads /if(1) as one command: put a space before the \\.",
      );
    });

    // s4/cm.tf and rev-s4e v1, v2, proven in tf.
    it("skips # comments, several comment lines, a comment ending in \\, and comments after a CR or form feed", () => {
      for (const text of [
        "/def g = /if (1) /echo a%; /endif\\\n# one\n; two\n/def h = /echo b\n",
        "/def g = /if (1) /echo a%; /endif\\\n; a comment ending in \\\n/def h = /echo b\n",
        "/def g = /if (1) /echo a%; /endif\\\n\r; c\n/def h = /echo b\n",
        "/def g = /if (1) /echo a%; /endif\\\n; c\r\n/def h = /echo b\r\n",
      ]) {
        expect(getDiagnostics(text).filter((d) => d.code === CODE)[0]?.message, JSON.stringify(text)).toContain("reads /endif/def as one command");
        expect(titles(text), JSON.stringify(text)).toEqual([`${split} (preferred)`, keep]);
      }
      expect(getDiagnostics("/def g = /if\\\n\f# c\n(1) /echo a%; /endif\n")[0]?.message).toContain("reads /if(1) as one command");
    });

    it("joins nothing past a comment followed by a blank line, which ends the command", () => {
      expect(getDiagnostics("/def g = /if (1) /echo a%; /endif\\\n; c\n\n/def h = /echo b\n")).toEqual([]);
    });
  });
});
