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
 * A setting named in prose: at the start or after a space (not inside a /name or a path), its key
 * not running on into a path or a longer name, with the words around it that the option's
 * wording replaces.
 */
const IN_PROSE = /(?<=^|\s)(set |in )?tfscript\.([A-Za-z]+(?:\.[A-Za-z]+)*)(?![\w/\\-]|\.\w)( to (?:false\b)?)?/g;

function translate(prose: string): string {
  return prose.replace(IN_PROSE, (whole, before: string | undefined, key: string, to: string | undefined) => {
    const option = OPTION_FOR_SETTING[key];
    if (option === undefined) return whole;
    if (before === "set " && to !== undefined) return `give ${option} ${to.slice(" to ".length)}`;
    const lead = before === "set " ? "use " : before === "in " ? "with " : "";
    return `${lead}${option}${to ?? ""}`;
  });
}

/**
 * `text` with each setting it names put as the option: "set tfscript.x to y" as "give --x y",
 * "set tfscript.x" as "use --x", "in tfscript.x" as "with --x", and any other mention as "--x";
 * for a toggle, only "set tfscript.x to false" ("use --no-x") and a bare mention. tf's own text
 * in a message is left alone: anything in double quotes, and a /name or path. A setting with no
 * option is left as it is.
 */
export function forCommandLine(text: string): string {
  // split() with a capturing group puts each quoted part at an odd index.
  return text
    .split(/("[^"]*")/)
    .map((part, i) => (i % 2 === 1 ? part : translate(part)))
    .join("");
}
