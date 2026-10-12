# Changelog

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
