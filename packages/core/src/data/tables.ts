import { DEFAULT_TF_BUILD, type TfBuild } from "../tfBuild";
import { BUILTIN_COMMANDS } from "./builtinCommands.generated";
import { commandsOf, type CommandInfo, type CommandSource } from "./commands";
import { COMMAND_USAGES } from "./commandUsages.generated";
import { FUNCTIONS } from "./functions.generated";
import { LIBRARY_FILES } from "./libraryFiles.generated";
import { LIBRARY_FILES_WITH_LOADED } from "./libraryLoaded.generated";
import type { TfFunction, TfVariable } from "./types";
import { UPSTREAM_BUILTIN_COMMANDS } from "./upstreamBuiltinCommands.generated";
import { UPSTREAM_COMMAND_USAGES } from "./upstreamCommandUsages.generated";
import { UPSTREAM_FUNCTIONS } from "./upstreamFunctions.generated";
import { UPSTREAM_LIBRARY_FILES } from "./upstreamLibraryFiles.generated";
import { UPSTREAM_LIBRARY_FILES_WITH_LOADED } from "./upstreamLibraryLoaded.generated";
import { UPSTREAM_SPECIAL_VARIABLES } from "./upstreamVariables.generated";
import { SPECIAL_VARIABLES } from "./variables.generated";

/**
 * What one tf has: its commands, functions, special variables and library. The tables without
 * a prefix come from the tinyfugue checkout, the fork; the UPSTREAM_ ones from its main. The
 * fork adds to upstream's (/python_call_unsafe, strlen_bytes() and the other _bytes functions,
 * local_assign and four more variables, tfwrite()'s third argument, kv.tf and bv.tf) and drops
 * kb-os2.tf from the library. The keyword table and stdlib.tf's macros are the same in both.
 *
 * Code that only steers clear of tf's names (a new macro's name, whether `name(...)` calls a
 * macro) uses the fork's tables, which hold every name upstream's do.
 */
export interface TfTables {
  readonly commands: readonly CommandInfo[];
  /** Each command's source, by lowercase name. */
  readonly commandSources: ReadonlyMap<string, CommandSource>;
  readonly builtinCommands: readonly string[];
  readonly commandUsages: Readonly<Record<string, readonly string[]>>;
  readonly functions: readonly TfFunction[];
  readonly functionNames: ReadonlySet<string>;
  readonly specialVariables: readonly TfVariable[];
  readonly specialVariableNames: ReadonlySet<string>;
  /** The .tf files the build installs in its library. */
  readonly libraryFiles: readonly string[];
  /** Those of them that run /loaded, which /require loads only once. */
  readonly libraryFilesWithLoaded: readonly string[];
}

function tables(
  builtinCommands: readonly string[],
  commandUsages: Readonly<Record<string, readonly string[]>>,
  functions: readonly TfFunction[],
  specialVariables: readonly TfVariable[],
  libraryFiles: readonly string[],
  libraryFilesWithLoaded: readonly string[],
): TfTables {
  const commands = commandsOf(builtinCommands);
  return {
    commands,
    commandSources: new Map(commands.map((c) => [c.name.toLowerCase(), c.source])),
    builtinCommands,
    commandUsages,
    functions,
    functionNames: new Set(functions.map((f) => f.name)),
    specialVariables,
    specialVariableNames: new Set(specialVariables.map((v) => v.name)),
    libraryFiles,
    libraryFilesWithLoaded,
  };
}

const BY_BUILD: Readonly<Record<TfBuild, TfTables>> = {
  fork: tables(BUILTIN_COMMANDS, COMMAND_USAGES, FUNCTIONS, SPECIAL_VARIABLES, LIBRARY_FILES, LIBRARY_FILES_WITH_LOADED),
  upstream: tables(
    UPSTREAM_BUILTIN_COMMANDS,
    UPSTREAM_COMMAND_USAGES,
    UPSTREAM_FUNCTIONS,
    UPSTREAM_SPECIAL_VARIABLES,
    UPSTREAM_LIBRARY_FILES,
    UPSTREAM_LIBRARY_FILES_WITH_LOADED,
  ),
};

/** The tables of the tf `build` names (tfBuild.ts); upstream's when none is given. */
export function tablesFor(build: TfBuild = DEFAULT_TF_BUILD): TfTables {
  return BY_BUILD[build];
}
