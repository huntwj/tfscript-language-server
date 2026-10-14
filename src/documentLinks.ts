import { isTfSpace, splitLogicalEntries } from "./logicalEntries";
import { entryStatements } from "./structure";
import type { Range } from "./symbols";

/**
 * The filenames `/load` and `/require` commands name, for document links. A command only counts
 * at the start of a statement (structure.ts finds them), optionally after `/eval`. Proven
 * against real tf with tf-script-check on 2026-10-13, as well as read from the source:
 *  - `/load` (command.c `handle_load_command()`) takes only `-q`, which may be grouped (`-qq`);
 *    `-` or `--` ends the options (util.c `nextopt()`); any other option is an error and nothing
 *    loads. The rest of the line, trimmed (`stripstr()`), is the filename, inner blanks included.
 *  - `/require` is stdlib.tf's `/load %{-L} %{L}`: its words are passed on with single spaces,
 *    so `/require a  b.tf` loads `a b.tf`.
 *  - At the top level a plain command runs to the end of the line, `%;` included:
 *    `/load a.tf%; /echo x` looks for a file called `a.tf%; /echo x`. In a macro body `%;`
 *    ends the statement.
 *  - `/loaded` takes a token, not a filename (stdlib.tf), so it gets no link.
 * A filename with `%`, `$` or `\` in it is skipped: in a macro body or under `/eval` it is
 * substituted when it runs, and at the top level such a name is almost always a mistake the
 * load-no-expansion rule reports. So is `~user/...`, which tf looks up in the password file.
 */

export interface LoadPath {
  kind: "load" | "require";
  /** The filename tf searches for. */
  file: string;
  /** Where it is written: always one physical line. */
  range: Range;
  /** The entry's first line, which is how the load graph records the load. */
  line: number;
  /** A plain top-level command, so the load graph followed it when this file loaded. */
  topLevel: boolean;
}

const COMMAND_RE = /^(\/@?eval(?:\s+-\S+)*\s+)?\/(@?)(load|require)(?=\s|$)/i;

interface Word {
  start: number;
  end: number;
}

function words(text: string, from: number): Word[] {
  const out: Word[] = [];
  let i = from;
  while (i < text.length) {
    while (i < text.length && isTfSpace(text[i])) i += 1;
    if (i >= text.length) break;
    const start = i;
    while (i < text.length && !isTfSpace(text[i])) i += 1;
    out.push({ start, end: i });
  }
  return out;
}

export function findLoadPaths(text: string): LoadPath[] {
  const out: LoadPath[] = [];
  for (const entry of splitLogicalEntries(text)) {
    if (entry.incomplete) continue;
    for (const st of entryStatements(entry)) {
      const stmt = entry.text.slice(st.start, st.end);
      const m = COMMAND_RE.exec(stmt);
      if (!m) continue;
      const kind = (m[3] as string).toLowerCase() as "load" | "require";
      if (kind === "require" && m[2]) continue;
      const args = words(stmt, m[0].length);
      let first = 0;
      while (first < args.length) {
        const w = stmt.slice(args[first]!.start, args[first]!.end);
        if (!w.startsWith("-")) break;
        if (w !== "-" && w !== "--" && !/^-q+$/.test(w)) {
          first = -1;
          break;
        }
        first += 1;
        if (w === "-" || w === "--") break;
      }
      if (first < 0 || first >= args.length) continue;
      const start = args[first]!.start;
      const end = args[args.length - 1]!.end;
      const written = stmt.slice(start, end);
      if (/[%$\\]/.test(written) || /^~[^/]/.test(written)) continue;
      const file = kind === "require" ? args.slice(first).map((w) => stmt.slice(w.start, w.end)).join(" ") : written;

      const from = entry.offsetMap[st.start + start];
      const last = entry.offsetMap[st.start + end - 1];
      if (!from || !last || from.line !== last.line || last.character - from.character !== written.length - 1) continue;
      out.push({
        kind,
        file,
        range: { start: { line: from.line, character: from.character }, end: { line: last.line, character: last.character + 1 } },
        line: entry.startLine,
        topLevel: !st.substituted && !m[1],
      });
    }
  }
  return out;
}
