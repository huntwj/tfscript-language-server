import * as path from "node:path";
import { TF_BUILDS } from "../tfBuild";
import type { RawSettings } from "./settings";

/**
 * tfscript.json: the tfscript.* settings in a file, for a checker run outside an editor (the
 * command line, the Claude Code hook). Its keys are the settings without the `tfscript.` prefix,
 * plus a `claudeCode` section for the hook alone. It is found by walking up from the checked file;
 * its folder is the root, and its relative paths are relative to that folder.
 */
export const CONFIG_FILE = "tfscript.json";

/** The hook's own settings, which no editor has: under `claudeCode` in tfscript.json. */
export interface ClaudeCodeSettings {
  /** Whether the hook checks the files under this tfscript.json. Default on. */
  enabled?: boolean;
  /** How many warnings the hook lists; the rest are counted. Default 20. */
  warningLimit?: number;
  /** Whether the hook lists information notes too. Default off. */
  showInformation?: boolean;
  /** How long the hook waits for the full check before a quick one without undefined-macro, in seconds. Default 10, at most 20. */
  timeoutSeconds?: number;
}

export interface ConfigFile {
  /** The tfscript.json, absolute. */
  file: string;
  /** Its folder: the root, and what its relative paths are relative to. */
  folder: string;
  /** Its settings, with every relative path made absolute against `folder`. */
  settings: RawSettings;
  claudeCode: ClaudeCodeSettings;
}

/** A loaded tfscript.json, or the problems that kept it from loading: each a sentence saying what is wrong and how to fix it. */
export interface ConfigLoad {
  config?: ConfigFile;
  problems: string[];
}

export type Shape = "string" | "path" | "paths" | "boolean" | "names";

export type SettingShape = Shape | "contexts" | "pathMappings" | "variables" | "tfBuild" | "diagnostics";

/** Each setting tfscript.json takes, by its key, and the shape of its value (the schema test compares these). */
export const SETTING_SHAPES: Readonly<Record<string, SettingShape>> = {
  entryFiles: "paths",
  contexts: "contexts",
  activeContext: "string",
  libraryPath: "path",
  tfPath: "paths",
  workingDirectory: "path",
  homeDirectory: "path",
  pathMappings: "pathMappings",
  variables: "variables",
  tfBuild: "tfBuild",
  diagnostics: "diagnostics",
};

export const DIAGNOSTIC_SHAPES: Readonly<Record<string, Shape>> = {
  unresolvedLoads: "boolean",
  undefinedMacros: "boolean",
  ignoreMacros: "names",
};

/**
 * The longest timeoutSeconds. The hook is given 30 seconds in all, and after a full check that
 * times out it runs a quick one of up to 5 seconds, so the full check gets at most 20.
 */
export const MAX_TIMEOUT_SECONDS = 20;

export const CLAUDE_CODE_SHAPES: Readonly<Record<string, "boolean" | "count" | "seconds">> = {
  enabled: "boolean",
  warningLimit: "count",
  showInformation: "boolean",
  timeoutSeconds: "seconds",
};

/** Every top-level key tfscript.json takes. */
export const CONFIG_KEYS: readonly string[] = ["$schema", ...Object.keys(SETTING_SHAPES), "claudeCode"];
/** The keys under `diagnostics` and under `claudeCode`. */
export const DIAGNOSTICS_KEYS: readonly string[] = Object.keys(DIAGNOSTIC_SHAPES);
export const CLAUDE_CODE_KEYS: readonly string[] = Object.keys(CLAUDE_CODE_SHAPES);

function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "object") return "an object";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return `the number ${value}`;
  return `the text ${JSON.stringify(value)}`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** `p` made absolute against `folder`, unless it is already absolute (on either side of a mapping) or starts with `~`. */
function rebase(p: string, folder: string): string {
  if (p.trim() === "" || p === "~" || p.startsWith("~/") || p.startsWith("~\\")) return p;
  if (p.startsWith("/") || p.startsWith("\\") || path.isAbsolute(p) || path.win32.isAbsolute(p)) return p;
  return path.resolve(folder, p);
}

/** Reads one tfscript.json's text. `label` is how its messages name it (a path relative to the current folder, say). */
export function parseConfig(text: string, file: string, label: string = file): ConfigLoad {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    return { problems: [`${label} isn't valid JSON (${why}): fix the syntax, or check it in an editor that knows JSON.`] };
  }
  if (!isObject(data)) {
    return { problems: [`${label} holds ${kindOf(data)}, not an object: write the settings as one object, as in { "entryFiles": ["tfrc"] }.`] };
  }

  const folder = path.dirname(path.resolve(file));
  const problems: string[] = [];
  const settings: RawSettings = {};
  const claudeCode: ClaudeCodeSettings = {};
  const wrong = (key: string, value: unknown, want: string, example: string): void => {
    problems.push(`${label} gives "${key}" as ${kindOf(value)}, not ${want}: write it as ${example}.`);
  };

  for (const [key, value] of Object.entries(data)) {
    if (key === "$schema") {
      if (typeof value !== "string") wrong(key, value, "a link", `"$schema": "<link to tfscript.schema.json>"`);
      continue;
    }
    if (key === "claudeCode") {
      if (!isObject(value)) {
        wrong(key, value, "an object", `"claudeCode": { "warningLimit": 20 }`);
        continue;
      }
      for (const [sub, v] of Object.entries(value)) {
        const shape = CLAUDE_CODE_SHAPES[sub];
        if (shape === undefined) {
          problems.push(`${label} has "claudeCode.${sub}", which isn't a setting: remove it, or use one of ${CLAUDE_CODE_KEYS.join(", ")}.`);
        } else if (shape === "boolean") {
          if (typeof v === "boolean") claudeCode[sub as "enabled" | "showInformation"] = v;
          else wrong(`claudeCode.${sub}`, v, "true or false", `"${sub}": true`);
        } else if (shape === "count") {
          if (typeof v === "number" && Number.isInteger(v) && v >= 0) claudeCode.warningLimit = v;
          else wrong(`claudeCode.${sub}`, v, "a whole number, 0 or more", `"${sub}": 20`);
        } else if (typeof v === "number" && v > 0 && v <= MAX_TIMEOUT_SECONDS) claudeCode.timeoutSeconds = v;
        else wrong(`claudeCode.${sub}`, v, `a number of seconds above 0 and at most ${MAX_TIMEOUT_SECONDS}`, `"${sub}": 10`);
      }
      continue;
    }
    const shape = SETTING_SHAPES[key];
    if (shape === undefined) {
      const bare = key.startsWith("tfscript.") ? key.slice("tfscript.".length) : undefined;
      problems.push(
        bare !== undefined && (SETTING_SHAPES[bare.split(".")[0] as string] !== undefined)
          ? `${label} has "${key}": write the key without the tfscript. prefix, as "${bare.split(".")[0]}".`
          : `${label} has "${key}", which isn't a setting: remove it, or use one of ${Object.keys(SETTING_SHAPES).join(", ")}, claudeCode.`,
      );
      continue;
    }
    switch (shape) {
      case "string":
      case "path":
        if (typeof value !== "string") wrong(key, value, "text", `"${key}": "${shape === "path" ? "<folder>" : "<name>"}"`);
        else (settings as Record<string, unknown>)[key] = shape === "path" ? rebase(value, folder) : value;
        break;
      case "paths":
        if (!isStrings(value)) wrong(key, value, "a list of paths", `"${key}": [${key === "entryFiles" ? `"tfrc"` : `"<folder>"`}]`);
        else (settings as Record<string, unknown>)[key] = value.map((p) => rebase(p, folder));
        break;
      case "contexts":
        if (!isObject(value) || !Object.values(value).every(isStrings)) {
          wrong(key, value, "an object of names to lists of files", `"contexts": { "<name>": ["tfrc"] }`);
        } else {
          settings.contexts = Object.fromEntries(Object.entries(value).map(([name, files]) => [name, (files as string[]).map((p) => rebase(p, folder))]));
        }
        break;
      case "pathMappings":
        if (!Array.isArray(value) || !value.every((m) => isObject(m) && typeof m.tf === "string" && typeof m.local === "string")) {
          wrong(key, value, "a list of mappings", `"pathMappings": [{ "tf": "/wotmud", "local": "<folder>" }]`);
        } else {
          const mappings = value as { tf: string; local: string }[];
          const extra = mappings.flatMap((m, i) => Object.keys(m).filter((k) => k !== "tf" && k !== "local").map((k) => `pathMappings[${i}].${k}`));
          if (extra.length > 0) {
            problems.push(`${label} has "${extra[0]}", which isn't part of a mapping: remove it; a mapping has only "tf" and "local".`);
            break;
          }
          const relative = mappings.find((m) => !m.tf.startsWith("/"));
          if (relative) problems.push(`${label} maps "${relative.tf}" in "pathMappings", which isn't absolute: start tf's side with /, as in "tf": "/wotmud".`);
          else settings.pathMappings = mappings.map((m) => ({ tf: m.tf, local: rebase(m.local, folder) }));
        }
        break;
      case "variables":
        if (!isObject(value) || !Object.values(value).every((v) => typeof v === "string")) {
          wrong(key, value, "an object of names to text", `"variables": { "<name>": "<value>" }`);
        } else {
          const bad = Object.keys(value).find((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
          if (bad !== undefined) problems.push(`${label} sets the variable "${bad}", which isn't a tf variable name: use letters, digits and _, not starting with a digit.`);
          else settings.variables = value as Record<string, string>;
        }
        break;
      case "tfBuild":
        if (typeof value !== "string" || !(TF_BUILDS as readonly string[]).includes(value)) {
          wrong(key, value, TF_BUILDS.map((b) => `"${b}"`).join(" or "), `"${key}": "fork"`);
        } else settings.tfBuild = value;
        break;
      case "diagnostics": {
        if (!isObject(value)) {
          wrong(key, value, "an object", `"diagnostics": { "undefinedMacros": false }`);
          break;
        }
        const diagnostics: NonNullable<RawSettings["diagnostics"]> = {};
        for (const [sub, v] of Object.entries(value)) {
          const want = DIAGNOSTIC_SHAPES[sub];
          if (want === undefined) problems.push(`${label} has "diagnostics.${sub}", which isn't a setting: remove it, or use one of ${DIAGNOSTICS_KEYS.join(", ")}.`);
          else if (want === "boolean") {
            if (typeof v === "boolean") diagnostics[sub as "unresolvedLoads" | "undefinedMacros"] = v;
            else wrong(`diagnostics.${sub}`, v, "true or false", `"${sub}": false`);
          } else if (isStrings(v)) diagnostics.ignoreMacros = v;
          else wrong(`diagnostics.${sub}`, v, "a list of macro names", `"${sub}": ["<name>"]`);
        }
        settings.diagnostics = diagnostics;
        break;
      }
      default:
        break;
    }
  }
  if (problems.length > 0) return { problems };
  return { config: { file: path.resolve(file), folder, settings, claudeCode }, problems: [] };
}

/** Reads and checks the tfscript.json `file`. `read` gives a file's text, or undefined when it can't be read. */
export function readConfig(file: string, read: (file: string) => string | undefined, label: string = file): ConfigLoad {
  const text = read(file);
  if (text === undefined) return { problems: [`${label} can't be read: check that it exists and is a file you may read.`] };
  return parseConfig(text, file, label);
}

/**
 * The nearest tfscript.json in `dir` or a folder above it, or undefined if there is none. With
 * `stopAt` (a folder holding `dir`, such as the project's), the search goes no higher than it.
 */
export function findConfig(dir: string, exists: (file: string) => boolean, stopAt?: string): string | undefined {
  let current = path.resolve(dir);
  const stop = stopAt === undefined ? undefined : path.resolve(stopAt);
  for (;;) {
    const candidate = path.join(current, CONFIG_FILE);
    if (exists(candidate)) return candidate;
    if (stop !== undefined && path.relative(stop, current) === "") return undefined;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * `over` laid on `base`: each setting `over` gives replaces `base`'s, and under `diagnostics` each
 * key does. The command line's options over a tfscript.json's settings, say.
 */
export function overlaySettings(base: RawSettings, over: RawSettings): RawSettings {
  const merged: RawSettings = { ...base, ...over };
  if (base.diagnostics || over.diagnostics) merged.diagnostics = { ...base.diagnostics, ...over.diagnostics };
  return merged;
}
