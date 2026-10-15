import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { nodeHost, type CheckHost } from "../src/check";

/** The server's fixture workspace: one folder (ws) with a tfrc, and a tf library beside it (tflib). */
export const FIXTURES = fileURLToPath(new URL("../../server/test/fixtures/", import.meta.url));
export const WS = path.join(FIXTURES, "ws");
export const LIBRARY_SETTINGS = { libraryPath: "../tflib" };

/** The node host, but with no TFLIBDIR or TFPATH and a home of its own, so the user's own tf doesn't leak in. */
export function testHost(): CheckHost {
  return { ...nodeHost(), environment: { env: {}, homedir: path.join(FIXTURES, "no-home"), exists: existsSync } };
}

/** The built bin, as npm would link it (vitest's global setup builds it first). */
export const BIN = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

/** Runs the built bin in `cwd` with the test's environment, less TFLIBDIR and TFPATH. */
export function runBin(args: string[], cwd = WS): { status: number | null; stdout: string; stderr: string } {
  const env = { ...process.env };
  delete env.TFLIBDIR;
  delete env.TFPATH;
  const result = spawnSync(process.execPath, [BIN, ...args], { cwd, env, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
