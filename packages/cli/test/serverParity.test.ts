import { readdirSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { serverDiagnostics } from "../../../test-support/lspClient";
import { forCommandLine } from "../src/settingNames";
import { FIXTURES, runBin, WS } from "./fixtures";

interface LspDiagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity: number;
  code: string;
  message: string;
  codeDescription?: { href: string };
  relatedInformation?: { location: { range: LspDiagnostic["range"] }; message: string }[];
}

interface CliDiagnostic {
  file: string;
  range: { start: { line: number; column: number }; end: { line: number; column: number } };
  severity: string;
  code: string;
  message: string;
  codeDescription: { href: string } | null;
  fixes: string[];
  related: { range: CliDiagnostic["range"]; message: string }[];
}

const SEVERITY: Record<number, string> = { 1: "error", 2: "warning", 3: "information" };
const scriptsIn = (dir: string): string[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".tf") || f === "tfrc")
    .sort()
    .map((f) => path.join(dir, f));

/** A second workspace: unresolved loads of every kind, a diagnostic with related locations. */
const VARIANTS = path.join(FIXTURES, "variants");
/** tf's library in the fixtures: outside both workspaces, and a library file. */
const STDLIB = path.join(FIXTURES, "tflib", "stdlib.tf");

/** An LSP range in the CLI's terms: 1-based lines and columns. */
const range = (r: LspDiagnostic["range"]) => ({
  start: { line: r.start.line + 1, column: r.start.character + 1 },
  end: { line: r.end.line + 1, column: r.end.character + 1 },
});

/** What the built server says of each file, in a workspace of `folder`: its diagnostics, each with the quick fixes it offers there. */
async function fromServer(folder: string, files: string[], settings: object) {
  const out: object[] = [];
  await serverDiagnostics(folder, files, settings, async (client, uri, diagnostics) => {
    for (const d of diagnostics as LspDiagnostic[]) {
      const actions = (await client.request("textDocument/codeAction", {
        textDocument: { uri },
        range: d.range,
        context: { diagnostics: [d], only: ["quickfix"] },
      })) as { title: string; diagnostics?: LspDiagnostic[] }[];
      const same = (o: LspDiagnostic) => o.code === d.code && o.message === d.message && JSON.stringify(o.range) === JSON.stringify(d.range);
      out.push({
        file: fileURLToPath(uri),
        range: range(d.range),
        severity: SEVERITY[d.severity],
        code: d.code,
        // The CLI names options where the server names settings.
        message: forCommandLine(d.message),
        codeDescription: d.codeDescription ?? null,
        fixes: actions.filter((a) => a.diagnostics?.some(same)).map((a) => a.title),
        related: (d.relatedInformation ?? []).map((r) => ({ range: range(r.location.range), message: forCommandLine(r.message) })),
      });
    }
  });
  return out;
}

/** What the built CLI says of the same files, run in `folder` (the root), with the same settings as options. */
function fromCli(folder: string, files: string[], options: string[]): object[] {
  const { stdout } = runBin(["check", "--format", "json", ...options, ...files.map((f) => path.relative(folder, f))], folder);
  // The server has no offsets; the rest should be the same.
  const position = ({ line, column }: { line: number; column: number }) => ({ line, column });
  const span = (r: CliDiagnostic["range"]) => ({ start: position(r.start), end: position(r.end) });
  // `lint` is the JSON's own marking of a code, which the server shows as the code itself.
  return (JSON.parse(stdout) as { diagnostics: (CliDiagnostic & { lint?: boolean })[] }).diagnostics.map(({ lint: _lint, ...d }) => ({
    ...d,
    file: path.resolve(folder, d.file),
    range: span(d.range),
    related: d.related.map((r) => ({ range: span(r.range), message: r.message })),
  }));
}

/** The same diagnostics in either order: the CLI sorts by file, line and column, the server doesn't. */
const unordered = (ds: object[]): string[] => ds.map((d) => JSON.stringify(d)).sort();

describe("the CLI and the server", () => {
  it("report the same diagnostics and fixes for the same files", async () => {
    const files = scriptsIn(WS);
    const server = await fromServer(WS, files, { libraryPath: "../tflib" });
    expect(server.map((d) => (d as { fixes: string[] }).fixes)).toEqual([["Put = after oops"], ["Change to /greet"], ["Add /require extra.tf"], []]);
    expect(unordered(fromCli(WS, files, ["--library-path", "../tflib"]))).toEqual(unordered(server));
  }, 30_000);

  it("and the same with the diagnostics settings changed", async () => {
    const files = scriptsIn(WS);
    const settings = { diagnostics: { unresolvedLoads: false, ignoreMacros: ["std_*"] }, variables: { dir: "/wotmud" } };
    const server = await fromServer(WS, files, settings);
    expect(server.map((d) => (d as { code: string }).code)).toEqual(["invalid-macro-name", "undefined-macro", "undefined-macro"]);
    expect(unordered(fromCli(WS, files, ["--no-unresolved-loads", "--ignore-macro", "std_*", "--variable", "dir=/wotmud"]))).toEqual(unordered(server));
  }, 30_000);

  it("and the same for unresolved loads of each kind, related locations, and a library file outside the root", async () => {
    const files = [...scriptsIn(VARIANTS), STDLIB];
    const server = await fromServer(VARIANTS, files, { libraryPath: "../tflib", pathMappings: [{ tf: "/mapped", local: "." }] });
    const summary = server.map((d) => {
      const { file, range: r, code, related } = d as { file: string; range: { start: { line: number } }; code: string; related: unknown[] };
      return `${path.basename(file)}:${r.start.line} ${code}${related.length > 0 ? " +related" : ""}`;
    });
    // A missing relative path, ~, an unmapped absolute path, a mapped one, a variable, and a cut-off /if.
    expect(summary.sort()).toEqual([
      "tfrc:2 unresolved-load",
      "tfrc:3 unresolved-load",
      "tfrc:4 unresolved-load",
      "tfrc:5 unresolved-load",
      "tfrc:7 unresolved-load",
      "tfrc:8 missing-continuation +related",
    ]);
    expect(unordered(fromCli(VARIANTS, files, ["--library-path", "../tflib", "--path-mapping", "/mapped=."]))).toEqual(unordered(server));
  }, 30_000);
});
