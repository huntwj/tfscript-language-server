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

From your shell, the same is `claude plugin marketplace add huntwj/tfscript-language-server`, then
`claude plugin install tfscript@tfscript-language-server`. Run `/reload-plugins`, or start a new
session, to load it.

## What it does

- **Checks each tf script Claude edits.** After every Edit or Write of a `.tf` file, a `tfrc` or a
  `.tfrc`, a hook runs `tfscript check` on the file and passes what it finds to Claude, which
  can then fix it. Errors are put to Claude as a problem with the edit; warnings come as a note
  beside the edit's result. Every error is listed, and the first 20 warnings with a count of the
  rest; information notes are left out unless asked for. Each line has the place, the code, the
  message and the titles of the quick fixes an editor would offer. The hook never changes a file:
  Claude makes any fix itself. A clean file gets no message at all.
- **Leaves Terraform alone.** `.tf` is Terraform's extension too. A `.tf` file is skipped, silently,
  when its folder has a `.terraform` folder, a `.terraform.lock.hcl`, a `*.tfvars` (or
  `.tfvars.json`) or a `*.tf.json` file, or when the file has a Terraform block: a line starting
  `resource "`, `data "`, `module "`, `variable "`, `output "`, `provider "`, `terraform {` or
  `locals {`.
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

A check that takes longer than 10 seconds is stopped, and Claude is told the file wasn't checked.
If that happens, put a `tfscript.json` in the folder that holds your scripts' tfrc, so the root is
that folder rather than, say, your home directory.

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
| `timeoutSeconds` | How long to wait for a check before giving up with a short notice, up to 25 | `10` |

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
