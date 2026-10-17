import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { CLAUDE_CODE_SHAPES, CONFIG_KEYS, DIAGNOSTIC_SHAPES, findConfig, MAX_TIMEOUT_SECONDS, overlaySettings, parseConfig, readConfig, SETTING_SHAPES } from "../src/workspace/configFile";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);
const FILE = p("ws", "tfscript.json");

const parse = (data: unknown) => parseConfig(JSON.stringify(data), FILE, "tfscript.json");

describe("parseConfig", () => {
  it("makes relative paths absolute against the file's folder, and leaves absolute, ~ and tf paths alone", () => {
    const { config, problems } = parse({
      entryFiles: ["tfrc", "/wotmud/tfrc"],
      contexts: { main: ["main.tf"] },
      activeContext: "main",
      libraryPath: "../lib",
      tfPath: ["~/tf", "scripts"],
      workingDirectory: ".",
      homeDirectory: "home",
      pathMappings: [{ tf: "/wotmud", local: "mud" }],
      variables: { MUD: "wot" },
      diagnostics: { unresolvedLoads: false, ignoreMacros: ["gag_*"] },
    });
    expect(problems).toEqual([]);
    expect(config?.folder).toBe(p("ws"));
    expect(config?.file).toBe(FILE);
    expect(config?.settings).toEqual({
      entryFiles: [p("ws", "tfrc"), "/wotmud/tfrc"],
      contexts: { main: [p("ws", "main.tf")] },
      activeContext: "main",
      libraryPath: p("lib"),
      tfPath: ["~/tf", p("ws", "scripts")],
      workingDirectory: p("ws"),
      homeDirectory: p("ws", "home"),
      pathMappings: [{ tf: "/wotmud", local: p("ws", "mud") }],
      variables: { MUD: "wot" },
      diagnostics: { unresolvedLoads: false, ignoreMacros: ["gag_*"] },
    });
    expect(config?.claudeCode).toEqual({});
  });

  it("reads the claudeCode section on its own, not into the settings", () => {
    const { config } = parse({ claudeCode: { enabled: false, warningLimit: 5, showInformation: true, timeoutSeconds: 3 } });
    expect(config?.claudeCode).toEqual({ enabled: false, warningLimit: 5, showInformation: true, timeoutSeconds: 3 });
    expect(config?.settings).toEqual({});
  });

  it("takes an empty object, a $schema and a byte order mark", () => {
    expect(parse({}).problems).toEqual([]);
    expect(parse({ $schema: "https://example.com/tfscript.schema.json" }).problems).toEqual([]);
    expect(parseConfig('﻿{ "entryFiles": ["tfrc"] }', FILE).config?.settings.entryFiles).toEqual([p("ws", "tfrc")]);
  });

  it("says what is wrong with text that isn't JSON or isn't an object, and how to fix it", () => {
    const bad = parseConfig("{ entryFiles: [] }", FILE, "tfscript.json");
    expect(bad.config).toBeUndefined();
    expect(bad.problems).toHaveLength(1);
    expect(bad.problems[0]).toMatch(/^tfscript\.json isn't valid JSON \(.+\): fix the syntax, or check it in an editor that knows JSON\.$/);
    expect(parse(["tfrc"]).problems).toEqual([
      'tfscript.json holds a list, not an object: write the settings as one object, as in { "entryFiles": ["tfrc"] }.',
    ]);
  });

  it("names each wrong value, what it should be and an example", () => {
    const { config, problems } = parse({
      entryFiles: "tfrc",
      libraryPath: 3,
      contexts: { main: "main.tf" },
      pathMappings: [{ tf: "/wotmud" }],
      variables: { MUD: 1 },
      diagnostics: { undefinedMacros: "no", ignoreMacros: "x" },
      claudeCode: { warningLimit: -1, timeoutSeconds: 60, enabled: "yes" },
    });
    expect(config).toBeUndefined();
    expect(problems).toEqual([
      'tfscript.json gives "entryFiles" as the text "tfrc", not a list of paths: write it as "entryFiles": ["tfrc"].',
      'tfscript.json gives "libraryPath" as the number 3, not text: write it as "libraryPath": "<folder>".',
      'tfscript.json gives "contexts" as an object, not an object of names to lists of files: write it as "contexts": { "<name>": ["tfrc"] }.',
      'tfscript.json gives "pathMappings" as a list, not a list of mappings: write it as "pathMappings": [{ "tf": "/wotmud", "local": "<folder>" }].',
      'tfscript.json gives "variables" as an object, not an object of names to text: write it as "variables": { "<name>": "<value>" }.',
      'tfscript.json gives "diagnostics.undefinedMacros" as the text "no", not true or false: write it as "undefinedMacros": false.',
      'tfscript.json gives "diagnostics.ignoreMacros" as the text "x", not a list of macro names: write it as "ignoreMacros": ["<name>"].',
      'tfscript.json gives "claudeCode.warningLimit" as the number -1, not a whole number, 0 or more: write it as "warningLimit": 20.',
      'tfscript.json gives "claudeCode.timeoutSeconds" as the number 60, not a number of seconds above 0 and at most 25: write it as "timeoutSeconds": 10.',
      'tfscript.json gives "claudeCode.enabled" as the text "yes", not true or false: write it as "enabled": true.',
    ]);
  });

  it("names a key that isn't a setting, and one written with the editor's tfscript. prefix", () => {
    expect(parse({ entryfiles: [] }).problems).toEqual([
      'tfscript.json has "entryfiles", which isn\'t a setting: remove it, or use one of entryFiles, contexts, activeContext, libraryPath, tfPath, workingDirectory, homeDirectory, pathMappings, variables, diagnostics, claudeCode.',
    ]);
    expect(parse({ "tfscript.diagnostics.undefinedMacros": false }).problems).toEqual([
      'tfscript.json has "tfscript.diagnostics.undefinedMacros": write the key without the tfscript. prefix, as "diagnostics".',
    ]);
    expect(parse({ diagnostics: { unknown: true }, claudeCode: { quiet: true } }).problems).toEqual([
      'tfscript.json has "diagnostics.unknown", which isn\'t a setting: remove it, or use one of unresolvedLoads, undefinedMacros, ignoreMacros.',
      'tfscript.json has "claudeCode.quiet", which isn\'t a setting: remove it, or use one of enabled, warningLimit, showInformation, timeoutSeconds.',
    ]);
  });

  it("rejects a key a mapping doesn't have, as the schema does", () => {
    expect(parse({ pathMappings: [{ tf: "/wotmud", local: ".", from: "x" }] }).problems).toEqual([
      `tfscript.json has "pathMappings[0].from", which isn't part of a mapping: remove it; a mapping has only "tf" and "local".`,
    ]);
  });

  it("rejects a mapping from a relative tf path and a variable name tf can't have", () => {
    expect(parse({ pathMappings: [{ tf: "wotmud", local: "." }] }).problems).toEqual([
      'tfscript.json maps "wotmud" in "pathMappings", which isn\'t absolute: start tf\'s side with /, as in "tf": "/wotmud".',
    ]);
    expect(parse({ variables: { "1st": "x" } }).problems).toEqual([
      'tfscript.json sets the variable "1st", which isn\'t a tf variable name: use letters, digits and _, not starting with a digit.',
    ]);
  });
});

describe("readConfig", () => {
  it("says a file that can't be read can't be read", () => {
    expect(readConfig(FILE, () => undefined, "tfscript.json").problems).toEqual([
      "tfscript.json can't be read: check that it exists and is a file you may read.",
    ]);
  });
});

describe("findConfig", () => {
  it("finds the nearest tfscript.json in the folder or one above it", () => {
    const files = new Set([p("tfscript.json"), p("a", "tfscript.json")]);
    const exists = (f: string) => files.has(f);
    expect(findConfig(p("a", "b", "c"), exists)).toBe(p("a", "tfscript.json"));
    expect(findConfig(p("a"), exists)).toBe(p("a", "tfscript.json"));
    expect(findConfig(p("x"), exists)).toBe(p("tfscript.json"));
    expect(findConfig(p("x"), () => false)).toBeUndefined();
  });
});

describe("overlaySettings", () => {
  it("lets each setting given replace the base's, and each diagnostics key on its own", () => {
    expect(
      overlaySettings(
        { entryFiles: ["a"], libraryPath: "lib", diagnostics: { unresolvedLoads: false, ignoreMacros: ["x"] } },
        { entryFiles: ["b"], diagnostics: { ignoreMacros: ["y"] } },
      ),
    ).toEqual({ entryFiles: ["b"], libraryPath: "lib", diagnostics: { unresolvedLoads: false, ignoreMacros: ["y"] } });
    expect(overlaySettings({ libraryPath: "lib" }, {})).toEqual({ libraryPath: "lib" });
  });
});

describe("the JSON schema (schemas/tfscript.schema.json)", () => {
  const schema = JSON.parse(readFileSync(path.join(__dirname, "..", "..", "..", "schemas", "tfscript.schema.json"), "utf8"));

  const strip = (node: unknown): unknown =>
    Array.isArray(node)
      ? node.map(strip)
      : typeof node === "object" && node !== null
        ? Object.fromEntries(Object.entries(node).filter(([k]) => k !== "description").map(([k, v]) => [k, strip(v)]))
        : node;
  const strings = { type: "array", items: { type: "string" } };
  /** The schema each loader shape stands for: what the loader accepts, no more and no less. */
  const SCHEMA_OF: Record<string, unknown> = {
    string: { type: "string" },
    path: { type: "string" },
    paths: strings,
    names: strings,
    boolean: { type: "boolean" },
    count: { type: "integer", minimum: 0 },
    seconds: { type: "number", exclusiveMinimum: 0, maximum: MAX_TIMEOUT_SECONDS },
    contexts: { type: "object", additionalProperties: strings },
    pathMappings: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["tf", "local"], properties: { tf: { type: "string", pattern: "^/" }, local: { type: "string" } } },
    },
    variables: { type: "object", propertyNames: { pattern: "^[A-Za-z_][A-Za-z0-9_]*$" }, additionalProperties: { type: "string" } },
  };
  const section = (shapes: Record<string, string>) => ({
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(Object.entries(shapes).map(([k, shape]) => [k, SCHEMA_OF[shape]])),
  });

  it("gives each key the shape the loader takes, and no other keys", () => {
    expect(Object.keys(schema.properties).sort()).toEqual([...CONFIG_KEYS].sort());
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    const props = strip(schema.properties) as Record<string, unknown>;
    expect(props.$schema).toEqual({ type: "string" });
    for (const [key, shape] of Object.entries(SETTING_SHAPES)) {
      expect(props[key], key).toEqual(shape === "diagnostics" ? section(DIAGNOSTIC_SHAPES) : SCHEMA_OF[shape]);
    }
    expect(props.claudeCode).toEqual(section(CLAUDE_CODE_SHAPES));
  });

  it("describes every setting", () => {
    const undescribed: string[] = [];
    const visit = (node: Record<string, { description?: string; properties?: Record<string, unknown> }>, prefix: string) => {
      for (const [k, v] of Object.entries(node)) {
        if (k !== "$schema" && k !== "diagnostics" && !v.description) undescribed.push(prefix + k);
        if (v.properties) visit(v.properties as never, `${prefix}${k}.`);
      }
    };
    visit(schema.properties, "");
    expect(undescribed).toEqual([]);
  });
});
