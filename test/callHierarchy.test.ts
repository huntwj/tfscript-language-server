import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { incomingCalls, outgoingCalls, prepareCallHierarchy, type TfCallItem } from "../src/callHierarchy";
import type { NavContext } from "../src/navigation";
import { getDocumentSymbols } from "../src/symbols";
import { findFunctionCalls, findMacroCalls } from "../src/variables";
import { WorkspaceIndex } from "../src/workspace/workspaceIndex";

const pos = (line: number, character: number) => ({ line, character });
const at = (line: number, character: number, length: number) => ({ start: pos(line, character), end: pos(line, character + length) });

describe("findFunctionCalls", () => {
  it("finds name(...) calls to macros in every expression tf compiles", () => {
    const text = [
      "/def -i show = /echo $[sq(3)] $[strlen(\"ab\")] $[sq (4)]",
      "/def -i cond = /if (sq(2) == 4) /echo y%; /endif",
      "/def -i tst = /test v := Sq(5)",
      "",
    ].join("\n");
    expect(findFunctionCalls(text).map((c) => `${c.name}@${c.range.start.line}:${c.range.start.character}`)).toEqual([
      "sq@0:23",
      "sq@0:48",
      "sq@1:20",
      "Sq@2:25",
    ]);
  });

  it("leaves out tf's builtin functions, getopts() included, and text that isn't an expression", () => {
    const text = '/def -i f = /test getopts("a", "")%; /echo sq(3)%; /test abs(-1) + strlen("x")\n';
    expect(findFunctionCalls(text)).toEqual([]);
  });

  it("isn't added to the /name statements", () => {
    expect(findMacroCalls("/def -i f = /test sq(1)\n").map((c) => c.name)).not.toContain("sq");
  });
});

describe("prepareCallHierarchy", () => {
  const text = ["/def -i greet = /echo hi", "/def -i main = /greet%; /@echo raw%; /echo /greet", ""].join("\n");

  it("returns the /def under the cursor", () => {
    const [item] = prepareCallHierarchy(text, pos(0, 9));
    expect(item).toMatchObject({ name: "greet", kind: "macro", selectionRange: at(0, 8, 5), detail: "/def -i" });
  });

  it("returns every /def a call under the cursor runs", () => {
    expect(prepareCallHierarchy(text, pos(1, 17)).map((i) => i.selectionRange)).toEqual([at(0, 8, 5)]);
    const twice = "/def a = 1\n/def a = 2\n/def b = /a\n";
    expect(prepareCallHierarchy(twice, pos(2, 10))).toHaveLength(2);
  });

  it("returns nothing for a builtin, an unknown macro or text that only mentions one", () => {
    expect(prepareCallHierarchy(text, pos(1, 27))).toEqual([]);
    expect(prepareCallHierarchy("/nosuch\n", pos(0, 2))).toEqual([]);
    expect(prepareCallHierarchy(text, pos(1, 44))).toEqual([]);
  });
});

describe("incomingCalls", () => {
  const uri = "file:///ws/a.tf";
  const text = [
    "/def -i greet = /echo hi",
    "/def -i main = /greet%; /greet x%; /@greet%; /echo /greet",
    "/def -i -t\"hello*\" on_hello = /if (!greet()) /echo no%; /endif",
    "/greet",
    "/def -i twice = /!greet%; /repeat -1 1 /greet%; /eval /greet",
    "",
  ].join("\n");
  const [greet] = prepareCallHierarchy(text, pos(0, 9), { uri, files: [], macros: [] }) as TfCallItem[];

  it("groups the calls by the definition they are in, or the file's top level", () => {
    const calls = incomingCalls(greet as TfCallItem, [{ uri, text }]);
    expect(calls.map((c) => [c.from.name, c.from.kind, c.fromRanges.length])).toEqual([
      ["a.tf", "file", 1],
      ["main", "macro", 2],
      ["on_hello", "macro", 1],
      ["twice", "macro", 3],
    ]);
  });

  it("finds calls in every file given, ignoring case", () => {
    const other = { uri: "file:///ws/b.tf", text: "/def -i b = /GREET\n" };
    const calls = incomingCalls(greet as TfCallItem, [{ uri, text }, other]);
    expect(calls.find((c) => c.from.uri === other.uri)).toMatchObject({ from: { name: "b" }, fromRanges: [at(0, 13, 5)] });
  });

  it("puts a trigger, hook or binding down as a caller", () => {
    const hook = "/hook CONNECT = /greet\n";
    const [call] = incomingCalls(greet as TfCallItem, [{ uri: "file:///ws/h.tf", text: hook }]);
    expect(call?.from).toMatchObject({ name: "CONNECT", kind: "trigger" });
  });
});

describe("outgoingCalls", () => {
  const uri = "file:///ws/a.tf";
  const text = [
    "/def -i greet = /echo hi",
    "/def -i greet = /echo hello",
    "/def -i main = /greet%; /greet%; /beep%; /nosuch%; /echo /greet%; /test helper(1)%; /run_%1",
    "/def -i helper = /return 1",
    "/main",
    "",
  ].join("\n");

  it("lists each /def the item's calls run, leaving out builtins, unknown names and text", () => {
    const [main] = prepareCallHierarchy(text, pos(2, 9), { uri, files: [], macros: [] }) as TfCallItem[];
    const calls = outgoingCalls(main as TfCallItem, text, { uri, files: [], macros: [] });
    expect(calls.map((c) => [c.to.name, c.to.selectionRange.start.line, c.fromRanges.length])).toEqual([
      ["greet", 0, 2],
      ["greet", 1, 2],
      ["helper", 3, 1],
    ]);
  });

  it("lists the top level's calls for a file item", () => {
    const file: TfCallItem = {
      name: "a.tf",
      kind: "file",
      uri,
      range: at(0, 0, 0),
      selectionRange: at(0, 0, 0),
      detail: "",
    };
    expect(outgoingCalls(file, text, { uri, files: [], macros: [] }).map((c) => c.to.name)).toEqual(["main"]);
  });

  it("finds a macro defined in another file on the load path, with its file", () => {
    const lib = "/def -i shared = /echo s\n";
    const ctx: NavContext = {
      uri,
      files: [],
      macros: getDocumentSymbols(lib).map((symbol) => ({
        uri: "file:///lib/stdlib.tf",
        label: "stdlib.tf",
        symbol,
        lines: [lib],
        library: true,
        loaded: true,
      })),
    };
    const caller = "/def -i x = /shared\n";
    const [x] = prepareCallHierarchy(caller, pos(0, 9), ctx) as TfCallItem[];
    const [call] = outgoingCalls(x as TfCallItem, caller, ctx);
    expect(call?.to).toMatchObject({ name: "shared", uri: "file:///lib/stdlib.tf", detail: "/def -i — stdlib.tf" });
  });
});

describe("WorkspaceIndex.callerFiles", () => {
  const ROOT = path.resolve("/fake");
  const p = (...parts: string[]) => path.join(ROOT, ...parts);
  const key = (f: string) => path.resolve(f).toLowerCase();
  const files: Record<string, string> = {
    [p("ws", "tfrc")]: "/load main.tf\n",
    [p("ws", "main.tf")]: "/def -i greet = /echo hi\n",
    [p("ws", "unloaded.tf")]: "/def -i u = /greet\n",
    [p("elsewhere", "x.tf")]: "/greet\n",
  };
  const byKey = new Map(Object.entries(files).map(([k, v]) => [key(k), v]));
  const fs = {
    readFile: (f: string) => byKey.get(key(f)),
    listTfFiles: () => [],
    walkTfFiles: (dir: string) => Object.keys(files).filter((f) => key(f).startsWith(key(dir) + path.sep)),
  };

  it("covers the load path and every script in the workspace folder, not files outside it", () => {
    const index = new WorkspaceIndex(fs, { env: {}, homedir: p("home"), exists: (f) => byKey.has(key(f)) });
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { entryFiles: ["tfrc"] });
    const uris = index.callerFiles(p("ws", "main.tf"), (f) => f).map((f) => key(f.uri));
    expect(uris.sort()).toEqual([p("ws", "main.tf"), p("ws", "tfrc"), p("ws", "unloaded.tf")].map(key).sort());
  });

  it("follows the codeLens.references setting, on by default", () => {
    const index = new WorkspaceIndex(fs, { env: {}, homedir: p("home"), exists: (f) => byKey.has(key(f)) });
    index.setFolders([p("ws")]);
    expect(index.referenceLenses(p("ws", "main.tf"))).toBe(true);
    index.setSettings(p("ws"), { codeLens: { references: false } });
    expect(index.referenceLenses(p("ws", "main.tf"))).toBe(false);
  });
});
