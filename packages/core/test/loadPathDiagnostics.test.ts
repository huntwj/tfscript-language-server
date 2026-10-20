import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildLoadGraph } from "../src/workspace/loadGraph";
import { loadPathDiagnostics, macroNames, nearestName, type LoadPathDiagnosticOptions } from "../src/workspace/loadPathDiagnostics";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);

function graphOf(files: Record<string, string>, home?: string) {
  const byKey = new Map(Object.entries(files).map(([k, v]) => [path.resolve(k).toLowerCase(), v]));
  return buildLoadGraph({
    entryFiles: [p("tfrc")],
    workingDir: p("cwd"),
    readFile: (f) => byKey.get(path.resolve(f).toLowerCase()),
    ...(home ? { home } : {}),
  });
}

function check(files: Record<string, string>, file: string, options: Partial<LoadPathDiagnosticOptions> = {}, home?: string) {
  const graph = graphOf(files, home);
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
    expect(d?.message).toBe('tf won\'t find "missing.tf": fix the path, or set tfscript.workingDirectory to the folder tf runs in.');
    expect(d?.explanation).toContain(p("cwd", "missing.tf"));
    expect(d?.explanation).toContain("not from this file's folder");
  });

  it("asks for tf's library, quietly, for one of its files when no library folder is known", () => {
    const files = { [p("tfrc")]: "/load alias.tf\n/alias ki /kill %{*}\n" };
    const found = check(files, p("tfrc"));
    const load = found.find((d) => d.code === "unresolved-load");
    const alias = found.find((d) => d.code === "undefined-macro");
    expect(load).toMatchObject({ code: "unresolved-load", severity: "information", label: "can't follow" });
    expect(load?.message).toBe(
      "tf's library isn't known here, and \"alias.tf\" is one of its files: set tfscript.libraryPath to the folder that holds stdlib.tf.",
    );
    // tf finds ./alias.tf in TFLIBDIR too.
    const dotted = check({ [p("tfrc")]: "/load ./alias.tf\n" }, p("tfrc"));
    expect(dotted).toMatchObject([{ severity: "information", label: "can't follow" }]);
    // A macro that file would define is then only a note, naming the load.
    expect(alias).toMatchObject({ code: "undefined-macro", severity: "information" });
    expect(alias?.message).toContain("the load of alias.tf (tfrc line 1) can't be followed");
  });

  it("still warns about a library file name when tf would search somewhere else instead", () => {
    const missing = (graph: ReturnType<typeof buildLoadGraph>) =>
      loadPathDiagnostics(p("tfrc"), "/load alias.tf\n", graph, { unresolvedLoads: true, undefinedMacros: false });
    const readFile = (f: string) => (path.resolve(f) === p("tfrc") ? "/load alias.tf\n" : undefined);
    // A library folder that doesn't hold it, and a TFPATH, which tf searches instead of TFLIBDIR.
    for (const where of [{ libraryDir: p("lib") }, { tfPath: [p("tf")] }]) {
      const graph = buildLoadGraph({ entryFiles: [p("tfrc")], workingDir: p("cwd"), readFile, ...where });
      expect(missing(graph)).toMatchObject([{ severity: "warning", message: expect.stringMatching(/^tf won't find "alias.tf"/) }]);
    }
    // A script's own empty TFLIBDIR leaves tf nowhere to look (command.c:530-534).
    const emptied = check({ [p("tfrc")]: "/set TFLIBDIR=\n/load alias.tf\n" }, p("tfrc"));
    expect(emptied).toMatchObject([{ severity: "warning", message: expect.stringMatching(/^tf won't find "alias.tf"/) }]);
  });

  it("gives working-directory advice only for a relative path, which is the only kind tf searches", () => {
    const [abs] = check({ [p("tfrc")]: `/load ${p("lib", "gone.tf")}\n` }, p("tfrc"));
    expect(abs?.message).toMatch(new RegExp(`^tf won't find "${p("lib", "gone.tf").replace(/\\/g, "\\\\")}": fix the path`));
    expect(abs?.message).not.toContain("workingDirectory");
    expect(abs?.explanation).toContain(`The path is absolute, so tf looks only at \`${p("lib", "gone.tf")}\`.`);
  });

  it("suggests a path mapping for a Unix path nothing maps, which tf may see somewhere else", () => {
    const [d] = check({ [p("tfrc")]: "/load /wotmud/tf/gone.tf\n" }, p("tfrc"));
    expect(d?.message).toBe('tf won\'t find "/wotmud/tf/gone.tf": fix the path, or if tf runs where that path exists, map it with tfscript.pathMappings.');
    expect(d?.explanation).toContain("tfscript.pathMappings");
  });

  it("says a ~/ path is under HOME, and that HOME isn't known when it isn't, rather than show a made-up path", () => {
    const [known] = check({ [p("tfrc")]: "/load ~/x.tf\n" }, p("tfrc"), {}, p("home"));
    expect(known?.message).toBe(`tf won't find "~/x.tf" in its HOME directory (${p("home", "x.tf")}): fix the path.`);
    const [unknown] = check({ [p("tfrc")]: "/load ~/x.tf\n/load ~\n" }, p("tfrc"));
    expect(unknown).toMatchObject({ severity: "information" });
    expect(unknown?.message).toBe(
      "This load can't be followed here: HOME isn't known on this load path, and ~ means tf's HOME: set tfscript.homeDirectory.",
    );
  });

  it("points at the load the warning is about when an /eval line names the same file twice", () => {
    const twice = "/eval /load x.tf%; /load x.tf\n";
    const echo = "/eval /echo x.tf%; /load x.tf\n";
    const at = (text: string) => check({ [p("tfrc")]: text }, p("tfrc")).map((d) => d.range.start.character);
    expect(at(twice)).toEqual([twice.indexOf("x.tf"), twice.lastIndexOf("x.tf")]);
    expect(at(echo)).toEqual([echo.lastIndexOf("x.tf")]);
  });

  it("points at a filename on a continuation line", () => {
    const [d] = check({ [p("tfrc")]: "/eval \\\n  /load x.tf\n" }, p("tfrc"));
    expect(d?.range).toEqual({ start: { line: 1, character: 8 }, end: { line: 1, character: 12 } });
  });

  it("notes, without warning, an /eval path built from a variable it can't see", () => {
    const [d] = check({ [p("tfrc")]: "/eval /load %{somewhere}/x.tf\n" }, p("tfrc"));
    expect(d).toMatchObject({ code: "unresolved-load", severity: "information" });
  });

  it("notes, without warning, a ~user path it can't find, since user's home directory can't be checked", () => {
    const [d] = check({ [p("tfrc")]: "/load ~bob/x.tf\n" }, p("tfrc"));
    expect(d).toMatchObject({ code: "unresolved-load", severity: "information", range: { start: { line: 0, character: 6 } } });
    expect(d?.message).toBe("This load can't be followed here, since ~bob depends on whether user bob exists: write the full path to have it checked.");
    expect(d?.explanation).toBe(
      "tf takes `~bob` from user `bob`'s home directory, or, if there is no such user, as a folder named `~bob` in its " +
        "current directory. If `bob` is misspelt, or there is no such user, tf doesn't warn: it reads `./~bob/x.tf` from its current directory instead.",
    );
  });

  it("says when a path's variable is unknown because a /set inside an /if or /while may change it", () => {
    const text = "/set d=/x\n/if (d =~ \"q\") /set d=/y%; /endif\n/eval /load %{d}/a.tf\n/while (0) /set TFPATH=/z%; /done\n/load b.tf\n";
    const [d, tfpath] = check({ [p("tfrc")]: text }, p("tfrc"));
    expect(d).toMatchObject({ severity: "information", range: { start: { line: 2 } } });
    expect(d?.message).toBe(
      "This load can't be followed here: %{d} is set inside an /if or /while on the load path, and this check can't tell " +
        "whether that /set runs. To have it checked, give %{d} a value in tfscript.variables.",
    );
    expect(d?.explanation).toContain("`tfscript.variables` gives variables the value they have when tf starts");
    expect(tfpath?.message).toContain("%{TFPATH} is set inside an /if or /while on the load path");
  });

  it("warns about a missing file whose name starts with a %% run, at the first % written", () => {
    // tf looks for %g.tf here.
    for (const eol of ["\n", "\r\n"]) {
      const [d] = check({ [p("tfrc")]: `/if (1) /load %%g.tf%; /endif${eol}` }, p("tfrc"));
      expect(d).toMatchObject({ severity: "warning", range: { start: { line: 0, character: 14 }, end: { line: 0, character: 20 } } });
      expect(d?.message).toContain('"%%g.tf" (%g.tf)');
    }
  });

  it("warns about a missing file in a top-level /if whose name has a %% run", () => {
    const [d] = check({ [p("tfrc")]: "/if (1) /load x%%y.tf%; /endif\n" }, p("tfrc"));
    expect(d).toMatchObject({ severity: "warning", range: { start: { line: 0, character: 14 } } });
  });

  it("leaves an unexpanded top-level path to the not-substituted-here rule", () => {
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

  it("warns about a call to a name defined nowhere, offering the one visible name it's a typo of", () => {
    const files = {
      [p("tfrc")]: "/load a.tf\n",
      [p("cwd", "a.tf")]: "/def go = /wot_mount x%; /echo ok\n/def wot_mount_setMount = /echo\n/def rh = /wot_mount_setmout x\n",
    };
    const [none, typo] = check(files, p("cwd", "a.tf"));
    expect(none).toMatchObject({ code: "undefined-macro", severity: "warning", range: { start: { line: 0, character: 11 } } });
    expect(none?.message).toBe("There's no macro or command /wot_mount anywhere tf can see: check the name.");
    expect(none?.fix).toBeUndefined();
    // Suggested as its /def spells it.
    expect(typo?.message).toBe("There's no macro or command /wot_mount_setmout: did you mean /wot_mount_setMount?");
    expect(typo?.fix).toEqual({
      title: "Change to /wot_mount_setMount",
      edits: [{ range: { start: { line: 2, character: 11 }, end: { line: 2, character: 28 } }, newText: "wot_mount_setMount" }],
    });
  });

  it("only counts a /name at the start of a statement tf runs, with /!name a call and /@name the builtin", () => {
    const files = { [p("tfrc")]: "/def a = /echo try /nosuch1%; /@nosuch2%; /!nosuch3%; /if /nosuch4%; /then /endif\n" };
    expect(check(files, p("tfrc")).map((d) => /\/(\w+)/.exec(d.message)?.[1])).toEqual(["nosuch3", "nosuch4"]);
  });

  it("checks a file no load path reaches against everything it can see", () => {
    const files = { [p("tfrc")]: "/echo\n", [p("stray.tf")]: "/def a = /nowhere%; /echo\n" };
    expect(check(files, p("stray.tf"))).toMatchObject([{ code: "undefined-macro", severity: "warning" }]);
  });

  describe("a name defined in a file this one doesn't load", () => {
    const helpers = p("sub", "helpers.tf");
    const notes = (text: string) => {
      const files = { [p("tfrc")]: text };
      const elsewhere = [{ file: helpers, label: "sub/helpers.tf", library: false, defs: macroNames("/def -i helper = /echo\n") }];
      const requirePath = (f: string) => (f === helpers ? "sub/helpers.tf" : undefined);
      return loadPathDiagnostics(p("tfrc"), text, graphOf(files), { unresolvedLoads: true, undefinedMacros: true }, { elsewhere, requirePath });
    };
    const insert = (text: string) => notes(text)[0]?.fix?.edits[0];

    it("is a note, with a fix that adds the /require after the /loaded line", () => {
      const [d] = notes(";; my tfrc\n/loaded my_tfrc\n/def a = /helper\n");
      expect(d).toMatchObject({ code: "undefined-macro", severity: "information" });
      expect(d?.message).toBe("/helper is defined in sub/helpers.tf, which isn't on this file's load path: add /require sub/helpers.tf.");
      expect(d?.fix).toEqual({
        title: "Add /require sub/helpers.tf",
        edits: [{ range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } }, newText: "/require sub/helpers.tf\n" }],
      });
    });

    it("uses the file's own line ending", () => {
      expect(insert(";; x\r\n/def a = /helper\r\n")?.newText).toBe("/require sub/helpers.tf\r\n");
    });

    it("goes after a last /loaded line with no newline after it", () => {
      expect(insert("/def a = /helper\n/loaded tok")).toEqual({
        range: { start: { line: 1, character: 11 }, end: { line: 1, character: 11 } },
        newText: "\n/require sub/helpers.tf",
      });
    });

    it("goes above a ;;; doc comment that belongs to the first /def, but below a ;;; header", () => {
      expect(insert(";; header\n\n;;; does a\n/def a = /helper\n")?.range.start.line).toBe(2);
      expect(insert(";;; my_lib.tf: helpers\n;;; by me\n/def a = /helper\n")?.range.start.line).toBe(2);
    });
  });

  it("counts /@def, and a quoted option with an escaped quote, as defining the name", () => {
    expect(macroNames('/@def -i built = /echo\n/def -t"a \\" b" quoted = /echo\n').names).toEqual(
      new Map([
        ["built", "built"],
        ["quoted", "quoted"],
      ]),
    );
  });

  it("only notes, naming the load, when a load on the path can't be followed", () => {
    const files = { [p("tfrc")]: "/eval /load %{somewhere}/lib.tf\n/def a = /from_lib\n" };
    const d = check(files, p("tfrc")).find((x) => x.code === "undefined-macro");
    expect(d).toMatchObject({ severity: "information" });
    expect(d?.message).toBe(
      "/from_lib isn't defined in any file this check can read, but the load of %{somewhere}/lib.tf (tfrc line 1) can't be followed: make that load resolve, or check the name.",
    );
  });

  it("names the unfollowed load whose file is named after the macro, when there is one", () => {
    const files = { [p("tfrc")]: "/eval /load %{d}/kv.tf\n/eval /load %{d}/alias.tf\n/def a = /alias x y%; /kv_new t%; /other_thing\n" };
    const notes = check(files, p("tfrc")).filter((x) => x.code === "undefined-macro").map((d) => d.message);
    expect(notes[0]).toMatch(/^\/alias .*the load of %\{d\}\/alias\.tf \(tfrc line 2\)/);
    expect(notes[1]).toMatch(/^\/kv_new .*the load of %\{d\}\/kv\.tf \(tfrc line 1\)/);
    expect(notes[2]).toMatch(/^\/other_thing .*the load of %\{d\}\/kv\.tf \(tfrc line 1\)/);
  });

  it("leaves names on the ignore list alone, with * matching any run of characters", () => {
    const files = { [p("tfrc")]: "/def a = /made_later%; /gen_x%; /other\n" };
    expect(check(files, p("tfrc"), { ignoreMacros: ["MADE_LATER", "gen_*"] }).map((d) => d.message)).toEqual([
      "There's no macro or command /other anywhere tf can see: check the name.",
    ]);
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

describe("nearestName", () => {
  const names = ["wot_mount_setmount", "echo", "endif", "kb_push", "kb_pop"];

  it("allows one edit in a short name and two in a longer one", () => {
    expect(nearestName("ecoh", names)).toBe("echo");
    // Under 4 characters a name is too close to too much to guess.
    expect(nearestName("eco", names)).toBeUndefined();
    expect(nearestName("ehco", ["echo"])).toBe("echo");
    expect(nearestName("ec", names)).toBeUndefined();
    expect(nearestName("wot_mount_stmont", names)).toBe("wot_mount_setmount");
  });

  it("gives no suggestion when two names are as close", () => {
    expect(nearestName("kb_po", names)).toBe("kb_pop");
    expect(nearestName("key_c", ["key_a", "key_b"])).toBeUndefined();
  });
});
