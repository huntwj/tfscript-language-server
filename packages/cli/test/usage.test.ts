import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OPTIONS } from "../src/args";
import { USAGE, VERSION } from "../src/usage";

describe("the usage text", () => {
  it("gives the package's version", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });

  it("names every option the parser takes, and fits 100 columns", () => {
    const names = Object.keys(OPTIONS);
    for (const name of names) expect(USAGE).toContain(`--${name}`);
    for (const line of USAGE.split("\n")) expect(line.length).toBeLessThanOrEqual(100);
  });
});
