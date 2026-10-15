import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Builds the packages (tsc -b, which only rebuilds what changed) before any test runs: most tests
 * import the sources, but a few run the built server or CLI as a user would, and a stale dist/
 * would test old code.
 */
export default function setup(): void {
  const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  execFileSync(process.execPath, [tsc, "-b"], { cwd: fileURLToPath(new URL(".", import.meta.url)), stdio: "inherit" });
}
