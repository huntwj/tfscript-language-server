import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { findLoadPaths } from "../src/documentLinks";
import type { Environment } from "../src/workspace/settings";
import { WorkspaceIndex } from "../src/workspace/workspaceIndex";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);
const key = (f: string) => path.resolve(f).toLowerCase();

function memoryFs(files: Record<string, string>) {
  const byKey = new Map(Object.entries(files).map(([k, v]) => [key(k), v]));
  return {
    readFile: (f: string) => byKey.get(key(f)),
    listTfFiles: () => [],
    walkTfFiles: () => [],
    exists: (f: string) => byKey.has(key(f)),
  };
}

function env(fs: ReturnType<typeof memoryFs>): Environment {
  return { env: {}, homedir: p("home"), exists: fs.exists };
}

const files = (text: string) => findLoadPaths(text).map((l) => l.file);

describe("findLoadPaths", () => {
  it("covers just the filename, after any -q", () => {
    const [load] = findLoadPaths("/load -q   lib/a.tf   \n");
    expect(load).toMatchObject({ kind: "load", file: "lib/a.tf", topLevel: true });
    expect(load?.range).toEqual({ start: { line: 0, character: 11 }, end: { line: 0, character: 19 } });
  });

  it("keeps a /load filename's inner blanks, and joins /require's words with one space", () => {
    expect(files("/load my  file.tf\n/require -q my  file.tf\n")).toEqual(["my  file.tf", "my file.tf"]);
  });

  it("gives no link for an option other than -q, which tf rejects", () => {
    expect(files("/load -x a.tf\n/load -qq a.tf\n/load -- -a.tf\n/load - -b.tf\n")).toEqual(["a.tf", "-a.tf", "-b.tf"]);
  });

  it("reads a top-level line to its end, %; included, so that filename gets no link", () => {
    expect(files("/load a.tf%; /load b.tf\n")).toEqual([]);
  });

  it("splits a macro body on %; and finds loads after /eval, /@load and in an /if", () => {
    const text = [
      "/def -i go = /load a.tf%; /if (x) /require b.tf%; /endif%; /eval /load c.tf",
      "/if (1) /@load d.tf%; /endif",
      "",
    ].join("\n");
    expect(findLoadPaths(text).map((l) => [l.file, l.topLevel])).toEqual([
      ["a.tf", false],
      ["b.tf", false],
      ["c.tf", false],
      ["d.tf", true],
    ]);
  });

  it("skips substituted names, a Windows path, and text that only mentions /load", () => {
    expect(files("/eval /load %{d}/a.tf\n/def x = /load ${f}\n/load C:\\x\\a.tf\n/echo try /load a.tf\n")).toEqual([]);
  });

  it("runs a top-level /eval while the file loads, splitting its text on %; as tf does", () => {
    // Real tf: /eval /load -q c.tf%; /load -q d.tf loaded both.
    expect(findLoadPaths("/eval /load a.tf%; /load -q b.tf\n/eval - /load c.tf\n").map((l) => [l.file, l.topLevel])).toEqual([
      ["a.tf", true],
      ["b.tf", true],
      ["c.tf", true],
    ]);
  });

  it("lists no loads for an /eval with an option it doesn't model, or text tf won't compile", () => {
    expect(files("/eval -s0 /load a.tf\n/if (1) /load a.tf%; /echo x\n")).toEqual([]);
  });

  it("maps a filename on a continuation line, but not one split across lines", () => {
    const [load] = findLoadPaths("/def -i go = \\\n    /load a.tf\n");
    expect(load?.range).toEqual({ start: { line: 1, character: 10 }, end: { line: 1, character: 14 } });
    expect(files("/def -i go = /load a\\\nb.tf\n")).toEqual([]);
  });

  it("gives /loaded, whose argument is a token, no link", () => {
    expect(files("/loaded __mine__\n")).toEqual([]);
  });
});

describe("WorkspaceIndex.documentLinks", () => {
  it("resolves a top-level load as the load graph did, with a TFPATH the tfrc set", () => {
    const fs = memoryFs({
      [p("ws", "tfrc")]: `/set TFPATH=${p("ws", "lib2")}\n/load mod.tf\n`,
      [p("ws", "lib2", "mod.tf")]: "/load gone.tf\n/def -i m = /load mod.tf\n",
    });
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { entryFiles: ["tfrc"] });
    expect(index.documentLinks(p("ws", "tfrc"), fs.readFile(p("ws", "tfrc"))!).map((l) => l.target)).toEqual([p("ws", "lib2", "mod.tf")]);
    // gone.tf doesn't exist; the body's load runs later, against the settings' (empty) TFPATH.
    expect(index.documentLinks(p("ws", "lib2", "mod.tf"), fs.readFile(p("ws", "lib2", "mod.tf"))!)).toEqual([]);
  });

  it("resolves a top-level /eval load as the load graph did, too", () => {
    const tfrc = `/set TFPATH=${p("ws", "lib2")}\n/eval /load a.tf%; /load b.tf\n`;
    const fs = memoryFs({ [p("ws", "tfrc")]: tfrc, [p("ws", "lib2", "a.tf")]: "", [p("ws", "lib2", "b.tf")]: "" });
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { entryFiles: ["tfrc"] });
    expect(index.documentLinks(p("ws", "tfrc"), tfrc).map((l) => l.target)).toEqual([p("ws", "lib2", "a.tf"), p("ws", "lib2", "b.tf")]);
  });

  it("resolves loads in a file nothing loads against the working directory, then TFLIBDIR", () => {
    const text = "/load here.tf\n/require tools.tf\n/load ~/mine.tf\n/load nowhere.tf\n";
    const fs = memoryFs({
      [p("ws", "loose.tf")]: text,
      [p("ws", "here.tf")]: "",
      [p("lib", "tools.tf")]: "",
      [p("home", "mine.tf")]: "",
    });
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    expect(index.documentLinks(p("ws", "loose.tf"), text).map((l) => [l.range.start.line, l.target])).toEqual([
      [0, p("ws", "here.tf")],
      [1, p("lib", "tools.tf")],
      [2, p("home", "mine.tf")],
    ]);
  });
});
