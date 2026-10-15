import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests run against the packages' sources, not their built dist/: a server test's
// "@tfscript/core/x" import is core's src/x.ts, as is a core test's "../src/x".
const coreSrc = fileURLToPath(new URL("./packages/core/src/", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@tfscript\/core\/(.*)$/, replacement: `${coreSrc}$1` }],
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
  },
});
