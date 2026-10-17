import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MAX_TIMEOUT_SECONDS } from "@tfscript/core/workspace/configFile";
import { RETRY_SECONDS } from "../src/hook/hook";
import { FIXTURES } from "./fixtures";

/**
 * The Claude Code plugin (editors/claude-code) and the marketplace that lists it
 * (.claude-plugin/marketplace.json): its manifests agree with the packages, and its bundled hook
 * and server work as Claude Code runs them.
 */
const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const PLUGIN = path.join(REPO, "editors", "claude-code");
const BUNDLE = path.join(PLUGIN, "bundle");
const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));

describe("the Claude Code plugin's manifests", () => {
  const plugin = json(path.join(PLUGIN, ".claude-plugin", "plugin.json"));
  const marketplace = json(path.join(REPO, ".claude-plugin", "marketplace.json"));
  const entry = marketplace.plugins.find((p: { name: string }) => p.name === plugin.name);

  it("has the packages' version, in plugin.json and in the marketplace entry", () => {
    const versions = ["packages/core", "packages/server", "packages/cli", "editors/vscode"].map((dir) => json(path.join(REPO, dir, "package.json")).version);
    expect(new Set(versions).size).toBe(1);
    expect(plugin.version).toBe(versions[0]);
    expect(entry?.version).toBe(versions[0]);
  });

  it("is listed in the marketplace under its own name, at its folder", () => {
    expect(entry).toBeDefined();
    expect(entry.source).toBe("./editors/claude-code");
    expect(existsSync(path.join(REPO, entry.source, ".claude-plugin", "plugin.json"))).toBe(true);
  });

  it("runs only bundled files, which are there", () => {
    const hooks = json(path.join(PLUGIN, "hooks", "hooks.json"));
    const lsp = json(path.join(PLUGIN, ".lsp.json"));
    const commands = [...hooks.hooks.PostToolUse.flatMap((m: { hooks: unknown[] }) => m.hooks), lsp.tfscript] as { command: string; args: string[] }[];
    for (const c of commands) {
      expect(c.command).toBe("node");
      const script = c.args[0] as string;
      expect(script.startsWith("${CLAUDE_PLUGIN_ROOT}/bundle/")).toBe(true);
      expect(existsSync(path.join(PLUGIN, script.slice("${CLAUDE_PLUGIN_ROOT}/".length)))).toBe(true);
    }
    expect(lsp.tfscript.diagnostics).toBe(false);
  });

  it("gives the hook time for the longest full check and the quick one after it", () => {
    const hooks = json(path.join(PLUGIN, "hooks", "hooks.json"));
    const timeout = hooks.hooks.PostToolUse[0].hooks[0].timeout as number;
    expect(timeout).toBe(30);
    expect(MAX_TIMEOUT_SECONDS + RETRY_SECONDS).toBeLessThan(timeout);
  });

  it("carries the repo's license", () => {
    expect(readFileSync(path.join(PLUGIN, "LICENSE"), "utf8")).toBe(readFileSync(path.join(REPO, "LICENSE"), "utf8"));
  });
});

const PROJECT = path.join(FIXTURES, "claude-code");

/** Runs the bundled hook as Claude Code does: the PostToolUse call as JSON on stdin, the project folder in CLAUDE_PROJECT_DIR. */
function hook(file: string, tool = "Edit"): { status: number | null; stdout: string; stderr: string } {
  const input = {
    session_id: "test",
    transcript_path: path.join(PROJECT, "transcript.jsonl"),
    cwd: PROJECT,
    permission_mode: "default",
    hook_event_name: "PostToolUse",
    tool_name: tool,
    tool_input: tool === "Write" ? { file_path: file, content: readFileSync(file, "utf8") } : { file_path: file, old_string: "a", new_string: "b" },
    tool_response: { filePath: file },
    tool_use_id: "toolu_test",
  };
  const env = { ...process.env, CLAUDE_PROJECT_DIR: PROJECT, CLAUDE_PLUGIN_ROOT: PLUGIN };
  delete env.TFLIBDIR;
  delete env.TFPATH;
  const result = spawnSync(process.execPath, [path.join(BUNDLE, "tfscript-hook.js")], { input: JSON.stringify(input), env, encoding: "utf8", cwd: PROJECT });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("the bundled hook, run as Claude Code runs it", () => {
  it("puts an error file's errors to Claude as a block, with the fix's title", () => {
    const { status, stdout, stderr } = hook(path.join(PROJECT, "scripts", "error.tf"));
    expect({ status, stderr }).toEqual({ status: 0, stderr: "" });
    const out = JSON.parse(stdout);
    expect(out.decision).toBe("block");
    expect(out.hookSpecificOutput).toEqual({ hookEventName: "PostToolUse" });
    const label = path.join("scripts", "error.tf");
    expect(out.reason).toBe(
      `tfscript found 1 error in ${label}:\n` +
        `- ${label}:3:6: error invalid-macro-name: This /def has no = after its name, so tf takes all of "oops /echo the" as the name, which can't hold a space, and defines nothing: put = after oops. Quick fix an editor offers: Put = after oops.`,
    );
  });

  it("says nothing for a clean file, a Terraform file, or under a tfscript.json that turns it off", () => {
    for (const file of [path.join(PROJECT, "scripts", "clean.tf"), path.join(FIXTURES, "terraform", "main.tf"), path.join(PROJECT, "quiet", "error.tf")]) {
      expect(hook(file, "Write"), file).toEqual({ status: 0, stdout: "", stderr: "" });
    }
  });

  it("names a setting as its tfscript.json key, not as a command-line option", () => {
    const { status, stdout, stderr } = hook(path.join(PROJECT, "loads", "tfrc"));
    expect({ status, stderr }).toEqual({ status: 0, stderr: "" });
    const text = JSON.parse(stdout).hookSpecificOutput.additionalContext as string;
    expect(text).toContain(`warning unresolved-load: tf won't find "missing.tf": fix the path, or set workingDirectory in tfscript.json to the folder tf runs in.`);
    expect(text).not.toContain("--");
  });

  it("says what is wrong with a bad tfscript.json, and how to fix it", () => {
    const { status, stdout, stderr } = hook(path.join(PROJECT, "bad-config", "script.tf"));
    expect({ status, stderr }).toEqual({ status: 0, stderr: "" });
    const config = path.join("bad-config", "tfscript.json");
    expect(JSON.parse(stdout)).toEqual({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `tfscript didn't check ${path.join("bad-config", "script.tf")}, because it can't use ${config}: ${config} gives "entryFiles" as the text "tfrc", not a list of paths: write it as "entryFiles": ["tfrc"].`,
      },
    });
  });
});

describe("the bundled command line and server", () => {
  it("tfscript.js checks a file", () => {
    const result = spawnSync(process.execPath, [path.join(BUNDLE, "tfscript.js"), "check", "--root", PROJECT, path.join(PROJECT, "scripts", "error.tf")], { encoding: "utf8", cwd: PROJECT });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("error invalid-macro-name");
  });

  it("tfscript-language-server.js answers initialize over stdio", async () => {
    const server = spawn(process.execPath, [path.join(BUNDLE, "tfscript-language-server.js")], { stdio: ["pipe", "pipe", "pipe"] });
    const send = (message: object) => {
      const body = JSON.stringify({ jsonrpc: "2.0", ...message });
      server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    };
    const reply = new Promise<{ id: number; result: { capabilities: Record<string, unknown> } }>((resolve, reject) => {
      let buffer = "";
      server.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const header = /Content-Length: (\d+)\r\n\r\n/.exec(buffer);
        if (!header) return;
        const start = header.index + header[0].length;
        const length = Number(header[1]);
        if (Buffer.byteLength(buffer.slice(start)) >= length) resolve(JSON.parse(buffer.slice(start, start + length)));
      });
      server.on("error", reject);
    });
    send({ id: 1, method: "initialize", params: { processId: process.pid, rootUri: null, capabilities: {}, workspaceFolders: null } });
    const answer = await reply;
    send({ id: 2, method: "shutdown" });
    send({ method: "exit" });
    server.kill();
    expect(answer.id).toBe(1);
    expect(answer.result.capabilities).toHaveProperty("hoverProvider");
    expect(answer.result.capabilities).toHaveProperty("definitionProvider");
  });
});
