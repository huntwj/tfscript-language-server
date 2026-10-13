import { functionSynopses } from "./completions";
import { FUNCTIONS } from "./data/functions.generated";
import { SELECTORS } from "./data/selectors";
import type { TfVariable } from "./data/types";
import { SPECIAL_VARIABLES } from "./data/variables.generated";
import { cursorContext, textBefore } from "./expressions";
import { isCommentLine, splitRawLines } from "./logicalEntries";
import type { Position, Range } from "./symbols";
import type { HelpEntry } from "./workspace/tfHelp";

/**
 * Hover for the parts of a script that aren't macro names: a tf function called in an
 * expression (`strlen(`), a tf special variable (`%{wrap}`, `%wrap`, or `wrap` in an
 * expression), and a `%{...}` selector (`%{P1}`, `%{-L}`). The synopsis and type come from the
 * tables shipped here; the description from the installed tf-help when there is one.
 */

/**
 * tf-help's entry for function `name`: its `#name()` anchor. `echo()` and `addworld()` are
 * also the names of the /echo and /addworld command pages, which win in tf-help's lookup; a
 * page whose usage is a `/command` describes the command, not the function, so it is skipped.
 */
export function functionHelpEntry(name: string, help: ReadonlyMap<string, HelpEntry> | undefined): HelpEntry | undefined {
  const entry = help?.get(`${name.toLowerCase()}()`);
  return entry && !entry.usage[0]?.startsWith("/") ? entry : undefined;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
}

function code(lines: string[]): string {
  return "```tf\n" + lines.join("\n") + "\n```";
}

function variableHover(v: TfVariable, help: ReadonlyMap<string, HelpEntry> | undefined): string {
  const entry = help?.get(`%${v.name.toLowerCase()}`);
  const parts = [code(entry?.usage.length ? entry.usage : [`${v.name}${v.default !== undefined ? `=${v.default}` : ""}`])];
  if (entry?.summary) parts.push(escapeMarkdown(entry.summary));
  const facts = [`tf ${v.type} variable`];
  if (v.values) facts.push(`values: ${v.values.map((x) => `\`${x}\``).join(", ")}`);
  if (v.requires) facts.push(`only with ${v.requires}`);
  parts.push(`${facts.join(" — ")} — \`/help %${v.name}\``);
  return parts.join("\n\n");
}

const WORD_RE = /[A-Za-z0-9_#*?-]/;

export function getExpressionHover(
  text: string,
  pos: Position,
  help?: ReadonlyMap<string, HelpEntry>,
): { markdown: string; range: Range } | undefined {
  const line = splitRawLines(text)[pos.line] ?? "";
  if (isCommentLine(line)) return undefined;
  let start = pos.character;
  let end = pos.character;
  while (start > 0 && WORD_RE.test(line[start - 1] as string)) start -= 1;
  while (end < line.length && WORD_RE.test(line[end] as string)) end += 1;
  const word = line.slice(start, end);
  if (!word) return undefined;
  const range = { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } };

  // %{name} or %name: a selector or a special variable.
  const percent = /(?<!%)(?:%%)*%\{?$/.test(line.slice(0, start));
  if (percent) {
    const selector = SELECTORS.find((s) => s.label === word) ?? (/^P\d+$/.test(word) ? SELECTORS.find((s) => s.label === "P0") : undefined)
      ?? (/^-?L\d+$/.test(word) ? SELECTORS.find((s) => s.label === (word.startsWith("-") ? "-L" : "L")) : undefined)
      ?? (/^-?\d+$/.test(word) ? SELECTORS.find((s) => s.label === (word.startsWith("-") ? "-1" : "1")) : undefined);
    if (selector) return { markdown: `${code([`%{${word}}`])}\n\n${selector.detail}`, range };
    const v = SPECIAL_VARIABLES.find((s) => s.name === word);
    return v ? { markdown: variableHover(v, help), range } : undefined;
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(word)) return undefined;
  const before = textBefore(text, { line: pos.line, character: start });
  const kind = before === undefined ? "none" : cursorContext(before).kind;
  if (kind === "variable-name") {
    const v = SPECIAL_VARIABLES.find((s) => s.name === word);
    return v ? { markdown: variableHover(v, help), range } : undefined;
  }
  if (kind !== "expression") return undefined;

  if (/^\s*\(/.test(line.slice(end))) {
    const f = FUNCTIONS.find((fn) => fn.name === word.toLowerCase());
    if (!f) return undefined;
    const entry = functionHelpEntry(f.name, help);
    const parts = [code(entry?.usage.length ? entry.usage : functionSynopses(f))];
    if (entry?.summary) parts.push(escapeMarkdown(entry.summary));
    const counts = f.max === null ? `${f.min} or more arguments` : f.min === f.max ? `${f.min} argument${f.min === 1 ? "" : "s"}` : `${f.min} to ${f.max} arguments`;
    parts.push(`tf function, ${counts}${f.requires ? `, only with ${f.requires}` : ""} — \`/help ${f.name}()\``);
    return { markdown: parts.join("\n\n"), range };
  }
  const v = SPECIAL_VARIABLES.find((s) => s.name === word);
  return v ? { markdown: variableHover(v, help), range } : undefined;
}
