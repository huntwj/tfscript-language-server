import { describe, expect, it } from "vitest";
import { getSignatureHelp, parseSynopsis } from "../src/signatureHelp";

/** Signature help with the cursor at the `|` in `text`, as "label → highlighted parameter". */
function at(marked: string): string | undefined {
  const lines = marked.split("\n");
  const line = lines.findIndex((l) => l.includes("|"));
  const character = (lines[line] as string).indexOf("|");
  const help = getSignatureHelp(marked.replace("|", ""), { line, character });
  if (!help) return undefined;
  const sig = help.signatures[help.activeSignature];
  if (!sig) return undefined;
  const p = sig.parameters[help.activeParameter];
  return `${sig.label} → ${p ? sig.label.slice(p[0], p[1]) : "(none)"}`;
}

describe("parseSynopsis", () => {
  it("splits at bracket depth 0 and classifies options, positionals and = parts", () => {
    expect(parseSynopsis("/echo [-peA] [-aattrs] [-w[world]] text").map((p) => `${p.kind}:${p.text}`)).toEqual([
      "option:[-peA]",
      "option:[-aattrs]",
      "option:[-w[world]]",
      "positional:text",
    ]);
    expect(parseSynopsis("/bind sequence = command").map((p) => p.text)).toEqual(["sequence", "= command"]);
    expect(parseSynopsis("/def [options] [name] [= body]").map((p) => p.kind)).toEqual(["option", "positional", "eq"]);
    expect(parseSynopsis("/if (expr) list [ /ELSEIF (expr) list ]... [ /ELSE list ] /ENDIF")).toHaveLength(5);
  });
});

describe("getSignatureHelp", () => {
  it("highlights the option group naming the typed letter, then the text", () => {
    expect(at("/echo -a|")).toBe("/echo [-peA] [-aattrs] [-w[world]] text → [-aattrs]");
    expect(at("/echo -e|")).toBe("/echo [-peA] [-aattrs] [-w[world]] text → [-peA]");
    expect(at("/echo -w|")).toBe("/echo [-peA] [-aattrs] [-w[world]] text → [-w[world]]");
    expect(at("/echo |")).toBe("/echo [-peA] [-aattrs] [-w[world]] text → text");
    expect(at("/echo -p hello wor|ld")).toBe("/echo [-peA] [-aattrs] [-w[world]] text → text");
  });

  it("walks a /def through options, name and body", () => {
    expect(at("/def -i -t'a b' |")).toBe("/def [options] [name] [= body] → [name]");
    expect(at("/def -i fo|")).toBe("/def [options] [name] [= body] → [name]");
    expect(at("/def foo |")).toBe("/def [options] [name] [= body] → [= body]");
    expect(at("/def foo = /echo -a|")).toBe("/echo [-peA] [-aattrs] [-w[world]] text → [-aattrs]");
    expect(at("/def foo = some te|xt")).toBe("/def [options] [name] [= body] → [= body]");
  });

  it("picks the signature the typed words fit", () => {
    expect(at("/let x=|")).toBe("/let name=value → name=value");
    expect(at("/let x 1|")).toBe("/let name value → value");
  });

  it("follows %; separators, continuation lines and /if ... /then", () => {
    expect(at("/def go = /echo a%; /eval |")).toBe("/eval [-slevel] text → text");
    expect(at("/def go = \\\n    /echo a%;\\\n    /send |")).toContain("/send");
    expect(at("/if (x) /echo -|")).toContain("/echo");
    expect(at("/if /test x /then /eval -s|")).toBe("/eval [-slevel] text → [-slevel]");
  });

  it("uses a macro's ;;; synopsis line, and shows nothing for an undocumented macro that shadows a built-in", () => {
    const greet = ";;; /greet <name> [<greeting>]\n;;; Says hello.\n/def greet = /echo\n";
    expect(at(`${greet}/greet bob |`)).toBe("/greet <name> [<greeting>] → [<greeting>]");
    expect(at("/def echo = /@echo -p %*\n/echo |")).toBeUndefined();
    expect(at("/def lcd = /echo\n/lcd |")).toBeUndefined();
    expect(at("/def lcd = /echo\n/@lcd |")).toBe("/lcd [dir] → [dir]");
    // tf refuses /def eval ("reserved word"), so /eval is still the builtin.
    expect(at("/def eval = /echo\n/eval |")).toBe("/eval [-slevel] text → text");
  });

  it("says nothing while the name is still being typed, in comments, or for unknown commands", () => {
    expect(at("/ech|")).toBeUndefined();
    expect(at(";; /echo |")).toBeUndefined();
    expect(at("/nosuch |")).toBeUndefined();
  });
});

describe("getSignatureHelp in a function call", () => {
  it("highlights the argument by counting commas, outside strings and nested calls", () => {
    expect(at("/test regmatch(|")).toBe("regmatch(s1, s2) → s1");
    expect(at('/test regmatch("a,b", |')).toBe("regmatch(s1, s2) → s2");
    expect(at("/test regmatch(strcat(a, b), |")).toBe("regmatch(s1, s2) → s2");
    expect(at("/test regmatch(strcat(a, |")).toBe("strcat(s...) → s...");
  });

  it("picks the form with room for the argument, and wins over the command around it", () => {
    expect(at("/def x = /echo $[substr(s, 1|")).toBe("substr(s, i1) → i1");
    expect(at("/def x = /echo $[substr(s, 1, |")).toBe("substr(s, i1, i2) → i2");
    expect(at("/if (strlen(|")).toBe("strlen(s) → s");
  });

  it("shows nothing past a function's last argument, and falls back to the command outside calls", () => {
    expect(at("/test strlen(a, |")).toBe("strlen(s) → (none)");
    expect(at("/test (1 + |")).toBe("/test expression → expression");
  });
});
