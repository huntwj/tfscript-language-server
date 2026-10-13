# Changelog

## Unreleased

- Document symbols (`onDocumentSymbol`): an outline entry for every top-level `/def`,
  `/alias`, `/bind`, `/hook`, `/trig`, `/trigc`, `/trigp` and `/trigpc`. `/def` names are
  read the way `macro_spec()` reads them (grouped flags, quoted option arguments, `--`, a
  `=` glued to the last option); an anonymous `-t`/`-h`/`-b` macro is listed under its
  pattern.
- Folding ranges (`onFoldingRanges`): every backslash-continued entry, and runs of two or
  more comment lines.
- Quick fixes (`onCodeAction`): strip the whitespace after a trailing `\`
  (`trailing-space-after-backslash`), and prefix a top-level command with `/eval`
  (`load-no-expansion`).
- Hover, go-to-definition and find-references for macros within one file. `/name` and
  `${name}`/`$name` resolve to the file's `/def`s case-insensitively, as tf does; `/@name`
  always means the built-in. Hover on a known command shows its usage synopsis (extracted from
  tinyfugue's htmldoc) and an optional description from `src/data/commandDescriptions.ts`;
  hover on a local macro shows the `;;;` doc-comment lines directly above its `/def`.
- Cross-file navigation: the server replays tf's load order from `stdlib.tf` and your tfrc (or
  the new `tfscript.entryFiles` setting), following `/load` and `/require` with tf's own path
  rules (current directory, then `TFPATH`, else `TFLIBDIR`; `/require` deduplicates by
  `/loaded` token). Hover, go-to-definition and find-references then see macros from every
  file on that path, and tf's installed library is read at runtime for `;;;` docs. A library
  macro the path never loads gets a "`/require` it" hint. New settings: `tfscript.entryFiles`,
  `libraryPath`, `tfPath`, `workingDirectory`, `homeDirectory`.
- Load-path diagnostics: `unresolved-load` warns on a `/load`/`/require` tf wouldn't find,
  listing where tf would look; `undefined-macro` (opt-in via
  `tfscript.diagnostics.undefinedMacros`) notes `/name` calls defined nowhere on the load path.
  Open files are rechecked when another file changes.
- Navigation reads `/!name` (run and negate the result) as a use of `name`.
- Workspace symbols: every `/def`, `/alias`, `/bind`, `/hook` and `/trig*` in every tf script
  under the workspace folders.
- Rename: a macro you defined, with its `/def` names, calls and `${name}`/`$name`
  substitutions across the files on the load path. Built-ins, `/@name` calls and tf library
  macros are refused with a reason.
- Hover reads the installed `tf-help` (beside `stdlib.tf`) for each command's usage and first
  description paragraph, including library macros such as `/alias`. A hand-written
  `commandDescriptions.ts` entry still takes precedence. Text from tf files and `tf-help` is
  Markdown-escaped, so placeholders like `<name>` are no longer dropped by the editor.
- Signature help (`onSignatureHelp`, on space): the usage synopsis of the command whose
  arguments you are typing, with the current argument highlighted. Works after `%;`, on
  continuation lines, in a `/def` body and after `/then`/`/else`; uses `tf-help` when
  installed, and a `;;; /name ...` line above your own `/def`s.
- Semantic highlighting (`semanticTokens/full`): keywords, your macros and their `/def`
  names, tf commands and library macros, `${name}` macros, and `%` parameters versus variables,
  resolved along the load path and refreshed when another file changes.
- Formatting (whole document or a range): a macro body gets one `%;` statement per `%;\` line,
  `/if`/`/while` children indented a level, and continuation lines re-indented. Only whitespace
  tf ignores is changed, and each entry is checked by joining it again. New setting
  `tfscript.format.splitStatements` (default on) turns the splitting off.
- Completion beyond command names: tf's expression functions (from `funclist.h`, with
  synopses from htmldoc) and special variables (from `varlist.h`, with their types, defaults and
  enum values) inside `$[...]`, `/if (...)`, `/test` and the like; `%{` selectors and
  variables; variable names after `/set`/`/unset`; an enum or flag variable's values after
  `/set name=`; and your own macros and the variables your scripts set. Nothing inside comments
  or strings.
- Signature help inside function calls (`regmatch(|`), and hover for functions, special
  variables and `%{...}` selectors, with descriptions from the installed `tf-help`.
- Load contexts: new settings `tfscript.contexts` (named entry-file lists, one per way tf is
  started) and `tfscript.activeContext`. Each context has its own load path; a file is seen
  through the active context when it loads the file, else the first that does. VS Code shows the
  context and its load chain in the status bar, and **tfscript: Choose Load Context** switches it.
- New `reserved-macro-name` diagnostic: tf refuses `/def` of a keyword or `eval` ("is a reserved
  word"). Navigation, hover, signature help and highlighting no longer treat such a `/def` as
  defining anything, and hover no longer claims a macro can shadow a keyword.
- New `bad-substitution-selector` diagnostic: `%{foo%{bar}}` is an error in tf (nesting only
  works through a `-` default value).
- `load-no-expansion` no longer flags `/alias` bodies, or a `%{...}` after an `/eval` inside a
  joined top-level `/if`.

## 0.1.0

First release.

- Diagnostics for seven tfscript pitfalls proven against real tf: `if-multiline-top-level`,
  `load-no-expansion`, `let-swallows-endif`, `dollar-bracket-in-if`,
  `indented-line-after-command`, `trailing-space-after-backslash`, and
  `bare-line-after-command`.
- CRLF line endings are modelled correctly (a `\<CR>` does not continue a line, matching real
  tf), as is a trailing `\` at the true end of a file (dropped silently, not an abort).
- Command-name completion (`onCompletion`), sourced from tf's keyword, builtin, and stdlib
  macro tables.
- A VS Code extension (`editors/vscode/`): `.tf` file association, basic syntax highlighting,
  and the diagnostics/completion above, with no Node or npm needed to run it — download
  `tfscript-vscode.vsix` from this release and `code --install-extension` it.
- No hover, go-to-definition, or formatting yet.
