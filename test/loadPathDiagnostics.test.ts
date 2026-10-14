import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildLoadGraph } from "../src/workspace/loadGraph";
import { loadPathDiagnostics, type LoadPathDiagnosticOptions } from "../src/workspace/loadPathDiagnostics";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);

function check(files: Record<string, string>, file: string, options: Partial<LoadPathDiagnosticOptions> = {}) {
  const byKey = new Map(Object.entries(files).map(([k, v]) => [path.resolve(k).toLowerCase(), v]));
  const graph = buildLoadGraph({
    entryFiles: [p("tfrc")],
    workingDir: p("cwd"),
    readFile: (f) => byKey.get(path.resolve(f).toLowerCase()),
  });
  return loadPathDiagnostics(file, files[file] as string, graph, {
    unresolvedLoads: true,
    undefinedMacros: true,
    ...options,
  });
}

describe("unresolved-load", () => {
  it("warns on a path tf won't find, at the path, listing where tf would look", () => {
    const [d] = check({ [p("tfrc")]: "/echo hi\n/load -q missing.tf\n" }, p("tfrc"));
    expect(d).toMatchObject({
      code: "unresolved-load",
      severity: "warning",
      range: { start: { line: 1, character: 9 }, end: { line: 1, character: 19 } },
    });
    expect(d?.message).toContain(p("cwd", "missing.tf"));
    expect(d?.message).toContain("not from this file's folder");
  });

  it("notes, without warning, an /eval path built from a variable it can't see", () => {
    const [d] = check({ [p("tfrc")]: "/eval /load %{somewhere}/x.tf\n" }, p("tfrc"));
    expect(d).toMatchObject({ code: "unresolved-load", severity: "information" });
  });

  it("notes, without warning, a ~user path it can't find, since user's home directory can't be checked", () => {
    const [d] = check({ [p("tfrc")]: "/load ~bob/x.tf\n" }, p("tfrc"));
    expect(d).toMatchObject({ code: "unresolved-load", severity: "information", range: { start: { line: 0, character: 6 } } });
    expect(d?.message).toBe(
      "Can't follow this load: tf takes ~bob from user bob's home directory, or, if there is no such user, " +
        "as a folder named ~bob in its current directory. Write the full path to have it checked.",
    );
  });

  it("leaves an unexpanded top-level path to the load-no-expansion rule", () => {
    expect(check({ [p("tfrc")]: "/load %{d}/x.tf\n" }, p("tfrc"))).toEqual([]);
  });

  it("only reports in the file that holds the load, and nothing for a file off every load path", () => {
    const files = { [p("tfrc")]: "/load a.tf\n", [p("cwd", "a.tf")]: "/load gone.tf\n", [p("stray.tf")]: "/load gone.tf\n" };
    expect(check(files, p("tfrc"))).toEqual([]);
    expect(check(files, p("cwd", "a.tf"))).toHaveLength(1);
    expect(check(files, p("stray.tf"))).toEqual([]);
  });

  it("can be turned off", () => {
    expect(check({ [p("tfrc")]: "/load missing.tf\n" }, p("tfrc"), { unresolvedLoads: false })).toEqual([]);
  });
});

describe("undefined-macro", () => {
  const codes = (files: Record<string, string>, file: string) => check(files, file).map((d) => d.code);

  it("notes a call to a name defined nowhere on the path, at information level", () => {
    const files = { [p("tfrc")]: "/load a.tf\n", [p("cwd", "a.tf")]: "/def go = /wot_mount x%; /echo ok\n" };
    const [d] = check(files, p("cwd", "a.tf"));
    expect(d).toMatchObject({ code: "undefined-macro", severity: "information" });
    expect(d?.message).toContain("/wot_mount");
  });

  it("accepts tf commands and macros defined anywhere on the path, in any order and nesting", () => {
    const files = {
      [p("tfrc")]: "/load a.tf\n/load b.tf\n",
      [p("cwd", "a.tf")]: "/def go = /later%; /nested%; /echo%; /!ismacro x\n",
      [p("cwd", "b.tf")]: "/def later = /def -i -h'send {n|s}' nested = /echo\n",
    };
    expect(codes(files, p("cwd", "a.tf"))).toEqual([]);
  });

  it("treats a dynamically named /def as defining its prefix", () => {
    const files = { [p("tfrc")]: "/def mk = /def -i ~body_%1 = /echo\n/def go = /~body_x\n" };
    expect(codes(files, p("tfrc"))).toEqual([]);
  });

  it("skips text that only looks like a call", () => {
    const files = {
      [p("tfrc")]: [
        "/def a = /echo Try /map_update? instead.",
        '/def b = /test _x =/ "*{/nope|/never}*"',
        "/def c = /sh cat /etc/hosts",
        "/def d = /run_%1 x",
        "/def e = /if /ismacro opt_hook%; /then /opt_hook%; /endif",
        "/def map_update = /echo",
        "",
      ].join("\n"),
    };
    expect(codes(files, p("tfrc"))).toEqual([]);
  });

  it("is off unless asked for", () => {
    const files = { [p("tfrc")]: "/def go = /nowhere\n" };
    expect(check(files, p("tfrc"), { undefinedMacros: false })).toEqual([]);
  });
});
