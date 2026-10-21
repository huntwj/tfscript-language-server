/**
 * Which tf the scripts run in, where builds differ in what a script does.
 *
 *  - "upstream": TinyFugue 5.0 beta 8, as released and as ingwarsw/tinyfugue has it. The default.
 *  - "fork": a TinyFugue that fixes four bugs of upstream's that a script can see, as the fork
 *    this project is developed beside does (proven in its source, tinyfugue/src, and its CHANGES):
 *     - `/load` drops one CR at the end of each line, so a file saved with CRLF line endings
 *       reads as one saved with LF (command.c's do_file_load()). Upstream keeps the CR, so a
 *       `\` before it doesn't continue the line.
 *     - A `?:` whose condition is a true constant no longer crashes tf in a macro body.
 *     - A `,` in a `$[...]` in command text no longer loses the text before it.
 *     - `/else` no longer also runs after a true `/if` and a true `/elseif`.
 *    It also has more commands, functions and special variables, and a different library
 *    (data/tables.ts).
 */
export type TfBuild = "upstream" | "fork";

export const TF_BUILDS: readonly TfBuild[] = ["upstream", "fork"];

export const DEFAULT_TF_BUILD: TfBuild = "upstream";

/**
 * A file's text as `build` reads it with `/load`. The fork drops one CR from the end of each
 * line, the last included; upstream reads the text as it is. Only a CR right before a line's
 * end goes, so every other character keeps its line and column (an editor's line has no CR in
 * it either). Run it once on a file's text: a line ending in two CRs keeps one.
 */
export function asLoaded(text: string, build: TfBuild): string {
  return build === "fork" ? text.replace(/\r(?=\n|$)/g, "") : text;
}
