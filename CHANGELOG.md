# Changelog

## Unreleased

- `undefined-macro` is on by default and a warning: a `/name` command calling a macro no file on
  the load path, in the workspace or in tf's library defines, with a "did you mean" fix when one
  visible name is a clear typo of it. A macro defined in a file the load path doesn't reach is a
  note with a fix that adds the `/require`; when a load that might define it can't be followed,
  the warning becomes a note naming that load. Only commands tf runs count (not `/echo try
  /foo`), files off every load path are checked too, tf's own library isn't, and
  `tfscript.diagnostics.ignoreMacros` lists names to leave alone.
- Quick fixes now include the load-path diagnostics' (the server passes what it published).
- `tfscript.pathMappings`, for a tf that runs somewhere else (a container, WSL, another host):
  where its absolute paths are here. Loads, links and load-path diagnostics follow it, and a Unix
  path tf won't find that no mapping covers gets a hint to add one.
- `tfscript.variables`: variables with a value when tf starts, as tf sees them, as if `/set`
  after `stdlib.tf`. A value there stands through an `/if`'s or `/while`'s `/set` of it, so the
  default-value idiom `/if (x =~ "") /set x=VALUE%; /endif` leaves it alone, and the note on a
  load built from such a variable says to set it here. With `{ "wotmud_repo_dir": "/wotmud" }`
  and a `/wotmud` path mapping, WoTMUD's `/eval /load %{wotmud_repo_dir}/tf/mapping.tf` is
  followed and linked.
- The server registers its own file watchers, for the workspace's tf files, folders created or
  deleted there, and tf's library, mapped folders and `HOME`; files nothing watches are checked
  against their modification time.
- An `/eval` load whose path is built from variables gets a link when the load path resolved it.
- Variables: go-to-definition, find-references and rename for `/set`, `/setenv` and `/let`
  variables and `getopts()`' `opt_` variables, read as `%name`, `%{name}`, `{name}` or a bare name
  in an expression, only where tf substitutes them (not in top-level commands, trigger patterns
  or an expression's strings). A macro body's own `/let` variable is kept apart from the global
  of the same name, as tf keeps them, and rename refuses a new name that would merge or capture
  variables.
- Document highlight: every use of the variable or macro under the cursor, writes and reads
  marked apart.
- Structural checks, from a model of how tf compiles a macro body (`src/structure.ts`):
  `block-structure` (an `/if` or `/while` left open, a keyword with no block to belong to, text
  after `/endif` or `/done` with no `%;`, pointing at a keyword stuck mid-statement when that is
  the cause), `unclosed-substitution` (`$[`, `${`, `$(`, `%{`, strings and conditions that never
  close, and `%-` naming no selector) and the warning `separator-sends-blank-line` (`%;` right
  after `/if (...)` or `/else`). Each is proven against real tf; over tf's library and the WoTMUD
  scripts they found one real bug, `/session` in `tintin.tf`.
- Richer diagnostics for those rules: a one-sentence message for the Problems pane, related
  locations, a hover with the source lines marked up the way Rust's compiler errors are (the
  problem underlined, related spans labelled), a short explanation and the fixed lines, and a
  quick fix where the remedy is mechanical. Messages no longer quote tf's own error text.
- The older rules (`if-multiline-top-level`, `load-no-expansion`, `let-swallows-endif`,
  `dollar-bracket-in-if`, `indented-line-after-command`, `trailing-space-after-backslash`,
  `bad-substitution-selector`, `reserved-macro-name`, `bare-line-after-command`) get the same
  treatment, and new quick fixes: `(...)` for a redundant `$[...]`, a `%;` before a swallowed
  `/endif` or `/if`, commenting out a line that isn't a command, and joining the lines of a
  multi-line top-level `/if` or `/while`, or an indented line and the one above it, with `\`.
  A CRLF line's `\` gets its own message: the carriage return is what stops it continuing; so
  does a line ending in `%\`, and one starting with a UTF-8 byte order mark, which tf reads as
  text (the fix deletes the mark). The load-path diagnostics (`unresolved-load`,
  `undefined-macro`) get the same style of message; the advice to set `tfscript.workingDirectory` is
  only given for a relative path, and a missing `~/` path is reported as under `HOME` (or as not
  followed, when `HOME` isn't known).
- `dollar-bracket-in-if` no longer flags a `$[...]` inside a `%{name-default}`, `${...}` or
  `$(...)`, where it isn't redundant, and `let-swallows-endif` no longer flags an `if` in a path
  or URL, or an `/endif` with no `/if` open (it now asks the structural model which `/if`s are
  open, so an `/if` that is only text doesn't count).
- The fix that adds an `/endif` or `/done` isn't offered after an empty body, where it would send
  a blank line (or, for `/while`, loop forever).
- `let-swallows-endif` flags one keyword per statement, blaming its first `/let` or `/set` (which
  takes the rest), and only the first swallowed `/endif` per `/if`, so its fixes can all be applied
  together; the fix adds no `%;` where the statement ends anyway (`%\`, `%|`, a `$(...)`'s `)`).
  A swallowed `/endif` is flagged only when its `/if` is never closed: when a real `/endif` closes
  it later, the swallowed one is just text, and tf runs the macro fine; nor once an `/else` or
  `/elseif` follows it, where a `%;` before it would leave that keyword stray (there
  `block-structure` offers to add the `/endif` at the end instead).
- `let-swallows-endif` no longer flags an `/if` written straight after the `=` (`/set x=/if (1)
  ...`): tf stores it as the value and runs on (a command kept for a later `/eval`, say), and when
  it leaves an `/endif` stray, `block-structure` reports that.
- Deeply nested blocks or substitutions no longer overflow the stack: past 400 levels (400 nested
  `/if`s, `/while`s, `$(...)`s, `$[...]`s or `%{name-...}` defaults, in any mix) the structural
  check stops, and says so with an information diagnostic, `nesting-too-deep`. The statements
  read before that point still count, so a `/load` or `/require` before it is still found.
- `if-multiline-top-level` uses the same model, so it follows nesting and no longer counts an
  `/endif` that is only text (`/if (1) /echo /endif`) as closing the `/if`.
- `/load` and `/require` filenames are links (Ctrl+click) to the file tf would open, found the
  way tf searches: the current directory, then `TFPATH` or `TFLIBDIR`, with `~` as `HOME`.
- The load path, and so `unresolved-load` and cross-file navigation, reads load commands the way
  tf runs them (each proven in real tf):
  - a plain top-level line is one command to its end, so `/load a.tf%; /load b.tf` looks for a
    file named `a.tf%; /load b.tf` and is now a not-found warning;
  - `/eval` text is split on `%;` and run statement by statement, so `/eval /load a.tf%; /load
    b.tf` follows both, and `/eval /set d=...%; /load %{d}/x.tf` uses the new `d`; `-s` levels
    are honoured (`-s0` reads the text as one command unless it starts with `/if` or `/while`,
    `-son` splits it without substituting, so `%{x}` stays literal and `%%` becomes `%`), and an
    `/eval` inside a top-level `/if` works on the text the `/if` already shortened;
  - a `/set` inside a top-level `/if` or `/while` may not run, so the variable it changes is
    treated as unknown instead of taking the new value; a load that needs it gets an information
    note saying the check can't tell whether that `/set` runs;
  - `/set x =1` sets `x` to `=1`, as tf does, and `/setenv` is tracked like `/set`;
  - a load only counts at the start of a statement: `/echo hi /load x.tf` and `/test` text are
    no longer followed, nor is anything on a line tf can't compile;
  - `/load` with an option other than `-q` loads nothing, and `-` ends the options;
  - `/require a  b.tf` loads `a b.tf`, its words joined by single blanks;
  - a `~` path is never looked for in `TFPATH`; `~user/...` is looked for as a `~user` folder in
    the current directory (what tf opens when there is no such user), and otherwise gets an
    information note rather than a not-found warning;
  - an `unresolved-load` warning points at its own filename when a line names the same file twice.

## 0.2.0

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
