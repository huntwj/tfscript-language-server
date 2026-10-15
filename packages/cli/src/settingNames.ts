/**
 * Core's messages name the editor's settings (`set tfscript.workingDirectory`); on the command
 * line the same thing is an option. Each setting, by its key under `tfscript.`, and its option.
 * A test checks every setting core's sources name is here.
 */
export const OPTION_FOR_SETTING: Readonly<Record<string, string>> = {
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
  "diagnostics.ignoreMacros": "--ignore-macro",
};

/** A setting's name in core's text: `tfscript.` and dotted words, not a sentence's final period. */
export const SETTING_NAME = /tfscript\.([A-Za-z]+(?:\.[A-Za-z]+)*)/g;

/**
 * `text` with each setting it names put as the option: "set tfscript.x to y" as "give --x y",
 * "set tfscript.x" as "use --x", "in tfscript.x" as "with --x", and any other mention as "--x".
 * A setting with no option is left as it is.
 */
export function forCommandLine(text: string): string {
  return text.replace(/(\bset |\bin )?tfscript\.([A-Za-z]+(?:\.[A-Za-z]+)*)( to )?/g, (whole, before: string | undefined, key: string, to: string | undefined) => {
    const option = OPTION_FOR_SETTING[key];
    if (option === undefined) return whole;
    if (before === "set " && to) return `give ${option} `;
    const lead = before === "set " ? "use " : before === "in " ? "with " : (before ?? "");
    return `${lead}${option}${to ?? ""}`;
  });
}
