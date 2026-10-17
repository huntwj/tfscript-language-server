import { TF_BUILDS } from "@tfscript/core/tfBuild";
import type { RawSettings } from "@tfscript/core/workspace/settings";

/** What the command line asked for. */
export type Command =
  | { kind: "help" }
  | { kind: "version" }
  | {
      kind: "check";
      paths: string[];
      format: "human" | "json";
      /** How messages name a setting: as its option (the default), or as its tfscript.json key. */
      settingNames: "option" | "config";
      /** Exit 1 when there are more warnings than this. */
      maxWarnings?: number;
      /** The workspace folder, as an editor would have it open; relative to the current folder. */
      root?: string;
      /** A tfscript.json to read the settings from, rather than the root's own; relative to the current folder. */
      config?: string;
      /** The tfscript.* settings the options give, resolved by core like the editor's. */
      settings: RawSettings;
    }
  | {
      kind: "format";
      paths: string[];
      /** Only report which files would change. */
      check: boolean;
    };

/** A command line that can't be run: `message` says what is wrong and how to fix it. */
export class UsageError extends Error {}

type Kind = "value" | "list" | "flag";

/** Every option, by name, and whether it takes a value, takes one each time it is repeated, or none. */
export const OPTIONS: Readonly<Record<string, Kind>> = {
  help: "flag",
  version: "flag",
  check: "flag",
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
  "tf-build": "value",
  "no-unresolved-loads": "flag",
  "no-undefined-macros": "flag",
  "ignore-macro": "list",
};

const SHORT: Record<string, string> = { h: "help" };

interface Parsed {
  positionals: string[];
  values: Map<string, string[]>;
  flags: Set<string>;
}

function tokenize(argv: readonly string[]): Parsed {
  const parsed: Parsed = { positionals: [], values: new Map(), flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
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
    const written = long ? arg.slice(2, eq < 0 ? undefined : eq) : arg.slice(1);
    const name = long ? written : SHORT[written];
    const kind = name === undefined ? undefined : OPTIONS[name];
    if (name === undefined || kind === undefined) {
      throw new UsageError(`There's no option ${arg.slice(0, long && eq >= 0 ? eq : undefined)}: run tfscript --help to see the options.`);
    }
    if (kind === "flag") {
      if (long && eq >= 0) throw new UsageError(`--${name} doesn't take a value: write it on its own, without =.`);
      parsed.flags.add(name);
      continue;
    }
    let value: string | undefined;
    if (long && eq >= 0) value = arg.slice(eq + 1);
    else if (i + 1 < argv.length) value = argv[++i];
    if (value === undefined) throw new UsageError(`--${name} needs a value: write it after the option, as in --${name} <value>.`);
    const list = parsed.values.get(name) ?? [];
    if (kind === "value" && list.length > 0) throw new UsageError(`--${name} was given twice: give it once.`);
    list.push(value);
    parsed.values.set(name, list);
  }
  return parsed;
}

/** `name=value`, split at the first `=`. */
function pair(option: string, text: string, what: string): [string, string] {
  const eq = text.indexOf("=");
  if (eq <= 0) throw new UsageError(`--${option} ${text} isn't ${what}: write it as --${option} ${what}.`);
  return [text.slice(0, eq), text.slice(eq + 1)];
}

/**
 * The tfscript.* settings the options give, as the editor would send them. Only what is given is
 * set, so core fills in the rest the way it does for the editor (a tfrc at the root, TFLIBDIR from
 * the environment, every diagnostic on).
 */
function settingsOf(p: Parsed): RawSettings {
  const settings: RawSettings = {};
  const one = (name: string): string | undefined => p.values.get(name)?.[0];
  const all = (name: string): string[] => p.values.get(name) ?? [];

  if (all("entry-file").length > 0) settings.entryFiles = all("entry-file");
  if (all("context").length > 0) {
    const contexts: Record<string, string[]> = {};
    for (const c of all("context")) {
      const [name, file] = pair("context", c, "<name>=<file>");
      (contexts[name] ??= []).push(file);
    }
    settings.contexts = contexts;
  }
  const active = one("active-context");
  if (active !== undefined) settings.activeContext = active;
  const library = one("library-path");
  if (library !== undefined) settings.libraryPath = library;
  if (all("tf-path").length > 0) settings.tfPath = all("tf-path");
  const working = one("working-directory");
  if (working !== undefined) settings.workingDirectory = working;
  const home = one("home-directory");
  if (home !== undefined) settings.homeDirectory = home;
  if (all("path-mapping").length > 0) {
    settings.pathMappings = all("path-mapping").map((m) => {
      const [tf, local] = pair("path-mapping", m, "<tf path>=<local path>");
      if (!tf.startsWith("/")) throw new UsageError(`--path-mapping ${m} maps ${tf}, which isn't absolute: start tf's side with /, as in /wotmud=C:/wotmud.`);
      return { tf, local };
    });
  }
  if (all("variable").length > 0) {
    const variables: Record<string, string> = {};
    for (const v of all("variable")) {
      const [name, value] = pair("variable", v, "<name>=<value>");
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new UsageError(`--variable ${v} names ${name}, which isn't a tf variable name: use letters, digits and _, not starting with a digit.`);
      variables[name] = value;
    }
    settings.variables = variables;
  }
  const build = one("tf-build");
  if (build !== undefined) {
    if (!(TF_BUILDS as readonly string[]).includes(build)) throw new UsageError(`--tf-build ${build} isn't a tf build: give ${TF_BUILDS.join(" or ")}.`);
    settings.tfBuild = build;
  }
  const diagnostics: NonNullable<RawSettings["diagnostics"]> = {};
  if (p.flags.has("no-unresolved-loads")) diagnostics.unresolvedLoads = false;
  if (p.flags.has("no-undefined-macros")) diagnostics.undefinedMacros = false;
  if (all("ignore-macro").length > 0) diagnostics.ignoreMacros = all("ignore-macro");
  if (Object.keys(diagnostics).length > 0) settings.diagnostics = diagnostics;
  return settings;
}

/** `tfscript format [--check] <paths>`: the formatter has one style, so no other option applies. */
function formatCommand(p: Parsed, paths: string[]): Command {
  const other = [...p.values.keys(), ...[...p.flags].filter((f) => f !== "check")][0];
  if (other !== undefined) throw new UsageError(`--${other} only goes with tfscript check: tfscript format takes only --check.`);
  if (paths.length === 0) throw new UsageError("Nothing to format: name the .tf files or folders, as in tfscript format tfrc scripts/.");
  return { kind: "format", paths, check: p.flags.has("check") };
}

export function parseArgs(argv: readonly string[]): Command {
  const p = tokenize(argv);
  if (p.flags.has("help")) return { kind: "help" };
  if (p.flags.has("version")) return { kind: "version" };
  const [command, ...paths] = p.positionals;
  if (command === undefined) throw new UsageError("No command given: run tfscript check <files or folders>, or tfscript --help.");
  if (command === "format") return formatCommand(p, paths);
  if (command !== "check") throw new UsageError(`There's no command ${command}: use check or format, as in tfscript check tfrc.`);
  if (paths.length === 0) throw new UsageError("Nothing to check: name the .tf files or folders, as in tfscript check tfrc scripts/.");
  if (p.flags.has("check")) throw new UsageError("--check only goes with tfscript format: leave it out, as tfscript check never changes a file.");

  const format = p.values.get("format")?.[0] ?? "human";
  if (format !== "human" && format !== "json") throw new UsageError(`--format ${format} isn't a format: use --format human or --format json.`);

  const settingNames = p.values.get("setting-names")?.[0] ?? "option";
  if (settingNames !== "option" && settingNames !== "config") {
    throw new UsageError(`--setting-names ${settingNames} isn't a way to name settings: use --setting-names option or --setting-names config.`);
  }

  const max = p.values.get("max-warnings")?.[0];
  let maxWarnings: number | undefined;
  if (max !== undefined) {
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
    ...(maxWarnings === undefined ? {} : { maxWarnings }),
    ...(root === undefined ? {} : { root }),
    ...(config === undefined ? {} : { config }),
    settings: settingsOf(p),
  };
}
