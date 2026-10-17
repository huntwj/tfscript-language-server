#!/usr/bin/env node
/**
 * Drives server/server.js — the exact bundled copy this extension packages and runs, built
 * by `npm run build` (scripts/copy-server.js) — over real stdio LSP framing, the same way
 * vscode-languageclient's TransportKind.stdio does. This is the regression test for a real
 * bug found by hand: copy-server.js only copied dist/, not its runtime node_modules, so the
 * bundled server crashed with MODULE_NOT_FOUND the moment anything tried to run it outside
 * this repo (i.e. once actually packaged and installed, not run via F5 from a checkout).
 * `npm run build` alone never caught that, since tsc has nothing to say about a missing
 * node_modules folder at runtime — only actually running the bundled copy does. It runs from a
 * copy in a temporary folder outside this repo, as an installed extension's does: inside the
 * checkout, Node would find a missing module in the repo's own node_modules and hide the gap.
 */
const { spawn } = require("node:child_process");
const { copyFileSync, mkdtempSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const alone = mkdtempSync(path.join(os.tmpdir(), "tfscript-vscode-smoke-"));
const serverPath = path.join(alone, "server.js");
copyFileSync(path.join(__dirname, "..", "server", "server.js"), serverPath);
const proc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
process.on("exit", () => {
  proc.kill();
  try {
    rmSync(alone, { recursive: true, force: true });
  } catch {
    // Windows may still hold the file for a moment; it is in the temporary folder.
  }
});

let stderr = "";
proc.stderr.on("data", (d) => (stderr += d.toString()));

let buf = Buffer.alloc(0);
const pending = new Map();
let nextId = 1;
let resolveDiag;
const diagPromise = new Promise((r) => (resolveDiag = r));

function send(method, params, id) {
  const msg = { jsonrpc: "2.0", method, params, ...(id !== undefined ? { id } : {}) };
  const body = JSON.stringify(msg);
  proc.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function request(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    send(method, params, id);
  });
}

proc.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (true) {
    const headerEnd = buf.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;
    const m = /Content-Length: (\d+)/.exec(buf.slice(0, headerEnd).toString());
    if (!m) return;
    const len = parseInt(m[1], 10);
    const bodyStart = headerEnd + 4;
    if (buf.length < bodyStart + len) return;
    const msg = JSON.parse(buf.slice(bodyStart, bodyStart + len).toString());
    buf = buf.slice(bodyStart + len);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    } else if (msg.method === "textDocument/publishDiagnostics") {
      resolveDiag(msg.params);
    }
  }
});

const timeout = setTimeout(() => {
  console.error("Timed out waiting for the server. stderr so far:\n" + stderr);
  proc.kill();
  process.exit(1);
}, 10_000);

(async () => {
  // As the extension starts it: the lenses need the command that opens the references peek, and
  // extracting a variable the one that starts a rename.
  await request("initialize", {
    processId: process.pid,
    rootUri: null,
    capabilities: {},
    initializationOptions: { showReferencesCommand: "tfscript.showReferences", renameCommand: "tfscript.renameAt" },
  });
  send("initialized", {});

  // A real absolute path (it need not exist): on Windows a file URI without a drive is no path at all.
  const uri = require("node:url").pathToFileURL(path.join(__dirname, "smoke-test.tf")).href;
  send("textDocument/didOpen", {
    textDocument: { uri, languageId: "tf", version: 1, text: '/if (x =~ "")\n/ec' },
  });

  const diag = await diagPromise;
  const completion = await request("textDocument/completion", {
    textDocument: { uri },
    position: { line: 1, character: 3 }, // right after "/ec"
  });
  const labels = (Array.isArray(completion) ? completion : completion.items).map((i) => i.label);
  // The status bar's context picker relies on this non-LSP request.
  const contexts = await request("tfscript/contextInfo", { uri });

  // "N references" lenses, resolved lazily into the extension's own tfscript.showReferences
  // command, whose arguments are plain JSON the extension converts; and call hierarchy.
  const defsUri = require("node:url").pathToFileURL(path.join(__dirname, "smoke-defs.tf")).href;
  send("textDocument/didOpen", {
    textDocument: { uri: defsUri, languageId: "tf", version: 1, text: "/def -i greet = /echo hi\n/def -i main = /greet\n" },
  });
  const lenses = await request("textDocument/codeLens", { textDocument: { uri: defsUri } });
  const lens = lenses && (await request("codeLens/resolve", lenses[0]));
  const items = await request("textDocument/prepareCallHierarchy", { textDocument: { uri: defsUri }, position: { line: 0, character: 9 } });
  const incoming = items && (await request("callHierarchy/incomingCalls", { item: items[0] }));

  // "Extract to a local variable" carries the extension's tfscript.renameAt, pointed at the name
  // it inserts: `/def v = /let value=...`, the name at character 14.
  const varUri = require("node:url").pathToFileURL(path.join(__dirname, "smoke-var.tf")).href;
  send("textDocument/didOpen", { textDocument: { uri: varUri, languageId: "tf", version: 1, text: "/def v = /echo $[a + 1]\n" } });
  const extract = await request("textDocument/codeAction", {
    textDocument: { uri: varUri },
    range: { start: { line: 0, character: 17 }, end: { line: 0, character: 22 } },
    context: { diagnostics: [], only: ["refactor.extract"] },
  });
  const variable = extract?.find((a) => a.title === "Extract to a local variable");

  await request("shutdown", null);
  send("exit", null);
  proc.kill();
  clearTimeout(timeout);

  const ok =
    diag.diagnostics.some((d) => d.code === "missing-continuation") &&
    labels.includes("echo") &&
    Array.isArray(contexts?.contexts) &&
    contexts.contexts.length >= 1 &&
    lenses?.length === 2 &&
    lens?.command?.title === "1 reference" &&
    lens.command.command === "tfscript.showReferences" &&
    lens.command.arguments?.[0] === defsUri &&
    lens.command.arguments?.[2]?.[0]?.range?.start?.line === 1 &&
    items?.[0]?.name === "greet" &&
    incoming?.[0]?.from?.name === "main" &&
    variable?.edit?.changes?.[varUri]?.length === 2 &&
    variable.command?.command === "tfscript.renameAt" &&
    variable.command.arguments?.[0] === varUri &&
    variable.command.arguments?.[1]?.line === 0 &&
    variable.command.arguments?.[1]?.character === 14 &&
    variable.command.arguments?.[2] === "value";
  if (!ok) {
    console.error("Unexpected server behaviour. diagnostics:", JSON.stringify(diag.diagnostics));
    console.error("completion labels:", labels.length, "includes echo:", labels.includes("echo"));
    console.error("contextInfo:", JSON.stringify(contexts));
    console.error("lenses:", JSON.stringify(lenses), "resolved:", JSON.stringify(lens));
    console.error("call hierarchy:", JSON.stringify(items), JSON.stringify(incoming));
    console.error("extract to a local variable:", JSON.stringify(extract));
  }
  console.log(ok ? "smoke test passed" : "smoke test FAILED");
  process.exit(ok ? 0 : 1);
})().catch((err) => {
  console.error(err, "\nstderr so far:\n" + stderr);
  process.exit(1);
});
