#!/usr/bin/env node
// Generated from packages/cli/src/cli.ts by scripts/bundle-claude-code.js (npm run bundle:claude-code). Do not edit.
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
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

// packages/cli/src/args.ts
var UsageError = class extends Error {
};
var OPTIONS = {
  help: "flag",
  version: "flag",
  format: "value",
  "setting-names": "value",
  "max-warnings": "value",
  root: "value",
  config: "value",
  "entry-file": "list",
  context: "list",
  "active-context": "value",
  "library-path": "value",
  "tf-path": "list",
  "working-directory": "value",
  "home-directory": "value",
  "path-mapping": "list",
  variable: "list",
  "no-unresolved-loads": "flag",
  "no-undefined-macros": "flag",
  "ignore-macro": "list"
};
var SHORT = { h: "help" };
function tokenize(argv) {
  const parsed = { positionals: [], values: /* @__PURE__ */ new Map(), flags: /* @__PURE__ */ new Set() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      parsed.positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("-") || arg === "-") {
      parsed.positionals.push(arg);
      continue;
    }
    const long = arg.startsWith("--");
    const eq = arg.indexOf("=");
    const written = long ? arg.slice(2, eq < 0 ? void 0 : eq) : arg.slice(1);
    const name = long ? written : SHORT[written];
    const kind = name === void 0 ? void 0 : OPTIONS[name];
    if (name === void 0 || kind === void 0) {
      throw new UsageError(`There's no option ${arg.slice(0, long && eq >= 0 ? eq : void 0)}: run tfscript --help to see the options.`);
    }
    if (kind === "flag") {
      if (long && eq >= 0) throw new UsageError(`--${name} doesn't take a value: write it on its own, without =.`);
      parsed.flags.add(name);
      continue;
    }
    let value;
    if (long && eq >= 0) value = arg.slice(eq + 1);
    else if (i + 1 < argv.length) value = argv[++i];
    if (value === void 0) throw new UsageError(`--${name} needs a value: write it after the option, as in --${name} <value>.`);
    const list = parsed.values.get(name) ?? [];
    if (kind === "value" && list.length > 0) throw new UsageError(`--${name} was given twice: give it once.`);
    list.push(value);
    parsed.values.set(name, list);
  }
  return parsed;
}
function pair(option, text, what) {
  const eq = text.indexOf("=");
  if (eq <= 0) throw new UsageError(`--${option} ${text} isn't ${what}: write it as --${option} ${what}.`);
  return [text.slice(0, eq), text.slice(eq + 1)];
}
function settingsOf(p) {
  const settings = {};
  const one = (name) => p.values.get(name)?.[0];
  const all = (name) => p.values.get(name) ?? [];
  if (all("entry-file").length > 0) settings.entryFiles = all("entry-file");
  if (all("context").length > 0) {
    const contexts = {};
    for (const c of all("context")) {
      const [name, file] = pair("context", c, "<name>=<file>");
      (contexts[name] ??= []).push(file);
    }
    settings.contexts = contexts;
  }
  const active = one("active-context");
  if (active !== void 0) settings.activeContext = active;
  const library = one("library-path");
  if (library !== void 0) settings.libraryPath = library;
  if (all("tf-path").length > 0) settings.tfPath = all("tf-path");
  const working = one("working-directory");
  if (working !== void 0) settings.workingDirectory = working;
  const home = one("home-directory");
  if (home !== void 0) settings.homeDirectory = home;
  if (all("path-mapping").length > 0) {
    settings.pathMappings = all("path-mapping").map((m) => {
      const [tf, local] = pair("path-mapping", m, "<tf path>=<local path>");
      if (!tf.startsWith("/")) throw new UsageError(`--path-mapping ${m} maps ${tf}, which isn't absolute: start tf's side with /, as in /wotmud=C:/wotmud.`);
      return { tf, local };
    });
  }
  if (all("variable").length > 0) {
    const variables = {};
    for (const v of all("variable")) {
      const [name, value] = pair("variable", v, "<name>=<value>");
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new UsageError(`--variable ${v} names ${name}, which isn't a tf variable name: use letters, digits and _, not starting with a digit.`);
      variables[name] = value;
    }
    settings.variables = variables;
  }
  const diagnostics = {};
  if (p.flags.has("no-unresolved-loads")) diagnostics.unresolvedLoads = false;
  if (p.flags.has("no-undefined-macros")) diagnostics.undefinedMacros = false;
  if (all("ignore-macro").length > 0) diagnostics.ignoreMacros = all("ignore-macro");
  if (Object.keys(diagnostics).length > 0) settings.diagnostics = diagnostics;
  return settings;
}
function parseArgs(argv) {
  const p = tokenize(argv);
  if (p.flags.has("help")) return { kind: "help" };
  if (p.flags.has("version")) return { kind: "version" };
  const [command2, ...paths] = p.positionals;
  if (command2 === void 0) throw new UsageError("No command given: run tfscript check <files or folders>, or tfscript --help.");
  if (command2 !== "check") throw new UsageError(`There's no command ${command2}: the only one is check, as in tfscript check tfrc.`);
  if (paths.length === 0) throw new UsageError("Nothing to check: name the .tf files or folders, as in tfscript check tfrc scripts/.");
  const format = p.values.get("format")?.[0] ?? "human";
  if (format !== "human" && format !== "json") throw new UsageError(`--format ${format} isn't a format: use --format human or --format json.`);
  const settingNames = p.values.get("setting-names")?.[0] ?? "option";
  if (settingNames !== "option" && settingNames !== "config") {
    throw new UsageError(`--setting-names ${settingNames} isn't a way to name settings: use --setting-names option or --setting-names config.`);
  }
  const max = p.values.get("max-warnings")?.[0];
  let maxWarnings;
  if (max !== void 0) {
    if (!/^\d+$/.test(max)) throw new UsageError(`--max-warnings ${max} isn't a number: give a whole number of warnings, 0 or more.`);
    maxWarnings = Number(max);
  }
  const root = p.values.get("root")?.[0];
  const config = p.values.get("config")?.[0];
  return {
    kind: "check",
    paths,
    format,
    settingNames,
    ...maxWarnings === void 0 ? {} : { maxWarnings },
    ...root === void 0 ? {} : { root },
    ...config === void 0 ? {} : { config },
    settings: settingsOf(p)
  };
}

// packages/cli/src/check.ts
var import_node_fs2 = require("node:fs");
var path7 = __toESM(require("node:path"));

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
  const wrong = (key2, value, want, example) => {
    problems.push(`${label} gives "${key2}" as ${kindOf(value)}, not ${want}: write it as ${example}.`);
  };
  for (const [key2, value] of Object.entries(data)) {
    if (key2 === "$schema") {
      if (typeof value !== "string") wrong(key2, value, "a link", `"$schema": "<link to tfscript.schema.json>"`);
      continue;
    }
    if (key2 === "claudeCode") {
      if (!isObject(value)) {
        wrong(key2, value, "an object", `"claudeCode": { "warningLimit": 20 }`);
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
    const shape = SETTING_SHAPES[key2];
    if (shape === void 0) {
      const bare = key2.startsWith("tfscript.") ? key2.slice("tfscript.".length) : void 0;
      problems.push(
        bare !== void 0 && SETTING_SHAPES[bare.split(".")[0]] !== void 0 ? `${label} has "${key2}": write the key without the tfscript. prefix, as "${bare.split(".")[0]}".` : `${label} has "${key2}", which isn't a setting: remove it, or use one of ${Object.keys(SETTING_SHAPES).join(", ")}, claudeCode.`
      );
      continue;
    }
    switch (shape) {
      case "string":
      case "path":
        if (typeof value !== "string") wrong(key2, value, "text", `"${key2}": "${shape === "path" ? "<folder>" : "<name>"}"`);
        else settings[key2] = shape === "path" ? rebase(value, folder) : value;
        break;
      case "paths":
        if (!isStrings(value)) wrong(key2, value, "a list of paths", `"${key2}": [${key2 === "entryFiles" ? `"tfrc"` : `"<folder>"`}]`);
        else settings[key2] = value.map((p) => rebase(p, folder));
        break;
      case "contexts":
        if (!isObject(value) || !Object.values(value).every(isStrings)) {
          wrong(key2, value, "an object of names to lists of files", `"contexts": { "<name>": ["tfrc"] }`);
        } else {
          settings.contexts = Object.fromEntries(Object.entries(value).map(([name, files]) => [name, files.map((p) => rebase(p, folder))]));
        }
        break;
      case "pathMappings":
        if (!Array.isArray(value) || !value.every((m) => isObject(m) && typeof m.tf === "string" && typeof m.local === "string")) {
          wrong(key2, value, "a list of mappings", `"pathMappings": [{ "tf": "/wotmud", "local": "<folder>" }]`);
        } else {
          const mappings = value;
          const extra = mappings.flatMap((m, i) => Object.keys(m).filter((k) => k !== "tf" && k !== "local").map((k) => `pathMappings[${i}].${k}`));
          if (extra.length > 0) {
            problems.push(`${label} has "${extra[0]}", which isn't part of a mapping: remove it; a mapping has only "tf" and "local".`);
            break;
          }
          const relative6 = mappings.find((m) => !m.tf.startsWith("/"));
          if (relative6) problems.push(`${label} maps "${relative6.tf}" in "pathMappings", which isn't absolute: start tf's side with /, as in "tf": "/wotmud".`);
          else settings.pathMappings = mappings.map((m) => ({ tf: m.tf, local: rebase(m.local, folder) }));
        }
        break;
      case "variables":
        if (!isObject(value) || !Object.values(value).every((v) => typeof v === "string")) {
          wrong(key2, value, "an object of names to text", `"variables": { "<name>": "<value>" }`);
        } else {
          const bad = Object.keys(value).find((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
          if (bad !== void 0) problems.push(`${label} sets the variable "${bad}", which isn't a tf variable name: use letters, digits and _, not starting with a digit.`);
          else settings.variables = value;
        }
        break;
      case "diagnostics": {
        if (!isObject(value)) {
          wrong(key2, value, "an object", `"diagnostics": { "undefinedMacros": false }`);
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
function overlaySettings(base, over) {
  const merged = { ...base, ...over };
  if (base.diagnostics || over.diagnostics) merged.diagnostics = { ...base.diagnostics, ...over.diagnostics };
  return merged;
}

// packages/core/src/logicalEntries.ts
var DEF_RE = /^\s*\/@?def\b/i;
var FOR_RE = /^\s*\/for\b/i;
var OTHER_MACRO_BODY_RE = /^\s*\/(?:alias|@?(?:bind|hook|edit|gag|hilite)|trigpc|trigc|trigp|trig)\b/i;
function isTfSpace(ch) {
  return ch === " " || ch === "	" || ch === "\r" || ch === "\f" || ch === "\v";
}
function leadingWhitespaceLength(line) {
  let i = 0;
  while (i < line.length && isTfSpace(line[i])) i += 1;
  return i;
}
function isCommentLine(line) {
  const first = line[leadingWhitespaceLength(line)];
  return first === ";" || first === "#";
}
function isBlankLine(line) {
  return leadingWhitespaceLength(line) === line.length;
}
function continuesToNextLine(line) {
  if (!line.endsWith("\\")) return false;
  return !(line.length >= 2 && line[line.length - 2] === "%");
}
function splitRawLines(text) {
  return text.split("\n");
}
function fileLineCount(lines) {
  return lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}
function splitLogicalEntries(text) {
  const lines = splitRawLines(text);
  const count = fileLineCount(lines);
  const entries = [];
  let i = 0;
  while (i < count) {
    const firstLine = lines[i] ?? "";
    if (isCommentLine(firstLine)) {
      i += 1;
      continue;
    }
    const startLine = i;
    const parts = [];
    const partLeadingLens = [];
    let lineIdx = i;
    let incomplete = false;
    while (true) {
      const line = lines[lineIdx] ?? "";
      const continues = continuesToNextLine(line);
      const sliced = continues ? line.slice(0, -1) : line;
      const leadingLen = leadingWhitespaceLength(sliced);
      parts.push({ line: lineIdx, text: sliced.slice(leadingLen) });
      partLeadingLens.push(leadingLen);
      if (!continues) break;
      let nextIdx = lineIdx + 1;
      while (nextIdx < count && isCommentLine(lines[nextIdx] ?? "")) {
        nextIdx += 1;
      }
      if (nextIdx >= count) {
        incomplete = true;
        break;
      }
      lineIdx = nextIdx;
    }
    const joinedText2 = parts.map((p) => p.text).join("");
    const offsetMap = [];
    parts.forEach((part, idx) => {
      const leadingLen = partLeadingLens[idx] ?? 0;
      for (let c = 0; c < part.text.length; c += 1) {
        offsetMap.push({ line: part.line, character: leadingLen + c });
      }
    });
    entries.push({
      text: joinedText2,
      isDefBody: DEF_RE.test(joinedText2),
      isForLoop: FOR_RE.test(joinedText2),
      isOtherMacroBody: OTHER_MACRO_BODY_RE.test(joinedText2),
      startLine,
      endLine: lineIdx,
      incomplete,
      parts,
      offsetMap
    });
    i = lineIdx + 1;
  }
  return entries;
}

// packages/core/src/symbols.ts
var DEFINING_COMMAND_RE = /^\s*\/(def|alias|bind|hook|trigpc|trigc|trigp|trig)\b/i;
var DEF_OPTS_WITH_ARG = /* @__PURE__ */ new Set(["p", "c", "b", "B", "E", "t", "w", "h", "A", "a", "f", "P", "T", "n", "m"]);
var DEF_OPTS = /* @__PURE__ */ new Set([...DEF_OPTS_WITH_ARG, "F", "i", "I", "1", "q"]);
function isQuote(ch) {
  return ch === '"' || ch === "'" || ch === "`";
}
function skipSpaces(text, i) {
  while (i < text.length && isTfSpace(text[i])) i += 1;
  return i;
}
function skipWord(text, i) {
  while (i < text.length && !isTfSpace(text[i])) i += 1;
  return i;
}
function skipQuoted(text, i) {
  const quote = text[i];
  i += 1;
  while (i < text.length && text[i] !== quote) {
    if (text[i] === "\\" && (text[i + 1] === quote || text[i + 1] === "\\")) i += 1;
    i += 1;
  }
  return i < text.length ? i + 1 : i;
}
function defOptionsEnd(text, i) {
  return skipDefOptions(text, i).end;
}
function defHasInvalidOption(text, i) {
  return skipDefOptions(text, i).invalid === true;
}
function skipDefOptions(text, i) {
  const result = { end: i };
  while (true) {
    i = skipSpaces(text, i);
    if (text[i] !== "-") break;
    i += 1;
    if (text[i] === "-") {
      i += 1;
      if (i < text.length && !isTfSpace(text[i])) result.invalid = true;
    }
    if (i >= text.length || isTfSpace(text[i])) {
      result.end = skipSpaces(text, i);
      return result;
    }
    while (i < text.length && !isTfSpace(text[i]) && text[i] !== "=") {
      const opt = text[i];
      i += 1;
      if (opt === "i") result.invisible = true;
      if (!DEF_OPTS.has(opt)) result.invalid = true;
      if (!DEF_OPTS_WITH_ARG.has(opt)) continue;
      const argStart = i;
      i = isQuote(text[i]) ? skipQuoted(text, i) : skipWord(text, i);
      const raw = text.slice(argStart, i);
      const value = isQuote(raw[0]) && raw.length >= 2 && raw.endsWith(raw[0]) ? raw.slice(1, -1) : raw;
      if (opt === "t") result.trigger = value;
      else if (opt === "h") result.hook = value;
      else if (opt === "b" || opt === "B") result.key = value;
    }
    result.end = i;
  }
  result.end = i;
  return result;
}
function trimSpan(text, start, end) {
  while (start < end && isTfSpace(text[start])) start += 1;
  while (end > start && isTfSpace(text[end - 1])) end -= 1;
  return end > start ? { start, end } : void 0;
}
function spanBeforeEquals(text, from) {
  const eq = text.indexOf("=", from);
  return trimSpan(text, from, eq === -1 ? text.length : eq);
}
function findDefinition(text) {
  const m = DEFINING_COMMAND_RE.exec(text);
  if (!m) return void 0;
  const command2 = m[1].toLowerCase();
  const commandStart = m[0].length - command2.length - 1;
  let i = m[0].length;
  switch (command2) {
    case "def": {
      const opts = skipDefOptions(text, i);
      const span = spanBeforeEquals(text, opts.end);
      const detail = text.slice(commandStart, opts.end).trim().replace(/\s+/g, " ");
      if (span) return { kind: "def", detail, name: text.slice(span.start, span.end), span };
      if (opts.trigger !== void 0) return { kind: "trig", detail: `${detail} (anonymous trigger)`, name: opts.trigger };
      if (opts.hook !== void 0) return { kind: "hook", detail: `${detail} (anonymous hook)`, name: opts.hook };
      if (opts.key !== void 0) return { kind: "bind", detail: `${detail} (anonymous binding)`, name: opts.key };
      return void 0;
    }
    case "alias": {
      const nameStart = skipSpaces(text, i);
      const nameEnd = skipWord(text, nameStart);
      if (nameEnd === nameStart) return void 0;
      if (skipWord(text, skipSpaces(text, nameEnd)) === skipSpaces(text, nameEnd)) return void 0;
      return { kind: "alias", detail: "/alias", name: text.slice(nameStart, nameEnd), span: { start: nameStart, end: nameEnd } };
    }
    case "hook": {
      const rest = text.slice(i).trim().toLowerCase();
      if (rest === "" || rest === "on" || rest === "off") return void 0;
      const span = spanBeforeEquals(text, i);
      return span && { kind: "hook", detail: "/hook", name: text.slice(span.start, span.end), span };
    }
    case "bind": {
      const span = spanBeforeEquals(text, i);
      return span && { kind: "bind", detail: "/bind", name: text.slice(span.start, span.end), span };
    }
    default: {
      const leadingNumbers = command2 === "trigpc" ? 2 : command2 === "trig" ? 0 : 1;
      for (let n = 0; n < leadingNumbers; n += 1) i = skipWord(text, skipSpaces(text, i));
      const span = spanBeforeEquals(text, i);
      return span && { kind: "trig", detail: `/${command2}`, name: text.slice(span.start, span.end), span };
    }
  }
}
function definedMacro(entry) {
  const found = findDefinition(entry.text);
  return found?.kind === "def" && found.span ? found.name : void 0;
}
function spanToRange(entry, span) {
  const start = entry.offsetMap[span.start];
  const last = entry.offsetMap[span.end - 1];
  if (!start || !last) return void 0;
  return { start, end: { line: last.line, character: last.character + 1 } };
}
function getDocumentSymbols(text) {
  const lines = splitRawLines(text);
  const symbols = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    const found = findDefinition(entry.text);
    if (!found) continue;
    const range = {
      start: { line: entry.startLine, character: 0 },
      end: { line: entry.endLine, character: (lines[entry.endLine] ?? "").length }
    };
    const commandRange = spanToRange(entry, { start: 0, end: Math.min(entry.text.length, 1) }) ?? range;
    const selectionRange = (found.span && spanToRange(entry, found.span)) ?? commandRange;
    symbols.push({ name: found.name, kind: found.kind, detail: found.detail, range, selectionRange });
  }
  return symbols;
}

// packages/core/src/structure.ts
function shiftIssue(issue, by) {
  return {
    ...issue,
    start: issue.start + by,
    end: issue.end + by,
    ...issue.related ? { related: issue.related.map((n) => ({ ...n, start: n.start + by, end: n.end + by })) } : {},
    ...issue.fix ? { fix: { ...issue.fix, edits: issue.fix.edits.map((e) => ({ ...e, start: e.start + by, end: e.end + by })) } } : {},
    ...issue.alternative ? { alternative: { ...issue.alternative, edits: issue.alternative.edits.map((e) => ({ ...e, start: e.start + by, end: e.end + by })) } } : {}
  };
}
var levelOf = (subs) => subs >= FULL ? "full" : subs >= NEWLINE ? "newline" : "keyword";
var KEYWORDS = /* @__PURE__ */ new Set([
  "break",
  "do",
  "done",
  "else",
  "elseif",
  "endif",
  "exit",
  "if",
  "let",
  "result",
  "return",
  "set",
  "setenv",
  "test",
  "then",
  "while"
]);
var INNER_KEYWORDS = /* @__PURE__ */ new Set(["then", "else", "elseif", "endif", "do", "done"]);
var KEYWORD = 1;
var NEWLINE = 2;
var FULL = 3;
var Stop = class extends Error {
};
var TooDeep = class extends Stop {
};
var MAX_DEPTH = 400;
var TAKES_COMMANDS = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias|repeat|at|quote|eval|for|not)$/;
var LET_ASSIGNMENT_RE = /^\/[@!]*(let|set|setenv)\b\s+([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)(\s*=\s*|\s+)/i;
function assignmentIn(text) {
  const m = LET_ASSIGNMENT_RE.exec(text);
  return m ? { command: m[1].toLowerCase(), valueStart: m[0].length } : void 0;
}
function swallower(s, stmt, end, command2) {
  const assignment = assignmentIn(s.slice(stmt, end));
  if (assignment) return `the /${assignment.command} value`;
  if (!command2) return "the text before it";
  return ["test", "return", "result"].includes(command2) ? `the /${command2} expression` : `the /${command2} command`;
}
function takesTheRest(command2, word, what) {
  if (what.endsWith(" value")) {
    const set = what.slice("the ".length, -" value".length);
    return `${code(set)} takes the rest of the statement, up to the next ${code("%;")}, as its value, so ${code(`/${word}`)} ends up in the value.`;
  }
  if (what.endsWith(" expression")) {
    return `${code(`/${command2}`)} reads its expression up to the next ${code("%;")}, so ${code(`/${word}`)} becomes part of the expression.`;
  }
  return command2 ? `There is no ${code("%;")} before ${code(`/${word}`)}, so ${code(`/${command2}`)} takes it, and everything after it up to the next ${code("%;")}, as its own text.` : `There is no ${code("%;")} before ${code(`/${word}`)}, so it is read as part of the text before it.`;
}
function isNameChar(ch) {
  return ch !== void 0 && (/[A-Za-z0-9_]/.test(ch) || ch.charCodeAt(0) >= 128);
}
var COMMAND_RE = /^\/([@!]*)([^\s%)]*)/;
function commandParts(s, start) {
  if (s[start] !== "/") return { prefix: "", word: "" };
  const m = COMMAND_RE.exec(s.slice(start));
  return { prefix: m?.[1] ?? "", word: (m?.[2] ?? "").toLowerCase() };
}
var GLUABLE_KEYWORDS = /* @__PURE__ */ new Set(["if", "elseif", "while", "then", "else", "endif", "do", "done", "break"]);
var GLUE_RE = /[(/;,:"'`[{$!?*+=<>|&^~#@]/;
function gluedKeywordAt(s, start) {
  if (s[start] !== "/") return void 0;
  let p = start + 1;
  if (s[p] === "@") p += 1;
  let q = p;
  while (q < s.length && /[A-Za-z]/.test(s[q])) q += 1;
  const word = s.slice(p, q).toLowerCase();
  if (!GLUABLE_KEYWORDS.has(word) || !GLUE_RE.test(s[q] ?? "")) return void 0;
  let e = q;
  while (e < s.length && !isTfSpace(s[e]) && s[e] !== "%") e += 1;
  return { word, nameEnd: q, tokenEnd: e };
}
function afterParens(s, open) {
  let depth = 0;
  for (let p = open; p < s.length; p += 1) {
    const ch = s[p];
    if (ch === '"' || ch === "'" || ch === "`") {
      p += 1;
      while (p < s.length && s[p] !== ch) p += s[p] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) {
      let q = p + 1;
      while (isTfSpace(s[q])) q += 1;
      return q;
    }
  }
  return s.length;
}
function commandWord(s, start) {
  return commandParts(s, start).word;
}
function isDigit(ch) {
  return ch !== void 0 && ch >= "0" && ch <= "9";
}
function code(text) {
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
}
function charName(ch) {
  if (ch === " ") return "space";
  if (ch === "	") return "tab";
  if (ch === "\r") return "carriage return";
  return ch < " " ? `control character U+${ch.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}` : `'${ch}'`;
}
var CONTINUATION_EXPLANATION = `In a file, every command ends at the end of its line, unless the line ends in ${code("\\")}: then tf joins the next line on. So a block has to be complete within one command: on one line with ${code("%;")} between its statements, or on lines that each end in ${code("\\")} but the last. (On a top-level line that starts with ${code("/if")} or ${code("/while")}, ${code("%;")} separates statements, but ${code("%")} substitutions such as ${code("%{x}")} aren't done in its commands; a variable in its condition still works. Put the block in a ${code("/def")} to substitute in the commands too.)`;
function continuation(word, missing, conditionList) {
  return {
    message: conditionList ? `This /${word}'s command ends before the /${missing} of its condition list: end each line but the last with \\.` : `This /${word}'s command ends without ${missing === "endif" ? "an" : "a"} /${missing}: add %; /${missing}, or end each line but the last with \\.`,
    label: `no /${missing} in this command`,
    explanation: CONTINUATION_EXPLANATION
  };
}
function describeBlock(block) {
  switch (block) {
    case "then":
      return "in an /if body";
    case "do":
      return "in a /while body";
    case "if":
    case "elseif":
      return "in an /if condition, before its /then";
    case "while":
      return "in a /while condition, before its /do";
    case "else":
      return "after /else";
    default:
      return "outside any /if or /while";
  }
}
var Parser = class _Parser {
  constructor(s, mode) {
    this.s = s;
    this.mode = mode;
  }
  s;
  mode;
  i = 0;
  block = "";
  cmdsub = 0;
  /** Where each `$(` the parser is inside starts, outermost first, and whether it is an expression operand. */
  cmdsubStarts = [];
  depth = 0;
  open = [];
  mids = [];
  /**
   * Every keyword glued to what follows it, the keyword glued on after its `/` if any (`/break/done`),
   * and its issue, to note the problems it leads to on.
   */
  glued = [];
  /** Every keyword glued to punctuation, which may be a macro's name (`/endif;`, `/done:x`). */
  gluedPunct = [];
  /** Where the last `(condition)` ended (after its blanks), and the keyword it belongs to. */
  conditionEnd;
  issues = [];
  /** Every plain command statement read, in order (not `/test`, `/return` or `/result`). */
  statements = [];
  /** Every expression read, in the order each one ended. */
  expressions = [];
  /** The inside of every `$(...)` read, which runs in a variable scope of its own. */
  cmdsubs = [];
  /** Every substitution, condition, parenthesis and string read, in the order each one ended. */
  spans = [];
  /** Every block that closed, in the order each one closed. */
  blocks = [];
  /** Where the last /endif or /done read ends. */
  closeEnd = 0;
  /** Compiling stopped at an error, so tf runs none of this text. */
  stopped = false;
  /** /ifs and /endifs swallowed by a /let or /set value (for keyword-mid-statement). */
  swallowed = [];
  /** For each "keyword-warning" issue, its keyword and what took it, should it turn out to be the error (parseSettled()). */
  warned = /* @__PURE__ */ new Map();
  /** Every statement and block, in the order each one ended, with the list it is in. */
  units = [];
  lists = [];
  /** Every `%;`, `%|` or `%\` that ended a statement, with the list that statement is in (an index into `lists`). */
  separators = [];
  /**
   * Where each part of a block's body starts outside any `$(...)`: after `/if (...)`, `/elseif
   * (...)`, `/while (...)`, `/then`, `/do` or `/else`, and the blanks after it.
   */
  partStarts = [];
  listId = -1;
  /** The keyword or condition the next statement follows, for an empty statement's message. */
  emptyAfter;
  /** The separator that ended the last statement, and where: an empty statement after `%|` is an error, not a send. */
  lastSep;
  /** The block each open `$(...)` was in: tf's `block` is one global, which a `$(...)` doesn't reset. */
  cmdsubBlocks = [];
  run() {
    try {
      if (this.mode === "body") this.list(FULL);
      else if (this.mode === "newline") this.list(NEWLINE);
      else this.list(KEYWORD);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      if (!(e instanceof TooDeep)) this.stopped = true;
    }
  }
  /** `is_end_of_statement()`: `%` then `;`, `|` or `\` (`IS_STATEND` in util.c; `%\` proven to separate). */
  isStatEnd(p) {
    const next = this.s[p + 1];
    return this.s[p] === "%" && (next === ";" || next === "|" || next === "\\");
  }
  isCmdsubEnd(p) {
    return this.cmdsub > 0 && this.s[p] === ")";
  }
  skipSpace() {
    while (isTfSpace(this.s[this.i])) this.i += 1;
  }
  /** The keyword starting at `p` (just after its `/`), as `keyword_parse()` reads it. */
  keywordAt(p) {
    const start = this.s[p] === "@" ? p + 1 : p;
    let end = start;
    while (end < this.s.length && !isTfSpace(this.s[end]) && this.s[end] !== "%" && this.s[end] !== ")") end += 1;
    const word = this.s.slice(start, end).toLowerCase();
    if (!KEYWORDS.has(word)) return void 0;
    let next = end;
    while (isTfSpace(this.s[next])) next += 1;
    return { word, end, next };
  }
  fail(kind, start, end, detail) {
    const d = typeof detail === "string" ? { message: detail } : detail;
    this.issues.push({ kind, start, end: Math.max(end, start + 1), ...d });
    throw new Stop();
  }
  /** `p` pulled back over the blanks before it, but not over a blank escaped with `\`. */
  pullBack(p) {
    let q = p;
    while (q > 0 && isTfSpace(this.s[q - 1]) && this.s[q - 2] !== "\\") q -= 1;
    return q;
  }
  /** Where to insert a `%;` so it ends the statement before `p`: after its last non-blank. */
  separatorBefore(p) {
    const q = this.pullBack(p);
    if (q === p || this.s[q - 1] === "%" || this.s[q - 1] === "\\") return { start: p, end: p, newText: "%; " };
    return { start: q, end: q, newText: "%;" };
  }
  /** Insert `text` at `p`, pulled back over the blanks before it (the end of a statement). */
  insertAtEnd(p, text) {
    const q = this.pullBack(p);
    return { start: q, end: q, newText: text };
  }
  /** Add the statement `/word` at `p`, the end of the body: after a `%;` if one isn't there already. */
  appendStatement(p, word) {
    const q = this.pullBack(p);
    if (this.s[q - 1] === ";" && this.s[q - 2] === "%" && this.s[q - 3] !== "%") return { start: q, end: q, newText: ` /${word}` };
    const pad = this.s[q - 1] === "%" || this.s[q - 1] === "\\" ? " " : "";
    return { start: q, end: q, newText: `${pad}%; /${word}` };
  }
  /** The innermost open /if or /while, as a related note. */
  openNote() {
    const open = this.open[this.open.length - 1];
    return open ? [{ start: open.start, end: open.end, message: `this /${open.keyword}` }] : [];
  }
  /**
   * A block error. When `fix`, the keyword that would have fixed it, sits in the middle of a
   * statement since the innermost block opened, point at that instead: the likely fix is a `%;`
   * before it. Keywords inside a block that has since closed, or inside a `$(...)`, don't count.
   */
  blockError(start, end, problem, fix, kind = "block", searchTo = start) {
    const since = this.open.length > 0 ? this.open[this.open.length - 1].start : -1;
    if (fix && this.gluedBefore(fix, searchTo, since, { start, end, message: `this /${this.open[this.open.length - 1]?.keyword ?? fix}, left open` })) throw new Stop();
    const closerFrom = fix === "endif" ? Math.max(since, this.open[this.open.length - 1]?.branch ?? -1) : since;
    const fixer = fix ? this.mids.find((m) => m.word === fix && m.start > closerFrom && m.start < searchTo) : void 0;
    const mid = fixer && this.mids.find((m) => m.stmt === fixer.stmt && m.start > since);
    if (fixer && mid) this.fail("keyword", mid.start, mid.end, this.midKeyword(mid, fixer, since));
    this.fail(kind, start, end, problem);
  }
  /**
   * A `%;` before each swallowed keyword, and after a swallowed `/endif` or `/done` that has more
   * text after it (which would otherwise be "text after /endif").
   */
  separateSwallowed(swallowed) {
    const at2 = /* @__PURE__ */ new Set();
    for (const m of swallowed) {
      at2.add(m.start);
      if (m.word !== "endif" && m.word !== "done") continue;
      let k = m.end;
      while (isTfSpace(this.s[k])) k += 1;
      if (k < this.s.length && !this.isStatEnd(k) && !this.isCmdsubEnd(k)) at2.add(k);
    }
    return [...at2].sort((a, b) => a - b).map((p) => this.separatorBefore(p));
  }
  /**
   * Whether a keyword among `swallowed` (all of one statement) is the first word of an assignment's
   * value: a %; before it would leave `/set name` (`/set v /else ...`, rev-s4c c48, c93), which
   * shows the variable instead of setting it.
   */
  startsValue(swallowed) {
    const first = swallowed[0];
    if (!first) return false;
    const assignment = assignmentIn(this.s.slice(first.stmt, first.start));
    return !!assignment && swallowed.some((m) => m.start === m.stmt + assignment.valueStart);
  }
  /**
   * A statement in a condition list that isn't a command (`/if x == 1%; /then`): tf sends it to
   * the world when the condition is tested, and warns "statement starting with 'x' in /IF condition
   * sends text to server" (list() in expand.c). Compiling carries on. No fix: what was meant may
   * be an expression, but the text may not be one.
   */
  conditionText(start) {
    const keyword = this.block === "while" ? "while" : this.block === "elseif" ? "elseif" : "if";
    const then = keyword === "while" ? "do" : "then";
    let end = start + 1;
    while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end) && !this.isCmdsubEnd(end)) end += 1;
    this.issues.push({
      kind: "condition-text",
      start,
      end,
      message: `This text in the /${keyword}'s condition list isn't a command, so tf sends it to the world: write the condition in parentheses, as in /${keyword} (x == 1).`,
      label: "sent to the world",
      explanation: `After ${code(`/${keyword}`)}, commands up to ${code(`/${then}`)} are its condition, and the result of the last one decides it. A statement that doesn't start with ${code("/")} isn't a command: it is text, and tf sends text to the world each time the condition is tested. To test an expression, put it in parentheses, ${code(`/${keyword} (x == 1) ...`)}, or test it with ${code("/test")}: ${code(`/${keyword} /test x == 1%; /${then} ...`)}`
    });
  }
  /**
   * Whether a keyword `word` glued to what follows it sits between `after` and `before`: if so,
   * `note` (the problem it leads to) is added to its issue, and that is the one reported.
   */
  gluedBefore(word, before, after, note) {
    for (let k = this.glued.length - 1; k >= 0; k -= 1) {
      const g = this.glued[k];
      if (g.start >= before || g.start <= after || g.word !== word && g.next !== word) continue;
      (g.issue.related ??= []).push(note);
      return true;
    }
    return false;
  }
  /**
   * A statement at `start` whose command is a block keyword glued to what follows it (`/if(1)`,
   * `/else/echo b`): keyword_parse() reads the word up to a blank, `%` or `)`, so tf takes the
   * whole of it as a command name, and finds none.
   */
  gluedKeyword(start) {
    const glued = gluedKeywordAt(this.s, start);
    if (!glued) return;
    const { word, nameEnd, tokenEnd } = glued;
    const written = this.s.slice(start, tokenEnd);
    const named = this.s[start + 1] === "@" ? `the builtin command ${written.slice(2)}` : `a command named ${written.slice(1)}`;
    const next = this.s[nameEnd];
    const ends = (word === "endif" || word === "done" || word === "break") && next === "/";
    const noCondition = next === "(" && (word === "else" || word === "then" || word === "do");
    const punct = next !== "(" && next !== "/";
    const betweenParenAndSeparator = () => {
      if (next !== "(") return "";
      const after = afterParens(this.s, nameEnd);
      if (!this.isStatEnd(after)) return "";
      let close = after;
      while (close > nameEnd && isTfSpace(this.s[close - 1])) close -= 1;
      return `, and a command between the ${this.s.slice(nameEnd, close)} and the ${this.s.slice(after, after + 2)}`;
    };
    const advice = noCondition ? word === "else" ? `did you mean /elseif ${written.slice(nameEnd - start)}?` : `/${word} takes no (condition).` : !punct ? `put ${ends ? "%;" : "a space"} after /${word}${betweenParenAndSeparator()}.` : `unless a macro named ${written.slice(1)} is defined elsewhere, take the ${next} away or put a blank before it.`;
    const issue = {
      kind: punct ? "glued-punct" : "glued",
      start,
      end: tokenEnd,
      message: `tf reads ${written} as ${named}, not as /${word}: ${advice}`,
      label: `not /${word}`,
      explanation: `tf reads a keyword up to the next blank, ${code("%")} or ${code(")")}, so ${code(written)} isn't ${code(`/${word}`)}: tf runs it as ${named}${punct ? ", which is only there if some file defines it" : ", and there is none"}. ` + (noCondition ? `${code(`/${word}`)} takes no ${code("(condition)")}${word === "else" ? `: a branch with one is ${code("/elseif (...)")}` : ""}.` : ends ? `${code(`/${word}`)} ends its statement, so the command after it needs a ${code("%;")} before it.` : `A blank after ${code(`/${word}`)} makes it the keyword.`)
    };
    if (!noCondition && (next === "/" || next === "(" && !this.isStatEnd(afterParens(this.s, nameEnd)))) {
      issue.fix = ends ? { title: `Put %; after /${word}`, edits: [{ start: nameEnd, end: nameEnd, newText: "%; " }] } : { title: `Put a space after /${word}`, edits: [{ start: nameEnd, end: nameEnd, newText: " " }] };
    }
    this.issues.push(issue);
    if (punct) this.gluedPunct.push({ word, start });
    else {
      const next2 = this.s[nameEnd] === "/" ? (/^@?([A-Za-z]+)/.exec(this.s.slice(nameEnd + 1))?.[1] ?? "").toLowerCase() : "";
      this.glued.push({ word, next: next2, start, issue });
    }
  }
  /** A keyword swallowed by the statement it sits in, which leaves its block unfinished. */
  midKeyword(mid, fixer, since) {
    const what = swallower(this.s, mid.stmt, mid.start, mid.command);
    const consequence = {
      endif: "the /if is never closed",
      done: "the /while is never closed",
      then: "the /if never reaches its /then",
      do: "the /while never reaches its /do"
    };
    const swallowed = this.mids.filter((m) => m.stmt === mid.stmt && m.start > since);
    const words2 = swallowed.map((m) => `/${m.word}`);
    const list = words2.length > 1 ? `${words2.slice(0, -1).join(", ")} and ${words2[words2.length - 1]}` : `${words2[0]}`;
    const reads = takesTheRest(mid.command, mid.word, what);
    return {
      message: `/${mid.word} here is not a keyword: it is part of ${what}, so ${consequence[fixer.word] ?? "its block is never finished"}.`,
      label: `part of ${what}`,
      explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${reads} Put ${code("%;")} before each keyword that should start a statement.`,
      related: [
        ...this.openNote(),
        ...fixer !== mid ? [{ start: fixer.start, end: fixer.end, message: `/${fixer.word} is text too` }] : []
      ],
      // Not where the keyword starts a `name value` value, which would leave `/set name`, a query.
      // Text that the %; makes a statement of its own is offered all the same: it is sent to the
      // world, as text in a body is (policy, 2026-10-15).
      ...this.startsValue(swallowed) ? {} : { fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(swallowed) } }
    };
  }
  /**
   * `fn()` one level deeper. Blocks, `$(...)`, `$[...]` and substitution defaults nest by recursion,
   * so a pathological nesting (thousands of `/if`s) would overflow the stack; past MAX_DEPTH the
   * check stops there, and says so. It doesn't count as tf stopping (`stopped`): tf runs the text,
   * so the statements read so far are kept.
   */
  deeper(fn) {
    if (this.depth >= MAX_DEPTH) {
      this.issues.push({
        kind: "too-deep",
        start: this.i,
        end: this.i + 1,
        message: `This command nests more than ${MAX_DEPTH} levels deep, so the rest of it isn't checked.`,
        label: `${MAX_DEPTH} levels deep`,
        explanation: `Blocks (${code("/if")}, ${code("/while")}) and substitutions (${code("$(...)")}, ${code("$[...]")}, ${code("%{...}")} defaults) nested this deep are past what this check follows. That says nothing about tf: the rest of the command may well be fine, it just isn't checked.`
      });
      throw new TooDeep();
    }
    this.depth += 1;
    try {
      return fn();
    } finally {
      this.depth -= 1;
    }
  }
  list(subsIn) {
    const outer = this.listId;
    try {
      this.deeper(() => this.listAt(subsIn));
    } finally {
      this.listId = outer;
    }
  }
  /** The statements from here on run in a list of their own. */
  newList(kind) {
    this.lists.push({ kind: this.cmdsub > 0 ? "cmdsub" : kind });
    this.listId = this.lists.length - 1;
  }
  /** The statement or block that started at `start` ends here. */
  unit(start, word, block = false) {
    this.units.push({ start, end: this.i, list: this.listId, word, block });
  }
  listAt(subsIn) {
    let subs = subsIn;
    this.newList(this.block === "if" || this.block === "elseif" || this.block === "while" ? "condition" : "body");
    let first = true;
    let unreachable = false;
    do {
      if (subs >= NEWLINE) {
        while (isTfSpace(this.s[this.i]) || this.s[this.i] === "\\" && isTfSpace(this.s[this.i + 1])) this.i += 1;
        if (!unreachable) this.emptyStatement(first);
      }
      first = false;
      this.emptyAfter = void 0;
      this.lastSep = void 0;
      const stmtStart = this.i;
      let special = "";
      if (this.s[this.i] === "/" && this.s[this.i + 1] !== "/") {
        const kw = this.keywordAt(this.i + 1);
        const kwEnd = kw ? kw.end : this.i + 1;
        const word = kw?.word ?? "";
        const label = `/${this.s.slice(stmtStart + 1, kwEnd)}`;
        if (kw) this.i = kw.next;
        switch (word) {
          case "if":
          case "while": {
            this.openBlock(word, stmtStart, kwEnd, subs === KEYWORD ? NEWLINE : subs);
            this.unit(stmtStart, word, true);
            if (subs === KEYWORD) subs = NEWLINE;
            special = word;
            break;
          }
          case "then":
            if (this.block !== "if" && this.block !== "elseif") this.unexpected(word, stmtStart, kwEnd);
            this.block = "then";
            this.bodyStarts();
            this.newList("body");
            this.emptyAfter = { label, warns: false };
            unreachable = false;
            continue;
          case "do":
            if (this.block !== "while") this.unexpected(word, stmtStart, kwEnd);
            this.block = "do";
            this.bodyStarts();
            this.newList("body");
            this.emptyAfter = { label, warns: false };
            unreachable = false;
            continue;
          case "else":
          case "elseif":
            if (this.block !== "then") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.block = word;
            this.newList(word === "else" ? "body" : "condition");
            this.open[this.open.length - 1].branch = stmtStart;
            unreachable = false;
            if (word === "else") {
              this.bodyStarts();
              this.emptyAfter = { label, warns: true };
            }
            continue;
          case "endif":
            if (this.block !== "then" && this.block !== "else") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.closeEnd = kwEnd;
            this.block = "endif";
            return;
          case "done":
            if (this.block !== "do") this.unexpected(word, stmtStart, kwEnd);
            this.endPart(stmtStart);
            this.closeEnd = kwEnd;
            this.block = "done";
            return;
          case "break":
            this.breakStatement(stmtStart, kwEnd);
            unreachable = true;
            if (this.isCmdsubEnd(this.i)) return;
            continue;
          case "test":
          case "return":
          case "result":
            this.expressionStatement(subs, word);
            this.unit(stmtStart, word);
            if (word !== "test") unreachable = true;
            break;
          default:
            this.i = stmtStart;
            if (!kw) this.gluedKeyword(stmtStart);
            this.statement(subs);
            this.unit(stmtStart, commandWord(this.s, stmtStart));
        }
      } else if (this.block === "if" || this.block === "elseif" || this.block === "while") {
        if (this.s[this.i] === "(") {
          const keyword = this.block === "while" ? "/while" : `/${this.block}`;
          this.condition(keyword);
          this.skipSpace();
          this.conditionEnd = { at: this.i, keyword };
          this.block = this.block === "while" ? "do" : "then";
          this.bodyStarts();
          this.newList("body");
          this.emptyAfter = { label: `${keyword} (...)`, warns: true };
          continue;
        }
        if (this.i < this.s.length && !this.isStatEnd(this.i) && !this.isCmdsubEnd(this.i)) this.conditionText(stmtStart);
        this.statement(subs);
        this.unit(stmtStart, commandWord(this.s, stmtStart));
      } else {
        this.statement(subs);
        this.unit(stmtStart, commandWord(this.s, stmtStart));
      }
      if (this.isCmdsubEnd(this.i)) return;
      if (this.isStatEnd(this.i)) {
        const sep2 = { at: this.i, char: this.s[this.i + 1] };
        this.separators.push({ ...sep2, list: this.listId });
        this.i += 2;
        this.skipSpace();
        this.lastSep = sep2;
      } else if (this.i < this.s.length) {
        const after = special === "if" ? "/endif" : special === "while" ? "/done" : "";
        let end = this.i + 1;
        while (end < this.s.length && !isTfSpace(this.s[end]) && !this.isStatEnd(end)) end += 1;
        this.fail("block", this.i, end, {
          message: after ? `Text after ${after} needs a %; before it.` : "This text needs a %; before it.",
          label: "needs a %; before it",
          explanation: after ? `${code(after)} ends its statement, so the next command has to start a new one, after a ${code("%;")}.` : `The statement before it has ended, so this has to start a new one, after a ${code("%;")}.`,
          // Before text too, which then is a statement sent to the world, as text in a body is
          // (rev-s4b g08 `/endif)`, g14 `/endif "x"`; policy, 2026-10-15).
          fix: { title: "Put %; before it", edits: [this.separatorBefore(this.i)] }
        });
      }
    } while (this.i < this.s.length);
  }
  /** The innermost open block's current body part starts here. */
  bodyStarts() {
    const open = this.open[this.open.length - 1];
    if (open) open.body = this.i;
    if (this.cmdsub === 0) this.partStarts.push(this.i);
  }
  /** The innermost open block's current body part ends at `at` (where its next keyword starts). */
  endPart(at2) {
    const open = this.open[this.open.length - 1];
    if (open?.body !== void 0) open.parts.push({ start: open.body, end: at2 });
  }
  openBlock(keyword, start, end, subs) {
    const outer = this.block;
    this.block = keyword;
    const opened = { keyword, start, end, cmdsub: this.cmdsub, parts: [] };
    this.open.push(opened);
    this.list(subs);
    const ended = this.block;
    if (ended === "endif" || ended === "done") this.blocks.push({ start, end: this.closeEnd, parts: opened.parts });
    const to = this.i + 1;
    if (ended === "endif" || ended === "done") this.takenAsText(start);
    const where = this.cmdsub > 0 ? "before the )" : this.mode === "top" ? "at the end of the line" : "at the end of the body";
    const body = this.open[this.open.length - 1].body;
    const empty = body !== void 0 && this.s.slice(body, this.i).trim() === "";
    const gluedCloser = (word) => this.gluedPunct.some((g) => g.word === word && g.start > start) || this.glued.some((g) => g.start > start && g.next === word);
    const cutBackslash = (word) => {
      let k = this.i;
      while (k > 0 && /[ \t\r\f\v]/.test(this.s[k - 1])) k -= 1;
      if (k === this.i || this.s[k - 1] !== "\\") return false;
      let m = k - 1;
      while (m > 0 && /[A-Za-z]/.test(this.s[m - 1])) m -= 1;
      const slash = this.s[m - 1] === "/" || this.s[m - 1] === "@" && this.s[m - 2] === "/";
      return slash && this.s.slice(m, k - 1).toLowerCase() === word;
    };
    const closer = (word) => empty || gluedCloser(word) || cutBackslash(word) ? void 0 : { title: `Add %; /${word} ${where}`, edits: [this.appendStatement(this.i, word)] };
    const conditionList = (word, then) => ({
      message: `This /${word}'s condition list has no /${then}.`,
      label: `no /${then}`,
      explanation: `When ${code(`/${word}`)} is followed by commands instead of a ${code("(condition)")}, they are its condition, up to a ${code(`/${then}`)} at the start of a statement: ${code(`/${word} /test x%; /${then} ...`)}`
    });
    const top = this.mode === "top" && this.cmdsub === 0 && this.i >= this.s.length;
    if (keyword === "if") {
      if (ended === "if" || ended === "elseif") {
        if (top) this.blockError(start, end, continuation("if", "then", true), "then", "continuation", to);
        else this.blockError(start, end, conditionList("if", "then"), "then", "block", to);
      } else if (ended === "then" || ended === "else") {
        this.blockError(
          start,
          end,
          top ? { ...continuation("if", "endif", false), fix: closer("endif") } : {
            message: "This /if has no /endif.",
            label: "never closed",
            explanation: `An ${code("/if")} needs an ${code("/endif")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
            fix: closer("endif")
          },
          "endif",
          top ? "continuation" : "block",
          to
        );
      }
    } else if (ended === "while") {
      if (top) this.blockError(start, end, continuation("while", "do", true), "do", "continuation", to);
      else this.blockError(start, end, conditionList("while", "do"), "do", "block", to);
    } else if (ended === "do") {
      this.blockError(
        start,
        end,
        top ? { ...continuation("while", "done", false), fix: closer("done") } : {
          message: "This /while has no /done.",
          label: "never closed",
          explanation: `A ${code("/while")} needs a ${code("/done")} later in the same macro body, at the start of a statement (after a ${code("%;")}).`,
          fix: closer("done")
        },
        "done",
        top ? "continuation" : "block",
        to
      );
    }
    this.open.pop();
    this.dropMids(start);
    this.block = outer;
  }
  /** Forget mid-statement keywords after `from`: they sit in a block or `$(...)` that has closed. */
  dropMids(from) {
    while (this.mids.length > 0 && this.mids[this.mids.length - 1].start > from) this.mids.pop();
  }
  unexpected(word, start, end) {
    const outer = this.block;
    const opener = word === "do" || word === "done" ? "while" : "if";
    const verb = word === "endif" || word === "done" ? "close" : "belong to";
    if (!outer && this.gluedBefore(opener, start, -1, { start, end, message: `this /${word}, left with no /${opener} to ${verb}` })) throw new Stop();
    const where = outer ? `: it is ${describeBlock(outer)}` : "";
    const problem = {
      message: `This /${word} has no /${opener} to ${verb}${where}.`,
      label: `no /${opener} to ${verb}`,
      related: this.openNote()
    };
    let next = end;
    while (isTfSpace(this.s[next])) next += 1;
    if (this.isStatEnd(next)) {
      next += 2;
      while (isTfSpace(this.s[next])) next += 1;
    }
    const drop = { title: `Remove /${word}`, edits: [{ start, end: next, newText: "" }] };
    const afterCondition = this.conditionEnd?.at === start ? this.conditionEnd.keyword : void 0;
    if (afterCondition && (word === "then" && outer === "then" || word === "do" && outer === "do")) {
      const list = word === "then" ? "/if" : "/while";
      problem.message = `This /${word} can't follow a (condition): the condition after ${afterCondition} already ends it.`;
      problem.label = "not allowed after a (condition)";
      problem.explanation = `${code(`${afterCondition} (condition)`)} takes the next statement as its body, so this ${code(`/${word}`)} is read as the first statement of the body, where tf doesn't expect it. ${code(`/${word}`)} only follows a condition list: ${code(`${list} /test x%; /${word} ...`)}`;
      problem.fix = drop;
    } else if (word === "then" && outer === "then" || word === "do" && outer === "do") {
      problem.message = `This /${word} is inside the /${opener}'s body, where it doesn't belong: /${word} only ends a condition list.`;
      problem.label = `inside the /${opener}'s body`;
    } else if (word === "else" && outer === "else") {
      problem.message = "This is a second /else in the same /if.";
      problem.label = "second /else";
    } else if (word === "elseif" && outer === "else") {
      problem.message = "This /elseif comes after /else: /else has to be last.";
      problem.label = "after /else";
    } else if (outer === "if" || outer === "elseif" || outer === "while") {
      const [keyword, then] = outer === "while" ? ["while", "do"] : ["if", "then"];
      problem.message = `This /${word} comes before the /${then} of the condition list.`;
      problem.label = `before the /${then}`;
      problem.explanation = `A condition list runs up to ${code(`/${then}`)} at the start of a statement: ${code(`/${keyword} /test x%; /${then} ...`)}`;
    }
    if (this.mode === "top" && !outer) {
      const a = opener === "if" ? "an" : "a";
      problem.explanation = `In a file, every command ends at the end of its line, unless the line ends in ${code("\\")}. If this belongs to ${a} ${code(`/${opener}`)} on an earlier line, end every line from that ${code(`/${opener}`)} to here with ${code("\\")}.`;
    }
    const fix = outer === "if" || outer === "elseif" ? "then" : outer === "while" ? "do" : void 0;
    this.blockError(start, end, problem, fix);
  }
  /**
   * A statement that starts at a `%;` or `%\`, or at the `)` that ends a `$(...)`, is empty, and
   * `statement()` compiles it as an OP_SEND of nothing: tf sends a blank line to the world each time
   * it runs (the 2026-10-14 step-5 probes, "Not connected." for every shape). tf itself warns only
   * after `/if (...)`, `/elseif (...)` or `/while (...)` (expand.c:1426) and after `/else` (:1587),
   * and, in a condition list, about a statement that isn't a command (:1433). After a `%|` the
   * empty statement is an error instead ("Piping input to a server command"), and a `%|` that ends
   * one is too ("Piping output of a server command"), so neither is reported here. A `%;` at the
   * very end sends nothing: the loop ends there.
   */
  emptyStatement(first) {
    const p = this.i;
    const sep2 = this.isStatEnd(p) && this.s[p + 1] !== "|";
    const close = !sep2 && this.isCmdsubEnd(p);
    if (!sep2 && !close || this.lastSep?.char === "|") return;
    const isCondition = (b) => b === "if" || b === "elseif" || b === "while";
    const inCondition = isCondition(this.block);
    let tfBlock = this.block;
    for (let k = this.cmdsubBlocks.length - 1; tfBlock === "" && k >= 0; k -= 1) tfBlock = this.cmdsubBlocks[k];
    const prior = this.lastSep;
    const sepChar = sep2 ? this.s[p + 1] : void 0;
    const text = this.emptyAfter ? `after ${this.emptyAfter.label}` : prior ? `right after ${prior.char === (sepChar ?? "") ? "another" : "a"} ${this.s.slice(prior.at, prior.at + 2)}` : inCondition ? `after /${this.block}` : this.cmdsub > 0 && first ? "at the start of the $(...)" : "before the first command";
    const where = { text, warns: isCondition(tfBlock) || (this.emptyAfter?.warns ?? false) };
    const warned = where.warns ? "tf warns about and sends" : "tf sends";
    const what = sep2 ? this.s.slice(p, p + 2) : ")";
    const explanation = `A statement that is empty, like this one, still runs: tf sends it to the world as a blank line, ` + (where.warns ? "with a warning when it compiles the text. " : "and doesn't warn. ") + `A ${code("%;")} at the very end sends nothing.`;
    const pipeAt = (q) => this.s[q] === "%" && this.s[q + 1] === "|";
    let back = prior ? prior.at : 0;
    while (back > 0 && isTfSpace(this.s[back - 1])) back -= 1;
    if (prior && pipeAt(back - 2)) return;
    if (sep2) {
      let next = p + 2;
      while (isTfSpace(this.s[next])) next += 1;
      if (pipeAt(next)) return;
      this.issues.push({
        kind: "empty-statement",
        start: p,
        end: p + 2,
        message: `This ${what} ${where.text} ends an empty statement, which ${warned} to the world as a blank line: remove it.`,
        label: "ends an empty statement",
        explanation,
        // A blank in its place keeps /else from running into the next command (/else/echo is one word).
        fix: {
          title: `Remove the ${what}`,
          edits: [{ start: p, end: p + 2, newText: p + 2 >= this.s.length || isTfSpace(this.s[p + 2]) || isTfSpace(this.s[p - 1]) || p === 0 ? "" : " " }]
        }
      });
      return;
    }
    const before = prior;
    this.issues.push({
      kind: "empty-statement",
      start: p,
      end: p + 1,
      message: before ? `This $(...) ends with an empty statement after its last ${this.s.slice(before.at, before.at + 2)}, which ${warned} to the world as a blank line: remove that ${this.s.slice(before.at, before.at + 2)}.` : `This $(...) runs an empty statement, which ${warned} to the world as a blank line: put a command in it, or remove it.`,
      label: "ends an empty statement",
      explanation,
      ...before ? { fix: { title: `Remove the ${this.s.slice(before.at, before.at + 2)}`, edits: [{ start: before.at, end: before.at + 2, newText: "" }] } } : {}
    });
  }
  breakStatement(start, end) {
    if (this.i >= this.s.length || this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) {
      this.breakOutOfCmdsub(start, end, 1);
      this.unit(start, "break");
      this.breakSeparator();
      return;
    }
    const digits = this.i;
    while (isDigit(this.s[this.i])) this.i += 1;
    if (this.i === digits || Number(this.s.slice(digits, this.i)) <= 0) {
      this.fail("block", start, end, "/break takes a positive number of loops.");
    }
    this.breakOutOfCmdsub(start, this.i, Number(this.s.slice(digits, this.i)));
    this.unit(start, "break");
    this.breakSeparator();
  }
  /** The separator after a /break, read as the statement loop reads one. */
  breakSeparator() {
    if (!this.isStatEnd(this.i)) return;
    const sep2 = { at: this.i, char: this.s[this.i + 1] };
    this.separators.push({ ...sep2, list: this.listId });
    this.i += 2;
    this.skipSpace();
    this.lastSep = sep2;
  }
  /**
   * A `/break` inside a `$(...)` may only end loops opened inside that `$(...)`. Its jump is
   * resolved by the `/done` of the loop it ends, and jumping out of a `$(...)` skips the code that
   * ends the command substitution. tf dev's `list()` (expand.c, the MAC-5 fix) rejects a /break
   * whose innermost `levels` loops include one opened outside the `$(...)` ("expected a /break
   * that stays inside this $(...)") and compiles nothing; upstream tf compiles it and corrupts its
   * value stack when it runs. A /break with more levels than there are loops, all of them inside
   * the `$(...)`, still compiles in tf dev, and running it stops the macro with "expression stack
   * underflow or dirty" and "invalid frame". Both proven in tf dev, 2026-10-14.
   *
   * Where the rejected /break is in a `$(...)` that is an expression operand (`$[ $(/break) ]`, an
   * `/if` or `/while` condition), at any depth, tf dev prints the same error but still runs the
   * macro, with that `$(...)` giving nothing; elsewhere (a command, `/test` text) the macro doesn't
   * run. Proven in tf dev, 2026-10-14.
   */
  breakOutOfCmdsub(start, end, levels) {
    if (this.cmdsub === 0) return;
    const loops = this.open.filter((o) => o.keyword === "while");
    const ended = loops.slice(-levels).reverse();
    const outside = ended.find((o) => o.cmdsub < this.cmdsub);
    const rule = `A ${code("/break")} inside ${code("$(...)")} can only end ${code("/while")} loops that are inside the same ${code("$(...)")}: tf can't jump out of a command substitution part way through.`;
    if (outside) {
      const cmdsubStart = this.cmdsubStarts[outside.cmdsub].at;
      const runs = this.cmdsubStarts.some((c) => c.inExpression);
      const detail = {
        message: runs ? "This /break would jump out of the $(...) around it, so tf reports an error and leaves it out: end the loop outside the $(...)." : "This /break would jump out of the $(...) around it, so tf rejects the macro: end the loop outside the $(...).",
        label: "jumps out of the $(...)",
        explanation: `${rule} This one would end a loop opened outside it, so tf reports "expected a /break that stays inside this $(...)" when it compiles the macro. ` + (runs ? `Here the ${code("$(...)")} is inside an expression, so tf still runs the macro, with that ${code("$(...)")} giving nothing and the loop never ended by it.` : "The macro then does nothing.") + ` Move the ${code("/break")} out of the ${code("$(...)")}, into the loop's own body. (TinyFugue releases before this check compile it, and running it leaves tf's internal state broken.)`,
        related: [
          { start: cmdsubStart, end: cmdsubStart + 2, message: "the $(...) it would jump out of" },
          { start: outside.start, end: outside.end, message: "the loop it would end" }
        ]
      };
      if (!runs) this.fail("block", start, end, detail);
      this.issues.push({ kind: "block", start, end: Math.max(end, start + 1), ...detail });
      return;
    }
    if (levels > loops.length) {
      const cmdsubStart = this.cmdsubStarts[this.cmdsubStarts.length - 1].at;
      const advice = loops.length === 0 ? `To end the macro, put the ${code("/break")} outside the ${code("$(...)")}; to skip the rest of the ${code("$(...)")}'s commands, wrap them in an ${code("/if")} instead.` : `Give the ${code("/break")} no more levels than there are loops inside the ${code("$(...)")}.`;
      this.issues.push({
        kind: "block",
        start,
        end: Math.max(end, start + 1),
        message: "This /break would jump out of the $(...) around it, and tf stops the macro with an internal error when it runs: only break out of loops inside the $(...).",
        label: "jumps out of the $(...)",
        explanation: `${rule} This one has ${loops.length === 0 ? "no loop" : "more levels than there are loops"} to end inside it. tf compiles it, but running it stops the macro with "expression stack underflow or dirty" and "invalid frame". ${advice}`,
        related: [{ start: cmdsubStart, end: cmdsubStart + 2, message: "the $(...) it would jump out of" }]
      });
    }
  }
  /**
   * `/test`, `/return`, `/result`: the text is substituted at the statement's level, then compiled
   * as an expression. On a plain top-level line nothing is substituted, so it is compiled as
   * written (q04: `/test $[1+2` gives "unmatched $["); on an `/if` line only a run of `%`s changes.
   * In a macro body its substitutions (read by `statement()`) make the text, known only when it runs.
   */
  expressionStatement(subs, keyword) {
    const start = this.i;
    this.statement(subs, keyword);
    this.expressions.push({ start, end: this.i, kind: "statement", level: levelOf(subs) });
    const text = this.s.slice(start, this.i);
    if (subs >= FULL ? /[%$\\]/.test(text) : subs >= NEWLINE && text.includes("%%")) return;
    const sub = new _Parser(text, this.mode);
    try {
      sub.expression(void 0, 0, `/${keyword}`);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
    for (const issue of sub.issues) this.issues.push(shiftIssue(issue, start));
    for (const span of sub.spans) {
      this.spans.push({
        ...span,
        start: span.start + start,
        end: span.end + start,
        ...span.inner ? { inner: { start: span.inner.start + start, end: span.inner.end + start } } : {}
      });
    }
  }
  /** Statement text, as `expand()` scans it, up to a separator, the end, or a `$(...)`'s `)`. */
  statement(subs, keyword = "") {
    const start = this.i;
    this.statementText(subs, keyword);
    if (!keyword) {
      this.statements.push({ start, end: this.i, level: levelOf(subs), conditional: this.open.length > 0 });
    }
  }
  statementText(subs, keyword) {
    const s = this.s;
    const stmtStart = this.i;
    let command2 = keyword;
    if (!command2 && s[this.i] === "/" && s[this.i + 1] !== "/") {
      const m = /^\/[@!]*([^\s%]*)/.exec(s.slice(this.i));
      command2 = (m?.[1] ?? "").toLowerCase();
    }
    while (this.i < s.length) {
      const ch = s[this.i];
      if (subs >= NEWLINE && ch === "%") {
        if (this.isStatEnd(this.i)) return;
        this.i += 1;
        if (s[this.i] === "%") {
          while (s[this.i] === "%") this.i += 1;
        } else if (subs >= FULL && (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i]))) {
          this.varsub(this.i - 1);
        }
        continue;
      }
      if (subs >= FULL) {
        if (ch === "\\") {
          this.i += 2;
          continue;
        }
        if (ch === "$") {
          this.i += 1;
          this.dollarsub(this.i - 1);
          continue;
        }
        if (this.isCmdsubEnd(this.i)) return;
      }
      if (ch === "/" && this.i > stmtStart && isTfSpace(s[this.i - 1])) {
        const kw = this.keywordAt(this.i + 1);
        if (kw && INNER_KEYWORDS.has(kw.word)) {
          this.mids.push({ start: this.i, end: kw.end, word: kw.word, command: command2, stmt: stmtStart, taken: this.wouldTake(kw.word, command2) });
        }
        const assignment = kw && (kw.word === "if" || kw.word === "while") && subs >= NEWLINE ? assignmentIn(s.slice(stmtStart, this.i)) : void 0;
        if (kw && assignment && stmtStart + assignment.valueStart < this.i) {
          const mid = { start: this.i, end: kw.end, word: kw.word, command: command2, stmt: stmtStart, taken: false };
          this.swallowed.push({ start: this.i, end: kw.end, word: kw.word, stmt: stmtStart, command: command2, edits: this.separateSwallowed([mid]) });
        }
      }
      this.i += 1;
    }
  }
  /**
   * Whether the innermost open block would have taken `word` as its keyword, had it started a
   * statement (MidKeyword.taken). Not in a /test, /return or /result, whose strings hold text.
   */
  wouldTake(word, command2) {
    const open = this.open[this.open.length - 1];
    if (!open || open.cmdsub !== this.cmdsub || ["test", "return", "result"].includes(command2)) return false;
    if (word === "else" || word === "elseif") return this.block === "then";
    if (word === "endif") return this.block === "then" || this.block === "else";
    return word === "done" && this.block === "do";
  }
  /**
   * The block that opened at `start` closed: each /let or /set statement in it holding a keyword
   * the block would have taken ran it as text, with no error (`/if (1) /set a=1 /else /set b=2%; /endif` sets a to
   * `1 /else /set b=2`). A warning, with the fix pairSwallowed() checks.
   */
  takenAsText(start) {
    const done = /* @__PURE__ */ new Set();
    for (const m of this.mids) {
      if (m.start <= start || !m.taken || done.has(m.stmt)) continue;
      if (!assignmentIn(this.s.slice(m.stmt, m.start))) continue;
      done.add(m.stmt);
      const group = this.mids.filter((x) => x.stmt === m.stmt && x.start > start && x.taken);
      const words2 = group.map((x) => `/${x.word}`);
      const list = words2.length > 1 ? `${words2.slice(0, -1).join(", ")} and ${words2[words2.length - 1]}` : `${words2[0]}`;
      const what = swallower(this.s, m.stmt, m.start, m.command);
      const issue = {
        kind: "keyword-warning",
        start: m.start,
        end: m.end,
        message: `/${m.word} here is not a keyword: it is part of ${what}, so tf runs it as text: put %; before it if it should start a statement.`,
        label: `part of ${what}`,
        explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${takesTheRest(m.command, m.word, what)} The block still closes, so tf loads this without an error, but ${code(`/${m.word}`)} is never the block's.`,
        ...this.startsValue(group) ? {} : { fix: { title: `Put %; before ${list}`, edits: this.separateSwallowed(group) } }
      };
      this.issues.push(issue);
      this.warned.set(issue, { word: m.word, what, command: m.command });
    }
  }
  /** `%{...}` or `%name`, with `this.i` just after the `%` at `percent` (`varsub()`). */
  varsub(percent) {
    this.deeper(() => this.varsubAt(percent));
  }
  varsubAt(percent) {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
    const inner2 = this.i;
    if ((s[this.i] === "#" || s[this.i] === "?") && (!bracket || s[this.i + 1] === "}")) {
      this.i += 1;
    } else {
      let n = -1;
      let except = false;
      let ell = false;
      let pee = false;
      let star = false;
      if (isDigit(s[this.i])) {
        n = 0;
        while (isDigit(s[this.i])) n = n * 10 + Number(s[this.i++]);
      } else {
        if (s[this.i] === "-") {
          except = true;
          this.i += 1;
        }
        ell = s[this.i] === "L";
        pee = s[this.i] === "P";
        star = s[this.i] === "*";
        if (ell || pee || star) this.i += 1;
        if (!star && isDigit(s[this.i])) {
          n = 0;
          while (isDigit(s[this.i])) n = n * 10 + Number(s[this.i++]);
        }
      }
      if (n < 0 && !star || bracket && (ell || pee)) {
        if (isNameChar(s[this.i])) {
          ell = pee = false;
          n = -1;
          while (isNameChar(s[this.i])) this.i += 1;
        }
      }
      if (!star && !pee && (ell || n > 0)) except = false;
      if (except) {
        this.fail(
          "substitution",
          percent,
          this.i,
          star || pee || n === 0 ? {
            message: "A leading - only goes with a positive number or L (%-1, %-L2), not with *, P or 0.",
            label: "- not allowed here"
          } : {
            message: "%- starts a substitution, but no parameter follows it. Write %%- for a literal %-.",
            label: "not a substitution",
            explanation: `In a macro body, ${code("%-")} always starts a substitution of the parameters after one, like ${code("%-1")} (all but the first) or ${code("%-L")} (all but the last). ${code("%%")} writes a literal ${code("%")}.`,
            fix: { title: "Write %%- for a literal %-", edits: [{ start: percent, end: percent, newText: "%" }] }
          }
        );
      }
    }
    const hasDefault = s[this.i] === "-";
    if (hasDefault) {
      this.i += 1;
      while (this.i < s.length) {
        const ch = s[this.i];
        if (this.isStatEnd(this.i) || this.isCmdsubEnd(this.i)) break;
        if (bracket && ch === "}") break;
        if (!bracket && isTfSpace(ch)) break;
        if (ch === "%") {
          this.i += 1;
          if (s[this.i] === "%") while (s[this.i] === "%") this.i += 1;
          else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) this.varsub(this.i - 1);
        } else if (ch === "$") {
          this.i += 1;
          this.dollarsub(this.i - 1);
        } else if (ch === "\\") {
          this.i += 2;
        } else {
          this.i += 1;
        }
      }
    }
    if (!bracket) this.spans.push({ start: percent, end: this.i, kind: "substitution" });
    if (bracket) {
      if (s[this.i] === "}") {
        this.i += 1;
        this.spans.push({ start: percent, end: this.i, kind: "substitution", inner: { start: inner2, end: this.i - 1 } });
        return;
      }
      const ch = s[this.i];
      const opener = s[percent] === "%" ? "%{" : "{";
      const openerEnd = percent + opener.length;
      const ended = this.i >= s.length || this.isStatEnd(this.i) || ch === "\r" && this.i === s.length - 1;
      if (!ended && !hasDefault && (ch === "%" || ch === "$")) {
        const selector = s.slice(inner2, this.i);
        const other = ch === "%" ? "%{...}" : "$[...]";
        this.fail("substitution", this.i, this.i + 1, {
          message: `${opener}${selector} needs a } or a - after the name: another substitution can't follow it directly.`,
          label: "needs } or - here",
          explanation: `After the name in ${code(`${opener}${selector}`)}, tf only accepts ${code("}")}, which ends the substitution, or ${code("-")}, which starts a default value. To use another substitution as the default, write ${code(`${opener}${selector}-${other}}`)}; to put two values side by side, close the first one: ${code(`${opener}${selector}}${other}`)}.`,
          related: [{ start: percent, end: openerEnd, message: `this ${opener}` }]
        });
      }
      const cutShort = this.isStatEnd(this.i) && s.indexOf("}", this.i) >= 0;
      const close = { title: cutShort ? `Close it with } before the ${s.slice(this.i, this.i + 2)}` : "Close it with }", edits: [this.insertAtEnd(this.i, "}")] };
      this.fail(
        "substitution",
        percent,
        openerEnd,
        !ended ? {
          message: `This ${opener} needs its } before the ${charName(ch)}.`,
          label: "not closed",
          explanation: `${code(`${opener}...}`)} holds the name of a variable or parameter, and a name can't contain a ${charName(ch)}. To put text after the substitution, close it first: ${code(`${opener}name} text`)}.`,
          related: [{ start: this.i, end: this.i + 1, message: `the name stops at this ${charName(ch)}` }],
          fix: { title: `Close it with } before the ${charName(ch)}`, edits: [{ start: this.i, end: this.i, newText: "}" }] }
        } : cutShort ? {
          message: `This ${opener} is cut short by the ${s.slice(this.i, this.i + 2)} before its }: a separator ends the statement, even inside a substitution.`,
          label: "cut short",
          explanation: `${code(s.slice(this.i, this.i + 2))} ends the statement, even inside a ${code(`${opener}...}`)}, so tf never reaches the ${code("}")} after it, and rejects the ${code(opener)}. Closing it before the separator leaves that ${code("}")} after it, which tf sends to the world.`,
          fix: close
        } : { message: `This ${opener} is never closed: add }.`, label: "never closed", fix: close }
      );
    }
  }
  /**
   * `$$...`, `$[...]`, `$(...)` or `${name}`/`$name`, with `this.i` just after the `$` at `dollar`;
   * `inExpression` when it is an operand of an expression.
   */
  dollarsub(dollar, inExpression = false) {
    const s = this.s;
    if (s[this.i] === "$") {
      while (s[this.i] === "$") this.i += 1;
    } else if (s[this.i] === "[") {
      this.i += 1;
      const start = this.i;
      this.expression("]", dollar);
      this.expressions.push({ start, end: this.i - 1, kind: "bracket" });
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start, end: this.i - 1 } });
    } else if (s[this.i] === "(") {
      this.i += 1;
      const start = this.i;
      this.cmdsub += 1;
      this.cmdsubStarts.push({ at: dollar, inExpression });
      const outer = this.block;
      this.cmdsubBlocks.push(outer);
      this.block = "";
      this.list(FULL);
      this.block = outer;
      this.cmdsubBlocks.pop();
      this.cmdsub -= 1;
      this.cmdsubStarts.pop();
      this.dropMids(dollar);
      if (s[this.i] !== ")") {
        this.fail("substitution", dollar, dollar + 2, {
          message: "This $( is never closed: add ).",
          label: "never closed",
          fix: { title: "Close it with ) at the end", edits: [this.insertAtEnd(this.i, ")")] }
        });
      }
      this.cmdsubs.push({ start, end: this.i });
      this.i += 1;
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start, end: this.i - 1 } });
    } else {
      this.macsub(dollar);
    }
  }
  /** `${name}` or `$name` (`macsub()`). */
  macsub(dollar) {
    const s = this.s;
    const bracket = s[this.i] === "{";
    if (bracket) this.i += 1;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === "\\") {
        this.i += 2;
      } else if (this.isStatEnd(this.i) || this.isCmdsubEnd(this.i) || ch === "}") {
        break;
      } else if (!bracket && isTfSpace(ch)) {
        break;
      } else if (ch === "$") {
        if (s[this.i + 1] === "$") {
          while (s[this.i + 1] === "$") this.i += 1;
          this.i += 1;
        } else if (!bracket) {
          break;
        } else {
          this.i += 1;
        }
      } else if (ch === "%") {
        this.i += 1;
        if (s[this.i] === "%") while (s[this.i] === "%") this.i += 1;
        else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) this.varsub(this.i - 1);
      } else {
        this.i += 1;
      }
    }
    if (bracket) {
      if (s[this.i] !== "}") {
        this.fail("substitution", dollar, dollar + 2, {
          message: "This ${ is never closed: add }.",
          label: "never closed",
          fix: { title: "Close it with }", edits: [this.insertAtEnd(this.i, "}")] }
        });
      }
      this.i += 1;
      this.spans.push({ start: dollar, end: this.i, kind: "substitution", inner: { start: dollar + 2, end: this.i - 1 } });
    } else if (s[this.i] === "$") {
      this.i += 1;
    }
  }
  /** An `/if (...)` or `/while (...)` condition, with `this.i` at the `(`. */
  condition(keyword) {
    const open = this.i;
    this.i += 1;
    this.expression(")", open, keyword);
    this.expressions.push({ start: open + 1, end: this.i - 1, kind: "condition" });
    this.spans.push({ start: open, end: this.i, kind: "condition", inner: { start: open + 1, end: this.i - 1 } });
  }
  /**
   * An expression, up to its closing `close` (`]` for `$[`, `)` for a condition), or to the end of
   * the text when `close` is undefined. Only strings and parentheses are followed: enough to find
   * where it ends, not to check its grammar.
   */
  expression(close, open, keyword) {
    this.deeper(() => this.expressionAt(close, open, keyword));
  }
  /**
   * A `$[...]` from `dollar` to `this.i` that is an operand of the expression that started at
   * `from` (`primary_expr()` warns "legal, but redundant"). `$[` compiles its inside with `expr()`,
   * which is `comma_expr()`, the same code `(` compiles, so `(...)` always means the same; when it
   * is a whole condition, `($[x])` can be `(x)`.
   */
  dollarOperand(dollar, from, close, keyword, inParens) {
    const s = this.s;
    const end = this.i - 1;
    let after = this.i;
    while (isTfSpace(s[after])) after += 1;
    const whole = !inParens && s.slice(from, dollar).trim() === "" && (close ? s[after] === close : after >= s.length);
    const drop = whole && close === ")";
    const what = close === ")" ? "the condition" : close === "]" ? "the $[...] around it" : `${keyword ?? "/test"}'s text`;
    this.issues.push({
      kind: "operand",
      start: dollar,
      end: dollar + 2,
      message: drop ? `This $[...] is redundant, as ${what} is already an expression: drop the $[ and ].` : `This $[...] is redundant, as ${what} is already an expression: write (...) instead.`,
      label: "redundant",
      explanation: `${what[0]?.toUpperCase()}${what.slice(1)} is an expression, and inside an expression ${code("$[...]")} means the same as ${code("(...)")}. tf warns that it is legal, but redundant: once per session, or every time when ${code("%pedantic")} is on.`,
      related: [{ start: end, end: end + 1, message: "its ]" }],
      fix: drop ? { title: "Remove the $[ and ]", edits: [{ start: dollar, end: dollar + 2, newText: "" }, { start: end, end: end + 1, newText: "" }] } : { title: "Write (...) instead of $[...]", edits: [{ start: dollar, end: dollar + 2, newText: "(" }, { start: end, end: end + 1, newText: ")" }] }
    });
  }
  /**
   * A `%x` or `%{x}` from `percent` to `this.i` that is an operand of an expression: `varsub()`
   * reads it as it reads `{x}`, and warns that it "can be confusing". `{x}` is the same read with
   * no warning, so the fix drops the `%`, or puts the selector in braces when there were none (not
   * when its default holds a brace, which would end it early).
   */
  percentOperand(percent) {
    const text = this.s.slice(percent, this.i);
    const bracket = text[1] === "{";
    const braced = bracket ? text.slice(1) : `{${text.slice(1)}}`;
    const exact = bracket || !/[{}]/.test(text);
    this.issues.push({
      kind: "operand",
      start: percent,
      end: this.i,
      message: `This ${text} works in an expression, but tf warns that it can be confusing: write ${braced} instead.`,
      label: `write ${braced}`,
      explanation: `In an expression, ${code("{x}")} reads the variable or parameter ${code("x")}. ${code("%{x}")} reads it too, but tf warns that it can be confusing there, since outside an expression ${code("%{x}")} puts the value into the text before the command runs. tf prints the warning once per session, or every time when ${code("%pedantic")} is on.`,
      ...exact ? { fix: { title: `Write ${braced}`, edits: [bracket ? { start: percent, end: percent + 1, newText: "" } : { start: percent, end: this.i, newText: braced }] } } : {}
    });
  }
  expressionAt(close, open, keyword) {
    const s = this.s;
    const from = this.i;
    const parens = [];
    while (this.i < s.length) {
      const ch = s[this.i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = this.i;
        this.i += 1;
        while (this.i < s.length && s[this.i] !== ch) this.i += s[this.i] === "\\" ? 2 : 1;
        if (this.i >= s.length) {
          this.fail("expression", quote, quote + 1, {
            message: `This string is never closed: add the closing ${ch}.`,
            label: "never closed",
            explanation: `Inside an expression (${code("$[...]")}, a condition or ${code("/test")}), ${code(ch)} starts a string that runs to the next ${code(ch)}. This one never finds its closing ${code(ch)}, so it takes everything after it, including any ${code("]")} or ${code(")")}.`
          });
        }
        this.i += 1;
        this.spans.push({ start: quote, end: this.i, kind: "string", inner: { start: quote + 1, end: this.i - 1 } });
        continue;
      }
      if (close && this.isStatEnd(this.i)) break;
      if (ch === "$") {
        const dollar = this.i;
        this.i += 1;
        this.dollarsub(dollar, true);
        if (s[dollar + 1] === "[") this.dollarOperand(dollar, from, close, keyword, parens.length > 0);
        continue;
      }
      if (ch === "%") {
        const percent = this.i;
        this.i += 1;
        if (s[this.i] === "%") {
          while (s[this.i] === "%") this.i += 1;
        } else if (s[this.i] === "{" || "#?*-".includes(s[this.i] ?? " ") || isNameChar(s[this.i])) {
          this.varsub(percent);
          this.percentOperand(percent);
        }
        continue;
      }
      if (ch === "{") {
        this.varsub(this.i);
        continue;
      }
      if (ch === "(") parens.push(this.i);
      else if (ch === ")") {
        if (parens.length === 0) {
          if (close === ")") {
            this.i += 1;
            return;
          }
          this.fail("expression", this.i, this.i + 1, {
            message: close === "]" ? "This ) has no matching ( inside the $[...]." : "This ) has no matching (.",
            label: "no matching (",
            fix: { title: "Remove the )", edits: [{ start: this.i, end: this.i + 1, newText: "" }] }
          });
        }
        const paren = parens.pop();
        this.spans.push({ start: paren, end: this.i + 1, kind: "paren", inner: { start: paren + 1, end: this.i } });
      } else if (ch === "]" && close === "]") {
        if (parens.length > 0) {
          const paren = parens[parens.length - 1];
          this.fail("expression", this.i, this.i + 1, {
            message: "A ( in this $[...] is never closed: add ) before the ].",
            label: "the $[...] ends here",
            related: [{ start: paren, end: paren + 1, message: "this ( is never closed" }],
            fix: { title: "Add ) before the ]", edits: [this.insertAtEnd(this.i, ")".repeat(parens.length))] }
          });
        }
        this.i += 1;
        return;
      }
      this.i += 1;
    }
    if (close === "]") {
      this.fail("expression", open, open + 2, {
        message: "This $[ is never closed: add ].",
        label: "never closed",
        explanation: `A ${code("$[")} runs to its matching ${code("]")}, which has to come before the next ${code("%;")}.`,
        fix: { title: "Close it with ] at the end of the statement", edits: [this.insertAtEnd(this.i, `${")".repeat(parens.length)}]`)] }
      });
    } else if (close === ")") {
      this.fail("expression", open, open + 1, {
        message: `The ${keyword ?? ""} condition's ( is never closed: add ).`,
        label: "never closed"
      });
    } else if (parens.length > 0) {
      const paren = parens[parens.length - 1];
      this.fail("expression", paren, paren + 1, {
        message: "This ( is never closed: add ).",
        label: "never closed",
        fix: { title: "Add ) at the end", edits: [this.insertAtEnd(s.length, ")".repeat(parens.length))] }
      });
    }
  }
};
var STOPS = /* @__PURE__ */ new Set(["block", "keyword", "continuation"]);
function firstStop(issues) {
  return issues.find((i) => STOPS.has(i.kind));
}
function unedited(pos, edits) {
  let delta = 0;
  for (const e of [...edits].sort((a, b) => a.start - b.start)) {
    if (pos < e.start + delta + e.newText.length) break;
    delta += e.newText.length - (e.end - e.start);
  }
  return pos - delta;
}
var NOISE = /* @__PURE__ */ new Set(["empty-statement"]);
function noise(issues) {
  let n = 0;
  for (const i of issues) if (NOISE.has(i.kind)) n += 1;
  return n;
}
var MAX_TRIES = 64;
var Trial = class {
  constructor(s, mode, baseNoise) {
    this.s = s;
    this.mode = mode;
    this.baseNoise = baseNoise;
  }
  s;
  mode;
  baseNoise;
  tries = 0;
  /**
   * Where tf would first stop in `s` with `edits` applied, as an offset into `s` (Infinity if
   * nowhere); -1 if the edits bring in a warning tf gives that `s` doesn't have, or the budget is spent.
   */
  stopAfter(edits) {
    if (this.tries >= MAX_TRIES) return -1;
    this.tries += 1;
    let t = this.s;
    for (const e of [...edits].sort((a, b) => b.start - a.start)) t = t.slice(0, e.start) + e.newText + t.slice(e.end);
    const p = new Parser(t, this.mode);
    p.run();
    if (noise(p.issues) > this.baseNoise) return -1;
    const stop = firstStop(p.issues);
    return stop ? unedited(stop.start, edits) : Infinity;
  }
};
function strayNote(issue) {
  return { start: issue.start, end: issue.end, message: issue.message.replace(/^This /, "the ").replace(/(?:: it is .*)?\.$/, "") };
}
function parseSettled(s, mode) {
  const p = new Parser(s, mode);
  p.run();
  const issues = [...p.issues];
  const swallowed = [];
  const trial = new Trial(s, mode, noise(issues));
  const block = issues.find((i) => i.kind === "block");
  const resolves = (edits) => !!block && trial.stopAfter(edits) === Infinity;
  if (block && block === firstStop(issues)) {
    const before = (x) => x.start < block.start;
    const warning = issues.filter((i) => i.kind === "keyword-warning" && i.fix).reverse().find((i) => resolves(i.fix.edits));
    if (warning) {
      const taken = p.warned.get(warning);
      const stray = strayNote(block);
      const closer = block.fix?.title.replace(/^Add/, "add");
      const turned = {
        ...warning,
        kind: "keyword",
        message: closer ? `/${taken.word} here is not a keyword: it is part of ${taken.what}, so ${stray.message}: put %; before it, or if it is meant as text, ${closer}.` : `/${taken.word} here is not a keyword: it is part of ${taken.what}, so ${stray.message}: put %; before it.`,
        ...block.fix ? { alternative: block.fix } : {},
        explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${takesTheRest(taken.command, taken.word, taken.what)} That leaves ${code(s.slice(block.start, block.end))} with nothing to belong to, which is the error tf reports.`,
        related: [stray]
      };
      issues.splice(issues.indexOf(warning), 1, turned);
      issues.splice(issues.indexOf(block), 1);
    } else {
      const alone = (x) => p.swallowed.filter((y) => y.stmt === x.stmt).length === 1;
      const w = [...p.swallowed].reverse().find((x) => x.edits.length > 0 && before(x) && alone(x) && resolves(x.edits));
      if (w) {
        swallowed.push({ ...w, stray: strayNote(block) });
        issues.splice(issues.indexOf(block), 1);
      }
    }
  }
  const stop = firstStop(issues)?.start ?? Infinity;
  for (const issue of issues) {
    if ((issue.kind === "keyword-warning" || issue.kind === "glued") && issue.fix) {
      const after = trial.stopAfter(issue.fix.edits);
      if (after < 0 || after < stop) delete issue.fix;
    }
  }
  return { issues, swallowed };
}
var DEF_RE2 = /^\s*\/@?(?:def|edit)\b/i;
var SPLIT_ARGS_RE = /^\s*\/(?:@?(?:bind|hook|gag|hilite)|trigpc|trigc|trigp|trig)\b/i;
var ALIAS_RE = /^(\s*\/alias\s+\S+\s+)\S/i;
function macroBodyStart(text) {
  const alias = ALIAS_RE.exec(text);
  if (alias) return alias[1].length;
  let from;
  const def = DEF_RE2.exec(text);
  if (def) from = defOptionsEnd(text, def[0].length);
  else if (SPLIT_ARGS_RE.test(text)) from = 0;
  else return -1;
  const eq = text.indexOf("=", from);
  return eq < 0 ? -1 : eq + 1;
}
function parseStatements(text, mode) {
  const parser = new Parser(text, mode);
  parser.run();
  return parser.stopped ? [] : parser.statements;
}
function parseRegions(text, mode) {
  const parser = new Parser(text, mode);
  parser.run();
  return {
    statements: parser.statements,
    expressions: parser.expressions,
    cmdsubs: parser.cmdsubs,
    spans: parser.spans,
    blocks: parser.blocks,
    issues: parser.issues,
    stopped: parser.stopped
  };
}
function entryStatements(entry) {
  const statements = parseStatements(entry.text, "top");
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
  if (body >= 0) {
    for (const st of parseStatements(entry.text.slice(body), "body")) {
      statements.push({ ...st, start: st.start + body, end: st.end + body });
    }
  }
  return statements;
}
var cache = /* @__PURE__ */ new WeakMap();
function entryModel(entry) {
  let model = cache.get(entry);
  if (!model) {
    const top = parseSettled(entry.text, "top");
    model = { issues: top.issues, swallowed: [...top.swallowed] };
    const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(entry.text) : -1;
    if (body >= 0) {
      const parser = parseSettled(entry.text.slice(body), "body");
      for (const issue of parser.issues) model.issues.push(shiftIssue(issue, body));
      for (const w of parser.swallowed) {
        const edits = w.edits.map((e) => ({ ...e, start: e.start + body, end: e.end + body }));
        const stray = w.stray && { ...w.stray, start: w.stray.start + body, end: w.stray.end + body };
        model.swallowed.push({ ...w, start: w.start + body, end: w.end + body, stmt: w.stmt + body, edits, ...stray ? { stray } : {} });
      }
    }
    cache.set(entry, model);
  }
  return model;
}
function entryStructure(entry) {
  return entryModel(entry).issues;
}
function entrySwallowed(entry) {
  return entryModel(entry).swallowed;
}

// packages/core/src/joinFix.ts
var JOIN_MAX_LINES = 20;
var MAX_LINES = JOIN_MAX_LINES;
var MAX_TRIES2 = 80;
var MAX_SLICE = 2e4;
var MAX_TOTAL_TRIES = 1500;
var CLOSER_RE = /(?<![^ \t;|\\])\/(?:endif|done)(?=[ \t\r\f\v%)]|$)/i;
var TOP_BLOCK_RE = /^\/(?:if|while)\b/i;
var KEYWORD_END_RE = /(?:^|%;[ \t]*)\/(?:do|then)$/i;
var CLOSES_RE = /(?:^|[ \t;|\\])\/(?:endif|done)(?:[ \t\r\f\v]|%[;|\\])*$/i;
var STRAY_KEYWORD_RE = /^\/(?:then|else|elseif|endif|do|done)(?![^ \t\r\f\v%])/i;
var SETTLE_CODES = /* @__PURE__ */ new Set(["block-structure", "empty-statement"]);
var settles = (d) => SETTLE_CODES.has(d.code);
function separates(entry) {
  if (entry.isDefBody || entry.isOtherMacroBody) return "body";
  return TOP_BLOCK_RE.test(entry.text) ? "top" : void 0;
}
var SeparatorScanner = class {
  constructor(mode) {
    this.mode = mode;
  }
  mode;
  escaped = false;
  percents = 0;
  content = false;
  /** The text so far ends with a separator. */
  atSeparator = false;
  /** Separators with nothing but blanks since the one before (or the start): empty statements. */
  empty = 0;
  /** Where each separator read so far ends, in characters fed. */
  separators = [];
  fed = 0;
  feed(text) {
    for (const ch of text) {
      this.fed += 1;
      if (this.escaped) {
        this.escaped = false;
        this.text();
      } else if (this.percents === 1 && (ch === ";" || ch === "|" || ch === "\\")) {
        if (!this.content) this.empty += 1;
        this.separators.push(this.fed);
        this.content = false;
        this.percents = 0;
        this.atSeparator = true;
      } else if (ch === "%") {
        if (this.percents > 0) this.content = true;
        this.percents += 1;
        this.atSeparator = false;
      } else if (ch === "\\" && this.mode === "body") {
        this.escaped = true;
        this.text();
      } else if (isTfSpace(ch) && this.percents === 0) {
        this.atSeparator = false;
      } else {
        this.text();
      }
    }
    return this;
  }
  text() {
    this.content = true;
    this.percents = 0;
    this.atSeparator = false;
  }
};
function runsBody(word) {
  return TAKES_COMMANDS.test(word);
}
function commandOf(line) {
  return (/^\/[@!]*([^\s%]*)/.exec(line.slice(leadingWhitespaceLength(line)))?.[1] ?? "").toLowerCase();
}
function partOf(line) {
  const part = line.slice(leadingWhitespaceLength(line));
  return continuesToNextLine(part) ? part.slice(0, -1) : part;
}
function joinedText(lines, from, to) {
  let text = "";
  for (let k = from; k <= to; k += 1) if (!isCommentLine(lines[k] ?? "")) text += partOf(lines[k] ?? "");
  return text;
}
function continued(line, next, mode, header, scan2) {
  if (line.endsWith("\r") || isBlankLine(line)) return void 0;
  let end = line.length;
  while (end > 0 && isTfSpace(line[end - 1])) end -= 1;
  const body = line.slice(0, end);
  if (continuesToNextLine(body)) {
    scan2.feed(partOf(body));
    return body;
  }
  const own = body.slice(leadingWhitespaceLength(body));
  scan2.feed(own);
  const command2 = next[leadingWhitespaceLength(next)] === "/";
  const keyword = KEYWORD_END_RE.test(own);
  const sep2 = mode !== void 0 && command2 && !header && !keyword && !scan2.atSeparator;
  const added = !sep2 ? " " : body.endsWith("%") || mode === "body" && body.endsWith("\\") ? " %; " : "%; ";
  scan2.feed(added);
  return `${body}${added}\\`;
}
function joined(lines, base, from, to, mode) {
  let previous = lines[from] ?? "";
  for (let k = from + 1; k <= to; k += 1) {
    const line = lines[k] ?? "";
    if (isCommentLine(line) || isBlankLine(line)) continue;
    const own = (m) => new SeparatorScanner(m).feed(partOf(line)).separators;
    if (mode === "top" && own("top").length > 0) return void 0;
    if (mode === "body" && own("body").join() !== own("top").join()) return void 0;
    if (mode === "body" && own("body").length > 0 && runsBody(commandOf(line))) return void 0;
    if (mode === "top" && /%%/.test(line)) return void 0;
    if (!continuesToNextLine(previous) && line[leadingWhitespaceLength(line)] !== "/") return void 0;
    previous = line;
  }
  const out = lines.slice(base, to + 1);
  const scan2 = new SeparatorScanner(mode);
  scan2.feed(joinedText(lines, base, from - 1));
  let header = mode === "body";
  for (let k = from; k < to; k += 1) {
    const line = out[k - base] ?? "";
    if (isCommentLine(line)) continue;
    let n = k + 1;
    while (n < to && isCommentLine(out[n - base] ?? "")) n += 1;
    if (header) {
      const sofar = joinedText(out, 0, k - base);
      const start = macroBodyStart(sofar);
      header = start >= 0 && sofar.slice(start).trim() === "";
    }
    const next = continued(line, out[n - base] ?? "", mode, header, scan2);
    if (next === void 0) return void 0;
    out[k - base] = next;
  }
  return out;
}
function applyLineEdits(lines, edits) {
  if (edits.some((e) => e.range.start.line !== e.range.end.line || e.newText.includes("\n"))) return void 0;
  const out = lines.slice();
  const ordered = [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character);
  for (const e of ordered) {
    const line = out[e.range.start.line] ?? "";
    out[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  }
  return out;
}
var key = (d) => `${d.code}\0${d.message}`;
function counts(diagnostics) {
  const m = /* @__PURE__ */ new Map();
  for (const d of diagnostics) m.set(d.code, (m.get(d.code) ?? 0) + 1);
  return m;
}
function settle(slice2, before, diagnose) {
  const old = new Set(before.map(key));
  let lines = slice2;
  let diagnostics = diagnose(lines.join("\n"));
  for (let round = 0; round < 6; round += 1) {
    const d = diagnostics.find((x) => settles(x) && x.fix && !x.fix.title.startsWith("Add ") && !old.has(key(x)));
    const next = d?.fix && applyLineEdits(lines, d.fix.edits);
    if (!next) break;
    lines = next;
    diagnostics = diagnose(lines.join("\n"));
  }
  return { lines, diagnostics };
}
function emptyStatements(lines, mode) {
  return mode === void 0 ? 0 : new SeparatorScanner(mode).feed(joinedText(lines, 0, lines.length - 1)).empty;
}
function lineEdits(before, after, base) {
  const edits = [];
  before.forEach((was, i) => {
    const now = after[i] ?? "";
    if (was === now) return;
    let p = 0;
    while (p < was.length && p < now.length && was[p] === now[p]) p += 1;
    let s = 0;
    while (s < was.length - p && s < now.length - p && was[was.length - 1 - s] === now[now.length - 1 - s]) s += 1;
    const range = { start: { line: base + i, character: p }, end: { line: base + i, character: was.length - s } };
    edits.push({ range, newText: now.slice(p, now.length - s) });
  });
  return edits;
}
function joinFix(lines, entry, first, minLast, gone, diagnose, closerOnly, stopAt = /* @__PURE__ */ new Set()) {
  const separate = separates(entry);
  const base = entry.startLine;
  let fallback;
  for (let last = minLast; last < lines.length && last <= first + MAX_LINES; last += 1) {
    const line = lines[last] ?? "";
    if (isBlankLine(line) || stopAt.has(last)) break;
    if (isCommentLine(line) || continuesToNextLine(line)) continue;
    if ((closerOnly || last > minLast) && !CLOSER_RE.test(line)) continue;
    const candidate = joined(lines, base, first, last, separate);
    if (!candidate) break;
    const original = lines.slice(base, last + 1);
    const before = diagnose(original.join("\n"));
    const settled = settle(candidate, before, diagnose);
    if (!gone(settled.diagnostics)) continue;
    const had = counts(before);
    if ([...counts(settled.diagnostics)].some(([code2, n]) => n > (had.get(code2) ?? 0))) continue;
    if (emptyStatements(settled.lines, separate) > emptyStatements(original, separate)) continue;
    const edits = lineEdits(original, settled.lines, base);
    const join7 = { edits, clean: !settled.diagnostics.some((d) => d.severity === "error"), from: base, to: last };
    if (join7.clean) return join7;
    fallback ??= join7;
  }
  return fallback;
}
function joinAndClose(lines, entry, last, closer, diagnose) {
  const separate = separates(entry);
  const base = entry.startLine;
  const candidate = joined(lines, base, entry.endLine, last, separate);
  if (!candidate) return void 0;
  const end = candidate.length - 1;
  const tail = (candidate[end] ?? "").replace(/[ \t\f\v]+$/, "");
  const scan2 = new SeparatorScanner(separate).feed(joinedText(candidate, 0, end));
  candidate[end] = `${tail}${scan2.atSeparator ? " " : tail.endsWith("%") ? " %; " : "%; "}/${closer}`;
  const original = lines.slice(base, last + 1);
  const settled = settle(candidate, diagnose(original.join("\n")), diagnose);
  if (settled.diagnostics.some((d) => d.severity === "error")) return void 0;
  if (emptyStatements(settled.lines, separate) > emptyStatements(original, separate)) return void 0;
  if (hasEmptyBranch(joinedText(settled.lines, 0, settled.lines.length - 1))) return void 0;
  return { edits: lineEdits(original, settled.lines, base), clean: true, from: base, to: last };
}
function conditionEnd(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i += 1;
      while (i < s.length && s[i] !== ch) i += s[i] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return i + 1;
  }
  return -1;
}
function simpleBlock(lines, d, entry, related) {
  if (related.length === 0 || entry.startLine !== entry.endLine || d.range.start.character !== 0) return false;
  const line = (lines[entry.startLine] ?? "").replace(/[ \t\r\f\v]+$/, "");
  const opener = /^\/(if|while)[ \t]*/i.exec(line);
  if (!opener || line[opener[0].length] !== "(") return false;
  if (conditionEnd(line, opener[0].length) !== line.length) return false;
  const isIf = opener[1].toLowerCase() === "if";
  const rows = [...related].sort((a, b) => a.range.start.line - b.range.start.line);
  let elses = 0;
  let body = 0;
  for (const r of rows) {
    const text = (lines[r.range.start.line] ?? "").trim();
    if (/^\/else$/i.test(text) && isIf && elses === 0 && body > 0) {
      elses += 1;
      body = 0;
    } else if (r.message.includes("line before it has no") && leadingWhitespaceLength(lines[r.range.start.line] ?? "") > 0) {
      body += 1;
    } else {
      return false;
    }
  }
  return body > 0;
}
function hasEmptyBranch(text) {
  return parseRegions(text, "top").blocks.some((b) => b.parts.some((p) => text.slice(p.start, p.end).replace(/%[;|\\]/g, "").trim() === ""));
}
function entryAt(entries, line) {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const e = entries[mid];
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return e;
  }
  return void 0;
}
function touches(fix, line) {
  return !!fix && fix.edits.some((e) => e.range.start.line <= line && line <= e.range.end.line);
}
function addJoinFixes(text, diagnostics, diagnoseSlice) {
  let total = 0;
  addJoins(text, diagnostics, (t) => {
    total += 1;
    if (total > MAX_TOTAL_TRIES) throw new OutOfTries();
    return diagnoseSlice(t);
  });
}
var OutOfTries = class extends Error {
};
function attempt(diagnoseSlice, fn) {
  let tries = 0;
  const diagnose = (t) => {
    tries += 1;
    if (tries > MAX_TRIES2 || t.length > MAX_SLICE) throw new OutOfTries();
    return diagnoseSlice(t);
  };
  try {
    return fn(diagnose);
  } catch (e) {
    if (e instanceof OutOfTries) return void 0;
    throw e;
  }
}
function indentedRuns(diagnostics) {
  const runs = [];
  const indented = diagnostics.filter((d) => d.code === "indented-line-after-command").sort((a, b) => a.range.start.line - b.range.start.line);
  for (const d of indented) {
    const run = runs[runs.length - 1];
    const tail = run?.[run.length - 1];
    if (run && tail && d.related?.[0]?.range.start.line === tail.range.start.line) run.push(d);
    else runs.push([d]);
  }
  return runs;
}
function addJoins(text, diagnostics, diagnoseSlice) {
  if (!diagnostics.some((d) => d.code === "missing-continuation" || d.code === "indented-line-after-command" || d.code === "block-structure")) return;
  const lines = splitRawLines(text);
  const entries = splitLogicalEntries(text);
  const definitions = new Set(
    entries.filter((e) => (e.isDefBody || e.isOtherMacroBody) && leadingWhitespaceLength(lines[e.startLine] ?? "") === 0).map((e) => e.startLine)
  );
  const joins = [];
  const clean = [];
  const add = (d, title, join7) => {
    d.fix = { title, edits: join7.edits };
    joins.push(d.fix);
    if (join7.clean) clean.push({ fix: d.fix, from: join7.from, to: join7.to });
  };
  for (const d of diagnostics) {
    if (d.code !== "missing-continuation" && d.code !== "block-structure") continue;
    if (d.fix && !d.fix.title.startsWith("Add %; /")) continue;
    const entry = entryAt(entries, d.range.start.line);
    const first = entry?.offsetMap[0];
    const starts = !!first && first.line === d.range.start.line && first.character === d.range.start.character;
    const own = TOP_BLOCK_RE.exec((lines[d.range.start.line] ?? "").slice(d.range.start.character));
    const opener = entry && !entry.isDefBody && !entry.isOtherMacroBody && TOP_BLOCK_RE.test(entry.text) ? own : null;
    if (!entry || !opener || !starts && d.code !== "missing-continuation") continue;
    const at2 = d.range.start.line - entry.startLine;
    const anyMessage = d.code === "missing-continuation";
    const join7 = attempt(
      diagnoseSlice,
      (diagnose) => (
        // missing-continuation's message names lines, which differ in the slice: the code and line are enough.
        joinFix(lines, entry, entry.endLine, entry.endLine + 1, (ds) => !ds.some((x) => x.code === d.code && (anyMessage || x.message === d.message) && x.range.start.line === at2), diagnose, true, definitions)
      )
    );
    if (join7 && (join7.clean || d.code === "missing-continuation")) {
      add(d, `Join the ${opener[0].toLowerCase()}'s lines with \\`, join7);
      continue;
    }
    const related = d.code === "missing-continuation" ? d.related ?? [] : [];
    if (!simpleBlock(lines, d, entry, related)) continue;
    const word = opener[0].toLowerCase();
    const closer = word === "/while" ? "done" : "endif";
    const last = Math.max(...related.map((r) => r.range.start.line));
    let after = last + 1;
    while (after < lines.length && (isCommentLine(lines[after] ?? "") || isBlankLine(lines[after] ?? ""))) after += 1;
    const following = lines[after] ?? "";
    if (leadingWhitespaceLength(following) > 0 || STRAY_KEYWORD_RE.test(following)) continue;
    const closed = attempt(diagnoseSlice, (diagnose) => joinAndClose(lines, entry, last, closer, diagnose));
    if (closed) add(d, `Join the ${word}'s lines with \\ and end it with /${closer}`, closed);
  }
  for (const run of indentedRuns(diagnostics)) {
    const head = run[0];
    const previous = head.related?.[0]?.range.start.line;
    const entry = previous === void 0 ? void 0 : entryAt(entries, previous);
    if (!entry || previous === void 0 || head.fix) continue;
    const enclosing = joins.find((f) => touches(f, previous));
    if (enclosing) {
      for (const d of run) d.fix = enclosing;
      continue;
    }
    if (/\\[ \t\f\v]+$/.test(lines[previous] ?? "")) continue;
    const own = lines[head.range.start.line] ?? "";
    const closed = separates(entry) === "top" && CLOSES_RE.test(entry.text);
    if (closed && own[leadingWhitespaceLength(own)] !== "/") continue;
    if ((!separates(entry) || closed) && own[leadingWhitespaceLength(own)] === "/") {
      for (const d of run) {
        const line = d.range.start.line;
        const indent = leadingWhitespaceLength(lines[line] ?? "");
        d.fix = { title: "Remove the indentation", edits: [{ range: { start: { line, character: 0 }, end: { line, character: indent } }, newText: "" }] };
      }
      continue;
    }
    const last = run[run.length - 1].range.start.line;
    const at2 = last - entry.startLine;
    const join7 = attempt(
      diagnoseSlice,
      (diagnose) => joinFix(lines, entry, previous, last, (ds) => !ds.some((x) => x.code === head.code && x.range.start.line >= previous - entry.startLine && x.range.start.line <= at2), diagnose, false)
    );
    if (!join7) continue;
    add(head, join7.edits.length > 1 ? "Join these lines with \\" : `End line ${previous + 1} with \\`, join7);
    for (const d of run) d.fix = head.fix;
  }
  for (const d of diagnostics) {
    if (d.code !== "block-structure" && d.code !== "indented-line-after-command") continue;
    if (d.fix && !d.fix.title.startsWith("Add %; /")) continue;
    const join7 = clean.find((j) => j.from <= d.range.start.line && d.range.start.line <= j.to);
    if (join7) d.fix = join7.fix;
  }
}

// packages/core/src/rules/missingContinuation.ts
var missingContinuation = {
  id: "missing-continuation",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entryStructure(entry).filter((i) => i.kind === "continuation").map(({ kind: _kind, ...match }) => match);
  }
};
var STRAY_RE = /^This \/(then|else|elseif|endif|do|done) has no \/(?:if|while) to (?:close|belong to)\.$/;
var OPENER_RE = /^\/(if|while)\b/i;
var byPosition = (a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character;
function spanOf(entries, index, lines) {
  const entry = entries[index];
  let end = entry.endLine;
  for (let k = index + 1; k < entries.length; k += 1) {
    const e = entries[k];
    const first = lines[e.startLine] ?? "";
    if (isBlankLine(first) || e.endLine > entry.endLine + JOIN_MAX_LINES) break;
    if ((e.isDefBody || e.isOtherMacroBody) && leadingWhitespaceLength(first) === 0) break;
    end = e.endLine;
  }
  return end;
}
function entryIndexAt(entries, line) {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const e = entries[mid];
    if (line < e.startLine) hi = mid - 1;
    else if (line > e.endLine) lo = mid + 1;
    else return mid;
  }
  return -1;
}
function cutOff(line) {
  if (/%\\[ \t\f\v\r]*$/.test(line)) return "percent";
  if (!/\\[ \t\f\v\r]+$/.test(line)) return line.endsWith("\r") ? "none-crlf" : "none";
  return /\\\r$/.test(line) ? "crlf" : "whitespace";
}
function consolidateContinuations(text, entries, diagnostics) {
  if (!diagnostics.some((d) => d.code === "missing-continuation")) return diagnostics;
  const lines = splitRawLines(text);
  const candidates = diagnostics.filter((d) => d.code === "missing-continuation" || d.code === "block-structure" && STRAY_RE.test(d.message)).sort(byPosition);
  const openers = [];
  const open = [];
  const dropped = /* @__PURE__ */ new Set();
  for (const d of candidates) {
    const index = entryIndexAt(entries, d.range.start.line);
    const entry = entries[index];
    if (!entry || entry.isDefBody || entry.isOtherMacroBody) continue;
    if (d.code === "missing-continuation") {
      const at2 = d.range.start;
      const word2 = OPENER_RE.exec((lines[at2.line] ?? "").slice(at2.character))?.[1]?.toLowerCase();
      if (word2 !== "if" && word2 !== "while") continue;
      const opener2 = { d, word: word2, endLine: entry.endLine, spanEnd: spanOf(entries, index, lines), strays: [] };
      openers.push(opener2);
      open.push(opener2);
      continue;
    }
    const first = entry.offsetMap[0];
    if (!first || first.line !== d.range.start.line || first.character !== d.range.start.character) continue;
    const word = STRAY_RE.exec(d.message)[1];
    const block = word === "do" || word === "done" ? "while" : "if";
    for (let k2 = open.length - 1; k2 >= 0; k2 -= 1) if (open[k2].spanEnd < d.range.start.line) open.splice(k2, 1);
    let k = open.length - 1;
    while (k >= 0 && open[k].word !== block) k -= 1;
    const opener = open[k];
    if (!opener) continue;
    opener.strays.push({ d, word });
    dropped.add(d);
    if (word === "endif" || word === "done") open.splice(k, 1);
  }
  const indented = diagnostics.filter((d) => d.code === "indented-line-after-command").sort(byPosition);
  for (const opener of openers) {
    const related = [];
    const last = opener.strays[opener.strays.length - 1];
    const lastStray = last?.d.range.start.line;
    const after = (line) => {
      let next2 = (entries[entryIndexAt(entries, line)]?.endLine ?? line) + 1;
      while (next2 < lines.length && isCommentLine(lines[next2] ?? "")) next2 += 1;
      return next2;
    };
    const closed = last?.word === "endif" || last?.word === "done";
    let next = closed ? -1 : after(lastStray ?? opener.endLine);
    for (const d of indented) {
      const line = d.range.start.line;
      if (line <= opener.endLine || line > opener.spanEnd || dropped.has(d)) continue;
      if (!(lastStray !== void 0 && line <= lastStray) && line !== next) continue;
      if (line === next) next = after(line);
      dropped.add(d);
      if (opener.strays.some((s) => s.d.range.start.line === line)) continue;
      related.push({ range: d.range, message: "a command of its own: the line before it has no \\" });
    }
    for (const s of opener.strays) {
      const verb = s.word === "endif" || s.word === "done" ? "close" : "belong to";
      related.push({ range: s.d.range, message: `a command of its own, so this /${s.word} doesn't ${verb} the /${opener.word}` });
    }
    const how = cutOff(lines[opener.endLine] ?? "");
    const closer = opener.strays.find((s) => s.word === "endif" || s.word === "done");
    const backslash = how === "percent" || how === "whitespace" || how === "crlf";
    if ((backslash || closer) && opener.d.fix?.title.startsWith("Add %; /")) delete opener.d.fix;
    if (related.length === 0) continue;
    related.sort(byPosition);
    opener.d.related = [...opener.d.related ?? [], ...related];
    const cut = closer ?? opener.strays[0];
    const what = cut ? `the /${cut.word} on line ${cut.d.range.start.line + 1} is a separate command` : `line ${related[0].range.start.line + 1} starts a separate command`;
    const n = opener.endLine + 1;
    opener.d.message = how === "percent" ? `This /${opener.word} ends at the end of line ${n}, as a \\ after a % doesn't continue a line, so ${what}: end the line with a \\ that has no % before it.` : how === "crlf" ? `This /${opener.word} ends at the end of line ${n}, where the file's Windows (CRLF) line ending puts a carriage return after the \\, so ${what}: save the file with LF line endings.` : how === "whitespace" ? `This /${opener.word} ends at the end of line ${n}, where whitespace follows the \\, so ${what}: remove the whitespace.` : how === "none-crlf" ? `This /${opener.word} ends at the end of line ${n}, which has no \\, so ${what}: save the file with LF line endings, then end every line but the last with \\ (one before a carriage return doesn't continue a line).` : `This /${opener.word} ends at the end of line ${n}, which has no \\, so ${what}: end every line but the last with \\.`;
    opener.d.label = `its command ends on line ${n}`;
  }
  return diagnostics.filter((d) => !dropped.has(d));
}

// packages/core/src/loadCommands.ts
function literalText(text, pending) {
  let out = text;
  for (const level of pending) {
    if (level === "full" && /[%$\\]/.test(out)) return void 0;
    if (level === "newline") out = shortenPercents(out);
  }
  return out;
}
function shortenPercents(text) {
  return text.replace(/%(%+)/g, "$1");
}
function shortened(src, start, end) {
  let text = "";
  const map = [];
  let i = start;
  while (i < end) {
    let j = i + 1;
    if (src.text[i] === "%") while (j < end && src.text[j] === "%") j += 1;
    for (let k = j - i > 1 ? i + 1 : i; k < j; k += 1) {
      text += src.text[k];
      map.push(src.map[k === i + 1 && j - i > 1 ? i : k]);
    }
    i = j;
  }
  map.push(src.map[end]);
  return { text, map };
}
var EVAL_RE = /^\/@?eval(?=\s|$)/i;
var LOAD_RE = /^\/(@?)(load|require)(?=\s|$)/i;
var SET_RE = /^\/@?(?:set|setenv)\s+([A-Za-z_][A-Za-z0-9_]*)(?=[=\s])/i;
var EVAL_LEVELS = { off: "top", on: "newline", full: "body" };
var NUMBERED_LEVELS = ["top", "newline", "body"];
function words(text, from, to) {
  const out = [];
  let i = from;
  while (i < to) {
    while (i < to && isTfSpace(text[i])) i += 1;
    if (i >= to) break;
    const start = i;
    while (i < to && !isTfSpace(text[i])) i += 1;
    out.push({ start, end: i });
  }
  return out;
}
function optionArgument(arg) {
  const quote = arg[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return arg;
  let out = "";
  for (let i = 1; i < arg.length; i += 1) {
    const ch = arg[i];
    if (ch === quote) return i === arg.length - 1 ? out : void 0;
    if (ch === "\\" && (arg[i + 1] === quote || arg[i + 1] === "\\")) i += 1;
    out += arg[i];
  }
  return void 0;
}
function evalMode(arg) {
  const value = optionArgument(arg);
  if (value === void 0) return void 0;
  if (/^[0-9]+$/.test(value)) return NUMBERED_LEVELS[Number(value)];
  return EVAL_LEVELS[value.toLowerCase()];
}
var MAX_EVAL_DEPTH = 400;
function entryCommands(entry) {
  const out = [];
  let evalDepth = 0;
  const statement2 = (src, start, end, level, ctx) => {
    if (ctx.pending.length > 0 || level === "full") {
      command2(src, start, end, { ...ctx, pending: level === "keyword" ? ctx.pending : [...ctx.pending, level] });
    } else if (level === "newline") {
      const text = shortened(src, start, end);
      command2(text, 0, text.text.length, ctx);
    } else {
      command2(src, start, end, ctx);
    }
  };
  const command2 = (src, start, end, ctx) => {
    const text = src.text;
    const stmt = text.slice(start, end);
    const at2 = (s, e) => ({ start: src.map[s], end: src.map[e - 1] + 1 });
    const ev = EVAL_RE.exec(stmt);
    if (ev) {
      const args2 = words(text, start + ev[0].length, end);
      let mode = "body";
      let i = 0;
      for (; i < args2.length; i += 1) {
        const w = text.slice(args2[i].start, args2[i].end);
        if (w === "-" || w === "--") {
          i += 1;
          break;
        }
        if (!w.startsWith("-")) break;
        const picked = w.startsWith("-s") ? evalMode(w.slice(2)) : void 0;
        if (!picked) return;
        mode = picked;
      }
      const from = i < args2.length ? args2[i].start : end;
      if (evalDepth >= MAX_EVAL_DEPTH) return;
      evalDepth += 1;
      try {
        for (const st of parseStatements(text.slice(from, end), mode)) {
          statement2(src, from + st.start, from + st.end, st.level, {
            ...ctx,
            plain: false,
            viaEval: true,
            conditional: ctx.conditional || st.conditional
          });
        }
      } finally {
        evalDepth -= 1;
      }
      return;
    }
    const set = SET_RE.exec(stmt);
    if (set) {
      let valueStart = start + set[0].length;
      if (text[valueStart] === "=") {
        valueStart += 1;
      } else {
        while (valueStart < end && isTfSpace(text[valueStart])) valueStart += 1;
        if (valueStart >= end) return;
      }
      let valueEnd = end;
      if (src.map[end] !== void 0 && entry.text[src.map[end]] === "%") {
        while (valueEnd > valueStart && isTfSpace(text[valueEnd - 1])) valueEnd -= 1;
      }
      const where = valueEnd > valueStart ? at2(valueStart, valueEnd) : { start: src.map[valueStart - 1], end: src.map[valueStart - 1] };
      out.push({ kind: "set", name: set[1], value: text.slice(valueStart, valueEnd), ...where, ...ctx });
      return;
    }
    const m = LOAD_RE.exec(stmt);
    if (!m) return;
    const kind = m[2].toLowerCase();
    if (kind === "require" && m[1]) return;
    const args = words(text, start + m[0].length, end);
    let first = 0;
    while (first < args.length) {
      const w = text.slice(args[first].start, args[first].end);
      if (!w.startsWith("-")) break;
      if (w !== "-" && w !== "--" && !/^-q+$/.test(w)) return;
      first += 1;
      if (w === "-" || w === "--") break;
    }
    if (first >= args.length) return;
    const fileStart = args[first].start;
    const fileEnd = args[args.length - 1].end;
    const file = kind === "require" ? args.slice(first).map((w) => text.slice(w.start, w.end)).join(" ") : text.slice(fileStart, fileEnd);
    out.push({ kind, file, ...at2(fileStart, fileEnd), ...ctx });
  };
  const source = { text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) };
  for (const st of entryStatements(entry)) {
    statement2(source, st.start, st.end, st.level, {
      pending: [],
      plain: st.level === "keyword",
      viaEval: false,
      topLevel: st.level !== "full",
      conditional: st.conditional
    });
  }
  return out;
}
function entryLoads(entry) {
  return entryCommands(entry).filter((c) => c.kind !== "set");
}

// packages/core/src/data/builtinCommands.generated.ts
var BUILTIN_COMMANDS = [
  "BEEP",
  "BIND",
  "CALLLUA",
  "CONNECT",
  "CORE",
  "DC",
  "DEF",
  "DOKEY",
  "EDIT",
  "EVAL",
  "EXIT",
  "EXPORT",
  "FEATURES",
  "FG",
  "GAG",
  "HELP",
  "HILITE",
  "HISTSIZE",
  "HOOK",
  "INPUT",
  "KILL",
  "LCD",
  "LET",
  "LIMIT",
  "LIST",
  "LISTSOCKETS",
  "LISTSTREAMS",
  "LISTVAR",
  "LISTWORLDS",
  "LOAD",
  "LOADLUA",
  "LOCALECHO",
  "LOG",
  "PS",
  "PURGE",
  "PURGELUA",
  "PYTHON",
  "PYTHON_CALL",
  "PYTHON_CALL_UNSAFE",
  "PYTHON_KILL",
  "PYTHON_LOAD",
  "QUIT",
  "QUOTE",
  "RECALL",
  "RECORDLINE",
  "RELIMIT",
  "REPEAT",
  "RESTRICT",
  "SAVE",
  "SAVEWORLD",
  "SET",
  "SETENV",
  "SH",
  "SHIFT",
  "STATUS_ADD",
  "STATUS_CLEAR",
  "STATUS_EDIT",
  "STATUS_RM",
  "SUSPEND",
  "TRIGGER",
  "TRIGPC",
  "UNBIND",
  "UNDEF",
  "UNDEFN",
  "UNLIMIT",
  "UNSET",
  "UNWORLD",
  "VERSION",
  "WATCHDOG",
  "WATCHNAME"
];

// packages/core/src/substitution.ts
var SYNTAX_KINDS = /* @__PURE__ */ new Set(["substitution", "expression", "operand", "empty-statement"]);
var MACRO_DEFINER = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias)$/;
var MAX_DEPTH2 = 8;
function nextWord(s, i, end) {
  while (i < end && isTfSpace(s[i])) i += 1;
  if (i >= end) return void 0;
  const start = i;
  while (i < end && !isTfSpace(s[i])) i += 1;
  return { start, end: i };
}
function repeatArguments(s, from, to) {
  let now = false;
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    for (let k = 1; k < opt.length; k += 1) {
      const flag = opt[k];
      if (flag >= "0" && flag <= "9" || flag === ":") {
        now = false;
        break;
      }
      if (flag === "S" || flag === "P") now = true;
      else if (flag === "w") break;
      else if (flag !== "n") return void 0;
    }
  }
  if (!word || !/^(?:[iI]|0*[1-9][0-9]*)$/.test(s.slice(word.start, word.end))) return void 0;
  const command2 = nextWord(s, word.end, to);
  return command2 ? { command: command2.start, now } : void 0;
}
function evalArguments(s, from, to) {
  let mode = "body";
  const options = [];
  let word = nextWord(s, from, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    const at2 = word;
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    const picked = opt.startsWith("-s") ? evalMode(opt.slice(2)) : void 0;
    if (!picked) return void 0;
    mode = picked;
    options.push({ start: at2.start, end: at2.end, whole: true });
  }
  return { text: word ? word.start : to, mode, options };
}
function quoteCommand(s, from, to) {
  let mode = "body";
  const options = [];
  let i = from;
  let word = nextWord(s, i, to);
  while (word && s[word.start] === "-") {
    const opt = s.slice(word.start, word.end);
    const at2 = word;
    i = word.end;
    word = nextWord(s, word.end, to);
    if (opt === "-" || opt === "--") break;
    for (let k = 1; k < opt.length; k += 1) {
      const flag = opt[k];
      if (flag >= "0" && flag <= "9" || flag === ":" || flag === "w" || flag === "d") break;
      if (flag === "s") {
        const picked = evalMode(opt.slice(k + 1));
        if (!picked) return void 0;
        mode = picked;
        options.push(k === 1 ? { start: at2.start, end: at2.end, whole: true } : { start: at2.start + k, end: at2.end, whole: false });
        break;
      }
      if (flag !== "P" && flag !== "S") return void 0;
    }
  }
  if (word) i = word.start;
  while (i < to && s[i] !== "'" && s[i] !== "!" && s[i] !== "#" && s[i] !== "`") i += s[i] === "\\" ? 2 : 1;
  if (i >= to || s[i] !== "`") return void 0;
  i += 1;
  if (s[i] !== '"') return { start: i, end: to, mode, options };
  let end = i + 1;
  while (end < to && s[end] !== '"') end += s[end] === "\\" ? 2 : 1;
  return { start: i + 1, end: Math.min(end, to), mode, options };
}
function atCommand(s, from, to) {
  let word = nextWord(s, from, to);
  while (word && /^-(?:v*|-)$/.test(s.slice(word.start, word.end))) {
    const end = s.slice(word.start, word.end) === "--";
    word = nextWord(s, word.end, to);
    if (end) break;
  }
  if (word && /^(?:\d{2}(?:\d{2})?-)?\d{1,2}[-/]\d{1,2}$/.test(s.slice(word.start, word.end))) word = nextWord(s, word.end, to);
  const command2 = word && nextWord(s, word.end, to);
  return command2?.start;
}
function stringsIn(s, from, to, known) {
  const strings = [];
  const cmdsubs = [];
  for (let k = from; k < to; k += 1) {
    if (s[k] === "$" && s[k + 1] === "(") {
      let inner2 = known.find((c) => c.start === k + 2);
      if (!inner2) {
        const read = parseRegions(s.slice(k, to), "body").cmdsubs.find((c) => c.start === 2);
        inner2 = read ? { start: k + 2, end: k + read.end } : { start: k + 2, end: to };
      }
      cmdsubs.push(inner2);
      k = inner2.end;
      continue;
    }
    const quote = s[k];
    if (quote !== '"' && quote !== "'" && quote !== "`") continue;
    let end = k + 1;
    while (end < to && s[end] !== quote) end += s[end] === "\\" ? 2 : 1;
    strings.push({ start: k, end: Math.min(end + 1, to) });
    k = end;
  }
  return { strings, cmdsubs };
}
var cache2 = /* @__PURE__ */ new WeakMap();
function entrySubstitution(entry) {
  let model = cache2.get(entry);
  if (model) return model;
  const contexts = new Array(entry.text.length).fill("keyword");
  const inExpression = new Array(entry.text.length).fill(false);
  const statements = [];
  const issues = [];
  model = { contexts, inExpression, statements, issues };
  const seen = /* @__PURE__ */ new Set();
  const collect = (src, found) => {
    const base = src.map[0];
    const plain = src.map.every((v, k) => v === base + k);
    const at2 = (start, end) => {
      const own = src.map[start];
      const next = src.map[start + 1];
      const from = end > start && next !== void 0 ? Math.max(own, next - 1) : own;
      return { start: from, end: end > start ? Math.max(from + 1, src.map[end - 1] + 1) : from };
    };
    for (const issue of found) {
      if (!SYNTAX_KINDS.has(issue.kind)) continue;
      const { fix, related, ...rest } = issue;
      const out = { ...rest, ...at2(issue.start, issue.end) };
      if (related) out.related = related.map((n) => ({ ...n, ...at2(n.start, n.end) }));
      if (fix && plain) out.fix = { ...fix, edits: fix.edits.map((e) => ({ ...e, start: e.start + base, end: e.end + base })) };
      const key2 = `${out.start}:${out.end}:${out.message}`;
      if (seen.has(key2)) continue;
      seen.add(key2);
      issues.push(out);
    }
  };
  const mark = (src, from, to, context, expression2 = false) => {
    for (let k = from; k < to; k += 1) {
      const at2 = src.map[k];
      if (at2 !== void 0 && at2 < contexts.length) {
        contexts[at2] = context;
        inExpression[at2] = expression2;
      }
    }
  };
  const expressions = (src, list, known) => {
    for (const ex of [...list].sort((a, b) => a.start - b.start || b.end - a.end)) {
      mark(src, ex.start, ex.end, "expression", true);
      const { strings, cmdsubs } = stringsIn(src.text, ex.start, ex.end, known);
      for (const str of strings) mark(src, str.start, str.end, ex.kind === "statement" ? ex.level ?? "keyword" : "string", true);
      for (const c of cmdsubs) mark(src, c.start, c.end, "full");
    }
  };
  const sub = (src, from, to = src.text.length) => ({
    text: src.text.slice(from, to),
    map: src.map.slice(from, to + 1)
  });
  const built = (src, parts) => {
    let text = "";
    const map = [];
    parts.forEach((part, k) => {
      if (typeof part !== "string") {
        text += src.text.slice(part.start, part.end);
        for (let k2 = part.start; k2 < part.end; k2 += 1) map.push(src.map[k2]);
        return;
      }
      const next = parts.slice(k + 1).find((p) => typeof p !== "string");
      const prev = parts.slice(0, k).reverse().find((p) => typeof p !== "string");
      const at2 = next ? src.map[next.start] : prev ? src.map[prev.end - 1] : src.map[0];
      text += part;
      for (let i = 0; i < part.length; i += 1) map.push(at2);
    });
    map.push(map[map.length - 1] ?? src.map[0]);
    return { text, map };
  };
  const forEnd = (h, name, to) => {
    const wrapped = built(h, ["/while ( ", name, " <= ", to, " ) x%; /done"]);
    const nameStart = "/while ( ".length;
    const nameEnd = nameStart + (name.end - name.start);
    const endStart = nameEnd + " <= ".length;
    const endEnd = endStart + (to.end - to.start);
    const whole = (word) => !parseRegions(`/test ${h.text.slice(word.start, word.end)}`, "top").issues.some((i) => i.kind === "expression" || i.kind === "substitution");
    const blame = (start, end, what, advice) => {
      const written = wrapped.text.slice(start, end);
      return {
        kind: "expression",
        start,
        end,
        message: `This /for's ${what}, ${written}, isn't a complete ${what === "END" ? "expression" : "variable name"}: ${advice}.`,
        label: `not a complete ${what === "END" ? "expression" : "name"}`,
        explanation: `stdlib's ${code("/for")} compares the loop variable with END in a condition, ${code("/while ( VAR <= END )")}, so each has to be whole on its own. This one leaves something open that the condition around it would have to close.`
      };
    };
    const kept = [];
    let said = false;
    const varName = h.text.slice(name.start, name.end);
    if (!/[%$\\{]/.test(varName) && !/^[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*$/.test(varName)) {
      kept.push({
        ...blame(nameStart, nameEnd, "variable", "write a name, such as i"),
        explanation: `stdlib's ${code("/for")} sets the loop variable with ${code("/let VAR=START")}, and tf takes only a name there: letters, digits and ${code("_")}, not starting with a digit.`
      });
      said = true;
    }
    for (const issue of parseRegions(wrapped.text, "body").issues) {
      if (issue.kind === "empty-statement") continue;
      if (issue.start >= endStart && issue.start < endEnd) kept.push(issue);
      else if (issue.start >= nameStart && issue.start < nameEnd) continue;
      else if (!said) {
        said = true;
        if (!whole(to)) kept.push(blame(endStart, endEnd, "END", "write a number, or an expression that closes"));
        else if (!whole(name)) kept.push(blame(nameStart, nameEnd, "variable", "write a name, such as i"));
      }
    }
    collect(wrapped, kept);
  };
  const read = (src, mode, depth, viaEval, issues2 = true) => {
    const s = src.text;
    const regions = parseRegions(s, mode);
    if (issues2) collect(src, regions.issues);
    if (mode === "body") {
      mark(src, 0, s.length, "full");
      expressions(src, regions.expressions, regions.cmdsubs);
      return;
    }
    const split = mode === "newline" || regions.blocks.length > 0 || regions.statements.length > 1;
    mark(src, 0, s.length, split ? "newline" : "keyword");
    for (const st of regions.statements) {
      mark(src, st.start, st.end, st.level);
      const word = commandWord(s, st.start);
      const out = {
        start: src.map[st.start],
        end: st.end > st.start ? src.map[st.end - 1] + 1 : src.map[st.start],
        level: st.level,
        word
      };
      if (viaEval) out.viaEval = viaEval;
      statements.push(out);
      if (depth >= MAX_DEPTH2) continue;
      const argStart = st.start + (word ? COMMAND_RE.exec(s.slice(st.start))?.[0].length ?? 0 : 0);
      const handed = (from) => st.level === "newline" ? shortened(src, from, st.end) : sub(src, from, st.end);
      if (MACRO_DEFINER.test(word)) {
        const body = macroBodyStart(s.slice(st.start, st.end));
        if (body >= 0) {
          out.body = src.map[st.start + body];
          read(handed(st.start + body), "body", depth + 1, void 0);
        }
      } else if (word === "for") {
        const h = handed(argStart);
        read(h, "body", depth + 1, void 0, false);
        const words2 = [];
        for (let w = nextWord(h.text, 0, h.text.length); w && words2.length < 4; w = nextWord(h.text, w.end, h.text.length)) words2.push(w);
        const [name, from, to, command2] = words2;
        if (name && from) read(built(h, ["/let ", name, "=", from]), "body", depth + 1, void 0);
        if (name && to) forEnd(h, name, to);
        if (command2) read(sub(h, command2.start), "body", depth + 1, void 0);
      } else if (word === "repeat") {
        const h = handed(argStart);
        const r = repeatArguments(h.text, 0, h.text.length);
        if (r) read(sub(h, r.command), "body", depth + 1, void 0);
      } else if (word === "at") {
        const h = handed(argStart);
        const command2 = atCommand(h.text, 0, h.text.length);
        if (command2 !== void 0) read(sub(h, command2), "body", depth + 1, void 0);
      } else if (word === "quote" || word === "eval") {
        const h = handed(argStart);
        const r = word === "quote" ? quoteCommand(h.text, 0, h.text.length) : evalArguments(h.text, 0, h.text.length);
        if (!r) continue;
        const [from, to] = "text" in r ? [r.text, h.text.length] : [r.start, r.end];
        const options = r.options.map((o) => ({ start: h.map[o.start], end: h.map[o.end - 1] + 1, whole: o.whole }));
        read(sub(h, from, to), r.mode, depth + 1, r.mode === "body" ? void 0 : { command: word, mode: r.mode, options });
      }
    }
    for (const ex of regions.expressions) {
      if (ex.kind !== "statement") continue;
      let start = ex.start;
      while (start > 0 && isTfSpace(s[start - 1])) start -= 1;
      while (start > 0 && s[start] !== "/") start -= 1;
      const out = {
        start: src.map[start],
        end: ex.end > start ? src.map[ex.end - 1] + 1 : src.map[start],
        level: ex.level ?? "keyword",
        word: commandWord(s, start)
      };
      if (viaEval) out.viaEval = viaEval;
      statements.push(out);
    }
    expressions(src, regions.expressions, regions.cmdsubs);
  };
  read({ text: entry.text, map: Array.from({ length: entry.text.length + 1 }, (_, i) => i) }, "top", 0, void 0);
  cache2.set(entry, model);
  return model;
}

// packages/core/src/rules/notSubstitutedHere.ts
var PERCENT_NAME_RE = /%[A-Za-z_][A-Za-z0-9_]*/g;
var SEPARATOR_RE = /%;/g;
var BLOCK_KEYWORDS = /* @__PURE__ */ new Set(["then", "else", "elseif", "endif", "do", "done"]);
var VALUE_COMMANDS = /* @__PURE__ */ new Set(["set", "let", "setenv"]);
var MAX_BLOCK_CHECKS = 64;
function substitutionEnd(text, at2, limit) {
  const closer = (opener) => opener === "{" ? "}" : opener === "[" ? "]" : ")";
  const open = [closer(text[at2 + 1])];
  let i = at2 + 2;
  while (i < limit) {
    const ch = text[i];
    const next = text[i + 1];
    if ((ch === "%" || ch === "$") && next === ch) {
      while (text[i + 1] === ch) i += 1;
      i += 1;
    } else if ((ch === "%" || ch === "$") && next === "{" || ch === "$" && (next === "[" || next === "(")) {
      open.push(closer(next));
      i += 2;
    } else if (ch === open[open.length - 1]) {
      open.pop();
      i += 1;
      if (open.length === 0) return i;
    } else {
      i += 1;
    }
  }
  return limit;
}
function percentBraces(text, limitOf) {
  const found = [];
  let pos = 0;
  for (let at2 = text.indexOf("%{"); at2 >= 0; at2 = text.indexOf("%{", pos)) {
    pos = at2 + 2;
    if (text[at2 - 1] === "%") continue;
    const limit = Math.max(limitOf(at2), at2 + 2);
    const read = parseRegions(text.slice(at2, limit), "body");
    const stop = read.stopped ? read.issues[read.issues.length - 1]?.start ?? 0 : limit - at2;
    let covered = 0;
    for (const span of [...read.spans].sort((a, b) => a.start - b.start || b.end - a.end)) {
      if (span.start >= stop) break;
      if (span.kind !== "substitution" || !span.inner || span.start < covered) continue;
      if (text[at2 + span.start] !== "%" || text[at2 + span.start + 1] !== "{") continue;
      found.push({ index: at2 + span.start, text: text.slice(at2 + span.start, at2 + span.end) });
      covered = span.end;
    }
    if (!read.stopped) {
      const deep = read.issues.find((i) => i.kind === "too-deep");
      const opener2 = deep ? text.indexOf("%{", at2 + covered) : -1;
      if (opener2 < 0 || opener2 >= at2 + deep.start) {
        pos = Math.max(pos, limit);
        continue;
      }
      const end = substitutionEnd(text, opener2, limit);
      if (text[end - 1] === "}") found.push({ index: opener2, text: text.slice(opener2, end) });
      pos = Math.max(pos, end);
      continue;
    }
    const opener = text.lastIndexOf("%{", at2 + stop);
    pos = Math.max(pos, opener >= at2 + covered ? substitutionEnd(text, opener, limit) : at2 + stop + 1);
  }
  return found;
}
var SELECTOR_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[#?*]|-L?[0-9]*|L[0-9]*|P[0-9]+)$/;
var PLAIN_DEFAULT_RE = /^[^%${}\\]*$/;
var BUILTINS = new Set(BUILTIN_COMMANDS.map((c) => c.toLowerCase()));
function notABuiltin(parts) {
  const afterBangs = parts.prefix.replace(/^!*/, "");
  if (!afterBangs.startsWith("@")) return false;
  return !BUILTINS.has(`${afterBangs.slice(1)}${parts.word}`);
}
var NOT_PLAIN_COMMAND_RE = /^\/[@!]*(?:if|elseif|else|endif|while|do|done|then|break|test|return|result|exit)(?![^\s%])/i;
function plainSubstitutions(s) {
  if (NOT_PLAIN_COMMAND_RE.test(s.trimStart())) return false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "$" || ch === "\\") return false;
    if (ch !== "%") continue;
    if (s[i + 1] === "{") {
      const close = s.indexOf("}", i + 2);
      if (close < 0) return false;
      const inner2 = s.slice(i + 2, close);
      const m2 = /^(-L?[0-9]*|[^-]*)(?:-(.*))?$/s.exec(inner2);
      if (!m2 || !SELECTOR_RE.test(m2[1]) || m2[2] !== void 0 && !PLAIN_DEFAULT_RE.test(m2[2])) return false;
      i = close;
      continue;
    }
    const m = /^%(-L?[0-9]+|-L|[0-9]+|[#?*]|[A-Za-z_][A-Za-z0-9_]*)(-[^\s]*)?/.exec(s.slice(i));
    if (!m || m[2] !== void 0 && !PLAIN_DEFAULT_RE.test(m[2].slice(1))) return false;
    i += m[0].length - 1;
  }
  return true;
}
function statementIndex(statements, length) {
  const owner = new Int32Array(length).fill(-1);
  const inIfLine = new Array(statements.length).fill(false);
  statements.forEach((st, k) => {
    const around = st.start < length ? owner[st.start] : -1;
    const outer = around >= 0 ? statements[around] : void 0;
    inIfLine[k] = st.level === "newline" || outer !== void 0 && st.end <= outer.end && inIfLine[around];
    owner.fill(k, Math.max(0, st.start), Math.min(length, st.end));
  });
  const position = new Map(statements.map((st, k) => [st, k]));
  return {
    at: (offset) => {
      const k = offset >= 0 && offset < length ? owner[offset] : -1;
      return k >= 0 ? statements[k] : void 0;
    },
    inIfLine: (st) => inIfLine[position.get(st) ?? -1] ?? false
  };
}
function evalName(e) {
  return `/${e.command} -s${e.mode === "top" ? "off" : "on"}`;
}
function optionName(text, o) {
  return `${o.whole ? "" : "-"}${text.slice(o.start, o.end)}`;
}
var notSubstitutedHere = {
  id: "not-substituted-here",
  severity: "warning",
  scope: "entry",
  check(entry) {
    const text = entry.text;
    const { contexts, inExpression, statements } = entrySubstitution(entry);
    const index = statementIndex(statements, text.length);
    const unsubstituted = (at2) => {
      const c = contexts[at2];
      if (c !== "keyword" && c !== "newline") return false;
      const st = index.at(at2);
      return !(st && st.body !== void 0 && at2 < st.body);
    };
    const dropOptions = (e) => e.options.map((o) => {
      let end = o.end;
      while (o.whole && end < text.length && isTfSpace(text[end])) end += 1;
      return { start: o.start, end, newText: "" };
    });
    const out = [];
    const judge = (st) => {
      if (!st) return { kind: "other" };
      const written = text.slice(st.start, st.end);
      const identity = { text: written, map: Array.from({ length: written.length + 1 }, (_, k) => k) };
      const { text: s, map } = index.inIfLine(st) ? shortened(identity, 0, written.length) : identity;
      const issue = parseRegions(s, "body").issues.find((i) => i.kind === "substitution");
      if (issue) {
        const from = Math.min(issue.start, ...(issue.related ?? []).map((n) => n.start));
        let to = issue.end;
        while (to < s.length && !isTfSpace(s[to])) to += 1;
        return { kind: "rejected", bad: written.slice(map[from], to > from ? map[to - 1] + 1 : map[from]) };
      }
      return plainSubstitutions(s) && !written.includes("%%") ? { kind: "plain" } : { kind: "other" };
    };
    const judged = /* @__PURE__ */ new Map();
    const judgeOnce = (st) => {
      if (!judged.has(st)) judged.set(st, judge(st));
      return judged.get(st);
    };
    const blockError = (s, mode) => parseRegions(s, mode).issues.some((i) => i.kind === "block" || i.kind === "continuation");
    const blockChecks = /* @__PURE__ */ new Map();
    const blockChecksLeft = (st) => {
      const used = blockChecks.get(st) ?? 0;
      blockChecks.set(st, used + 1);
      return used < MAX_BLOCK_CHECKS;
    };
    const openWithSon = /* @__PURE__ */ new Map();
    const blockErrorOnce = (st) => {
      if (!openWithSon.has(st)) openWithSon.set(st, blockError(text.slice(st.start, st.end), "newline"));
      return openWithSon.get(st);
    };
    const rejected = (bad) => `It also holds ${code(bad)}, which tf can't read as a substitution. Substituting the command as written would make tf reject it, where today it runs with the text as it is, so fix that first.`;
    const compiled = `It also holds more than variables to substitute, such as a ${code("$[...]")}, a ${code("%;")} or a ${code("\\")}, and substituting it would compile those too, so look at what that would do first.`;
    const variable = (start, written) => {
      const st = index.at(start);
      const at2 = st?.start ?? 0;
      const base = {
        start,
        end: start + written.length,
        label: "not substituted"
      };
      const judgement = judgeOnce(st);
      if (st?.viaEval) {
        const name = evalName(st.viaEval);
        const runs2 = `${code(name)} runs its text ${st.viaEval.mode === "top" ? "as a plain line of a file is run" : "as a top-level /if line is run"}, without substituting variables, so the command gets the text ${code(written)}.`;
        out.push({
          ...base,
          message: judgement.kind === "rejected" ? `${written} stays as it is in ${name} text, and without -s tf would reject this text as written: fix ${judgement.bad} first.` : judgement.kind === "other" ? `${written} stays as it is in ${name} text; without -s the rest of the text would be substituted too, so check it before leaving out the -s.` : `${written} stays as it is in ${name} text: leave out the -s option to substitute it.`,
          explanation: judgement.kind === "rejected" ? `${runs2} ${rejected(judgement.bad)}` : judgement.kind === "other" ? `${runs2} ${compiled}` : `${runs2} Without ${code("-s")}, ` + (st.viaEval.command === "eval" ? `${code("/eval")} substitutes its text once and then runs it.` : `${code("/quote")} runs the command as a macro body is run, substituting it.`),
          ...judgement.kind === "plain" ? { fix: { title: `Leave out ${optionName(text, st.viaEval.options.at(-1))}`, edits: dropOptions(st.viaEval) } } : {}
        });
        return;
      }
      const where = st?.level === "newline" ? "in a top-level /if or /while line" : "in a command at the top level of a file";
      const runs = `tf runs the commands in a file without substituting variables, so the command gets the text ${code(written)}, not the variable's value. Inside a top-level ${code("/if")} or ${code("/while")} line, ${code("%;")} separates commands but still nothing is substituted.`;
      out.push({
        ...base,
        message: judgement.kind === "rejected" ? `${written} stays as it is ${where}, and /eval would reject this command as written: fix ${judgement.bad} first.` : judgement.kind === "other" ? `${written} stays as it is ${where}; /eval in front would substitute the rest of the command too, so check it before using /eval.` : `${written} stays as it is ${where}: put /eval in front of the command to substitute it.`,
        explanation: judgement.kind === "rejected" ? `${runs} ${rejected(judgement.bad)}` : judgement.kind === "other" ? `${runs} ${compiled}` : `${runs} In a ${code("/def")} body it would be substituted when the macro runs, and in a condition or ${code("/test")} it is read as a variable. ${code("/eval")} substitutes the rest of the command once and then runs it: ${code(`/eval ${text.slice(at2).split(/\s/, 1)[0]} ...`)}`,
        ...judgement.kind === "plain" ? { fix: { title: "Put /eval in front of the command", edits: [{ start: at2, end: at2, newText: "/eval " }] } } : {}
      });
    };
    for (const m of percentBraces(text, (at2) => index.at(at2)?.end ?? text.length)) {
      const at2 = m.index;
      if (unsubstituted(at2)) {
        variable(at2, m.text);
      } else if (contexts[at2] === "string") {
        const name = /^%\{([^}-]*)/.exec(m.text)?.[1] ?? "";
        out.push({
          start: at2,
          end: at2 + m.text.length,
          message: `${m.text} stays as it is inside a string in an expression: take it out of the quotes and write {${name}}, as in strcat("...", {${name}}).`,
          label: "not substituted",
          explanation: `An expression doesn't substitute inside its strings, and nothing else does in a condition or ${code("$[...]")}, even in a macro body, so the string holds the text ${code(m.text)}. Outside the quotes, ${code(`{${name}}`)} reads the variable: ${code(`strcat("a", {${name}}, "b")`)}.`
        });
      }
    }
    for (const load of entryLoads(entry)) {
      if (load.pending.includes("full")) continue;
      for (const m of text.slice(load.start, load.end).matchAll(PERCENT_NAME_RE)) {
        const at2 = load.start + m.index;
        if (text[at2 - 1] !== "%" && unsubstituted(at2)) variable(at2, m[0]);
      }
    }
    for (const m of text.matchAll(SEPARATOR_RE)) {
      const at2 = m.index;
      if (text[at2 - 1] === "%" || contexts[at2] !== "keyword" || inExpression[at2]) continue;
      const st = index.at(at2);
      if (!st || st.body !== void 0) continue;
      const gluedAt = gluedKeywordAt(text, st.start);
      if (gluedAt && (text[gluedAt.nameEnd] === "(" || text[gluedAt.nameEnd] === "/")) continue;
      let next = at2 + 2;
      while (next < st.end && isTfSpace(text[next])) next += 1;
      if (next >= st.end) continue;
      const name = st.word ? `/${st.word}` : "the text";
      const where = st.viaEval ? `in ${evalName(st.viaEval)} text` : "on a plain top-level line";
      const value = VALUE_COMMANDS.has(st.word);
      const advice = st.viaEval ? `give the /${st.viaEval.command} -son, or leave out the -s option` : value ? "if they are meant as commands, put each on a line of its own" : "put each command on a line of its own, or start the line with /eval";
      const match = {
        start: at2,
        end: at2 + 2,
        severity: "information",
        message: value ? `%; doesn't end a command ${where}, so the ${name} value includes it and the rest of the line: ${advice}.` : `%; doesn't end a command ${where}, so it and the rest of the line are part of ${name}: ${advice}.`,
        label: "not a separator",
        explanation: `tf reads ${st.viaEval ? `${code(evalName(st.viaEval))} text as a plain line of a file is read` : "a plain line of a file"} without substitution, so ${code("%;")} is just text there and ${name === "the text" ? "the line" : code(name)} gets all of ${code(text.slice(st.start, st.end))}. ${code("%;")} separates commands in a ${code("/def")} body, in ${code("/eval")} text, and on a line that starts with ${code("/if")} or ${code("/while")}.` + (value ? ` A value holding ${code("%;")} can be meant, for a later ${code("/eval")} to run.` : "")
      };
      const parts = text[next] === "/" ? commandParts(text, next) : void 0;
      const nextWord3 = parts?.word;
      const keywordName = nextWord3 === "if" || nextWord3 === "while" || BLOCK_KEYWORDS.has(nextWord3 ?? "");
      const glued = /^(?:if|elseif|while)\(/.test(nextWord3 ?? "");
      const notAKeyword = glued || keywordName && parts.prefix !== "" && parts.prefix !== "@";
      const keyword = keywordName && (parts.prefix === "" || parts.prefix === "@");
      const command2 = nextWord3 !== void 0 && !BLOCK_KEYWORDS.has(nextWord3) && !notAKeyword && (keyword || !notABuiltin(parts));
      const opensBlock = nextWord3 === "if" || nextWord3 === "while";
      const splits = st.viaEval ? !blockErrorOnce(st) : !opensBlock || blockChecksLeft(st) && !blockError(text.slice(next, st.end), "top");
      const sendsText = st.viaEval !== void 0 && nextWord3 === void 0;
      if ((command2 || sendsText) && !value && splits) {
        if (st.viaEval) {
          const last = st.viaEval.options.at(-1);
          match.fix = {
            title: `Give the /${st.viaEval.command} -son`,
            edits: [{ start: last.start, end: last.end, newText: last.whole ? "-son" : "son" }]
          };
        } else if (entry.offsetMap[at2]?.line === entry.offsetMap[next]?.line) {
          match.fix = { title: "Put the next command on a line of its own", edits: [{ start: at2, end: next, newText: "\n" }] };
        }
      }
      out.push(match);
    }
    return out;
  }
};

// packages/core/src/rules/keywordMidStatement.ts
var keywordMidStatement = {
  id: "keyword-mid-statement",
  severity: "error",
  scope: "entry",
  check(entry) {
    const matches = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "keyword" && issue.kind !== "keyword-warning") continue;
      const { kind, ...match } = issue;
      matches.push(kind === "keyword-warning" ? { ...match, severity: "warning" } : match);
    }
    const text = entry.text;
    for (const w of entrySwallowed(entry)) {
      if (!w.stray) continue;
      const what = swallower(text, w.stmt, w.start, w.command);
      const keyword = text.slice(w.start, w.end);
      matches.push({
        start: w.start,
        end: w.end,
        message: what.endsWith(" value") ? `This ${keyword} is part of ${what}, not a command, so ${w.stray.message}: put %; before it.` : `${keyword} here is not a keyword: it is part of ${what}, so ${w.stray.message}: put %; before it.`,
        label: `part of ${what}`,
        explanation: `tf only reads a keyword at the start of a statement, and statements are separated by ${code("%;")}. ${takesTheRest(w.command, w.word, what)} So the block it would have opened isn't there, and ${code(text.slice(w.stray.start, w.stray.end))} after it has nothing to belong to, which is the error tf reports.`,
        related: [{ start: w.stray.start, end: w.stray.end, message: w.stray.message }],
        fix: { title: `Put %; before ${keyword}`, edits: w.edits }
      });
    }
    return matches;
  }
};

// packages/core/src/rules/conditionListText.ts
var conditionListText = {
  id: "condition-list-text",
  severity: "warning",
  scope: "entry",
  check(entry) {
    const matches = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "condition-text") continue;
      const { kind: _kind, ...match } = issue;
      matches.push(match);
    }
    return matches;
  }
};

// packages/core/src/rules/keywordNeedsSpace.ts
var keywordNeedsSpace = {
  id: "keyword-needs-space",
  severity: "error",
  scope: "entry",
  check(entry, file) {
    const matches = [];
    for (const issue of entryStructure(entry)) {
      if (issue.kind !== "glued" && issue.kind !== "glued-punct") continue;
      const { kind, ...match } = issue;
      if (kind === "glued-punct") {
        const name = entry.text.slice(issue.start + 1, issue.end);
        if (!name.startsWith("@") && file.macros.has(name.toLowerCase())) continue;
        matches.push({ ...match, severity: "warning" });
      } else matches.push(match);
    }
    return matches;
  }
};

// packages/core/src/rules/substitutionInExpression.ts
var substitutionInExpression = {
  id: "substitution-in-expression",
  severity: "warning",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "operand").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/indentedLineAfterCommand.ts
function check(text) {
  const lines = splitRawLines(text);
  const matches = [];
  let newCmd = true;
  let lastCmdLine = 0;
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";
    if (isCommentLine(line)) continue;
    const i = leadingWhitespaceLength(line);
    const isBlank = i >= line.length;
    if (isBlank) {
      lastCmdLine = 0;
      newCmd = true;
      continue;
    }
    const startsIndented = i > 0;
    if (newCmd && startsIndented && lastCmdLine > 0) {
      const previous = lastCmdLine - 1;
      const prevLine = lines[previous] ?? "";
      let prevEnd = prevLine.length;
      while (prevEnd > 0 && isTfSpace(prevLine[prevEnd - 1])) prevEnd -= 1;
      matches.push({
        line: idx,
        startChar: 0,
        endChar: i,
        message: `Line ${lastCmdLine} has no \\ at the end, so this indented line starts a new command: end line ${lastCmdLine} with \\ to continue it, or remove the indentation.`,
        label: "starts a new command",
        explanation: `tf joins a line onto the one before it only when that one ends in ${code("\\")}. This line is indented as if it continued line ${lastCmdLine}, but tf runs it as a command of its own, and warns ${code("possibly missing trailing \\")}.`,
        related: [{ line: previous, startChar: Math.max(prevEnd - 1, 0), endChar: prevEnd, message: "no \\ at the end of this line" }]
      });
    }
    lastCmdLine = idx + 1;
    newCmd = !continuesToNextLine(line);
  }
  return matches;
}
var indentedLineAfterCommand = {
  id: "indented-line-after-command",
  severity: "warning",
  scope: "file",
  check
};

// packages/core/src/rules/backslashNotLast.ts
function check2(text) {
  const lines = splitRawLines(text);
  const matches = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx] ?? "";
    if (isCommentLine(line) || isBlankLine(line)) continue;
    if (line.endsWith("\\")) continue;
    let end = line.length - 1;
    while (end > 0 && isTfSpace(line[end])) end -= 1;
    if (line[end] !== "\\") continue;
    const after = line.slice(end + 1);
    const detail = line[end - 1] === "%" ? {
      message: "This %\\ doesn't continue the line, with or without the whitespace after it: to continue, end the line with a \\ that has no % before it.",
      label: "%\\ never continues",
      explanation: `tf continues a line onto the next one only when its very last character is a ${code("\\")} that doesn't follow a ${code("%")}: a line ending in ${code("%\\")} is a complete command. tf also warns ${code("whitespace following final '\\'")} about the whitespace after it.`
    } : after === "\r" ? {
      message: "This \\ doesn't continue the line, because the file's Windows (CRLF) line endings put a carriage return after it: save the file with LF line endings.",
      label: "carriage return after the \\",
      explanation: `A line continues onto the next one only when ${code("\\")} is its very last character. tf keeps the carriage return of a CRLF line ending as part of the line, and counts it as whitespace, so no line in this file can continue. Save the file with LF line endings.`
    } : {
      message: "This \\ doesn't continue the line, because whitespace follows it: remove the whitespace.",
      label: "whitespace after the \\",
      explanation: `A line continues onto the next one only when ${code("\\")} is its very last character. With whitespace after it, tf runs this line as a command of its own, and warns ${code("whitespace following final '\\'")}.`
    };
    const fixable = !after.includes("\r") && line[end - 1] !== "%";
    matches.push({
      line: idx,
      startChar: end,
      endChar: line.length,
      ...detail,
      ...fixable ? { fix: { title: "Remove the whitespace after the \\", edits: [{ line: idx, startChar: end + 1, endChar: line.length, newText: "" }] } } : {}
    });
  }
  return matches;
}
var backslashNotLast = {
  id: "backslash-not-last",
  severity: "warning",
  scope: "file",
  check: check2
};

// packages/core/src/rules/substitutionSyntax.ts
var substitutionSyntax = {
  id: "substitution-syntax",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "substitution").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/data/keywordCommands.generated.ts
var KEYWORD_COMMANDS = [
  "BREAK",
  "DO",
  "DONE",
  "ELSE",
  "ELSEIF",
  "ENDIF",
  "EXIT",
  "IF",
  "LET",
  "RESULT",
  "RETURN",
  "SET",
  "SETENV",
  "TEST",
  "THEN",
  "WHILE"
];

// packages/core/src/data/stdlibCommands.generated.ts
var STDLIB_COMMANDS = [
  ":",
  "_echo",
  "_paste",
  "act",
  "adddiku",
  "addlp",
  "addlpp",
  "addtelnet",
  "addtiny",
  "addworld",
  "background",
  "bamf",
  "bg",
  "borg",
  "cat",
  "cd",
  "cleardone",
  "clearfull",
  "echo",
  "escape",
  "expr",
  "false",
  "first",
  "for",
  "gpri",
  "grab",
  "hilite_page",
  "hilite_whisper",
  "hpri",
  "insert",
  "isize",
  "ismacro",
  "isvar",
  "kecho",
  "last",
  "listbind",
  "listdef",
  "listfullhilite",
  "listgag",
  "listhilite",
  "listhook",
  "listpartial",
  "listtrig",
  "loaded",
  "loadhist",
  "login",
  "lp",
  "lpquote",
  "man",
  "mecho",
  "more",
  "nogag",
  "nohilite",
  "nohilite_page",
  "nohilite_whisper",
  "nolog",
  "nologin",
  "noquiet",
  "not",
  "nowrap",
  "nth",
  "partial",
  "paste",
  "prompt",
  "proxy_command",
  "proxy_connect",
  "proxy_hook",
  "ptime",
  "purgebind",
  "purgedef",
  "purgedeft",
  "purgegag",
  "purgehilite",
  "purgehook",
  "purgetrig",
  "purgeworld",
  "pwd",
  "qecho",
  "quiet",
  "quitdone",
  "rand",
  "redef",
  "replace",
  "reply",
  "require",
  "rest",
  "retry",
  "retry_off",
  "runtime",
  "savehilite",
  "send",
  "send_help",
  "shpause",
  "signal",
  "sockmload",
  "split",
  "sub",
  "substitute",
  "sys",
  "telnet",
  "time",
  "toggle",
  "trig",
  "trigc",
  "trigp",
  "true",
  "undeft",
  "unhook",
  "untrig",
  "ver",
  "vercmp",
  "visual",
  "world",
  "wrap",
  "wrapspace",
  "~con_hook_telnet",
  "~def_file_command",
  "~default_login_hook",
  "~detect_worldtype_hook",
  "~do_prefix",
  "~gagloadfail",
  "~login_hook_lp",
  "~login_hook_lpp",
  "~login_hook_telnet",
  "~login_hook_tiny",
  "~send",
  "~telnet_passwd",
  "~world_hook_lp",
  "~world_hook_lpp",
  "~world_hook_prompt",
  "~world_hook_telnet",
  "~world_hook_tiny"
];

// packages/core/src/data/commands.ts
function dedupe(infos) {
  const seen = /* @__PURE__ */ new Map();
  for (const info of infos) {
    const key2 = info.name.toLowerCase();
    if (!seen.has(key2)) seen.set(key2, info);
  }
  return [...seen.values()];
}
var ALL_COMMANDS = dedupe([
  ...KEYWORD_COMMANDS.map((name) => ({ name, source: "keyword" })),
  ...BUILTIN_COMMANDS.map((name) => ({ name, source: "builtin" })),
  ...STDLIB_COMMANDS.map((name) => ({ name, source: "stdlib" }))
]);
var RESERVED_MACRO_NAMES = new Set([...KEYWORD_COMMANDS, "EVAL"].map((n) => n.toLowerCase()));

// packages/core/src/rules/invalidMacroName.ts
var DEF_PREFIX_RE = /^!*@?$/;
var invalidMacroName = {
  id: "invalid-macro-name",
  severity: "error",
  scope: "entry",
  check(entry) {
    const text = entry.text;
    let start = 0;
    while (text[start] === " " || text[start] === "	") start += 1;
    const { prefix, word } = commandParts(text, start);
    if (word !== "def" || !DEF_PREFIX_RE.test(prefix)) return [];
    const after = start + 1 + prefix.length + word.length;
    if (after < text.length && text[after] !== " " && text[after] !== "	") return [];
    if (defHasInvalidOption(text, after)) return [];
    const opts = defOptionsEnd(text, after);
    const eq = text.indexOf("=", opts);
    let from = opts;
    let to = eq === -1 ? text.length : eq;
    while (from < to && /\s/.test(text[from])) from += 1;
    while (to > from && /\s/.test(text[to - 1])) to -= 1;
    if (to === from) return [];
    const name = text.slice(from, to);
    const span = { start: from, end: to };
    if (RESERVED_MACRO_NAMES.has(name.toLowerCase())) {
      const lower = name.toLowerCase();
      const what = lower === "eval" ? "command" : "keyword";
      return [
        {
          ...span,
          message: `"${name}" is a reserved word, so tf refuses this /def and defines nothing: pick another name.`,
          label: "reserved word",
          explanation: `tf won't define a macro named after one of its keywords (the control flow, such as ${code("if")} and ${code("while")}, and ${code("let")}, ${code("set")}, ${code("setenv")}, ${code("test")}, ${code("return")}, ${code("result")} and ${code("exit")}) or ${code("eval")}. It skips the whole ${code("/def")} with the error ${code(`"${name}" is a reserved word.`)}, and ${code(`/${lower}`)} keeps meaning tf's own ${what}.`
        }
      ];
    }
    const badStart = "#@!/".includes(name[0]);
    const blank = /[ \t]/.exec(name);
    if (!badStart && !blank) return [];
    const explanation = `tf takes a macro's name as everything between the ${code("/def")} options and the ${code("=")}, and refuses one that starts with ${code("#")}, ${code("@")}, ${code("!")} or ${code("/")}, or holds a space, with the error ${code(`illegal macro name "${name.replace(/\t/g, " ")}".`)} It defines nothing.`;
    if (badStart) {
      return [
        {
          ...span,
          message: `"${name}" can't be a macro name, as it starts with ${name[0]}, so tf refuses this /def and defines nothing: pick another name.`,
          label: "illegal name",
          explanation
        }
      ];
    }
    const first = name.slice(0, blank.index);
    let rest = blank.index;
    while (rest < name.length && (name[rest] === " " || name[rest] === "	")) rest += 1;
    const missingEquals = name[rest] === "/" && !"#@!/".includes(first[0]) && !first.includes("%") && !RESERVED_MACRO_NAMES.has(first.toLowerCase());
    if (missingEquals) {
      const at2 = from + first.length;
      return [
        {
          ...span,
          message: `This /def has no = after its name, so tf takes all of "${name}" as the name, which can't hold a space, and defines nothing: put = after ${first}.`,
          label: "no =",
          explanation,
          fix: { title: `Put = after ${first}`, edits: [{ start: at2, end: at2, newText: " =" }] }
        }
      ];
    }
    return [
      {
        ...span,
        message: `"${name}" can't be a macro name, as it holds ${name.includes(" ") ? "a space" : "a tab, which tf reads as a space"}, so tf refuses this /def and defines nothing: pick a name of one word.`,
        label: "illegal name",
        explanation
      }
    ];
  }
};

// packages/core/src/rules/blockStructure.ts
var blockStructure = {
  id: "block-structure",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entryStructure(entry).filter((i) => i.kind === "block").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/expressionSyntax.ts
var expressionSyntax = {
  id: "expression-syntax",
  severity: "error",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "expression").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/emptyStatement.ts
var emptyStatement = {
  id: "empty-statement",
  severity: "warning",
  scope: "entry",
  check(entry) {
    return entrySubstitution(entry).issues.filter((i) => i.kind === "empty-statement").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/nestingTooDeep.ts
var nestingTooDeep = {
  id: "nesting-too-deep",
  severity: "information",
  scope: "entry",
  check(entry) {
    return entryStructure(entry).filter((i) => i.kind === "too-deep").map(({ kind: _kind, ...match }) => match);
  }
};

// packages/core/src/rules/incompleteContinuation.ts
function check3(text) {
  const entry = splitLogicalEntries(text).at(-1);
  if (!entry?.incomplete) return [];
  const lastPart = entry.parts[entry.parts.length - 1];
  if (!lastPart) return [];
  const line = splitRawLines(text)[lastPart.line] ?? "";
  if (!line.endsWith("\\")) return [];
  const at2 = line.length - 1;
  return [
    {
      line: lastPart.line,
      startChar: at2,
      endChar: line.length,
      message: "The last command ends in \\, so tf drops it: remove the \\ or add the rest of the command.",
      label: "continues past the end of the file",
      explanation: `A ${code("\\")} at the end of a line joins the next line onto this command, but the file ends here, so there is no next line. tf warns ${code("last command is incomplete because of trailing \\")} and runs nothing of the command: a macro it would define isn't defined.`,
      fix: { title: "Remove the \\", edits: [{ line: lastPart.line, startChar: at2, endChar: line.length, newText: "" }] }
    }
  ];
}
var incompleteContinuation = {
  id: "incomplete-continuation",
  severity: "warning",
  scope: "file",
  check: check3
};

// packages/core/src/rules/bodyContinuesWithoutBackslash.ts
function check4(text) {
  const lines = splitRawLines(text);
  const matches = [];
  const entries = splitLogicalEntries(text);
  entries.forEach((entry, index) => {
    if (!(entry.isDefBody || entry.isOtherMacroBody) || entry.incomplete) return;
    const last = lines[entry.endLine] ?? "";
    let end = last.length;
    while (end > 0 && isTfSpace(last[end - 1])) end -= 1;
    if (end < 2 || last.slice(end - 2, end) !== "%;" || last[end - 3] === "%" || last[end - 3] === "\\") return;
    const next = lines[entry.endLine + 1];
    if (next === void 0 || isCommentLine(next) || leadingWhitespaceLength(next) > 0 || !next.startsWith("/")) return;
    const following = entries[index + 1];
    if (following && following.startLine === entry.endLine + 1 && (following.isDefBody || following.isOtherMacroBody)) return;
    if (/^\/(?:then|else|elseif|endif|do|done)(?![^ \t\r\f\v%])/i.test(next)) return;
    const name = /^\/def\b/i.test(entry.text) ? entry.text.slice(defOptionsEnd(entry.text, 4)).split("=")[0]?.trim().toLowerCase() : void 0;
    if (name && /^\/[@!]*(\S*)/.exec(next)?.[1]?.toLowerCase() === name) return;
    matches.push({
      line: entry.endLine,
      startChar: end - 2,
      endChar: end,
      message: `The macro body ends here, so line ${entry.endLine + 2} is a command of its own, run when the file loads: end this line with \\ if it belongs to the body.`,
      label: "the body ends here",
      explanation: `The ${code("%;")} says another statement follows, but a line only continues onto the next one when it ends in ${code("\\")}. So the body ends here, and tf runs line ${entry.endLine + 2} once, as it loads the file. If it is meant to run then, drop the ${code("%;")}.`,
      related: [{ line: entry.endLine + 1, startChar: 0, endChar: next.length, message: "runs when the file loads" }],
      fix: { title: `End line ${entry.endLine + 1} with \\`, edits: [{ line: entry.endLine, startChar: end, endChar: last.length, newText: " \\" }] }
    });
  });
  return matches;
}
var bodyContinuesWithoutBackslash = {
  id: "body-continues-without-backslash",
  severity: "information",
  scope: "file",
  check: check4
};

// packages/core/src/rules/index.ts
var RULES = [
  missingContinuation,
  notSubstitutedHere,
  keywordMidStatement,
  substitutionInExpression,
  indentedLineAfterCommand,
  backslashNotLast,
  substitutionSyntax,
  invalidMacroName,
  blockStructure,
  conditionListText,
  keywordNeedsSpace,
  expressionSyntax,
  emptyStatement,
  nestingTooDeep,
  incompleteContinuation,
  bodyContinuesWithoutBackslash
];

// packages/core/src/rules/notACommand.ts
function findAbortEntry(entries) {
  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    if (!entry) continue;
    if (entry.incomplete) continue;
    const leadingLen = leadingWhitespaceLength(entry.text);
    const firstChar = entry.text[leadingLen];
    if (firstChar === void 0) continue;
    if (firstChar === "/") continue;
    const start = entry.offsetMap[leadingLen];
    if (!start) continue;
    let end = leadingLen;
    while (end < entry.offsetMap.length && entry.offsetMap[end]?.line === start.line) {
      end += 1;
    }
    const lastChar = entry.offsetMap[end - 1] ?? start;
    const firsts = /* @__PURE__ */ new Map();
    for (const at2 of entry.offsetMap) if (!firsts.has(at2.line)) firsts.set(at2.line, at2.character);
    const after = entry.text.slice(leadingLen + 1);
    const rest = after[leadingWhitespaceLength(after)];
    if (firstChar === "\uFEFF" && (rest === "/" || rest === ";" || rest === "#")) {
      return {
        entryIndex: idx,
        line: start.line,
        startChar: start.character,
        endChar: start.character + 1,
        message: "This line starts with a byte order mark (U+FEFF), which tf reads as text, so it stops loading the file here: delete the mark.",
        label: "byte order mark",
        explanation: `Some editors save UTF-8 files with an invisible byte order mark at the start. tf doesn't skip it, so the line doesn't start with ${code("/")}, ${code(";")} or ${code("#")}: tf reports ${code("Invalid command. Aborting.")} and reads nothing after it. Save the file as UTF-8 without a BOM.`,
        fix: { title: "Delete the byte order mark", edits: [{ line: start.line, startChar: start.character, endChar: start.character + 1, newText: "" }] }
      };
    }
    return {
      entryIndex: idx,
      line: start.line,
      startChar: start.character,
      endChar: lastChar.character + 1,
      message: "This line isn't a command, so tf stops loading the file here: comment it out, or start it with /.",
      label: "not a command",
      explanation: `tf joins the lines of a file that end in ${code("\\")} onto the line after, and runs each resulting command. Apart from blank lines and comments (starting with ${code(";")} or ${code("#")}), each command has to start with ${code("/")}; at any other command tf reports ${code("Invalid command. Aborting.")} and reads nothing after it. If the line belongs to the command above it, end that command's last line with ${code("\\")}; if it is a note, make it a comment.`,
      fix: {
        title: firsts.size > 1 ? "Comment out these lines" : "Comment out the line",
        edits: [...firsts].map(([line, character]) => ({ line, startChar: character, endChar: character, newText: "; " }))
      }
    };
  }
  return null;
}

// packages/core/src/diagnostics.ts
function positionOf(entry, offset) {
  const at2 = entry.offsetMap[offset];
  if (at2) return { line: at2.line, character: at2.character };
  const last = entry.offsetMap[offset - 1];
  return last ? { line: last.line, character: last.character + 1 } : void 0;
}
function rangeOf(entry, start, end) {
  const from = positionOf(entry, start);
  if (end <= start) return from && { start: from, end: from };
  const lastChar = entry.offsetMap[end - 1];
  return from && lastChar ? { start: from, end: { line: lastChar.line, character: lastChar.character + 1 } } : void 0;
}
function entryDiagnostic(entry, match, code2, severity) {
  if (match.end <= match.start) return void 0;
  const range = rangeOf(entry, match.start, match.end);
  if (!range) return void 0;
  const d = { range, message: match.message, code: code2, severity: match.severity ?? severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  const related = (match.related ?? []).flatMap((n) => {
    const r = rangeOf(entry, n.start, n.end);
    return r ? [{ range: r, message: n.message }] : [];
  });
  if (related.length > 0) d.related = related;
  const mapped = (fix2) => {
    const edits = fix2.edits.map((e) => {
      const r = rangeOf(entry, e.start, e.end);
      return r && { range: r, newText: e.newText };
    });
    return edits.length > 0 && edits.every((e) => e) ? { title: fix2.title, edits } : void 0;
  };
  const fix = match.fix && mapped(match.fix);
  if (fix) d.fix = fix;
  const alternative = match.alternative && mapped(match.alternative);
  if (alternative) d.alternative = alternative;
  return d;
}
function spanRange(s) {
  return { start: { line: s.line, character: s.startChar }, end: { line: s.line, character: s.endChar } };
}
function lineDiagnostic(match, code2, severity) {
  const d = { range: spanRange(match), message: match.message, code: code2, severity };
  if (match.label) d.label = match.label;
  if (match.explanation) d.explanation = match.explanation;
  if (match.related && match.related.length > 0) d.related = match.related.map((n) => ({ range: spanRange(n), message: n.message }));
  if (match.fix) d.fix = { title: match.fix.title, edits: match.fix.edits.map((e) => ({ range: spanRange(e), newText: e.newText })) };
  return d;
}
var reportRuleError = (rule, error) => {
  process.stderr.write(`tfscript: rule ${rule} failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}
`);
};
function getDiagnostics(text, { joinFixes = true } = {}) {
  const entries = splitLogicalEntries(text);
  let diagnostics = [];
  const abort = findAbortEntry(entries);
  const usableEntries = (abort ? entries.slice(0, abort.entryIndex) : entries).filter(
    (entry) => !entry.incomplete
  );
  const readableLineCount = abort ? (entries[abort.entryIndex]?.endLine ?? abort.line) + 1 : void 0;
  const textForFileRules = readableLineCount !== void 0 ? splitRawLines(text).slice(0, readableLineCount).join("\n") : text;
  const macros = /* @__PURE__ */ new Set();
  for (const entry of usableEntries) {
    const name = definedMacro(entry);
    if (name) macros.add(name.toLowerCase());
  }
  const facts = { macros };
  for (const rule of RULES) {
    let failed = false;
    const guarded = (run) => {
      try {
        run();
      } catch (error) {
        if (!failed) reportRuleError(rule.id, error);
        failed = true;
      }
    };
    if (rule.scope === "entry") {
      for (const entry of usableEntries) {
        guarded(() => {
          const found = [];
          for (const match of rule.check(entry, facts)) {
            const d = entryDiagnostic(entry, match, rule.id, rule.severity);
            if (d) found.push(d);
          }
          for (const d of found) diagnostics.push(d);
        });
      }
    } else {
      guarded(() => {
        const found = rule.check(textForFileRules).map((match) => lineDiagnostic(match, rule.id, rule.severity));
        for (const d of found) diagnostics.push(d);
      });
    }
  }
  if (abort) diagnostics.push(lineDiagnostic(abort, "not-a-command", "error"));
  diagnostics = consolidateContinuations(text, entries, diagnostics);
  unjoinGluedKeywords(text, entries, diagnostics);
  if (joinFixes) addJoinFixes(text, diagnostics, (t) => getDiagnostics(t, { joinFixes: false }));
  return diagnostics;
}
function unjoinGluedKeywords(text, entries, diagnostics) {
  let lines;
  for (const d of diagnostics) {
    if (d.code !== "keyword-needs-space" || d.range.end.line <= d.range.start.line) continue;
    lines ??= splitRawLines(text);
    const n = d.range.start.line;
    const raw = lines[n] ?? "";
    const keyword = raw.slice(d.range.start.character, raw.length - 1);
    if (!raw.endsWith("\\") || !/^\/@?[A-Za-z]+$/.test(keyword)) continue;
    const line = n + 1;
    let m = n + 1;
    while (m < lines.length && isCommentLine(lines[m] ?? "")) m += 1;
    const next = lines[m] ?? "";
    const glued = keyword + joinedWord(lines, m);
    const at2 = { line: n, character: raw.length - 1 };
    const word = keyword.replace(/^\/@?/, "").toLowerCase();
    const keep = { title: `Put %; before the \\ on line ${line}`, edits: [{ range: { start: at2, end: at2 }, newText: "%;" }] };
    if (word === "endif" || word === "done") {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put %; before the \\, or remove the \\.`;
      const split = {
        title: `Remove the \\ at the end of line ${line}`,
        edits: [{ range: { start: at2, end: { line: n, character: raw.length } }, newText: "" }]
      };
      const entry = entries.find((e) => e.startLine <= n && n <= e.endLine);
      const defined = entry && definedMacro(entry)?.toLowerCase();
      const calls = next.endsWith("\\") ? void 0 : /^\/([^\s%@\\]+)/.exec(next)?.[1]?.toLowerCase();
      const ownCommand = /^\/@?def\b/i.test(next) || !!defined && calls === defined;
      const sameBody = !ownCommand && (/^[ \t\f\v]/.test(next) || next.endsWith("\\") || !!entry?.isDefBody || !!entry?.isOtherMacroBody);
      d.fix = sameBody ? keep : split;
      d.alternative = sameBody ? split : keep;
    } else if (word === "break") {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put %; before the \\.`;
      d.fix = keep;
      delete d.alternative;
    } else if (!d.fix) {
      const rest = next.trimStart();
      const paren = rest.startsWith("(") ? parenthesized(rest) : "";
      const head = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command`;
      if (paren && word === "else") d.message = `${head}: did you mean /elseif ${paren}? Then put a space before the \\.`;
      else if (paren && (word === "then" || word === "do")) d.message = `${head}: /${word} takes no (condition).`;
      else if (paren && /^[ \t]*%[;|\\]/.test(rest.slice(paren.length))) d.message = `${head}: put a space before the \\, and a command between the ${paren} and the %;.`;
      else if (paren) d.message = `${head}: put a space before the \\.`;
      else d.message = `${head}: unless a macro named ${glued.slice(1)} is defined elsewhere, put a space before the \\.`;
    } else {
      d.message = `Line ${line} ends in \\, so tf joins the next line on and reads ${glued} as one command: put a space before the \\.`;
      d.fix = { title: `Put a space before the \\ on line ${line}`, edits: [{ range: { start: at2, end: at2 }, newText: " " }] };
      delete d.alternative;
    }
  }
}
function parenthesized(text) {
  let depth = 0;
  for (let p = 0; p < text.length; p += 1) {
    const ch = text[p];
    if (ch === '"' || ch === "'" || ch === "`") {
      p += 1;
      while (p < text.length && text[p] !== ch) p += text[p] === "\\" ? 2 : 1;
    } else if (ch === "(") depth += 1;
    else if (ch === ")" && --depth === 0) return text.slice(0, p + 1);
  }
  return "";
}
function joinedWord(lines, m) {
  let word = "";
  for (let k = m; k < lines.length; ) {
    const rest = (lines[k] ?? "").trimStart();
    const part = /^[^\s%]*/.exec(rest)?.[0] ?? "";
    if (!part.endsWith("\\") || part.length !== rest.length) return word + part;
    word += part.slice(0, -1);
    k += 1;
    while (k < lines.length && isCommentLine(lines[k] ?? "")) k += 1;
  }
  return word;
}

// packages/core/src/workspace/documentDiagnostics.ts
function documentDiagnostics(text, file, index) {
  return [...getDiagnostics(text), ...file ? index.loadPathDiagnostics(file, text) : []];
}

// packages/core/src/workspace/loadGraph.ts
var path3 = __toESM(require("node:path"));

// packages/core/src/data/libraryFiles.generated.ts
var LIBRARY_FILES = [
  "activity_status.tf",
  "activity_status2.tf",
  "alias.tf",
  "at.tf",
  "changes.tf",
  "color.tf",
  "complete.tf",
  "cylon.tf",
  "factoral.tf",
  "filexfer.tf",
  "finger.tf",
  "grep.tf",
  "hanoi.tf",
  "kb-bash.tf",
  "kb-emacs.tf",
  "kb-old.tf",
  "kb_badterm.tf",
  "kbbind.tf",
  "kbfunc.tf",
  "kbregion.tf",
  "kbstack.tf",
  "lisp.tf",
  "local-eg.tf",
  "map.tf",
  "pcmd.tf",
  "psh.tf",
  "quoter.tf",
  "relog.tf",
  "rwho.tf",
  "savehist.tf",
  "spc-page.tf",
  "spedwalk.tf",
  "spell.tf",
  "stack-q.tf",
  "stdlib.tf",
  "testcolor.tf",
  "textencode.tf",
  "textutil.tf",
  "tfstatus.tf",
  "tick.tf",
  "tintin.tf",
  "tools.tf",
  "tr.tf",
  "watch.tf",
  "world-q.tf"
];

// packages/core/src/workspace/settings.ts
var path2 = __toESM(require("node:path"));
function toLocalPath(p, mappings) {
  if (mappings.length === 0 || /^[\\/]{2}/.test(p)) return p;
  const forward = path2.posix.normalize(p.replace(/\\/g, "/"));
  for (const m of mappings) {
    if (forward === m.tf || forward.startsWith(m.tf === "/" ? "/" : `${m.tf}/`)) {
      return path2.join(m.local, forward.slice(m.tf === "/" ? 1 : m.tf.length));
    }
  }
  return p;
}
function toTfPath(p, mappings) {
  for (const m of mappings) {
    const rel = path2.relative(m.local, p);
    if (rel === "" || !rel.startsWith("..") && !path2.isAbsolute(rel)) {
      const tail = rel.replace(/\\/g, "/");
      return tail === "" ? m.tf : `${m.tf === "/" ? "" : m.tf}/${tail}`;
    }
  }
  return void 0;
}
function mappingsOf(raw, folder, home) {
  return (raw.pathMappings ?? []).filter((m) => typeof m?.tf === "string" && typeof m?.local === "string" && m.tf.startsWith("/") && m.local.trim() !== "").map((m) => ({ tf: path2.posix.normalize(m.tf.replace(/\\/g, "/")).replace(/\/+$/, "") || "/", local: absolute(m.local, folder, home, []) })).sort((a, b) => b.tf.length - a.tf.length);
}
function absolute(p, folder, home, mappings) {
  const expanded = p === "~" || p.startsWith("~/") || p.startsWith("~\\") ? home + p.slice(1) : p;
  return path2.resolve(folder, toLocalPath(expanded, mappings));
}
function resolveSettings(raw, folder, environment) {
  const userHome = environment.homedir;
  const pathMappings = mappingsOf(raw, folder, userHome);
  const home = raw.homeDirectory ? absolute(raw.homeDirectory, folder, userHome, pathMappings) : userHome;
  const abs = (p) => absolute(p, folder, home, pathMappings);
  let entryFiles = (raw.entryFiles ?? []).filter((f) => f.trim() !== "").map(abs);
  if (entryFiles.length === 0) {
    const candidates = [
      path2.join(folder, ".tfrc"),
      path2.join(folder, "tfrc"),
      path2.join(folder, "tfrc.tf"),
      path2.join(home, ".tfrc"),
      path2.join(home, "tfrc")
    ];
    const found = candidates.find((c) => environment.exists(c));
    entryFiles = found ? [found] : [];
  }
  const library = raw.libraryPath?.trim() || environment.env.TFLIBDIR;
  const tfPath = raw.tfPath && raw.tfPath.length > 0 ? raw.tfPath.map(abs) : (environment.env.TFPATH ?? "").split(/\s+/).filter(Boolean);
  const named = Object.entries(raw.contexts ?? {}).map(([name, files]) => ({ name, entryFiles: (Array.isArray(files) ? files : [files]).filter((f) => typeof f === "string").filter((f) => f.trim() !== "").map(abs) })).filter((c) => c.entryFiles.length > 0);
  const contexts = named.length > 0 ? named : [{ name: "default", entryFiles }];
  const active = contexts.find((c) => c.name === raw.activeContext) ?? contexts[0];
  return {
    entryFiles: contexts[0].entryFiles,
    contexts,
    activeContext: active.name,
    libraryDir: library ? abs(library) : void 0,
    tfPath,
    workingDir: raw.workingDirectory ? abs(raw.workingDirectory) : folder,
    home,
    pathMappings,
    variables: Object.fromEntries(
      Object.entries(raw.variables ?? {}).filter(([name, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && typeof value === "string")
    )
  };
}

// packages/core/src/workspace/loadGraph.ts
var LOADED_RE = /^\s*\/loaded\s+(\S+)/i;
function isForeignPath(p) {
  return process.platform === "win32" && /^[\\/](?![\\/])/.test(p);
}
function fileKey(file) {
  const resolved = path3.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function expandVariables(text, vars) {
  let missing;
  const value = text.replace(
    /%(%+)|%\{([^}-]+)(?:-([^}]*))?\}|%([A-Za-z_][A-Za-z0-9_]*)/g,
    (_whole, percents2, braced, fallback, bare) => {
      if (percents2 !== void 0) return percents2;
      const name = braced ?? bare;
      const v = vars.get(name);
      if (v !== void 0 && v !== "") return v;
      if (fallback !== void 0) return fallback;
      missing ??= name;
      return "";
    }
  );
  return missing ? { ok: false, reason: `%{${missing}} is not set to literal text on this load path`, variable: missing } : { ok: true, value };
}
function isLibraryFile(file) {
  const name = file.replace(/^(?:\.\/)+/, "");
  const fold = (s) => process.platform === "win32" ? s.toLowerCase() : s;
  return LIBRARY_FILES.some((f) => fold(f) === fold(name));
}
function resolveLoadPath(file, env) {
  const mappings = env.pathMappings ?? [];
  const under = (dir, rel, local) => local ? path3.join(dir, rel) : path3.normalize(toLocalPath(`${dir}/${rel}`, mappings));
  if (file.startsWith("~")) {
    const underHome = file === "~" || file.startsWith("~/");
    const named = underHome ? env.home + file.slice(1) : file;
    const mapped = underHome && env.local?.home ? named : toLocalPath(named, mappings);
    const target2 = mapped === named ? path3.resolve(env.workingDir, named) : path3.normalize(mapped);
    return { found: env.readFile(target2) !== void 0 ? target2 : void 0, searched: [target2] };
  }
  const target = file;
  const candidates = [];
  if (path3.isAbsolute(target)) {
    candidates.push(path3.normalize(toLocalPath(target, mappings)));
  } else {
    candidates.push(path3.join(env.workingDir, target));
    if (env.tfPath.length > 0) {
      for (const dir of env.tfPath) if (path3.isAbsolute(dir)) candidates.push(under(dir, target, env.local?.tfPath));
    } else if (env.libraryDir && path3.isAbsolute(env.libraryDir)) {
      candidates.push(under(env.libraryDir, target, env.local?.libraryDir));
    }
  }
  return { found: candidates.find((c) => env.readFile(c) !== void 0), searched: candidates };
}
function buildLoadGraph(options) {
  const vars = /* @__PURE__ */ new Map([
    ["TFLIBDIR", options.libraryDir ?? ""],
    ["TFPATH", (options.tfPath ?? []).join(" ")],
    ["HOME", options.home ?? ""]
  ]);
  const unknown = /* @__PURE__ */ new Set();
  const guarded = /* @__PURE__ */ new Set();
  const local = new Set(vars.keys());
  const seeded = /* @__PURE__ */ new Set();
  function searchEnv() {
    const libraryDir = vars.get("TFLIBDIR") || void 0;
    return {
      home: vars.get("HOME") ?? "",
      tfPath: (vars.get("TFPATH") ?? "").split(/\s+/).filter(Boolean),
      ...libraryDir === void 0 ? {} : { libraryDir },
      local: { home: local.has("HOME"), tfPath: local.has("TFPATH"), libraryDir: local.has("TFLIBDIR") }
    };
  }
  const files = /* @__PURE__ */ new Map();
  const tokens = /* @__PURE__ */ new Set();
  const unresolved = [];
  const resolved = [];
  let seq = 0;
  let inStdlib = false;
  function resolve6(file) {
    const env = searchEnv();
    const tfPath = env.tfPath;
    const result = resolveLoadPath(file, {
      ...env,
      workingDir: options.workingDir,
      ...options.pathMappings ? { pathMappings: options.pathMappings } : {},
      readFile: options.readFile
    });
    if (result.found !== void 0 && result.found === result.searched[0] && !/^~(?:\/|$)/.test(file)) return result;
    const needs = /^~(?:\/|$)/.test(file) ? ["HOME"] : file.startsWith("~") || path3.isAbsolute(file) ? [] : ["TFPATH", ...tfPath.length > 0 ? [] : ["TFLIBDIR"]];
    const unknownVar = needs.find((v) => unknown.has(v));
    return unknownVar ? { searched: result.searched, unknownVar } : result;
  }
  function valueAfter(text, pending) {
    let value = text;
    for (const level of pending) {
      if (level === "newline") value = shortenPercents(value);
      if (level !== "full") continue;
      const expanded = expandVariables(value, vars);
      if (!expanded.ok) return expanded;
      value = expanded.value;
    }
    return { ok: true, value };
  }
  function unknownValue(variable, reason) {
    return guarded.has(variable) ? { kind: "guarded-variable", reason: `%{${variable}} is set inside an /if or /while on the load path` } : { kind: "unknown-variable", reason };
  }
  function handleLoad(entry, load, from) {
    const line = entry.startLine;
    const raw = entry.text.slice(load.start, load.end);
    let file = load.file;
    const fail = (k, reason, searched2 = [], variable) => {
      unresolved.push({ from, line, start: load.start, end: load.end, kind: k, raw, file, reason, searched: searched2, ...variable ? { variable } : {} });
    };
    const namesVariable = /%\{|%[A-Za-z_]/.test(raw.replace(/%%+/g, ""));
    if (load.plain && namesVariable) {
      return fail("not-substituted", "a top-level path is not substituted; prefix the line with /eval");
    }
    const value = valueAfter(file, load.pending);
    if (!value.ok) {
      const why = unknownValue(value.variable, value.reason);
      return fail(why.kind, why.reason, [], value.variable);
    }
    file = value.value;
    file = load.kind === "require" ? file.trim().split(/[ \t\r\f\v]+/).join(" ") : file.trim();
    if (!file) return;
    const { found, searched, unknownVar } = resolve6(file);
    if (unknownVar) {
      const why = unknownValue(unknownVar, `%{${unknownVar}} is not set to literal text on this load path`);
      return fail(why.kind, why.reason, searched, unknownVar);
    }
    if (!found) {
      if (/^~(?:\/|$)/.test(file) && !vars.get("HOME")) return fail("unknown-variable", "HOME isn't known on this load path", [], "HOME");
      if (namesVariable && !load.pending.includes("full")) return fail("not-substituted", "this path is not substituted here; prefix the command with /eval", searched);
      const user = /^~([^/]+)/.exec(file)?.[1];
      if (user) return fail("user-home", `~${user} is user ${user}'s home directory, unless there is no such user`, searched);
      if (isLibraryFile(file) && !vars.get("TFLIBDIR") && local.has("TFLIBDIR") && !vars.get("TFPATH")) {
        return fail("unknown-library", "tf's library folder isn't known here", searched);
      }
      return fail("not-found", "file not found", searched);
    }
    resolved.push({ from, line, offset: load.start, raw, file: path3.resolve(found), kind: load.kind });
    walk2(found, { kind: load.kind, from, line });
  }
  function walk2(file, site) {
    const key2 = fileKey(file);
    const existing = files.get(key2);
    if (existing) {
      existing.sites.push(site);
      return;
    }
    const text = options.readFile(file);
    if (text === void 0) return;
    const loaded = { path: path3.resolve(file), text, sites: [site], defs: [], stdlib: inStdlib, searchEnv: searchEnv() };
    files.set(key2, loaded);
    const entries = splitLogicalEntries(text);
    const abort = findAbortEntry(entries);
    const usable = (abort ? entries.slice(0, abort.entryIndex) : entries).filter((e) => !e.incomplete);
    const defsByLine = /* @__PURE__ */ new Map();
    for (const s of getDocumentSymbols(text)) if (s.kind === "def") defsByLine.set(s.range.start.line, s);
    for (const entry of usable) {
      if (entry.isDefBody || entry.isOtherMacroBody) {
        const symbol = defsByLine.get(entry.startLine);
        if (symbol) loaded.defs.push({ file: loaded.path, symbol, seq: seq++ });
        continue;
      }
      const token = LOADED_RE.exec(entry.text)?.[1];
      if (token !== void 0) {
        if (tokens.has(token) && site.kind === "require") break;
        tokens.add(token);
        continue;
      }
      if (entry.isForLoop) continue;
      for (const command2 of entryCommands(entry)) {
        if (!command2.topLevel) continue;
        if (command2.kind !== "set") {
          handleLoad(entry, command2, loaded.path);
          continue;
        }
        if (command2.name === "TFPATH" || command2.name === "TFLIBDIR" || command2.name === "HOME") local.delete(command2.name);
        if (command2.conditional && seeded.has(command2.name)) continue;
        const value = valueAfter(command2.value, command2.pending);
        if (value.ok && !command2.conditional) {
          vars.set(command2.name, value.value);
          unknown.delete(command2.name);
          guarded.delete(command2.name);
          seeded.delete(command2.name);
        } else if (!value.ok || vars.get(command2.name) !== value.value) {
          vars.delete(command2.name);
          unknown.add(command2.name);
          if (command2.conditional) guarded.add(command2.name);
          else guarded.delete(command2.name);
        }
      }
    }
  }
  if (options.libraryDir) {
    const stdlib = path3.join(options.libraryDir, "stdlib.tf");
    if (options.readFile(stdlib) !== void 0) {
      inStdlib = true;
      walk2(stdlib, { kind: "stdlib" });
      inStdlib = false;
    }
  }
  for (const [name, value] of Object.entries(options.variables ?? {})) {
    vars.set(name, value);
    unknown.delete(name);
    guarded.delete(name);
    local.delete(name);
    seeded.add(name);
  }
  for (const entry of options.entryFiles) walk2(entry, { kind: "entry" });
  return { files: [...files.values()], unresolved, resolved };
}

// packages/core/src/workspace/nodeFileSystem.ts
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var path4 = __toESM(require("node:path"));
var SKIP_DIRS = /* @__PURE__ */ new Set([".git", ".jj", "node_modules"]);
function isSkippedDir(name) {
  return SKIP_DIRS.has(process.platform === "win32" ? name.toLowerCase() : name);
}
function readFile(file) {
  try {
    return (0, import_node_fs.readFileSync)(file, "utf8");
  } catch {
    return void 0;
  }
}
function listTfFiles(dir) {
  try {
    return (0, import_node_fs.readdirSync)(dir).filter((f) => f.endsWith(".tf")).map((f) => path4.join(dir, f));
  } catch {
    return [];
  }
}
function walkTfFiles(dir, limit = Infinity) {
  const out = [];
  const visit = (d) => {
    let entries;
    try {
      entries = (0, import_node_fs.readdirSync)(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      const full = path4.join(d, e.name);
      if (e.isDirectory()) {
        if (!isSkippedDir(e.name)) visit(full);
      } else if (e.name.endsWith(".tf") || e.name === "tfrc" || e.name === ".tfrc") {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
}
function mtime(file) {
  try {
    return (0, import_node_fs.statSync)(file).mtimeMs;
  } catch {
    return void 0;
  }
}
var nodeFileSystem = { readFile, listTfFiles, walkTfFiles, mtime };
function nodeEnvironment() {
  return { env: process.env, homedir: (0, import_node_os.homedir)(), exists: import_node_fs.existsSync };
}

// packages/core/src/workspace/workspaceIndex.ts
var path6 = __toESM(require("node:path"));

// packages/core/src/data/functions.generated.ts
var FUNCTIONS = [
  {
    "name": "abs",
    "min": 1,
    "max": 1,
    "synopses": [
      "abs(n)"
    ]
  },
  {
    "name": "acos",
    "min": 1,
    "max": 1,
    "synopses": [
      "acos(r)"
    ]
  },
  {
    "name": "addworld",
    "min": 2,
    "max": 9,
    "synopses": [
      "addworld(name, type, host, port, char, pass, file, use_proxy)"
    ]
  },
  {
    "name": "ascii",
    "min": 1,
    "max": 1,
    "synopses": [
      "ascii(s)"
    ]
  },
  {
    "name": "ascii_bytes",
    "min": 1,
    "max": 1,
    "synopses": [
      "ascii_bytes(s)"
    ]
  },
  {
    "name": "asin",
    "min": 1,
    "max": 1,
    "synopses": [
      "asin(r)"
    ]
  },
  {
    "name": "atan",
    "min": 1,
    "max": 1,
    "synopses": [
      "atan(r)"
    ]
  },
  {
    "name": "atcp",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_ATCP"
  },
  {
    "name": "calllua",
    "min": 1,
    "max": null,
    "requires": "LUA_ENABLED"
  },
  {
    "name": "char",
    "min": 1,
    "max": 1,
    "synopses": [
      "char(i)"
    ]
  },
  {
    "name": "char_bytes",
    "min": 1,
    "max": 1,
    "synopses": [
      "char_bytes(i)"
    ]
  },
  {
    "name": "columns",
    "min": 0,
    "max": 0,
    "synopses": [
      "columns()"
    ]
  },
  {
    "name": "cos",
    "min": 1,
    "max": 1,
    "synopses": [
      "cos(r)"
    ]
  },
  {
    "name": "cputime",
    "min": 0,
    "max": 0,
    "synopses": [
      "cputime()"
    ]
  },
  {
    "name": "decode_ansi",
    "min": 1,
    "max": 1,
    "synopses": [
      "decode_ansi(s)"
    ]
  },
  {
    "name": "decode_attr",
    "min": 1,
    "max": 3,
    "synopses": [
      "decode_attr(s1 [, s2 [, f]])"
    ]
  },
  {
    "name": "echo",
    "min": 1,
    "max": 4,
    "synopses": [
      "echo(s1 [,attrs [,inline [,dest]]])"
    ]
  },
  {
    "name": "encode_ansi",
    "min": 1,
    "max": 1,
    "synopses": [
      "encode_ansi(s)"
    ]
  },
  {
    "name": "encode_attr",
    "min": 1,
    "max": 1,
    "synopses": [
      "encode_attr(s)"
    ]
  },
  {
    "name": "eval",
    "min": 1,
    "max": 2,
    "synopses": [
      "eval(s1 [, s2])"
    ]
  },
  {
    "name": "exp",
    "min": 1,
    "max": 1,
    "synopses": [
      "exp(r)"
    ]
  },
  {
    "name": "fake_recv",
    "min": 1,
    "max": 3
  },
  {
    "name": "fg_world",
    "min": 0,
    "max": 0,
    "synopses": [
      "fg_world()"
    ]
  },
  {
    "name": "filename",
    "min": 1,
    "max": 1,
    "synopses": [
      "filename(s)"
    ]
  },
  {
    "name": "ftime",
    "min": 0,
    "max": 2,
    "synopses": [
      "ftime(s,n)",
      "ftime(s)",
      "ftime()"
    ]
  },
  {
    "name": "fwrite",
    "min": 2,
    "max": 2,
    "synopses": [
      "fwrite(s1,s2)"
    ]
  },
  {
    "name": "gethostname",
    "min": 0,
    "max": 0,
    "synopses": [
      "gethostname()"
    ]
  },
  {
    "name": "getopts",
    "min": 1,
    "max": 2,
    "synopses": [
      "getopts(s1, s2)"
    ]
  },
  {
    "name": "getpid",
    "min": 0,
    "max": 0,
    "synopses": [
      "getpid()"
    ]
  },
  {
    "name": "gmcp",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_GMCP"
  },
  {
    "name": "idle",
    "min": 0,
    "max": 1,
    "synopses": [
      "idle()",
      "idle(s)"
    ]
  },
  {
    "name": "is_connected",
    "min": 0,
    "max": 1,
    "synopses": [
      "is_connected()",
      "is_connected(s)"
    ]
  },
  {
    "name": "is_open",
    "min": 0,
    "max": 1,
    "synopses": [
      "is_open()",
      "is_open(s)"
    ]
  },
  {
    "name": "isatty",
    "min": 0,
    "max": 0
  },
  {
    "name": "kbdel",
    "min": 1,
    "max": 1,
    "synopses": [
      "kbdel(i)"
    ]
  },
  {
    "name": "kbgoto",
    "min": 1,
    "max": 1,
    "synopses": [
      "kbgoto(i)"
    ]
  },
  {
    "name": "kbhead",
    "min": 0,
    "max": 0,
    "synopses": [
      "kbhead()"
    ]
  },
  {
    "name": "kblen",
    "min": 0,
    "max": 0,
    "synopses": [
      "kblen()"
    ]
  },
  {
    "name": "kbmatch",
    "min": 0,
    "max": 1,
    "synopses": [
      "kbmatch()",
      "kbmatch(i)"
    ]
  },
  {
    "name": "kbpoint",
    "min": 0,
    "max": 0,
    "synopses": [
      "kbpoint()"
    ]
  },
  {
    "name": "kbtail",
    "min": 0,
    "max": 0,
    "synopses": [
      "kbtail()"
    ]
  },
  {
    "name": "kbwordleft",
    "min": 0,
    "max": 1,
    "synopses": [
      "kbwordleft()",
      "kbwordleft(i)"
    ]
  },
  {
    "name": "kbwordright",
    "min": 0,
    "max": 1,
    "synopses": [
      "kbwordright()",
      "kbwordright(i)"
    ]
  },
  {
    "name": "keycode",
    "min": 1,
    "max": 1,
    "synopses": [
      "keycode(s)"
    ]
  },
  {
    "name": "lines",
    "min": 0,
    "max": 0,
    "synopses": [
      "lines()"
    ]
  },
  {
    "name": "ln",
    "min": 1,
    "max": 1,
    "synopses": [
      "ln(n)"
    ]
  },
  {
    "name": "log10",
    "min": 1,
    "max": 1,
    "synopses": [
      "log10(n)"
    ]
  },
  {
    "name": "mktime",
    "min": 1,
    "max": 7,
    "synopses": [
      "mktime(year [, month [, day [, hour [, minute [, second [, microsecond]]]]]])"
    ]
  },
  {
    "name": "mod",
    "min": 2,
    "max": 2,
    "synopses": [
      "mod(i1,i2)"
    ]
  },
  {
    "name": "morepaused",
    "min": 0,
    "max": 1,
    "synopses": [
      "morepaused([s1])"
    ]
  },
  {
    "name": "morescroll",
    "min": 1,
    "max": 1,
    "synopses": [
      "morescroll(i)"
    ]
  },
  {
    "name": "moresize",
    "min": 0,
    "max": 2,
    "synopses": [
      "moresize([s1 [, s2]])"
    ]
  },
  {
    "name": "msdp",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_MSDP"
  },
  {
    "name": "nactive",
    "min": 0,
    "max": 1,
    "synopses": [
      "nactive()",
      "nactive(s)"
    ]
  },
  {
    "name": "nlog",
    "min": 0,
    "max": 0,
    "synopses": [
      "nlog()"
    ]
  },
  {
    "name": "nmail",
    "min": 0,
    "max": 0,
    "synopses": [
      "nmail()"
    ]
  },
  {
    "name": "nread",
    "min": 0,
    "max": 0,
    "synopses": [
      "nread()"
    ]
  },
  {
    "name": "option102",
    "min": 1,
    "max": 2,
    "requires": "ENABLE_OPTION102"
  },
  {
    "name": "pad",
    "min": 1,
    "max": null,
    "synopses": [
      "pad([s, i]...)"
    ]
  },
  {
    "name": "pow",
    "min": 2,
    "max": 2,
    "synopses": [
      "pow(n1, n2)"
    ]
  },
  {
    "name": "prompt",
    "min": 1,
    "max": 1,
    "synopses": [
      "prompt(s1)"
    ]
  },
  {
    "name": "python",
    "min": 1,
    "max": 1,
    "requires": "TFPYTHON"
  },
  {
    "name": "rand",
    "min": 0,
    "max": 2,
    "synopses": [
      "rand()",
      "rand(i)",
      "rand(i1,i2)"
    ]
  },
  {
    "name": "read",
    "min": 0,
    "max": 0,
    "synopses": [
      "read()"
    ]
  },
  {
    "name": "regmatch",
    "min": 2,
    "max": 2,
    "synopses": [
      "regmatch(s1, s2)"
    ]
  },
  {
    "name": "replace",
    "min": 3,
    "max": 3,
    "synopses": [
      "replace(s1, s2, s3)"
    ]
  },
  {
    "name": "send",
    "min": 1,
    "max": 3,
    "synopses": [
      "send(s1[, world[, flags]])"
    ]
  },
  {
    "name": "sidle",
    "min": 0,
    "max": 1,
    "synopses": [
      "sidle()",
      "sidle(s)"
    ]
  },
  {
    "name": "sin",
    "min": 1,
    "max": 1,
    "synopses": [
      "sin(r)"
    ]
  },
  {
    "name": "sqrt",
    "min": 1,
    "max": 1,
    "synopses": [
      "sqrt(n)"
    ]
  },
  {
    "name": "status_fields",
    "min": 0,
    "max": 1,
    "synopses": [
      "status_fields([i])"
    ]
  },
  {
    "name": "status_width",
    "min": 1,
    "max": 1
  },
  {
    "name": "strcat",
    "min": 1,
    "max": null,
    "synopses": [
      "strcat(s...)"
    ]
  },
  {
    "name": "strchr",
    "min": 2,
    "max": 3,
    "synopses": [
      "strchr(s1, s2)",
      "strchr(s1, s2, i)"
    ]
  },
  {
    "name": "strchr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "strchr_bytes(s1, s2)",
      "strchr_bytes(s1, s2, i)"
    ]
  },
  {
    "name": "strcmp",
    "min": 2,
    "max": 2,
    "synopses": [
      "strcmp(s1, s2)"
    ]
  },
  {
    "name": "strcmpattr",
    "min": 2,
    "max": 2,
    "synopses": [
      "strcmpattr(s1, s2)"
    ]
  },
  {
    "name": "strip_attr",
    "min": 1,
    "max": 1,
    "synopses": [
      "strip_attr(s)"
    ]
  },
  {
    "name": "strlen",
    "min": 1,
    "max": 1,
    "synopses": [
      "strlen(s)"
    ]
  },
  {
    "name": "strlen_bytes",
    "min": 1,
    "max": 1,
    "synopses": [
      "strlen_bytes(s)"
    ]
  },
  {
    "name": "strncmp",
    "min": 3,
    "max": 3,
    "synopses": [
      "strncmp(s1, s2, i)"
    ]
  },
  {
    "name": "strrchr",
    "min": 2,
    "max": 3,
    "synopses": [
      "strrchr(s1, s2)",
      "strrchr(s1, s2, i)"
    ]
  },
  {
    "name": "strrchr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "strrchr_bytes(s1, s2)",
      "strrchr_bytes(s1, s2, i)"
    ]
  },
  {
    "name": "strrep",
    "min": 2,
    "max": 2,
    "synopses": [
      "strrep(s, i)"
    ]
  },
  {
    "name": "strstr",
    "min": 2,
    "max": 3,
    "synopses": [
      "strstr(s1, s2)",
      "strstr(s1, s2, i)"
    ]
  },
  {
    "name": "strstr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "strstr_bytes(s1, s2)",
      "strstr_bytes(s1, s2, i)"
    ]
  },
  {
    "name": "substitute",
    "min": 1,
    "max": 3,
    "synopses": [
      "substitute(s [,attrs [,inline]])"
    ]
  },
  {
    "name": "substr",
    "min": 2,
    "max": 3,
    "synopses": [
      "substr(s, i1)",
      "substr(s, i1, i2)"
    ]
  },
  {
    "name": "substr_bytes",
    "min": 2,
    "max": 3,
    "synopses": [
      "substr_bytes(s, i1)",
      "substr_bytes(s, i1, i2)"
    ]
  },
  {
    "name": "systype",
    "min": 0,
    "max": 0,
    "synopses": [
      "systype()"
    ]
  },
  {
    "name": "tan",
    "min": 1,
    "max": 1,
    "synopses": [
      "tan(r)"
    ]
  },
  {
    "name": "test",
    "min": 1,
    "max": 1,
    "synopses": [
      "test(s)"
    ]
  },
  {
    "name": "tfclose",
    "min": 1,
    "max": 1,
    "synopses": [
      "tfclose(i)"
    ]
  },
  {
    "name": "tfflush",
    "min": 1,
    "max": 2,
    "synopses": [
      "tfflush(i)",
      "tfflush(i, f)"
    ]
  },
  {
    "name": "tfopen",
    "min": 0,
    "max": 2,
    "synopses": [
      "tfopen(s1, s2)",
      "tfopen()"
    ]
  },
  {
    "name": "tfread",
    "min": 1,
    "max": 2,
    "synopses": [
      "tfread(i, v)",
      "tfread(v)"
    ]
  },
  {
    "name": "tfreadable",
    "min": 1,
    "max": 1
  },
  {
    "name": "tfwrite",
    "min": 1,
    "max": 3,
    "synopses": [
      "tfwrite(i, s, flags)",
      "tfwrite(i, s)",
      "tfwrite(s)"
    ]
  },
  {
    "name": "time",
    "min": 0,
    "max": 0,
    "synopses": [
      "time()"
    ]
  },
  {
    "name": "tolower",
    "min": 1,
    "max": 2,
    "synopses": [
      "tolower(s)",
      "tolower(s, i)"
    ]
  },
  {
    "name": "toupper",
    "min": 1,
    "max": 2,
    "synopses": [
      "toupper(s)",
      "toupper(s, i)"
    ]
  },
  {
    "name": "trunc",
    "min": 1,
    "max": 1,
    "synopses": [
      "trunc(r)"
    ]
  },
  {
    "name": "whatis",
    "min": 1,
    "max": 1
  },
  {
    "name": "winlines",
    "min": 0,
    "max": 0,
    "synopses": [
      "winlines()"
    ]
  },
  {
    "name": "world_info",
    "min": 0,
    "max": 2,
    "synopses": [
      "world_info(s1, s2)",
      "world_info(s2)",
      "world_info()"
    ]
  }
];

// packages/core/src/data/variables.generated.ts
var SPECIAL_VARIABLES = [
  {
    "name": "alert_attr",
    "type": "string",
    "default": "Br"
  },
  {
    "name": "alert_time",
    "type": "time"
  },
  {
    "name": "ansi_log",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "atcp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_ATCP"
  },
  {
    "name": "background",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "backslash",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "bamf",
    "type": "enum",
    "values": [
      "off",
      "on",
      "old"
    ],
    "default": "off"
  },
  {
    "name": "beep",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "bg_output",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "binary_eol",
    "type": "enum",
    "values": [
      "LF",
      "CR",
      "CRLF"
    ]
  },
  {
    "name": "borg",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "cecho",
    "type": "enum",
    "values": [
      "off",
      "on",
      "all"
    ],
    "default": "off"
  },
  {
    "name": "cecho_attr",
    "type": "string",
    "default": "Cgreen"
  },
  {
    "name": "cleardone",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "clearfull",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "connect",
    "type": "enum",
    "values": [
      "blocking",
      "nonblocking"
    ]
  },
  {
    "name": "default_charset",
    "type": "string",
    "default": "UTF-8"
  },
  {
    "name": "defcompile",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "emulation",
    "type": "enum",
    "values": [
      "raw",
      "print",
      "ansi_strip",
      "ansi_attr",
      "debug"
    ]
  },
  {
    "name": "error_attr",
    "type": "string"
  },
  {
    "name": "expand_tabs",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "expnonvis",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "gag",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "gethostbyname",
    "type": "enum",
    "values": [
      "blocking",
      "nonblocking"
    ]
  },
  {
    "name": "gmcp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_GMCP"
  },
  {
    "name": "gpri",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "hilite",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "hiliteattr",
    "type": "string",
    "default": "B"
  },
  {
    "name": "histsize",
    "type": "position"
  },
  {
    "name": "hook",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "hpri",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "iecho",
    "type": "enum",
    "values": [
      "off",
      "on",
      "all"
    ],
    "default": "off"
  },
  {
    "name": "iecho_attr",
    "type": "string",
    "default": "Cred"
  },
  {
    "name": "info_attr",
    "type": "string"
  },
  {
    "name": "insert",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "int_range",
    "type": "enum",
    "values": [
      "clamp",
      "error"
    ],
    "default": "clamp"
  },
  {
    "name": "interactive",
    "type": "flag",
    "values": [
      "off",
      "on"
    ]
  },
  {
    "name": "isize",
    "type": "position"
  },
  {
    "name": "istrip",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "kbnum",
    "type": "string"
  },
  {
    "name": "kecho",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "kecho_attr",
    "type": "string"
  },
  {
    "name": "keepalive",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "keypad",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "kprefix",
    "type": "string"
  },
  {
    "name": "LANG",
    "type": "string"
  },
  {
    "name": "LC_ALL",
    "type": "string"
  },
  {
    "name": "LC_CTYPE",
    "type": "string"
  },
  {
    "name": "LC_TIME",
    "type": "string"
  },
  {
    "name": "local_assign",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "log_prefix",
    "type": "string",
    "default": "%t # "
  },
  {
    "name": "log_time_format",
    "type": "string",
    "default": "%H:%M:%S"
  },
  {
    "name": "login",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "lp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "lpquote",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "MAIL",
    "type": "string"
  },
  {
    "name": "maildelay",
    "type": "time"
  },
  {
    "name": "matching",
    "type": "enum",
    "values": [
      "simple",
      "glob",
      "regexp",
      "substr"
    ],
    "default": "glob"
  },
  {
    "name": "max_hook",
    "type": "integer",
    "default": "1000"
  },
  {
    "name": "max_instr",
    "type": "integer",
    "default": "1000000"
  },
  {
    "name": "max_kbnum",
    "type": "integer",
    "default": "999"
  },
  {
    "name": "max_recur",
    "type": "integer",
    "default": "100"
  },
  {
    "name": "max_trig",
    "type": "integer",
    "default": "1000"
  },
  {
    "name": "mccp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "HAVE_MCCP"
  },
  {
    "name": "mecho",
    "type": "enum",
    "values": [
      "off",
      "on",
      "all"
    ],
    "default": "off"
  },
  {
    "name": "mecho_attr",
    "type": "string"
  },
  {
    "name": "meta_esc",
    "type": "enum",
    "values": [
      "off",
      "on",
      "nonprint"
    ]
  },
  {
    "name": "more",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "mprefix",
    "type": "string",
    "default": "+"
  },
  {
    "name": "msdp",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_MSDP"
  },
  {
    "name": "oldslash",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "optimize",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "option102",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on",
    "requires": "ENABLE_OPTION102"
  },
  {
    "name": "pedantic",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "prompt_sec",
    "type": "string"
  },
  {
    "name": "prompt_usec",
    "type": "string"
  },
  {
    "name": "prompt_wait",
    "type": "time"
  },
  {
    "name": "proxy_host",
    "type": "string"
  },
  {
    "name": "proxy_port",
    "type": "string",
    "default": "23"
  },
  {
    "name": "ptime",
    "type": "time"
  },
  {
    "name": "qecho",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "qecho_attr",
    "type": "string"
  },
  {
    "name": "qprefix",
    "type": "string"
  },
  {
    "name": "quiet",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "quitdone",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "redef",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "refreshtime",
    "type": "integer",
    "default": "100000"
  },
  {
    "name": "scroll",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "secho",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "secho_attr",
    "type": "string"
  },
  {
    "name": "send_queue",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "send_queue_full",
    "type": "enum",
    "values": [
      "block",
      "error",
      "disconnect"
    ]
  },
  {
    "name": "shpause",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "sidescroll",
    "type": "position"
  },
  {
    "name": "sigfigs",
    "type": "integer",
    "default": "15"
  },
  {
    "name": "snarf",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "sockmload",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "sprefix",
    "type": "string"
  },
  {
    "name": "ssl_ca_dir",
    "type": "string"
  },
  {
    "name": "ssl_ca_file",
    "type": "string"
  },
  {
    "name": "ssl_continue",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "ssl_depth",
    "type": "integer",
    "default": "10"
  },
  {
    "name": "ssl_insecure",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "ssl_verbose",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "status_attr",
    "type": "string"
  },
  {
    "name": "status_fields",
    "type": "string"
  },
  {
    "name": "status_height",
    "type": "position"
  },
  {
    "name": "status_int_clock",
    "type": "string"
  },
  {
    "name": "status_int_more",
    "type": "string"
  },
  {
    "name": "status_int_world",
    "type": "string"
  },
  {
    "name": "status_pad",
    "type": "string",
    "default": "_"
  },
  {
    "name": "sub",
    "type": "enum",
    "values": [
      "off",
      "on",
      "full"
    ]
  },
  {
    "name": "tabsize",
    "type": "position"
  },
  {
    "name": "telopt",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "TERM",
    "type": "string"
  },
  {
    "name": "textdiv",
    "type": "enum",
    "values": [
      "off",
      "on",
      "always",
      "clear"
    ]
  },
  {
    "name": "textdiv_str",
    "type": "string",
    "default": "====="
  },
  {
    "name": "tfhost",
    "type": "string"
  },
  {
    "name": "TFLIBDIR",
    "type": "string"
  },
  {
    "name": "TFMAILPATH",
    "type": "string"
  },
  {
    "name": "TFPATH",
    "type": "string"
  },
  {
    "name": "tfpy_debug",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off",
    "requires": "TFPYTHON"
  },
  {
    "name": "time_format",
    "type": "string",
    "default": "%H:%M"
  },
  {
    "name": "TZ",
    "type": "string"
  },
  {
    "name": "virtscreen",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "visual",
    "type": "flag",
    "values": [
      "off",
      "on"
    ]
  },
  {
    "name": "warn_5keys",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warn_curly_re",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warn_def_B",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warn_status",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "warning_attr",
    "type": "string"
  },
  {
    "name": "watchdog",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "watchname",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "wordpunct",
    "type": "string",
    "default": "_"
  },
  {
    "name": "wrap",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "on"
  },
  {
    "name": "wraplog",
    "type": "flag",
    "values": [
      "off",
      "on"
    ],
    "default": "off"
  },
  {
    "name": "wrappunct",
    "type": "integer",
    "default": "10"
  },
  {
    "name": "wrapsize",
    "type": "integer",
    "default": "0"
  },
  {
    "name": "wrapspace",
    "type": "integer",
    "default": "4"
  }
];

// packages/core/src/variables.ts
var SPECIAL_VARIABLE_NAMES = new Set(SPECIAL_VARIABLES.map((v) => v.name));
var COMMAND_NAMES = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
var FUNCTION_NAMES = new Set(FUNCTIONS.map((f) => f.name));
var isDigit2 = (c) => c !== void 0 && c >= "0" && c <= "9";
function isNameFirst(c) {
  return c !== void 0 && (/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 128);
}
function isNameChar2(c) {
  return isNameFirst(c) || isDigit2(c);
}
function isVariableName(name) {
  return name.length > 0 && isNameFirst(name[0]) && [...name].every(isNameChar2);
}
function readSelector(s, i) {
  const bracket = s[i] === "{";
  if (bracket) i += 1;
  if ((s[i] === "#" || s[i] === "?") && (!bracket || s[i + 1] === "}")) {
    return { nameStart: i, nameEnd: i + 1 };
  }
  let n = -1;
  let except = false;
  let ell = false;
  let pee = false;
  let star = false;
  let start;
  const digits = () => {
    n = 0;
    while (isDigit2(s[i])) i += 1;
  };
  if (isDigit2(s[i])) {
    start = i;
    digits();
  } else {
    if (s[i] === "-") {
      except = true;
      i += 1;
    }
    start = i;
    if (s[i] === "L") ell = true;
    else if (s[i] === "P") pee = true;
    else if (s[i] === "*") star = true;
    if (ell || pee || star) i += 1;
    if (!star && isDigit2(s[i])) digits();
  }
  let selector = "";
  if ((n < 0 && !star || bracket && (ell || pee)) && isNameChar2(s[i])) {
    ell = pee = false;
    n = -1;
    do
      i += 1;
    while (isNameChar2(s[i]));
    selector = s.slice(start, i);
  }
  if (star || pee || ell || n >= 0 || selector === "R" || selector === "PL" || selector === "PR") {
    return { nameStart: start, nameEnd: i };
  }
  if (except || selector === "") return void 0;
  return { name: selector, nameStart: start, nameEnd: i };
}
function isStatEnd(s, i) {
  const next = s[i + 1];
  return s[i] === "%" && (next === ";" || next === "|" || next === "\\");
}
function skipString(s, i, end) {
  const quote = s[i];
  for (let k = i + 1; k < end; k += 1) {
    if (s[k] === "\\") k += 1;
    else if (s[k] === quote) return k + 1;
  }
  return end;
}
function matching(s, i, end, open, close) {
  let depth = 0;
  for (let k = i; k < end; k += 1) {
    const c = s[k];
    if (c === '"' || c === "'" || c === "`") k = skipString(s, k, end) - 1;
    else if (c === open) depth += 1;
    else if (c === close && --depth === 0) return k + 1;
  }
  return end;
}
function closeOf(s, i, to) {
  const stack = [s[i] === "(" ? ")" : "}"];
  let k = i + 1;
  while (k < to) {
    const c = s[k];
    if (c === "\\") {
      k += 2;
    } else if ((c === "%" || c === "$") && s[k + 1] === "{") {
      stack.push("}");
      k += 2;
    } else if (c === "$" && s[k + 1] === "(") {
      stack.push(")");
      k += 2;
    } else if (c === "$" && s[k + 1] === "[") {
      k = matching(s, k + 1, to, "[", "]");
    } else if (c === stack[stack.length - 1]) {
      stack.pop();
      k += 1;
      if (stack.length === 0) return k;
    } else {
      k += 1;
    }
  }
  return -1;
}
function substitutionEnd2(s, i, to) {
  if (s[i] === "{") {
    const end = closeOf(s, i, to);
    return end < 0 ? i + 1 : end;
  }
  let k = Math.max(readSelector(s, i)?.nameEnd ?? i, i);
  if (s[k] === "-") while (k < to && !isTfSpace(s[k]) && !isStatEnd(s, k)) k += 1;
  return k;
}
var at = (w, start, end) => ({ start: w.src.map[start], end: w.src.map[end - 1] + 1 });
function push(w, name, access, form, start, end, from) {
  const chain = w.chainAt?.(start) ?? w.chain;
  w.found.push({ name, access, form, ...at(w, start, end), ...from === void 0 ? {} : { from: w.src.map[from] }, chain });
}
function newScope(w, kind) {
  w.scopes.next += 1;
  return `${w.scopes.prefix}:${kind}${w.scopes.next}`;
}
function inner(w, src, chain) {
  return { src, found: w.found, depth: w.depth + 1, chain, scopes: w.scopes };
}
function percents(w, from, to, skip) {
  const s = w.src.text;
  for (let i = from; i < to; i += 1) {
    if (skip[i]) continue;
    if (s[i] === "\\") {
      i += 1;
      continue;
    }
    if (s[i] !== "%") continue;
    let j = i;
    while (s[j] === "%") j += 1;
    const c = s[j];
    if (j - i > 1 || !(c === "{" || c === "#" || c === "?" || c === "*" || c === "-" || isNameChar2(c))) {
      i = j - 1;
      continue;
    }
    const sel = readSelector(s, j);
    const built = c === "{" && sel !== void 0 && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
    if (sel?.name !== void 0 && !built) {
      push(w, sel.name, "read", c === "{" ? "percent-braced" : "percent", sel.nameStart, sel.nameEnd);
    }
    i = (sel?.nameEnd ?? j) - 1;
  }
}
function getopts(w, i, to) {
  const s = w.src.text;
  while (isTfSpace(s[i])) i += 1;
  const quote = s[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return;
  const close = matching(s, i - 1, to, "(", ")");
  for (let k = i + 1; k < to && s[k] !== quote; k += 1) {
    const c = s[k];
    if (c === "\\") return;
    if (/[A-Za-z]/.test(c)) push(w, `opt_${c}`, "getopts", "option-letter", k, k + 1, close);
  }
}
function functionCall(w, name, start, end) {
  if (FUNCTION_NAMES.has(name)) return;
  w.scopes.functionCalls.push({
    name: name.toLowerCase(),
    written: name,
    chain: w.chainAt?.(start) ?? w.chain,
    at: w.src.map[start],
    nameStart: w.src.map[start],
    nameEnd: w.src.map[end - 1] + 1,
    dynamic: false
  });
}
function expression(w, from, to) {
  const s = w.src.text;
  let i = from;
  while (i < to) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(s, i, to);
    } else if (c === "%") {
      let j = i;
      while (s[j] === "%") j += 1;
      if (j === i + 1) {
        const sel = readSelector(s, j);
        const built = s[j] === "{" && sel !== void 0 && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
        if (sel?.name !== void 0 && !built) {
          push(w, sel.name, "read", s[j] === "{" ? "percent-braced" : "percent", sel.nameStart, sel.nameEnd);
        }
      }
      i = Math.max(substitutionEnd2(s, j, to), j);
    } else if (c === "{") {
      const sel = readSelector(s, i);
      const built = sel !== void 0 && s[sel.nameEnd] !== "}" && s[sel.nameEnd] !== "-";
      let k = sel === void 0 ? i : sel.nameEnd + 1;
      while (isTfSpace(s[k])) k += 1;
      if (sel?.name !== void 0 && s[sel.nameEnd] === "}" && s[k] === "(") {
        functionCall(w, sel.name, sel.nameStart, sel.nameEnd);
      } else if (sel?.name !== void 0 && !built) push(w, sel.name, "read", "expr-braced", sel.nameStart, sel.nameEnd);
      i = Math.max(substitutionEnd2(s, i, to), i + 1);
    } else if (c === "/" && isNameFirst(s[i + 1]) && (i === from || isTfSpace(s[i - 1]))) {
      let k = i + 1;
      while (isNameChar2(s[k])) k += 1;
      i = COMMAND_NAMES.has(s.slice(i + 1, k).toLowerCase()) ? k : i + 1;
    } else if (c === "$") {
      if (s[i + 1] === "(" || s[i + 1] === "{") {
        const end = closeOf(s, i + 1, to);
        i = end < 0 ? i + 2 : end;
      } else if (s[i + 1] === "[") i += 2;
      else {
        i += 1;
        while (isNameChar2(s[i])) i += 1;
      }
    } else if (isDigit2(c) || c === "." && isDigit2(s[i + 1])) {
      while (i < to && (isNameChar2(s[i]) || s[i] === ".")) i += 1;
    } else if (isNameFirst(c)) {
      const start = i;
      while (isNameChar2(s[i])) i += 1;
      const before = s[start - 1];
      const after = s[i];
      if (before === "}" || before === "]" || before === PLACEHOLDER || after === PLACEHOLDER) continue;
      if (after === "%" && !isStatEnd(s, i) || after === "$" || after === "{") {
        continue;
      }
      let k = i;
      while (isTfSpace(s[k])) k += 1;
      if (s[k] === "(") {
        const fn = s.slice(start, i);
        if (fn === "getopts") getopts(w, k + 1, to);
        else functionCall(w, fn, start, i);
        continue;
      }
      let b = start - 1;
      while (isTfSpace(s[b])) b -= 1;
      const prefix = s[b] === "+" && s[b - 1] === "+" || s[b] === "-" && s[b - 1] === "-";
      const assigns = ":+-*/".includes(s[k] ?? "x") && s[k + 1] === "=" || prefix;
      push(w, s.slice(start, i), assigns ? "assign" : "read", "expr-bare", start, i);
    } else {
      i += 1;
    }
  }
}
var COMMAND_RE2 = /^\/@?([A-Za-z_]+)/;
var MACRO_DEFINER2 = /^(?:def|edit|bind|hook|gag|hilite|trig|trigc|trigp|trigpc|alias)$/;
function command(w, word, st, argStart) {
  const s = w.src.text;
  let i = argStart;
  while (i < st.end && isTfSpace(s[i])) i += 1;
  const start = i;
  if (word === "unset" || word === "export") {
    let end = st.end;
    while (end > start && isTfSpace(s[end - 1])) end -= 1;
    const name = s.slice(start, end);
    if (isVariableName(name)) push(w, name, word, "command", start, end);
    return;
  }
  if (!isNameFirst(s[i])) return;
  while (i < st.end && isNameChar2(s[i])) i += 1;
  if (i < st.end && s[i] !== "=" && !isTfSpace(s[i])) return;
  const hasValue = s[i] === "=" || s.slice(i, st.end).trim() !== "";
  const access = !hasValue ? "read" : word;
  push(w, s.slice(start, i), access, "command", start, i, access === "let" ? st.end : void 0);
}
var PLACEHOLDER = "";
function handOff(src, from, to, level) {
  if (level === "keyword") return slice(src, from, to);
  if (level === "newline") return shortened(src, from, to);
  const s = src.text;
  let text = "";
  const map = [];
  const add = (ch, at2) => {
    text += ch;
    map.push(src.map[at2]);
  };
  let i = from;
  while (i < to) {
    const c = s[i];
    if (c === "\\" && i + 1 < to) {
      add(s[i + 1], i + 1);
      i += 2;
    } else if (c === "%" || c === "$") {
      let j = i;
      while (j < to && s[j] === c) j += 1;
      if (j - i > 1) {
        for (let k = i + 1; k < j; k += 1) add(c, k === i + 1 ? i : k);
        i = j;
        continue;
      }
      const n = s[j];
      let end = j;
      if (n === "{" || c === "$" && n === "(") {
        const close = closeOf(s, j, to);
        if (close < 0) {
          add(PLACEHOLDER, i);
          i = j;
          continue;
        }
        end = close;
      } else if (c === "%") {
        if (n === "#" || n === "?" || n === "*" || n === "-" || isNameChar2(n)) end = substitutionEnd2(s, j, to);
      } else if (n === "[") end = matching(s, j, to, "[", "]");
      else {
        while (end < to && isNameChar2(s[end])) end += 1;
        if (s[end] === "$") end += 1;
      }
      if (end === j && c === "%") {
        add(c, i);
        i += 1;
      } else {
        add(PLACEHOLDER, i);
        i = Math.max(end, j);
      }
    } else {
      add(c, i);
      i += 1;
    }
  }
  map.push(src.map[to]);
  return { text, map };
}
function handedOn(w, st, argStart) {
  return handOff(w.src, argStart, st.end, st.level);
}
function evalText(w, st, argStart) {
  const src = handedOn(w, st, argStart);
  const e = evalArguments(src.text, 0, src.text.length);
  if (!e) return;
  walk(inner(w, slice(src, e.text, src.text.length), [newScope(w, "eval"), ...callerChain(w, st)]), e.mode);
}
function callerChain(w, st) {
  return w.chainAt?.(st.start) ?? w.chain;
}
function nextWord2(s, i, end) {
  while (i < end && isTfSpace(s[i])) i += 1;
  if (i >= end) return void 0;
  const start = i;
  while (i < end && !isTfSpace(s[i])) i += 1;
  return { start, end: i };
}
function forCommand(w, st, argStart) {
  const src = handedOn(w, st, argStart);
  const s = src.text;
  const v = nextWord2(s, 0, s.length);
  const first = v && nextWord2(s, v.end, s.length);
  const last = first && nextWord2(s, first.end, s.length);
  const command2 = last && nextWord2(s, last.end, s.length);
  if (!v || !first || !last || !command2 || !isVariableName(s.slice(v.start, v.end))) return;
  const chain = [newScope(w, "for"), ...callerChain(w, st)];
  walk(inner(w, slice(src, first.start, first.end), chain.slice(1)), "body");
  const where = { start: src.map[v.start], end: src.map[v.end - 1] + 1 };
  w.found.push({ name: s.slice(v.start, v.end), access: "let", form: "loop-variable", ...where, from: -Infinity, chain });
  const end = inner(w, slice(src, last.start, last.end), chain);
  expression(end, 0, end.src.text.length);
  walk(inner(w, slice(src, command2.start, s.length), chain), "body");
}
function repeatCommand(w, st, argStart) {
  const src = handedOn(w, st, argStart);
  const r = repeatArguments(src.text, 0, src.text.length);
  if (!r) return;
  const chain = [newScope(w, "repeat"), ...r.now ? callerChain(w, st) : []];
  walk(inner(w, slice(src, r.command, src.text.length), chain), "body");
}
function defExpression(w, from, to) {
  const s = w.src.text;
  for (let i = from; i < to - 1; i += 1) {
    if (!(s[i] === "-" && s[i + 1] === "E" && (i === from || isTfSpace(s[i - 1])))) continue;
    let k = i + 2;
    const quote = s[k];
    if (quote === '"' || quote === "'" || quote === "`") {
      const end = skipString(s, k, to);
      expression(w, k + 1, end - 1);
      i = end;
    } else {
      while (k < to && !isTfSpace(s[k])) k += 1;
      expression(w, i + 2, k);
      i = k;
    }
  }
}
function slice(src, start, end) {
  return { text: src.text.slice(start, end), map: src.map.slice(start, end + 1) };
}
var CALL_RE = /^\/(?!@)(!?)([^\s%;|$\u0001]+)/;
function statement(w, st, skip) {
  const s = w.src.text;
  if (st.level === "full") percents(w, st.start, st.end, skip);
  const call = CALL_RE.exec(s.slice(st.start, Math.min(st.end, st.start + 200)));
  if (call) {
    const written = call[2];
    const nameStart = st.start + 1 + call[1].length;
    const nameEnd = nameStart + written.length;
    const next = nameEnd < st.end ? s[nameEnd] : void 0;
    w.scopes.calls.push({
      name: written.toLowerCase(),
      written,
      chain: callerChain(w, st),
      at: w.src.map[st.start],
      nameStart: w.src.map[nameStart],
      nameEnd: w.src.map[nameEnd - 1] + 1,
      dynamic: next === "%" || next === "$" || next === PLACEHOLDER
    });
  }
  const m = COMMAND_RE2.exec(s.slice(st.start, Math.min(st.end, st.start + 40)));
  if (!m) return;
  const word = m[1].toLowerCase();
  const argStart = st.start + m[0].length;
  if (argStart < st.end && !isTfSpace(s[argStart])) return;
  if (word === "set" || word === "setenv" || word === "let" || word === "unset" || word === "export") {
    command(w, word, st, argStart);
    return;
  }
  if (word === "def") {
    const body = macroBodyStart(s.slice(st.start, st.end));
    defExpression(w, argStart, body < 0 ? st.end : st.start + body - 1);
  }
  if (word === "expr") expression(w, argStart, st.end);
  if (w.depth >= 8) return;
  if (word === "eval") {
    evalText(w, st, argStart);
  } else if (word === "for") {
    forCommand(w, st, argStart);
  } else if (word === "repeat") {
    repeatCommand(w, st, argStart);
  } else if (MACRO_DEFINER2.test(word) && st.level === "full") {
    const text = s.slice(st.start, st.end);
    const body = macroBodyStart(text);
    if (body < 0) return;
    const name = word === "def" ? text.slice(defOptionsEnd(text, text.search(/def/i) + 3), body - 1).trim() : "";
    w.scopes.nested.push({
      name: name.toLowerCase(),
      src: handOff(w.src, st.start + body, st.end, st.level),
      definer: callerChain(w, st),
      at: w.src.map[st.start],
      depth: w.depth
    });
  }
}
function nestedBodies(found, scopes) {
  while (scopes.nested.length > 0) {
    const d = scopes.nested.shift();
    const runsHere = (chain) => chain.length >= d.definer.length && d.definer.every((c, i) => chain[chain.length - d.definer.length + i] === c);
    const called = d.name !== "" && scopes.calls.some((c) => c.name === d.name && c.at > d.at && runsHere(c.chain));
    const own = `${scopes.prefix}:def${scopes.next += 1}`;
    walk({ src: d.src, found, depth: d.depth + 1, chain: [own, ...called ? d.definer : []], scopes }, "body");
  }
}
function stringsIn2(s, expressions) {
  const mask = new Uint8Array(s.length + 1);
  for (const ex of expressions) {
    if (ex.kind === "statement") continue;
    let k = ex.start;
    while (k < ex.end) {
      const c = s[k];
      if (c === '"' || c === "'" || c === "`") {
        const end = skipString(s, k, ex.end);
        mask.fill(1, k, end);
        k = end;
      } else if (c === "$" && s[k + 1] === "(") {
        const end = closeOf(s, k + 1, ex.end);
        k = end < 0 ? k + 2 : end;
      } else {
        k += 1;
      }
    }
  }
  return mask;
}
function scopesOf(w, cmdsubs) {
  if (cmdsubs.length === 0) return () => w.chain;
  const subs = [...cmdsubs].sort((a, b) => a.start - b.start || b.end - a.end);
  const owner = new Int32Array(w.src.text.length + 1).fill(-1);
  const parent = [];
  const stack = [];
  let k = 0;
  for (let p = 0; p <= w.src.text.length; p += 1) {
    while (stack.length > 0 && subs[stack[stack.length - 1]].end <= p) stack.pop();
    while (k < subs.length && subs[k].start <= p) {
      parent[k] = stack[stack.length - 1] ?? -1;
      stack.push(k);
      k += 1;
      while (stack.length > 0 && subs[stack[stack.length - 1]].end <= p) stack.pop();
    }
    owner[p] = stack[stack.length - 1] ?? -1;
  }
  const names = subs.map(() => newScope(w, "cmdsub"));
  const chains = /* @__PURE__ */ new Map();
  const chainOf = (i) => {
    if (i < 0) return w.chain;
    let c = chains.get(i);
    if (!c) {
      c = [names[i], ...chainOf(parent[i])];
      chains.set(i, c);
    }
    return c;
  };
  return (offset) => chainOf(owner[offset] ?? -1);
}
function walk(w, mode) {
  const { statements, expressions, cmdsubs } = parseRegions(w.src.text, mode);
  w.chainAt = scopesOf(w, cmdsubs);
  const skip = stringsIn2(w.src.text, expressions);
  for (const st of statements) statement(w, st, skip);
  for (const ex of expressions) region(w, ex, skip);
}
function region(w, ex, skip) {
  if (ex.kind === "statement" && ex.level === "full") percents(w, ex.start, ex.end, skip);
  expression(w, ex.start, ex.end);
}
function entryCalls(entry, calls) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const c of calls) {
    if (seen.has(c.nameStart)) continue;
    seen.add(c.nameStart);
    const first = entry.offsetMap[c.nameStart];
    const last = entry.offsetMap[c.nameEnd - 1];
    if (!first || !last || first.line !== last.line) continue;
    out.push({
      name: c.written,
      range: { start: { line: first.line, character: first.character }, end: { line: last.line, character: last.character + 1 } },
      dynamic: c.dynamic
    });
  }
  return out.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
}
function entryVariables(entry, index) {
  const s = entry.text;
  const found = [];
  const src = { text: s, map: Array.from({ length: s.length + 1 }, (_, i) => i) };
  const local = `local:${index}`;
  const scopes = { prefix: local, next: 0, calls: [], functionCalls: [], nested: [] };
  walk({ src, found, depth: 0, chain: [`${local}:top`], scopes }, "top");
  const body = entry.isDefBody || entry.isOtherMacroBody ? macroBodyStart(s) : -1;
  if (body >= 0) walk({ src: slice(src, body, s.length), found, depth: 0, chain: [local], scopes }, "body");
  nestedBodies(found, scopes);
  const seen = /* @__PURE__ */ new Set();
  const unique = found.filter((f) => !seen.has(f.start) && (seen.add(f.start), true)).sort((a, b) => a.start - b.start);
  const born = /* @__PURE__ */ new Map();
  const binds = (f) => f.access === "let" || f.access === "getopts";
  for (const f of unique) {
    if (!binds(f) || f.from === void 0) continue;
    const key2 = `${f.chain[0]}\0${f.name}`;
    born.set(key2, Math.min(born.get(key2) ?? Infinity, f.from));
  }
  const out = [];
  for (const f of unique) {
    let scope = "global";
    if (binds(f)) scope = f.chain[0];
    else if (f.access === "read" || f.access === "assign") {
      scope = f.chain.find((c) => (born.get(`${c}\0${f.name}`) ?? Infinity) <= f.start) ?? "global";
    }
    const first = entry.offsetMap[f.start];
    const last = entry.offsetMap[f.end - 1];
    if (!first || !last || first.line !== last.line) continue;
    out.push({
      name: f.name,
      access: f.access,
      form: f.form,
      scope,
      entry: index,
      offset: f.start,
      range: { start: { line: first.line, character: first.character }, end: { line: last.line, character: last.character + 1 } }
    });
  }
  return { variables: out, calls: entryCalls(entry, scopes.calls), functionCalls: entryCalls(entry, scopes.functionCalls) };
}
var cache3 = /* @__PURE__ */ new Map();
var CACHE_SIZE = 2e3;
var CACHE_CHARS = 16e6;
var cachedChars = 0;
var scanStats = { scans: 0 };
function scan(text) {
  let result = cache3.get(text);
  if (result) {
    cache3.delete(text);
    cache3.set(text, result);
  } else {
    scanStats.scans += 1;
    const entries = splitLogicalEntries(text).flatMap((entry, i) => entry.incomplete ? [] : [entryVariables(entry, i)]);
    result = {
      variables: entries.flatMap((e) => e.variables),
      calls: entries.flatMap((e) => e.calls),
      functionCalls: entries.flatMap((e) => e.functionCalls)
    };
    while (cache3.size > 0 && (cache3.size >= CACHE_SIZE || cachedChars + text.length > CACHE_CHARS)) {
      const oldest = cache3.keys().next().value;
      cache3.delete(oldest);
      cachedChars -= oldest.length;
    }
    cache3.set(text, result);
    cachedChars += text.length;
  }
  return result;
}
function findMacroCalls(text) {
  return scan(text).calls;
}
function findFunctionCalls(text) {
  return scan(text).functionCalls;
}

// packages/core/src/documentLinks.ts
function findLoadPaths(text) {
  const out = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    for (const load of entryLoads(entry)) {
      const written = entry.text.slice(load.start, load.end);
      const namesVariable = /%\{|%[A-Za-z_]/.test(written.replace(/%%+/g, ""));
      if (/\\/.test(written) || !load.pending.includes("full") && namesVariable) continue;
      const file = literalText(load.file, load.pending);
      if (file === void 0) continue;
      const from = entry.offsetMap[load.start];
      const last = entry.offsetMap[load.end - 1];
      if (!from || !last || from.line !== last.line || last.character - from.character !== written.length - 1) continue;
      out.push({
        kind: load.kind,
        file,
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        line: entry.startLine,
        offset: load.start,
        topLevel: load.topLevel
      });
    }
  }
  return out;
}

// packages/core/src/workspace/tfHelp.ts
var ANSI_RE = /\x1b\[[0-9;]*m/g;
var RULE_RE = /^\s*_{10,}\s*$/;
function lowerCommandWord(line) {
  return line.replace(/^\/(\S+)/, (_, word) => `/${word.toLowerCase()}`);
}
function parseSection(body) {
  const rule = body.findIndex((l) => RULE_RE.test(l));
  const usageStart = body.findIndex((l) => /usage:\s*$/i.test(l));
  const head = rule === -1 || usageStart === -1 ? [] : body.slice(usageStart + 1, rule);
  const usage = head.map((l) => l.trim()).filter((l) => l.startsWith("/")).map(lowerCommandWord);
  const rest = rule === -1 ? body : body.slice(rule + 1);
  const start = rest.findIndex((l) => l.trim() !== "");
  const paragraph = [];
  for (let i = start; start !== -1 && i < rest.length; i += 1) {
    const line = rest[i];
    if (line.trim() === "") break;
    paragraph.push(line.trim());
  }
  return { usage, summary: paragraph.join(" ").replace(/\s+/g, " ").trim() };
}
function parseAnchors(lines, entries) {
  let i = 0;
  while (i < lines.length) {
    if (!/^#\S/.test(lines[i])) {
      i += 1;
      continue;
    }
    const names = [];
    while (i < lines.length && /^#\S/.test(lines[i])) {
      names.push(lines[i].slice(1).trim().toLowerCase());
      i += 1;
    }
    while (i < lines.length && lines[i].trim() === "") i += 1;
    const signatures = [];
    while (i < lines.length && /^ {1,4}\S/.test(lines[i])) {
      signatures.push(lines[i].trim());
      i += 1;
    }
    const description = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^[#&]/.test(lines[i])) {
      description.push(lines[i].trim());
      i += 1;
    }
    if (signatures.length === 0 || description.length === 0) continue;
    const entry = { usage: signatures, summary: description.join(" ").replace(/\s+/g, " ").trim() };
    for (const name of names) if (!entries.has(name)) entries.set(name, entry);
  }
}
function parseTfHelp(text) {
  const entries = /* @__PURE__ */ new Map();
  const lines = text.replace(ANSI_RE, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith("&")) {
      i += 1;
      continue;
    }
    const topics = [];
    while (i < lines.length && lines[i].startsWith("&")) {
      topics.push(lines[i].slice(1).trim().toLowerCase());
      i += 1;
    }
    const body = [];
    while (i < lines.length && !lines[i].startsWith("&")) {
      body.push(lines[i]);
      i += 1;
    }
    const entry = parseSection(body);
    for (const topic of topics) if (!entries.has(topic)) entries.set(topic, entry);
  }
  parseAnchors(lines, entries);
  return entries;
}

// packages/core/src/workspace/loadPathDiagnostics.ts
var path5 = __toESM(require("node:path"));
var COMMAND_NAMES2 = new Set(ALL_COMMANDS.map((c) => c.name.toLowerCase()));
var ANY_DEF_RE = /(?:^|[\s;|(])\/@?def\b((?:\s+-(?:[^\s"'`]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)*)*)\s+([^\s=]+)/gi;
function macroNames(text) {
  const names = /* @__PURE__ */ new Map();
  const prefixes = [];
  for (const m of text.matchAll(ANY_DEF_RE)) {
    const written = m[2];
    const name = written.toLowerCase();
    const dynamic = name.search(/[%$]/);
    if (dynamic === -1) {
      if (!names.has(name)) names.set(name, written);
    } else if (dynamic > 0) prefixes.push(name.slice(0, dynamic));
  }
  return { names, prefixes };
}
function defines(defs, name) {
  return defs.names.has(name) || defs.prefixes.some((p) => name.startsWith(p));
}
function unfollowedOnPath(graph, label = (f) => path5.basename(f)) {
  return graph.unresolved.filter(
    (u) => u.kind === "unknown-variable" || u.kind === "guarded-variable" || u.kind === "user-home" || u.kind === "unknown-library" || u.searched.some(isForeignPath)
  ).map((u) => ({ raw: u.raw, label: label(u.from), line: u.line }));
}
function onPathNames(graph, file, ownText, namesOf) {
  const names = new Map([...COMMAND_NAMES2].map((n) => [n, n]));
  const prefixes = [];
  for (const [f, text] of [[file, ownText], ...graph.files.map((g) => [g.path, g.text])]) {
    const d = namesOf(f, text);
    for (const [n, written] of d.names) if (!names.has(n)) names.set(n, written);
    prefixes.push(...d.prefixes);
  }
  for (const f of graph.files) {
    for (const d of f.defs) if (!names.has(d.symbol.name.toLowerCase())) names.set(d.symbol.name.toLowerCase(), d.symbol.name);
  }
  return { names, prefixes };
}
function ignored(patterns, name) {
  return patterns.some((p) => {
    const re = new RegExp(`^${p.toLowerCase().split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    return re.test(name);
  });
}
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    const row = rows[i];
    const up = rows[i - 1];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(up[j] + 1, row[j - 1] + 1, up[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}
function nearestName(name, candidates) {
  if (name.length < 4) return void 0;
  const limit = name.length >= 6 ? 2 : 1;
  let best;
  let bestDistance = Infinity;
  let tied = false;
  for (const c of candidates) {
    if (Math.abs(c.length - name.length) > limit) continue;
    const d = editDistance(name, c);
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
      tied = false;
    } else if (d === bestDistance) {
      tied = true;
    }
  }
  return best !== void 0 && bestDistance <= limit && bestDistance > 0 && !tied ? best : void 0;
}
function insertLine(text, lines, line) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const count = text.endsWith("\n") ? lines.length - 1 : lines.length;
  const loaded = lines.findIndex((l) => /^\s*\/loaded\s/i.test(l));
  let at2;
  if (loaded >= 0) {
    at2 = loaded + 1;
  } else {
    at2 = 0;
    while (at2 < count && (isCommentLine(lines[at2]) || lines[at2].trim() === "")) at2 += 1;
    let doc = at2;
    while (doc > 0 && /^\s*;;;/.test(lines[doc - 1])) doc -= 1;
    if (doc > 0 && at2 < count) at2 = doc;
  }
  if (at2 < count) return { range: { start: { line: at2, character: 0 }, end: { line: at2, character: 0 } }, newText: `${line}${eol}` };
  const last = Math.max(0, count - 1);
  const end = { line: last, character: (lines[last] ?? "").replace(/\r$/, "").length };
  return { range: { start: end, end }, newText: count === 0 ? `${line}${eol}` : `${eol}${line}` };
}
function guardedByIsmacro(lines, line, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const guard = new RegExp(`ismacro\\W{1,3}${escaped}\\b`, "i");
  for (let i = line; i >= Math.max(0, line - 5); i -= 1) if (guard.test(lines[i] ?? "")) return true;
  return false;
}
function rangeOf2(lines, entries, u) {
  const entry = entries.find((e) => e.startLine === u.line);
  const from = entry?.offsetMap[u.start];
  const last = entry?.offsetMap[u.end - 1];
  if (from && last) return { start: { ...from }, end: { line: last.line, character: last.character + 1 } };
  const text = lines[u.line] ?? "";
  const start = text.length - text.trimStart().length;
  return { start: { line: u.line, character: start }, end: { line: u.line, character: text.trimEnd().length } };
}
function unresolvedDetail(u) {
  if (u.kind === "unknown-variable" && u.variable !== "HOME") {
    const named = u.variable ? ` To have it checked, give %{${u.variable}} a value in tfscript.variables.` : "";
    return {
      message: `This load can't be followed here: ${u.reason}.${named}`,
      label: "can't follow",
      explanation: `tf works the path out when it runs. This check only follows paths built from literal ${code("/set")} values and ${code("tfscript.variables")}, so it can't tell whether tf will find the file.`
    };
  }
  if (u.kind === "unknown-variable" && u.variable === "HOME") {
    return {
      message: `This load can't be followed here: ${u.reason}, and ~ means tf's HOME: set tfscript.homeDirectory.`,
      label: "can't follow",
      explanation: `A path starting with ${code("~")} is under tf's ${code("HOME")}, which this check takes from ${code("tfscript.homeDirectory")}.`
    };
  }
  if (u.kind === "guarded-variable") {
    return {
      message: `This load can't be followed here: %{${u.variable}} is set inside an /if or /while on the load path, and this check can't tell whether that /set runs. To have it checked, give %{${u.variable}} a value in tfscript.variables.`,
      label: "can't follow",
      explanation: `${code("tfscript.variables")} gives variables the value they have when tf starts, as if ${code("/set")} then, for example ${code(`{ "${u.variable}": "/path/as/tf/sees/it" }`)}. Such a value stands through a ${code("/set")} inside an ${code("/if")} or ${code("/while")}, the way the default-value idiom leaves a variable that is already set.`
    };
  }
  if (u.kind === "user-home") {
    const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
    return {
      message: `This load can't be followed here, since ~${user} depends on whether user ${user} exists: write the full path to have it checked.`,
      label: "can't follow",
      explanation: `tf takes ${code(`~${user}`)} from user ${code(user)}'s home directory, or, if there is no such user, as a folder named ${code(`~${user}`)} in its current directory. ${userHomeExplanation(u)}`
    };
  }
  if (u.kind === "unknown-library") {
    return {
      message: `tf's library isn't known here, and "${u.file}" is one of its files: set tfscript.libraryPath to the folder that holds stdlib.tf.`,
      label: "can't follow",
      explanation: `tf looks for a relative path in its current directory, then in ${code("TFLIBDIR")} (when ${code("TFPATH")} is empty), where ${code(u.file)} is installed with tf. This check takes ${code("TFLIBDIR")} from ${code("tfscript.libraryPath")}, or the ${code("TFLIBDIR")} environment variable, and neither is set.`
    };
  }
  const shown = u.file === u.raw ? `"${u.raw}"` : `"${u.raw}" (${u.file})`;
  if (/^~(?:\/|$)/.test(u.file)) {
    return {
      message: `tf won't find ${shown} in its HOME directory (${u.searched[0] ?? ""}): fix the path.`,
      label: "not found",
      explanation: `A path starting with ${code("~/")} is under tf's ${code("HOME")} (${code("tfscript.homeDirectory")} here), and tf looks nowhere else for it.`
    };
  }
  if (u.file.startsWith("~") || path5.isAbsolute(u.file)) {
    const unmapped = u.file.startsWith("/") && path5.normalize(u.file) === path5.normalize(u.searched[0] ?? "");
    return {
      message: unmapped ? `tf won't find ${shown}: fix the path, or if tf runs where that path exists, map it with tfscript.pathMappings.` : `tf won't find ${shown}: fix the path.`,
      label: "not found",
      explanation: `The path is absolute, so tf looks only at ${u.searched.map((s) => code(s)).join(", ")}.` + (unmapped ? ` If tf runs in a container or on another machine, ${code("tfscript.pathMappings")} says where its paths are here, for example ${code('[{ "tf": "/wotmud", "local": "C:/Users/me/wotmud" }]')}.` : "")
    };
  }
  return {
    message: `tf won't find ${shown}: fix the path, or set tfscript.workingDirectory to the folder tf runs in.`,
    label: "not found",
    explanation: `tf would try, in order: ${u.searched.map((s) => code(s)).join(", ")}. A relative path is looked up from tf's current directory (${code("tfscript.workingDirectory")}), then ${code("TFPATH")}, not from this file's folder.`
  };
}
function userHomeExplanation(u) {
  const user = /^~([^/]+)/.exec(u.file)?.[1] ?? "";
  const rest = u.file.slice(user.length + 1);
  return `If \`${user}\` is misspelt, or there is no such user, tf doesn't warn: it reads \`./~${user}${rest}\` from its current directory instead.`;
}
var UNDEFINED_EXPLANATION = `tf looks the name up when the command runs, and with no macro or command of that name it prints ${code("NAME: no such command or macro")}, sets ${code("%?")} to 1 and goes on with the next command. This check looked in this file, the files on its load path, the other tf files in the workspace and tf's library. A macro made while tf runs (${code("/eval /def")}, or a file loaded some other way) isn't seen: add its name to ${code("tfscript.diagnostics.ignoreMacros")}.`;
function undefinedMacros(file, text, lines, graph, onPath, { elsewhere = [], unfollowed = [], requirePath = () => void 0, namesOf = (_f, t) => macroNames(t), readOnly }, ignore) {
  const visible = onPathNames(graph, file, text, namesOf);
  const out = [];
  for (const call of findMacroCalls(text)) {
    if (call.dynamic) continue;
    const name = call.name.toLowerCase();
    if (!/^[A-Za-z0-9_~:]/.test(name) || /[/*]/.test(name)) continue;
    if (/^(?:if|elseif|while|then|else|endif|do|done|break)\(/.test(name)) continue;
    if (defines(visible, name) || ignored(ignore, name)) continue;
    if (guardedByIsmacro(lines, call.range.start.line, name)) continue;
    const there = elsewhere.find((e) => defines(e.defs, name));
    if (there) {
      if (!onPath) continue;
      const where = there.library ? `tf's library file ${there.label}` : there.label;
      const required = requirePath(there.file);
      const d2 = {
        range: call.range,
        message: required === void 0 ? `/${call.name} is defined in ${where}, which isn't on this file's load path: load it first.` : `/${call.name} is defined in ${where}, which isn't on this file's load path: add /require ${required}.`,
        label: "not loaded",
        explanation: `None of the files tf loads on this file's load path define ${code(`/${call.name}`)}, so unless ${there.label} is loaded some other way first, tf prints ${code(`${call.name}: no such command or macro`)} here.`,
        code: "undefined-macro",
        severity: "information"
      };
      if (required !== void 0) d2.fix = { title: `Add /require ${required}`, edits: [insertLine(text, lines, `/require ${required}`)] };
      out.push(d2);
      continue;
    }
    const close = nearestName(name, visible.names.keys());
    const nearest = close === void 0 ? void 0 : visible.names.get(close) ?? close;
    const blind = unfollowed[0];
    const d = blind ? {
      // A load this check can't follow may well define it: say so, quietly.
      range: call.range,
      message: `/${call.name} isn't defined in any file this check can read, but the load of ${blind.raw} (${blind.label} line ${blind.line + 1}) can't be followed: ` + (nearest ? `did you mean /${nearest}?` : "make that load resolve, or check the name."),
      label: "not found",
      explanation: `${UNDEFINED_EXPLANATION} Loads it couldn't follow, which may define it: ${unfollowed.slice(0, 5).map((u) => `${code(u.raw)} (${u.label} line ${u.line + 1})`).join(", ")}${unfollowed.length > 5 ? `, and ${unfollowed.length - 5} more` : ""}.`,
      code: "undefined-macro",
      severity: "information"
    } : readOnly !== void 0 ? {
      // The folder wasn't read to the end: a file past the limit may define it.
      range: call.range,
      message: `/${call.name} isn't defined on this file's load path, in tf's library, or in the first ${readOnly} tf files of this folder, the most this check reads: ${nearest ? `did you mean /${nearest}?` : "check the name."}`,
      label: "not found",
      explanation: `${UNDEFINED_EXPLANATION} The workspace folder has more tf files than that, which may define it.`,
      code: "undefined-macro",
      severity: "information"
    } : {
      range: call.range,
      message: nearest ? `There's no macro or command /${call.name}: did you mean /${nearest}?` : `There's no macro or command /${call.name} anywhere tf can see: check the name.`,
      label: "not defined",
      explanation: UNDEFINED_EXPLANATION,
      code: "undefined-macro",
      severity: "warning"
    };
    if (nearest) d.fix = { title: `Change to /${nearest}`, edits: [{ range: call.range, newText: nearest }] };
    out.push(d);
  }
  return out;
}
function loadPathDiagnostics(file, text, graph, options, context = {}) {
  const self = fileKey(file);
  const onPath = graph.files.some((f) => fileKey(f.path) === self);
  const lines = splitRawLines(text);
  const out = [];
  if (options.undefinedMacros) {
    const unfollowed = context.unfollowed ?? (onPath ? unfollowedOnPath(graph) : []);
    for (const d of undefinedMacros(file, text, lines, graph, onPath, { ...context, unfollowed }, options.ignoreMacros ?? [])) out.push(d);
  }
  if (!onPath) return out;
  const entries = splitLogicalEntries(text);
  if (options.unresolvedLoads) {
    for (const u of graph.unresolved) {
      if (fileKey(u.from) !== self || u.kind === "not-substituted") continue;
      out.push({
        range: rangeOf2(lines, entries, u),
        ...unresolvedDetail(u),
        code: "unresolved-load",
        severity: u.kind === "not-found" ? "warning" : "information"
      });
    }
  }
  return out;
}

// packages/core/src/workspace/workspaceIndex.ts
var MAX_WALKED_FILES = 5e3;
var UNWATCHED_WALK_MS = 1e4;
var UNWATCHED_CHECK_MS = 1e3;
var NOT_WALKED = { files: [], truncated: false };
function isInside(file, dir) {
  const rel = path6.relative(fileKey(dir), fileKey(file));
  return rel !== "" && !rel.startsWith("..") && !path6.isAbsolute(rel);
}
var WorkspaceIndex = class {
  constructor(fs, environment) {
    this.fs = fs;
    this.environment = environment;
  }
  fs;
  environment;
  folders = [];
  raw = /* @__PURE__ */ new Map();
  overlay = /* @__PURE__ */ new Map();
  resolved = /* @__PURE__ */ new Map();
  /** Keyed by folder and context name. */
  graphs = /* @__PURE__ */ new Map();
  libraries = /* @__PURE__ */ new Map();
  helps = /* @__PURE__ */ new Map();
  setFolders(folders) {
    this.folders = folders.map((f) => path6.resolve(f));
    this.invalidate();
  }
  setSettings(folder, raw) {
    this.raw.set(fileKey(folder), raw);
    this.invalidate();
    this.resolvable.clear();
    this.libraries.clear();
    this.helps.clear();
  }
  /**
   * An open document's text (undefined once it is closed). Its disk text is read again after
   * it closes, and whether loads resolve is worked out again: the file may be one they find.
   */
  setOverlay(file, text) {
    if (text === void 0) this.overlay.delete(fileKey(file));
    else this.overlay.set(fileKey(file), text);
    this.disk.delete(fileKey(file));
    this.resolvable.clear();
    this.invalidate();
  }
  /**
   * The folders a file watcher reports changes in (workspace folders, and whatever else the
   * client agreed to watch). Text read from disk under them is kept until filesChanged(); text
   * read anywhere else is checked against the file's modification time first.
   */
  setWatchedRoots(roots) {
    this.watchedRoots = roots.map((r) => path6.resolve(r));
  }
  watchedRoots = [];
  isWatched(file) {
    return this.watchedRoots.some((r) => fileKey(r) === fileKey(file) || isInside(file, r));
  }
  invalidate() {
    this.graphs.clear();
    this.resolved.clear();
  }
  /** Files read from disk, until a watched file changes (filesChanged()) or, unwatched, until their modification time does. */
  disk = /* @__PURE__ */ new Map();
  read = (file) => {
    const key2 = fileKey(file);
    const open = this.overlay.get(key2);
    if (open !== void 0) return open;
    const cached = this.disk.get(key2);
    if (cached) return cached.text;
    const mtime2 = this.fs.mtime?.(file);
    const text = this.fs.readFile(file);
    this.disk.set(key2, { file, text, mtime: mtime2 });
    return text;
  };
  /**
   * Forgets the disk text of every file no watcher covers whose modification time has changed
   * (or that appeared or went away), and the graphs built from it. Run before a graph is used.
   */
  refreshUnwatched() {
    if (!this.fs.mtime) return;
    const since = Date.now() - this.lastRefresh;
    if (since < UNWATCHED_CHECK_MS) {
      if (!this.recheckPending && [...this.disk.values()].some((e) => !this.isWatched(e.file))) {
        this.recheckPending = true;
        this.recheck?.(UNWATCHED_CHECK_MS - since);
      }
      return;
    }
    this.lastRefresh = Date.now();
    this.recheckPending = false;
    let changed = false;
    for (const [key2, entry] of this.disk) {
      if (this.isWatched(entry.file) || this.fs.mtime(entry.file) === entry.mtime) continue;
      this.disk.delete(key2);
      changed = true;
    }
    if (changed) {
      this.resolvable.clear();
      this.invalidate();
    }
  }
  recheckPending = false;
  recheck;
  /**
   * How to ask for the open documents to be checked again in `delayMs`: called when a check of
   * unwatched files' modification times was skipped for being too soon after the last.
   */
  setRecheck(recheck) {
    this.recheck = recheck;
  }
  /**
   * Every macro-defining entry (`/def`, `/alias`, `/bind`, `/hook`, `/trig*`) in every tf
   * script under the workspace folders — reached by a load path or not — whose name contains
   * the query's characters in order, ignoring case (the editor ranks them further).
   */
  lastRefresh = -Infinity;
  workspaceSymbols(query) {
    this.refreshUnwatched();
    const q = query.toLowerCase();
    const matches = (name) => {
      let i = 0;
      for (const ch of name.toLowerCase()) if (ch === q[i]) i += 1;
      return i === q.length;
    };
    const seen = /* @__PURE__ */ new Set();
    const results = [];
    for (const folder of this.folders) {
      for (const file of this.fs.walkTfFiles(folder)) {
        if (seen.has(fileKey(file))) continue;
        seen.add(fileKey(file));
        const text = this.read(file);
        if (text === void 0) continue;
        for (const symbol of getDocumentSymbols(text)) {
          if (matches(symbol.name)) results.push({ file: path6.resolve(file), folder, symbol });
        }
      }
    }
    return results;
  }
  folderFor(file) {
    const inside = this.folders.filter((f) => isInside(file, f));
    return inside.sort((a, b) => b.length - a.length)[0] ?? path6.dirname(path6.resolve(file));
  }
  settingsFor(folder) {
    const key2 = fileKey(folder);
    let settings = this.resolved.get(key2);
    if (!settings) {
      settings = resolveSettings(this.raw.get(key2) ?? {}, folder, this.environment);
      this.resolved.set(key2, settings);
    }
    return settings;
  }
  /** The load graph of one context in `folder` (the active one if unnamed). */
  graphFor(folder, contextName) {
    const settings = this.settingsFor(folder);
    const context = settings.contexts.find((c) => c.name === (contextName ?? settings.activeContext)) ?? settings.contexts[0];
    const key2 = `${fileKey(folder)}\0${context?.name ?? ""}`;
    const cached = this.graphs.get(key2);
    if (cached) return cached;
    const graph = buildLoadGraph({
      entryFiles: context?.entryFiles ?? [],
      libraryDir: settings.libraryDir,
      tfPath: settings.tfPath,
      workingDir: settings.workingDir,
      home: settings.home,
      pathMappings: settings.pathMappings,
      variables: settings.variables,
      readFile: this.read
    });
    const built = { settings, graph };
    this.graphs.set(key2, built);
    return built;
  }
  /**
   * tf's library files: listed once (until a watched file changes), read like any other file, so
   * an open library file's unsaved text counts and a changed one is read again.
   */
  library(dir) {
    return this.libraryListing(dir).files.flatMap((file) => {
      const text = this.read(file);
      return text === void 0 ? [] : [{ path: file, text, defs: this.librarySymbols(file, text) }];
    });
  }
  /** The library's files, kept until a watched file changes, or for a few seconds when no watcher covers it. */
  libraryListing(dir) {
    const key2 = fileKey(dir);
    let listed = this.libraries.get(key2);
    if (!listed || !this.isWatched(dir) && Date.now() - listed.at >= UNWATCHED_WALK_MS) {
      listed = { files: this.fs.listTfFiles(dir).map((f) => path6.resolve(f)), at: Date.now() };
      this.libraries.set(key2, listed);
    }
    return listed;
  }
  librarySymbolCache = /* @__PURE__ */ new Map();
  librarySymbols(file, text) {
    const cached = this.librarySymbolCache.get(fileKey(file));
    if (cached && cached.text === text) return cached.defs;
    const defs = getDocumentSymbols(text).filter((s) => s.kind === "def");
    this.librarySymbolCache.set(fileKey(file), { text, defs });
    return defs;
  }
  /**
   * The context `file` is seen in: the active one if its load path reaches the file, else the
   * first context that does (tf can only have read the file that way), else the active one.
   */
  contextFor(file) {
    this.refreshUnwatched();
    const folder = this.folderFor(file);
    const settings = this.settingsFor(folder);
    const self = fileKey(file);
    const reaches = (name2) => this.graphFor(folder, name2).graph.files.some((f) => fileKey(f.path) === self);
    const name = [settings.activeContext, ...settings.contexts.map((c) => c.name)].find(reaches) ?? settings.activeContext;
    return { folder, name, settings, graph: this.graphFor(folder, name).graph };
  }
  /**
   * Every context of `file`'s folder: whether it loads the file, through which chain of loads
   * (entry file first, the file itself last), and which context the file is seen in.
   */
  contextInfo(file) {
    const { folder, name, settings } = this.contextFor(file);
    const contexts = settings.contexts.map((c) => {
      const byKey = new Map(this.graphFor(folder, c.name).graph.files.map((f) => [fileKey(f.path), f]));
      const chain = [];
      const seen = /* @__PURE__ */ new Set();
      let at2 = byKey.get(fileKey(file));
      while (at2 && !seen.has(fileKey(at2.path))) {
        seen.add(fileKey(at2.path));
        chain.unshift(this.label(at2.path, folder, settings.libraryDir));
        const from = at2.sites[0]?.from;
        at2 = from === void 0 ? void 0 : byKey.get(fileKey(from));
      }
      const entryFiles = c.entryFiles.map((e) => this.label(e, folder, settings.libraryDir));
      return { name: c.name, entryFiles, loadsFile: chain.length > 0, chain };
    });
    return { folder, active: settings.activeContext, used: name, contexts };
  }
  /** How to name a file to the user: a library file by its name, a workspace file relative to the folder. */
  label(f, folder, lib) {
    if (lib && isInside(f, lib)) return path6.basename(f);
    const rel = path6.relative(folder, f);
    return rel.startsWith("..") || path6.isAbsolute(rel) ? f : rel.replace(/\\/g, "/");
  }
  /** unresolved-load and (if enabled) undefined-macro diagnostics for `file`, from its context's graph. */
  loadPathDiagnostics(file, text) {
    const { folder, graph, settings } = this.contextFor(file);
    const options = this.raw.get(fileKey(folder))?.diagnostics;
    const library = [settings, ...this.folders.map((f) => this.settingsFor(f))].some((s) => s.libraryDir !== void 0 && isInside(file, s.libraryDir));
    const undefinedMacros2 = (options?.undefinedMacros ?? true) && !library;
    return loadPathDiagnostics(
      file,
      text,
      graph,
      { unresolvedLoads: options?.unresolvedLoads ?? true, undefinedMacros: undefinedMacros2, ignoreMacros: options?.ignoreMacros ?? [] },
      undefinedMacros2 ? this.macroContext(file, folder, graph, settings) : {}
    );
  }
  /**
   * Whether a macro name (lower case) is already defined where `file` runs: in it, on its load
   * path, anywhere else in its workspace folder, or in tf's library. For naming a new macro, so it
   * doesn't redefine one: as generous as the undefined-macro check, a name built when a /def runs
   * (`/def ~body_%1`) takes every name it could make.
   */
  macroNameTaken(file, text) {
    const { folder, graph, settings } = this.contextFor(file);
    const sets = [this.macroNamesOf(file, text), ...graph.files.map((f) => this.macroNamesOf(f.path, f.text))];
    for (const e of this.macroContext(file, folder, graph, settings).elsewhere ?? []) sets.push(e.defs);
    return (name) => sets.some((d) => d.names.has(name) || d.prefixes.some((p) => name.startsWith(p)));
  }
  /**
   * Whether a macro name (lower case) may be defined in a file other than `file`: on its load path
   * (tf's library among them), or anywhere in its workspace folder, by name or by a name built
   * when the /def runs. For inlining, which needs the one /def a call runs.
   */
  macroDefinedOutside(file) {
    const { folder, graph, settings } = this.contextFor(file);
    const self = fileKey(file);
    const sets = graph.files.filter((f) => fileKey(f.path) !== self).map((f) => this.macroNamesOf(f.path, f.text));
    for (const e of this.macroContext(file, folder, graph, settings).elsewhere ?? []) if (fileKey(e.file) !== self) sets.push(e.defs);
    for (const f of this.callerFiles(file, (p) => p)) if (fileKey(f.uri) !== self) sets.push(this.macroNamesOf(f.uri, f.text));
    return (name) => sets.some((d) => d.names.has(name) || d.prefixes.some((p) => name.startsWith(p)));
  }
  /**
   * Whether a macro name (lower case) is called as a function, `name(...)`, in `file` (its `text`)
   * or any file a call to its macros may come from (callerFiles()).
   */
  macroCalledAsFunction(file, text) {
    const self = fileKey(file);
    const names = new Set(findFunctionCalls(text).map((c) => c.name.toLowerCase()));
    for (const f of this.callerFiles(file, (p) => p)) {
      if (fileKey(f.uri) === self) continue;
      for (const c of findFunctionCalls(f.text)) names.add(c.name.toLowerCase());
    }
    return (name) => names.has(name);
  }
  /** Whether `file` is in tf's library (the folder's libraryPath, or TFLIBDIR). */
  isLibraryFile(file) {
    const libs = [this.contextFor(file).settings.libraryDir, ...this.folders.map((f) => this.settingsFor(f).libraryDir)];
    return libs.some((lib) => lib !== void 0 && lib !== "" && isInside(file, lib));
  }
  /**
   * Whether a file other than `file`, of those a call to its macros may come from (callerFiles()),
   * names `name` (lower case) as a whole word: before a /def is removed.
   */
  macroMentionedOutside(file) {
    const self = fileKey(file);
    const texts = this.callerFiles(file, (f) => f).filter((f) => fileKey(f.uri) !== self).map((f) => f.text.toLowerCase());
    return (name) => {
      const re = new RegExp(`(?<![\\w~])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w~])`);
      return texts.some((t) => re.test(t));
    };
  }
  /**
   * Every tf script under a workspace folder (`walkTfFiles`), until a watched file changes:
   * walking the folder on every keystroke cost seconds in a big tree. Capped, so a folder like a
   * home directory can't take forever. A folder that isn't a workspace folder (a loose file's own
   * directory) is never walked.
   */
  walks = /* @__PURE__ */ new Map();
  /** Per file, by its text: the macros it defines and the loads it makes. */
  analyses = /* @__PURE__ */ new Map();
  /** Whether a load path resolves, per search environment (cleared when files or settings change). */
  resolvable = /* @__PURE__ */ new Map();
  /** Per graph, and the folder listing it was built from (which a refresh replaces). */
  macroContexts = /* @__PURE__ */ new WeakMap();
  /**
   * A watched file or folder was created, changed or deleted (or renamed): forget what was read
   * from disk, the folder listings and the library's, since a folder's files may have gone with it.
   */
  filesChanged() {
    this.disk.clear();
    this.walks.clear();
    this.libraries.clear();
    this.resolvable.clear();
    this.invalidate();
  }
  isWorkspaceFolder(folder) {
    return this.folders.some((f) => fileKey(f) === fileKey(folder));
  }
  /**
   * The tf files of a workspace folder, at most MAX_WALKED_FILES (the walk stops there), kept until
   * a watched file changes, or for a few seconds when no watcher covers the folder.
   */
  walk(folder) {
    if (!this.isWorkspaceFolder(folder)) return NOT_WALKED;
    const key2 = fileKey(folder);
    const cached = this.walks.get(key2);
    if (cached && (this.isWatched(folder) || Date.now() - cached.at < UNWATCHED_WALK_MS)) return cached;
    const found = this.fs.walkTfFiles(folder, MAX_WALKED_FILES + 1);
    const walked = { files: found.slice(0, MAX_WALKED_FILES), truncated: found.length > MAX_WALKED_FILES, at: Date.now() };
    this.walks.set(key2, walked);
    return walked;
  }
  analysis(file, text) {
    const key2 = fileKey(file);
    const cached = this.analyses.get(key2);
    if (cached && cached.text === text) return cached;
    const loads = [];
    for (const entry of splitLogicalEntries(text)) {
      if (entry.incomplete) continue;
      for (const load of entryLoads(entry)) {
        const literal = literalText(load.file, load.pending)?.trim();
        loads.push({ raw: entry.text.slice(load.start, load.end), ...literal === void 0 ? {} : { literal }, line: entry.startLine });
      }
    }
    const result = { text, defs: macroNames(text), loads };
    this.analyses.set(key2, result);
    return result;
  }
  macroNamesOf = (file, text) => this.analysis(file, text).defs;
  resolves(literal, env) {
    const key2 = `${JSON.stringify([env.workingDir, env.home, env.tfPath, env.libraryDir, env.local, env.pathMappings])}\0${literal}`;
    let found = this.resolvable.get(key2);
    if (found === void 0) {
      found = resolveLoadPath(literal, env).found !== void 0;
      this.resolvable.set(key2, found);
    }
    return found;
  }
  /**
   * What the undefined-macro check needs to know about the rest of the workspace, for `file`:
   * the files its load path doesn't reach and the macros they define, the loads that can't be
   * followed, and how to /require a file from it. The folder's files, their contents and what
   * each defines and loads are cached until a watched file changes (an edit only changes the one
   * file's text); what depends on the load graph is worked out once per graph.
   */
  macroContext(file, folder, graph, settings) {
    const lib = settings.libraryDir;
    const walked = this.walk(folder);
    const listed = lib ? this.libraryListing(lib) : void 0;
    let shared = this.macroContexts.get(graph);
    if (!shared || shared.walked !== walked || shared.listed !== listed) {
      const { files, truncated } = walked;
      const reached = new Set(graph.files.map((f) => fileKey(f.path)));
      const elsewhere = [];
      const add = (f, text, library) => {
        if (reached.has(fileKey(f))) return;
        reached.add(fileKey(f));
        elsewhere.push({ file: path6.resolve(f), label: this.label(f, folder, lib), library, defs: this.macroNamesOf(f, text) });
      };
      for (const f of files) {
        const text = this.read(f);
        if (text !== void 0) add(f, text, Boolean(lib && isInside(f, lib)));
      }
      if (lib) for (const f of this.library(lib)) add(f.path, f.text, true);
      const unfollowed = unfollowedOnPath(graph, (f) => this.label(f, folder, lib));
      shared = { walked, listed, elsewhere, unfollowed, files, truncated };
      this.macroContexts.set(graph, shared);
    }
    const self = fileKey(file);
    const onPath = graph.files.find((f) => fileKey(f.path) === self);
    const env = onPath ? this.envAt(onPath.searchEnv, settings) : this.envFor(settings);
    return {
      // A file is never "elsewhere" to itself.
      elsewhere: shared.elsewhere.filter((e) => fileKey(e.file) !== self),
      unfollowed: onPath ? shared.unfollowed : this.offPathUnfollowed(file, shared.files, folder, settings),
      requirePath: (target) => this.requirePath(target, env, settings),
      namesOf: this.macroNamesOf,
      ...shared.truncated ? { readOnly: MAX_WALKED_FILES } : {}
    };
  }
  /**
   * For a file no load path reaches: the loads that can't be followed in it and in the files that
   * may load it, directly or not. A file may load it when one of its loads ends with this file's
   * name and the folders before it (`/require tf-wotmud/score.tf` for `.../tf-wotmud/score.tf`):
   * how tf finds it isn't known, so only the name can be compared. A loose file (in no workspace
   * folder) only has its own loads.
   */
  offPathUnfollowed(file, files, folder, settings) {
    const env = this.envFor(settings);
    const loadsOf = (f) => {
      const text = this.read(f);
      const loads = text === void 0 ? [] : this.analysis(f, text).loads;
      return {
        written: loads.flatMap((l) => l.literal === void 0 ? [] : [l.literal]),
        unfollowed: loads.filter((l) => l.literal === void 0 || !this.resolves(l.literal, env)).map((l) => ({ raw: l.raw, label: this.label(f, folder, settings.libraryDir), line: l.line }))
      };
    };
    const segments = (p) => p.replace(/\\/g, "/").split("/").filter((s) => s !== "" && s !== ".");
    const names = (target, written) => {
      const t = segments(target);
      const w = segments(written).filter((s) => s !== ".." && s !== "~" && !s.startsWith("~"));
      if (w.length === 0) return false;
      const n = Math.min(t.length, w.length);
      for (let i = 1; i <= n; i += 1) if (t[t.length - i] !== w[w.length - i]) return false;
      return true;
    };
    const fold = (s) => process.platform === "win32" ? s.toLowerCase() : s;
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const queue = [file];
    while (queue.length > 0) {
      const f = queue.shift();
      const key2 = fileKey(f);
      if (seen.has(key2)) continue;
      seen.add(key2);
      out.push(...loadsOf(f).unfollowed);
      for (const other of files) {
        if (!seen.has(fileKey(other)) && loadsOf(other).written.some((w) => names(key2, fold(w)))) queue.push(other);
      }
    }
    return out;
  }
  /**
   * What to write after `/require`, in a file read with `env`'s TFPATH and TFLIBDIR, for tf to
   * load `target`: its path from tf's current directory, or from a TFPATH directory (TFLIBDIR
   * when TFPATH is empty), checked by resolving it the way tf would; else tf's own absolute path
   * for it, through a path mapping. Undefined when none of them reaches it.
   */
  requirePath(target, env, settings) {
    const local = (dir, isLocal) => isLocal ? dir : toLocalPath(dir, settings.pathMappings);
    const dirs = [
      env.workingDir,
      ...env.tfPath.length > 0 ? env.tfPath.map((d) => local(d, env.local?.tfPath)) : env.libraryDir ? [local(env.libraryDir, env.local?.libraryDir)] : []
    ];
    const candidates = dirs.flatMap((dir) => {
      const rel = path6.relative(dir, target);
      return rel === "" || rel.startsWith("..") || path6.isAbsolute(rel) ? [] : [rel.replace(/\\/g, "/")];
    });
    const tfPath = toTfPath(target, settings.pathMappings);
    if (tfPath !== void 0) candidates.push(tfPath);
    return candidates.find((written) => {
      if (/\s\s/.test(written)) return false;
      const found = resolveLoadPath(written, env).found;
      return found !== void 0 && fileKey(found) === fileKey(target);
    });
  }
  /** How tf finds a file, with the settings tf starts with: their folders are already here. */
  envFor(settings) {
    return {
      home: settings.home,
      tfPath: settings.tfPath,
      libraryDir: settings.libraryDir,
      workingDir: settings.workingDir,
      pathMappings: settings.pathMappings,
      local: { home: true, tfPath: true, libraryDir: true },
      readFile: this.read
    };
  }
  /** How tf finds a file at some point on the load path, with the search variables it had then. */
  envAt(at2, settings) {
    return {
      home: at2.home,
      tfPath: at2.tfPath,
      ...at2.libraryDir === void 0 ? {} : { libraryDir: at2.libraryDir },
      workingDir: settings.workingDir,
      pathMappings: settings.pathMappings,
      local: at2.local,
      readFile: this.read
    };
  }
  /**
   * The file each `/load` and `/require` in `text` opens. A load that runs while the file loads
   * (a top-level command, or one a top-level `/eval` runs), in a file the load path reaches,
   * resolves as the load graph found it, with the TFPATH and HOME that were set at that point (a
   * tfrc may change them), and has no link when tf wouldn't find it. A load in a macro body runs
   * whenever the macro does, and nothing is known about a file nothing loads, so those resolve
   * with the settings' TFPATH, TFLIBDIR, HOME and working directory.
   */
  documentLinks(file, text) {
    const { settings, graph } = this.contextFor(file);
    const self = fileKey(file);
    const onPath = graph.files.some((f) => fileKey(f.path) === self);
    const env = this.envFor(settings);
    const links = findLoadPaths(text).flatMap((load) => {
      let target;
      if (onPath && load.topLevel) {
        target = graph.resolved.find((r) => fileKey(r.from) === self && r.line === load.line && r.offset === load.offset)?.file;
      } else {
        const found = resolveLoadPath(load.file, env).found;
        target = found === void 0 ? void 0 : path6.resolve(found);
      }
      return target === void 0 ? [] : [{ range: load.range, target, kind: load.kind }];
    });
    if (!onPath) return links;
    const linked = new Set(links.map((l) => `${l.range.start.line}:${l.range.start.character}`));
    const entries = splitLogicalEntries(text);
    for (const r of graph.resolved) {
      if (fileKey(r.from) !== self) continue;
      const entry = entries.find((e) => e.startLine === r.line);
      const from = entry?.offsetMap[r.offset];
      const last = entry?.offsetMap[r.offset + r.raw.length - 1];
      if (!from || !last || from.line !== last.line || linked.has(`${from.line}:${from.character}`)) continue;
      links.push({
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        target: r.file,
        kind: r.kind
      });
    }
    return links.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
  }
  /**
   * What the rest of the workspace knows about `file`, in the context it is seen in. If that
   * context's load path reaches it, every other file on that path; otherwise just what
   * stdlib.tf loads, which tf always reads first. Plus, as "not loaded" hints, the tf library
   * files the path never reaches.
   */
  navContext(file, uriOf) {
    const { folder, settings, graph } = this.contextFor(file);
    return this.buildNavContext(file, uriOf, folder, settings, graph);
  }
  /**
   * navContext(), kept per load graph (which an edit or a changed file replaces), for call
   * hierarchy, which needs one for every file that calls the macro. Its locations use the URIs
   * `uriOf` gave when it was built, so it isn't for answers that open a file.
   */
  callerContext(file, uriOf) {
    const { folder, settings, graph } = this.contextFor(file);
    let byFile = this.navContexts.get(graph);
    if (!byFile) {
      byFile = /* @__PURE__ */ new Map();
      this.navContexts.set(graph, byFile);
    }
    const cached = byFile.get(fileKey(file));
    if (cached && cached.uriOf === uriOf) return cached.ctx;
    const ctx = this.buildNavContext(file, uriOf, folder, settings, graph);
    byFile.set(fileKey(file), { uriOf, ctx });
    return ctx;
  }
  navContexts = /* @__PURE__ */ new WeakMap();
  buildNavContext(file, uriOf, folder, settings, graph) {
    const self = fileKey(file);
    const onPath = graph.files.some((f) => fileKey(f.path) === self);
    const loaded = graph.files.filter((f) => fileKey(f.path) !== self && (onPath || f.stdlib));
    const lib = settings.libraryDir;
    const label = (f) => this.label(f, folder, lib);
    const isLibrary = (f) => Boolean(lib && isInside(f, lib));
    const macros = loaded.flatMap((f) => {
      const lines = splitRawLines(f.text);
      return f.defs.map((d) => ({
        uri: uriOf(f.path),
        label: label(f.path),
        symbol: d.symbol,
        lines,
        library: isLibrary(f.path),
        loaded: true
      }));
    });
    if (lib) {
      const reached = new Set(graph.files.filter((f) => onPath || f.stdlib).map((f) => fileKey(f.path)));
      for (const f of this.library(lib)) {
        if (reached.has(fileKey(f.path)) || fileKey(f.path) === self) continue;
        const lines = splitRawLines(f.text);
        for (const symbol of f.defs) {
          macros.push({ uri: uriOf(f.path), label: label(f.path), symbol, lines, library: true, loaded: false });
        }
      }
    }
    return {
      uri: uriOf(file),
      files: onPath ? loaded.filter((f) => !isLibrary(f.path)).map((f) => ({ uri: uriOf(f.path), text: f.text })) : [],
      macros,
      libraryFiles: loaded.filter((f) => isLibrary(f.path)).map((f) => ({ uri: uriOf(f.path), text: f.text })),
      help: lib ? this.help(lib) : void 0
    };
  }
  /**
   * Every file a call to a macro defined in `file` may come from: `file` itself, the files on
   * its load path (tf's library among them), and every tf script in its workspace folder,
   * reached by a load path or not. A file outside every workspace folder (tf's library, say) is
   * called from the scripts of all of them, so then every folder is searched, with what each
   * folder's load path reaches.
   */
  callerFiles(file, uriOf) {
    const { folder, graph } = this.contextFor(file);
    const out = /* @__PURE__ */ new Map();
    const add = (p, text) => {
      const key2 = fileKey(p);
      if (out.has(key2)) return;
      const t = text ?? this.read(p);
      if (t !== void 0) out.set(key2, { uri: uriOf(path6.resolve(p)), text: t });
    };
    add(file);
    for (const f of graph.files) add(f.path, f.text);
    for (const f of this.isWorkspaceFolder(folder) ? [folder] : this.folders) {
      for (const loaded of this.graphFor(f).graph.files) add(loaded.path, loaded.text);
      for (const walked of this.walk(f).files) add(walked);
    }
    return [...out.values()];
  }
  /** Whether `file`'s folder shows "N references" above each /def. Default on. */
  referenceLenses(file) {
    return this.raw.get(fileKey(this.folderFor(file)))?.codeLens?.references ?? true;
  }
  help(dir) {
    const key2 = fileKey(dir);
    if (!this.helps.has(key2)) {
      const text = this.fs.readFile(path6.join(dir, "tf-help"));
      this.helps.set(key2, text === void 0 ? void 0 : parseTfHelp(text));
    }
    return this.helps.get(key2);
  }
};

// packages/cli/src/check.ts
function linksFolders(dir) {
  let entries;
  try {
    entries = (0, import_node_fs2.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((e) => {
    const full = path7.join(dir, e.name);
    if (e.isSymbolicLink()) {
      try {
        return (0, import_node_fs2.statSync)(full).isDirectory();
      } catch {
        return false;
      }
    }
    return e.isDirectory() && !isSkippedDir(e.name) && linksFolders(full);
  });
}
var nodeHost = () => ({
  fs: nodeFileSystem,
  environment: nodeEnvironment(),
  kind: (p) => {
    try {
      const s = (0, import_node_fs2.statSync)(p);
      return s.isDirectory() ? "dir" : s.isFile() ? "file" : void 0;
    } catch {
      return void 0;
    }
  },
  linksFolders,
  realpath: (p) => {
    try {
      return import_node_fs2.realpathSync.native(p);
    } catch {
      return p;
    }
  }
});
function expand(request, host, problems) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const add = (file) => {
    const real = host.realpath(file);
    if (seen.has(fileKey(real))) return;
    seen.add(fileKey(real));
    out.push({ file, real });
  };
  for (const given of request.paths) {
    const p = path7.resolve(request.cwd, given);
    const kind = host.kind(p);
    if (kind === "file") add(p);
    else if (kind === "dir") {
      const found = host.fs.walkTfFiles(p).map((f) => path7.resolve(f)).sort();
      if (found.length === 0) {
        problems.push(
          host.linksFolders(p) ? `${given} has no tf scripts in it, only links to folders (junctions or symbolic links), which a folder's search doesn't follow: name the linked folders themselves.` : `${given} has no tf scripts in it (.tf files, tfrc or .tfrc): name a folder that holds some, or the files themselves.`
        );
      }
      found.forEach(add);
    } else problems.push(`${given} doesn't exist: check the path.`);
  }
  return out;
}
function check5(request, host = nodeHost()) {
  const problems = [];
  const given = request.config === void 0 ? void 0 : path7.resolve(request.cwd, request.config);
  const root = path7.resolve(request.cwd, request.root ?? (given === void 0 ? "." : path7.dirname(given)));
  const rootKind = host.kind(root);
  if (rootKind === "file") {
    return { files: [], problems: [`The root ${request.root ?? root} is a file, not a folder: give --root the folder that holds it.`] };
  }
  if (rootKind !== "dir") {
    return { files: [], problems: [`The root folder ${request.root ?? root} doesn't exist: give --root a folder that does.`] };
  }
  const configFile = given ?? path7.join(root, CONFIG_FILE);
  let settings = request.settings;
  if (given !== void 0 || host.kind(configFile) === "file") {
    const label = path7.relative(request.cwd, configFile) || configFile;
    const givenKind = given === void 0 ? "file" : host.kind(given);
    if (givenKind === "dir") {
      return { files: [], problems: [`The settings file ${request.config} is a folder: give --config the tfscript.json file.`] };
    }
    if (givenKind !== "file") {
      return { files: [], problems: [`The settings file ${request.config} doesn't exist: check the path given to --config.`] };
    }
    const loaded = readConfig(configFile, (f) => host.fs.readFile(f), label);
    if (!loaded.config) return { files: [], problems: loaded.problems };
    settings = overlaySettings(loaded.config.settings, request.settings);
  }
  const files = expand(request, host, problems);
  const realRoot = host.realpath(root);
  const index = new WorkspaceIndex(host.fs, host.environment);
  index.setFolders([realRoot]);
  index.setSettings(realRoot, settings);
  const checked = [];
  for (const { file, real } of files) {
    const text = host.fs.readFile(real);
    if (text === void 0) {
      problems.push(`${path7.relative(request.cwd, file) || file} can't be read: check that it is a file you may read.`);
      continue;
    }
    checked.push({ file, text, diagnostics: documentDiagnostics(text, real, index) });
  }
  return { files: checked, problems };
}

// packages/cli/src/format.ts
var path8 = __toESM(require("node:path"));

// packages/core/src/rules/table.ts
var RULE_SECTIONS = [
  {
    id: "R1",
    title: "Lines",
    statement: [
      "tf reads a file one physical line at a time and drops each line's leading blanks. A line whose first non-blank character is `;` or `#` is a comment and is skipped, also in the middle of a continuation. An empty or whitespace-only line runs no command of its own, but it does end a command that a `\\` was continuing: the line after it starts a new command.",
      "A line that ends in `\\` (and not in `%\\`) is joined to the next one. Otherwise the joined text is one complete command. This applies to every line of a file, inside a `/def` or not.",
      "So a block (`/if` ... `/endif`, `/while` ... `/done`) must be complete within one command. A multi-line `/if` with its lines left bare is rejected, because `/if` needs its `/endif` in the same command, and an indented second line draws `possibly missing trailing \\`.",
      "Whitespace after a final `\\`, including the `\\r` of a CRLF file, draws `whitespace following final '\\'`, and the line is not continued.",
      'A command that doesn\'t start with `/` makes tf print "Invalid command. Aborting." and stop loading the file; it is never sent to a connected world. A byte order mark is not a blank, so a file that starts with one stops at its first line. tf treats such a line as an implicit `/addworld` only in the `~/.tinytalk` file it reads at start-up, never in a `/load`. Text in a `/def` body is different: it is sent when the macro runs.',
      'A file whose last command ends in `\\` draws `last command is incomplete because of trailing \\`, and that command is dropped. tf says it after every "Invalid command. Aborting." too, as the aborted command is still held.',
      "A macro body whose last line ends in `%;` but not `\\` ends there: an unindented command on the next line runs once, when the file loads, and tf says nothing.",
      "tf turns tabs into blanks as it reads a file, out to the next 8-column stop (`%tabsize`) of the physical line, indentation included, before it joins continuations or strips leading blanks, whatever `%expand_tabs` says. So a tab inside a command is stored as blanks, and how many depends on where the line starts: the same `/let s=a<tab>b` gives four blanks in one place and six in another. A tab meant to stay a tab never does. (Upstream's `lib/tf/quoter.tf` had a `[ <tab>]*` in `/qmac` that matched no tab for this reason; our fork writes `[ \\\\t]*`.)"
    ],
    sourceOnly: [
      "That such a line is an `/addworld` in `~/.tinytalk` (`command.c:606-616`) is read from the source; the cases only show that a `/load`ed file stops."
    ],
    source: [
      { at: "command.c:575-577", what: "load_file() strips leading blanks and skips a comment line" },
      { at: "command.c:579-581", what: "`possibly missing trailing \\`" },
      { at: "command.c:585-589", what: "a final `\\`, not after `%`, joins the next line" },
      { at: "command.c:591-595", what: "`whitespace following final '\\'`" },
      { at: "command.c:597-601", what: "an empty line ends the command being continued" },
      { at: "command.c:602-605", what: "a command starting `/` runs at SUB_KEYWORD" },
      { at: "command.c:617-618", what: '"Invalid command. Aborting."' },
      { at: "command.c:617-627", what: "`last command is incomplete because of trailing \\`, also after an abort" },
      { at: "tfio.c:1248-1250", what: "tfgetS() expands a tab to the next `tabsize` stop" }
    ],
    cases: [
      "if-multiline-top-level",
      "if-oneline-top-level",
      "if-multiline-top-level-backslash",
      "if-multiline-in-def",
      "indented-line-after-command",
      "comment-lines",
      "trailing-space-after-backslash",
      "bare-line-after-command",
      "blank-lines-between-defs",
      "tab-expanded-on-load",
      "missing-continuation-bare-endif",
      "missing-continuation-indented-endif",
      "missing-continuation-while",
      "body-continues-without-backslash",
      "incomplete-continuation",
      "continuation-ended-by-blank-line",
      "continuation-ended-by-whitespace-line",
      "bom-is-not-a-blank",
      "not-a-command-also-incomplete",
      "percent-backslash-not-joined",
      "crlf",
      "tab-expanded-with-expand-tabs-off"
    ],
    codes: [
      {
        code: "missing-continuation",
        severity: "error",
        summary: "A top-level `/if` or `/while` ends where its line ends, because the line has no `\\` to continue it. End every line of the block but the last with `\\`, or write it on one line.",
        detail: "a top-level `/if` or `/while` still open where its line ends, with no `\\` to continue it. Reported once, at the opener: the stray `/then`, `/else`, `/endif`, `/do` or `/done` and the indented lines that were meant to be part of it are its related locations, not diagnostics of their own"
      },
      {
        code: "indented-line-after-command",
        severity: "warning",
        summary: "An indented line starts a new command, because the line before it has no `\\` at the end. Add the `\\` if the line was meant to continue that command.",
        detail: "an indented line starting a new command right after one that didn't end in `\\` — tf's own \"possibly missing trailing \\\\\" warning"
      },
      {
        code: "backslash-not-last",
        severity: "warning",
        summary: "This `\\` doesn't continue the line: whitespace or a CRLF line ending follows it, or a `%` comes before it. End the line with a `\\` that has no `%` before it and nothing after it, in a file saved with LF line endings.",
        detail: "a final `\\` followed by whitespace (including a CRLF file's trailing `\\r`) — not a continuation, tf warns and runs the line as-is"
      },
      {
        code: "not-a-command",
        severity: "error",
        summary: "A line that isn't blank, a comment or a `/command` stops tf loading the rest of the file. Comment it out, or remove the byte order mark that stops it being a command.",
        detail: "a line that is not blank, a comment, or a `/command` — tf aborts the rest of the file's load; everything after it is suppressed from the other rules, since tf never reads it either"
      },
      {
        code: "incomplete-continuation",
        severity: "warning",
        summary: "The file's last command ends in `\\`, so tf drops it. Remove the `\\`.",
        detail: "(warning) the file's last command ends in `\\`: tf says \"last command is incomplete because of trailing \\\\\" and drops it, so a macro it would define isn't defined. A final newline doesn't complete it (tf reads no line after it); a real blank line does. The fix removes the `\\`"
      },
      {
        code: "body-continues-without-backslash",
        severity: "information",
        summary: "A macro body ends in `%;` without a `\\`, so the command on the next line runs once, at load, and is not part of the body. End the line with `\\` if it was meant to be.",
        detail: "(information) a macro body whose last line ends in `%;` but not `\\`, with an unindented command on the next line: that line is a command of its own, run when the file loads. Not when the body ends at a blank line, nor when the next line runs the macro just defined"
      }
    ],
    fix: [
      "End every line of a multi-line command but the last with `\\`, and separate its statements with `%;`, at the top level and in a `/def` alike.",
      'Or write the block on one line: `/if (x =~ "") /set x=1%; /endif`.',
      "Save `.tf` files with LF line endings, and with no blanks after a final `\\`.",
      "Comment out a line that isn't a command with `;`, on every physical line of it."
    ]
  },
  {
    id: "R2",
    title: "Substitution level",
    statement: [
      "What tf substitutes depends on where the text is.",
      "A plain top-level command of a file substitutes nothing: only the command word at its start is read. `%{x}`, `%x`, `%;`, `$[...]`, `$(...)` and `\\` are stored as typed. `/load %{dir}/x.tf` looks for a file whose name is literally `%{dir}/x.tf`. `/let v=cd %; /echo x` sets `v` to the whole rest of the line and never runs `/echo`. An unclosed `$[`, `%{`, `${` or string there is only text.",
      "A top-level line that starts with `/if` or `/while` reads `%;` and `%\\` as separators for the rest of the line, after its `/endif` or `/done` too, and shortens a run of `%`s by one. Nothing else is substituted there either: a `%{x}` stays as typed.",
      "A macro body, `/eval` text, the command of a `/repeat`, `/at` or `/quote` (after its backquote) and a `/for` body substitute everything. `/eval -s0` substitutes nothing.",
      "An expression is evaluated the same at every level: an `/if` or `/while` condition and a top-level `/test` read `%{x}` and `$[...]` as operands. So `/if (%{x} == 5)` works at the top level.",
      "A `%{x}` inside a string in a condition or a `$[...]` is never substituted, even in a macro body. The text of a `/test`, `/return` or `/result` in a body is substituted at its statement's level first, so a `%{x}` in a string there is substituted; in a top-level `/test` it is not."
    ],
    source: [
      { at: "command.c:605", what: `a file's command runs at SUB_KEYWORD ("Never use SUB_FULL here")` },
      { at: "expand.c:1443-1444", what: "`/while` raises SUB_KEYWORD to SUB_NEWLINE" },
      { at: "expand.c:1542-1543", what: "`/if` raises SUB_KEYWORD to SUB_NEWLINE" },
      { at: "expand.c:1862", what: "`%` is read at SUB_NEWLINE and above" },
      { at: "expand.c:1806", what: "percentsub() substitutes a variable only at SUB_FULL" },
      { at: "expand.c:1856", what: "`\\` is read only at SUB_FULL" },
      { at: "expand.c:1871", what: "`$` is read only at SUB_FULL" },
      { at: "macro.c:1561", what: "a macro body is compiled at SUB_MACRO when it first runs" },
      { at: "expand.c:224", what: "`/eval` defaults to SUB_MACRO" },
      { at: "process.c:205", what: "a `/repeat` command is compiled at SUB_MACRO" },
      { at: "expr.c:2231", what: "primary_expr() reads `%`, `{`, `$[`, `$(` and `${` operands at any level" },
      { at: "expand.c:1653-1659", what: "a `/test`'s text is expanded at its statement's level before it is compiled" }
    ],
    cases: [
      "load-no-expansion",
      "load-with-eval",
      "separator-top-level",
      "unclosed-substitution-top-level-text",
      "top-level-literal-substitutions",
      "top-level-if-line-level",
      "repeat-substitutes",
      "at-command-substitutes",
      "quote-command-substitutes",
      "for-body-substitutes",
      "expression-operand-top-level",
      "string-substitution-body-test",
      "string-no-substitution-in-expressions",
      "while-reads-variable",
      "return-result-substituted",
      "separator-percent-backslash-top-level-if"
    ],
    codes: [
      {
        code: "not-substituted-here",
        severity: "warning (information for a `%;`)",
        summary: "tf reads this text without substituting it, so the `%{var}`, `%var` or `%;` stays as it is typed. The message says how to get it substituted where that is meant, or that it may be meant as text.",
        detail: "text tf reads without substituting, where it was surely meant to be: a `%{var}` in a plain top-level line or a top-level `/if` or `/while` line (the fix puts `/eval` in front), or in `/eval` or `/quote` `-soff`/`-son` text (the fix leaves out the `-s`), and a `%var` in a `/load` or `/require` path there. Not in a macro body, an `/eval`, the command of a `/repeat`, `/at` or `/quote` (after its backquote), a `/for`, or an expression operand (`/if (%{x} == 5)`), which tf substitutes; never a `%name` elsewhere, as `/set std_clock_format=%H:%M` is meant as text. Also a `%{var}` inside a string in a condition or `$[...]`, which nothing substitutes, even in a macro body (a `$(...)` in one runs as a macro body). (information) A `%;` with more after it on a plain top-level line or in `-soff` text, which doesn't separate there: `/echo a%; /echo b` is one `/echo`; in a `/set`, `/let` or `/setenv` value it may be meant. One table, `src/substitution.ts`, says which text is read at which level"
      }
    ],
    fix: [
      "Put `/eval` in front of a top-level command that needs a substitution: `/eval /load %{dir}/x.tf`.",
      "Put several commands in a `/def`, or start the line with `/eval`, to separate them with `%;`.",
      "In a condition, write the variable's name, `{x}`, not `%{x}`."
    ]
  },
  {
    id: "R3",
    title: "Statements and keywords",
    statement: [
      "A statement runs to the next `%;`, `%|` or `%\\`, or to the `)` that closes its `$(...)`.",
      "tf reads a keyword (`/if`, `/then`, `/elseif`, `/else`, `/endif`, `/while`, `/do`, `/done`, `/break`, `/let`, `/set`, `/setenv`, `/test`, `/return`, `/result`, `/exit`) only at the start of a statement. The first command of a statement takes everything up to the separator: `/let`, `/set` and `/setenv` as their value, `/test`, `/return` and `/result` as their expression, and any other command as its arguments. `/let name value`, with no `=`, takes it too.",
      'So `/if (1) /echo yes /else /echo no /endif` is one `/echo` whose text happens to contain `/else` and `/endif`, and the `/if` is never closed ("expected /endif, found end of body" when the macro runs). With a `%;` before the `/endif` the same line is valid, and quietly wrong: the `/else` branch does not exist. In `/if (c) /let v=1 /endif` the `/endif` becomes part of the value.',
      "The same goes for a condition list: `/test` reads its expression up to the next `%;`, so it is `/if /test x%; /then ...`, never `/if /test x /then ...`. A statement in a condition list that isn't a command is sent to the world each time the condition is tested, and tf warns \"statement starting with 'x' in /IF condition sends text to server\".",
      'tf reads a keyword up to a blank, a `%` or a `)`, so `/if(1)` runs a command named `if(1)` and finds none ("if(1): no such command or macro").',
      'tf also rejects a keyword with no block to belong to ("unexpected /ENDIF in outer block"), text after `/endif` or `/done` with no `%;` ("expected end of statement after /endif"), and a `/break` without a positive number of loops ("expected positive integer"). It reports only the first error in a body, as it stops compiling there.',
      "A name that only starts like a keyword is not one: `done:x`, `if!x` and `then?` are macro names, and such macros can be defined and run."
    ],
    source: [
      { at: "expand.c:1371", what: "list() reads a statement list" },
      { at: "expand.c:1408", what: "keyword_parse() runs only where a statement starts" },
      { at: "expand.c:1779", what: "a keyword is read up to a blank, `%` or `)`" },
      { at: "expand.c:1432-1435", what: '"statement starting with ... in /IF condition sends text to server"' },
      { at: "expand.c:1482", what: "`/BREAK` needs a positive integer" },
      { at: "expand.c:1742-1746", what: `"expected end of statement after /endif", "Possibly missing '%;'"` }
    ],
    cases: [
      "let-swallows-endif",
      "let-with-separator",
      "block-structure-keyword-mid-statement",
      "block-structure-keyword-as-text",
      "block-structure-stray-keyword",
      "block-structure-text-after-endif",
      "block-structure-condition-list",
      "block-structure-condition-list-ok",
      "block-structure-top-level",
      "keyword-mid-statement-set-value",
      "keyword-mid-statement-setenv",
      "keyword-mid-statement-let-no-equals",
      "condition-list-text",
      "keyword-needs-space",
      "keyword-glued-macro-names",
      "break-needs-positive-number",
      "only-first-error-in-body"
    ],
    codes: [
      {
        code: "keyword-mid-statement",
        severity: "error (warning where tf runs it as text without a word)",
        summary: "A keyword in the middle of a statement is text, because tf reads a keyword only at a statement's start and the statement's first command takes the rest of it. Where it was meant as a keyword, a `%;` before it makes it one.",
        detail: "a keyword in the middle of a statement, which tf reads as text: only a statement's start can hold one, and its first command takes the rest of it, so `/if (1) /echo a /endif` never closes. An `/if` or `/while` in a `/let`, `/set` or `/setenv` value is reported only where tf stops at what it leaves (the `/endif` with no `/if`, its related location) and a `%;` before it clears that; in other text, or otherwise, it is just text (`/set msg=use /if to branch`, `/echo see /if (x) for help`). (warning) A keyword such a value takes in a block that still closes, which tf runs as text without a word: `/if (1) /set a=1 /else /set b=2%; /endif`; an error where its fix clears what tf stops at. The fix puts `%;` before each keyword of the statement, only where that runs as meant: not for text in a condition list, nor where text after the keyword would become a statement, nor where it would leave a later keyword stray or add an empty statement"
      },
      {
        code: "condition-list-text",
        severity: "warning",
        summary: "A statement in a condition list that isn't a command is sent to the world each time the condition is tested. Write the condition as `(expression)`, or as a command such as `/test`.",
        detail: "(warning) a statement in an `/if`, `/elseif` or `/while` condition list that isn't a command (`/if x == 1%; /then`): tf sends it to the world each time the condition is tested, and warns \"statement starting with 'x' in /IF condition sends text to server\""
      },
      {
        code: "keyword-needs-space",
        severity: "error (warning before other punctuation)",
        summary: "A keyword glued to the next character is read as part of a command name, not as a keyword. Separate it as the message says: with a blank after most keywords, or with `%;` after `/endif`, `/done` or `/break`.",
        detail: "a block keyword glued to a `(` or `/` after it (`/if(1)`, `/else/echo`): tf reads a keyword up to a blank, `%` or `)`, so it runs a command named `if(1)` and finds none. The fix adds the blank (`%;` after `/endif`, `/done` or `/break`; none for `/else(`, `/then(` or `/do(`); the stray keyword it leaves in a body is its related location. (warning) Glued to other punctuation (`/endif;`), unless this file defines a macro of that name (`/def done:x`)"
      },
      {
        code: "block-structure",
        severity: "error",
        summary: "The blocks don't fit together: a keyword is missing, has no block to belong to, or has text after it with no `%;`, or a `/break` has no loop of its own to end. The message names the keyword to add, move or separate.",
        detail: "an `/if` or `/while` with no `/endif`, `/done`, `/then` or `/do`; a keyword with no block to belong to; text after `/endif` or `/done` with no `%;`; a `/break` inside `$(...)` that would end a loop outside it, or has no loop inside it to end. A keyword stuck mid-statement (`/echo a /endif`) that is the cause is `keyword-mid-statement`'s"
      },
      {
        code: "nesting-too-deep",
        severity: "information",
        summary: "Not a problem in tf: this command nests deeper than this checker follows, so the rest of it is not checked.",
        detail: "(information) not a problem in tf: a command nesting more than 400 levels deep (each nested `/if`, `/while`, `$(...)`, `$[...]` or `%{name-...}` default is a level), past which the structural check stops; what it read before that still counts"
      }
    ],
    fix: [
      "Put `%;` before every keyword that starts a statement: `/let v=1%; /endif`, never `/let v=1 /endif`.",
      "Put a blank after a keyword: `/if (1)`, not `/if(1)`.",
      "Write a condition list's statements as commands: `/if /test x%; /then ...`.",
      "Put `%;` between `/endif` or `/done` and whatever follows it."
    ]
  },
  {
    id: "R4",
    title: "Separators and escapes",
    statement: [
      "Where tf separates statements (a body, or a top-level `/if` or `/while` line), only a single `%` before `;`, `|` or `\\` does it: `%;` and `%\\` separate, and `%|` pipes.",
      "Blanks beside `%;` in a body do not count: `/let v=ab %; ...` sets `ab`, not `ab `, and `/a %; /b` and `/a%;/b` run the same.",
      "A run of two or more `%`s is text, and tf drops one `%` of it, so `%%;` and `%%%;` don't end a statement. `\\%;` is text too.",
      'Quotes do not protect a `%;` outside an expression: `/set q="a%; /set r=b"` is two commands.',
      "At the top level of a file `%;` is not a separator at all (R2)."
    ],
    sourceOnly: ["That `%|` pipes one statement's output into the next is read from the source; no case runs it."],
    source: [
      { at: "expand.c:1862-1866", what: "a `%` before `;`, `|` or `\\` ends the statement, and blanks before it are dropped" },
      { at: "expand.c:1802", what: "percentsub() copies the rest of a run of `%`s as text" },
      { at: "expand.c:1856", what: "`\\` escapes the next character at SUB_FULL" },
      { at: "util.c:103-105", what: "`\\`, `;` and `|` end a statement after a `%`" }
    ],
    cases: ["separator-blanks-in-body", "separator-literal-forms", "separator-percent-backslash", "separator-percent-runs"],
    codes: [],
    fix: [
      "Separate statements with one `%;`.",
      "Write `%%;` for a literal `%;` in a body."
    ]
  },
  {
    id: "R5",
    title: "Empty statements",
    statement: [
      "An empty statement sends a blank line to the world each time it runs: a `%;` straight after another separator, after `/then`, `/do`, `/else` or a `(condition)`, or at the start of a body. A `%;` at the very end sends nothing.",
      'tf warns about some of these when it compiles the body: after a `(condition)` or `/else` it says "sends blank line to server".'
    ],
    source: [
      { at: "expand.c:1938-1950", what: "statement() compiles text that isn't a command as a send" },
      { at: "expand.c:1425-1429", what: "the warning after `/if (...)` or `/while (...)`" },
      { at: "expand.c:1586-1590", what: "the warning after `/else`" }
    ],
    cases: [
      "separator-sends-blank-line",
      "empty-statement-double-separator",
      "empty-statement-after-then",
      "empty-statement-after-do",
      "empty-statement-after-else",
      "empty-statement-body-start",
      "empty-statement-trailing"
    ],
    codes: [
      {
        code: "empty-statement",
        severity: "warning",
        summary: "An empty statement sends a blank line to the world each time it runs. Remove the separator or the empty `$()` that makes it, or put a command in it.",
        detail: "(warning) a statement with nothing in it, which tf sends to the world as a blank line each time it runs: a `%;` or `%\\` right after another separator, after `/then`, `/do`, `/else` or a `(condition)`, before the first command, or before the `)` of a `$(...)` (and an empty `$()`). In every text tf compiles: a macro body, a top-level `/if` or `/while` line, `/eval`, `/repeat` and `/for` text. The message says whether tf warns about it too (only after a `(condition)`, after `/else`, and in a condition list). Not a `%;` at the very end, which sends nothing, nor one after a `/break`, `/return` or `/result`, which never runs"
      }
    ],
    fix: ["Delete the `%;` that ends the empty statement: `/if (x) /echo a%; /endif`, not `/if (x)%; /echo a%; /endif`."]
  },
  {
    id: "R6",
    title: "Substitution syntax",
    statement: [
      "Where tf substitutes (R2), a substitution must be complete. `%{name` needs its `}` before any blank or `%;`; after the name comes `}` or `-default`. Another substitution can only nest through the default: `%{foo-%{bar}}`, not `%{foo%{bar}}`.",
      "`%-` always starts a substitution (`%-1`, `%-L`), so `50%-off` in a body is \"illegal character '-' in substitution\": write `50%%-off`.",
      'A `${` or `$(` must close too ("unmatched ${", "unmatched (").',
      "A plain top-level command substitutes nothing, so there all of these are only text."
    ],
    source: [
      { at: "expand.c:2135", what: "varsub() reads `%{selector-default}`" },
      { at: "expand.c:2233-2234", what: `"illegal character '-' in substitution"` },
      { at: "expand.c:2293-2294", what: '"unmatched { or bad substitution", "unmatched { or illegal character"' },
      { at: "expand.c:2105", what: '"unmatched ${"' }
    ],
    cases: [
      "unclosed-substitution-percent-brace",
      "unclosed-substitution-percent-dash",
      "unclosed-substitution-dollar-brace-paren",
      "substitution-syntax-glued-in-body",
      "substitution-syntax-top-level-glued"
    ],
    codes: [
      {
        code: "substitution-syntax",
        severity: "error",
        summary: "tf can't read this substitution. Close it with its `}` or `)`, nest another substitution only through the default, or write `%%-` for a literal `%-`, as the message says.",
        detail: "a substitution tf can't read: a `%{` that never closes, or with another substitution glued onto its selector (`%{foo%{bar}}`; nesting only works through the default, `%{foo-%{bar}}`), a `%-` naming no parameter (`50%-off`), and a `${` or `$(` that never closes. Only where tf substitutes: a macro body, `/eval`, `/repeat`, `/at`, `/quote` or `/for` text, an expression; a plain top-level line prints it as it is"
      }
    ],
    fix: [
      "Close every `%{`, `${` and `$(`.",
      "Nest through the default: `%{foo-%{bar}}`.",
      "Write `%%-` for a literal `%-`: `50%%-off`."
    ]
  },
  {
    id: "R7",
    title: "Expressions",
    statement: [
      'In an expression (a condition, `/test`, `/return`, `/result` or `$[...]`), a string is delimited by `"`, `\'` or a backquote and must be closed ("unmatched \\" in string literal"), parentheses must balance, and a `$[` must close ("unmatched $["). Strings only count inside an expression.',
      "In a macro body these are errors when it runs, and in a top-level condition or `/test` as the file loads.",
      'A condition is already an expression, so a `$[...]` inside one is redundant: tf warns "$[...] substitution in expression is legal, but redundant", in a top-level `/test` and nested in another `$[...]` too. A `%{x}` there draws "legal, but can be confusing. Try using {x}". tf prints each once per session unless `%pedantic` is on. A body\'s `/test` text is substituted before it is compiled, so `/test $[3]` in a body draws nothing.'
    ],
    source: [
      { at: "expr.c:2231", what: "primary_expr() reads an operand" },
      { at: "expr.c:2246", what: "an unclosed string literal" },
      { at: "expr.c:2269", what: '"$[...] substitution in expression is legal, but redundant"' },
      { at: "expand.c:2300-2303", what: '"%{x} substitution in expression is legal, but can be confusing"' },
      { at: "expand.c:2021", what: '"unmatched $["' },
      { at: "expand.c:2054", what: '"unmatched ("' }
    ],
    cases: [
      "dollar-bracket-in-if",
      "if-expression-plain",
      "unclosed-substitution-dollar-bracket",
      "unclosed-substitution-string",
      "unclosed-substitution-condition",
      "expression-syntax-top-level-test",
      "substitution-in-expression-warns",
      "substitution-in-expression-body-test",
      "substitution-in-expression-once-per-session"
    ],
    codes: [
      {
        code: "expression-syntax",
        severity: "error",
        summary: "tf can't read this expression. Close the string, `(` or `$[` that is left open, or remove the `)` with no `(`.",
        detail: "an expression tf can't read: a `$[` that never closes, a string or `(` left open, a `)` with no `(`, an `/if` or `/while` condition with no `)`. In a condition and a top-level `/test` too, which tf compiles as written"
      },
      {
        code: "substitution-in-expression",
        severity: "warning",
        summary: "A substitution used as an operand of an expression is redundant, and tf warns about it. Write `(...)` for `$[...]` and `{x}` for `%{x}`.",
        detail: "(warning) a `$[...]`, `%x` or `%{x}` that is itself an operand of an expression: an `/if`, `/elseif` or `/while` condition, a `$[...]`, or a top-level `/test`, `/return` or `/result`. tf warns that `$[...]` is redundant and `%{x}` confusing (once per session, unless `%pedantic` is on); the fix writes `(...)` or `{x}`, which mean the same. Not in a string, a substitution's default, `${...}` or `$(...)`, nor in a macro body's `/test` text, which is substituted before it is compiled"
      }
    ],
    fix: [
      'Write the plain expression in a condition: `/if (strstr({P0}, "x") >= 0)`, not `/if ($[strstr({P0}, "x")] >= 0)`.',
      "Write `{x}`, not `%{x}`, for a variable in an expression."
    ]
  },
  {
    id: "R8",
    title: "Macro names",
    statement: [
      'A macro cannot be named after a keyword or `eval`. `/def if`, `/def SET`, `/def let`, `/def test`, `/def eval` and the rest of the keyword table are refused with `"SET" is a reserved word.`, in any case, and nothing is defined, so `/set` keeps meaning the keyword.',
      'A name that starts with `#`, `@`, `!` or `/`, or holds a space, is refused as an "illegal macro name". A `/def` with its `=` left out (`/def greet /echo hi`) has a space in its name.',
      'Other builtins can be redefined: `/def quote` and `/def lcd` only draw "conflicts with the builtin command", and the macro then runs.'
    ],
    source: [
      { at: "macro.c:865-866", what: '"illegal macro name"' },
      { at: "macro.c:870-874", what: 'a keyword, or a builtin flagged reserved, is "a reserved word"' },
      { at: "expand.c:72-75", what: "the keyword table" },
      { at: "cmdlist.h:35", what: "EVAL is the one builtin flagged reserved" }
    ],
    cases: ["reserved-macro-name", "invalid-macro-name", "builtin-redefined"],
    codes: [
      {
        code: "invalid-macro-name",
        severity: "error",
        summary: "tf refuses this macro name and defines nothing. Choose another name, or put in the `=` that ends the name.",
        detail: 'a top-level `/def` (or `/@def`) whose name tf refuses, so it defines nothing: a keyword (`if`, `then`, `let`, `set`, `test`, ...) or `eval`, in any case ("is a reserved word"), or a name starting with `#`, `@`, `!` or `/` or holding a space or tab ("illegal macro name"). The name is everything from the end of the options to the first `=`, so a `/def` with its `=` left out (`/def greet /echo hi`) has a space in it; then the fix puts the `=` in. Other builtins can be redefined, so they aren\'t flagged'
      }
    ],
    fix: ["Name macros with something other than a keyword, and write the `=`: `/def greet = /echo hi`."]
  },
  {
    id: "R9",
    title: "Load paths",
    statement: [
      "A relative `/load` path is tried against tf's current directory, not the loading file's directory, then against each `TFPATH` directory in order, or `TFLIBDIR` when `TFPATH` is empty. So a non-empty `TFPATH` must include the library directory for `/require alias.tf` to work.",
      'A call of a macro no loaded file defines prints "NAME: no such command or macro", and tf goes on with the next command.'
    ],
    source: [
      { at: "command.c:512-541", what: "do_file_load() tries the path, then `TFPATH`, or `TFLIBDIR`" },
      { at: "expand.c:270", what: '"no such command or macro"' }
    ],
    cases: ["load-path-tfpath", "load-path-tfpath-target", "load-path-tfpath-replaces-libdir", "load-path-libdir", "load-not-loader-dir", "undefined-macro-goes-on"],
    codes: [
      {
        code: "unresolved-load",
        severity: "warning (information where it can't follow the path)",
        summary: "tf won't find the file this `/load` or `/require` names, or this check can't follow the path. The message says what to fix: the path, or the `tfscript` setting that tells this check where tf runs.",
        detail: "a `/load` or `/require`, in a file on the load path, whose file tf wouldn't find; (information) one built from something this check can't follow: a variable it doesn't know, a `~` with no home directory set, `~user`, or one of tf's library files with no library folder set (`tfscript.libraryPath`). Turned off by `tfscript.diagnostics.unresolvedLoads`"
      },
      {
        code: "undefined-macro",
        severity: "information (warning where no file this check can see defines it)",
        summary: `No file on this file's load path defines this macro, so unless something else defines it first, tf prints "no such command or macro" when the call runs. The message says what to do: load the file that defines it, check the name, or make a load this check can't follow resolve.`,
        detail: "(information, or a warning where no file this check can see defines it) a call of a macro that no file on this file's load path defines; where another file defines it, the fix adds the `/require`. Turned off by `tfscript.diagnostics.undefinedMacros`"
      }
    ],
    fix: [
      "Put library directories on `TFPATH`, and write paths relative to tf's current directory, not the script's.",
      "Build a path from a variable with `/eval`: `/eval /load %{dir}/x.tf`."
    ]
  }
];
var RULES_DOC_URL = "https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md";
function findCode(code2) {
  for (const section of RULE_SECTIONS) {
    const entry = section.codes.find((c) => c.code === code2);
    if (entry) return { section, entry };
  }
  return void 0;
}
function codeHref(code2) {
  return `${RULES_DOC_URL}#${code2}`;
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
var IN_PROSE = /(?<=^|\s)(set |in )?tfscript\.([A-Za-z]+(?:\.[A-Za-z]+)*)(?![\w/\\-]|\.\w)( to (?:false\b)?)?/g;
function translate(prose) {
  return prose.replace(IN_PROSE, (whole, before, key2, to) => {
    const option = OPTION_FOR_SETTING[key2];
    if (option === void 0) return whole;
    if (TOGGLES.has(option)) {
      if (before === "set " && to === " to false") return `use ${option}`;
      return before === void 0 && to === void 0 ? option : whole;
    }
    if (before === "set " && to !== void 0) return `give ${option} ${to.slice(" to ".length)}`;
    const lead = before === "set " ? "use " : before === "in " ? "with " : "";
    return `${lead}${option}${to ?? ""}`;
  });
}
function forCommandLine(text) {
  return text.split(/("[^"]*")/).map((part, i) => i % 2 === 1 ? part : translate(part)).join("");
}
var CONFIG_NAME = "tfscript.json";
function translateForConfigFile(prose) {
  return prose.replace(IN_PROSE, (whole, before, key2, to) => {
    if (OPTION_FOR_SETTING[key2] === void 0) return whole;
    const lead = before === "set " ? "set " : before === "in " ? "under " : "";
    return `${lead}${key2} in ${CONFIG_NAME}${to ?? ""}`;
  });
}
function forConfigFile(text) {
  return text.split(/("[^"]*")/).map((part, i) => i % 2 === 1 ? part : translateForConfigFile(part)).join("");
}
var NAMERS = { option: forCommandLine, config: forConfigFile };

// packages/cli/src/format.ts
var JSON_VERSION = 1;
function displayPath(file, cwd) {
  const rel = path8.relative(cwd, file);
  const outside = rel === ".." || rel.startsWith(`..${path8.sep}`) || rel.startsWith("../");
  return rel === "" || outside || path8.isAbsolute(rel) ? file : rel;
}
function lineStarts(text) {
  const starts = [0];
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}
var compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function inOrder(files, cwd) {
  return files.map((f) => ({ f, name: displayPath(f.file, cwd) })).sort((a, b) => compare(a.name, b.name)).map(({ f }) => ({
    ...f,
    diagnostics: [...f.diagnostics].sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character)
  }));
}
function summarize(files) {
  const all = files.flatMap((f) => f.diagnostics);
  const count = (s) => all.filter((d) => d.severity === s).length;
  return { files: files.length, errors: count("error"), warnings: count("warning"), information: count("information") };
}
function formatHuman(files, cwd, names = forCommandLine) {
  return inOrder(files, cwd).flatMap(
    (f) => f.diagnostics.map(
      (d) => `${displayPath(f.file, cwd)}:${d.range.start.line + 1}:${d.range.start.character + 1}: ${d.severity} ${d.code}: ${names(d.message)}
`
    )
  ).join("");
}
function toJsonReport(unordered, cwd, problems = [], names = forCommandLine) {
  const files = inOrder(unordered, cwd);
  const diagnostics = files.flatMap((f) => {
    const starts = lineStarts(f.text);
    const position = (p) => ({ line: p.line + 1, column: p.character + 1, offset: (starts[p.line] ?? f.text.length) + p.character });
    const range = (r) => ({ start: position(r.start), end: position(r.end) });
    const file = displayPath(f.file, cwd);
    return f.diagnostics.map(
      (d) => ({
        file,
        range: range(d.range),
        severity: d.severity,
        code: d.code,
        message: names(d.message),
        codeDescription: findCode(d.code) ? { href: codeHref(d.code) } : null,
        fixes: [d.fix, d.alternative].flatMap((fix) => fix ? [fix.title] : []),
        related: (d.related ?? []).map((r) => ({ range: range(r.range), message: names(r.message) }))
      })
    );
  });
  return { version: JSON_VERSION, files: files.map((f) => displayPath(f.file, cwd)), diagnostics, problems, summary: summarize(files) };
}
var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function formatSummary(s) {
  const found = [plural(s.errors, "error", "errors"), plural(s.warnings, "warning", "warnings"), plural(s.information, "note", "notes")];
  return `${found.join(", ")} in ${plural(s.files, "file", "files")}.
`;
}

// packages/cli/src/usage.ts
var VERSION = "0.2.0";
var USAGE = `Usage: tfscript check [options] <file or folder>...

Checks tf scripts and reports what the tfscript language server would: each file's own
diagnostics, then the ones its load path gives (unresolved-load, undefined-macro), worked out
from the root folder the way the editor works them out from a workspace folder. A folder is
searched for .tf files, tfrc and .tfrc, skipping .git, .jj and node_modules, and not following
links to folders. The whole root is searched for what defines each macro, so a narrow --root
keeps a check fast.

Output:
  --format <human|json>         human (the default): one line per diagnostic,
                                path:line:col: severity code: message. json: one report,
                                described in the README.
  --max-warnings <n>            exit 1 when there are more than n warnings
  --setting-names <option|config>
                                how a message names a setting: as its option (the default),
                                or as its tfscript.json key (for the Claude Code hook)

Where tf runs (each is named after the tfscript.* setting in brackets):
  --root <folder>               the workspace folder (default: the folder of --config, else
                                the current folder)
  --config <file>               a tfscript.json to read these settings from (default: the
                                root's tfscript.json, if it has one); the options go over it
  --entry-file <file>           a file tf loads after stdlib.tf; repeat for more (entryFiles;
                                default: a tfrc, .tfrc or tfrc.tf in the root, else ~/.tfrc)
  --context <name>=<file>       a named way tf starts and a file it loads; repeat for more files
                                or contexts (contexts)
  --active-context <name>       which context files are seen through (activeContext)
  --library-path <folder>       tf's library, holding stdlib.tf (libraryPath; default: TFLIBDIR)
  --tf-path <folder>            a TFPATH folder; repeat for more (tfPath; default: TFPATH)
  --working-directory <folder>  tf's current directory (workingDirectory; default: the root)
  --home-directory <folder>     what ~ means to tf (homeDirectory)
  --path-mapping <tf>=<local>   where tf's absolute path <tf> is here; repeat for more
                                (pathMappings)
  --variable <name>=<value>     a variable set as tf starts; repeat for more (variables)

Which diagnostics:
  --no-unresolved-loads         leave out unresolved-load (diagnostics.unresolvedLoads)
  --no-undefined-macros         leave out undefined-macro (diagnostics.undefinedMacros)
  --ignore-macro <name>         a macro undefined-macro leaves alone, ignoring case, * a
                                wildcard; repeat for more (diagnostics.ignoreMacros)

  -h, --help                    show this help
  --version                     show the version

Relative paths in the options are relative to the root, not to the current folder, as the
editor's settings are relative to the workspace folder; in a tfscript.json, they are relative to
its own folder. With --root ws, the tfrc in ws is
--entry-file tfrc, not --entry-file ws/tfrc:
  tfscript check --root ws --entry-file tfrc ws/

Exit status: 0 when no errors are found, 1 when there are errors (or more warnings than
--max-warnings), 2 when it can't check: the command line is wrong, --root is missing or is a
file, the tfscript.json is missing or bad, a path doesn't exist, can't be read or is a folder
with no tf scripts, or an internal error.
`;

// packages/cli/src/main.ts
var EXIT_OK = 0;
var EXIT_PROBLEMS = 1;
var EXIT_USAGE = 2;
function main(argv, io, host = nodeHost()) {
  let command2;
  try {
    command2 = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.err(`tfscript: ${error.message}
`);
    return EXIT_USAGE;
  }
  if (command2.kind === "help") {
    io.out(USAGE);
    return EXIT_OK;
  }
  if (command2.kind === "version") {
    io.out(`${VERSION}
`);
    return EXIT_OK;
  }
  const result = check5(
    {
      paths: command2.paths,
      settings: command2.settings,
      cwd: io.cwd,
      ...command2.root === void 0 ? {} : { root: command2.root },
      ...command2.config === void 0 ? {} : { config: command2.config }
    },
    host
  );
  const names = NAMERS[command2.settingNames];
  if (command2.format === "json") io.out(`${JSON.stringify(toJsonReport(result.files, io.cwd, result.problems, names), null, 2)}
`);
  else io.out(formatHuman(result.files, io.cwd, names));
  for (const problem of result.problems) io.err(`tfscript: ${problem}
`);
  const summary = summarize(result.files);
  if (command2.format === "human" && summary.errors + summary.warnings + summary.information > 0) io.err(formatSummary(summary));
  if (result.problems.length > 0) return EXIT_USAGE;
  if (summary.errors > 0) return EXIT_PROBLEMS;
  if (command2.maxWarnings !== void 0 && summary.warnings > command2.maxWarnings) {
    io.err(`tfscript: ${plural(summary.warnings, "warning is", "warnings are")} more than --max-warnings ${command2.maxWarnings} allows: fix some, or raise the limit.
`);
    return EXIT_PROBLEMS;
  }
  return EXIT_OK;
}

// packages/cli/src/cli.ts
try {
  process.exitCode = main(process.argv.slice(2), {
    cwd: process.cwd(),
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text)
  });
} catch (error) {
  process.stderr.write(`tfscript: the check failed with an internal error, which is a bug: please report it with this output.
${error instanceof Error ? error.stack ?? error.message : String(error)}
`);
  process.exitCode = EXIT_USAGE;
}
