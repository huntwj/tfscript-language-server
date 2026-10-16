import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { documentDiagnostics } from "@tfscript/core/workspace/documentDiagnostics";
import { WorkspaceIndex } from "@tfscript/core/workspace/workspaceIndex";
import { check } from "../src/check";
import { FIXTURES, LIBRARY_SETTINGS, testHost, WS } from "./fixtures";

/** A temporary folder: `lnk` holds only a link to the fixture workspace (a junction on Windows), `wsj` is one. */
const TMP = mkdtempSync(path.join(tmpdir(), "tfscript-links-"));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));
mkdirSync(path.join(TMP, "lnk", "deeper"), { recursive: true });
symlinkSync(WS, path.join(TMP, "lnk", "deeper", "ws"), "junction");
symlinkSync(WS, path.join(TMP, "wsj"), "junction");
mkdirSync(path.join(TMP, "empty"));

describe("links", () => {
  it("says a folder holds only links the search doesn't follow, rather than nothing", () => {
    const result = check({ paths: ["lnk", "empty"], settings: {}, cwd: TMP }, testHost());
    expect(result.problems).toEqual([
      "lnk has no tf scripts in it, only links to folders (junctions or symbolic links), which a folder's search doesn't follow: name the linked folders themselves.",
      "empty has no tf scripts in it (.tf files, tfrc or .tfrc): name a folder that holds some, or the files themselves.",
    ]);
  });

  it("checks a file once, however many links name it", () => {
    const result = check({ paths: [path.join("wsj", "tfrc"), path.join(WS, "tfrc"), "wsj"], settings: {}, cwd: TMP }, testHost());
    expect(result.files.map((f) => path.relative(TMP, f.file))).toEqual([
      path.join("wsj", "tfrc"),
      path.join("wsj", "extra.tf"),
      path.join("wsj", "lib.tf"),
      path.join("wsj", "main.tf"),
    ]);
  });

  it("places a file in the root by where it really is", () => {
    const direct = codes(check({ paths: [path.join(WS, "main.tf")], root: WS, settings: LIBRARY_SETTINGS, cwd: TMP }, testHost()));
    // In the root, the library setting applies, so /std_helper is found.
    expect(direct).toEqual(["main.tf:4 error invalid-macro-name", "main.tf:3 warning undefined-macro", "main.tf:3 information undefined-macro"]);
    expect(codes(check({ paths: [path.join("wsj", "main.tf")], root: WS, settings: LIBRARY_SETTINGS, cwd: TMP }, testHost()))).toEqual(direct);
    expect(codes(check({ paths: [path.join(WS, "main.tf")], root: "wsj", settings: LIBRARY_SETTINGS, cwd: TMP }, testHost()))).toEqual(direct);
    // Outside the root, it has the default settings: no library, so /std_helper is undefined too.
    expect(codes(check({ paths: [path.join("wsj", "main.tf")], root: "empty", settings: LIBRARY_SETTINGS, cwd: TMP }, testHost()))).toHaveLength(4);
  });

  it("searches a folder named through a link", () => {
    const result = check({ paths: ["wsj"], settings: {}, cwd: TMP }, testHost());
    expect(result.files.map((f) => path.basename(f.file))).toEqual(["extra.tf", "lib.tf", "main.tf", "tfrc"]);
  });
});

const codes = (result: ReturnType<typeof check>) =>
  result.files.flatMap((f) => f.diagnostics.map((d) => `${path.basename(f.file)}:${d.range.start.line + 1} ${d.severity} ${d.code}`));

describe("check", () => {
  it("gives each file core's documentDiagnostics, in a workspace whose one folder is the root", () => {
    const host = testHost();
    const result = check({ paths: ["."], settings: LIBRARY_SETTINGS, cwd: WS }, host);
    expect(result.problems).toEqual([]);
    expect(result.files.map((f) => path.basename(f.file))).toEqual(["extra.tf", "lib.tf", "main.tf", "tfrc"]);
    const index = new WorkspaceIndex(host.fs, host.environment);
    index.setFolders([WS]);
    index.setSettings(WS, LIBRARY_SETTINGS);
    for (const f of result.files) expect(f.diagnostics).toEqual(documentDiagnostics(f.text, f.file, index));
    expect(codes(result)).toEqual([
      "main.tf:4 error invalid-macro-name",
      "main.tf:3 warning undefined-macro",
      "main.tf:3 information undefined-macro",
      "tfrc:4 warning unresolved-load",
    ]);
  });

  it("takes the settings through core, as the editor's are", () => {
    // Without the library, /std_helper is defined nowhere.
    const bare = check({ paths: ["main.tf"], settings: {}, cwd: WS }, testHost());
    expect(codes(bare)).toContain("main.tf:3 warning undefined-macro");
    expect(bare.files[0]?.diagnostics.some((d) => d.message.includes("/std_helper"))).toBe(true);
    const quiet = check(
      { paths: ["."], settings: { ...LIBRARY_SETTINGS, diagnostics: { unresolvedLoads: false, ignoreMacros: ["gr*"] } }, cwd: WS },
      testHost(),
    );
    expect(codes(quiet)).toEqual(["main.tf:4 error invalid-macro-name", "main.tf:3 information undefined-macro"]);
    const none = check({ paths: ["."], settings: { diagnostics: { undefinedMacros: false, unresolvedLoads: false } }, cwd: WS }, testHost());
    expect(codes(none)).toEqual(["main.tf:4 error invalid-macro-name"]);
  });

  it("resolves the root and the paths against the current folder", () => {
    const result = check({ paths: ["ws/main.tf", path.join(WS, "main.tf")], root: "ws", settings: LIBRARY_SETTINGS, cwd: FIXTURES }, testHost());
    expect(result.files.map((f) => f.file)).toEqual([path.join(WS, "main.tf")]);
    expect(codes(result)).toHaveLength(3);
  });

  it("says which paths it couldn't check, and still checks the rest", () => {
    const result = check({ paths: ["missing.tf", "../tflib", "../no-home", "lib.tf"], settings: {}, cwd: WS }, testHost());
    expect(result.files.map((f) => path.basename(f.file))).toEqual(["stdlib.tf", "lib.tf"]);
    expect(result.problems).toEqual([
      "missing.tf doesn't exist: check the path.",
      "../no-home doesn't exist: check the path.",
    ]);
    const empty = check({ paths: ["."], settings: {}, cwd: path.join(FIXTURES, "..") }, { ...testHost(), fs: { ...testHost().fs, walkTfFiles: () => [] } });
    expect(empty.problems).toEqual([". has no tf scripts in it (.tf files, tfrc or .tfrc): name a folder that holds some, or the files themselves."]);
    const unreadable = check({ paths: ["lib.tf"], settings: {}, cwd: WS }, { ...testHost(), fs: { ...testHost().fs, readFile: () => undefined } });
    expect(unreadable.problems).toEqual(["lib.tf can't be read: check that it is a file you may read."]);
    const noRoot = check({ paths: ["lib.tf"], root: "nowhere", settings: {}, cwd: WS }, testHost());
    expect(noRoot).toEqual({ files: [], problems: ["The root folder nowhere doesn't exist: give --root a folder that does."] });
    const fileRoot = check({ paths: ["lib.tf"], root: "tfrc", settings: {}, cwd: WS }, testHost());
    expect(fileRoot).toEqual({ files: [], problems: ["The root tfrc is a file, not a folder: give --root the folder that holds it."] });
  });
});

describe("tfscript.json", () => {
  /** A copy of the fixture workspace in a temporary folder, with `config` as its tfscript.json if given. */
  function workspace(config?: unknown): string {
    const dir = mkdtempSync(path.join(TMP, "configured-"));
    cpSync(WS, dir, { recursive: true });
    if (config !== undefined) writeFileSync(path.join(dir, "tfscript.json"), typeof config === "string" ? config : JSON.stringify(config));
    return dir;
  }
  const library = path.join(FIXTURES, "tflib");

  it("reads the root's own tfscript.json, its relative paths against its folder", () => {
    const dir = workspace({ libraryPath: `../${path.relative(TMP, library)}` });
    const result = check({ paths: ["."], settings: {}, cwd: dir }, testHost());
    expect(result.problems).toEqual([]);
    expect(codes(result)).toEqual([
      "main.tf:4 error invalid-macro-name",
      "main.tf:3 warning undefined-macro",
      "main.tf:3 information undefined-macro",
      "tfrc:4 warning unresolved-load",
    ]);
  });

  it("puts the options over the file's settings, and each diagnostics key over the file's", () => {
    const dir = workspace({ libraryPath: library, diagnostics: { unresolvedLoads: false, ignoreMacros: ["nothing"] } });
    const result = check({ paths: ["."], settings: { diagnostics: { ignoreMacros: ["gr*"] } }, cwd: dir }, testHost());
    expect(codes(result)).toEqual(["main.tf:4 error invalid-macro-name", "main.tf:3 information undefined-macro"]);
  });

  it("reads the file --config names, its folder the root unless --root is given", () => {
    const dir = workspace();
    const elsewhere = mkdtempSync(path.join(TMP, "elsewhere-"));
    writeFileSync(path.join(elsewhere, "settings.json"), JSON.stringify({ libraryPath: library, diagnostics: { unresolvedLoads: false } }));
    const named = check({ paths: ["main.tf"], root: ".", config: path.join(elsewhere, "settings.json"), settings: {}, cwd: dir }, testHost());
    expect(codes(named)).toEqual(["main.tf:4 error invalid-macro-name", "main.tf:3 warning undefined-macro", "main.tf:3 information undefined-macro"]);
    writeFileSync(path.join(dir, "other.json"), JSON.stringify({ diagnostics: { undefinedMacros: false } }));
    const rooted = check({ paths: ["main.tf"], config: "other.json", settings: {}, cwd: dir }, testHost());
    expect(codes(rooted)).toEqual(["main.tf:4 error invalid-macro-name"]);
  });

  it("checks nothing when the file is bad, and says what is wrong and how to fix it", () => {
    const dir = workspace({ entryFiles: "tfrc" });
    expect(check({ paths: ["."], settings: {}, cwd: dir }, testHost())).toEqual({
      files: [],
      problems: ['tfscript.json gives "entryFiles" as the text "tfrc", not a list of paths: write it as "entryFiles": ["tfrc"].'],
    });
    const broken = workspace("{");
    expect(check({ paths: ["."], settings: {}, cwd: broken }, testHost()).problems[0]).toMatch(/^tfscript\.json isn't valid JSON/);
    expect(check({ paths: ["."], config: "nowhere.json", settings: {}, cwd: dir }, testHost())).toEqual({
      files: [],
      problems: ["The settings file nowhere.json doesn't exist: check the path given to --config."],
    });
  });
});
