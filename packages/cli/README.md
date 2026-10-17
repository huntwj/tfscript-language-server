# @tfscript/cli

`tfscript check` reports, for each tf script you name, the diagnostics the language server would
show in an editor: the file's own, then the ones its load path gives (`unresolved-load`,
`undefined-macro`). It runs core's analysis (`@tfscript/core`) the way the server does, over a
workspace whose one folder is `--root`, so the same file gets the same diagnostics, with the
same codes, ranges and fixes, either way. The messages are the server's too, but where one names
an editor setting (`set tfscript.workingDirectory`) it names the option instead
(`give --working-directory`).

It is for hooks (an editor or agent checking each file it edits), CI and checking by hand. It
never changes a file; there is no `--fix`.

`tfscript format` lays scripts out the way the server's formatting does (see
[`tfscript format`](#tfscript-format) below).

```sh
npm install && npm run build                    # from the repo root
node packages/cli/dist/cli.js check tfrc scripts/
node packages/cli/dist/cli.js format --check scripts/
```

## Usage

```
tfscript check [options] <file or folder>...
```

A file is checked whatever its name, so `tfrc` counts. A folder is searched as the server
searches a workspace folder: `.tf` files, `tfrc` and `.tfrc`, skipping `.git`, `.jj` and
`node_modules`, in name order. Like the server's, the search doesn't follow a link to a folder
(a junction or a symbolic link) inside the folder; name the linked folder itself to check it. A
file named through links is checked once, and is in the root when the file it really is is.

To find what defines a macro (`undefined-macro`), the whole root is searched for tf scripts, as
the server searches a workspace folder. A narrow `--root` (the folder holding your tfrc, say,
rather than your home directory) keeps a check fast.

The options are named after the editor's `tfscript.*` settings and set them, and core resolves them
the same way: what isn't given is found as tf would find it (a tfrc in the root, `TFLIBDIR` and
`TFPATH` from the environment, every diagnostic on).

Relative paths in the options are relative to the root, not to the current folder, as the
editor's settings are relative to the workspace folder. With `--root ws`, the tfrc in `ws` is
`--entry-file tfrc`, not `--entry-file ws/tfrc`:

```sh
tfscript check --root ws --entry-file tfrc ws/
```

The paths to check are relative to the current folder, as usual. A file outside the root is
seen as the server sees a file outside every workspace folder: in a folder of its own, with the
default settings.

| Option | Setting |
|---|---|
| `--root <folder>` | the workspace folder (default: the folder of `--config`, else the current folder) |
| `--config <file>` | a `tfscript.json` to read the settings from (default: the root's own, if it has one) |
| `--entry-file <file>`, repeatable | `entryFiles` |
| `--context <name>=<file>`, repeatable (files of one name add up) | `contexts` |
| `--active-context <name>` | `activeContext` |
| `--library-path <folder>` | `libraryPath` |
| `--tf-path <folder>`, repeatable | `tfPath` |
| `--working-directory <folder>` | `workingDirectory` |
| `--home-directory <folder>` | `homeDirectory` |
| `--path-mapping <tf>=<local>`, repeatable | `pathMappings` |
| `--variable <name>=<value>`, repeatable | `variables` |
| `--tf-build upstream\|fork` | `tfBuild` |
| `--no-unresolved-loads` | `diagnostics.unresolvedLoads: false` |
| `--no-undefined-macros` | `diagnostics.undefinedMacros: false` |
| `--ignore-macro <name>`, repeatable | `diagnostics.ignoreMacros` |

## Settings file: tfscript.json

The settings can be kept in a `tfscript.json` instead of given as options each time. Its keys are
the `tfscript.*` settings without the prefix: `entryFiles`, `contexts`, `activeContext`,
`libraryPath`, `tfPath`, `workingDirectory`, `homeDirectory`, `pathMappings`, `variables`,
`tfBuild`, and `diagnostics` with `unresolvedLoads`, `undefinedMacros` and `ignoreMacros`. Relative paths in it
are relative to its own folder.

```json
{
  "$schema": "https://raw.githubusercontent.com/huntwj/tfscript-language-server/main/schemas/tfscript.schema.json",
  "entryFiles": ["tfrc"],
  "libraryPath": "../tinyfugue/lib/tf",
  "diagnostics": { "ignoreMacros": ["gag_*"] }
}
```

`tfscript check` reads the root's `tfscript.json` if there is one, or the file `--config` names
(whose folder is then the root, unless `--root` is given). The options go over the file's
settings: an option given replaces that setting, and under `diagnostics` each key is replaced on
its own. A file that isn't valid JSON, or has a key that isn't a setting or a value of the wrong
kind, isn't used: nothing is checked, each problem is reported as a sentence saying what is wrong
and how to fix it, and the exit status is 2.

The JSON schema, [schemas/tfscript.schema.json](../../schemas/tfscript.schema.json), lets an
editor check and complete the file; the `$schema` line above points to it. The `claudeCode`
section is read only by the Claude Code plugin's hook (see
[editors/claude-code](../../editors/claude-code/README.md)); the command line ignores it.

Output and exit status:

| Option | Meaning |
|---|---|
| `--format human` (default) | one line per diagnostic on stdout, `path:line:col: severity code: message`, then a count on stderr |
| `--format json` | one JSON report on stdout (below); stderr has only the paths that couldn't be checked and a `tfscript.json`'s problems (also in the report's `problems`) and the `--max-warnings` message |
| `--max-warnings <n>` | exit 1 when there are more than `n` warnings |
| `--setting-names option` (default) or `config` | how a message names a setting: as its option (`give --working-directory`), or as its `tfscript.json` key (`set workingDirectory in tfscript.json`), which the Claude Code hook uses |

- **0**: no errors (warnings and information notes don't count, unless `--max-warnings` is exceeded).
- **1**: at least one error, or more warnings than `--max-warnings`.
- **2**: the command line is wrong (no command, an unknown command or option, an option
  missing its value or given a bad one, nothing to check), `--root` is missing or is a file, the
  `tfscript.json` is missing (for `--config`) or bad, or a
  path can't be checked (it doesn't exist, can't be read, or is a folder with no tf scripts in it).
  Any other paths are still checked and reported. An internal failure (a bug) also exits 2, so it
  never reads as "errors found".

Problems with the command line or a path go to stderr as `tfscript: <what is wrong>: <how to fix it>`.

## tfscript format

```
tfscript format [--check] <file or folder>...
```

Formats each file in place, in the one style the server's Format Document uses: a macro body on
the lines after its head, which ends `= \`, one statement per line ending `%;\` (the last with no
`%;`), and each `/if`, `/elseif`, `/else` and `/while` block's contents two spaces further in.
Only whitespace tf ignores changes, so a file loads and runs the same; what is left as it is, and
why, is in the main README's "Formatting" section. Folders are searched as `check` searches them.
The style has no options.

Each file that changes is named on stdout, then a count goes to stderr. A file with CRLF line
endings is left as it is, with a note on stderr: tf doesn't join a line ending in `\` before a
`\r`, so its layout can't be changed safely. A file that isn't valid UTF-8 (whose other bytes
would be lost), or that holds U+FFFD (the mark of a byte that wasn't), can't be formatted or
checked: it is left as it is, with a note, and the exit status is 2. A byte order mark is kept.

A changed file is written in place, as gofmt writes one: first a copy of the old file beside it,
under a name nobody can guess, then the new text into the file itself, so it keeps its hard
links, owner, permissions and attributes, and a read-only file is refused untouched. The copy is
removed once the write is done. If a write fails part way the old text is put back, and if that
fails too the copy is kept, and the message names it.

| Option | Meaning |
|---|---|
| `--check` | change nothing: name the files that would change, and exit 1 if there are any |

- **0**: every file is formatted (with `--check`: no file would change).
- **1**: with `--check`, at least one file would change.
- **2**: the command line is wrong (an option `check` takes, nothing to format), or a path can't
  be formatted or checked (it doesn't exist, can't be read or written, isn't UTF-8 or holds
  U+FFFD, or is a folder with no tf scripts). The other paths are still formatted. A CRLF file
  doesn't count: it is left as it is on purpose.

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
  "problems": [],
  "summary": { "files": 1, "errors": 1, "warnings": 0, "information": 0 }
}
```

| Field | Meaning |
|---|---|
| `files` | every file checked, as `file` names it, by name |
| `diagnostics[].file` | the file, relative to the current folder when inside it, else absolute |
| `range.start`, `range.end` | `line` and `column` 1-based, `offset` 0-based from the start of the file; columns and offsets count UTF-16 code units, as LSP does. `end` is just after the last character |
| `severity` | `"error"`, `"warning"` or `"information"` |
| `code` | the rule's code, as in [docs/rules.md](../../docs/rules.md) |
| `message` | one sentence: the problem and the fix. Where the server's message names a `tfscript.*` setting, this names the option instead (`set tfscript.workingDirectory` is `give --working-directory`) |
| `codeDescription` | `{ "href" }`, the code's entry in docs/rules.md, or `null` for a code with none |
| `fixes` | the titles of the quick fixes an editor offers for it, in its order (empty when there is none) |
| `related` | other places the diagnostic points at, each a `range` and a `message` |
| `problems` | the paths that couldn't be checked (missing, unreadable, a folder with no tf scripts) and what is wrong with a `tfscript.json`, each a sentence saying why and what to do; the same lines go to stderr, and any of them makes the exit status 2 |
| `summary` | how many files were checked, and how many diagnostics of each severity |

Both formats give the same order: files by name (as `file` names them), and within a file by
line, then column. Diagnostics at the same place keep the order the server publishes them in
(the file's own, then its load-path ones).
