#!/usr/bin/env node
/**
 * Regenerates packages/core/src/data/*.generated.ts from the tinyfugue source tree (a sibling checkout,
 * read-only — never edit it from here). Run by hand after a tinyfugue update
 * (`node scripts/extract-command-tables.js`); packages/core/test/commandsData.test.ts re-parses the same
 * sources and fails if the checked-in files have drifted, so the server never ships a
 * command table nobody re-derived from source.
 *
 * Three distinct sources, because tf's "commands" are not one table (found 2026-10-11 while
 * starting on completion data — see README):
 *  - the bytecode compiler's keyword table (src/expand.c): control-flow syntax (/if, /while,
 *    /let, ...) compiled specially, not dispatched like an ordinary command;
 *  - the BuiltinCmd dispatch table (src/cmdlist.h): the actual C command handlers;
 *  - stdlib.tf's own top-level /def macros (lib/tf/stdlib.tf): /echo, /for, /addworld and
 *    about 130 more are library macros, not C code, but always available because stdlib.tf
 *    is loaded automatically on startup.
 */
const { readFileSync, readdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const MUD_DIR = path.resolve(__dirname, "..", "..");
const TINYFUGUE_SRC = path.join(MUD_DIR, "tinyfugue", "src");
const STDLIB_TF = path.join(MUD_DIR, "tinyfugue", "lib", "tf", "stdlib.tf");
const HTMLDOC_COMMANDS = path.join(MUD_DIR, "tinyfugue", "htmldoc", "commands");
const UNIX_MAK = path.join(MUD_DIR, "tinyfugue", "unix", "unix.mak");
const DATA_DIR =path.join(__dirname, "..", "packages", "core", "src", "data");

function extractKeywordTable(expandCText) {
  const block = /keyword_table\[\]\s*=\s*\{([^}]*)\}/.exec(expandCText);
  if (!block) throw new Error("keyword_table[] not found in expand.c");
  return [...block[1].matchAll(/"([A-Z]+)"/g)].map((m) => m[1]).sort();
}

function extractBuiltinCmds(cmdlistHText) {
  return [...cmdlistHText.matchAll(/defcmd\(\s*"([A-Z_]+)"/g)].map((m) => m[1]).sort();
}

/** Shell-style tokenizing: a quote can appear mid-word (`-h'SEND help'` is one token) and
 * only ends the word once it closes; an unquoted space always ends a word. */
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i += 1;
    if (i >= text.length) break;
    let token = "";
    while (i < text.length && !/\s/.test(text[i])) {
      const c = text[i];
      if (c === "'" || c === '"') {
        token += c;
        i += 1;
        while (i < text.length && text[i] !== c) {
          token += text[i];
          i += 1;
        }
        if (i < text.length) {
          token += text[i];
          i += 1;
        }
      } else {
        token += c;
        i += 1;
      }
    }
    tokens.push(token);
  }
  return tokens;
}

// `splitLogicalEntries` defaults to the built dist/ output (for the CLI path below), but
// takes a parameter so packages/core/test/commandsData.test.ts can pass src/logicalEntries's own export
// directly instead — otherwise that test would silently depend on `npm run build` having
// already been run, and could validate against a stale dist/ build without noticing.
function extractStdlibMacros(stdlibText, splitLogicalEntries = require("../packages/core/dist/logicalEntries").splitLogicalEntries) {
  const names = new Set();
  for (const entry of splitLogicalEntries(stdlibText)) {
    if (!entry.isDefBody) continue;
    const tokens = tokenize(entry.text);
    // tokens[0] is "/def"; skip flag tokens (any token starting with "-", quoted value and
    // all), then the first remaining token is the name — /def's body is optional (`= body`
    // or nothing at all), so there is no "=" to anchor on.
    const name = tokens.slice(1).find((t) => !t.startsWith("-"));
    if (name) names.add(name.replace(/=$/, ""));
  }
  return [...names].sort();
}

const HTML_ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&nbsp;": " " };

/**
 * Usage synopses from tinyfugue/htmldoc/commands/*.html, keyed by lowercase command name.
 * Each page's usage block is everything before its first `<hr>`; every `<br>`-separated
 * line in it that starts with `/` (after stripping tags) is a synopsis, filed under its own
 * leading command word, so a page covering several commands (echo.html: /echo and /_echo)
 * files each line under the right one. Only the synopses are kept, not the pages' prose:
 * TinyFugue's documentation is GPL, this project is MIT, and a usage line is syntax rather
 * than authored text.
 */
function extractCommandUsages(pages) {
  const usages = {};
  for (const html of pages) {
    const declared = new Set([...html.matchAll(/<!--"@\/([^"]+)"-->/g)].map((m) => m[1].toLowerCase()));
    const hr = html.search(/<hr\b/i);
    const block = hr === -1 ? "" : html.slice(0, hr);
    for (const raw of block.split(/<br\s*\/?>/i)) {
      const line = raw
        .split(/<p\b[^>]*>/i)
        .pop()
        .replace(/<[^>]*>/g, "")
        .replace(/&[a-z]+;/g, (e) => HTML_ENTITIES[e] ?? e)
        .replace(/\s+/g, " ")
        .trim();
      const m = /^\/(\S+)(.*)$/.exec(line);
      if (!m) continue;
      const name = m[1].toLowerCase();
      if (!declared.has(name)) continue;
      (usages[name] ??= []).push(`/${name}${m[2]}`);
    }
  }
  return Object.fromEntries(Object.keys(usages).sort().map((k) => [k, usages[k]]));
}

function readCommandPages(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((f) => readFileSync(path.join(dir, f), "utf8"));
}

/**
 * The lines of a C table header that a build would compile, each with the `#if` condition it
 * depends on (`ENABLE_GMCP`, `LUA_ENABLED`; undefined when unconditional). `#if 0` blocks are
 * dropped, and of an `#if X` ... `#else` pair only the `#if` side is kept, so a name defined
 * both ways (varlist.h's `atcp`, a flag when ATCP is compiled in) appears once.
 */
function compiledLines(text) {
  const out = [];
  const stack = []; // { cond, keep }
  for (const line of text.split("\n")) {
    const pp = /^\s*#\s*(if|ifdef|ifndef|else|elif|endif)\b\s*(.*)$/.exec(line);
    if (pp) {
      const [, word, rest] = pp;
      if (word === "if" || word === "ifdef" || word === "ifndef") {
        const cond = rest.replace(/\/\*.*?\*\//g, "").trim();
        stack.push({ cond, keep: cond !== "0" });
      } else if (word === "else" || word === "elif") {
        const top = stack[stack.length - 1];
        if (top) top.keep = top.cond === "0";
      } else {
        stack.pop();
      }
      continue;
    }
    if (stack.some((s) => !s.keep)) continue;
    const conds = stack.filter((s) => s.cond !== "0").map((s) => s.cond);
    out.push({ line, cond: conds.length > 0 ? conds.join(" && ") : undefined });
  }
  return out;
}

/**
 * tf's expression functions from src/funclist.h — `funccode(name, pure, min, max)` — with the
 * argument synopsis from htmldoc/topics/functions.html's `<dt><b>name</b>(<var>s</var>, ...)`
 * line where there is one. Only the synopsis is kept, as for commands (the prose is GPL).
 */
function extractFunctions(funclistText, functionsHtml) {
  const synopses = {};
  // A synopsis can wrap over several lines (echo(), mktime()); it ends at the next <dt> (a
  // second form, as substr() has) or the <dd> they share.
  for (const m of functionsHtml.matchAll(/<dt>\s*<b>([A-Za-z_][A-Za-z0-9_]*)<\/b>\s*(\([\s\S]*?\))\s*(?=<dt>|<dd>)/g)) {
    const name = m[1].toLowerCase();
    const args = m[2]
      .replace(/<[^>]*>/g, "")
      .replace(/&[a-z]+;/g, (e) => HTML_ENTITIES[e] ?? e)
      .replace(/\s+/g, " ")
      .trim();
    const list = (synopses[name] ??= []);
    if (!list.includes(`${name}${args}`)) list.push(`${name}${args}`);
  }
  const functions = [];
  for (const { line, cond } of compiledLines(funclistText)) {
    const m = /^\s*funccode\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*\d+\s*,\s*(\d+)\s*,\s*([^)]+?)\s*\)/.exec(line);
    if (!m) continue;
    const max = /^\d+$/.test(m[3]) ? Number(m[3]) : null;
    functions.push({
      name: m[1],
      min: Number(m[2]),
      max,
      ...(synopses[m[1]] ? { synopses: synopses[m[1]] } : {}),
      ...(cond ? { requires: cond } : {}),
    });
  }
  return functions.sort((a, b) => a.name.localeCompare(b.name));
}

/** Every `enum_NAME[] = { STRING_LITERAL("a"), ... }` array in the given C sources. */
function extractEnums(...texts) {
  const enums = {};
  for (const text of texts) {
    for (const m of text.matchAll(/(enum_[a-z0-9_]+)\[\][^{]*\{([^}]*)\}/g)) {
      enums[m[1]] ??= [...m[2].matchAll(/STRING_LITERAL\("([^"]*)"\)/g)].map((v) => v[1]);
    }
  }
  return enums;
}

const VAR_TYPES = { varstr: "string", varstrx: "string", varint: "integer", vartime: "time", varpos: "position", varenum: "enum", varflag: "flag" };

/**
 * tf's special variables from src/varlist.h: name, type, the values an enum or flag variable
 * takes (enumlist.h and variable.c), and the default where it is a literal.
 */
function extractVariables(varlistText, enums) {
  const variables = [];
  const seen = new Set();
  for (const { line, cond } of compiledLines(varlistText)) {
    const m = /^\s*(var[a-z]+)\s*\(\s*\w+\s*,\s*"([^"]+)"\s*,\s*([^,]+?)\s*,(.*)\)\s*$/.exec(line);
    if (!m || !VAR_TYPES[m[1]] || seen.has(m[2])) continue;
    seen.add(m[2]);
    const [, macro, name, value, rest] = m;
    const type = VAR_TYPES[macro];
    const enumName = macro === "varflag" ? "enum_flag" : macro === "varenum" ? /(enum_[a-z0-9_]+)/.exec(rest)?.[1] : undefined;
    const values = enumName ? enums[enumName] : undefined;
    let dflt;
    if (macro === "varflag") dflt = value === "TRUE" ? "on" : value === "FALSE" ? "off" : undefined;
    else if (macro === "varenum" && /^\d+$/.test(value)) dflt = values?.[Number(value)];
    else if (macro === "varenum" && value === "FALSE") dflt = values?.[0];
    else if (macro === "varint" && /^-?\d+$/.test(value)) dflt = value;
    else if ((macro === "varstr" || macro === "varstrx") && /^"[^"]*"$/.test(value)) dflt = value.slice(1, -1);
    variables.push({
      name,
      type,
      ...(values ? { values } : {}),
      ...(dflt !== undefined ? { default: dflt } : {}),
      ...(cond ? { requires: cond } : {}),
    });
  }
  return variables.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The .tf files `make install` puts in tf's library: the `install -m644 ../lib/tf/NAME.tf` lines
 * of unix.mak's LIBRARY rule, which runs to the first blank line. lib/tf holds a few files that
 * aren't installed, so the folder's own listing would be wrong.
 */
function extractLibraryFiles(unixMakText) {
  const rule = /^LIBRARY \$\(TF_LIBDIR\):.*\r?\n((?:.+\r?\n)*)/m.exec(unixMakText);
  if (!rule) throw new Error("unix.mak has no LIBRARY $(TF_LIBDIR) rule");
  const names = [...rule[1].matchAll(/^\tinstall -m644 \.\.\/lib\/tf\/([^\s/]+\.tf) /gm)].map((m) => m[1]);
  return [...new Set(names)].sort();
}

/**
 * Of tf's library files, those that run `/loaded` (a line starting `/loaded`), which /require then
 * loads only once (stdlib.tf's /require and /loaded); for the rest /require is a plain /load.
 */
function extractLibraryLoaded(read, files) {
  return files.filter((f) => /^\/loaded\s/m.test(read(f))).sort();
}

/** A library file's text from a lib/tf folder on disk. */
function libraryReader(libDir) {
  return (f) => readFileSync(path.join(libDir, f), "utf8");
}

/**
 * A file's text as upstream has it: the tinyfugue checkout's `main`, an exact mirror of
 * upstream/main, read through jj without touching its working copy. The checkout itself is the
 * fork's `dev`, whose library has files upstream's lacks (kv.tf, bv.tf ...).
 */
function readUpstream(tinyfugueDir, file) {
  const args = ["--ignore-working-copy", "-R", tinyfugueDir, "file", "show", "-r", "main", `root:"${file}"`];
  return require("node:child_process").execFileSync("jj", args, { encoding: "utf8" });
}

function writeDataFile(fileName, exportName, sourceNote, names) {
  const body =
    `// Generated by scripts/extract-command-tables.js from ${sourceNote}. Do not hand-edit —\n` +
    `// re-run that script after a tinyfugue update; test/commandsData.test.ts checks this\n` +
    `// file against the source it came from.\n` +
    `export const ${exportName}: readonly string[] = ${JSON.stringify(names, null, 2)};\n`;
  writeFileSync(path.join(DATA_DIR, fileName), body);
}

/** The sources extractFunctions and extractVariables read, from a tinyfugue checkout. */
function readFunctionSources(tinyfugueDir) {
  return [
    readFileSync(path.join(tinyfugueDir, "src", "funclist.h"), "utf8"),
    readFileSync(path.join(tinyfugueDir, "htmldoc", "topics", "functions.html"), "utf8"),
  ];
}
function readVariableSources(tinyfugueDir) {
  const src = (f) => readFileSync(path.join(tinyfugueDir, "src", f), "utf8");
  return [src("varlist.h"), extractEnums(src("enumlist.h"), src("variable.c"))];
}

module.exports = {
  extractFunctions,
  extractVariables,
  extractEnums,
  readFunctionSources,
  readVariableSources,
  extractKeywordTable,
  extractBuiltinCmds,
  extractStdlibMacros,
  extractLibraryFiles,
  extractLibraryLoaded,
  libraryReader,
  readUpstream,
  extractCommandUsages,
  readCommandPages,
  tokenize,
};

// Only regenerate the checked-in files when run directly (`node extract-command-tables.js`);
// packages/core/test/commandsData.test.ts requires this module for its extraction functions without that
// side effect.
if (require.main === module) {
  const keywordCommands = extractKeywordTable(
    readFileSync(path.join(TINYFUGUE_SRC, "expand.c"), "utf8"),
  );
  const builtinCommands = extractBuiltinCmds(
    readFileSync(path.join(TINYFUGUE_SRC, "cmdlist.h"), "utf8"),
  );
  const stdlibCommands = extractStdlibMacros(readFileSync(STDLIB_TF, "utf8"));

  writeDataFile(
    "keywordCommands.generated.ts",
    "KEYWORD_COMMANDS",
    "tinyfugue/src/expand.c's keyword_table[]",
    keywordCommands,
  );
  writeDataFile(
    "builtinCommands.generated.ts",
    "BUILTIN_COMMANDS",
    "tinyfugue/src/cmdlist.h's defcmd(...) entries",
    builtinCommands,
  );
  writeDataFile(
    "stdlibCommands.generated.ts",
    "STDLIB_COMMANDS",
    "tinyfugue/lib/tf/stdlib.tf's top-level /def macros",
    stdlibCommands,
  );

  const libraryFiles = extractLibraryFiles(readFileSync(UNIX_MAK, "utf8"));
  writeDataFile(
    "libraryFiles.generated.ts",
    "LIBRARY_FILES",
    "tinyfugue/unix/unix.mak's LIBRARY rule (the .tf files make install puts in TFLIBDIR)",
    libraryFiles,
  );
  writeDataFile(
    "libraryLoaded.generated.ts",
    "LIBRARY_FILES_WITH_LOADED",
    "tinyfugue/lib/tf: the library files (LIBRARY_FILES) that run /loaded, which /require loads only once",
    extractLibraryLoaded(libraryReader(path.join(MUD_DIR, "tinyfugue", "lib", "tf")), libraryFiles),
  );
  const upstream = (file) => readUpstream(path.join(MUD_DIR, "tinyfugue"), file);
  const upstreamLibraryFiles = extractLibraryFiles(upstream("unix/unix.mak"));
  writeDataFile(
    "upstreamLibraryFiles.generated.ts",
    "UPSTREAM_LIBRARY_FILES",
    "tinyfugue's main (upstream) unix/unix.mak's LIBRARY rule, for tfscript.tfBuild upstream",
    upstreamLibraryFiles,
  );
  writeDataFile(
    "upstreamLibraryLoaded.generated.ts",
    "UPSTREAM_LIBRARY_FILES_WITH_LOADED",
    "tinyfugue's main (upstream) lib/tf: the library files (UPSTREAM_LIBRARY_FILES) that run /loaded",
    extractLibraryLoaded((f) => upstream(`lib/tf/${f}`), upstreamLibraryFiles),
  );

  const usages = extractCommandUsages(readCommandPages(HTMLDOC_COMMANDS));
  writeFileSync(
    path.join(DATA_DIR, "commandUsages.generated.ts"),
    `// Generated by scripts/extract-command-tables.js from tinyfugue/htmldoc/commands/*.html's usage\n` +
      `// blocks (synopses only — see extractCommandUsages). Do not hand-edit — re-run that script\n` +
      `// after a tinyfugue update; test/commandsData.test.ts checks this file against its source.\n` +
      `export const COMMAND_USAGES: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(usages, null, 2)};\n`,
  );

  const tinyfugueDir = path.join(MUD_DIR, "tinyfugue");
  const functions = extractFunctions(...readFunctionSources(tinyfugueDir));
  writeFileSync(
    path.join(DATA_DIR, "functions.generated.ts"),
    `// Generated by scripts/extract-command-tables.js from tinyfugue/src/funclist.h (names and\n` +
      `// argument counts; max null = any number) and htmldoc/topics/functions.html (synopses only).\n` +
      `// Do not hand-edit; test/commandsData.test.ts checks it against those sources.\n` +
      `import type { TfFunction } from "./types";\n\n` +
      `export const FUNCTIONS: readonly TfFunction[] = ${JSON.stringify(functions, null, 2)};\n`,
  );
  const variables = extractVariables(...readVariableSources(tinyfugueDir));
  writeFileSync(
    path.join(DATA_DIR, "variables.generated.ts"),
    `// Generated by scripts/extract-command-tables.js from tinyfugue/src/varlist.h, with the values\n` +
      `// of enum and flag variables from enumlist.h and variable.c. Do not hand-edit;\n` +
      `// test/commandsData.test.ts checks it against those sources.\n` +
      `import type { TfVariable } from "./types";\n\n` +
      `export const SPECIAL_VARIABLES: readonly TfVariable[] = ${JSON.stringify(variables, null, 2)};\n`,
  );

  console.log(
    `keyword: ${keywordCommands.length}, builtin: ${builtinCommands.length}, stdlib: ${stdlibCommands.length}, library: ${libraryFiles.length}, ` +
      `usages: ${Object.keys(usages).length}, functions: ${functions.length}, variables: ${variables.length}`,
  );
}
