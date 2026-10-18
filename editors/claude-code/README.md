# tfscript for Claude Code

A Claude Code plugin for TinyFugue scripts (tfscript). While Claude edits your `.tf` files, `tfrc`
or `.tfrc`, it is told what the tfscript language server would show you in an editor, and it can
look up macros through the server. It also gives Claude the tf-scripting skill: the rules of tf's
macro language that ordinary scripting intuition gets wrong.

Everything runs on your machine, from files bundled in the plugin. Nothing is fetched from the
network, and nothing else needs installing beyond Node.js 22.12 or later (`node` on your `PATH`).

## Install

In Claude Code:

```
/plugin marketplace add huntwj/tfscript-language-server
/plugin install tfscript@tfscript-language-server
```

On Claude Code 2.1.275 or later, one line does both:

```
/plugin install tfscript --marketplace huntwj/tfscript-language-server
```

In a session, `/plugin install` doesn't install straight away: it opens the plugin in the `/plugin`
panel, where you review it and choose the scope to install it in (for you, for the project, or
for the project on this machine only).

From your shell, `claude plugin install tfscript --marketplace huntwj/tfscript-language-server`
(Claude Code 2.1.292 or later) adds the marketplace and installs the plugin in one step. On
older versions, run `claude plugin marketplace add huntwj/tfscript-language-server`, then
`claude plugin install tfscript@tfscript-language-server`. Run `/reload-plugins`, or start a new
session, to load it.

## What it does

- **Checks each tf script Claude edits.** After every Edit or Write of a `.tf` file, a `tfrc` or a
  `.tfrc`, a hook runs `tfscript check` on the file and passes what it finds to Claude, which
  can then fix it. Errors are put to Claude as a problem with the edit; warnings come as a note
  beside the edit's result. Every error is listed, and the first 20 warnings with a count of the
  rest; information notes are left out unless asked for. Lint warnings (rule section L1) are passed
  on only for the lines the edit wrote (all of them for a Write), with a count of those left out, so
  Claude isn't sent off to change code nobody asked about. Each line has the place, the code, the
  message and the titles of the quick fixes an editor would offer. Where a message names a
  setting, it names the `tfscript.json` key (`set workingDirectory in tfscript.json`). The hook never changes a file:
  Claude makes any fix itself. A clean file gets no message at all.
- **Leaves Terraform alone.** `.tf` is Terraform's extension too. A `.tf` file is skipped, silently,
  when its folder has a `.terraform` folder, a `.terraform.lock.hcl`, a `*.tfvars` (or
  `.tfvars.json`), a `*.tf.json`, or a `*.tfstate` (or `.tfstate.backup`) file; when the file has
  a Terraform block: a line starting `resource`, `data`, `module`, `variable`, `output`,
  `provider`, `check` or `ephemeral` with labels (quoted or bare), or `terraform {`, `locals {`,
  `moved {`, `import {` or `removed {`; or when its first line that isn't blank or a comment opens
  an HCL block (`name [labels] {`). A byte order mark is ignored. In a tf script, any such line
  would be a `not-a-command` error, as tf stops loading a file at a line that doesn't start
  with `/`.
- **Checks a tfscript.json Claude edits**, and says what is wrong with it, if anything.
- **Navigation and hover.** The bundled language server is registered for `.tf` files, so Claude
  can go to a macro's definition, find its references and read its hover through the LSP tool.
  Its diagnostics are turned off (`"diagnostics": false` in `.lsp.json`), so a problem isn't
  reported twice: the hook reports them.
- **The tf-scripting skill**, which Claude loads when it works on tf scripts (`/tfscript:tf-scripting`
  runs it by hand).

### Where a file is checked from

To find what defines each macro, `tfscript check` searches its whole root folder, so the hook keeps
the root narrow. It is, in order:

1. the folder of the nearest `tfscript.json` in the file's folder or above it;
2. the project folder Claude Code started in, if the file is in it;
3. the file's own folder.

A check that takes longer than 10 seconds is stopped, and the file is checked again from the same
root with the same `tfscript.json`, but with `undefined-macro` off: only that check searches the
root (for what defines each macro), so this one takes a moment. Claude gets that check's
diagnostics and a note that the full check timed out. If that happens, put a `tfscript.json` in the
folder that holds your scripts' tfrc, so the root is that folder rather than, say, your home
directory. A file outside the project, with no `tfscript.json` above it, in a folder too big to
search (a drive's root, your home folder, or one with thousands of files) is checked on its own
the same way.

## Configuration: tfscript.json

The hook reads its settings from a `tfscript.json`, the same file `tfscript check` reads (see
[packages/cli/README.md](../../packages/cli/README.md#settings-file-tfscriptjson)). Its keys are the
`tfscript.*` settings of the VS Code extension without the `tfscript.` prefix, and its relative
paths are relative to its own folder. The hook's own settings go under `claudeCode`:

```json
{
  "$schema": "https://raw.githubusercontent.com/huntwj/tfscript-language-server/main/schemas/tfscript.schema.json",
  "entryFiles": ["tfrc"],
  "libraryPath": "/usr/local/lib/tf",
  "diagnostics": { "ignoreMacros": ["gag_*"] },
  "claudeCode": {
    "warningLimit": 20,
    "showInformation": false,
    "timeoutSeconds": 10
  }
}
```

| `claudeCode` key | Meaning | Default |
|---|---|---|
| `enabled` | Check the files under this tfscript.json after each edit | `true` |
| `warningLimit` | How many warnings to list; the rest are counted. Errors are always listed | `20` |
| `showInformation` | List information notes too | `false` |
| `timeoutSeconds` | How long to wait for the full check before a quick one without `undefined-macro`; up to 20 | `10` |

The JSON schema, [schemas/tfscript.schema.json](../../schemas/tfscript.schema.json), lets an editor
check and complete the file. A `tfscript.json` that isn't valid (bad JSON, a key that isn't a
setting, a value of the wrong kind) isn't used: the hook checks nothing under it and tells Claude
what is wrong and how to fix it.

The language server doesn't read `tfscript.json` yet, so navigation sees the default settings
(a tfrc in the project folder, `TFLIBDIR` and `TFPATH` from the environment).

## Limits

- The language server is registered for `.tf` files only. Claude Code maps a file to a server by
  its extension, so it can't be registered for `tfrc` or `.tfrc`; the hook still checks those.
- The server is also started for Terraform `.tf` files, as Claude Code can't tell them apart. With
  its diagnostics off it reports nothing for them. If another enabled plugin also claims `.tf`
  (a Terraform language server), whichever is registered first handles `.tf` files.
- The hook runs after Edit and Write (and MultiEdit, in versions of Claude Code that have it). It
  doesn't run for files changed some other way, such as by a shell command.

## Cloud sessions

Claude Code's cloud sessions (claude.ai/code, and sessions started from the app) load no plugins,
even ones a repo's `.claude/settings.json` turns on, but they do read the repo's own `.claude/`
folder. So a repo that wants tfscript there commits a copy, written by
`npm run cloud-kit -- <repo>` (after `npm run build`):

- `.claude/tfscript/tfscript.js` and `tfscript-hook.js`, this plugin's bundled checker and hook;
- `.claude/skills/tf-scripting/SKILL.md`, the skill, naming that checker;
- a PostToolUse hook in `.claude/settings.json` (other settings are kept) that runs the copy with
  `--cloud-only`: it does nothing unless `CLAUDE_CODE_REMOTE` is `true`, so on a machine with the
  plugin installed only the plugin's hook checks a file.

`npm run cloud-kit -- --check <repo>` says whether a repo's copy is current; run the first form
again after a release. Locally the skill is then listed twice, as `tf-scripting` (the repo's) and
`tfscript:tf-scripting` (the plugin's), with the same text.

## The files

```
.claude-plugin/plugin.json          the manifest
hooks/hooks.json                    the PostToolUse hook: node bundle/tfscript-hook.js
.lsp.json                           the language server: node bundle/tfscript-language-server.js
skills/tf-scripting/SKILL.md        the skill (generated: npm run docs:rules)
bundle/tfscript.js                  tfscript check, in one file
bundle/tfscript-language-server.js  the language server, in one file
bundle/tfscript-hook.js             the hook, in one file
```

The bundles are built from the repo's sources by `npm run bundle:claude-code` and committed, as a
plugin is installed from git without a build. CI fails when a committed bundle differs from a fresh
build (`npm run bundle:claude-code:check`). The hook's source is in `packages/cli/src/hook/`.

To try a change without installing it, load the plugin for one session:
`claude --plugin-dir editors/claude-code`.

## Evals

`evals/` holds ten tf-writing tasks for `claude plugin eval`, each built on a rule real tf proved:
a top-level `/if` over several lines, a `/load` from a variable, an `/if`/`/else` in a macro, a
trigger's condition, a literal `%-` and a literal `%;`, a multi-line `/def`, a top-level echo of a
variable, a macro that makes a trigger, and nested substitution defaults (the last four tagged
`hard`). Each has a regex grader for its trap, checked against a script tf ran right and one it
didn't (`packages/cli/test/pluginEvals.test.ts`), and an LLM judge. The judge (Haiku by default)
is often wrong about tf, so the score that counts comes from real tf:

```sh
claude plugin eval editors/claude-code --runs 3 -j 4 --allow-tools Write Edit --trust-plugin \
  --no-publish --max-cost-usd 8 --threshold 0 --json result.json
node scripts/score-evals-live.js result.json   # loads each written file in tf (Docker, ~/ai/mud)
```

The first runs (2026-10-17, Claude Code 2.1.302, the default model, 3 runs a case; $9.45 in
all), scored in real tf:

| Cases | Without the plugin | With it | Skill only | Hook only |
|---|---|---|---|---|
| The six first cases | 18/18 | 18/18 | | |
| `top-level-echo-var` | 2/6 | 3/3 | 3/3 | 6/6 |
| The other three `hard` cases | 9/9 | 9/9 | 9/9 | 9/9 |

So far the plugin's gain is on what a model gets wrong unhelped: without it, a top-level
`/echo greeting is %{greeting}` (printed as written, since nothing is substituted there) or an
`/if` with no `/endif`. With either part, every run was right; three runs a case can't tell the
skill and the hook apart, and the eval's traces don't show whether the hook fired. The judge
failed `nested-default` answers that tf ran correctly, and passed a `top-level-echo-var` one that
tf printed wrong.
