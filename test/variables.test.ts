import { describe, expect, it } from "vitest";
import { findVariables, readSelector } from "../src/variables";

const show = (text: string): string[] =>
  findVariables(text).map((v) => `${v.access}:${v.name}@${v.range.start.line}:${v.range.start.character}${v.scope === "global" ? "" : " local"}`);

describe("readSelector", () => {
  // expand.c varsub()'s own examples, plus the special and positional selectors.
  const cases: [string, string | undefined, number][] = [
    ["foo}", "foo", 3],
    ["{foo}", "foo", 4],
    ["{foo-bar}", "foo", 4],
    ["Lx", "Lx", 2],
    ["{Lx}", "Lx", 3],
    ["L1x", undefined, 2],
    ["{L1x}", "L1x", 4],
    ["L", undefined, 1],
    ["{L}", undefined, 2],
    ["1x", undefined, 1],
    ["{-L}", undefined, 3],
    ["{-1}", undefined, 3],
    ["*", undefined, 1],
    ["{#}", undefined, 2],
    ["?", undefined, 1],
    ["R", undefined, 1],
    ["{P2}", undefined, 3],
    ["{PL}", undefined, 3],
    ["{PLx}", "PLx", 4],
    ["{R1}", "R1", 3],
  ];
  for (const [text, name, end] of cases) {
    it(`reads ${text}`, () => {
      const sel = readSelector(text, 0);
      expect(sel?.name).toBe(name);
      expect(sel?.nameEnd).toBe(end);
    });
  }

  it("rejects %-name, which tf reports as an illegal '-'", () => {
    expect(readSelector("-foo", 0)).toBeUndefined();
  });
});

describe("findVariables", () => {
  it("finds /set, /setenv, /unset, /export and % substitutions, case-sensitively", () => {
    const text = ["/set Foo=1", "/setenv foo 2", "/unset foo", "/export Foo", "/def -i a = /echo %Foo %{foo} %{bar-%{baz}}", ""].join("\n");
    expect(show(text)).toEqual([
      "set:Foo@0:5",
      "setenv:foo@1:8",
      "unset:foo@2:7",
      "export:Foo@3:8",
      "read:Foo@4:19",
      "read:foo@4:25",
      "read:bar@4:32",
      "read:baz@4:38",
    ]);
  });

  it("reads /set with no value as a read", () => {
    expect(show("/set x\n/def -i a = /set y%; /echo\n")).toEqual(["read:x@0:5", "read:y@1:17"]);
  });

  it("skips positional and special selectors, %% runs and \\% escapes", () => {
    const text = "/def -i a = /echo %1 %* %{-L} %{L2} %R %# %? %P1 %PL 100%%off \\%nope %{L1x}\n";
    expect(show(text)).toEqual(["read:L1x@0:71"]);
  });

  it("counts %%{name} as a read one level down, but not a bare %%name", () => {
    expect(show("/def -i a = /def -i b = /echo %%{w} %%v\n")).toEqual(["read:w@0:33"]);
  });

  it("finds variables in expressions, but not function names, strings or numbers", () => {
    const text = '/def -i a = /if (x > strlen(y) & z =~ "w") /test q := {r} + 1e3%; /endif%; /echo $[s * 2]\n';
    expect(show(text)).toEqual([
      "read:x@0:17",
      "read:y@0:28",
      "read:z@0:33",
      "assign:q@0:49",
      "read:r@0:55",
      "read:s@0:83",
    ]);
  });

  it("reads ++x, --x and every compound assignment as assignments", () => {
    const text = "/def -i a = /test ++a%; /test --b%; /test c += 1%; /test d -= 1%; /test e *= 2%; /test f /= 2%; /test g == 1\n";
    expect(findVariables(text).map((v) => `${v.access}:${v.name}`)).toEqual([
      "assign:a",
      "assign:b",
      "assign:c",
      "assign:d",
      "assign:e",
      "assign:f",
      "read:g",
    ]);
  });

  it("skips $(...) commands, ${macro} and $macro inside an expression, but reads the commands' own variables", () => {
    const text = "/def -i a = /test $(/echo %v) + ${m} + $n + w\n";
    expect(show(text)).toEqual(["read:v@0:27", "read:w@0:44"]);
  });

  it("skips names built at run time, a substitution's default, and a command name in an expression", () => {
    const text = "/def -i a = /test cy%n := kb_%1 + x_%{n}_top + {y-z} + (%{2-w} =~ '') /echo\n";
    expect(findVariables(text).map((v) => `${v.access}:${v.name}`)).toEqual(["read:n", "read:n", "read:y"]);
  });

  it("ends an expression at a %%; too, which is a separator one level down", () => {
    const text = "/def -i a = /eval /while (x) /test %_body%%; /done%%; /echo y\n";
    expect(findVariables(text).map((v) => `${v.access}:${v.name}`)).toEqual(["read:x", "read:_body"]);
  });

  it("reads getopts()' letters as the macro's local opt_ variables", () => {
    const text = '/def -i a = /if (!getopts("qb:", "")) /return%; /endif%; /echo %opt_q %{opt_b}\n/def -i b = /echo %opt_q\n';
    expect(show(text)).toEqual(["getopts:opt_q@0:27 local", "getopts:opt_b@0:28 local", "read:opt_q@0:64 local", "read:opt_b@0:72 local", "read:opt_q@1:19"]);
  });

  it("follows `\\`-continued lines to the right physical line", () => {
    const text = ["/def -i a = \\", "    /let x=1%; \\", "    /echo %x", ""].join("\n");
    expect(show(text)).toEqual(["let:x@1:9 local", "read:x@2:11 local"]);
  });
});

describe("scopes", () => {
  it("makes a read local only after a /let of the same name in the same body", () => {
    const text = "/def -i a = /echo %x%; /let x=1%; /echo %x {y}%; /test x := 2%; /set x=3%; /unset x\n/def -i b = /echo %x\n";
    expect(show(text)).toEqual([
      "read:x@0:19",
      "let:x@0:28 local",
      "read:x@0:41 local",
      "assign:x@0:55 local",
      "set:x@0:69",
      "unset:x@0:82",
      "read:x@1:19",
    ]);
  });

  it("keeps two bodies' /let variables apart", () => {
    const [a, b] = findVariables("/def -i a = /let x=1%; /echo %x\n/def -i b = /let x=2%; /echo %x\n").filter((v) => v.access === "read");
    expect(a?.scope).not.toBe(b?.scope);
    expect(a?.scope).toMatch(/^local:/);
  });
});
