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

function readCommandPages(tree) {
  return tree
    .list("htmldoc/commands")
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((f) => tree.read(`htmldoc/commands/${f}`));
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

/**
 * A tinyfugue tree the tables are read from: `read(file)` gives a file's text and `list(dir)` the
 * names in a folder, both by paths relative to the tree's root with `/`.
 */

/** The tinyfugue checkout on disk: the fork, as tfscript.tfBuild `fork` runs it. */
function checkoutTree(tinyfugueDir) {
  return {
    read: (file) => readFileSync(path.join(tinyfugueDir, file), "utf8"),
    list: (dir) => readdirSync(path.join(tinyfugueDir, dir)),
  };
}

/**
 * Upstream's tree: the checkout's `main`, an exact mirror of upstream/main, read through jj
 * without touching its working copy (the checkout itself is the fork's `dev`). One `jj file
 * show` prints every file the tables need, each after a NUL-delimited header naming it.
 */
function upstreamTree(tinyfugueDir) {
  const paths = ['root:"src"', 'root:"htmldoc"', 'root:"lib/tf"', 'root:"unix/unix.mak"'];
  const args = ["--ignore-working-copy", "-R", tinyfugueDir, "file", "show", "-r", "main", "-T", '"\\0" ++ path ++ "\\0"', ...paths];
  const out = require("node:child_process").execFileSync("jj", args, { encoding: "utf8", maxBuffer: 1 << 28 });
  const files = new Map();
  const parts = out.split("\0");
  for (let i = 1; i + 1 < parts.length; i += 2) files.set(parts[i], parts[i + 1]);
  return {
    read: (file) => {
      const text = files.get(file);
      if (text === undefined) throw new Error(`upstream's main has no ${file}`);
      return text;
    },
    list: (dir) => [...files.keys()].filter((f) => path.posix.dirname(f) === dir).map((f) => path.posix.basename(f)),
  };
}

function writeDataFile(fileName, exportName, sourceNote, names) {
  const body =
    `// Generated by scripts/extract-command-tables.js from ${sourceNote}. Do not hand-edit —\n` +
    `// re-run that script after a tinyfugue update; test/commandsData.test.ts checks this\n` +
    `// file against the source it came from.\n` +
    `export const ${exportName}: readonly string[] = ${JSON.stringify(names, null, 2)};\n`;
  writeFileSync(path.join(DATA_DIR, fileName), body);
}

/** The sources extractFunctions and extractVariables read, from a tinyfugue tree. */
function readFunctionSources(tree) {
  return [tree.read("src/funclist.h"), tree.read("htmldoc/topics/functions.html")];
}
function readVariableSources(tree) {
  const src = (f) => tree.read(`src/${f}`);
  return [src("varlist.h"), extractEnums(src("enumlist.h"), src("variable.c"))];
}

/** Every table a tree gives, as the checked-in files hold them. */
function extractTables(tree) {
  const libraryFiles = extractLibraryFiles(tree.read("unix/unix.mak"));
  return {
    keywordCommands: extractKeywordTable(tree.read("src/expand.c")),
    builtinCommands: extractBuiltinCmds(tree.read("src/cmdlist.h")),
    libraryFiles,
    libraryLoaded: extractLibraryLoaded((f) => tree.read(`lib/tf/${f}`), libraryFiles),
    usages: extractCommandUsages(readCommandPages(tree)),
    functions: extractFunctions(...readFunctionSources(tree)),
    variables: extractVariables(...readVariableSources(tree)),
  };
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
  checkoutTree,
  upstreamTree,
  extractTables,
  extractCommandUsages,
  readCommandPages,
  tokenize,
};

// Only regenerate the checked-in files when run directly (`node extract-command-tables.js`);
// packages/core/test/commandsData.test.ts requires this module for its extraction functions without that
// side effect.
if (require.main === module) {
  const tinyfugueDir = path.join(MUD_DIR, "tinyfugue");
  const writeTyped = (fileName, note, typeName, exportName, type, value) =>
    writeFileSync(
      path.join(DATA_DIR, fileName),
      `// Generated by scripts/extract-command-tables.js from ${note}. Do not hand-edit;\n` +
        `// test/commandsData.test.ts checks it against those sources.\n` +
        (typeName ? `import type { ${typeName} } from "./types";\n\n` : "") +
        `export const ${exportName}: ${type} = ${JSON.stringify(value, null, 2)};\n`,
    );

  // The fork's tables, from the checkout, and upstream's, from its main. Upstream's keyword table
  // and stdlib.tf macros are the fork's (the test checks that), so they get no file of their own.
  const builds = [
    { tree: checkoutTree(tinyfugueDir), file: (n) => n, name: (n) => n, from: "tinyfugue" },
    { tree: upstreamTree(tinyfugueDir), file: (n) => `upstream${n[0].toUpperCase()}${n.slice(1)}`, name: (n) => `UPSTREAM_${n}`, from: "tinyfugue's main (upstream)" },
  ];
  for (const [i, { tree, file, name, from }] of builds.entries()) {
    const t = extractTables(tree);
    if (i === 0) {
      writeDataFile("keywordCommands.generated.ts", "KEYWORD_COMMANDS", "tinyfugue/src/expand.c's keyword_table[]", t.keywordCommands);
      const stdlib = extractStdlibMacros(tree.read("lib/tf/stdlib.tf"));
      writeDataFile("stdlibCommands.generated.ts", "STDLIB_COMMANDS", "tinyfugue/lib/tf/stdlib.tf's top-level /def macros", stdlib);
    }
    writeDataFile(file("builtinCommands.generated.ts"), name("BUILTIN_COMMANDS"), `${from}/src/cmdlist.h's defcmd(...) entries`, t.builtinCommands);
    writeDataFile(
      file("libraryFiles.generated.ts"),
      name("LIBRARY_FILES"),
      `${from}/unix/unix.mak's LIBRARY rule (the .tf files make install puts in TFLIBDIR)`,
      t.libraryFiles,
    );
    writeDataFile(
      file("libraryLoaded.generated.ts"),
      name("LIBRARY_FILES_WITH_LOADED"),
      `${from}/lib/tf: the library files (${name("LIBRARY_FILES")}) that run /loaded, which /require loads only once`,
      t.libraryLoaded,
    );
    writeTyped(
      file("commandUsages.generated.ts"),
      `${from}/htmldoc/commands/*.html's usage\n// blocks (synopses only — see extractCommandUsages)`,
      undefined,
      name("COMMAND_USAGES"),
      "Readonly<Record<string, readonly string[]>>",
      t.usages,
    );
    writeTyped(
      file("functions.generated.ts"),
      `${from}/src/funclist.h (names and\n// argument counts; max null = any number) and htmldoc/topics/functions.html (synopses only)`,
      "TfFunction",
      name("FUNCTIONS"),
      "readonly TfFunction[]",
      t.functions,
    );
    writeTyped(
      file("variables.generated.ts"),
      `${from}/src/varlist.h, with the values\n// of enum and flag variables from enumlist.h and variable.c`,
      "TfVariable",
      name("SPECIAL_VARIABLES"),
      "readonly TfVariable[]",
      t.variables,
    );
    console.log(
      `${from}: keyword: ${t.keywordCommands.length}, builtin: ${t.builtinCommands.length}, library: ${t.libraryFiles.length}, ` +
        `usages: ${Object.keys(t.usages).length}, functions: ${t.functions.length}, variables: ${t.variables.length}`,
    );
  }
}
