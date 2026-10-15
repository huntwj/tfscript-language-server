import { readdirSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { serverDiagnostics } from "../../../test-support/lspClient";
import { runBin, WS } from "./fixtures";

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
const files = readdirSync(WS)
  .filter((f) => f.endsWith(".tf") || f === "tfrc")
  .sort()
  .map((f) => path.join(WS, f));

/** An LSP range in the CLI's terms: 1-based lines and columns. */
const range = (r: LspDiagnostic["range"]) => ({
  start: { line: r.start.line + 1, column: r.start.character + 1 },
  end: { line: r.end.line + 1, column: r.end.character + 1 },
});

/** What the built server says of each file: its diagnostics, each with the quick fixes it offers there. */
async function fromServer(settings: object) {
  const out: object[] = [];
  await serverDiagnostics(WS, files, settings, async (client, uri, diagnostics) => {
    for (const d of diagnostics as LspDiagnostic[]) {
      const actions = (await client.request("textDocument/codeAction", {
        textDocument: { uri },
        range: d.range,
        context: { diagnostics: [d], only: ["quickfix"] },
      })) as { title: string; diagnostics?: LspDiagnostic[] }[];
      const same = (o: LspDiagnostic) => o.code === d.code && o.message === d.message && JSON.stringify(o.range) === JSON.stringify(d.range);
      out.push({
        file: path.relative(WS, fileURLToPath(uri)),
        range: range(d.range),
        severity: SEVERITY[d.severity],
        code: d.code,
        message: d.message,
        codeDescription: d.codeDescription ?? null,
        fixes: actions.filter((a) => a.diagnostics?.some(same)).map((a) => a.title),
        related: (d.relatedInformation ?? []).map((r) => ({ range: range(r.location.range), message: r.message })),
      });
    }
  });
  return out;
}

/** What the built CLI says of the same files, with the same settings as options. */
function fromCli(options: string[]): object[] {
  const { stdout } = runBin(["check", "--format", "json", ...options, ...files.map((f) => path.basename(f))]);
  // The server has no offsets; the rest should be the same.
  const position = ({ line, column }: { line: number; column: number }) => ({ line, column });
  const span = (r: CliDiagnostic["range"]) => ({ start: position(r.start), end: position(r.end) });
  return (JSON.parse(stdout) as { diagnostics: CliDiagnostic[] }).diagnostics.map((d) => ({
    ...d,
    range: span(d.range),
    related: d.related.map((r) => ({ range: span(r.range), message: r.message })),
  }));
}

describe("the CLI and the server", () => {
  it("report the same diagnostics and fixes for the same files", async () => {
    const server = await fromServer({ libraryPath: "../tflib" });
    expect(server.map((d) => (d as { fixes: string[] }).fixes)).toEqual([["Put = after oops"], ["Change to /greet"], ["Add /require extra.tf"], []]);
    expect(fromCli(["--library-path", "../tflib"])).toEqual(server);
  }, 30_000);

  it("and the same with the diagnostics settings changed", async () => {
    const settings = { diagnostics: { unresolvedLoads: false, ignoreMacros: ["std_*"] }, variables: { dir: "/wotmud" } };
    const server = await fromServer(settings);
    expect(server.map((d) => (d as { code: string }).code)).toEqual(["invalid-macro-name", "undefined-macro", "undefined-macro"]);
    expect(fromCli(["--no-unresolved-loads", "--ignore-macro", "std_*", "--variable", "dir=/wotmud"])).toEqual(server);
  }, 30_000);
});
