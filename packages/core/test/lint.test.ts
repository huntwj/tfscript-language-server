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
