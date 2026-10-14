import { isTfSpace, type LogicalEntry } from "./logicalEntries";
import { entryStatements, parseStatements } from "./structure";

/**
 * The `/load` and `/require` commands in an entry, and the filename each names, as tf parses
 * them. Both the load graph and the document links read loads from here. A command only counts
 * at the start of a statement (structure.ts finds them: `/echo hi /load x.tf` is an `/echo`).
 * Proven against real tf with tf-script-check on 2026-10-13, as well as read from the source:
 *  - `/load` (command.c `handle_load_command()`) takes only `-q`, which may be grouped (`-qq`);
 *    `-` or `--` ends the options (util.c `nextopt()`); any other option is an error and nothing
 *    loads. The rest of the line, trimmed (`stripstr()`), is the filename, inner blanks included.
 *  - `/require` is stdlib.tf's `/load %{-L} %{L}`: its words are passed on with single blanks,
 *    so `/require a  b.tf` loads `a b.tf`.
 *  - At the top level a plain command runs to the end of the line, `%;` included:
 *    `/load a.tf%; /echo x` looks for a file called `a.tf%; /echo x`. In a macro body `%;`
 *    ends the statement.
 *  - `/eval TEXT` (expand.c `handle_eval_command()`) runs TEXT as a macro body runs: substituted,
 *    then split on `%;`, so a top-level `/eval /load a.tf%; /load b.tf` loads both, while the
 *    file is loading. An `/eval` with an option (`-s`, the substitution level) isn't modelled,
 *    so its loads are not listed.
 *  - Text whose compile stops at an error runs nothing, so it has no loads (structure.ts).
 */

export interface LoadCommand {
  kind: "load" | "require";
  /** The filename as written, `/require`'s words joined by single blanks; may need substituting. */
  file: string;
  /** Where the filename is written, as offsets into `entry.text`. */
  start: number;
  end: number;
  /** Substituted before tf looks it up: in a macro body or under `/eval`. */
  substituted: boolean;
  /** Runs while the file loads: a top-level command, or one a top-level `/eval` runs. */
  topLevel: boolean;
}

const EVAL_RE = /^\/@?eval(?=\s|$)/i;
const LOAD_RE = /^\/(@?)(load|require)(?=\s|$)/i;

interface Word {
  start: number;
  end: number;
}

function words(text: string, from: number, to: number): Word[] {
  const out: Word[] = [];
  let i = from;
  while (i < to) {
    while (i < to && isTfSpace(text[i])) i += 1;
    if (i >= to) break;
    const start = i;
    while (i < to && !isTfSpace(text[i])) i += 1;
    out.push({ start, end: i });
  }
  return out;
}

export function entryLoads(entry: LogicalEntry): LoadCommand[] {
  const out: LoadCommand[] = [];
  const text = entry.text;

  const visit = (start: number, end: number, substituted: boolean, topLevel: boolean): void => {
    const stmt = text.slice(start, end);
    const ev = EVAL_RE.exec(stmt);
    if (ev) {
      const args = words(text, start + ev[0].length, end);
      const first = args[0];
      if (!first) return;
      let from = first.start;
      const option = text.slice(first.start, first.end);
      if (option === "-" || option === "--") from = args[1]?.start ?? end;
      else if (option.startsWith("-")) return;
      for (const st of parseStatements(text.slice(from, end), "body")) visit(from + st.start, from + st.end, true, topLevel);
      return;
    }
    const m = LOAD_RE.exec(stmt);
    if (!m) return;
    const kind = (m[2] as string).toLowerCase() as "load" | "require";
    if (kind === "require" && m[1]) return;
    const args = words(text, start + m[0].length, end);
    let first = 0;
    while (first < args.length) {
      const w = text.slice(args[first]!.start, args[first]!.end);
      if (!w.startsWith("-")) break;
      if (w !== "-" && w !== "--" && !/^-q+$/.test(w)) return;
      first += 1;
      if (w === "-" || w === "--") break;
    }
    if (first >= args.length) return;
    const fileStart = args[first]!.start;
    const fileEnd = args[args.length - 1]!.end;
    const file =
      kind === "require" ? args.slice(first).map((w) => text.slice(w.start, w.end)).join(" ") : text.slice(fileStart, fileEnd);
    out.push({ kind, file, start: fileStart, end: fileEnd, substituted, topLevel });
  };

  for (const st of entryStatements(entry)) visit(st.start, st.end, st.substituted, !st.substituted);
  return out;
}
