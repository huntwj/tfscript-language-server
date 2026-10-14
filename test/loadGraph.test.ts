import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildLoadGraph, expandVariables, type LoadGraphOptions } from "../src/workspace/loadGraph";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);

function fs(files: Record<string, string>): (file: string) => string | undefined {
  const byKey = new Map(Object.entries(files).map(([k, v]) => [path.resolve(k).toLowerCase(), v]));
  return (file) => byKey.get(path.resolve(file).toLowerCase());
}

function graph(files: Record<string, string>, opts: Partial<LoadGraphOptions> = {}) {
  return buildLoadGraph({ entryFiles: [p("tfrc")], workingDir: p("cwd"), readFile: fs(files), ...opts });
}

const names = (g: ReturnType<typeof graph>) => g.files.map((f) => path.relative(ROOT, f.path).replace(/\\/g, "/"));
const defNames = (g: ReturnType<typeof graph>) => g.files.flatMap((f) => f.defs.map((d) => d.symbol.name));

describe("load order", () => {
  it("loads stdlib.tf first, then entries, following /load and /require where they occur", () => {
    const g = graph(
      {
        [p("lib", "stdlib.tf")]: "/def -i stdmacro = /echo\n",
        [p("lib", "alias.tf")]: "/loaded __TFLIB__/alias.tf\n/def -i alias = /echo\n",
        [p("tfrc")]: "/require alias.tf\n/def mine = /echo\n/load ~/scripts/main.tf\n",
        [p("home", "scripts", "main.tf")]: "/def -i main_macro = /alias x y\n",
      },
      { libraryDir: p("lib"), home: p("home") },
    );
    expect(names(g)).toEqual(["lib/stdlib.tf", "tfrc", "lib/alias.tf", "home/scripts/main.tf"]);
    const inDefinitionOrder = g.files
      .flatMap((f) => f.defs)
      .sort((a, b) => a.seq - b.seq)
      .map((d) => d.symbol.name);
    expect(inDefinitionOrder).toEqual(["stdmacro", "alias", "mine", "main_macro"]);
  });
});

describe("path resolution (proven against real tf)", () => {
  it("resolves a relative path against the working directory, not the loading file's directory", () => {
    const g = graph({ [p("tfrc")]: "/load sub/a.tf\n", [p("sub", "a.tf")]: "/def a = 1\n", [p("cwd", "sub", "a.tf")]: "/def cwd_a = 1\n" });
    expect(defNames(g)).toEqual(["cwd_a"]);
  });

  it("does not look beside the loading file", () => {
    const g = graph({ [p("tfrc")]: "/load b.tf\n", [p("b.tf")]: "/def b = 1\n" });
    expect(defNames(g)).toEqual([]);
    expect(g.unresolved).toMatchObject([{ file: "b.tf", reason: "file not found" }]);
  });

  it("falls back to TFPATH directories in order, first match wins", () => {
    const files = {
      [p("tfrc")]: "/load same.tf\n",
      [p("d1", "same.tf")]: "/def from_d1 = 1\n",
      [p("d2", "same.tf")]: "/def from_d2 = 1\n",
    };
    expect(defNames(graph(files, { tfPath: [p("d1"), p("d2")] }))).toEqual(["from_d1"]);
    expect(defNames(graph(files, { tfPath: [p("d2"), p("d1")] }))).toEqual(["from_d2"]);
  });

  it("uses TFLIBDIR only when TFPATH is empty", () => {
    const files = { [p("tfrc")]: "/load x.tf\n", [p("lib", "x.tf")]: "/def lib_x = 1\n", [p("d1", "x.tf")]: "/def d1_x = 1\n" };
    expect(defNames(graph(files, { libraryDir: p("lib") }))).toEqual(["lib_x"]);
    expect(defNames(graph(files, { libraryDir: p("lib"), tfPath: [p("d1")] }))).toEqual(["d1_x"]);
  });

  it("honours a TFPATH set in the tfrc itself", () => {
    const g = graph({ [p("tfrc")]: `/set TFPATH=${p("d1")}\n/require x.tf\n`, [p("d1", "x.tf")]: "/def x = 1\n" });
    expect(defNames(g)).toEqual(["x"]);
  });

  it("strips /load options", () => {
    const g = graph({ [p("tfrc")]: "/load -q a.tf\n/require -q -- b.tf\n", [p("cwd", "a.tf")]: "/def a = 1\n", [p("cwd", "b.tf")]: "/def b = 1\n" });
    expect(defNames(g)).toEqual(["a", "b"]);
  });
});

describe("how tf reads a load command (proven against real tf, 2026-10-13)", () => {
  it("joins /require's words with single blanks, as stdlib.tf's /load %{-L} %{L} does", () => {
    const g = graph({ [p("tfrc")]: "/require my   f.tf\n", [p("cwd", "my f.tf")]: "/def f = 1\n" });
    expect(defNames(g)).toEqual(["f"]);
    expect(g.unresolved).toEqual([]);
  });

  it("loads nothing for an option other than -q, which tf rejects", () => {
    const g = graph({ [p("tfrc")]: "/load -x a.tf\n/load -qq b.tf\n", [p("cwd", "a.tf")]: "/def a = 1\n", [p("cwd", "b.tf")]: "/def b = 1\n" });
    expect(defNames(g)).toEqual(["b"]);
    expect(g.unresolved).toEqual([]);
  });

  it("takes a ~ path as absolute, never searching TFPATH for it", () => {
    // Real tf: with TFPATH=/script, /load ~nosuchuser/n.tf failed though /script/~nosuchuser/n.tf exists.
    const files = {
      [p("tfrc")]: "/load ~/a.tf\n/load ~nosuchuser/n.tf\n",
      [p("d1", "~", "a.tf")]: "/def wrong_a = 1\n",
      [p("d1", "~nosuchuser", "n.tf")]: "/def wrong_n = 1\n",
    };
    const g = graph(files, { tfPath: [p("d1")], home: p("home") });
    expect(defNames(g)).toEqual([]);
    expect(g.unresolved.map((u) => [u.kind, u.searched])).toEqual([
      ["not-found", [p("home", "a.tf")]],
      ["user-home", [p("cwd", "~nosuchuser", "n.tf")]],
    ]);
  });

  it("follows ~user to a folder of that name in the current directory, as tf does when there is no such user", () => {
    // Real tf: after /cd /script, /load ~nosuchuser/n.tf read /script/~nosuchuser/n.tf.
    const g = graph({ [p("tfrc")]: "/load ~nosuchuser/n.tf\n", [p("cwd", "~nosuchuser", "n.tf")]: "/def n = 1\n" });
    expect(defNames(g)).toEqual(["n"]);
  });

  it("only takes /load at the start of a statement", () => {
    const g = graph({ [p("tfrc")]: "/echo hi /load a.tf\n", [p("cwd", "a.tf")]: "/def a = 1\n" });
    expect(defNames(g)).toEqual([]);
    expect(g.unresolved).toEqual([]);
  });

  it("reads a plain top-level /load to the end of the line, %; included, but splits an /eval", () => {
    // Real tf: "/load /script/a.tf%; /echo ..." was No such file; /eval /load c%; /load d loaded both.
    const files = { [p("cwd", "a.tf")]: "/def a = 1\n", [p("cwd", "b.tf")]: "/def b = 1\n" };
    const plain = graph({ ...files, [p("tfrc")]: "/load a.tf%; /load b.tf\n" });
    expect(defNames(plain)).toEqual([]);
    expect(plain.unresolved).toMatchObject([{ kind: "not-found", file: "a.tf%; /load b.tf" }]);
    expect(defNames(graph({ ...files, [p("tfrc")]: "/eval /load a.tf%; /load b.tf\n" }))).toEqual(["a", "b"]);
  });

  it("substitutes /eval text only at the levels that do, and splits it at -son", () => {
    // Real tf: /eval -son /load %{x} was No such file for "%{x}"; /eval -s2 /load %{x} loaded it.
    const files = { [p("s", "k.tf")]: "/def k = 1\n", [p("cwd", "a.tf")]: "/def a = 1\n", [p("cwd", "b.tf")]: "/def b = 1\n" };
    const set = `/set x=${p("s", "k.tf")}\n`;
    const on = graph({ ...files, [p("tfrc")]: `${set}/eval -son /load %{x}\n/eval -son /load a.tf%; /load b.tf\n` });
    expect(defNames(on)).toEqual(["a", "b"]);
    expect(on.unresolved).toMatchObject([{ kind: "not-substituted", raw: "%{x}" }]);
    expect(defNames(graph({ ...files, [p("tfrc")]: `${set}/eval -s2 /load %{x}\n` }))).toEqual(["k"]);
  });

  it("runs each statement of an /eval in turn, a /set before a /load", () => {
    // Real tf: /eval /set dd=/script%; /load -q %{dd}/m.tf loaded m.tf: each statement is
    // substituted as it runs, after the ones before it.
    const g = graph({ [p("tfrc")]: `/eval /set d=${p("s")}%; /load %{d}/a.tf\n`, [p("s", "a.tf")]: "/def a = 1\n" });
    expect(defNames(g)).toEqual(["a"]);
  });

  it("takes a plain top-level /set's value to the end of the line, %; included", () => {
    const g = graph({ [p("tfrc")]: "/set d=x%; /load a.tf\n", [p("cwd", "a.tf")]: "/def a = 1\n" });
    expect(defNames(g)).toEqual([]);
  });

  it("stops trusting a variable a /set inside an /if or /while may change", () => {
    const g = graph({
      [p("tfrc")]: `/set d=${p("real")}\n/load x.tf\n`,
      [p("cwd", "x.tf")]: `/if (d =~ "x") /set d=${p("wrong")}%; /endif\n/eval /load %{d}/a.tf\n`,
      [p("real", "a.tf")]: "/def a = 1\n",
    });
    expect(g.unresolved).toMatchObject([{ kind: "guarded-variable", raw: "%{d}/a.tf", variable: "d" }]);
    expect(g.unresolved[0]?.file).not.toContain("wrong");
  });

  describe("the default-value guard, /if (x =~ \"\") /set x=VALUE%; /endif (wotmud.tf's shape)", () => {
    const loadsWith = (tfrc: string) =>
      defNames(graph({ [p("tfrc")]: `${tfrc}/eval /load %{d}/a.tf\n`, [p("real", "a.tf")]: "/def real = 1\n", [p("wrong", "a.tf")]: "/def wrong = 1\n" }));

    it("skips the /set when the variable is already set (real tf loaded from the first value)", () => {
      expect(loadsWith(`/set d=${p("real")}\n/if (d =~ "") /set d=${p("wrong")}%; /endif\n`)).toEqual(["real"]);
    });

    it("runs it when nothing on the path set the variable, in each unset-test form", () => {
      for (const cond of ['d =~ ""', "{d} =~ ''", 'd == ""', "!d", "!{d}"]) {
        expect(loadsWith(`/if (${cond}) /set d=${p("real")}%; /endif\n`)).toEqual(["real"]);
      }
    });

    it("runs it when the variable is set to nothing", () => {
      expect(loadsWith(`/set d=\n/if (!d) /set d=${p("real")}%; /endif\n`)).toEqual(["real"]);
    });

    it("can't tell for == or ! on a set value (true for 0 and abc too), an upper-case name (an environment variable may set it), or another shape", () => {
      const unknown = (tfrc: string) => loadsWith(tfrc).length === 0;
      expect(unknown(`/set d=${p("real")}\n/if (d == "") /set d=${p("wrong")}%; /endif\n`)).toBe(true);
      expect(unknown(`/if (D =~ "") /set D=${p("real")}%; /endif\n/eval /set d=%{D}\n`)).toBe(true);
      expect(unknown(`/if (dd =~ "") /set dd=${p("real")}%; /endif\n/eval /set d=%{dd}\n`)).toBe(false);
      expect(unknown(`/if (d =~ "") /set d=${p("real")}%; /echo x%; /endif\n`)).toBe(true);
      expect(unknown(`/if (e =~ "") /set d=${p("real")}%; /endif\n`)).toBe(true);
    });
  });

  it("keeps a variable a conditional /set would only set to the value it has", () => {
    const g = graph({
      [p("tfrc")]: `/set d=${p("real")}\n/if (1) /set d=${p("real")}%; /endif\n/eval /load %{d}/a.tf\n`,
      [p("real", "a.tf")]: "/def a = 1\n",
    });
    expect(defNames(g)).toEqual(["a"]);
  });

  it("stops trusting TFPATH a /while body may set, past the current directory", () => {
    const files = { [p("d1", "x.tf")]: "/def x = 1\n", [p("cwd", "here.tf")]: "/def here = 1\n" };
    const g = graph({ ...files, [p("tfrc")]: `/while (0) /set TFPATH=${p("d2")}%; /done\n/load x.tf\n/load here.tf\n` }, { tfPath: [p("d1")] });
    expect(defNames(g)).toEqual(["here"]);
    expect(g.unresolved).toMatchObject([{ kind: "guarded-variable", variable: "TFPATH" }]);
  });

  it("only shortens %% runs at -son and in a top-level /if, where %{x} is a literal name", () => {
    // Real tf: /eval -son /load a%%b.tf loaded a%b.tf, -son /load %{x}.tf loaded the file named
    // %{x}.tf, /if (1) /load u%%v.tf%; /endif loaded u%v.tf, and -son /set v=50%% set v to 50%.
    const g = graph({
      [p("tfrc")]: "/eval -son /load a%%b.tf\n/eval -son /load %{x}.tf\n/if (1) /load u%%v.tf%; /endif\n/eval -son /set v=n%%\n/eval /load %{v}.tf\n",
      [p("cwd", "a%b.tf")]: "/def ab = 1\n",
      [p("cwd", "%{x}.tf")]: "/def brace = 1\n",
      [p("cwd", "u%v.tf")]: "/def uv = 1\n",
      [p("cwd", "n%.tf")]: "/def n = 1\n",
    });
    expect(defNames(g)).toEqual(["ab", "brace", "uv", "n"]);
  });

  it("makes each level's pass over the text the outer one produced", () => {
    // Real tf: with d=/script, /if (1) /eval /load %%{d}/w1.tf%; /endif loaded /script/w1.tf, and
    // /if (1) /eval -son /load a%%%%b.tf%; /endif loaded a%%b.tf.
    const g = graph({
      [p("tfrc")]: `/set d=${p("s")}\n/if (1) /eval /load %%{d}/w1.tf%; /endif\n/if (1) /eval -son /load a%%%%b.tf%; /endif\n`,
      [p("s", "w1.tf")]: "/def w1 = 1\n",
      [p("cwd", "a%%b.tf")]: "/def ab = 1\n",
    });
    expect(defNames(g)).toEqual(["w1", "ab"]);
  });

  it("warns about a missing file whose name only has %% runs, which aren't substitutions", () => {
    // Real tf: /if (1) /load /script/x%%y.tf%; /endif was No such file for /script/x%y.tf.
    const g = graph({ [p("tfrc")]: "/if (1) /load x%%y.tf%; /endif\n" });
    expect(g.unresolved).toMatchObject([{ kind: "not-found", file: "x%y.tf" }]);
  });

  it("reads -s as tf does: any all-digit number up to 2, and a quoted value", () => {
    // Real tf: -s00 and -s002 ran, and -s"on" split on %; as -son does.
    const files = { [p("cwd", "a.tf")]: "/def a = 1\n", [p("cwd", "b.tf")]: "/def b = 1\n", [p("cwd", "c.tf")]: "/def c = 1\n" };
    const g = graph({ ...files, [p("tfrc")]: '/eval -s00 /load a.tf\n/eval -s002 /load b.tf\n/eval -s"on" /load c.tf%; /load a.tf\n' });
    expect(defNames(g)).toEqual(["a", "b", "c"]);
    // Real tf: -s"o\n" was Invalid -s value "o\n": a \ only escapes the quote or another \.
    expect(defNames(graph({ ...files, [p("tfrc")]: '/eval -s"o\\n" /load a.tf\n/eval -s"\\on" /load b.tf\n' }))).toEqual([]);
  });

  it("starts a /set value right after = or the blanks, as setdelim() does, and tracks /setenv but not /let", () => {
    // Real tf: /set x =1 set x to "=1" (with a warning), and /setenv se=/script let %{se} load.
    const files = { [p("s", "a.tf")]: "/def a = 1\n" };
    const spaced = graph({ ...files, [p("tfrc")]: `/set d =${p("s")}\n/eval /load %{d}/a.tf\n` });
    expect(spaced.unresolved).toMatchObject([{ kind: "not-found", file: `=${p("s")}/a.tf` }]);
    expect(defNames(graph({ ...files, [p("tfrc")]: `/setenv d=${p("s")}\n/eval /load %{d}/a.tf\n` }))).toEqual(["a"]);
    expect(graph({ ...files, [p("tfrc")]: `/let d=${p("s")}\n/eval /load %{d}/a.tf\n` }).unresolved).toMatchObject([{ kind: "unknown-variable" }]);
  });

  it("follows nothing from a top-level line tf can't compile", () => {
    // Real tf: /if (1) /load /script/e.tf%; /echo ... with no /endif loaded nothing.
    const g = graph({ [p("tfrc")]: "/if (1) /load a.tf%; /echo x\n", [p("cwd", "a.tf")]: "/def a = 1\n" });
    expect(defNames(g)).toEqual([]);
  });

  it("ends the options at - or --, so a filename may start with -", () => {
    const g = graph({ [p("tfrc")]: "/load - -a.tf\n/load -q -- -b.tf\n", [p("cwd", "-a.tf")]: "/def a = 1\n", [p("cwd", "-b.tf")]: "/def b = 1\n" });
    expect(defNames(g)).toEqual(["a", "b"]);
  });
});

describe("/require and /loaded (proven against real tf)", () => {
  it("skips a second /require of the same token, even from a different file", () => {
    const g = graph({
      [p("tfrc")]: "/require c.tf\n/require c.tf\n/require d.tf\n",
      [p("cwd", "c.tf")]: "/loaded tok\n/def from_c = 1\n",
      [p("cwd", "d.tf")]: "/loaded tok\n/def from_d = 1\n",
    });
    expect(defNames(g)).toEqual(["from_c"]);
    expect(g.files.find((f) => f.path.endsWith("c.tf"))?.sites).toHaveLength(2);
  });

  it("does not stop a plain /load at an already-seen token", () => {
    const g = graph({
      [p("tfrc")]: "/require c.tf\n/load d.tf\n",
      [p("cwd", "c.tf")]: "/loaded tok\n/def from_c = 1\n",
      [p("cwd", "d.tf")]: "/loaded tok\n/def from_d = 1\n",
    });
    expect(defNames(g)).toEqual(["from_c", "from_d"]);
  });
});

describe("substitution", () => {
  it("expands /eval paths from literal /set values, %%, and %{x-default}", () => {
    expect(expandVariables("%{d}/x %%y %{nope-z} %TFLIBDIR", new Map([["d", "/a"], ["TFLIBDIR", "/lib"]]))).toEqual({
      ok: true,
      value: "/a/x %y z /lib",
    });
    expect(expandVariables("%{nope}/x", new Map())).toMatchObject({ ok: false });
    // A run of %s loses one and stops there: %%%{d} is the text %%{d}.
    expect(expandVariables("%%%{d}", new Map([["d", "/a"]]))).toEqual({ ok: true, value: "%%{d}" });
  });

  it("follows /eval /load with tracked variables, and reports an unexpanded top-level path", () => {
    const g = graph({
      [p("tfrc")]: `/set dir=${p("s")}\n/eval /load %{dir}/a.tf\n/load %{dir}/b.tf\n`,
      [p("s", "a.tf")]: "/def a = 1\n",
      [p("s", "b.tf")]: "/def b = 1\n",
    });
    expect(defNames(g)).toEqual(["a"]);
    expect(g.unresolved[0]?.reason).toContain("not substituted");
  });

  it("follows each load in a joined top-level /if", () => {
    const g = graph({
      [p("tfrc")]: "/if (1) \\\n  /load a.tf%; \\\n  /load b.tf%; \\\n/endif\n",
      [p("cwd", "a.tf")]: "/def a = 1\n",
      [p("cwd", "b.tf")]: "/def b = 1\n",
    });
    expect(defNames(g)).toEqual(["a", "b"]);
  });
});

describe("what is not followed", () => {
  it("ignores loads inside /def bodies, stops at an abort, and survives cycles", () => {
    const g = graph({
      [p("tfrc")]: "/def later = /load never.tf\n/load a.tf\nbare line aborts\n/load after.tf\n",
      [p("cwd", "never.tf")]: "/def never = 1\n",
      [p("cwd", "after.tf")]: "/def after = 1\n",
      [p("cwd", "a.tf")]: "/load a.tf\n/def a = 1\n",
    });
    expect(defNames(g)).toEqual(["later", "a"]);
  });
});
