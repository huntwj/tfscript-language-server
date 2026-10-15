import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The built server, as an editor runs it (vitest's global setup builds it first). */
export const SERVER = fileURLToPath(new URL("../dist/server.js", import.meta.url));

interface Message {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

/**
 * Just enough of an LSP client to drive the built server over stdio: framing, requests,
 * notifications, and answers to the requests the server sends the client.
 */
export class LspClient {
  private readonly proc: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private readonly pending = new Map<number, (result: unknown) => void>();
  private readonly listeners = new Set<(message: Message) => void>();
  private readonly answers = new Map<string, (params: unknown) => unknown>();
  stderr = "";

  constructor(env: NodeJS.ProcessEnv) {
    this.proc = spawn(process.execPath, [SERVER], { env, stdio: "pipe" });
    this.proc.stdout.on("data", (chunk: Buffer) => this.receive(chunk));
    this.proc.stderr.on("data", (chunk: Buffer) => (this.stderr += chunk.toString("utf8")));
  }

  /** How to answer the server's `method` requests (anything unanswered gets null). */
  answer(method: string, handler: (params: unknown) => unknown): void {
    this.answers.set(method, handler);
  }

  request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }

  notify(method: string, params: unknown): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  /** The first message from now on that `match` accepts. */
  waitFor(match: (message: Message) => boolean, timeoutMs = 10_000): Promise<Message> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`no matching message from the server in ${timeoutMs}ms; its stderr: ${this.stderr}`));
      }, timeoutMs);
      const listener = (message: Message): void => {
        if (!match(message)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(message);
      };
      this.listeners.add(listener);
    });
  }

  async close(): Promise<void> {
    const exited = new Promise((resolve) => this.proc.once("exit", resolve));
    await this.request("shutdown", null);
    this.notify("exit", null);
    await exited;
  }

  private send(message: object): void {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    this.proc.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.proc.stdin.write(body);
  }

  private receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const end = this.buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const length = Number(/Content-Length: (\d+)/i.exec(this.buffer.subarray(0, end).toString("ascii"))?.[1]);
      if (this.buffer.length < end + 4 + length) return;
      const message = JSON.parse(this.buffer.subarray(end + 4, end + 4 + length).toString("utf8")) as Message;
      this.buffer = this.buffer.subarray(end + 4 + length);
      this.dispatch(message);
    }
  }

  private dispatch(message: Message): void {
    if (message.id !== undefined && message.method === undefined) {
      this.pending.get(message.id)?.(message.result);
      this.pending.delete(message.id);
      return;
    }
    if (message.id !== undefined && message.method !== undefined) {
      const result = this.answers.get(message.method)?.(message.params) ?? null;
      this.send({ jsonrpc: "2.0", id: message.id, result });
    }
    for (const listener of [...this.listeners]) listener(message);
  }
}

export interface PublishedDiagnostics {
  uri: string;
  diagnostics: unknown[];
}

/**
 * What the built server publishes for each of `files`, opened one at a time, in a workspace whose
 * only folder is `folder` and whose tfscript settings are `settings`. The environment is the
 * test's, without TFLIBDIR and TFPATH, so the user's own installation doesn't leak in.
 */
export async function serverDiagnostics(folder: string, files: string[], settings: object): Promise<Map<string, unknown[]>> {
  const env = { ...process.env };
  delete env.TFLIBDIR;
  delete env.TFPATH;
  const client = new LspClient(env);
  // The server sends a semantic-tokens refresh once it has read the settings and rechecked.
  const settled = client.waitFor((m) => m.method === "workspace/semanticTokens/refresh");
  client.answer("workspace/configuration", (params) => (params as { items: unknown[] }).items.map(() => settings));
  const uri = pathToFileURL(folder).href;
  await client.request("initialize", {
    processId: process.pid,
    rootUri: uri,
    workspaceFolders: [{ uri, name: "fixture" }],
    capabilities: { workspace: { configuration: true, semanticTokens: { refreshSupport: true } } },
  });
  client.notify("initialized", {});
  await settled;
  const out = new Map<string, unknown[]>();
  for (const file of files) {
    const fileUri = pathToFileURL(file).href;
    const published = client.waitFor((m) => m.method === "textDocument/publishDiagnostics" && (m.params as PublishedDiagnostics).uri === fileUri);
    client.notify("textDocument/didOpen", { textDocument: { uri: fileUri, languageId: "tf", version: 1, text: readFileSync(file, "utf8") } });
    out.set(file, ((await published).params as PublishedDiagnostics).diagnostics);
  }
  await client.close();
  return out;
}
