import { describe, expect, it } from "vitest";
import { splitLogicalEntries } from "../src/logicalEntries";
import { atCommand, entrySubstitution, evalArguments, quoteCommand, repeatArguments, type SubContext } from "../src/substitution";

/** The context of the first character of `marker` in the one-line entry `line`. */
function contextOf(line: string, marker: string, from = 0): SubContext | undefined {
  const entry = splitLogicalEntries(`${line}\n`)[0]!;
  return entrySubstitution(entry).contexts[line.indexOf(marker, from)];
}

describe("entrySubstitution", () => {
  it("reads a plain top-level line at the keyword level", () => {
    expect(contextOf("/echo %{x}", "%{x}")).toBe("keyword");
  });

  it("reads the rest of a top-level /if or /while line at the newline level", () => {
    expect(contextOf("/if (1) /echo %{x}%; /endif", "%{x}")).toBe("newline");
    expect(contextOf("/while (0) /echo %{x}%; /done", "%{x}")).toBe("newline");
  });

  it("substitutes macro bodies, /repeat commands, /for words and /eval text", () => {
    expect(contextOf("/def a = /echo %{x}", "%{x}")).toBe("full");
    expect(contextOf("/def -t%{p} a = /echo x", "%{p}")).toBe("keyword");
    expect(contextOf("/repeat -0 1 /echo %{x}", "%{x}")).toBe("full");
    expect(contextOf("/repeat -0 %{n} /echo x", "%{n}")).toBe("keyword");
    expect(contextOf("/for i %{lo} 3 /echo %{i}", "%{lo}")).toBe("full");
    expect(contextOf("/eval /echo %{x}", "%{x}")).toBe("full");
  });

  it("follows /eval's -s level", () => {
    expect(contextOf("/eval -s0 /echo %{x}", "%{x}")).toBe("keyword");
    expect(contextOf("/eval -son /echo %{x}", "%{x}")).toBe("newline");
    expect(contextOf("/eval -s2 /echo %{x}", "%{x}")).toBe("full");
    expect(contextOf("/eval -s0 /if (1) /eval /echo %%{x}%; /endif", "%%{x}")).toBe("full");
  });

  it("reads an /eval inside an /if line from the shortened text", () => {
    expect(contextOf("/if (1) /eval /echo %%{x}%; /endif", "%%{x}")).toBe("full");
  });

  it("marks expressions, at any level", () => {
    expect(contextOf("/if (%{x} == 5) /echo y%; /endif", "%{x}")).toBe("expression");
    expect(contextOf("/test %{x} + 1", "%{x}")).toBe("expression");
    expect(contextOf("/set y=$[%{x}+1]", "%{x}")).toBe("keyword");
  });
});

describe("repeatArguments", () => {
  const at = (args: string) => {
    const r = repeatArguments(args, 0, args.length);
    return r && { command: args.slice(r.command), now: r.now };
  };

  it("finds the command after the options and count", () => {
    expect(at("-0 1 /echo x")).toEqual({ command: "/echo x", now: false });
    expect(at("-S 1 /echo x")).toEqual({ command: "/echo x", now: true });
    expect(at("-S -0 1 /echo x")).toEqual({ command: "/echo x", now: false });
    expect(at("-0 -S 1 /echo x")).toEqual({ command: "/echo x", now: true });
    expect(at("-wfoo i /echo x")).toEqual({ command: "/echo x", now: false });
  });

  it("is undefined for an invalid option or count, or no command", () => {
    expect(at("-x 1 /echo x")).toBeUndefined();
    expect(at("-0 0 /echo x")).toBeUndefined();
    expect(at("-0 1")).toBeUndefined();
  });
});

describe("evalArguments", () => {
  it("reads -s and where the text starts", () => {
    const args = "-soff -- /echo x";
    expect(evalArguments(args, 0, args.length)).toEqual({ text: args.indexOf("/echo"), mode: "top", options: [{ start: 0, end: 5 }] });
    expect(evalArguments("-q x", 0, 4)).toBeUndefined();
    expect(evalArguments("", 0, 0)).toEqual({ text: 0, mode: "body", options: [] });
  });
});

describe("quoteCommand and atCommand", () => {
  const quoted = (args: string) => {
    const q = quoteCommand(args, 0, args.length);
    return q && { command: args.slice(q.start, q.end), mode: q.mode };
  };

  it("finds the tf command after /quote's backquote", () => {
    expect(quoted("-S -decho `/echo x")).toEqual({ command: "/echo x", mode: "body" });
    expect(quoted('-S pre`"/echo x"suf')).toEqual({ command: "/echo x", mode: "body" });
    expect(quoted("-soff `/echo x")).toEqual({ command: "/echo x", mode: "top" });
    expect(quoted("-S !echo x")).toBeUndefined();
    expect(quoted("-S 'file")).toBeUndefined();
  });

  it("finds /at's command after its options, date and time", () => {
    const at = (args: string) => {
      const c = atCommand(args, 0, args.length);
      return c === undefined ? undefined : args.slice(c);
    };
    expect(at("12:00 /echo x")).toBe("/echo x");
    expect(at("-v 2030-01-02 12:00:30 /echo x")).toBe("/echo x");
    expect(at("01/02 12:00 /echo x")).toBe("/echo x");
    expect(at("12:00")).toBeUndefined();
  });
});

describe("separators and strings", () => {
  it("reads the %; between statements at the newline level", () => {
    expect(contextOf("/eval -son /echo a%; /echo b", "%;")).toBe("newline");
    expect(contextOf("/eval -soff /if (1) /echo a%; /echo b%; /endif", "%;")).toBe("newline");
    expect(contextOf("/eval -soff /echo a%; /echo b", "%;")).toBe("keyword");
  });

  it("never substitutes a string in a condition or $[...], and a /test's string at its level", () => {
    expect(contextOf('/if (echo("%{x}")) /endif', "%{x}")).toBe("string");
    expect(contextOf('/def a = /if (echo("%{x}")) /endif', "%{x}")).toBe("string");
    expect(contextOf('/def a = /echo $["%{x}"]', "%{x}")).toBe("string");
    expect(contextOf('/def a = /test echo("%{x}")', "%{x}")).toBe("full");
    expect(contextOf('/test echo("%{x}")', "%{x}")).toBe("keyword");
    expect(contextOf('/if (1) /test echo("%{x}")%; /endif', "%{x}")).toBe("newline");
  });
});
