import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generatedFiles, withReadmeTable } from "../src/rules/render";
import { RULE_SECTIONS, sectionSlug } from "../src/rules/table";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), "utf8");
}

// GitHub's heading anchor: lower case, punctuation other than - dropped, blanks as -.
function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/ /g, "-");
}

describe("the docs generated from the rule table", () => {
  const files = generatedFiles();

  for (const [relative, text] of Object.entries(files)) {
    it(`${relative} is up to date (npm run docs:rules)`, () => {
      expect(read(relative)).toBe(text);
    });
  }

  it("README.md's rule table is up to date (npm run docs:rules)", () => {
    const readme = read("README.md");
    expect(readme).toBe(withReadmeTable(readme));
  });

  it("gives docs/rules.md a heading for each section and code, whose anchor the links use", () => {
    const anchors = new Set([...(files["docs/rules.md"] ?? "").matchAll(/^#+ (.+)$/gm)].map((m) => slug(m[1] as string)));
    for (const section of RULE_SECTIONS) {
      expect(anchors).toContain(sectionSlug(section));
      for (const entry of section.codes) expect(anchors).toContain(entry.code);
    }
  });
});
