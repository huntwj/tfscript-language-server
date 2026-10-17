/**
 * Markdown renderings of the rule table (table.ts): docs/rules.md, the README's rule table, the
 * notes page's rule list and the tf-scripting skill. scripts/generate-rule-docs.js writes them;
 * test/ruleDocs.test.ts fails when a checked-in copy differs from what these produce.
 */
import { MAYBE_INTENTIONAL, RULE_SECTIONS, RULES_DOC_URL, WHEN_CODE_RUNS, sectionSlug, type RuleSection } from "./table";

const GENERATED = "<!-- Generated from packages/core/src/rules/table.ts by scripts/generate-rule-docs.js (npm run docs:rules). Edit the table, not this file. -->";

const CASES_DIR = "~/ai/mud/tests/tfscript/cases/";

function heading(section: RuleSection): string {
  return `${section.id}. ${section.title}`;
}

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function codeList(section: RuleSection, link: (code: string) => string): string {
  return section.codes.length > 0 ? section.codes.map((c) => link(c.code)).join(", ") : "none of its own";
}

function proofLines(section: RuleSection): string[] {
  const lines: string[] = [];
  if (section.cases.length > 0) lines.push(`Cases: ${section.cases.map((c) => `\`${c}\``).join(", ")}.`);
  lines.push(`tf source: ${section.source.map((s) => `\`${s.at}\` (${s.what})`).join("; ")}.`);
  for (const note of section.sourceOnly ?? []) lines.push(`Not run: ${note}`);
  return lines;
}

/** `text` with its first letter in upper case. */
function capital(text: string): string {
  return text.replace(/^(\([^)]*\) )?(\S)/, (_, tag: string | undefined, ch: string) => `${tag ?? ""}${ch.toUpperCase()}`);
}

/** docs/rules.md: one heading per section, and one per code, whose slug is the code (its link's anchor). */
export function renderRulesDoc(): string {
  const out: string[] = [
    "# tf scripting rules",
    "",
    GENERATED,
    "",
    "The rules of tf's macro language that this server checks, grouped by the rule in tf that each one comes from. " +
      "Each rule is proven by running real tf, by the cases named under it in the private notes repo's " +
      "`tests/tfscript/cases/`, and explained by the tf source cited, under `tinyfugue/src/`. A claim no case runs is " +
      "listed under \"Not run\", with where it comes from. Each diagnostic code has its own heading here, which its " +
      "link in the editor goes to.",
    "",
    "## When code runs",
    "",
    WHEN_CODE_RUNS.join("\n\n"),
    "",
    "## Sections",
    "",
    list(RULE_SECTIONS.map((s) => `[${heading(s)}](#${sectionSlug(s)}): ${codeList(s, (c) => `[\`${c}\`](#${c})`)}`)),
    "",
  ];
  for (const section of RULE_SECTIONS) {
    out.push(`## ${heading(section)}`, "", section.statement.join("\n\n"), "", "**Fix:**", "", list(section.fix), "");
    out.push("**Proof:**", "", list(proofLines(section)), "");
    if (section.codes.length === 0) out.push("No diagnostic code of its own.", "");
    for (const entry of section.codes) {
      out.push(`### ${entry.code}`, "", `**${capital(entry.severity)}.** ${entry.summary}`, "", `${capital(entry.detail)}.`, "");
    }
  }
  out.push("## Planned: shapes that may be deliberate", "", MAYBE_INTENTIONAL.join("\n\n"), "");
  return out.join("\n");
}

export const README_START = "<!-- rule-table:start -->";
export const README_END = "<!-- rule-table:end -->";

/** The README's rule table, between README_START and README_END. */
export function renderReadmeTable(): string {
  const rows = RULE_SECTIONS.flatMap((s) =>
    s.codes.map((c) => `| [${s.id}](docs/rules.md#${sectionSlug(s)}) | [\`${c.code}\`](docs/rules.md#${c.code}) | ${c.detail} |`),
  );
  return [README_START, GENERATED, "", "| Section | id | What it catches |", "| --- | --- | --- |", ...rows, README_END].join("\n");
}

/** `readme` with its rule table replaced by `renderReadmeTable()`. */
export function withReadmeTable(readme: string): string {
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  if (start < 0 || end < start) throw new Error(`README.md has no ${README_START} ... ${README_END} section`);
  return readme.slice(0, start) + renderReadmeTable() + readme.slice(end + README_END.length);
}

/** The notes page's rule list (scripting.md's "The rules"), with level-3 headings. */
export function renderNotesRules(): string {
  const out: string[] = [GENERATED, "", "### When code runs", "", WHEN_CODE_RUNS.join("\n\n"), ""];
  for (const section of RULE_SECTIONS) {
    out.push(`### ${heading(section)}`, "", section.statement.join("\n\n"), "", "Fix:", "", list(section.fix), "");
    const codes = codeList(section, (c) => `[\`${c}\`](${RULES_DOC_URL}#${c})`);
    out.push("Codes and proof:", "", list([`Language-server codes: ${codes}.`, ...proofLines(section)]), "");
  }
  out.push("### Planned: shapes that may be deliberate", "", MAYBE_INTENTIONAL.join("\n\n"), "");
  return out.join("\n");
}

/**
 * The tf-scripting skill: the "when code runs" preamble, a section per rule, then how to check a
 * script. `notes` is the copy for the notes repo, whose cases and tf-script-check it names;
 * `plugin` is the Claude Code plugin's, for anyone, which names the checker the plugin bundles.
 */
export function renderSkill(audience: "notes" | "plugin" = "notes"): string {
  const notes = audience === "notes";
  const out: string[] = [
    "---",
    "name: tf-scripting",
    "description: Use when writing, editing, reviewing or debugging TinyFugue scripts (.tf files, /def macros, triggers, " +
      "hooks, /load, /log, /eval) - tf's macro language breaks in ways ordinary scripting intuition does not predict, and " +
      "a script that loads silently can still be broken.",
    "---",
    "",
    GENERATED,
    "",
    "# TinyFugue scripting",
    "",
    notes
      ? "Do not trust memory or the manual for tf macro syntax. Each rule below was proven by running a script against the " +
        `real tf (cases in \`${CASES_DIR}\`, full page \`site/src/content/docs/tinyfugue/scripting.md\` in ` +
        "`~/ai/mud`), except what a rule lists as not run. Check every .tf edit against them. The tfscript language " +
        "server reports the codes named under each rule."
      : "Do not trust memory or the manual for tf macro syntax. Each rule below was proven by running a script against the " +
        "real tf, except what a rule lists as not run. Check every .tf edit against them. The tfscript plugin checks each " +
        `.tf file you write or edit and reports problems by the codes named under each rule, explained in full at ${RULES_DOC_URL}.`,
    "",
    "## When code runs",
    "",
    WHEN_CODE_RUNS.join("\n\n"),
    "",
  ];
  for (const section of RULE_SECTIONS) {
    out.push(`## ${heading(section)}`, "", list(section.statement), "", "Fix:", "", list(section.fix), "");
    const lines = [`Codes: ${codeList(section, (c) => `\`${c}\``)}.`];
    if (notes && section.cases.length > 0) lines.push(`Cases: ${section.cases.map((c) => `\`${c}\``).join(", ")}.`);
    out.push(lines.join(" "), "");
    for (const note of section.sourceOnly ?? []) out.push(`Not run: ${note}`, "");
  }
  out.push("## Shapes that may be deliberate (planned)", "", MAYBE_INTENTIONAL.join("\n\n"), "");
  if (!notes) {
    out.push(
      "## Checking a script (do this instead of guessing)",
      "",
      "The plugin's hook checks every `.tf` file, `tfrc` and `.tfrc` you write or edit, and blocks an edit that leaves an " +
        "error. To check files yourself, run the checker the plugin bundles, from the plugin's folder (two folders above " +
        "this skill's):",
      "",
      "    node <plugin folder>/bundle/tfscript.js check --root <project folder> FILE_OR_FOLDER...",
      "    node <plugin folder>/bundle/tfscript.js --help    # every option",
      "",
      "Where tf finds what a file loads (its library folder, `TFPATH`, the tfrc it starts from) goes in a " +
        "`tfscript.json` in the project folder, keyed by the setting names `--help` shows in brackets. A clean check is " +
        "not proof that a macro does what you meant, since a body is only parsed when it runs: when it matters, `/load` " +
        "the file in tf and run the macro.",
      "",
    );
    return out.join("\n");
  }
  out.push(
    "## Checking a script with tf-script-check (do this instead of guessing)",
    "",
    "From `~/ai/mud` (use `MSYS_NO_PATHCONV=1` in Git Bash for container paths):",
    "",
    "    just tf-script-check PATH/TO/script.tf                              # load it, list problems",
    "    just tf-script-check --mount HOSTDIR=/wotmud /wotmud/tf/main.tf    # a script that loads others",
    "    ... --world NAME --server-text \"line\" --server-text \"line\"          # connect to a fake server so hooks/triggers fire",
    "    ... --cmd \"/macroname arg\"                                          # run a macro after loading",
    "    ... --all                                                           # show every % line tf prints",
    "",
    "Exit 1 means tf printed a syntax error, missing file, unknown command or warning. Feed trigger scripts the server " +
      "lines that should fire them. To learn a new rule, write a case in `tests/tfscript/cases/` (`;; expect: " +
      "clean|problem`, `;; run: ...`, `;; rule: ...`), run `just test-tfscript`, then add it to the rule table in the " +
      "language server's `packages/core/src/rules/table.ts` and regenerate this file. Only write a rule down after a test proved it; " +
      "an untested rule from memory has already been wrong once.",
    "",
  );
  return out.join("\n");
}

/** Each generated file, by its path in this repo. */
export function generatedFiles(): Record<string, string> {
  return {
    "docs/rules.md": renderRulesDoc(),
    "docs/generated/scripting-rules.md": renderNotesRules(),
    "docs/generated/tf-scripting-skill.md": renderSkill(),
    // The Claude Code plugin's copy, at the path a plugin's skills are loaded from.
    "editors/claude-code/skills/tf-scripting/SKILL.md": renderSkill("plugin"),
  };
}
