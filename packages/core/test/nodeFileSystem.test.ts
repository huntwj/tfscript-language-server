import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { listTfFiles, readFile, walkTfFiles } from "../src/workspace/nodeFileSystem";

const root = mkdtempSync(path.join(tmpdir(), "tfscript-fs-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const write = (rel: string, text = "") => {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), text);
};
write("tfrc");
write(".tfrc");
write("a.tf", "/def a = /echo a\n");
write("notes.txt");
write("sub/b.tf");
write(".jj/repo/c.tf");
write("node_modules/d.tf");

describe("the node file system", () => {
  it("walks every tf script, skipping .jj, .git and node_modules", () => {
    const found = walkTfFiles(root).map((f) => path.relative(root, f).split(path.sep).join("/")).sort();
    expect(found).toEqual([".tfrc", "a.tf", "sub/b.tf", "tfrc"]);
    expect(walkTfFiles(root, 2)).toHaveLength(2);
  });

  it("lists a folder's own .tf files, and reads a missing file as undefined", () => {
    expect(listTfFiles(root).map((f) => path.basename(f))).toEqual(["a.tf"]);
    expect(listTfFiles(path.join(root, "missing"))).toEqual([]);
    expect(readFile(path.join(root, "a.tf"))).toBe("/def a = /echo a\n");
    expect(readFile(path.join(root, "missing.tf"))).toBeUndefined();
  });
});
