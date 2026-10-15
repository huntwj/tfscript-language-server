# Changelog

## Unreleased

- The repo is an npm workspaces monorepo: the analysis is `packages/core` (`@tfscript/core`, with
  no LSP dependency) and the server `packages/server`, still published as
  `tfscript-language-server` with the same `main` and `bin` (not yet on npm: it needs core
  bundled in or published first). Built from a checkout, the server is
  now `packages/server/dist/server.js` rather than `dist/server.js`, so an editor pointed at the
  old path needs the new one. What the server does is unchanged.
- Each diagnostic's code is a link to its entry in `docs/rules.md`, the rules of tf grouped by
  where they come from (R1 Lines to R9 Load paths), each with the tf source and cases that prove
  it and the fix. Hovering a diagnostic now ends with what its code means. Both come from one
  table, `packages/core/src/rules/table.ts`, which the README's rule table is generated from too.
- `invalid-macro-name` replaces `reserved-macro-name`, and adds tf's "illegal macro name": a
  name starting with `#`, `@`, `!` or `/`, or holding a space or tab. tf reads the name up to the
  first `=`, so a `/def` whose `=` was left out (`/def greet /echo hi`) is one of these, and the fix
  puts the `=` after the first word. `/@def` and `/!def` are checked too; a `/def` with an option
  tf rejects isn't, as tf stops at the option.
- `empty-statement` replaces `separator-sends-blank-line`, and covers every statement with
  nothing in it, which tf sends to the world as a blank line: a `%;` after another separator,
  after `/then` or `/do`, before a body's first command, before the `)` of a `$(...)`, and in an
  `/eval`, `/repeat` or `/for` text, as well as after a `(condition)` or `/else`. tf warns about only
  the last two (and about one in a condition list); the message says which. A `%;` at the very end
  sends nothing and isn't flagged, nor is anything after a `/break`, `/return` or `/result`.
- `missing-continuation` replaces `if-multiline-top-level`, and covers `/while` and condition
  lists too (a top-level `/while` cut off at the end of its line was a `block-structure` error).
  One missing `\` used to give two or three diagnostics: the opener, a stray `/endif` and an
  indented-line warning. It is now reported once, at the opener, naming the line that was cut
  off, with the stray keywords and indented lines as related locations; its join fix is offered
  on each of them.
- Renamed: `trailing-space-after-backslash` is now `backslash-not-last`, and
  `bare-line-after-command` is now `not-a-command` (it fires on any line, not only after a
  command).
- `body-continues-without-backslash` (information): a macro body whose last line ends in `%;`
  but not `\`, with a command on the next line, which runs once as the file loads instead of
  being part of the body.
- The `/if` and `/while` hovers state the general rule: in a file, every command ends at the
  end of its line unless the line ends in `\`, so a block has to be complete within one command.
- `load-no-expansion` is now `not-substituted-here`, built on one table of which text tf reads at
  which substitution level (`src/substitution.ts`). It no longer flags what tf does substitute: a
  `%{x}` in a top-level condition or `/test` (an expression reads it as a variable), in a `/repeat`'s
  command, or in an `/eval` inside a top-level `/if`. It now flags a `%{x}` under `/eval -soff` or
  `-son`, and a `%var` in a top-level `/load` or `/require` path, and notes (as information) a `%;`
  with more after it on a plain top-level line, where it doesn't separate. Information no longer
  counts as a problem in the ground-truth test or the live corpus check.
- `not-substituted-here` also flags a `%{x}` inside a string in a condition or `$[...]`, which
  nothing substitutes, even in a macro body (a `$(...)` there runs as a macro body, so its quotes
  are text), and reads the command after `/quote`'s backquote and `/at`'s command as a macro body.
  In `/eval` or `/quote` `-soff` or `-son` text its fix leaves out the `-s`, or for a `%;` gives
  `-son` when a command follows. A `%;` in a `/set`, `/let` or `/setenv` value is noted without a
  fix, since a value can hold one on purpose.
- `/@def`, `/@bind` and `/@hook` are read as the builtins they are, with a macro body.
- `unclosed-substitution` is split in two, by what tf can't read:
  - `substitution-syntax` covers a `%{`, `%-`, `${` or `$(`, and absorbs
    `bad-substitution-selector` (a substitution glued onto a `%{` selector).
  - `expression-syntax` covers a `$[`, a string, a parenthesis or a condition.

  Both now look wherever tf substitutes, `/eval`, `/repeat`, `/at`, `/quote` and `/for` text
  included. `bad-substitution-selector` no longer flags a plain top-level line, which prints
  `%{foo%{bar}}` as it is. A top-level `/test` whose text holds a `$`, `%` or `\` is checked too:
  tf compiles it as written, so `/test $[1+2` is "unmatched $[".
- `dollar-bracket-in-if` is now `substitution-in-expression`. It covers a `$[...]` operand in every
  expression tf compiles: a top-level `/test`, a `$[...]` inside another, and `/return` and
  `/result`. It also covers a `%x` or `%{x}` operand, which tf warns "can be confusing"; its fix
  writes `{x}`.
- `not-substituted-here` ends a `%{...}` where tf does: `%{x-%{y}}` is one, and `%{x-{} and %{y}`
  is two, since a default ends at the first `}` a nested substitution doesn't take. It leaves a
  `%{foo%{bar}}` alone. Its fixes (put `/eval` in front, leave out `-s`) are offered only for a
  command of plain variable substitutions; one holding anything else `/eval` would compile, such
  as a `$[...]`, a `%;` or a `\`, gets the warning without the fix or the promise. Where the command
  holds a `%{`, `${` or `$(` tf can't read at all, the message says `/eval` would reject it and
  names what to fix first.
- `keyword-mid-statement` takes in `let-swallows-endif` and `block-structure`'s keyword stuck
  mid-statement (`/echo a /endif`): one rule for a keyword tf reads as text, because only a
  statement's start can hold one. A `/let` or `/set` value keeps its own wording, `/@set` and
  `/@let` included, and gets the same `%;` before each keyword as any command. An `/if` or
  `/while` in a `/let`, `/set` or `/setenv` value (`/!set` and `/set name value` included) is now
  reported only where tf stops at what it leaves, the `/endif`, `/else` or `/elseif` with no `/if`,
  and a `%;` before it clears that: then the stray is its related location rather than a
  `block-structure` error of its own. Elsewhere it is just text: `/set msg=use /if to branch` was an
  error, and its fix broke the line. A keyword such a value takes in a block that still closes is
  a warning: tf runs `/if (1) /set a=1 /else /set b=2%; /endif` without a word, with the `/else` in
  a's value; where its fix clears what tf stops at, it is the error instead, with the block's own
  closer offered beside it, since the keyword may be meant as text. Only a name tf takes counts
  (`/set /else` is tf's "illegal variable name"), read from the statement's own text. The `%;` fix
  is offered only where it runs as meant, without adding an empty statement or leaving `/set name`
  (a query), and never applied by the join fixes' settle step. Text it makes a statement of its own
  is sent to the world, as text in a body is, and the fix is offered all the same.
- `condition-list-text` (warning): a statement in an `/if`, `/elseif` or `/while` condition list
  that isn't a command, which tf sends to the world each time the condition is tested, as its
  own warning says.
- `keyword-needs-space`: a block keyword glued to a `(` or `/` after it, such as `/if(1)` or
  `/else/echo b`, which tf runs as a command of that whole name. The fix adds the blank, or `%;`
  after `/endif`, `/done` or `/break`; none for `/else(`, `/then(` or `/do(`, which take no
  condition (`/else(1)` asks if `/elseif` was meant), nor where the result wouldn't compile. A
  keyword glued to other punctuation, as in `/endif;`, is a warning, with no fix, unless the
  file's commands define a macro of that name (`/def done:x` is one; a comment, an `/echo`'s text
  or a `/def` after the load aborts isn't). A keyword glued on by a line join (`/endif\` with a
  `/def` on the next line) gets two fixes, a `%;` before the `\` or removing it, the likelier one
  first and preferred; `/break\` gets only the `%;`, as removing the `\` would cut its `/while` off
  from the `/done`; any other keyword glued on so (`/if\`) gets a space before the `\`, unless
  keyword-needs-space withholds its fix there (`/else\` then `(1)`). The line joined on is the next
  one that isn't a comment, as tf reads it, and the message names the whole word tf reads, on
  through each further join (`/endif/g/echo`). Where a `%;` follows the condition (`/while(0)%;`),
  the advice also asks for a command between the `)` and the `%;`.
- `block-structure` and `missing-continuation` add no closer after the closer itself with a `\`
  that a CR or whitespace cuts off (`/endif\` and a CR), nor where the closer is glued onto a keyword
  before it (`/break/done`): in tf the closer failed when the macro ran. Elsewhere it is offered as
  before. Where keyword-needs-space withholds its fix across a line join, its advice says the space
  goes before the `\`, since tf strips a blank at the start of the next line. `not-substituted-here` no longer notes the `%;` on a line starting `/if(`, and the
  undefined-macro check doesn't look for a macro named `if(1)`.
- Fixes are offered where the text after them becomes a statement of its own, which tf sends to
  the world as it does text in a body: `block-structure`'s `%;` after an `/endif` before text,
  `not-substituted-here`'s `-son` before text in `/eval` text, and `substitution-syntax`'s `}` for a
  `%{` cut short by a separator. `not-substituted-here` no longer offers to put the next command on
  a line of its own across a `\`, which left the `\` behind.
- "Inline /foo" (`refactor.inline`): replaces a `/foo` call in a macro body with foo's body, and
  "Inline all calls to /foo and remove it" does that for every call in the file and deletes the
  `/def`. It is shown disabled, with the reason, when the body wouldn't run the same in the caller:
  `/return`, `/result`, `/exit`, `/shift`, `getopts()`, `%0`, a `/break` outside the body's own
  loop, a `/let` or new local the caller would see, `regmatch()` with the caller's `%P`, arguments
  other than `%*` (and `%*` itself when the caller is called as a function, `go(...)`), a body
  that makes a local when the call is inside a `/while`, `/!foo`, a call in `$(...)` or a
  condition, a macro that may have another `/def` (or is in tf's library, made to be redefined),
  and recursion.
- `block-structure` reports a `/break` inside `$(...)` that would jump out of it: one that would
  end a loop opened outside the `$(...)`, which tf dev rejects when it compiles the macro, and one
  with no loop (or too few) to end inside it, which compiles but stops the macro with an internal
  error when it runs.
- "Extract to a new macro" (`refactor.extract`): moves selected statements, or whole `/if` and
  `/while` blocks, of a macro body into a new `/def` above it and calls it, passing the arguments
  on with `%*`. It is shown disabled, with the reason, when the call wouldn't run the same: a
  `/let`, or an assignment to a name with no local, that the rest of the macro needs, `/return`,
  `/result`, `/exit`, `/shift`,
  `getopts()`, `%0`, a `/break` out of the selection, `regmatch()` whose `%P` is read afterwards,
  a `%|` beside the selection, a tab that would move, a local the selection reads across a
  `/while`'s turns, or argument reads moved out of a macro called as a function (whose arguments
  `%*` would split again).
- Call hierarchy for macros: who calls a macro (in every tf script in the workspace folder and on
  the load path, or every folder for a library macro, grouped by the macro, trigger, hook or file
  top level each call is in, and only calls that run that `/def` from the caller's load path) and
  what it calls. Calls are what tf runs: `/name` statements, and `name(...)` in an expression
  (stdlib's `/expr` included) when name isn't a builtin function.
- Find-references, highlights and rename count `name(...)` and `{name}(...)` calls as uses of the
  macro; rename refuses a new name tf couldn't call that way, and one another macro already has
  (ignoring case, as tf does).
- "N references" above each `/def`, opening the references peek, for a client that passes a
  `showReferencesCommand` in its `initializationOptions` (the VS Code extension does);
  `tfscript.codeLens.references` turns them off.
- Expand and shrink selection: from the word under the cursor out through a substitution
  (`%{x}`, `$[...]`, `$(...)`, `${...}`), a string or parenthesis in an expression, a condition, the
  statement, a part of a block's body and the whole `/if` or `/while`, the macro body, the whole
  command across its continuation lines, and the file. It follows what tf substitutes, so a
  `%{x}` in a plain top-level command, which tf leaves as text, is just text here too.
- Two refactorings for a macro body: "Split /foo's body onto separate lines" (one statement per
  line, blocks indented, as the formatter lays it out) and "Join /foo's body onto one line". Each
  is offered only when tf would run the same program afterwards, and never on CRLF lines, across
  comment lines, on a command the file ends inside, or where a tab would move to another column.
  They come with an explicit request for code actions or a selection, not in the automatic
  lightbulb.
- `incomplete-continuation` (warning): the file's last command ends in `\`, so tf drops it, with
  a fix that removes the `\`. A final newline no longer counts as a line a `\` can continue onto:
  tf reads no line after it, so such a command is dropped too, and the other rules, the outline
  and formatting now leave it alone.
- Formatting keeps a `%;` that ends a macro body on the body's last line, instead of ending that
  line in `\` and continuing onto an empty one.
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
