import { entryLoads, literalText } from "./loadCommands";
import { splitLogicalEntries } from "./logicalEntries";
import type { Range } from "./symbols";

/**
 * The filenames of the `/load` and `/require` commands in a document (loadCommands.ts parses
 * them), for document links. A filename with `%`, `$` or `\` in it is skipped: in a macro body or
 * under `/eval` it is substituted when it runs, and at the top level such a name is almost always
 * a mistake the load-no-expansion rule reports. That leaves a Windows path like `C:\x\a.tf`
 * unlinked too. The exception is text at the `newline` level (inside a top-level `/if`, or under
 * `/eval -son`), where tf only shortens each run of `%` by one, so the name is known: it links
 * to that name. A filename split across lines gets no link.
 */

export interface LoadPath {
  kind: "load" | "require";
  /** The filename tf searches for. */
  file: string;
  /** Where it is written: always one physical line. */
  range: Range;
  /** The entry's first line, which is how the load graph records the load. */
  line: number;
  /** Where the filename starts in the entry's joined text: with `line`, the load graph's key. */
  offset: number;
  /** Runs while the file loads, so the load graph followed it. */
  topLevel: boolean;
}

export function findLoadPaths(text: string): LoadPath[] {
  const out: LoadPath[] = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    for (const load of entryLoads(entry)) {
      const written = entry.text.slice(load.start, load.end);
      if (/\\/.test(written) || (load.level !== "newline" && /[%$]/.test(written))) continue;
      const file = literalText(load.file, load.level);
      if (file === undefined) continue;
      const from = entry.offsetMap[load.start];
      const last = entry.offsetMap[load.end - 1];
      if (!from || !last || from.line !== last.line || last.character - from.character !== written.length - 1) continue;
      out.push({
        kind: load.kind,
        file,
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        line: entry.startLine,
        offset: load.start,
        topLevel: load.topLevel,
      });
    }
  }
  return out;
}
