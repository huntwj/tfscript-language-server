import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { logUnhandledRejections } from "../src/rejections";
import { relevantChange, watchPlan, Watching, type WatchPlan } from "../src/watching";
import type { ResolvedSettings } from "../src/workspace/settings";

const ROOT = path.resolve("/fake");
const p = (...parts: string[]) => path.join(ROOT, ...parts);

function settings(over: Partial<ResolvedSettings> = {}): ResolvedSettings {
  return {
    entryFiles: [],
    contexts: [{ name: "default", entryFiles: [] }],
    activeContext: "default",
    tfPath: [],
    workingDir: p("ws"),
    home: p("home"),
    pathMappings: [],
    variables: {},
    ...over,
  };
}

const bases = (plan: WatchPlan) =>
  plan.watchers.map((w) => (typeof w.globPattern === "string" ? w.globPattern : `${String(w.globPattern.baseUri)} ${w.globPattern.pattern}`));

describe("watchPlan", () => {
  it("watches the workspace's tf files and every create and delete there (a folder renamed or deleted)", () => {
    const plan = watchPlan([p("ws")], [settings()], false);
    expect(bases(plan)).toEqual(["**/{*.tf,tfrc,.tfrc}", "**/*"]);
    expect(plan.roots).toEqual([p("ws")]);
  });

  it("watches only the home directory's own tfrc files, not everything under it", () => {
    const plan = watchPlan([p("ws")], [settings()], true);
    expect(bases(plan)).toContain(`${pathToFileURL(p("home")).href} {tfrc,.tfrc}`);
    expect(plan.roots).toEqual([p("ws"), p("home", "tfrc"), p("home", ".tfrc")]);
  });

  it("watches the library and mapped folders recursively, folder events included, unless they're unbounded", () => {
    const s = settings({
      libraryDir: p("lib"),
      pathMappings: [
        { tf: "/wotmud", local: p("wotmud") },
        { tf: "/", local: path.parse(ROOT).root },
        { tf: "/h", local: ROOT },
      ],
    });
    const plan = watchPlan([p("ws")], [s], true);
    const lib = pathToFileURL(p("lib")).href;
    expect(bases(plan)).toEqual(expect.arrayContaining([`${lib} **/{*.tf,tfrc,.tfrc}`, `${lib} **/*`, `${pathToFileURL(p("wotmud")).href} **/*`]));
    // A drive root and a folder holding the home directory would mean watching everything under them.
    expect(plan.roots).toEqual([p("ws"), p("lib"), p("wotmud"), p("home", "tfrc"), p("home", ".tfrc")]);
  });

  it("watches nothing outside the workspace without relative patterns, and the client's events cover what's inside", () => {
    expect(watchPlan([p("ws")], [settings({ libraryDir: p("ws", "lib") })], true).roots).toEqual([p("ws"), p("home", "tfrc"), p("home", ".tfrc")]);
    expect(watchPlan([p("ws")], [settings({ libraryDir: p("lib") })], false).roots).toEqual([p("ws")]);
  });
});

describe("relevantChange", () => {
  it("ignores what a jj or git command does in .jj, .git and node_modules", () => {
    expect(relevantChange(p("ws", ".jj", "repo", "op_store", "x"))).toBe(false);
    expect(relevantChange(p("ws", "node_modules", "a.tf"))).toBe(false);
    expect(relevantChange(p("ws", "sub"))).toBe(true);
    expect(relevantChange(p("ws", "a.tf"))).toBe(true);
  });
});

describe("Watching", () => {
  const plan = watchPlan([p("ws")], [settings()], false);

  it("falls back to nothing watched when the client refuses the registration", async () => {
    const roots: string[][] = [];
    const logged: string[] = [];
    const watching = new Watching(() => Promise.reject(new Error("no")), (r) => roots.push(r), (m) => logged.push(m));
    await watching.update(plan);
    expect(roots).toEqual([[]]);
    expect(logged[0]).toContain("checked by modification time");
  });

  it("replaces the registration it made before, one update at a time", async () => {
    const events: string[] = [];
    let n = 0;
    const register = async () => {
      const id = (n += 1);
      events.push(`register ${id}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`registered ${id}`);
      return { dispose: () => events.push(`dispose ${id}`) };
    };
    const watching = new Watching(register, () => undefined, () => undefined);
    void watching.update(plan);
    await watching.update(plan);
    expect(events).toEqual(["register 1", "registered 1", "dispose 1", "register 2", "registered 2"]);
  });
});

describe("logUnhandledRejections", () => {
  it("writes a rejection nobody awaited to stderr instead of ending the process", () => {
    let listener: ((reason: unknown) => void) | undefined;
    const written: string[] = [];
    logUnhandledRejections({ on: (_event, l) => (listener = l) }, (t) => written.push(t));
    listener?.(new Error("client refused"));
    expect(written[0]).toContain("tfscript: unhandled rejection: Error: client refused");
  });
});
