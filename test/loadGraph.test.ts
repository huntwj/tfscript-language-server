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
