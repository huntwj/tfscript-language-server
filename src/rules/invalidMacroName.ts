import { RESERVED_MACRO_NAMES } from "../data/commands";
import { code, commandParts } from "../structure";
import { defOptionsEnd } from "../symbols";
import type { EntryMatch, EntryRule } from "./types";

/** `/def`, `/!def` (the `!` only negates the result) or `/@def`; `/@@def` asks for a builtin `@def`, which isn't one. */
const DEF_PREFIX_RE = /^!*@?$/;

/**
 * A top-level `/def` whose name tf refuses (`complete_macro()` in macro.c), so it defines nothing:
 *  - an illegal name, starting with `#`, `@`, `!` or `/`, or holding a space ("illegal macro name");
 *    a tab counts as a space, as tf's loader turns tabs into spaces. Most often it is a `/def`
 *    with no `=`, whose whole text then becomes the name (`/def greet /echo hi`);
 *  - a reserved word: a keyword (the control flow, `let`, `set`, `test`, ...) or `eval`, in any
 *    case ("is a reserved word"; see RESERVED_MACRO_NAMES). Other builtins can be redefined, and
 *    tf only warns about the conflict, so they aren't flagged.
 * The name is read as `macro_spec()` reads it: everything from the end of the options to the
 * first `=`, trimmed. All proven in tf dev, 2026-10-14 (step-5 probe n1).
 */
export const invalidMacroName: EntryRule = {
  id: "invalid-macro-name",
  severity: "error",
  scope: "entry",
  check(entry): EntryMatch[] {
    const text = entry.text;
    let start = 0;
    while (text[start] === " " || text[start] === "\t") start += 1;
    const { prefix, word } = commandParts(text, start);
    if (word !== "def" || !DEF_PREFIX_RE.test(prefix)) return [];
    const after = start + 1 + prefix.length + word.length;
    if (after < text.length && text[after] !== " " && text[after] !== "\t") return [];
    const opts = defOptionsEnd(text, after);
    const eq = text.indexOf("=", opts);
    let from = opts;
    let to = eq === -1 ? text.length : eq;
    while (from < to && /\s/.test(text[from] as string)) from += 1;
    while (to > from && /\s/.test(text[to - 1] as string)) to -= 1;
    if (to === from) return [];
    const name = text.slice(from, to);
    const span = { start: from, end: to };

    if (RESERVED_MACRO_NAMES.has(name.toLowerCase())) {
      const lower = name.toLowerCase();
      const what = lower === "eval" ? "command" : "keyword";
      return [
        {
          ...span,
          message: `"${name}" is a reserved word, so tf refuses this /def and defines nothing: pick another name.`,
          label: "reserved word",
          explanation:
            `tf won't define a macro named after one of its keywords (the control flow, such as ${code("if")} and ` +
            `${code("while")}, and ${code("let")}, ${code("set")}, ${code("setenv")}, ${code("test")}, ${code("return")}, ` +
            `${code("result")} and ${code("exit")}) or ${code("eval")}. It skips the ` +
            `whole ${code("/def")} with the error ${code(`"${name}" is a reserved word.`)}, and ${code(`/${lower}`)} keeps ` +
            `meaning tf's own ${what}.`,
        },
      ];
    }

    const badStart = "#@!/".includes(name[0] as string);
    const blank = /[ \t]/.exec(name);
    if (!badStart && !blank) return [];
    const explanation =
      `tf takes a macro's name as everything between the ${code("/def")} options and the ${code("=")}, and refuses ` +
      `one that starts with ${code("#")}, ${code("@")}, ${code("!")} or ${code("/")}, or holds a space, with the error ` +
      `${code(`illegal macro name "${name.replace(/\t/g, " ")}".`)} It defines nothing.`;
    if (badStart) {
      return [
        {
          ...span,
          message: `"${name}" can't be a macro name, as it starts with ${name[0]}, so tf refuses this /def and defines nothing: pick another name.`,
          label: "illegal name",
          explanation,
        },
      ];
    }
    // A command word after the first word means the = was left out, so the command (up to an = in it) is the name.
    const first = name.slice(0, (blank as RegExpExecArray).index);
    let rest = (blank as RegExpExecArray).index;
    while (rest < name.length && (name[rest] === " " || name[rest] === "\t")) rest += 1;
    const missingEquals = name[rest] === "/" && !"#@!/".includes(first[0] as string) && !RESERVED_MACRO_NAMES.has(first.toLowerCase());
    if (missingEquals) {
      const at = from + first.length;
      return [
        {
          ...span,
          message: `This /def has no = after its name, so tf takes all of "${name}" as the name, which can't hold a space, and defines nothing: put = after ${first}.`,
          label: "no =",
          explanation,
          fix: { title: `Put = after ${first}`, edits: [{ start: at, end: at, newText: " =" }] },
        },
      ];
    }
    return [
      {
        ...span,
        message: `"${name}" can't be a macro name, as it holds ${name.includes(" ") ? "a space" : "a tab, which tf reads as a space"}, so tf refuses this /def and defines nothing: pick a name of one word.`,
        label: "illegal name",
        explanation,
      },
    ];
  },
};
