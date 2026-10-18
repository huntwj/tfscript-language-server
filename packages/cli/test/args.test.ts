import { describe, expect, it } from "vitest";
import { parseArgs, UsageError } from "../src/args";

const usageError = (argv: string[]): string => {
  try {
    parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) return error.message;
    throw error;
  }
  throw new Error(`parsed: ${argv.join(" ")}`);
};

describe("parseArgs", () => {
  it("reads check, its paths and the defaults", () => {
    expect(parseArgs(["check", "tfrc", "scripts"])).toEqual({ kind: "check", paths: ["tfrc", "scripts"], format: "human", settingNames: "option", settings: {} });
  });

  it("reads help and version wherever they are", () => {
    expect(parseArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseArgs(["check", "-h"])).toEqual({ kind: "help" });
    expect(parseArgs(["--version"])).toEqual({ kind: "version" });
  });

  it("maps each option to the tfscript setting of the same name", () => {
    const command = parseArgs([
      "check",
      "--root=ws",
      "--config",
      "ws/tfscript.json",
      "--entry-file",
      "tfrc",
      "--entry-file",
      "more.tf",
      "--context",
      "wot=wot.tfrc",
      "--context",
      "wot=extra.tf",
      "--context",
      "diku=diku.tfrc",
      "--active-context",
      "diku",
      "--library-path",
      "/usr/lib/tf",
      "--tf-path",
      "lib",
      "--working-directory",
      "run",
      "--home-directory",
      "~",
      "--path-mapping",
      "/wotmud=C:/Users/me/wotmud",
      "--variable",
      "dir=/wotmud",
      "--variable",
      "empty=",
      "--no-unresolved-loads",
      "--no-undefined-macros",
      "--ignore-macro",
      "hook_*",
      "--format",
      "json",
      "--setting-names",
      "config",
      "--max-warnings",
      "3",
      "a.tf",
    ]);
    expect(command).toEqual({
      kind: "check",
      paths: ["a.tf"],
      format: "json",
      settingNames: "config",
      maxWarnings: 3,
      root: "ws",
      config: "ws/tfscript.json",
      settings: {
        entryFiles: ["tfrc", "more.tf"],
        contexts: { wot: ["wot.tfrc", "extra.tf"], diku: ["diku.tfrc"] },
        activeContext: "diku",
        libraryPath: "/usr/lib/tf",
        tfPath: ["lib"],
        workingDirectory: "run",
        homeDirectory: "~",
        pathMappings: [{ tf: "/wotmud", local: "C:/Users/me/wotmud" }],
        variables: { dir: "/wotmud", empty: "" },
        diagnostics: { unresolvedLoads: false, undefinedMacros: false, ignoreMacros: ["hook_*"] },
      },
    });
  });

  it("takes everything after -- as a path", () => {
    expect(parseArgs(["check", "--", "--odd.tf"])).toMatchObject({ paths: ["--odd.tf"] });
  });

  it("says what is wrong with a command line, and how to fix it", () => {
    expect(usageError([])).toBe("No command given: run tfscript check <files or folders>, or tfscript --help.");
    expect(usageError(["lint", "a.tf"])).toBe("There's no command lint: use check or format, as in tfscript check tfrc.");
    expect(usageError(["check"])).toBe("Nothing to check: name the .tf files or folders, as in tfscript check tfrc scripts/.");
    expect(usageError(["check", "--fix", "a.tf"])).toBe("There's no option --fix: run tfscript --help to see the options.");
    expect(usageError(["check", "--fix=all", "a.tf"])).toBe("There's no option --fix: run tfscript --help to see the options.");
    expect(usageError(["check", "-x", "a.tf"])).toBe("There's no option -x: run tfscript --help to see the options.");
    expect(usageError(["check", "a.tf", "--root"])).toBe("--root needs a value: write it after the option, as in --root <value>.");
    expect(usageError(["check", "--root", "a", "--root", "b", "a.tf"])).toBe("--root was given twice: give it once.");
    expect(usageError(["check", "--no-undefined-macros=yes", "a.tf"])).toBe("--no-undefined-macros doesn't take a value: write it on its own, without =.");
    expect(usageError(["check", "--format", "xml", "a.tf"])).toBe("--format xml isn't a format: use --format human or --format json.");
    expect(usageError(["check", "--setting-names", "keys", "a.tf"])).toBe(
      "--setting-names keys isn't a way to name settings: use --setting-names option or --setting-names config.",
    );
    expect(usageError(["check", "--max-warnings", "-1", "a.tf"])).toBe("--max-warnings -1 isn't a number: give a whole number of warnings, 0 or more.");
    expect(usageError(["check", "--variable", "x", "a.tf"])).toBe("--variable x isn't <name>=<value>: write it as --variable <name>=<value>.");
    expect(usageError(["check", "--variable", "1x=a", "a.tf"])).toBe(
      "--variable 1x=a names 1x, which isn't a tf variable name: use letters, digits and _, not starting with a digit.",
    );
    expect(usageError(["check", "--tf-build", "dev", "a.tf"])).toBe("--tf-build dev isn't a tf build: give upstream or fork.");
    expect(parseArgs(["check", "--tf-build", "fork", "a.tf"])).toMatchObject({ settings: { tfBuild: "fork" } });
    expect(parseArgs(["check", "--local-prefix", "_", "a.tf"])).toMatchObject({ settings: { diagnostics: { localPrefix: "_" } } });
    expect(usageError(["check", "--path-mapping", "wotmud=C:/w", "a.tf"])).toBe(
      "--path-mapping wotmud=C:/w maps wotmud, which isn't absolute: start tf's side with /, as in /wotmud=C:/wotmud.",
    );
    expect(usageError(["check", "--context", "=a.tf", "a.tf"])).toBe("--context =a.tf isn't <name>=<file>: write it as --context <name>=<file>.");
  });
});
