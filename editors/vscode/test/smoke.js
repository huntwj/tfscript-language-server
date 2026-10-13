#!/usr/bin/env node
/**
 * Drives server/server.js — the exact bundled copy this extension packages and runs, built
 * by `npm run build` (scripts/copy-server.js) — over real stdio LSP framing, the same way
 * vscode-languageclient's TransportKind.stdio does. This is the regression test for a real
 * bug found by hand: copy-server.js only copied dist/, not its runtime node_modules, so the
 * bundled server crashed with MODULE_NOT_FOUND the moment anything tried to run it outside
 * this repo (i.e. once actually packaged and installed, not run via F5 from a checkout).
 * `npm run build` alone never caught that, since tsc has nothing to say about a missing
 * node_modules folder at runtime — only actually running the bundled copy does.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const serverPath = path.join(__dirname, "..", "server", "server.js");
const proc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] });

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
  await request("initialize", { processId: process.pid, rootUri: null, capabilities: {} });
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

  await request("shutdown", null);
  send("exit", null);
  proc.kill();
  clearTimeout(timeout);

  const ok =
    diag.diagnostics.some((d) => d.code === "if-multiline-top-level") &&
    labels.includes("echo") &&
    Array.isArray(contexts?.contexts) &&
    contexts.contexts.length >= 1;
  if (!ok) {
    console.error("Unexpected server behaviour. diagnostics:", JSON.stringify(diag.diagnostics));
    console.error("completion labels:", labels.length, "includes echo:", labels.includes("echo"));
    console.error("contextInfo:", JSON.stringify(contexts));
  }
  console.log(ok ? "smoke test passed" : "smoke test FAILED");
  process.exit(ok ? 0 : 1);
})().catch((err) => {
  console.error(err, "\nstderr so far:\n" + stderr);
  process.exit(1);
});
