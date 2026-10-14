# tfscript-language-server

A language server ([LSP](https://microsoft.github.io/language-server-protocol/)) for
tfscript, the macro language of [TinyFugue](https://tinyfugue.sourceforge.net/) (`tf`), a
terminal MUD client. tf scripts are `.tf` files full of `/def` macros, triggers, and hooks.

This is early, pre-1.0 software: diagnostics for the handful of rules proven so far (below),
completion (commands, functions, variables, selectors), document symbols (an outline of every `/def`, `/alias`, `/bind`,
`/hook` and `/trig*`), folding, quick fixes for many of the diagnostics, and hover,
go-to-definition and find-references for macros and variables across every file your tfrc's
`/load` and `/require` lines reach (see "Load paths"), signature help, semantic highlighting,
highlighting every use of the name under the cursor, workspace-wide symbol search, rename, clickable `/load` and `/require` filenames, and formatting that only
changes whitespace tf ignores. There is a VS Code
extension (`editors/vscode/`) for syntax highlighting plus everything the server does; other editors can wire up the stdio server
directly — see "Use".

## Why every rule here is proven against real tf, not taken from the manual

tf only parses a macro body when it *runs*, not when it is defined (`/def` happily accepts a
body with a syntax error, which only shows up the first time the macro fires). A clean
`/load` proves nothing. So this project does not trust the manual or ordinary scripting
intuition for tf's syntax — every rule it enforces has to be proven first by actually running
tf, in the sibling `~/ai/mud` checkout:

- `~/ai/mud/site/src/content/docs/tinyfugue/scripting.md` — the rules, each backed by a case.
- `~/ai/mud/tests/tfscript/cases/*.tf` — one script per rule, run against real tf.
- `~/ai/mud/scripts/tf_script_check.py` (`just tf-script-check`) — loads a script in a
  throwaway tf container and reports what tf says. This is the ground truth; this repo's own
  diagnostics are tested against it (`test/groundTruth.test.ts` reads that directory directly,
  skipped if it is not present as a sibling checkout).

That checkout is a separate, private project (notes and a regression harness for TinyFugue
itself) — this repo only reads from it, never edits it. It is optional: tests that depend on
it are skipped when it's not present as a sibling directory. If a diagnostic here needs a new
proven rule, that's a case to add there first.

## What's implemented

Diagnostics for the proven rules, each a pure function in `src/rules/`, under one of two shapes
(`src/rules/types.ts`): an `EntryRule` scans one `LogicalEntry` and returns offset ranges into its
joined text; a `FileRule` scans the whole file and returns positions directly, as the line-by-line
state machines that mirror `load_file()`'s own `new_cmd`/`last_cmd_line` tracking do
(`indented-line-after-command`, `trailing-space-after-backslash`). `diagnostics.ts` drives both
kinds through one loop. `bare-line-after-command` is the one exception, wired by hand rather than
through that loop: it doesn't just report a diagnostic, it also decides where every other rule's
view of the file gets truncated, since tf never reads past the line it aborts on.

| Rule | id | What it catches |
| --- | --- | --- |
| 2 | `if-multiline-top-level` | `/if` with no matching `/endif` in the same top-level command |
| 4 | `load-no-expansion` | `%{var}` in a top-level command (not expanded; needs `/eval`, or being inside a `/def`/`/for`/`/bind`/`/hook`/`/trig`-family body) |
| 5 | `let-swallows-endif` | `/let`/`/set` swallowing a following `/if` or `/endif` into its value |
| 6 | `dollar-bracket-in-if` | redundant `$[...]` inside an `/if`/`/elseif`/`/while` condition |
| — | `indented-line-after-command` | an indented line starting a new command right after one that didn't end in `\` — tf's own "possibly missing trailing \\" warning |
| — | `trailing-space-after-backslash` | a final `\` followed by whitespace (including a CRLF file's trailing `\r`) — not a continuation, tf warns and runs the line as-is |
| — | `bad-substitution-selector` | `%{selector}` followed directly by another `%`/`$` substitution (`%{foo%{bar}}`) — tf errors "unmatched { or illegal character"; nesting only works through the default value, `%{foo-%{bar}}` |
| — | `reserved-macro-name` | `/def` of a keyword (`if`, `then`, `let`, `set`, `test`, ...) or `eval`, in any case — tf refuses it ("is a reserved word") and defines nothing. Other builtins can be redefined, so they aren't flagged |
| — | `bare-line-after-command` | a line that is not blank, a comment, or a `/command` — tf aborts the rest of the file's load; everything after it is suppressed from the other rules, since tf never reads it either |
| 10 | `block-structure` | an `/if` or `/while` with no `/endif`, `/done`, `/then` or `/do`; a keyword with no block to belong to; text after `/endif` or `/done` with no `%;`. Points at a keyword stuck mid-statement (`/echo a /endif`) when that is the cause, since tf only reads keywords at the start of a statement |
| 11 | `unclosed-substitution` | a `$[`, `${`, `$(`, `%{`, string or `(` that never closes, and a `%-` naming no selector (`50%-off`), where tf substitutes: in a macro body, a top-level condition, `/test` |
| 12 | `separator-sends-blank-line` | (warning) a `%;` straight after `/if (...)` or `/else`, which sends a blank line to the world |
| — | `nesting-too-deep` | (information) not a problem in tf: a command nesting more than 400 levels deep (each nested `/if`, `/while`, `$(...)`, `$[...]` or `%{name-...}` default is a level), past which the structural check stops; what it read before that still counts |

`if-multiline-top-level`, `block-structure`, `unclosed-substitution` and
`separator-sends-blank-line` share one model of tf's compiler, `src/structure.ts` (`list()`,
`statement()` and the substitution scanners in `expand.c`): it reads keywords only at the start of
a statement, follows nesting, and knows that a top-level line substitutes nothing while a macro
body does. It reports only the first error in a body, as tf stops compiling there.

Every diagnostic has a one-sentence message for the Problems pane, saying the problem and, where
there is one, the fix, and a hover in the style of Rust's compiler errors: the source lines with
the problem underlined, a short explanation, and the lines as the quick fix leaves them. Where
another place takes part, it is a related location, marked and labelled in the hover too (the
`/if` a stray `/else` was meant for, an `/endif` swallowed as text, the line missing its `\`).
Most have a quick fix: a missing `%;`, `/endif`, `/done`, `]`, `}` or `)`; a stray `/then` or `)`;
`%%-` for a literal `%-`; `(...)` for a redundant `$[...]`; `/eval` in front of a top-level
command; deleting the whitespace after a `\`; commenting out a line that isn't a command, or
deleting the byte order mark that stops it being one. A top-level `/if` or `/while` spread over several lines, and an indented line that
looks like it continues the one above, get their lines joined with `\` (`src/joinFix.ts`): how
far to join, and where a joint needs a `%;`, is found by trying it, and a join is only offered if
it leaves no new problem.

The numbered rules are the case numbers in the private notes repo's `scripting.md` (below);
they're kept only so the rule files, their tests, and that document stay cross-referenceable —
nothing reads them back out of this table.

`src/logicalEntries.ts` is the part worth reading first: it models tf's file loader
(`tinyfugue/src/command.c`'s `load_file()`), confirmed by reading that function and then
checking live with `tf-script-check`, not from scripting.md alone:

- a line is a comment, contributing nothing, when its first non-whitespace character is `;`
  or `#` — not only the `;;` convention the test-case headers use;
- a trailing `\` continues a top-level line onto the next one **generally**, not only inside
  `/def` bodies as scripting.md's rule 3 implies. A plain `/if (1) \` / `/echo yes%; \` /
  `/endif`, no `/def`, three physical lines, loads clean;
- every physical line has its leading whitespace stripped before joining, first line
  included — `load_file()` does this unconditionally, not only for continuation lines;
- a file's line reader only breaks on `\n`; a `\r` left over from a CRLF line stays on as the
  line's literal last byte, so `\<CR>` does not continue (confirmed live: a CRLF-encoded
  version of the three-line `/if` example above produced 4 problem lines from real tf, where
  the LF version is clean);
- a trailing `\` at the true end of the file never reaches tf's abort check at all — tf just
  warns "last command is incomplete" and silently drops that command.

`LogicalEntry.isForLoop` and `isOtherMacroBody` are further exemptions from rule 4 found the
same way: a top-level `/for` body gets `%{var}` substituted on every iteration
(`/for i 0 2 /nosuchcmd_%{i}` raised three distinctly named errors, not one — found by running
the tinyfugue/lib/tf corpus check, not a hand-written case), and `/bind`, `/hook`, and
`/trig`/`/trigc`/`/trigp`/`/trigpc` bodies defer substitution exactly like a `/def` body does
(confirmed directly: an undefined `%{x}` in any of their bodies loads with no complaint).
`/while` and `/repeat` are NOT exempted from rule 4 — two ad hoc tries at testing them the same
way gave confusing results that looked like mistakes in the test script rather than real
evidence, so they're left alone rather than guessed at; if either ever produces a false
positive against a real script, that's the next one to actually pin down.

Rules 1 and 3 aren't diagnostics by themselves — rule 1 (parsed at run time) is why rule 2
can still fire usefully inside a `/def` body, and rule 3 is folded into the general
continuation handling above rather than kept as a `/def`-only exemption.

Known limitations: rule matching is heuristic (token/paren scanning, not a real grammar), the
`%;` command separator is split on literally (not quote- or brace-aware), nested `/if`
ordering inside one entry isn't tracked, only counted, and the macro-body exemption above
covers only the commands actually checked against real tf (`/def`, `/for`, `/bind`, `/hook`,
`/trig`-family) — a command like `/at` that plausibly also defers substitution hasn't been
checked and is not exempted. `BUILTIN_COMMANDS` also doesn't distinguish commands that only
exist in a Lua- or Python-enabled tf build (`/calllua`, `/python*`, ...; see
`tinyfugue/src/cmdlist.h`'s `#if LUA_ENABLED`/`#ifdef TFPYTHON` guards) — completion offers
them unconditionally.

## Load paths

A macro is usually defined in a different file from the one that calls it, and often nothing in
the calling file says where: your tfrc `/require`s `alias.tf` and then loads your script, which
just uses `/alias`. So the server replays tf's own startup, the way tf itself would read it:
`stdlib.tf` first, then your tfrc (or whatever entry files you configure), following each
top-level `/load` and `/require` in order (`src/workspace/loadGraph.ts`). A file then knows
every macro defined anywhere on that path. The resolution rules were proven against real tf,
not taken from the manual:

- a relative `/load` path is tried against **tf's current directory, not the loading file's
  directory**, then against each `TFPATH` directory in order — or `TFLIBDIR` when `TFPATH` is
  empty, so a non-empty `TFPATH` must include the library directory for `/require alias.tf` to
  work;
- `/require` skips a file whose `/loaded` token has already run — by token, not filename;
- a top-level line isn't substituted, so `/load %{dir}/x.tf` fails in tf too, while
  `/eval /load %{dir}/x.tf` works; `/set` and `/setenv` commands that run while a file on the
  path loads are tracked so these resolve. One inside an `/if` or `/while` may not run, so unless
  it sets the value the variable already has, the variable is treated as unknown from there on
  (an information note, not a guess).

The same rules make each `/load` and `/require` filename a link to the file tf would open
(`src/documentLinks.ts`). A load that runs while the file loads — a top-level command, or one a
top-level `/eval` runs — in a file the load path reaches links to what the walk found, with any
`TFPATH` or `HOME` a tfrc set before it. A load in a macro body runs whenever the macro does, and
nothing is known about a file nothing loads, so those resolve with the settings below. No link
for:

- a filename tf wouldn't find;
- `~user/...`, which tf takes from that user's home directory whenever the user exists. Only
  when there is no such user does tf open a `~user` folder in its current directory instead; a
  link goes to that folder's file if it exists, since the user's home can't be checked;
- one that is substituted when it runs (in a macro body, or under `/eval` at its default level)
  and has a `%`, `$` or `\` to substitute;
- one with a `%{...}` outside `/eval`, which load-no-expansion warns about;
- one with a `\`, so a Windows path like `/load C:\x\a.tf` gets none;
- a load in a `/def` nested inside another macro's body, which is only text until the outer
  macro runs.

Where tf only shortens runs of `%` (inside a top-level `/if` or `/while`, or under `/eval -son`),
the link goes to the shortened name, each level's pass made over what the one outside it left.

Settings (folder-scoped in VS Code; any client can send them through `workspace/configuration`
under `tfscript`):

| Setting | Meaning | When unset |
|---|---|---|
| `entryFiles` | files tf loads after `stdlib.tf`, in order | `.tfrc`, `tfrc` or `tfrc.tf` at the folder root, else `~/.tfrc`, else `~/tfrc` |
| `contexts` | named alternatives to `entryFiles`, one per way tf is started: `{ "wotmud": ["wot.tfrc"], "diku": ["diku.tfrc"] }` | one context, `default`, from `entryFiles` |
| `activeContext` | which of `contexts` files are seen through | the first |
| `libraryPath` | `TFLIBDIR`, holding `stdlib.tf` | the `TFLIBDIR` environment variable |
| `tfPath` | `TFPATH` as tf starts with it | the `TFPATH` environment variable |
| `workingDirectory` | tf's current directory | the workspace folder |
| `homeDirectory` | what `~` means (tf's `HOME`) | your home directory |
| `diagnostics.unresolvedLoads` | warn on a `/load`/`/require` tf wouldn't find (`unresolved-load`) | on |
| `diagnostics.undefinedMacros` | note `/name` calls defined nowhere on the path (`undefined-macro`) | off |
| `format.splitStatements` | when formatting, put each `%;` statement of a macro body on its own line | on |

tf may be started more than one way — a tfrc per MUD or per character — and the same file can be
loaded by several of them, seeing different macros in each. Each entry of `contexts` gets its own
load path, and a file is seen through `activeContext` when that context loads it, else through
the first context that does. In VS Code a status bar item on tf files shows the context in use
and, in its tooltip, the chain of loads that reaches the file; clicking it (or **tfscript: Choose
Load Context**) lists every context, whether and how each loads the file, and sets
`activeContext` for the folder. Other clients can ask the server the same with the
`tfscript/contextInfo` request (`{ uri }`).

Two diagnostics need the whole load path, so they only appear in files a load path reaches:

- `unresolved-load` (warning): a `/load` or `/require` whose file tf wouldn't find, with every
  place tf would try, in order. An `/eval` path built from a variable that isn't set to literal
  text on the path is only noted (information), since tf may well work it out at runtime.
- `undefined-macro` (information, off by default): a `/name` call to something that is neither
  a tf command nor defined anywhere on the path — at top level or inside a macro body, in any
  order. It skips what only looks like a call (paths, globs and regexes, text in double
  quotes, names built at runtime like `/run_%1`) and optional calls guarded by `ismacro`, and
  counts a `/def ~body_%1` as defining every name starting `~body_`. What it can't see are
  macros created by `/eval /def` with a computed name or loaded some other way, which is why
  it's off by default. On tf's own library, with every file loaded, it flags only kbbind.tf's
  `key_*` hooks that are left for you to define.

tf's library files are read from your installation at runtime, never copied into this
package, so their `;;;` doc comments show up in hover without any licensing question. The same
goes for `tf-help` in that directory, the file tf's own `/help` reads: hover takes each
command's usage and first description paragraph from it (`src/workspace/tfHelp.ts`). A macro
from a library file your path never loads still gets a hover, with a hint to `/require` it. A
file no entry path reaches sees only what `stdlib.tf` loads. When a file is reached more than
once, its first load sets its place in the order; every load site is recorded, for a future
"which context is active" choice.

## Command data (drives completion and hover)

`src/data/` is the completion data: `ALL_COMMANDS` (`commands.ts`) lists every
top-level command name this engine knows, each tagged with where it came from. tf's
"commands" are not one table — found while starting this:

- **`keyword`** — the bytecode compiler's own keyword table (`tinyfugue/src/expand.c`):
  control-flow syntax (`/if`, `/while`, `/let`, `/endif`, ...) compiled specially, not
  dispatched like an ordinary command.
- **`builtin`** — the `BuiltinCmd` dispatch table (`tinyfugue/src/cmdlist.h`): the actual C
  command handlers (`/bind`, `/connect`, `/load`, ...).
- **`stdlib`** — `tinyfugue/lib/tf/stdlib.tf`'s own top-level `/def` macros. Not C code, but
  always available, since stdlib.tf loads automatically on startup — and this is most of
  what a user actually types: **`/echo`, `/for` and `/addworld` are stdlib macros, not
  builtins.** A command list built only from the C tables would be missing them.

Hover also shows each command's usage synopsis, from `src/data/commandUsages.generated.ts`,
extracted from `tinyfugue/htmldoc/commands/*.html`. Only the synopses come from there:
TinyFugue's documentation is GPL and this project is MIT, so the one-line descriptions live
in the hand-written `src/data/commandDescriptions.ts` instead. Fill in entries there; an
empty one falls back to the installed `tf-help` when `tfscript.libraryPath` (or `TFLIBDIR`)
points at a tf library, and to no description otherwise. With a library configured, most
entries can simply stay empty. A macro defined in the file being edited documents
itself: hover shows the `;;;` comment lines directly above its `/def` (stdlib.tf's own
convention), so `;;` notes and commented-out `;/` code are left out.

The `src/data/*.generated.ts` files are produced by `scripts/extract-command-tables.js`
from a sibling `tinyfugue/` checkout (run `npm run build` first, then
`node scripts/extract-command-tables.js`, by hand after a tinyfugue update) and checked in,
so the server itself never needs that checkout at runtime. `test/commandsData.test.ts`
re-parses the same sources directly (not through `dist/`, so it never needs a prior build),
when present, and fails on drift — the same sync-check shape as the private notes repo's own
`tinyfugue.pin.json`.

Two more tables come from the same checkout: `functions.generated.ts`, tf's expression
functions from `src/funclist.h` (name, fewest and most arguments, the compile-time option a
few need) with their argument synopses from `htmldoc/topics/functions.html`; and
`variables.generated.ts`, tf's special variables from `src/varlist.h` with their type,
default, and the values an enum or flag variable takes (`enumlist.h`, `variable.c`).

`src/completions.ts` uses all of it, by where the cursor is (`src/expressions.ts`):

- after `/`: tf's command names (lowercase, as every real script writes them, though the C
  tables store uppercase) and your own macros;
- in an expression — `$[...]`, the `(...)` of `/if`/`/elseif`/`/while`, the rest of
  `/test`, `/expr`, `/result` and `/return` — tf's functions (inserted with their
  parentheses, which opens signature help), special variables, the variables your scripts set
  (`/set`, `/let`, `/setenv`, `name := ...`) and your macros, callable as functions;
- after `%{`: the selectors (`*`, `#`, `1`, `-L`, `P0`...) and the variables; after `/set`,
  `/unset` and friends: variable names; after `/set name=`: the values an enum or flag
  variable takes.

Nothing is offered inside comments or string literals. Signature help works inside a function
call too (`regmatch(|` shows `regmatch(s1, s2)`), and hover explains a function, a special
variable (`%{wrap}`, `wrap` in an expression, `/set wrap`) or a selector; the descriptions
come from the installed `tf-help`'s entries for them, as for commands.

## Layout

```
src/
  logicalEntries.ts   splits a document into tf's "one command per (joined) line" units
  rules/              one file per diagnostic rule, plus the shared Rule type
  diagnostics.ts       runs every rule over every entry, maps offsets back to positions
  server.ts            LSP server entry point (stdio): wires everything below to the protocol
  expressions.ts       where the cursor is: a command, a %{...}, a /set, or an expression and
                        the function call in it
  completions.ts        getCompletions(text, position, context) for each of those
  signatureHelp.ts     command and function synopses with the current argument highlighted
  expressionHover.ts   hover for functions, special variables and selectors
  semanticTokens.ts    names coloured by what they resolve to
  formatting.ts        re-indents and splits macro bodies, changing only whitespace tf ignores
  symbols.ts           getDocumentSymbols(text): one symbol per macro-defining entry; /def
                        names follow macro.c's macro_spec() option grammar
  folding.ts           getFoldingRanges(text): continued entries and comment runs
  codeActions.ts       getCodeActions(text, range): each diagnostic's own fix, offered once
                        (recomputed server-side)
  documentLinks.ts     the filename in each /load and /require, as tf parses the command
  joinFix.ts           the fixes that join lines with \, found by trying candidates
  explain.ts           a diagnostic's hover: the source excerpt with its spans marked, the
                        explanation, and the lines after its fix
  navigation.ts        getHover / getDefinition / getReferences: macro lookup (case-insensitive,
                        like tf), across files when given a NavContext; /@name always means the
                        built-in; getDocumentHighlights for the name under the cursor
  variables.ts         findVariables(text): every variable a file names, and whether it is a
                        global or a macro body's own /let (or getopts()) local
  variableNavigation.ts  definition, references, rename and highlights for those
  workspace/           loadGraph.ts (tf's load order, statically), settings.ts (tfscript.*
                        settings and their defaults), workspaceIndex.ts (per-folder graphs,
                        unsaved edits, library files) — see "Load paths" above
  data/                commands, functions, special variables and selectors, with usage
                        synopses and descriptions — see "Command data" above
test/
  diagnostics.test.ts   unit tests per rule
  logicalEntries.test.ts  regression tests for comment lines, backslash continuation, and CRLF
  completions.test.ts   completion in every cursor context
  signatureHelp.test.ts, expressionHover.test.ts, semanticTokens.test.ts, formatting.test.ts
                        unit tests for those modules
  symbols.test.ts, folding.test.ts, codeActions.test.ts, navigation.test.ts  unit tests for
                        the four above
  variables.test.ts, variableNavigation.test.ts, highlights.test.ts  variable scopes,
                        lookups, rename and highlights
  documentLinks.test.ts  which /load and /require filenames link, and where to
  loadGraph.test.ts, workspace.test.ts  load order and path resolution (each rule proven
                        against real tf), settings defaults, cross-file navigation
  tokenize.test.ts       unit tests for extract-command-tables.js's shell-style tokenizer
  indentedLineAfterCommand.test.ts, trailingSpaceAndAbort.test.ts  unit tests for the two
                        whole-file rules plus bare-line-after-command's abort/truncation
                        behaviour (the third FileRule-shaped case, hand-wired — see above)
  groundTruth.test.ts   runs every case in ~/ai/mud/tests/tfscript/cases/ through this
                        engine and checks it against that file's own ;; expect: header
  tinyfugueLibCorpus.test.ts  regression guard over tinyfugue/lib/tf/*.tf — the primary real-
                        script corpus (tf's own bundled scripts; read-only, upstream's)
  wotmudCorpus.test.ts  regression guard over ~/ai/wotmud/tf/*.tf (real, in-use scripts from
                        a sibling project; read-only, never edit that repo from here)
  commandsData.test.ts  sync-checks src/data/*.generated.ts against a sibling tinyfugue/
                        checkout, when present
scripts/
  check-corpus-live.js  slow, Docker-backed: cross-checks this engine against real tf
                        (tf-script-check) for each configured corpus. Not part of `npm test`.
  extract-command-tables.js  regenerates src/data/*.generated.ts from tinyfugue/; run by
                        hand after a tinyfugue update.
```

## Use

```sh
npm install
npm run build          # tsc -> dist/
npm test               # vitest, fast, no Docker
node dist/server.js     # run the server directly (speaks LSP over stdio)
```

The server advertises `completionProvider` (triggered on `/` and `{`), `documentSymbolProvider`,
`foldingRangeProvider`, `codeActionProvider` (quick fixes only), `hoverProvider`,
`definitionProvider`, `referencesProvider`, `documentHighlightProvider`, `signatureHelpProvider` (triggered on space, `(` and `,`), `semanticTokensProvider`
(full documents), `documentFormattingProvider`, `documentRangeFormattingProvider`,
`workspaceSymbolProvider`, `renameProvider` (with prepare) and `documentLinkProvider`, and publishes diagnostics
tagged `source: "tfscript"`. Many editors' LSP clients also pass a `--stdio` flag by
convention — this server doesn't need it (it talks over stdio either way) but accepts and
ignores it.

### VS Code

Download `tfscript-vscode.vsix` from the [latest release](https://github.com/huntwj/tfscript-language-server/releases/latest)
and install it — no Node or npm needed for this path, just VS Code itself:

```sh
code --install-extension tfscript-vscode.vsix
```

To build it from source instead (needs Node/npm only for this build step, not to run the
result — see `editors/vscode/README.md` for why):

```sh
npm install && npm run build       # the root server, first
cd editors/vscode
npm install
npm run package   # -> tfscript-vscode.vsix (bundles its own copy of the server)
code --install-extension tfscript-vscode.vsix
```

### Other editors

Point your LSP client at `node dist/server.js` for `.tf` files. For example, in Neovim with
the built-in LSP client:

```lua
vim.lsp.start({
  name = "tfscript",
  cmd = { "node", "/absolute/path/to/tfscript-language-server/dist/server.js" },
  filetypes = { "tf" },
})
```

### Testing against real scripts

Two layers, matching the private notes repo's own fast-loop/slow-run split:

- **Fast (`npm test`):** a regression guard per corpus — `tinyfugueLibCorpus.test.ts` (primary;
  the 46 scripts bundled with tf itself: stdlib, color, keybinding sets, and the rest) and
  `wotmudCorpus.test.ts` (real, in-use WoTMUD scripts — a Wheel of Time MUD — added afterwards
  to prioritize tf's own scripts first). Both are read-only over sibling repos this project
  doesn't own, and both skip gracefully when that sibling checkout isn't present (for example,
  this repo cloned on its own). Each asserts the engine doesn't crash and stays clean, matching
  what real tf says today. This is a regression guard, not an oracle: it can't ask tf anything
  new, it just catches a rule that starts misfiring on real scripts.
- **Slow (`npm run test:corpus-live`):** `scripts/check-corpus-live.js` actually asks real tf,
  via `tf-script-check`, mounting each corpus's repo read-only and loading its real entry
  point(s) (so `/load` chains and `%{var}`-built paths resolve exactly as they do for a real
  user), then compares that verdict against this engine's own, per file. This script — and
  `extract-command-tables.js` above — only run inside the author's own workspace layout (this
  repo cloned as a sibling of a private `~/ai/mud` notes checkout, with `uv` and Docker
  installed); they're documented so the verification method is visible, not because a
  contributor is expected to run them. This is how the `/for`-body false positive described
  above was found, and how that fix (and several others) was confirmed against all 46
  tinyfugue/lib/tf files plus the 3 WoTMUD ones.

Following scripting.md's roadmap order: diagnostics done, completion of commands, functions and
variables, single-file document symbols,
folding, quick fixes, and hover, go-to-definition and find-references across the load path
done, with command descriptions from the installed `tf-help`, plus workspace symbols,
rename, the load-path diagnostics, signature help, semantic highlighting and formatting.

Workspace symbols cover every macro-defining entry in every tf script under the workspace
folders, whether or not a load path reaches it. Rename changes a macro you defined — its
`/def` names and every `/name`, `${name}` and `$name` in the files on the load path (a bare
`$old` becomes `${new}` if the new name isn't a plain identifier). It refuses tf's built-ins,
`/@name` calls, and macros defined in tf's library, and it does not touch comments (`;;;` doc
lines included) or names inside strings or built at runtime (`/undef name`, `ismacro("name")`).
A script outside the load path that calls the macro is not updated either.

Variables get go-to-definition, find-references, rename and highlights too, read only where tf
reads them. A variable is named by a `/set`, `/setenv`, `/let`, `/unset` or `/export` at the start
of a statement (not in `/echo type /set x`), and read as `%name`, `%{name}` or `%{name-default}`
where tf substitutes: in a macro body, or in `/eval`, `/for` and `/repeat` command text, not in a
plain top-level command or a `/def`'s trigger pattern. An expression (`$[...]`, an `/if`, `/elseif` or `/while` condition,
`/test`, `/result`, `/return`, `/def -E`) also reads `{name}` and a bare `name`, which
`name := ...`, `+=` and `++name` assign, but not the strings in it (`ftime("%Y")`), except in a
body's `/test`, `/return` and `/result`, which tf substitutes first. Names are case-sensitive, as
in tf. `/set`, `/setenv`, `/unset` and `/export` always mean the global; `/let`, and the `opt_`
variables `getopts()` sets, belong to the macro body they're in, and a read in that body once its
`/let` statement has run means the local (`/let x=%{x}-copy` reads the global). `/eval` text and
a `$(...)` get scopes of their own inside the macro's, `/for VAR` makes VAR local to its loop,
and a `/repeat` command or a `/def` inside a body runs on its own later, seeing no local of the
macro around it. So renaming a global leaves a body's own `/let x` alone, and renaming that local
changes only its scope. Definitions include tf's library. Rename refuses tf's special variables,
variables the library uses, `getopts()` variables, a new name tf would read as a selector (`L`,
`R`, `P1`), and a new name that is already taken where the rename would merge two variables or let
a body's `/let` capture the renamed one. tf's scoping is dynamic, so a macro also sees the locals
of the macro that called it; that isn't followed (a body without its own `/let` reads the
global here), and rename refuses a variable that is probably passed on that way: a local whose
name other macros read with nothing setting a global of it, or such a read of a name some macro
has a `/let` of. Positional selectors (`%1`, `%*`, `{#}`) aren't variables, and
names built at run time (`cylon%i`, `%%{stack_%{n}}`) and `/listvar` patterns aren't followed.

Highlighting the name under the cursor marks every use of that variable or macro in the file,
with `/set`s, `/let`s, assignments and `/def` names shown as writes.

Signature help shows a command's usage synopsis while you type its arguments, with the one
under the cursor highlighted. Synopses come from the installed `tf-help` (else the htmldoc
extraction) and, for your own macros, from a `;;;` line starting `/name` directly above the
`/def` (`;;; /greet <name> [<greeting>]`). Matching words to a synopsis is a heuristic: leading
`-` words are options, matched to the bracketed group that names their letter; the rest fill
the positional parameters in order, the last one taking whatever is left; a word starting
with `=` moves to an `= body` part. A macro of yours with no `;;; /name` line shows nothing,
even when it shadows a built-in, since the built-in's synopsis would be wrong for it.

Semantic highlighting colours names by what they resolve to on the load path, on top of the
grammar: control-flow keywords (`/if`, `/then`, `/while`, ...) as keywords; your own macros as
functions, and `/def` names as their declarations; tf commands and library macros as
default-library functions; `${name}` as a macro; tf's positional selectors (`%1`, `%*`,
`%{-L}`, `%{P2}`) as parameters, and `%{name}` and the names `/set`, `/let`, `/setenv` and
`/unset` take as variables. A call to a name defined nowhere keeps the grammar's colour.

### Formatting

Formatting only changes whitespace that tf provably ignores, and checks itself:

- tf strips every line's leading whitespace before joining a `\` continuation, so
  continuation lines can be re-indented, and a `\` line break can be inserted after
  whitespace or a `%;` without changing the joined command.
- Inside a macro body, whitespace on either side of a `%;` separator is dropped when the body
  runs (`/let v=ab %;` sets `ab`, not `ab `). At the top level `%;` is not a separator at all,
  so top-level lines are never split.
- tf turns each tab into spaces as it reads the file, out to the next tab stop of the physical
  line, so a tab after a line's indentation would change width if the line moved. Entries
  containing one are left exactly as written.

In a `/def`, `/bind`, `/hook` or `/trig*` body with more than one statement, each statement
goes on its own line ending `%;\`, and `/if (...)`, `/elseif (...)`, `/while (...)`, `/else`,
`/then` and `/do` start a block whose children are indented one more level; the condition of
`/if list /then` and `/while list /do` stays on one line. Your own line breaks are kept, a line
that continues a statement hangs one level deeper, and `/else`, `/endif` and `/done` line up
with their `/if` or `/while`. A top-level `/if (x) \` block's children are indented one level;
other top-level entries, an entry's first line, comment lines and CRLF files are left alone.
Every rebuilt entry is joined again the way tf does and compared with the original; if anything
but the whitespace beside a `%;` differs, the entry is only re-indented. Formatting tf's own
library and the WoTMUD scripts this way and loading both versions into real tf gave the same
1448 macro definitions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — short version: a new diagnostic needs a case run
against real tf first, and that harness is a private, sibling project, so open an issue with
your script and tf's actual output rather than a PR straight to a new rule.

## Licence

MIT — see [LICENSE](LICENSE).
