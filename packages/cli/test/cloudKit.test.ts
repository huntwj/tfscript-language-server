import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

/**
 * The cloud kit (scripts/cloud-kit.js): the plugin's checker, hook and skill copied into a repo for
 * cloud sessions, which load no plugins, and the hook's --cloud-only, which keeps that copy quiet
 * where the plugin runs.
 */
const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const KIT = path.join(REPO, "scripts", "cloud-kit.js");
const HOOK = path.join(REPO, "editors", "claude-code", "bundle", "tfscript-hook.js");
const dirs: string[] = [];
const scratch = () => {
  const d = mkdtempSync(path.join(tmpdir(), "tfscript-cloud-kit-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const kit = (...args: string[]) => spawnSync(process.execPath, [KIT, ...args], { encoding: "utf8" });

describe("the hook's --cloud-only", () => {
  const input = (dir: string) => JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Write", cwd: dir, tool_input: { file_path: path.join(dir, "bad.tf") } });

  it("says nothing outside a cloud session, and checks the file in one", () => {
    const dir = scratch();
    writeFileSync(path.join(dir, "bad.tf"), '/if (x =~ "")\n/endif\n');
    const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
    delete env.CLAUDE_CODE_REMOTE;
    const local = spawnSync(process.execPath, [HOOK, "--cloud-only"], { input: input(dir), encoding: "utf8", env });
    expect(local.status).toBe(0);
    expect(local.stdout).toBe("");
    const cloud = spawnSync(process.execPath, [HOOK, "--cloud-only"], { input: input(dir), encoding: "utf8", env: { ...env, CLAUDE_CODE_REMOTE: "true" } });
    expect(cloud.status).toBe(0);
    expect(JSON.parse(cloud.stdout)).toMatchObject({ decision: "block" });
    expect(cloud.stdout).toContain("missing-continuation");
  }, 30_000);
});

describe("scripts/cloud-kit.js", () => {
  it("writes the checker, the hook, the skill and the settings, which --check then finds current", () => {
    const dir = scratch();
    expect(kit(dir).status).toBe(0);
    for (const f of ["tfscript/tfscript.js", "tfscript/tfscript-hook.js", "tfscript/README.md", "skills/tf-scripting/SKILL.md", "settings.json"]) {
      expect(readFileSync(path.join(dir, ".claude", f), "utf8").length, f).toBeGreaterThan(0);
    }
    expect(readFileSync(path.join(dir, ".claude", "tfscript", "tfscript-hook.js"), "utf8")).toBe(readFileSync(HOOK, "utf8"));
    expect(readFileSync(path.join(dir, ".claude", "skills", "tf-scripting", "SKILL.md"), "utf8")).toContain("node .claude/tfscript/tfscript.js check");
    expect(kit("--check", dir).status).toBe(0);
    writeFileSync(path.join(dir, ".claude", "tfscript", "tfscript.js"), "stale");
    const stale = kit("--check", dir);
    expect(stale.status).toBe(1);
    expect(stale.stdout).toContain("out of date: .claude/tfscript/tfscript.js");
    // --check after the repo checks too, and writes nothing.
    expect(kit(dir, "--check").status).toBe(1);
    expect(readFileSync(path.join(dir, ".claude", "tfscript", "tfscript.js"), "utf8")).toBe("stale");
  });

  it("refuses an option it doesn't know, and more than one repo", () => {
    const dir = scratch();
    expect(kit("--dry-run", dir).status).toBe(2);
    expect(kit(dir, dir).status).toBe(2);
    expect(existsSync(path.join(dir, ".claude"))).toBe(false);
  });

  it("keeps a repo's other settings and hooks, and replaces its own hook rather than adding another", () => {
    const dir = scratch();
    mkdirSync(path.join(dir, ".claude"));
    const other = { matcher: "Bash", hooks: [{ type: "command", command: "echo other" }] };
    writeFileSync(path.join(dir, ".claude", "settings.json"), JSON.stringify({ permissions: { allow: ["Read"] }, hooks: { PostToolUse: [other] } }));
    kit(dir);
    kit(dir);
    const settings = JSON.parse(readFileSync(path.join(dir, ".claude", "settings.json"), "utf8"));
    expect(settings.permissions).toEqual({ allow: ["Read"] });
    expect(settings.hooks.PostToolUse).toHaveLength(2);
    expect(settings.hooks.PostToolUse[0]).toEqual(other);
    expect(settings.hooks.PostToolUse[1].hooks[0].command).toBe('node "$CLAUDE_PROJECT_DIR/.claude/tfscript/tfscript-hook.js" --cloud-only');
  });
});
