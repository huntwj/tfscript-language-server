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

  it("reads a /def inside a body as the inner macro will see it, %%name and %%{name} included", () => {
    expect(show("/def -i a = /def -i b = /echo %%{w} %%v\n")).toEqual(["read:w@0:33", "read:v@0:38"]);
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

/** Each occurrence with its scope: "L" for the body's own, then the kind of each inner scope. */
const scoped = (text: string): string[] =>
  findVariables(text).map((v) => `${v.access}:${v.name}${v.scope === "global" ? "" : ` ${v.scope.replace(/^local:\d+/, "L").replace(/\d+/g, "")}`}`);

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

  it("reads a /let's own value as the global: the local only exists once the /let has run", () => {
    // Real tf: with x=6, /let x=%{x}-L made the local "6-L".
    const text = "/def -i a = /let x=%{x}-L%; /echo %x%; /let y=$[y + 1]\n";
    expect(findVariables(text).map((v) => `${v.access}:${v.name}${v.scope === "global" ? "" : " local"}`)).toEqual([
      "let:x local",
      "read:x",
      "read:x local",
      "let:y local",
      "read:y",
    ]);
  });

  it("keeps a /let inside /eval, $(...) or a nested /def to its own scope", () => {
    // Real tf: after /eval /let zork=EV, and after $(/let zork=CS), the body's %zork read the global.
    expect(scoped("/def -i a = /eval /let zork=1%%; /echo %%zork%; /echo %zork\n")).toEqual([
      "let:zork L:eval",
      "read:zork L:eval",
      "read:zork",
    ]);
    expect(scoped("/def -i a = /echo $(/let zork=3%; /echo %zork)%; /echo %zork\n")).toEqual([
      "let:zork L:cmdsub",
      "read:zork L:cmdsub",
      "read:zork",
    ]);
    expect(scoped("/def -i a = /def -i b = /let zork=2%%; /echo %%zork%; /echo %zork\n")).toEqual([
      "let:zork L:def",
      "read:zork L:def",
      "read:zork",
    ]);
  });

  it("lets /eval text and a $(...) see the macro's own locals", () => {
    expect(scoped("/def -i a = /let z=1%; /eval /echo %%z%; /echo $(/echo %z)\n")).toEqual(["let:z L", "read:z L", "read:z L"]);
  });
});

describe("/for and /repeat", () => {
  it("reads a /for command as a macro body, with its variable local to the loop", () => {
    // Real tf: a top-level /for i 1 1 /echo %zork read the global zork, and %i the loop's i.
    expect(scoped("/for i 1 1 /echo %zork %i\n")).toEqual(["let:i L:for", "read:zork", "read:i L:for"]);
    // Real tf: in a body, %%zork read the body's /let zork (the /for runs inside the macro).
    expect(scoped("/def -i a = /let zork=L%; /for j 1 1 /echo %%zork %%j\n")).toEqual([
      "let:zork L",
      "let:j L:for",
      "read:zork L",
      "read:j L:for",
    ]);
  });

  it("reads a /repeat command as a macro body that runs later, seeing no local of the macro", () => {
    // Real tf: %%zork read the global, %zork (substituted by the body first) the local.
    expect(scoped("/def -i a = /let zork=L%; /repeat -0 1 /echo %%zork %zork\n")).toEqual(["let:zork L", "read:zork", "read:zork L"]);
    expect(scoped("/repeat -0.5 i /echo %zork\n")).toEqual(["read:zork"]);
  });
});

const names = (text: string): string[] => findVariables(text).map((v) => `${v.access}:${v.name}`);

describe("what tf substitutes", () => {
  it("leaves %x alone in a plain top-level command, or one in a top-level /if", () => {
    // Real tf: a top-level /echo %x prints %x; so does /set log_time_format=%s.%.
    expect(names("/echo %x\n/set log_time_format=%s.%.\n/if (1) /echo %y%; /endif\n")).toEqual(["set:log_time_format"]);
  });

  it("reads %x in an expression even at the top level, but never inside its strings", () => {
    // Real tf: /if (%x > 5) read x at the top level; $["%Y"] and /if ("%Y" =~ ...) saw %Y.
    expect(names('/if (%x > 5 & "%Y" =~ "") /echo%; /endif\n')).toEqual(["read:x"]);
    expect(names('/def -i a = /echo $[ftime("%Y%m%d-%H%M%S")] $[strlen("%v") + %w]\n')).toEqual(["read:w"]);
  });

  it("reads the strings of a /test, /return or /result in a body, which tf substitutes first", () => {
    // Real tf: /test v := "%Y" in a body gave yy.
    expect(names('/def -i a = /test v := "%Y"%; /result "%{Z}"\n/test w := "%T"\n')).toEqual(["assign:v", "read:Y", "read:Z", "assign:w"]);
  });

  it("reads /eval text as a macro body, at the top level too", () => {
    expect(names("/eval /set d=%{e}%; /echo %d\n/eval -s0 /echo %f\n")).toEqual(["set:d", "read:e", "read:d"]);
  });
});

describe("commands only at the start of a statement", () => {
  it("doesn't read /set, /unset or /if in echo text, help text or a trigger pattern", () => {
    expect(names("/def showhelp = /echo -e %% help: type /set gx=VALUE then /unset gx\n")).toEqual([]);
    expect(names('/def -mregexp -t"(\\d+)%gx" trigx = /echo matched\n')).toEqual([]);
    expect(names("/def -i a = /echo use /if (xx) to test\n")).toEqual([]);
  });

  it("reads /@set, /@let and /@test as the commands they call", () => {
    expect(names("/def -i a = /@let x=1%; /@test y := x%; /@set z=1\n")).toEqual(["let:x", "assign:y", "read:x", "set:z"]);
  });

  it("reads a /def -E condition's names, which tf evaluates when the trigger matches", () => {
    // Real tf: -E"lim > 3" fired with lim=5 and not with lim=1.
    expect(names('/def -i -E"lim > 3" -t"hello*" -q trE = /echo fired\n')).toEqual(["read:lim"]);
  });

  it("reads x /y as division by the variable y, and x /echo as a missing %;", () => {
    // Real tf: $[x /y] with x=6, y=2 gave 3.
    expect(names("/def -i a = /echo $[x /y] $[x /echo]\n")).toEqual(["read:x", "read:y", "read:x"]);
  });

  it("doesn't read the start of a name built at run time", () => {
    // From kbstack.tf: the inner macro reads _kb_stack_0_top, or whatever n is.
    expect(names("/def -i a = /def -i b = /echo %%{_kb_stack_%{n}_top}\n")).toEqual(["read:n"]);
  });
});

describe("cost", () => {
  const timed = (text: string): number => {
    const t0 = performance.now();
    findVariables(text);
    return performance.now() - t0;
  };
  it("stays linear on long statements", () => {
    expect(timed(`/def -i a = ${"/test x ".repeat(20000)}\n`)).toBeLessThan(1000);
    expect(timed(`/def -i a = /if (${"x ".repeat(50000)}\n`)).toBeLessThan(1000);
    expect(timed(`/def -i a = ${"/set a=1 ".repeat(20000)}\n`)).toBeLessThan(1000);
  });
});
