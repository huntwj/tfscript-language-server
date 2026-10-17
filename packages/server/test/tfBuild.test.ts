import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { serverDiagnostics } from "../../../test-support/lspClient";

const WS = mkdtempSync(path.join(tmpdir(), "tfscript-build-"));
afterAll(() => rmSync(WS, { recursive: true, force: true }));
const TFRC = path.join(WS, "tfrc");
const LIB = path.join(WS, "lib.tf");
writeFileSync(TFRC, "/load lib.tf\r\n/greet\r\n");
writeFileSync(LIB, "/def -i \\\r\n  greet = /echo hi\r\n");

const codes = (published: Map<string, unknown[]>, file: string) => (published.get(file) as { code: string }[]).map((d) => d.code);

describe("the server with files saved with CRLF line endings", () => {
  it("warns upstream, where a \\ before the CR doesn't continue the line", async () => {
    const published = await serverDiagnostics(WS, [LIB, TFRC], { entryFiles: ["tfrc"] });
    expect(codes(published, LIB)).toContain("backslash-not-last");
    expect(codes(published, TFRC)).toContain("undefined-macro");
  }, 30_000);

  it("reads them as LF files for the fork, the open file and the one it loads", async () => {
    const published = await serverDiagnostics(WS, [LIB, TFRC], { entryFiles: ["tfrc"], tfBuild: "fork" });
    expect(codes(published, LIB)).toEqual([]);
    expect(codes(published, TFRC)).toEqual([]);
  }, 30_000);
});
