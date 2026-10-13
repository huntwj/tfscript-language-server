import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTfHelp } from "../src/workspace/tfHelp";

const B = "\x1b[1m";
const U = "\x1b[4m";
const R = "\x1b[22;0m";
const UR = "\x1b[24m";

// Written for this test in tf-help's format, not copied from it.
const SAMPLE = [
  "&/widget",
  "",
  "/widget",
  "",
  "  Usage: ",
  "",
  `  ${B}/WIDGET${R} [-x] <${U}thing${UR}>`,
  "  ____________________________________________________________________________",
  "",
  `  Makes a ${B}widget${R} out of <${U}thing${UR}>,`,
  "  wrapped across two lines.",
  "",
  "  A second paragraph that hover leaves out.",
  "",
  "&/gizmo",
  "&/ungizmo",
  "",
  "/gizmo",
  "",
  "  Function usage: ",
  "",
  "  GIZMO(<n>)",
  "",
  "  Command usage: ",
  "",
  `  ${B}/GIZMO${R} <n>`,
  `  ${B}/UNGIZMO${R}`,
  "  ____________________________________________________________________________",
  "",
  "  Gizmo things.",
  "",
  "&widgets",
  "",
  "  A topic, not a command.",
  "",
].join("\n");

describe("parseTfHelp", () => {
  const help = parseTfHelp(SAMPLE);

  it("reads usage lines without ANSI codes, command words lowercased, title line excluded", () => {
    expect(help.get("/widget")?.usage).toEqual(["/widget [-x] <thing>"]);
  });

  it("unwraps the first description paragraph only", () => {
    expect(help.get("/widget")?.summary).toBe("Makes a widget out of <thing>, wrapped across two lines.");
  });

  it("files one page under every topic it names, and skips function-usage lines", () => {
    expect(help.get("/ungizmo")).toBe(help.get("/gizmo"));
    expect(help.get("/gizmo")?.usage).toEqual(["/gizmo <n>", "/ungizmo"]);
  });

  it("keeps non-command topics too, with no usage", () => {
    expect(help.get("widgets")).toEqual({ usage: [], summary: "A topic, not a command." });
  });
});

const TF_HELP = join(__dirname, "..", "..", "tinyfugue", "lib", "tf", "tf-help");
(existsSync(TF_HELP) ? describe : describe.skip)("parseTfHelp on the real tf-help (sibling checkout)", () => {
  it("finds a usage and summary for /let and /echo", () => {
    const help = parseTfHelp(readFileSync(TF_HELP, "utf8"));
    for (const name of ["/let", "/echo", "/alias"]) {
      expect(help.get(name)?.usage.length, name).toBeGreaterThan(0);
      expect(help.get(name)?.summary, name).not.toBe("");
    }
  });

  it("finds functions and variables by their # anchors, with every signature", () => {
    const help = parseTfHelp(readFileSync(TF_HELP, "utf8"));
    expect(help.get("regmatch()")?.usage).toEqual(["regmatch(s1, s2)"]);
    expect(help.get("regmatch()")?.summary).toMatch(/^\(int\) /);
    expect(help.get("substr()")?.usage).toEqual(["substr(s, i1)", "substr(s, i1, i2)"]);
    expect(help.get("%wrap")).toMatchObject({ usage: ["wrap=on"] });
    expect(help.get("%wrap")?.summary).toMatch(/^\(flag\) /);
  });
});

describe("parseTfHelp # anchors", () => {
  const text = [
    "&functions",
    "Functions",
    "#strlen",
    "#strlen()",
    "  \x1b[1mstrlen\x1b[22m(\x1b[4ms\x1b[24m) ",
    "          (int) Length of string",
    "          <s>.",
    "#%{PL}",
    " Regexp subexpressions.",
    "#wrap",
    "#%wrap",
    "  wrap=on ",
    "          (flag) Wrap lines.",
    "",
  ].join("\n");

  it("reads the signature lines and the description under each anchor name", () => {
    const help = parseTfHelp(text);
    expect(help.get("strlen()")).toEqual({ usage: ["strlen(s)"], summary: "(int) Length of string <s>." });
    expect(help.get("strlen")).toBe(help.get("strlen()"));
    expect(help.get("%wrap")).toEqual({ usage: ["wrap=on"], summary: "(flag) Wrap lines." });
  });

  it("skips an anchor that heads a section rather than one item", () => {
    expect(parseTfHelp(text).has("%{pl}")).toBe(false);
  });
});
