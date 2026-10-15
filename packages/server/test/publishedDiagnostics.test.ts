import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { getDiagnostics, type TfDiagnostic } from "@tfscript/core/diagnostics";
import { codeHref, findCode } from "@tfscript/core/rules/table";
import { WorkspaceIndex } from "@tfscript/core/workspace/workspaceIndex";
import { serverDiagnostics } from "./lspClient";

const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));
const WS = path.join(FIXTURES, "ws");
const SETTINGS = { libraryPath: "../tflib" };
const files = readdirSync(WS)
  .filter((f) => f.endsWith(".tf") || f === "tfrc")
  .sort()
  .map((f) => path.join(WS, f));

const read = (f: string): string | undefined => {
  try {
    return readFileSync(f, "utf8");
  } catch {
    return undefined;
  }
};

/**
 * What the server published before its diagnostics moved into core: the file's own diagnostics
 * and then its load-path ones, from a workspace index over the same folder and settings, each
 * converted to an LSP diagnostic as server.ts did.
 */
function expected(): Map<string, unknown[]> {
  const index = new WorkspaceIndex(
    {
      readFile: read,
      listTfFiles: (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".tf")).map((f) => path.join(dir, f)) : []),
      walkTfFiles: () => files,
    },
    { env: {}, homedir: process.env.HOME ?? "", exists: existsSync },
  );
  index.setFolders([WS]);
  index.setSettings(WS, SETTINGS);
  const severity = { error: 1, warning: 2, information: 3 } as const;
  const toLsp = (d: TfDiagnostic, uri: string) => ({
    range: d.range,
    message: d.message,
    code: d.code,
    ...(findCode(d.code) ? { codeDescription: { href: codeHref(d.code) } } : {}),
    source: "tfscript",
    ...(d.related ? { relatedInformation: d.related.map((r) => ({ location: { uri, range: r.range }, message: r.message })) } : {}),
    severity: severity[d.severity],
  });
  return new Map(
    files.map((f) => {
      const text = read(f) ?? "";
      const uri = pathToFileURL(f).href;
      return [f, [...getDiagnostics(text), ...index.loadPathDiagnostics(f, text)].map((d) => toLsp(d, uri))];
    }),
  );
}

describe("the diagnostics the built server publishes", () => {
  it("are each file's own followed by its load-path ones, as before they moved into core", async () => {
    const published = await serverDiagnostics(WS, files, SETTINGS);
    expect(published).toEqual(expected());
    // The fixture covers every kind: an error with a fix, a warning with one, one without, and information.
    const summary = [...published].flatMap(([f, ds]) =>
      (ds as { range: { start: { line: number } }; code: string; severity: number }[]).map(
        (d) => `${path.basename(f)}:${d.range.start.line + 1} ${d.severity} ${d.code}`,
      ),
    );
    expect(summary).toEqual([
      "main.tf:4 1 invalid-macro-name",
      "main.tf:3 2 undefined-macro",
      "main.tf:3 3 undefined-macro",
      "tfrc:4 2 unresolved-load",
    ]);
  }, 30_000);
});
