import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { asLoaded } from "../src/tfBuild";
import { parseConfig } from "../src/workspace/configFile";
import { documentDiagnostics } from "../src/workspace/documentDiagnostics";
import { resolveSettings, type Environment, type RawSettings } from "../src/workspace/settings";
import { WorkspaceIndex } from "../src/workspace/workspaceIndex";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);
const key = (f: string) => path.resolve(f).toLowerCase();

function memoryFs(files: Record<string, string>) {
  const byKey = new Map(Object.entries(files).map(([k, v]) => [key(k), v]));
  return {
    readFile: (f: string) => byKey.get(key(f)),
    listTfFiles: (dir: string) => Object.keys(files).filter((f) => key(path.dirname(f)) === key(dir) && f.endsWith(".tf")),
    walkTfFiles: (dir: string) => Object.keys(files).filter((f) => key(f).startsWith(key(dir) + path.sep) && /(\.tf|[/\\]\.?tfrc)$/.test(f)),
    exists: (f: string) => byKey.has(key(f)),
  };
}

function env(fs: ReturnType<typeof memoryFs>): Environment {
  return { env: {}, homedir: p("home"), exists: fs.exists };
}

describe("asLoaded", () => {
  it("leaves the text as it is for upstream", () => {
    expect(asLoaded("/echo a\\\r\nb\r\n", "upstream")).toBe("/echo a\\\r\nb\r\n");
  });

  it("drops one CR from the end of each line for the fork, the last line's too", () => {
    expect(asLoaded("/echo a\\\r\nb\r\n/echo c\r", "fork")).toBe("/echo a\\\nb\n/echo c");
    expect(asLoaded("/echo a\r\r\n", "fork")).toBe("/echo a\r\n");
    expect(asLoaded("/echo a\rb\n", "fork")).toBe("/echo a\rb\n");
  });
});

describe("the tfBuild setting", () => {
  it("resolves to upstream unless it names the fork", () => {
    const fs = memoryFs({});
    expect(resolveSettings({}, p("ws"), env(fs)).tfBuild).toBe("upstream");
    expect(resolveSettings({ tfBuild: "fork" }, p("ws"), env(fs)).tfBuild).toBe("fork");
    expect(resolveSettings({ tfBuild: "Fork" }, p("ws"), env(fs)).tfBuild).toBe("upstream");
  });

  it("is read from tfscript.json, which names the builds when it is something else", () => {
    const parse = (data: unknown) => parseConfig(JSON.stringify(data), p("ws", "tfscript.json"), "tfscript.json");
    expect(parse({ tfBuild: "fork" }).config?.settings).toEqual({ tfBuild: "fork" });
    expect(parse({ tfBuild: "dev" }).problems).toEqual(['tfscript.json gives "tfBuild" as the text "dev", not "upstream" or "fork": write it as "tfBuild": "fork".']);
  });
});

describe("a file saved with CRLF line endings", () => {
  const files = {
    [p("ws", "tfrc")]: "/load lib.tf\r\n/greet\r\n",
    [p("ws", "lib.tf")]: "/def -i \\\r\n  greet = /echo hi\r\n",
  };

  function check(settings: RawSettings, file: string) {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    index.setSettings(p("ws"), { entryFiles: ["tfrc"], ...settings });
    const text = asLoaded(fs.readFile(file) as string, index.tfBuildFor(file));
    return documentDiagnostics(text, file, index).map((d) => d.code);
  }

  it("doesn't continue a line upstream, so the macro it defines is missing", () => {
    expect(check({}, p("ws", "lib.tf"))).toContain("backslash-not-last");
    expect(check({}, p("ws", "tfrc"))).toContain("undefined-macro");
  });

  it("reads as an LF one for the fork, here and in the files it loads", () => {
    expect(check({ tfBuild: "fork" }, p("ws", "lib.tf"))).toEqual([]);
    expect(check({ tfBuild: "fork" }, p("ws", "tfrc"))).toEqual([]);
  });

  it("is read again when the setting changes", () => {
    const fs = memoryFs(files);
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("ws")]);
    const codes = () => documentDiagnostics(asLoaded(fs.readFile(p("ws", "tfrc")) as string, index.tfBuildFor(p("ws", "tfrc"))), p("ws", "tfrc"), index).map((d) => d.code);
    index.setSettings(p("ws"), { entryFiles: ["tfrc"] });
    expect(codes()).toContain("undefined-macro");
    index.setSettings(p("ws"), { entryFiles: ["tfrc"], tfBuild: "fork" });
    expect(codes()).toEqual([]);
    index.setSettings(p("ws"), { entryFiles: ["tfrc"] });
    expect(codes()).toContain("undefined-macro");
  });

  it("is read as the tf of the folder whose load path reaches it, not of the folder it is in", () => {
    // One tf runs a whole load path: the fork folder's tfrc loads a CRLF file from the upstream folder.
    const fs = memoryFs({
      [p("up", "lib.tf")]: "/def -i \\\r\n  greet = /echo hi\r\n",
      [p("fork", "tfrc")]: "/load ../up/lib.tf\n/greet\n",
    });
    const index = new WorkspaceIndex(fs, env(fs));
    index.setFolders([p("up"), p("fork")]);
    index.setSettings(p("up"), {});
    index.setSettings(p("fork"), { entryFiles: ["tfrc"], tfBuild: "fork" });
    const tfrc = p("fork", "tfrc");
    expect(documentDiagnostics(fs.readFile(tfrc) as string, tfrc, index).map((d) => d.code)).toEqual([]);
    expect(index.tfBuildFor(p("up", "lib.tf"))).toBe("upstream");
  });
});
