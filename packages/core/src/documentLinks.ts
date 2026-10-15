import { entryLoads, literalText } from "./loadCommands";
import { splitLogicalEntries } from "./logicalEntries";
import type { Range } from "./symbols";

/**
 * The filenames of the `/load` and `/require` commands in a document (loadCommands.ts parses
 * them), for document links, linking the name tf ends up with. No link for a filename that is
 * substituted when it runs and has something to substitute (in a macro body, or under `/eval`
 * at its default level), one with a `%{...}` or `%name` that isn't substituted (which the
 * not-substituted-here rule warns about), one with a `\` (so a Windows path like `C:\x\a.tf` gets none), or one split across
 * lines.
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
      // not-substituted-here warns about a %{...} or %name tf won't substitute: no link to the
      // literal name. (A % in a run of them is text.)
      const namesVariable = /%\{|%[A-Za-z_]/.test(written.replace(/%%+/g, ""));
      if (/\\/.test(written) || (!load.pending.includes("full") && namesVariable)) continue;
      const file = literalText(load.file, load.pending);
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
