// Generated from packages/cli/src/hook/bin.ts by scripts/bundle-claude-code.js (npm run bundle:claude-code). Do not edit.
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/cli/src/hook/bin.ts
var path5 = __toESM(require("node:path"));

// packages/cli/src/hook/main.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");

// packages/cli/src/hook/hook.ts
var path4 = __toESM(require("node:path"));

// packages/core/src/workspace/configFile.ts
var path = __toESM(require("node:path"));
var CONFIG_FILE = "tfscript.json";
var SETTINGS = {
  entryFiles: "paths",
  contexts: "contexts",
  activeContext: "string",
  libraryPath: "path",
  tfPath: "paths",
  workingDirectory: "path",
  homeDirectory: "path",
  pathMappings: "pathMappings",
  variables: "variables",
  diagnostics: "diagnostics"
};
var DIAGNOSTICS = {
  unresolvedLoads: "boolean",
  undefinedMacros: "boolean",
  ignoreMacros: "names"
};
var MAX_TIMEOUT_SECONDS = 25;
var CLAUDE_CODE = {
  enabled: "boolean",
  warningLimit: "count",
  showInformation: "boolean",
  timeoutSeconds: "seconds"
};
var CONFIG_KEYS = ["$schema", ...Object.keys(SETTINGS), "claudeCode"];
var DIAGNOSTICS_KEYS = Object.keys(DIAGNOSTICS);
var CLAUDE_CODE_KEYS = Object.keys(CLAUDE_CODE);
function kindOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "object") return "an object";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return `the number ${value}`;
  return `the text ${JSON.stringify(value)}`;
}
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === "string");
function rebase(p, folder) {
  if (p.trim() === "" || p === "~" || p.startsWith("~/") || p.startsWith("~\\")) return p;
  if (p.startsWith("/") || p.startsWith("\\") || path.isAbsolute(p) || path.win32.isAbsolute(p)) return p;
  return path.resolve(folder, p);
}
function parseConfig(text, file, label = file) {
  let data;
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
  const problems = [];
  const settings = {};
  const claudeCode = {};
  const wrong = (key, value, want, example) => {
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
        const shape2 = CLAUDE_CODE[sub];
        if (shape2 === void 0) {
          problems.push(`${label} has "claudeCode.${sub}", which isn't a setting: remove it, or use one of ${CLAUDE_CODE_KEYS.join(", ")}.`);
        } else if (shape2 === "boolean") {
          if (typeof v === "boolean") claudeCode[sub] = v;
          else wrong(`claudeCode.${sub}`, v, "true or false", `"${sub}": true`);
        } else if (shape2 === "count") {
          if (typeof v === "number" && Number.isInteger(v) && v >= 0) claudeCode.warningLimit = v;
          else wrong(`claudeCode.${sub}`, v, "a whole number, 0 or more", `"${sub}": 20`);
        } else if (typeof v === "number" && v > 0 && v <= MAX_TIMEOUT_SECONDS) claudeCode.timeoutSeconds = v;
        else wrong(`claudeCode.${sub}`, v, `a number of seconds above 0 and at most ${MAX_TIMEOUT_SECONDS}`, `"${sub}": 10`);
      }
      continue;
    }
    const shape = SETTINGS[key];
    if (shape === void 0) {
      const bare = key.startsWith("tfscript.") ? key.slice("tfscript.".length) : void 0;
      problems.push(
        bare !== void 0 && SETTINGS[bare.split(".")[0]] !== void 0 ? `${label} has "${key}": write the key without the tfscript. prefix, as "${bare.split(".")[0]}".` : `${label} has "${key}", which isn't a setting: remove it, or use one of ${Object.keys(SETTINGS).join(", ")}, claudeCode.`
      );
      continue;
    }
    switch (shape) {
      case "string":
      case "path":
        if (typeof value !== "string") wrong(key, value, "text", `"${key}": "${shape === "path" ? "<folder>" : "<name>"}"`);
        else settings[key] = shape === "path" ? rebase(value, folder) : value;
        break;
      case "paths":
        if (!isStrings(value)) wrong(key, value, "a list of paths", `"${key}": [${key === "entryFiles" ? `"tfrc"` : `"<folder>"`}]`);
        else settings[key] = value.map((p) => rebase(p, folder));
        break;
      case "contexts":
        if (!isObject(value) || !Object.values(value).every(isStrings)) {
          wrong(key, value, "an object of names to lists of files", `"contexts": { "<name>": ["tfrc"] }`);
        } else {
          settings.contexts = Object.fromEntries(Object.entries(value).map(([name, files]) => [name, files.map((p) => rebase(p, folder))]));
        }
        break;
      case "pathMappings":
        if (!Array.isArray(value) || !value.every((m) => isObject(m) && typeof m.tf === "string" && typeof m.local === "string")) {
          wrong(key, value, "a list of mappings", `"pathMappings": [{ "tf": "/wotmud", "local": "<folder>" }]`);
        } else {
          const mappings = value;
          const relative3 = mappings.find((m) => !m.tf.startsWith("/"));
          if (relative3) problems.push(`${label} maps "${relative3.tf}" in "pathMappings", which isn't absolute: start tf's side with /, as in "tf": "/wotmud".`);
          else settings.pathMappings = mappings.map((m) => ({ tf: m.tf, local: rebase(m.local, folder) }));
        }
        break;
      case "variables":
        if (!isObject(value) || !Object.values(value).every((v) => typeof v === "string")) {
          wrong(key, value, "an object of names to text", `"variables": { "<name>": "<value>" }`);
        } else {
          const bad = Object.keys(value).find((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
          if (bad !== void 0) problems.push(`${label} sets the variable "${bad}", which isn't a tf variable name: use letters, digits and _, not starting with a digit.`);
          else settings.variables = value;
        }
        break;
      case "diagnostics": {
        if (!isObject(value)) {
          wrong(key, value, "an object", `"diagnostics": { "undefinedMacros": false }`);
          break;
        }
        const diagnostics = {};
        for (const [sub, v] of Object.entries(value)) {
          const want = DIAGNOSTICS[sub];
          if (want === void 0) problems.push(`${label} has "diagnostics.${sub}", which isn't a setting: remove it, or use one of ${DIAGNOSTICS_KEYS.join(", ")}.`);
          else if (want === "boolean") {
            if (typeof v === "boolean") diagnostics[sub] = v;
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
function readConfig(file, read, label = file) {
  const text = read(file);
  if (text === void 0) return { problems: [`${label} can't be read: check that it exists and is a file you may read.`] };
  return parseConfig(text, file, label);
}
function findConfig(dir, exists) {
  let current = path.resolve(dir);
  for (; ; ) {
    const candidate = path.join(current, CONFIG_FILE);
    if (exists(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return void 0;
    current = parent;
  }
}

// packages/cli/src/settingNames.ts
var OPTION_FOR_SETTING = {
  entryFiles: "--entry-file",
  contexts: "--context",
  activeContext: "--active-context",
  libraryPath: "--library-path",
  tfPath: "--tf-path",
  workingDirectory: "--working-directory",
  homeDirectory: "--home-directory",
  pathMappings: "--path-mapping",
  variables: "--variable",
  "diagnostics.unresolvedLoads": "--no-unresolved-loads",
  "diagnostics.undefinedMacros": "--no-undefined-macros",
  "diagnostics.ignoreMacros": "--ignore-macro"
};
var TOGGLES = new Set(Object.values(OPTION_FOR_SETTING).filter((o) => o.startsWith("--no-")));

// packages/cli/src/format.ts
var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// packages/cli/src/hook/report.ts
var DEFAULT_WARNING_LIMIT = 20;
var DEFAULT_BUDGET = 9e3;
function line(d) {
  const where = `${d.file}:${d.range.start.line}:${d.range.start.column}`;
  const fixes = d.fixes.length === 0 ? "" : ` Quick fix${d.fixes.length === 1 ? "" : "es"} an editor offers: ${d.fixes.join("; ")}.`;
  return `- ${where}: ${d.severity} ${d.code}: ${d.message}${fixes}`;
}
function counts(errors, warnings, information) {
  const parts = [errors > 0 ? plural(errors, "error", "errors") : "", warnings > 0 ? plural(warnings, "warning", "warnings") : "", information > 0 ? plural(information, "information note", "information notes") : ""].filter(Boolean);
  return parts.length <= 1 ? parts[0] ?? "" : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
function shapeReport(report, label, options) {
  const errors = report.diagnostics.filter((d) => d.severity === "error");
  const warnings = report.diagnostics.filter((d) => d.severity === "warning");
  const information = options.showInformation ? report.diagnostics.filter((d) => d.severity === "information") : [];
  if (errors.length + warnings.length + information.length === 0) return void 0;
  const chosen = [...errors, ...warnings.slice(0, options.warningLimit), ...information];
  const budget = options.budget ?? DEFAULT_BUDGET;
  const head = `tfscript found ${counts(errors.length, warnings.length, information.length)} in ${label}:`;
  const lines = [head];
  let length = head.length;
  let listed = 0;
  const reserve = 300;
  for (const d of chosen) {
    const text = line(d);
    if (length + 1 + text.length > budget - reserve) break;
    lines.push(text);
    length += 1 + text.length;
    listed++;
  }
  const left = errors.length + warnings.length + information.length - listed;
  if (left > 0) {
    const run = options.fullCommand === void 0 ? "" : `; to see them all, run ${options.fullCommand}`;
    lines.push(`- ${plural(left, "more is", "more are")} not listed${run}.`);
  }
  return { errors: errors.length, text: lines.join("\n") };
}

// packages/cli/src/hook/root.ts
var path2 = __toESM(require("node:path"));
function isInside(file, dir) {
  const rel = path2.relative(dir, file);
  return rel === "" || rel !== ".." && !rel.startsWith(`..${path2.sep}`) && !rel.startsWith("../") && !path2.isAbsolute(rel);
}
function hookRoot(file, projectDir, exists) {
  const absolute = path2.resolve(file);
  const config = findConfig(path2.dirname(absolute), exists);
  if (config !== void 0) return { root: path2.dirname(config), config };
  if (projectDir !== void 0 && projectDir.trim() !== "" && isInside(absolute, path2.resolve(projectDir))) {
    return { root: path2.resolve(projectDir) };
  }
  return { root: path2.dirname(absolute) };
}

// packages/cli/src/hook/terraform.ts
var path3 = __toESM(require("node:path"));
function isTerraformEntry(name) {
  return name === ".terraform" || name === ".terraform.lock.hcl" || /\.tfvars(\.json)?$/.test(name) || name.endsWith(".tf.json");
}
var HCL_BLOCK = /^[ \t]*(?:(?:resource|data|module|variable|output|provider)[ \t]+"|(?:terraform|locals)[ \t]*\{)/m;
function terraformSign(file, host) {
  if (!file.toLowerCase().endsWith(".tf")) return void 0;
  const dir = path3.dirname(file);
  const beside = (host.listDir(dir) ?? []).find(isTerraformEntry);
  if (beside !== void 0) return `${beside} is in its folder`;
  const text = host.readFile(file);
  const match = text === void 0 ? null : HCL_BLOCK.exec(text);
  if (match) return `it has a Terraform block (${match[0].trim()})`;
  return void 0;
}

// packages/cli/src/hook/hook.ts
var DEFAULT_TIMEOUT_SECONDS = 10;
var QUIET = { stdout: "" };
function kindOf2(file) {
  const name = path4.basename(file);
  const lower = name.toLowerCase();
  if (lower.endsWith(".tf") || name === "tfrc" || name === ".tfrc") return "script";
  if (name === CONFIG_FILE) return "config";
  return void 0;
}
function context(text) {
  return { stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text } })}
` };
}
function block(text) {
  return { stdout: `${JSON.stringify({ decision: "block", reason: text, hookSpecificOutput: { hookEventName: "PostToolUse" } })}
` };
}
function labelOf(file, projectDir) {
  if (projectDir === void 0 || !isInside(file, path4.resolve(projectDir))) return file;
  return path4.relative(path4.resolve(projectDir), file) || file;
}
var quote = (s) => /\s/.test(s) ? `"${s}"` : s;
function runHook(input, deps) {
  let call;
  try {
    call = JSON.parse(input);
  } catch {
    return QUIET;
  }
  const given = call?.tool_input?.file_path;
  if (typeof given !== "string" || given === "") return QUIET;
  const file = path4.resolve(call.cwd ?? deps.projectDir ?? ".", given);
  const kind = kindOf2(file);
  if (kind === void 0 || !deps.isFile(file)) return QUIET;
  const label = labelOf(file, deps.projectDir);
  if (kind === "config") {
    const loaded = readConfig(file, deps.readFile, label);
    return loaded.config ? QUIET : context(`tfscript can't use ${label}: ${loaded.problems.join(" ")}`);
  }
  if (terraformSign(file, deps) !== void 0) return QUIET;
  const { root, config } = hookRoot(file, deps.projectDir, deps.isFile);
  let claudeCode = {};
  if (config !== void 0) {
    const configLabel = labelOf(config, deps.projectDir);
    const loaded = readConfig(config, deps.readFile, configLabel);
    if (!loaded.config) {
      return context(`tfscript didn't check ${label}, because it can't use ${configLabel}: ${loaded.problems.join(" ")}`);
    }
    if (loaded.config.claudeCode.enabled === false) return QUIET;
    claudeCode = loaded.config.claudeCode;
  }
  const seconds = claudeCode.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const cwd = deps.projectDir !== void 0 && isInside(file, path4.resolve(deps.projectDir)) ? path4.resolve(deps.projectDir) : root;
  const args = ["check", "--format", "json", "--root", root, file];
  const run = deps.runCli(args, cwd, seconds * 1e3);
  const fullCommand = `node ${quote(deps.cliPath)} check --root ${quote(root)} ${quote(file)}`;
  if (run.timedOut) {
    return context(
      `tfscript didn't finish checking ${label} within ${seconds} seconds, so it is unchecked. Its root, ${root}, may hold too many files: put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`
    );
  }
  if (run.error !== void 0) return context(`tfscript couldn't check ${label}, because it couldn't start (${run.error}): check that node can run ${deps.cliPath}.`);
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    report = void 0;
  }
  if (report === void 0 || !Array.isArray(report.diagnostics)) {
    const why = run.stderr.trim().split("\n")[0] ?? "";
    return context(`tfscript couldn't check ${label}${why ? ` (${why})` : ""}: run ${fullCommand} to see why.`);
  }
  if (report.problems.length > 0 && report.diagnostics.length === 0) {
    return context(`tfscript couldn't check ${label}: ${report.problems.join(" ")}`);
  }
  const shaped = shapeReport(report, label, {
    warningLimit: claudeCode.warningLimit ?? DEFAULT_WARNING_LIMIT,
    showInformation: claudeCode.showInformation ?? false,
    fullCommand
  });
  if (shaped === void 0) return QUIET;
  return shaped.errors > 0 ? block(shaped.text) : context(shaped.text);
}

// packages/cli/src/hook/main.ts
function runNode(cli, args, cwd, timeoutMs) {
  const result = (0, import_node_child_process.spawnSync)(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const code = result.error?.code;
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: code === "ETIMEDOUT",
    ...result.error !== void 0 && code !== "ETIMEDOUT" ? { error: result.error.message } : {}
  };
}
function nodeDeps(cliPath, env = process.env) {
  return {
    ...env.CLAUDE_PROJECT_DIR ? { projectDir: env.CLAUDE_PROJECT_DIR } : {},
    cliPath,
    runCli: (args, cwd, timeoutMs) => runNode(cliPath, args, cwd, timeoutMs),
    readFile: (f) => {
      try {
        return (0, import_node_fs.readFileSync)(f, "utf8");
      } catch {
        return void 0;
      }
    },
    listDir: (d) => {
      try {
        return (0, import_node_fs.readdirSync)(d);
      } catch {
        return void 0;
      }
    },
    isFile: (f) => {
      try {
        return (0, import_node_fs.statSync)(f).isFile();
      } catch {
        return false;
      }
    }
  };
}
function hookMain(cliPath) {
  let input = "";
  try {
    input = (0, import_node_fs.readFileSync)(0, "utf8");
  } catch {
    input = "";
  }
  try {
    process.stdout.write(runHook(input, nodeDeps(cliPath)).stdout);
  } catch (error) {
    process.stderr.write(`tfscript hook: an internal error, which is a bug: ${error instanceof Error ? error.stack ?? error.message : String(error)}
`);
  }
  process.exitCode = 0;
}

// packages/cli/src/hook/bin.ts
hookMain(path5.join(__dirname, "tfscript.js"));
