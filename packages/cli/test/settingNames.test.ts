import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OPTIONS } from "../src/args";
import { forCommandLine, OPTION_FOR_SETTING, SETTING_NAME } from "../src/settingNames";

const CORE_SRC = fileURLToPath(new URL("../../core/src/", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(path.join(dir, e.name)) : e.name.endsWith(".ts") ? [path.join(dir, e.name)] : [],
  );
}

describe("the settings core's messages name", () => {
  it("each have an option, and each option is one the parser takes", () => {
    const named = new Set(sources(CORE_SRC).flatMap((f) => [...readFileSync(f, "utf8").matchAll(SETTING_NAME)].map((m) => m[1] as string)));
    expect(named.size).toBeGreaterThan(5);
    expect([...named].filter((key) => !(key in OPTION_FOR_SETTING))).toEqual([]);
    for (const option of Object.values(OPTION_FOR_SETTING)) expect(Object.keys(OPTIONS)).toContain(option.slice(2));
  });

  it("are put as the options, in sentences that still read", () => {
    expect(forCommandLine('tf won\'t find "missing.tf": fix the path, or set tfscript.workingDirectory to the folder tf runs in.')).toBe(
      'tf won\'t find "missing.tf": fix the path, or give --working-directory the folder tf runs in.',
    );
    expect(forCommandLine("This load can't be followed here: x, and ~ means tf's HOME: set tfscript.homeDirectory.")).toBe(
      "This load can't be followed here: x, and ~ means tf's HOME: use --home-directory.",
    );
    expect(forCommandLine("To have it checked, give %{dir} a value in tfscript.variables.")).toBe("To have it checked, give %{dir} a value with --variable.");
    expect(forCommandLine("if tf runs where that path exists, map it with tfscript.pathMappings.")).toBe(
      "if tf runs where that path exists, map it with --path-mapping.",
    );
    expect(forCommandLine("add its name to tfscript.diagnostics.ignoreMacros.")).toBe("add its name to --ignore-macro.");
    expect(forCommandLine("tfscript.codeLens.references and tfscript.unknown stay.")).toBe("tfscript.codeLens.references and tfscript.unknown stay.");
  });
});
