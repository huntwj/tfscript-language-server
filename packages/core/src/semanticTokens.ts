import { isCommentLine, splitRawLines } from "./logicalEntries";
import { RESERVED_MACRO_NAMES } from "./data/commands";
import { tablesFor } from "./data/tables";
import { findUsages, type NavContext } from "./navigation";
import { getDocumentSymbols } from "./symbols";

/**
 * Semantic tokens: colour by what a name resolves to, which the TextMate grammar can only
 * guess at from a fixed list of names.
 *  - `/name` calls: a control-flow keyword (`keyword`); one of your macros on the load path
 *    (`function`); a tf command or library macro (`function` + `defaultLibrary`). A name
 *    defined nowhere gets no token, so the grammar's own colour stays.
 *  - `/def` names: `function` + `declaration`.
 *  - `${name}` / `$name`: `macro`, resolved the same way.
 *  - `%{1}`, `%*`, `%{-L}`, `%{P2}`... (tf's positional and special selectors): `parameter`;
 *    `%{name}` / `%name`: `variable`. The variable named by `/set`, `/let` and `/setenv`
 *    is a `variable` + `declaration`, and the one `/unset` names a `variable`.
 *
 * Keywords win over macros: tf compiles a keyword before it looks for a command
 * (expand.c's keyword_parse()), and refuses to define a macro with a keyword's name
 * (macro.c: "is a reserved word").
 */

export const TOKEN_TYPES = ["function", "macro", "keyword", "variable", "parameter"] as const;
export const TOKEN_MODIFIERS = ["declaration", "defaultLibrary"] as const;

type TokenType = (typeof TOKEN_TYPES)[number];
type TokenModifier = (typeof TOKEN_MODIFIERS)[number];

export interface SemanticToken {
  line: number;
  character: number;
  length: number;
  type: TokenType;
  modifiers: TokenModifier[];
}

/** The keyword-table entries that are control flow; /let, /set, /test and the rest read as commands. */
const CONTROL_FLOW = new Set(["if", "then", "else", "elseif", "endif", "while", "do", "done", "break", "return", "result", "exit"]);

// tf's selectors (htmldoc/topics/substitution.html): 0/1/2..., #, *, ?, -1/-2..., L/L1...,
// -L/-L1..., Pn, R. Anything else that is a name is a variable.
const SELECTOR = "[A-Za-z_][A-Za-z0-9_]*|[#?*]|[0-9]+|-(?:L[0-9]*|[0-9]+)";
const PERCENT_RE = new RegExp(`(?<!%)%(\\{)?(${SELECTOR})`, "g");
const POSITIONAL_RE = /^(?:[0-9]+|[#?*]|-[0-9]+|-?L[0-9]*|P[0-9]+|R)$/;
const ASSIGN_RE = /^\s+([A-Za-z_][A-Za-z0-9_]*)/;

export function getSemanticTokens(text: string, ctx?: NavContext): SemanticToken[] {
  const symbols = getDocumentSymbols(text);
  const user = new Set<string>();
  const library = new Set<string>();
  for (const s of symbols) if (s.kind === "def") user.add(s.name.toLowerCase());
  for (const r of RESERVED_MACRO_NAMES) user.delete(r);
  for (const m of ctx?.macros ?? []) {
    if (!m.loaded) continue;
    (m.library ? library : user).add(m.symbol.name.toLowerCase());
  }

  const tokens: SemanticToken[] = [];
  const add = (line: number, character: number, length: number, type: TokenType, ...modifiers: TokenModifier[]): void => {
    if (length > 0) tokens.push({ line, character, length, type, modifiers });
  };

  const lines = splitRawLines(text);
  const commands = tablesFor(ctx?.tfBuild).commandSources;
  for (const u of findUsages(text)) {
    const key = u.name.toLowerCase();
    const source = commands.get(key);
    const { line, character } = u.range.start;
    const length = u.name.length;
    if (u.kind === "substitution") {
      if (user.has(key)) add(line, character, length, "macro");
      else if (library.has(key) || source === "stdlib") add(line, character, length, "macro", "defaultLibrary");
      continue;
    }
    if (source === "keyword" && CONTROL_FLOW.has(key)) {
      add(line, character, length, "keyword");
    } else if (u.kind === "builtin-call") {
      if (source === "builtin" || source === "keyword") add(line, character, length, "function", "defaultLibrary");
    } else if (user.has(key)) {
      add(line, character, length, "function");
    } else if (source || library.has(key)) {
      add(line, character, length, "function", "defaultLibrary");
    }
    if (key === "set" || key === "let" || key === "setenv" || key === "unset") {
      const rest = (lines[line] ?? "").slice(character + length);
      const m = ASSIGN_RE.exec(rest);
      if (m) {
        const at = character + length + (m[0].length - (m[1] as string).length);
        if (key === "unset") add(line, at, (m[1] as string).length, "variable");
        else add(line, at, (m[1] as string).length, "variable", "declaration");
      }
    }
  }

  for (const s of symbols) {
    if (s.kind !== "def") continue;
    const r = s.selectionRange;
    if (r.start.line === r.end.line) add(r.start.line, r.start.character, r.end.character - r.start.character, "function", "declaration");
  }

  lines.forEach((l, line) => {
    if (isCommentLine(l)) return;
    for (const m of l.matchAll(PERCENT_RE)) {
      const sel = m[2] as string;
      // A bare %name stops at the identifier; %{...} must close (or take a -default) right after.
      if (m[1] && l[(m.index ?? 0) + m[0].length] !== "}" && l[(m.index ?? 0) + m[0].length] !== "-") continue;
      const at = (m.index ?? 0) + 1 + (m[1] ? 1 : 0);
      add(line, at, sel.length, POSITIONAL_RE.test(sel) ? "parameter" : "variable");
    }
  });

  // Sorted and non-overlapping, as the protocol's relative encoding requires: where two
  // overlap (a /def name is also scanned as text), the first one found wins.
  tokens.sort((a, b) => a.line - b.line || a.character - b.character);
  const out: SemanticToken[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.line === t.line && t.character < prev.character + prev.length) continue;
    out.push(t);
  }
  return out;
}

/** The LSP wire format: five integers per token, each position relative to the one before. */
export function encodeSemanticTokens(tokens: SemanticToken[]): number[] {
  const data: number[] = [];
  let line = 0;
  let character = 0;
  for (const t of tokens) {
    const dl = t.line - line;
    data.push(dl, dl === 0 ? t.character - character : t.character, t.length, TOKEN_TYPES.indexOf(t.type), t.modifiers.reduce((bits, m) => bits | (1 << TOKEN_MODIFIERS.indexOf(m)), 0));
    line = t.line;
    character = t.character;
  }
  return data;
}
