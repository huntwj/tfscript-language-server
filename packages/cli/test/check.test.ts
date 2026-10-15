import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
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
