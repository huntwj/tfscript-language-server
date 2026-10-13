import { COMMAND_DESCRIPTIONS } from "./data/commandDescriptions";
import { COMMAND_USAGES } from "./data/commandUsages.generated";
import { isCommentLine, splitLogicalEntries, splitRawLines } from "./logicalEntries";
import { CALL_RE, COMMANDS, definitionsOf, docCommentAbove, type Def, type NavContext } from "./navigation";
import { getDocumentSymbols, type Position } from "./symbols";

/**
 * Signature help: while you type a command's arguments, the command's usage synopsis with the
 * argument under the cursor highlighted.
 *
 * Synopses come from the same places hover's do — the installed tf-help, else the htmldoc
 * extraction shipped here — and, for a macro, from a `;;;` line directly above its `/def` that
 * starts with `/name` (`;;; /greet <name>`). A macro you defined with no such line shows
 * nothing, even when it shadows a built-in: the built-in's synopsis would be wrong for it.
 *
 * Matching typed words to a synopsis is a heuristic, not tf's parser: words starting with `-`
 * before the first other word are options (tf's getopts() stops at the first non-option or at
 * `--`), and are matched to the bracketed option group that names their letter; the rest are
 * positional, in order, with the last positional parameter taking everything left over (`text`,
 * `commands`, `pid...`). A word starting with `=` — or containing one, for a command whose
 * synopsis has an `= body` part — moves to that part.
 */

export interface TfSignature {
  label: string;
  /** Each parameter as [start, end) offsets into `label`. */
  parameters: [number, number][];
  documentation?: string;
}

export interface TfSignatureHelp {
  signatures: TfSignature[];
  activeSignature: number;
  activeParameter: number;
}

interface Param {
  text: string;
  start: number;
  end: number;
  kind: "option" | "positional" | "eq";
  /** For an option group, its inner text without the outer brackets (`-aattrs`). */
  inner: string;
}

const BRACKET_OPEN = "[(";
const BRACKET_CLOSE = "])";

/** Splits a synopsis line after its command name into parameters at bracket depth 0. */
export function parseSynopsis(label: string): Param[] {
  const nameEnd = label.search(/\s|$/);
  const raw: { text: string; start: number; end: number }[] = [];
  let depth = 0;
  let start = -1;
  for (let i = nameEnd; i <= label.length; i += 1) {
    const ch = label[i];
    const space = ch === undefined || /\s/.test(ch);
    if (space && depth === 0) {
      if (start >= 0) raw.push({ text: label.slice(start, i), start, end: i });
      start = -1;
      continue;
    }
    if (start < 0) start = i;
    if (BRACKET_OPEN.includes(ch as string)) depth += 1;
    else if (BRACKET_CLOSE.includes(ch as string)) depth = Math.max(0, depth - 1);
  }
  // `sequence = command`: the bare `=` belongs to what follows it.
  const merged: typeof raw = [];
  for (let i = 0; i < raw.length; i += 1) {
    const t = raw[i] as (typeof raw)[number];
    const next = raw[i + 1];
    if (t.text === "=" && next) {
      merged.push({ text: label.slice(t.start, next.end), start: t.start, end: next.end });
      i += 1;
    } else {
      merged.push(t);
    }
  }
  return merged.map((t) => {
    const inner = t.text.startsWith("[") && t.text.endsWith("]") ? t.text.slice(1, -1) : t.text;
    const kind = inner.startsWith("=") ? "eq" : inner.startsWith("-") || /^(?:macro-)?options$/.test(inner) ? "option" : "positional";
    return { ...t, kind, inner };
  });
}

interface Word {
  text: string;
  /** The word the cursor is in (or right after), as opposed to one already finished. */
  current: boolean;
}

/**
 * The words typed so far, splitting on whitespace except inside quotes (`-t"a b"`) or a
 * parenthesised expression a word starts with (`/if (a == b)`).
 */
function splitWords(args: string): Word[] {
  const words: string[] = [];
  let word = "";
  let quote = "";
  let parens = 0;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i] as string;
    if (quote) {
      word += ch;
      if (ch === "\\") word += args[++i] ?? "";
      else if (ch === quote) quote = "";
      continue;
    }
    if (/\s/.test(ch) && parens === 0) {
      if (word) words.push(word);
      word = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" && (word === "" || parens > 0)) parens += 1;
    else if (ch === ")" && parens > 0) parens -= 1;
    word += ch;
  }
  const result = words.map((text) => ({ text, current: false }));
  // The cursor is in the last word unless whitespace follows it, in which case it starts a new one.
  if (word) result.push({ text: word, current: true });
  else result.push({ text: "", current: true });
  return result;
}

function optionParamFor(word: string, params: Param[]): number {
  const letter = word[1] ?? "";
  const options = params.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === "option");
  const match =
    options.find(({ p }) => p.inner[1] === letter) ??
    options.find(({ p }) => p.inner.startsWith("-") && p.inner.slice(1).includes(letter)) ??
    options.find(({ p }) => !p.inner.startsWith("-")) ??
    options[0];
  return match ? match.i : -1;
}

/** The highlighted parameter, and how many positional words the synopsis has no room for. */
function activeParam(words: Word[], params: Param[]): { index: number; overflow: number } {
  const positional = params.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === "positional");
  const eq = params.findIndex((p) => p.kind === "eq");
  let optionsDone = false;
  let pos = 0;
  let inBody = false;
  let index = -1;
  for (const w of words) {
    const at = (n: number): number => (positional[Math.min(n, positional.length - 1)]?.i ?? -1);
    if (inBody) {
      index = eq;
      continue;
    }
    if (!optionsDone && w.text === "--") {
      optionsDone = true;
      index = -1;
      continue;
    }
    if (!optionsDone && w.text.length > 1 && w.text.startsWith("-")) {
      index = optionParamFor(w.text, params);
      continue;
    }
    if (w.text === "" && w.current) {
      // A new word: the next positional parameter, or the `= body` once those are used up.
      index = pos >= positional.length && eq >= 0 ? eq : at(pos);
      if (pos >= positional.length && eq < 0) pos += 1;
      continue;
    }
    optionsDone = true;
    if (eq >= 0 && w.text.startsWith("=")) {
      inBody = true;
      index = eq;
      continue;
    }
    if (eq >= 0 && w.text.includes("=")) {
      inBody = true;
      index = w.current ? eq : at(pos);
      pos += 1;
      continue;
    }
    index = at(pos);
    pos += 1;
  }
  const overflow = Math.max(0, pos - positional.length);
  return { index, overflow };
}

interface CommandAt {
  name: string;
  builtin: boolean;
  args: string;
}

// After these, the next word is a command of its own: the start of a statement, a `/def`-like
// `= body`, a control-flow keyword, or the `(expr)` of `/if (expr) command`.
const COMMAND_START_RE = /(?:^\s*|=\s*|\)\s*|\/@?(?:if|then|else|elseif|while|do)\s+)$/i;

/** The command whose arguments the cursor is in, from the start of its statement. */
function commandAt(text: string, pos: Position): CommandAt | undefined {
  const lines = splitRawLines(text);
  if (isCommentLine(lines[pos.line] ?? "")) return undefined;
  const entry = splitLogicalEntries(text).find((e) => e.startLine <= pos.line && pos.line <= e.endLine);
  if (!entry) return undefined;
  const offset = entry.offsetMap.filter((m) => m.line < pos.line || (m.line === pos.line && m.character < pos.character)).length;
  const before = entry.text.slice(0, offset);
  const segStart = Math.max(before.lastIndexOf("%;"), before.lastIndexOf("%|"));
  const seg = segStart >= 0 ? before.slice(segStart + 2) : before;

  let found: CommandAt | undefined;
  for (const m of seg.matchAll(CALL_RE)) {
    const slash = (m.index ?? 0) + (m[1] as string).length;
    if (!COMMAND_START_RE.test(seg.slice(0, slash))) continue;
    const nameEnd = slash + 1 + (m[2] as string).length + (m[3] as string).length + (m[4] as string).length;
    // Still typing the name itself: nothing to help with yet.
    if (nameEnd >= seg.length) return found;
    found = { name: m[4] as string, builtin: m[2] === "@", args: seg.slice(nameEnd) };
  }
  return found;
}

function macroSignatures(name: string, defs: Def[]): TfSignature[] {
  const head = new RegExp(`^/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i");
  const sigs: TfSignature[] = [];
  for (const d of defs) {
    const doc = docCommentAbove(d.lines, d.symbol.range.start.line);
    const [first, ...rest] = (doc ?? "").split("\n");
    if (!first || !head.test(first)) continue;
    // `;;; /map <dir>		Add <dir> to remembered path.`: a tab or a run of spaces ends the synopsis.
    const label = first.split(/\t| {2,}/)[0]?.trim() ?? first;
    const more = [first.slice(label.length).trim(), ...rest.map((l) => l.trim())].filter(Boolean).join("\n");
    sigs.push(toSignature(label, more || undefined));
  }
  return sigs;
}

function toSignature(label: string, documentation?: string): TfSignature {
  return {
    label,
    parameters: parseSynopsis(label).map((p) => [p.start, p.end] as [number, number]),
    ...(documentation ? { documentation } : {}),
  };
}

function commandSignatures(name: string, ctx?: NavContext): TfSignature[] {
  const key = name.toLowerCase();
  const entry = ctx?.help?.get(`/${key}`);
  const usages = entry && entry.usage.length > 0 ? entry.usage : COMMAND_USAGES[key];
  if (!usages) return [];
  const description = COMMAND_DESCRIPTIONS[key] || entry?.summary || undefined;
  return usages.map((u) => toSignature(u, description));
}

export function getSignatureHelp(text: string, pos: Position, ctx?: NavContext): TfSignatureHelp | undefined {
  const call = commandAt(text, pos);
  if (!call) return undefined;

  let signatures: TfSignature[];
  if (call.builtin) {
    const source = COMMANDS.get(call.name.toLowerCase());
    signatures = source === "builtin" || source === "keyword" ? commandSignatures(call.name, ctx) : [];
  } else {
    const defs = definitionsOf(call.name, text, getDocumentSymbols(text), ctx);
    const user = defs.filter((d) => d.loaded && !d.library);
    if (user.length > 0) {
      signatures = macroSignatures(call.name, user);
    } else {
      signatures = commandSignatures(call.name, ctx);
      if (signatures.length === 0) signatures = macroSignatures(call.name, defs);
    }
  }
  if (signatures.length === 0) return undefined;

  const words = splitWords(call.args);
  const fits = signatures.map((s) => activeParam(words, parseSynopsis(s.label)));
  let best = 0;
  fits.forEach((f, i) => {
    if (f.overflow < (fits[best] as (typeof fits)[number]).overflow) best = i;
  });
  return { signatures, activeSignature: best, activeParameter: (fits[best] as (typeof fits)[number]).index };
}
