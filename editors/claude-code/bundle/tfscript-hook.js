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
var path6 = __toESM(require("node:path"));

// packages/cli/src/hook/main.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var path5 = __toESM(require("node:path"));

// packages/core/src/workspace/nodeFileSystem.ts
var SKIP_DIRS = /* @__PURE__ */ new Set([".git", ".jj", "node_modules"]);
function isSkippedDir(name) {
  return SKIP_DIRS.has(process.platform === "win32" ? name.toLowerCase() : name);
}

// packages/cli/src/hook/hook.ts
var path4 = __toESM(require("node:path"));

// packages/core/src/workspace/configFile.ts
var path = __toESM(require("node:path"));
var CONFIG_FILE = "tfscript.json";
var SETTING_SHAPES = {
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
var DIAGNOSTIC_SHAPES = {
  unresolvedLoads: "boolean",
  undefinedMacros: "boolean",
  ignoreMacros: "names"
};
var MAX_TIMEOUT_SECONDS = 20;
var CLAUDE_CODE_SHAPES = {
  enabled: "boolean",
  warningLimit: "count",
  showInformation: "boolean",
  timeoutSeconds: "seconds"
};
var CONFIG_KEYS = ["$schema", ...Object.keys(SETTING_SHAPES), "claudeCode"];
var DIAGNOSTICS_KEYS = Object.keys(DIAGNOSTIC_SHAPES);
var CLAUDE_CODE_KEYS = Object.keys(CLAUDE_CODE_SHAPES);
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
        const shape2 = CLAUDE_CODE_SHAPES[sub];
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
    const shape = SETTING_SHAPES[key];
    if (shape === void 0) {
      const bare = key.startsWith("tfscript.") ? key.slice("tfscript.".length) : void 0;
      problems.push(
        bare !== void 0 && SETTING_SHAPES[bare.split(".")[0]] !== void 0 ? `${label} has "${key}": write the key without the tfscript. prefix, as "${bare.split(".")[0]}".` : `${label} has "${key}", which isn't a setting: remove it, or use one of ${Object.keys(SETTING_SHAPES).join(", ")}, claudeCode.`
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
          const extra = mappings.flatMap((m, i) => Object.keys(m).filter((k) => k !== "tf" && k !== "local").map((k) => `pathMappings[${i}].${k}`));
          if (extra.length > 0) {
            problems.push(`${label} has "${extra[0]}", which isn't part of a mapping: remove it; a mapping has only "tf" and "local".`);
            break;
          }
          const relative5 = mappings.find((m) => !m.tf.startsWith("/"));
          if (relative5) problems.push(`${label} maps "${relative5.tf}" in "pathMappings", which isn't absolute: start tf's side with /, as in "tf": "/wotmud".`);
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
          const want = DIAGNOSTIC_SHAPES[sub];
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
function findConfig(dir, exists, stopAt) {
  let current = path.resolve(dir);
  const stop = stopAt === void 0 ? void 0 : path.resolve(stopAt);
  for (; ; ) {
    const candidate = path.join(current, CONFIG_FILE);
    if (exists(candidate)) return candidate;
    if (stop !== void 0 && path.relative(stop, current) === "") return void 0;
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
function line(d, label) {
  const where = `${label}:${d.range.start.line}:${d.range.start.column}`;
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
    const text = line(d, label);
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
function contains(dir, file, realpath) {
  return isInside(file, dir) || isInside(realpath(file), realpath(dir));
}
function hookRoot(file, projectDir, host) {
  const absolute = path2.resolve(file);
  const dir = path2.dirname(absolute);
  const project = projectDir !== void 0 && projectDir.trim() !== "" ? path2.resolve(projectDir) : void 0;
  if (project !== void 0 && contains(project, absolute, host.realpath)) {
    const [from, stop] = isInside(absolute, project) ? [dir, project] : [path2.dirname(host.realpath(absolute)), host.realpath(project)];
    const config2 = findConfig(from, host.isFile, stop);
    return config2 !== void 0 ? { root: path2.dirname(config2), config: config2 } : { root: project };
  }
  const config = findConfig(dir, host.isFile);
  if (config !== void 0) return { root: path2.dirname(config), config };
  return host.isSmallFolder(dir) ? { root: dir } : { root: dir, fileOnly: true };
}

// packages/cli/src/hook/terraform.ts
var path3 = __toESM(require("node:path"));
function isTerraformEntry(name) {
  return name === ".terraform" || name === ".terraform.lock.hcl" || /\.tfvars(\.json)?$/.test(name) || name.endsWith(".tf.json") || /\.tfstate(\.backup)?$/.test(name);
}
var LABEL = String.raw`(?:"[^"\n]*"|[A-Za-z_][\w-]*)`;
var HCL_BLOCK = new RegExp(
  String.raw`^[ \t]*(?:` + String.raw`(?:resource|data|module|variable|output|provider|check|ephemeral)[ \t]+(?:"|${LABEL}(?:[ \t]+${LABEL})*[ \t]*\{)` + String.raw`|(?:terraform|locals|moved|import|removed)[ \t]*\{` + String.raw`)`,
  "m"
);
var ANY_BLOCK = new RegExp(String.raw`^[A-Za-z_][\w-]*(?:[ \t]+${LABEL})*[ \t]*\{`);
function firstSignificantLine(text) {
  let rest = text;
  for (; ; ) {
    rest = rest.replace(/^\s+/, "");
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/");
      if (end < 0) return void 0;
      rest = rest.slice(end + 2);
      continue;
    }
    if (rest === "") return void 0;
    const newline = rest.indexOf("\n");
    const line2 = newline < 0 ? rest : rest.slice(0, newline);
    if (line2.startsWith("#") || line2.startsWith("//") || line2.startsWith(";")) {
      rest = newline < 0 ? "" : rest.slice(newline + 1);
      continue;
    }
    return line2.replace(/\r$/, "");
  }
}
function terraformSign(file, host) {
  if (!file.toLowerCase().endsWith(".tf")) return void 0;
  const dir = path3.dirname(file);
  const beside = (host.listDir(dir) ?? []).find(isTerraformEntry);
  if (beside !== void 0) return `${beside} is in its folder`;
  const raw = host.readFile(file);
  if (raw === void 0) return void 0;
  const text = raw.replace(/^﻿/, "");
  const match = HCL_BLOCK.exec(text);
  if (match) return `it has a Terraform block (${match[0].trim()})`;
  const first = firstSignificantLine(text);
  if (first !== void 0 && ANY_BLOCK.test(first)) return `its first line opens an HCL block (${first.trim()})`;
  return void 0;
}

// packages/cli/src/hook/hook.ts
var DEFAULT_TIMEOUT_SECONDS = 10;
var RETRY_SECONDS = 5;
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
var slash = (p) => p.replace(/\\/g, "/");
var quote = (p) => `"${slash(p)}"`;
function labelOf(file, projectDir, realpath) {
  if (projectDir !== void 0) {
    const project = path4.resolve(projectDir);
    if (isInside(file, project)) return slash(path4.relative(project, file)) || slash(file);
    const real = realpath(file);
    const realProject = realpath(project);
    if (isInside(real, realProject)) return slash(path4.relative(realProject, real)) || slash(file);
  }
  return slash(file);
}
function runHook(input, deps) {
  let call;
  try {
    call = JSON.parse(input);
  } catch {
    return QUIET;
  }
  const given = call?.tool_input?.file_path;
  if (typeof given !== "string" || given === "") return QUIET;
  const base = typeof call.cwd === "string" && call.cwd !== "" ? call.cwd : deps.projectDir ?? ".";
  const file = path4.resolve(base, given);
  const kind = kindOf2(file);
  if (kind === void 0 || !deps.isFile(file)) return QUIET;
  const label = labelOf(file, deps.projectDir, deps.realpath);
  if (kind === "config") {
    const loaded = readConfig(file, deps.readFile, label);
    return loaded.config ? QUIET : context(`tfscript can't use ${label}: ${loaded.problems.join(" ")}`);
  }
  if (terraformSign(file, deps) !== void 0) return QUIET;
  const { root, config, fileOnly } = hookRoot(file, deps.projectDir, deps);
  let claudeCode = {};
  if (config !== void 0) {
    const configLabel = labelOf(config, deps.projectDir, deps.realpath);
    const loaded = readConfig(config, deps.readFile, configLabel);
    if (!loaded.config) {
      return context(`tfscript didn't check ${label}, because it can't use ${configLabel}: ${loaded.problems.join(" ")}`);
    }
    if (loaded.config.claudeCode.enabled === false) return QUIET;
    claudeCode = loaded.config.claudeCode;
  }
  const seconds = claudeCode.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const flags = ["--setting-names", "config", ...fileOnly ? ["--no-undefined-macros"] : []];
  const run = deps.runCli(["check", "--format", "json", ...flags, "--root", root, file], root, seconds * 1e3);
  const fullCommand = `node ${quote(deps.cliPath)} check ${flags.join(" ")} --root ${quote(root)} ${quote(file)}`;
  const options = { warningLimit: claudeCode.warningLimit ?? DEFAULT_WARNING_LIMIT, showInformation: claudeCode.showInformation ?? false };
  if (run.timedOut) {
    const quickFlags = flags.includes("--no-undefined-macros") ? flags : [...flags, "--no-undefined-macros"];
    const quick = deps.runCli(["check", "--format", "json", ...quickFlags, "--root", root, file], root, RETRY_SECONDS * 1e3);
    const quickReport = quick.timedOut || quick.failure !== void 0 ? void 0 : parseReport(quick.stdout);
    if (quickReport === void 0) {
      return context(
        `tfscript didn't finish checking ${label} within ${seconds} seconds, so it is unchecked. Its root, ${slash(root)}, may hold too many files: put a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`
      );
    }
    const note = `The full check of ${label} didn't finish within ${seconds} seconds (its root, ${slash(root)}, may hold too many files to search for what defines each macro), so this is a quick check without undefined-macro. For the full check, narrow the root with a tfscript.json in the folder that holds the scripts' tfrc, or raise claudeCode.timeoutSeconds in one.`;
    const problems = quickReport.problems.length > 0 ? `tfscript also couldn't check everything: ${quickReport.problems.join(" ")}` : void 0;
    const tail = problems === void 0 ? note : `${problems}
${note}`;
    const shaped2 = shapeReport(quickReport, label, { ...options, budget: DEFAULT_BUDGET - tail.length });
    if (shaped2 === void 0) return context(tail);
    const text2 = `${shaped2.text}
${tail}`;
    return shaped2.errors > 0 ? block(text2) : context(text2);
  }
  if (run.failure !== void 0) {
    const fix = run.failure.overflow ? `run ${fullCommand} to see it` : `check that node can run ${slash(deps.cliPath)}`;
    return context(`tfscript couldn't check ${label}, because ${run.failure.reason}: ${fix}.`);
  }
  const report = parseReport(run.stdout);
  if (report === void 0) {
    const why = run.stderr.replace(/\r/g, "").trim().split("\n")[0] ?? "";
    return context(`tfscript couldn't check ${label}${why ? ` (${why})` : ""}: run ${fullCommand} to see why.`);
  }
  if (report.problems.length > 0 && report.diagnostics.length === 0) {
    return context(`tfscript couldn't check ${label}: ${report.problems.join(" ")}`);
  }
  const also = report.problems.length > 0 ? `tfscript also couldn't check everything: ${report.problems.join(" ")}` : void 0;
  const shaped = shapeReport(report, label, { ...options, fullCommand, ...also ? { budget: DEFAULT_BUDGET - also.length } : {} });
  if (shaped === void 0) return also === void 0 ? QUIET : context(also);
  const text = also === void 0 ? shaped.text : `${shaped.text}
${also}`;
  return shaped.errors > 0 ? block(text) : context(text);
}
function parseReport(stdout) {
  try {
    const report = JSON.parse(stdout);
    return Array.isArray(report?.diagnostics) && Array.isArray(report.problems) ? report : void 0;
  } catch {
    return void 0;
  }
}

// packages/cli/src/hook/main.ts
var MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
function spawnFailure(error) {
  switch (error.code) {
    case "ENOBUFS":
      return { reason: `its report was larger than ${MAX_OUTPUT_BYTES / 1024 / 1024} MiB`, overflow: true };
    case "ENOENT":
      return { reason: "it couldn't be started: node, or the folder it was to run in, wasn't found (ENOENT)", overflow: false };
    case "EACCES":
    case "EPERM":
      return { reason: `it wasn't allowed to start (${error.code})`, overflow: false };
    default:
      return { reason: `it couldn't be run (${error.code ? `${error.code}: ` : ""}${error.message})`, overflow: false };
  }
}
function runNode(cli, args, cwd, timeoutMs) {
  const result = (0, import_node_child_process.spawnSync)(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: MAX_OUTPUT_BYTES });
  const error = result.error;
  const timedOut = error?.code === "ETIMEDOUT";
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut,
    ...error !== void 0 && !timedOut ? { failure: spawnFailure(error) } : {}
  };
}
var SMALL_FOLDER_ENTRIES = 5e3;
function isSmallFolder(dir, limit = SMALL_FOLDER_ENTRIES, home = (0, import_node_os.homedir)()) {
  const resolved = path5.resolve(dir);
  if (path5.parse(resolved).root === resolved || path5.relative(home, resolved) === "") return false;
  let seen = 0;
  const visit = (d) => {
    let entries;
    try {
      entries = (0, import_node_fs.readdirSync)(d, { withFileTypes: true });
    } catch {
      return true;
    }
    seen += entries.length;
    if (seen > limit) return false;
    return entries.every((e) => !e.isDirectory() || isSkippedDir(e.name) || visit(path5.join(d, e.name)));
  };
  return visit(resolved);
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
    realpath: (p) => {
      try {
        return import_node_fs.realpathSync.native(p);
      } catch {
        return p;
      }
    },
    isSmallFolder: (d) => isSmallFolder(d),
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
hookMain(path6.join(__dirname, "tfscript.js"));
