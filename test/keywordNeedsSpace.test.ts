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

  it("names the builtin lookup for /@if(", () => {
    expect(first("/@if(1) /echo a%; /@endif")?.message).toBe("tf reads /@if(1) as the builtin command if(1), not as /if: put a space after /if.");
  });

  it("offers no blank where the %; after the condition would send a blank line", () => {
    const d = first("/while(0)%; /done");
    expect(d?.message).toBe("tf reads /while(0) as a command named while(0), not as /while: put a space after /while.");
    expect(d?.fix).toBeUndefined();
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
  });
});
