import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { LspClient } from "../../../test-support/lspClient";

/** The built server's answer to textDocument/formatting for a document holding `text`. */
async function formatting(text: string): Promise<unknown> {
  const env = { ...process.env };
  delete env.TFLIBDIR;
  delete env.TFPATH;
  const client = new LspClient(env);
  const folder = pathToFileURL(tmpdir()).href;
  await client.request("initialize", { processId: process.pid, rootUri: null, workspaceFolders: null, capabilities: {} });
  client.notify("initialized", {});
  const uri = `${folder}/tfscript-formatting-test.tf`;
  client.notify("textDocument/didOpen", { textDocument: { uri, languageId: "tf", version: 1, text } });
  const edits = await client.request("textDocument/formatting", { textDocument: { uri }, options: { tabSize: 4, insertSpaces: true } });
  await client.close();
  return edits;
}

describe("textDocument/formatting", () => {
  it("lays a body out in the formatter's own style, whatever the editor's tab size", async () => {
    expect(await formatting("/def go = /a%; /b\n")).toEqual([
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 17 } }, newText: "/def go = \\\n  /a%;\\\n  /b" },
    ]);
  });

  it("changes nothing in a document holding U+FFFD, so a Latin-1 file opened as UTF-8 isn't saved with EF BF BD", async () => {
    expect(await formatting("/def a = /x%; /y\n/def go = /echo caf�%; /echo b\n")).toEqual([]);
  });
});
