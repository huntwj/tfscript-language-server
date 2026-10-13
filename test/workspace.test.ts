import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { getDefinition, getHover, getReferences, getRenameEdits, prepareRename } from "../src/navigation";
import { resolveSettings, type Environment } from "../src/workspace/settings";
import { WorkspaceIndex } from "../src/workspace/workspaceIndex";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);
const key = (f: string) => path.resolve(f).toLowerCase();

function memoryFs(files: Record<string, string>) {
  const byKey = new Map(Object.entries(files).map(([k, v]) => [key(k), v]));
  return {
    readFile: (f: string) => byKey.get(key(f)),
    listTfFiles: (dir: string) =>
      Object.keys(files).filter((f) => key(path.dirname(f)) === key(dir) && f.endsWith(".tf")),
    walkTfFiles: (dir: string) =>
      Object.keys(files).filter((f) => key(f).startsWith(key(dir) + path.sep) && /(\.tf|[/\\]\.?tfrc)$/.test(f)),
    exists: (f: string) => byKey.has(key(f)),
  };
}

function env(fs: ReturnType<typeof memoryFs>, vars: Record<string, string> = {}): Environment {
  return { env: vars, homedir: p("home"), exists: fs.exists };
}

const uriOf = (f: string) => `file://${path.resolve(f).replace(/\\/g, "/")}`;
const pos = (line: number, character: number) => ({ line, character });

describe("resolveSettings", () => {
  it("finds a tfrc at the folder root before falling back to ~/.tfrc", () => {
    const fs = memoryFs({ [p("ws", "tfrc.tf")]: "", [p("home", ".tfrc")]: "" });
    expect(resolveSettings({}, p("ws"), env(fs)).entryFiles).toEqual([p("ws", "tfrc.tf")]);
    const noLocal = memoryFs({ [p("home", ".tfrc")]: "" });
    expect(resolveSettings({}, p("ws"), env(noLocal)).entryFiles).toEqual([p("home", ".tfrc")]);
  });

  it("resolves configured paths against the folder and ~ against home", () => {
    const s = resolveSettings(
      { entryFiles: ["main.tf", "~/x.tf"], libraryPath: "lib", tfPath: ["~/tf"], workingDirectory: "run" },
      p("ws"),
      env(memoryFs({})),
    );
    expect(s).toEqual({
      entryFiles: [p("ws", "main.tf"), p("home", "x.tf")],
      libraryDir: p("ws", "lib"),
      tfPath: [p("home", "tf")],
      workingDir: p("ws", "run"),
      home: p("home"),
    });
  });

  it("takes TFLIBDIR and TFPATH from the environment when unset", () => {
    const s = resolveSettings({}, p("ws"), env(memoryFs({}), { TFLIBDIR: p("lib"), TFPATH: `${p("a")} ${p("b")}` }));
    expect(s.libraryDir).toBe(p("lib"));
    expect(s.tfPath).toEqual([p("a"), p("b")]);
  });
});

describe("cross-file navigation through the workspace index", () => {
  const files = {
    [p("lib", "stdlib.tf")]: "/def -i stdthing = /echo\n",
    [p("lib", "alias.tf")]: "/loaded __TFLIB__/alias.tf\n;;; /alias <name> <command>\n/def -i alias = /echo alias\n",
    [p("lib", "kbstack.tf")]: "/def -i kb_push = /echo\n",
    [p("lib", "tf-help")]: [
      "&/alias",
      "",
      "  Usage: ",
      "",
      "  /REQUIRE alias.tf",
      "  /ALIAS [<name> [<command>]]",
      "  ________________________________",
      "",
      "  Help text for alias.",
      "",
      "&/let",
      "",
      "  Usage: ",
      "",
      "  /LET <name>=<value>",
      "  ________________________________",
      "",
      "  Help text for let.",
      "",
    ].join("\n"),
    [p("ws", "tfrc")]: "/require alias.tf\n/load helpers.tf\n/load main.tf\n",
    [p("ws", "helpers.tf")]: ";;; Greets someone.\n/def greet = /echo hi %1\n",
    [p("ws", "main.tf")]: "/alias n north\n/greet bob\n/kb_push\n/stdthing\n",
    [p("ws", "stray.tf")]: "/greet x\n/stdthing\n",
  };

  function setup() {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    return index;
  }
  const doc = (f: string) => ({ text: files[f] as string, ctx: setup().navContext(f, uriOf) });

  it("knows /alias came from alias.tf because the tfrc required it first", () => {
    const { text, ctx } = doc(p("ws", "main.tf"));
    const hover = getHover(text, pos(0, 2), ctx)?.markdown ?? "";
    expect(hover).toContain("`alias.tf` (tf library) line 3");
    expect(hover).toContain("/alias \\<name\\> \\<command\\>");
    expect(hover).not.toContain("Not loaded");
    expect(getDefinition(text, pos(0, 2), ctx)).toEqual([
      { uri: uriOf(p("lib", "alias.tf")), range: { start: pos(2, 8), end: pos(2, 13) } },
    ]);
  });

  it("jumps to and documents a macro from another workspace file", () => {
    const { text, ctx } = doc(p("ws", "main.tf"));
    expect(getDefinition(text, pos(1, 2), ctx).map((l) => l.uri)).toEqual([uriOf(p("ws", "helpers.tf"))]);
    const hover = getHover(text, pos(1, 2), ctx)?.markdown ?? "";
    expect(hover).toContain("Greets someone.");
    expect(hover).toContain("`helpers.tf` line 2");
  });

  it("finds references across the files on the load path", () => {
    const { text, ctx } = doc(p("ws", "helpers.tf"));
    const refs = getReferences(text, pos(1, 6), true, ctx).map((l) => path.basename(l.uri));
    expect(refs.sort()).toEqual(["helpers.tf", "main.tf"]);
  });

  it("hints at a library macro that is not on the load path", () => {
    const { text, ctx } = doc(p("ws", "main.tf"));
    const hover = getHover(text, pos(2, 2), ctx)?.markdown ?? "";
    expect(hover).toContain("Not loaded on this file's load path");
    expect(hover).toContain("/require kbstack.tf");
    expect(getDefinition(text, pos(2, 2), ctx).map((l) => path.basename(l.uri))).toEqual(["kbstack.tf"]);
  });

  it("describes commands from the installed tf-help", () => {
    const { ctx } = doc(p("ws", "main.tf"));
    const md = getHover("/let x 1\n", pos(0, 2), ctx)?.markdown ?? "";
    expect(md).toContain("/let <name>=<value>");
    expect(md).toContain("Help text for let.");
    expect(md).toContain("control-flow keyword");
  });

  it("adds tf-help to a loaded library macro, and to the not-loaded hint", () => {
    const loaded = doc(p("ws", "main.tf"));
    expect(getHover(loaded.text, pos(0, 2), loaded.ctx)?.markdown).toContain("Help text for alias.");
    const stray = doc(p("ws", "stray.tf"));
    const md = getHover("/alias n north\n", pos(0, 2), stray.ctx)?.markdown ?? "";
    expect(md).toContain("/require alias.tf\n/alias [<name> [<command>]]");
    expect(md).toContain("Help text for alias.");
    expect(md).toContain("Not loaded on this file's load path");
  });

  it("renames a macro across the files on the load path, and refuses library macros", () => {
    const { text, ctx } = doc(p("ws", "main.tf"));
    const edits = getRenameEdits(text, pos(1, 2), "hello", ctx);
    if ("error" in edits) throw new Error(edits.error);
    expect(edits.map((e) => `${path.basename(e.uri)}:${e.range.start.line}:${e.newText}`).sort()).toEqual([
      "helpers.tf:1:hello",
      "main.tf:1:hello",
    ]);
    expect(prepareRename(text, pos(0, 2), ctx)).toMatchObject({ error: expect.stringContaining("tf's library") });
  });

  it("lists every macro in the workspace's scripts, reached or not, filtered by query", () => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    const all = index.workspaceSymbols("").map((s) => s.symbol.name);
    expect(all.sort()).toEqual(["greet", "n"]);
    expect(index.workspaceSymbols("grt").map((s) => s.symbol.name)).toEqual(["greet"]);
    expect(index.workspaceSymbols("xyz")).toEqual([]);
  });

  it("gives a file no entry point reaches only what stdlib.tf loads", () => {
    const { text, ctx } = doc(p("ws", "stray.tf"));
    expect(getDefinition(text, pos(0, 2), ctx)).toEqual([]);
    expect(getDefinition(text, pos(1, 2), ctx).map((l) => path.basename(l.uri))).toEqual(["stdlib.tf"]);
  });

  it("sees unsaved edits through the overlay", () => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    const edited = "/def -i welcome = /echo\n";
    index.setOverlay(p("ws", "helpers.tf"), edited);
    const text = files[p("ws", "main.tf")] as string;
    const ctx = index.navContext(p("ws", "main.tf"), uriOf);
    expect(getDefinition(text, pos(1, 2), ctx)).toEqual([]);
    expect(ctx.macros.some((m) => m.symbol.name === "welcome")).toBe(true);
  });
});
