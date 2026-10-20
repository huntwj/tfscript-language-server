import { describe, expect, it } from "vitest";
import { getDiagnostics, LINT_CODES, quietInTf, type TfDiagnostic } from "../src/diagnostics";

/** The lint tier (rule table section L1); its cases in ~/ai/mud/tests/tfscript/cases are lint-*.tf. */
const lint = (text: string, code?: string): TfDiagnostic[] => getDiagnostics(text).filter((d) => (code ? d.code === code : LINT_CODES.has(d.code)));
const at = (d: TfDiagnostic | undefined) => d && `${d.range.start.line}:${d.range.start.character}-${d.range.end.character}`;
const fixed = (text: string, d: TfDiagnostic | undefined): string | undefined => {
  const e = d?.fix?.edits[0];
  if (!e) return undefined;
  const lines = text.split("\n");
  const line = lines[e.range.start.line] as string;
  lines[e.range.start.line] = line.slice(0, e.range.start.character) + e.newText + line.slice(e.range.end.character);
  return lines.join("\n");
};

describe("empty-macro-body", () => {
  it("flags a plain /def with nothing after its =, at the =", () => {
    const [d] = lint("/def -i idle =\n", "empty-macro-body");
    expect(d?.message).toBe(
      "This macro's body is empty, so running it sends a blank line to the world: give it a body, or put ; tflint:ignore-nextline on the line before if that is what you want.",
    );
    expect(at(d)).toBe("0:13-14");
    expect(lint("/def idle =   \n", "empty-macro-body")).toHaveLength(1);
  });

  it("leaves a trigger, hook or key binding alone, which sends nothing when it fires, and a /def tf refuses", () => {
    for (const text of ["/def -ag -t'spam' gag_spam =\n", "/def -hCONNECT on_connect =\n", "/def -b'^X' key_x =\n", "/def -i -mglob -t'x*' t =\n"]) {
      expect(lint(text, "empty-macro-body"), text).toEqual([]);
    }
    expect(lint("/def if =\n", "empty-macro-body")).toEqual([]);
    expect(lint("/def idle = /echo hi\n", "empty-macro-body")).toEqual([]);
  });
});

it("leaves bare text in a body alone, tf's own idiom (the skill says to write /send -h in new code)", () => {
  expect(lint("/def go = /echo a%; kill %{target}%; /if (x) change mood brave%; /endif\n")).toEqual([]);
});

describe("set-writes-global (case set-writes-global-over-local)", () => {
  const set = (text: string, localPrefix?: string) =>
    getDiagnostics(text, localPrefix ? { localPrefix } : {}).filter((d) => d.code === "set-writes-global");

  it("flags a /set of a name the macro made local with /let before it, and writes /let", () => {
    const text = "/def reader = /let n=%; /set n=5%; /echo %n\n";
    const [d] = set(text);
    expect(d?.message).toBe(
      "This /set writes the global n, not the local this macro made with /let, which its own reads go on seeing: write /let n=... to change the local, or put ; tflint:ignore-nextline on the line before if the global is meant.",
    );
    expect(fixed(text, d)).toBe("/def reader = /let n=%; /let n=5%; /echo %n\n");
  });

  it("leaves a /set of a global alone, and one before the /let, and offers no fix for /set name value", () => {
    expect(set("/def g = /set wotmud_target=orc\n")).toEqual([]);
    expect(set("/def g = /set n=1%; /let n=2\n")).toEqual([]);
    expect(set("/def g = /let n=%; /set n 5\n")[0]?.fix).toBeUndefined();
  });

  it("with a local prefix, flags a /set of a name that starts with it", () => {
    expect(set("/def g = /set _tmp=1\n")).toEqual([]);
    const [d] = set("/def g = /set _tmp=1\n", "_");
    expect(d?.message).toMatch(/^This \/set writes the global _tmp, though names starting with _ are locals in this project/);
    expect(set("/def g = /set tmp=1\n", "_")).toEqual([]);
  });
});

describe("tfread-without-let (case tfread-writes-global-without-let)", () => {
  const reads = (text: string, localPrefix?: string) =>
    getDiagnostics(text, localPrefix ? { localPrefix } : {}).filter((d) => d.code === "tfread-without-let");
  // tf's own kv-textlog.tf, before its fix: _l was left behind as a global.
  const kv = '/def scan = /let _h=$[tfopen("x", "r")]%; /while (tfread(_h, _l) >= 0) /echo %{_l}%; /done\n';

  it("notes a tfread into a name with no /let before it, and puts the /let before its statement", () => {
    const [d] = reads(kv);
    expect(d?.severity).toBe("information");
    expect(kv.slice(d?.range.start.character, d?.range.end.character)).toBe("_l");
    expect(fixed(kv, d)).toBe('/def scan = /let _h=$[tfopen("x", "r")]%; /let _l=%; /while (tfread(_h, _l) >= 0) /echo %{_l}%; /done\n');
  });

  it("is a warning for a name with the project's local prefix, and leaves a /let one or a nested /def's alone", () => {
    expect(reads(kv, "_")[0]?.severity).toBe("warning");
    expect(reads('/def ok = /let _l=%; /test tfread(h, _l)\n')).toEqual([]);
    expect(reads("/def outer = /def -i inner = /test tfread(h, x)\n")).toEqual([]);
    expect(reads("/def one = /test tfread(line)\n")).toHaveLength(1);
  });
});

describe("assign-writes-global", () => {
  const assigns = (text: string, localPrefix?: string, tfBuild?: "upstream" | "fork") =>
    getDiagnostics(text, { ...(localPrefix ? { localPrefix } : {}), ...(tfBuild ? { tfBuild } : {}) }).filter((d) => d.code === "assign-writes-global");

  it("with a local prefix, flags an assignment to such a name with no /let, and puts the /let before its statement", () => {
    const text = "/def count = /test _n := _n + 1%; /echo %_n\n";
    const [d, more] = assigns(text, "_");
    expect(more).toBeUndefined();
    expect(d?.severity).toBe("warning");
    expect(d?.message).toBe(
      "This assignment writes the global _n, as the macro has no local of that name, though names starting with _ are locals in this project: put /let _n= before it, or put ; tflint:ignore-nextline on the line before if the global is meant.",
    );
    expect(text.slice(d?.range.start.character, d?.range.end.character)).toBe("_n");
    expect(fixed(text, d)).toBe("/def count = /let _n=%; /test _n := _n + 1%; /echo %_n\n");
    expect(assigns("/def c = /test ++_i\n", "_")).toHaveLength(1);
    expect(assigns("/def c = /while (_i += 1) /done\n", "_")).toHaveLength(1);
  });

  it("finds the name on its own line of a body laid out over several", () => {
    const text = "/def count = \\\n    /echo a%;\\\n    /test _n := 1\n";
    const [d] = assigns(text, "_");
    expect(d?.range.start).toEqual({ line: 2, character: 10 });
    expect(fixed(text, d)).toBe("/def count = \\\n    /echo a%;\\\n    /let _n=%; /test _n := 1\n");
  });

  it("leaves alone a name the macro /lets first, one without the prefix, no prefix, the fork, and a nested /def", () => {
    expect(assigns("/def c = /let _n=0%; /test _n := _n + 1\n", "_")).toEqual([]);
    expect(assigns("/def c = /test wotmud_n := 1\n", "_")).toEqual([]);
    expect(assigns("/def c = /test _n := 1\n")).toEqual([]);
    expect(assigns("/def c = /test _n := 1\n", "_", "fork")).toEqual([]);
    expect(assigns("/def c = /test _n := 1\n", "_", "upstream")).toHaveLength(1);
    expect(assigns("/def outer = /def -i inner = /test _n := 1\n", "_")).toEqual([]);
    expect(assigns("/test _n := 1\n", "_")).toEqual([]);
  });

  it("is turned off by the ignore comment", () => {
    expect(assigns("; tflint:ignore-nextline assign-writes-global\n/def c = /test _n := 1\n", "_")).toEqual([]);
  });
});

describe("missing-slash", () => {
  const slash = (text: string, projectMacro?: (name: string) => boolean) =>
    getDiagnostics(text, projectMacro ? { projectMacro } : {}).filter((d) => d.code === "missing-slash");

  it("flags a body statement that starts with a tf-only command word and no slash, and writes the slash", () => {
    const text = "/def greet = echo hi%; /send -h hello\n";
    const [d, more] = slash(text);
    expect(more).toBeUndefined();
    expect(d?.severity).toBe("warning");
    expect(d?.message).toBe(
      'This line sends "echo" to the world as text, with no / before it: write /echo to run tf\'s command, or put ; tflint:ignore-nextline on the line before if the text is meant.',
    );
    expect(fixed(text, d)).toBe("/def greet = /echo hi%; /send -h hello\n");
    expect(slash("/def g = /if (x) let y=1%; /endif\n")).toHaveLength(1);
  });

  it("flags a macro the file or the project defines, and leaves MUD and shell words, library macros and text alone", () => {
    expect(slash("/def heal = cast 'heal'\n/def go = heal\n").map((d) => d.message)).toEqual([
      'This line sends "heal" to the world as text, with no / before it: write /heal to run the macro, or put ; tflint:ignore-nextline on the line before if the text is meant.',
    ]);
    expect(slash("/def go = buff me\n", (n) => n === "buff")).toHaveLength(1);
    for (const text of ["/def t = kill %{target}\n", "/def t = rest\n", "/def t = cat x; echo DONE\n", "/def t = alias x y\n", "/def t = say hi\n", "/def t = echoes\n"]) {
      expect(slash(text), text).toEqual([]);
    }
    expect(slash("/def heal = cast 'heal'\n")).toEqual([]);
  });

  it("is turned off by the ignore comment", () => {
    expect(slash("; tflint:ignore-nextline missing-slash\n/def t = echo hi\n")).toEqual([]);
  });
});

describe("load-of-library-file", () => {
  it("flags a top-level /load of a library file that runs /loaded, and writes /require", () => {
    const [d] = lint("/load alias.tf\n", "load-of-library-file");
    expect(d?.message).toBe(
      "alias.tf is one of tf's library files, so /require loads it only if it isn't loaded yet: write /require, or put ; tflint:ignore-nextline on the line before if loading it again is the point.",
    );
    expect(fixed("/load alias.tf\n", d)).toBe("/require alias.tf\n");
    expect(fixed("/load -q alias.tf\n", lint("/load -q alias.tf\n", "load-of-library-file")[0])).toBe("/require -q alias.tf\n");
  });

  it("leaves a file without /loaded, a path and a file that isn't tf's alone", () => {
    for (const text of ["/load stdlib.tf\n", "/load lib/alias.tf\n", "/load mine.tf\n", "/require alias.tf\n"]) {
      expect(lint(text, "load-of-library-file"), text).toEqual([]);
    }
  });
});

describe("tflint:ignore-nextline", () => {
  it("turns off every lint warning on the line after it", () => {
    expect(lint("; tflint:ignore-nextline\n/def idle =\n")).toEqual([]);
    expect(lint("# tflint:ignore-nextline because it's meant\n/load alias.tf\n")).toEqual([]);
    expect(lint("; tflint:ignore-nextline\n\n/def idle =\n")).toHaveLength(1);
  });

  it("with codes after it, only those", () => {
    expect(lint("; tflint:ignore-nextline load-of-library-file\n/def idle =\n").map((d) => d.code)).toEqual(["empty-macro-body"]);
    expect(lint("; tflint:ignore-nextline load-of-library-file, empty-macro-body\n/def idle =\n")).toEqual([]);
  });

  it("leaves other diagnostics as they are", () => {
    expect(getDiagnostics("; tflint:ignore-nextline\n/def if = /echo x\n").map((d) => d.code)).toContain("invalid-macro-name");
  });
});

it("counts the lint tier as quiet in tf: a file it flags still loads clean", () => {
  for (const d of [...lint("/def idle =\n"), ...lint("/load alias.tf\n")]) expect(quietInTf(d), d.code).toBe(true);
});
