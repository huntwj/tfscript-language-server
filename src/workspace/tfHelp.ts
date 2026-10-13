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

/**
 * Inside a page, `#anchor` lines mark one item: a function (`#regmatch`, `#regmatch()`) or a
 * variable (`#wrap`, `#%wrap`), followed by its signature (`regmatch(s1, s2)`, `wrap=on`) and
 * an indented description that starts with its type (`(int) ...`, `(flag) ...`). Each becomes an
 * entry whose `usage` is that signature, under every anchor name (lowercased).
 */
function parseAnchors(lines: string[], entries: Map<string, HelpEntry>): void {
  let i = 0;
  while (i < lines.length) {
    if (!/^#\S/.test(lines[i] as string)) {
      i += 1;
      continue;
    }
    const names: string[] = [];
    while (i < lines.length && /^#\S/.test(lines[i] as string)) {
      names.push((lines[i] as string).slice(1).trim().toLowerCase());
      i += 1;
    }
    while (i < lines.length && (lines[i] as string).trim() === "") i += 1;
    // Signature lines sit two columns in, the description ten: substr() has two signatures.
    const signatures: string[] = [];
    while (i < lines.length && /^ {1,4}\S/.test(lines[i] as string)) {
      signatures.push((lines[i] as string).trim());
      i += 1;
    }
    const description: string[] = [];
    while (i < lines.length && (lines[i] as string).trim() !== "" && !/^[#&]/.test(lines[i] as string)) {
      description.push((lines[i] as string).trim());
      i += 1;
    }
    // An anchor followed by anything else (a page heading) documents no single item.
    if (signatures.length === 0 || description.length === 0) continue;
    const entry = { usage: signatures, summary: description.join(" ").replace(/\s+/g, " ").trim() };
    for (const name of names) if (!entries.has(name)) entries.set(name, entry);
  }
}

/**
 * Help entries keyed by lowercase topic: pages by their `&` names (`/let`, `/unlimit`), and
 * the functions and variables documented inside pages by their `#` anchors (`regmatch()`,
 * `%wrap`). A page name wins over an anchor of the same name.
 */
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
  parseAnchors(lines, entries);
  return entries;
}
