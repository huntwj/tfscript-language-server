/**
 * Reads TinyFugue's own help file, `TFLIBDIR/tf-help` (what `/help` itself reads —
 * tinyfugue/src/main.c sets it up as `%s/tf-help` beside stdlib.tf), from the user's
 * installation at runtime. Nothing from it is shipped with this package: TinyFugue's
 * documentation is GPL and this project is MIT, and reading files already on someone's machine
 * isn't redistribution.
 *
 * The format: each section starts with one or more `&topic` lines (the names `/help` accepts,
 * e.g. `&/limit`, `&/relimit`, `&/unlimit` for one page), then the page's title, a `Usage:`
 * block, a row of underscores, and the description paragraphs. Text is ANSI-styled (bold
 * and underline escapes), which is stripped.
 */

export interface HelpEntry {
  /** Usage lines, command word lowercased: `/let <name>=<value>`. */
  usage: string[];
  /** The first paragraph after the usage block, unwrapped. */
  summary: string;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const RULE_RE = /^\s*_{10,}\s*$/;

function lowerCommandWord(line: string): string {
  return line.replace(/^\/(\S+)/, (_, word: string) => `/${word.toLowerCase()}`);
}

function parseSection(body: string[]): HelpEntry {
  const rule = body.findIndex((l) => RULE_RE.test(l));
  const usageStart = body.findIndex((l) => /usage:\s*$/i.test(l));
  const head = rule === -1 || usageStart === -1 ? [] : body.slice(usageStart + 1, rule);
  const usage = head
    .map((l) => l.trim())
    .filter((l) => l.startsWith("/"))
    .map(lowerCommandWord);

  const rest = rule === -1 ? body : body.slice(rule + 1);
  const start = rest.findIndex((l) => l.trim() !== "");
  const paragraph: string[] = [];
  for (let i = start; start !== -1 && i < rest.length; i += 1) {
    const line = rest[i] as string;
    if (line.trim() === "") break;
    paragraph.push(line.trim());
  }
  return { usage, summary: paragraph.join(" ").replace(/\s+/g, " ").trim() };
}

/** Help entries keyed by lowercase topic, e.g. `/let` or `/unlimit`. */
export function parseTfHelp(text: string): Map<string, HelpEntry> {
  const entries = new Map<string, HelpEntry>();
  const lines = text.replace(ANSI_RE, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    if (!(lines[i] as string).startsWith("&")) {
      i += 1;
      continue;
    }
    const topics: string[] = [];
    while (i < lines.length && (lines[i] as string).startsWith("&")) {
      topics.push((lines[i] as string).slice(1).trim().toLowerCase());
      i += 1;
    }
    const body: string[] = [];
    while (i < lines.length && !(lines[i] as string).startsWith("&")) {
      body.push(lines[i] as string);
      i += 1;
    }
    const entry = parseSection(body);
    for (const topic of topics) if (!entries.has(topic)) entries.set(topic, entry);
  }
  return entries;
}
