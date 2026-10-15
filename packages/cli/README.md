# @tfscript/cli

`tfscript check` reports, for each tf script you name, the diagnostics the language server would
show in an editor: the file's own, then the ones its load path gives (`unresolved-load`,
`undefined-macro`). It runs core's analysis (`@tfscript/core`) the way the server does, over a
workspace whose one folder is `--root`, so the same file gets the same diagnostics, with the
same codes, messages and fixes, either way.

It is for hooks (an editor or agent checking each file it edits), CI and checking by hand. It
never changes a file; there is no `--fix`.

```sh
npm install && npm run build                    # from the repo root
node packages/cli/dist/cli.js check tfrc scripts/
```

## Usage

```
tfscript check [options] <file or folder>...
```

A file is checked whatever its name, so `tfrc` counts. A folder is searched as the server
searches a workspace folder: `.tf` files, `tfrc` and `.tfrc`, skipping `.git`, `.jj` and
`node_modules`, in name order.

The settings are the editor's `tfscript.*` settings, given as options, and core resolves them
the same way: what isn't given is found as tf would find it (a tfrc in the root, `TFLIBDIR` and
`TFPATH` from the environment, every diagnostic on). Relative paths in the options are relative
to the root, as the editor's are relative to the workspace folder. A file outside the root is
seen as the server sees a file outside every workspace folder: in a folder of its own, with the
default settings.

| Option | Setting |
|---|---|
| `--root <folder>` | the workspace folder (default: the current folder) |
| `--entry-file <file>`, repeatable | `entryFiles` |
| `--context <name>=<file>`, repeatable (files of one name add up) | `contexts` |
| `--active-context <name>` | `activeContext` |
| `--library-path <folder>` | `libraryPath` |
| `--tf-path <folder>`, repeatable | `tfPath` |
| `--working-directory <folder>` | `workingDirectory` |
| `--home-directory <folder>` | `homeDirectory` |
| `--path-mapping <tf>=<local>`, repeatable | `pathMappings` |
| `--variable <name>=<value>`, repeatable | `variables` |
| `--no-unresolved-loads` | `diagnostics.unresolvedLoads: false` |
| `--no-undefined-macros` | `diagnostics.undefinedMacros: false` |
| `--ignore-macro <name>`, repeatable | `diagnostics.ignoreMacros` |

Output and exit status:

| Option | Meaning |
|---|---|
| `--format human` (default) | one line per diagnostic on stdout, `path:line:col: severity code: message`, then a count on stderr |
| `--format json` | one JSON report on stdout (below), nothing on stderr unless a path can't be checked |
| `--max-warnings <n>` | exit 1 when there are more than `n` warnings |

- **0**: no errors (warnings and information notes don't count, unless `--max-warnings` is exceeded).
- **1**: at least one error, or more warnings than `--max-warnings`.
- **2**: the command line is wrong, or a path can't be checked (missing, unreadable, or a folder
  with no tf scripts). The rest are still checked and reported. An internal failure also exits 2.

Problems with the command line or a path go to stderr as `tfscript: <what is wrong>: <how to fix it>`.

## JSON output

`--format json` writes one object. Its `version` is bumped on any change that isn't an added
field.

```json
{
  "version": 1,
  "files": ["main.tf"],
  "diagnostics": [
    {
      "file": "main.tf",
      "range": {
        "start": { "line": 4, "column": 6, "offset": 178 },
        "end": { "line": 4, "column": 20, "offset": 192 }
      },
      "severity": "error",
      "code": "invalid-macro-name",
      "message": "This /def has no = after its name, so tf takes all of \"oops /echo the\" as the name, which can't hold a space, and defines nothing: put = after oops.",
      "codeDescription": { "href": "https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md#invalid-macro-name" },
      "fixes": ["Put = after oops"],
      "related": []
    }
  ],
  "summary": { "files": 1, "errors": 1, "warnings": 0, "information": 0 }
}
```

| Field | Meaning |
|---|---|
| `files` | every file checked, as `file` names it |
| `diagnostics[].file` | the file, relative to the current folder when inside it, else absolute |
| `range.start`, `range.end` | `line` and `column` 1-based, `offset` 0-based from the start of the file; columns and offsets count UTF-16 code units, as LSP does. `end` is just after the last character |
| `severity` | `"error"`, `"warning"` or `"information"` |
| `code` | the rule's code, as in [docs/rules.md](../../docs/rules.md) |
| `message` | one sentence: the problem and the fix |
| `codeDescription` | `{ "href" }`, the code's entry in docs/rules.md, or `null` for a code with none |
| `fixes` | the titles of the quick fixes an editor offers for it, in its order (empty when there is none) |
| `related` | other places the diagnostic points at, each a `range` and a `message` |
| `summary` | how many files were checked, and how many diagnostics of each severity |

Diagnostics come file by file, in the order the files are listed; within a file, its own
diagnostics come first, then its load-path ones, as the server publishes them.
