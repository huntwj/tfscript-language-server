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
