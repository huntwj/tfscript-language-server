import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDefinition, getHover, getReferences, getRenameEdits, prepareRename } from "../src/navigation";
import { resolveSettings, toLocalPath, type Environment } from "../src/workspace/settings";
import { MAX_WALKED_FILES, WorkspaceIndex } from "../src/workspace/workspaceIndex";
import { timeBudget } from "./timeBudget";

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
      contexts: [{ name: "default", entryFiles: [p("ws", "main.tf"), p("home", "x.tf")] }],
      activeContext: "default",
      libraryDir: p("ws", "lib"),
      tfPath: [p("home", "tf")],
      workingDir: p("ws", "run"),
      home: p("home"),
      pathMappings: [],
      variables: {},
      tfBuild: "upstream",
    });
  });

  it("maps a tf path in the settings through pathMappings, longest prefix first", () => {
    const s = resolveSettings(
      {
        pathMappings: [
          { tf: "/wotmud/", local: "repo" },
          { tf: "/wotmud/lib", local: "~/tflib" },
        ],
        workingDirectory: "/wotmud",
        tfPath: ["/wotmud/lib/extra"],
      },
      p("ws"),
      env(memoryFs({})),
    );
    expect(s.pathMappings).toEqual([
      { tf: "/wotmud/lib", local: p("home", "tflib") },
      { tf: "/wotmud", local: p("ws", "repo") },
    ]);
    expect(s.workingDir).toBe(p("ws", "repo"));
    expect(s.tfPath).toEqual([p("home", "tflib", "extra")]);
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
      "&/beep",
      "",
      "  Usage: ",
      "",
      "  /BEEP [<number>|on|off]",
      "  ________________________________",
      "",
      "  Help text for beep.",
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
    const md = getHover("/beep 3\n", pos(0, 2), ctx)?.markdown ?? "";
    expect(md).toContain("/beep [<number>|on|off]");
    expect(md).toContain("Help text for beep.");
    expect(md).toContain("built-in command");
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

describe("load contexts", () => {
  // Two ways of starting tf: each tfrc loads shared.tf, but defines `go` differently.
  const files: Record<string, string> = {
    [p("ws", "wot.tfrc")]: "/load wot.tf\n/load shared.tf\n",
    [p("ws", "diku.tfrc")]: "/load diku.tf\n/load shared.tf\n",
    [p("ws", "wot.tf")]: "/def go = /echo wot\n",
    [p("ws", "diku.tf")]: "/def go = /echo diku\n",
    [p("ws", "shared.tf")]: "/def run = /go\n",
  };
  const contexts = { wot: ["wot.tfrc"], diku: ["diku.tfrc"] };

  function index(activeContext?: string) {
    const fs = memoryFs(files);
    const idx = new WorkspaceIndex(fs, env(fs));
    idx.setFolders([p("ws")]);
    idx.setSettings(p("ws"), { contexts, ...(activeContext ? { activeContext } : {}) });
    return idx;
  }
  const goTarget = (idx: WorkspaceIndex) => {
    const text = files[p("ws", "shared.tf")] as string;
    return getDefinition(text, pos(0, 12), idx.navContext(p("ws", "shared.tf"), uriOf)).map((l) => path.basename(l.uri));
  };

  it("sees a shared file through the active context", () => {
    expect(goTarget(index())).toEqual(["wot.tf"]);
    expect(goTarget(index("diku"))).toEqual(["diku.tf"]);
  });

  it("uses a context that loads the file when the active one doesn't", () => {
    const info = index("wot").contextInfo(p("ws", "diku.tf"));
    expect(info).toMatchObject({ active: "wot", used: "diku" });
  });

  it("reports each context's chain to the file", () => {
    const info = index("diku").contextInfo(p("ws", "shared.tf"));
    expect(info.contexts).toEqual([
      { name: "wot", entryFiles: ["wot.tfrc"], loadsFile: true, chain: ["wot.tfrc", "shared.tf"] },
      { name: "diku", entryFiles: ["diku.tfrc"], loadsFile: true, chain: ["diku.tfrc", "shared.tf"] },
    ]);
    expect(index().contextInfo(p("ws", "wot.tf")).contexts[1]).toMatchObject({ name: "diku", loadsFile: false, chain: [] });
  });

  it("falls back to entryFiles as a single default context, and to the first context for an unknown name", () => {
    const fs = memoryFs(files);
    const idx = new WorkspaceIndex(fs, env(fs));
    idx.setFolders([p("ws")]);
    idx.setSettings(p("ws"), { entryFiles: ["wot.tfrc"], activeContext: "nope" });
    expect(idx.contextInfo(p("ws", "shared.tf"))).toMatchObject({ active: "default", used: "default" });
    expect(goTarget(index("nope"))).toEqual(["wot.tf"]);
  });
});

describe("variables through the workspace index", () => {
  const files = {
    [p("lib", "stdlib.tf")]: "/set libwidth=72\n",
    [p("ws", "tfrc")]: "/load conf.tf\n/load main.tf\n",
    [p("ws", "conf.tf")]: "/set width=80\n",
    [p("ws", "main.tf")]: "/def -i show = /echo %{width} %{libwidth}\n",
  };
  const ctx = () => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    return index.navContext(p("ws", "main.tf"), uriOf);
  };
  const text = files[p("ws", "main.tf")] as string;

  it("finds a global's /set in another file on the load path, and in tf's library", () => {
    expect(getDefinition(text, pos(0, 24), ctx()).map((l) => path.basename(l.uri))).toEqual(["conf.tf"]);
    expect(getDefinition(text, pos(0, 34), ctx()).map((l) => path.basename(l.uri))).toEqual(["stdlib.tf"]);
  });

  it("renames a global across the load path, but not one tf's library uses", () => {
    const edits = getRenameEdits(text, pos(0, 24), "cols", ctx());
    expect(Array.isArray(edits) && edits.map((e) => path.basename(e.uri)).sort()).toEqual(["conf.tf", "main.tf"]);
    expect(prepareRename(text, pos(0, 34), ctx())).toEqual({ error: "libwidth is used by tf's library, which a rename here can't change, so it can't be renamed." });
  });
});

describe("undefined macros through the workspace index", () => {
  const diagnose = (files: Record<string, string>, file: string, settings: Record<string, unknown> = {}) => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib"), ...settings });
    return index.loadPathDiagnostics(file, files[file] as string).filter((d) => d.code === "undefined-macro");
  };

  it("is on by default, and can be turned off", () => {
    const files = { [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: "/def a = /nowhere\n" };
    expect(diagnose(files, p("ws", "tfrc"))).toHaveLength(1);
    expect(diagnose(files, p("ws", "tfrc"), { diagnostics: { undefinedMacros: false } })).toEqual([]);
  });

  it("offers to /require a workspace or library file that defines the name, by a path tf resolves", () => {
    const files = {
      [p("lib", "stdlib.tf")]: "",
      [p("lib", "textutil.tf")]: "/def -i lcase_all = /echo\n",
      [p("ws", "tfrc")]: "/def a = /helper%; /lcase_all\n",
      [p("ws", "sub", "helpers.tf")]: "/def -i helper = /echo\n",
    };
    expect(diagnose(files, p("ws", "tfrc")).map((d) => d.fix?.title)).toEqual(["Add /require sub/helpers.tf", "Add /require textutil.tf"]);
  });

  it("leaves tf's own library alone, which calls hook points a user may define", () => {
    const files = { [p("lib", "stdlib.tf")]: "", [p("lib", "kbbind.tf")]: "/def -i key_meta_f1 = /key_esc_f1\n", [p("ws", "tfrc")]: "" };
    expect(diagnose(files, p("lib", "kbbind.tf"))).toEqual([]);
  });

  it("only notes a name in a file off the load path when a file that loads it has a load it can't follow", () => {
    const files = {
      [p("lib", "stdlib.tf")]: "",
      [p("ws", "tfrc")]: "",
      [p("ws", "main.tf")]: "/require dep/main.tf\n/require ws/score.tf\n",
      [p("ws", "score.tf")]: "/def s = /from_dep\n",
      [p("ws", "alone.tf")]: "/def s = /from_dep\n",
    };
    const [score] = diagnose(files, p("ws", "score.tf"));
    expect(score).toMatchObject({ severity: "information" });
    expect(score?.message).toContain("the load of dep/main.tf (main.tf line 1) can't be followed");
    expect(diagnose(files, p("ws", "alone.tf"))).toMatchObject([{ severity: "warning" }]);
  });
});

describe("toLocalPath", () => {
  const mappings = [
    { tf: "/wotmud", local: p("repo") },
    { tf: "/", local: p("root") },
  ];

  it("resolves .. and // before matching, as tf's open() would", () => {
    expect(toLocalPath("/wotmud/x/../y.tf", mappings)).toBe(p("repo", "y.tf"));
    expect(toLocalPath("/wotmud//y.tf", mappings)).toBe(p("repo", "y.tf"));
    expect(toLocalPath("/wotmud/../etc/z.tf", mappings)).toBe(p("root", "etc", "z.tf"));
  });

  it("leaves a UNC path alone, even with a / mapping", () => {
    expect(toLocalPath(String.raw`\\server\share\a.tf`, mappings)).toBe(String.raw`\\server\share\a.tf`);
    expect(toLocalPath("//server/share/a.tf", mappings)).toBe("//server/share/a.tf");
  });

  it("matches whole segments only", () => {
    expect(toLocalPath("/wotmudx/a.tf", [{ tf: "/wotmud", local: p("repo") }])).toBe("/wotmudx/a.tf");
  });
});

describe("undefined macros, cost", () => {
  function counted(files: Record<string, string>) {
    const fs = memoryFs(files);
    const calls = { walks: 0, reads: 0 };
    return {
      calls,
      fs: {
        ...fs,
        walkTfFiles: (dir: string) => {
          calls.walks += 1;
          return fs.walkTfFiles(dir);
        },
        readFile: (f: string) => {
          calls.reads += 1;
          return fs.readFile(f);
        },
      },
      exists: fs.exists,
    };
  }

  it("keeps a keystroke in a 500-file workspace well under 50 ms, walking the folder once", () => {
    const files: Record<string, string> = { [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: "/load f0.tf\n" };
    for (let i = 0; i < 500; i += 1) files[p("ws", `f${i}.tf`)] = `/def -i m${i} = /echo ${i}%; /m${(i + 1) % 500}\n/load g${i}.tf\n`;
    const { fs, calls, exists } = counted(files);
    const index = new WorkspaceIndex(fs, { env: {}, homedir: p("home"), exists });
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib"), workingDirectory: "." });
    const file = p("ws", "f0.tf");
    const text = files[file] as string;
    index.loadPathDiagnostics(file, text);
    const walks = calls.walks;
    const started = performance.now();
    for (let i = 0; i < 20; i += 1) {
      const edited = `${text};; ${i}\n`;
      index.setOverlay(file, edited);
      index.loadPathDiagnostics(file, edited);
    }
    expect((performance.now() - started) / 20).toBeLessThan(timeBudget(50));
    expect(calls.walks).toBe(walks);
  });

  it("walks nothing for a file in no workspace folder", () => {
    const { fs, calls, exists } = counted({ [p("home", ".tfrc")]: "/def a = /nowhere\n", [p("ws", "x.tf")]: "" });
    const index = new WorkspaceIndex(fs, { env: {}, homedir: p("home"), exists });
    index.setFolders([p("ws")]);
    const diagnostics = index.loadPathDiagnostics(p("home", ".tfrc"), "/def a = /nowhere\n");
    expect(calls.walks).toBe(0);
    expect(diagnostics.map((d) => d.code)).toEqual(["undefined-macro"]);
  });

  it("forgets what it read from disk when a watched file changes", () => {
    const files = { [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: "/def a = /later\n" };
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    expect(index.loadPathDiagnostics(p("ws", "tfrc"), files[p("ws", "tfrc")])).toHaveLength(1);
    const added = memoryFs({ ...files, [p("ws", "later.tf")]: "/def -i later = /echo\n" });
    Object.assign(fs, added);
    expect(index.loadPathDiagnostics(p("ws", "tfrc"), files[p("ws", "tfrc")])).toHaveLength(1);
    index.filesChanged();
    expect(index.loadPathDiagnostics(p("ws", "tfrc"), files[p("ws", "tfrc")]).map((d) => d.fix?.title)).toEqual(["Add /require later.tf"]);
  });

  it("writes the /require for the TFPATH in effect on the path, not the settings'", () => {
    const files = {
      [p("lib", "stdlib.tf")]: "",
      [p("ws", "tfrc")]: `/set TFPATH=${p("ws", "lib2")}\n/load ${p("ws", "main.tf")}\n`,
      [p("ws", "main.tf")]: "/def a = /helper\n",
      [p("ws", "lib2", "helpers.tf")]: "/def -i helper = /echo\n",
    };
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    // tf runs elsewhere, starting with another TFPATH: only the tfrc's TFPATH reaches lib2.
    index.setSettings(p("ws"), { libraryPath: p("lib"), entryFiles: ["tfrc"], workingDirectory: p("run"), tfPath: [p("other")] });
    expect(index.loadPathDiagnostics(p("ws", "main.tf"), files[p("ws", "main.tf")]).map((d) => d.fix?.title)).toEqual(["Add /require helpers.tf"]);
  });
});

describe("tfscript.variables", () => {
  it("keeps names tf allows with string values, and drops the rest", () => {
    const raw = { variables: { wotmud_repo_dir: "/wotmud", "bad name": "x", n: 3 } } as unknown as Parameters<typeof resolveSettings>[0];
    expect(resolveSettings(raw, p("ws"), env(memoryFs({}))).variables).toEqual({ wotmud_repo_dir: "/wotmud" });
  });
});

describe("undefined macros, when files change", () => {
  /** A file system whose files can change under the index, with modification times and a record of walk limits. */
  function liveFs(initial: Record<string, string>) {
    const files = new Map(Object.entries(initial).map(([k, v]) => [key(k), { name: k, text: v, mtime: 1 }]));
    const limits: (number | undefined)[] = [];
    return {
      limits,
      write(f: string, text: string) {
        const old = files.get(key(f));
        files.set(key(f), { name: f, text, mtime: (old?.mtime ?? 0) + 1 });
      },
      remove(f: string) {
        files.delete(key(f));
      },
      fs: {
        readFile: (f: string) => files.get(key(f))?.text,
        mtime: (f: string) => files.get(key(f))?.mtime,
        listTfFiles: (dir: string) => [...files.values()].map((e) => e.name).filter((f) => key(path.dirname(f)) === key(dir) && f.endsWith(".tf")),
        walkTfFiles: (dir: string, limit?: number) => {
          limits.push(limit);
          const found = [...files.values()].map((e) => e.name).filter((f) => key(f).startsWith(key(dir) + path.sep) && /(\.tf|[/\\]\.?tfrc)$/.test(f));
          return found.slice(0, limit ?? found.length);
        },
      },
      exists: (f: string) => files.has(key(f)),
    };
  }
  const indexOf = (live: ReturnType<typeof liveFs>) => {
    const index = new WorkspaceIndex(live.fs, { env: {}, homedir: p("home"), exists: live.exists });
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib"), entryFiles: ["tfrc"] });
    return index;
  };
  const severities = (index: WorkspaceIndex, file: string, text: string) =>
    index.loadPathDiagnostics(file, text).filter((d) => d.code === "undefined-macro").map((d) => d.severity);
  const tfrc = "/def a = /helper\n";

  it("reads a closed file from disk again, not what it read before it was opened", () => {
    const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: tfrc, [p("ws", "helpers.tf")]: "" });
    const index = indexOf(live);
    index.setWatchedRoots([p("ws")]);
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
    index.setOverlay(p("ws", "helpers.tf"), "");
    live.write(p("ws", "helpers.tf"), "/def -i helper = /echo\n");
    index.setOverlay(p("ws", "helpers.tf"), undefined);
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
  });

  it("works out again whether loads resolve when a file is opened", () => {
    const loose = "/require dep.tf\n/def a = /helper\n";
    const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: "", [p("ws", "loose.tf")]: loose });
    const index = indexOf(live);
    // dep.tf doesn't exist, so it may define /helper: only a note.
    expect(severities(index, p("ws", "loose.tf"), loose)).toEqual(["information"]);
    index.setOverlay(p("ws", "dep.tf"), "/def -i other = /echo\n");
    expect(severities(index, p("ws", "loose.tf"), loose)).toEqual(["warning"]);
  });

  it("checks the modification time of a file no watcher covers, such as a library file, at most once a second", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("lib", "textutil.tf")]: "/def -i helper = /echo\n", [p("ws", "tfrc")]: tfrc });
      const index = indexOf(live);
      index.setWatchedRoots([p("ws")]);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
      live.write(p("lib", "textutil.tf"), "");
      // Within the second, a keystroke doesn't stat every file again.
      vi.setSystemTime(500);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
      vi.setSystemTime(1500);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("asks once for a check when the second is up, when it skipped one with unwatched files cached", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("lib", "textutil.tf")]: "/def -i helper = /echo\n", [p("ws", "tfrc")]: tfrc });
      const index = indexOf(live);
      index.setWatchedRoots([p("ws")]);
      const asked: number[] = [];
      index.setRecheck((delay) => asked.push(delay));
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
      vi.setSystemTime(50);
      live.write(p("lib", "textutil.tf"), "");
      vi.setSystemTime(150);
      severities(index, p("ws", "tfrc"), tfrc);
      vi.setSystemTime(300); // the debounced revalidation, still inside the second
      severities(index, p("ws", "tfrc"), tfrc);
      expect(asked).toEqual([850]);
      vi.setSystemTime(1000); // the check it asked for
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists a library no watcher covers again after a few seconds", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: tfrc });
      const index = indexOf(live);
      index.setWatchedRoots([p("ws")]);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
      live.write(p("lib", "textutil.tf"), "/def -i helper = /echo\n");
      vi.setSystemTime(11_000);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses an open library file's unsaved text", () => {
    const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("lib", "textutil.tf")]: "", [p("ws", "tfrc")]: tfrc });
    const index = indexOf(live);
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
    index.setOverlay(p("lib", "textutil.tf"), "/def -i helper = /echo\n");
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
  });

  it("trusts what it read under a watched folder until a change is reported, folders deleted included", () => {
    const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: tfrc, [p("ws", "sub", "helpers.tf")]: "/def -i helper = /echo\n" });
    const index = indexOf(live);
    index.setWatchedRoots([p("ws")]);
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
    live.remove(p("ws", "sub", "helpers.tf")); // the sub folder deleted
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
    index.filesChanged(); // the client's delete event for the folder
    expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
  });

  it("lists a folder no watcher covers again after a few seconds", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const live = liveFs({ [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: tfrc });
      const index = indexOf(live);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
      live.write(p("ws", "new.tf"), "/def -i helper = /echo\n");
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["warning"]);
      vi.setSystemTime(11_000);
      expect(severities(index, p("ws", "tfrc"), tfrc)).toEqual(["information"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops the walk at the limit, and then only notes a name it didn't find, naming the limit", () => {
    const files: Record<string, string> = { [p("lib", "stdlib.tf")]: "", [p("ws", "tfrc")]: tfrc };
    for (let i = 0; i <= MAX_WALKED_FILES; i += 1) files[p("ws", "many", `f${i}.tf`)] = "";
    const live = liveFs(files);
    const index = indexOf(live);
    const [d] = index.loadPathDiagnostics(p("ws", "tfrc"), tfrc);
    expect(live.limits).toEqual([MAX_WALKED_FILES + 1]);
    expect(d).toMatchObject({ code: "undefined-macro", severity: "information" });
    expect(d?.message).toContain(`the first ${MAX_WALKED_FILES} tf files of this folder`);
  });
});

describe("macroNameTaken", () => {
  const files: Record<string, string> = {
    [p("lib", "stdlib.tf")]: "/def -i stdthing = /echo\n",
    [p("lib", "kbstack.tf")]: "/def -i kb_push = /echo\n",
    [p("ws", "tfrc")]: "/load main.tf\n",
    [p("ws", "main.tf")]: "/def go = /echo go\n",
    [p("ws", "other.tf")]: "/def go_extracted = /echo\n/def build = /def ~body_%1 = /echo\n",
  };

  it("counts this file's macros, the load path's, the library's and the rest of the folder's", () => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    const taken = index.macroNameTaken(p("ws", "main.tf"), "/def go = /echo go\n/def mine = /echo\n");
    expect(["go", "mine", "stdthing", "kb_push", "go_extracted", "build", "~body_x"].filter((n) => !taken(n))).toEqual([]);
    expect(taken("go_extracted2")).toBe(false);
  });
});

describe("macroDefinedOutside and macroMentionedOutside", () => {
  const files: Record<string, string> = {
    [p("lib", "stdlib.tf")]: "/def -i stdthing = /echo\n",
    [p("ws", "tfrc")]: "/load main.tf\n",
    [p("ws", "main.tf")]: "/def go = /echo go\n/def helper = /echo\n/def solo = /echo\n",
    [p("ws", "other.tf")]: "/def helper = /echo again\n/def build = /def ~body_%1 = /echo\n/def user = /solo\n",
  };

  it("sees the load path's, the library's and the rest of the folder's /defs, but not the file's own", () => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    const outside = index.macroDefinedOutside(p("ws", "main.tf"));
    expect(["stdthing", "helper", "~body_x"].filter((n) => !outside(n))).toEqual([]);
    expect(["go", "solo"].filter((n) => outside(n))).toEqual([]);
    const mentioned = index.macroMentionedOutside(p("ws", "main.tf"));
    expect(mentioned("solo")).toBe(true);
    expect(mentioned("go")).toBe(false);
  });

  it("sees a library macro redefined in a workspace folder, and knows a library file", () => {
    const fs = memoryFs({ ...files, [p("ws", "over.tf")]: "/def -i stdthing = /echo mine\n" });
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { libraryPath: p("lib") });
    expect(index.macroDefinedOutside(p("lib", "stdlib.tf"))("stdthing")).toBe(true);
    expect(index.isLibraryFile(p("lib", "stdlib.tf"))).toBe(true);
    expect(index.isLibraryFile(p("ws", "main.tf"))).toBe(false);
  });
});
