# tfscript-language-server

A language server ([LSP](https://microsoft.github.io/language-server-protocol/)) for
tfscript, the macro language of [TinyFugue](https://tinyfugue.sourceforge.net/) (`tf`), a
terminal MUD client. tf scripts are `.tf` files full of `/def` macros, triggers, and hooks.

This is early, pre-1.0 software: diagnostics for the handful of rules proven so far (below),
command-name completion, document symbols (an outline of every `/def`, `/alias`, `/bind`,
`/hook` and `/trig*`), folding, quick fixes for two of the diagnostics, and single-file hover,
go-to-definition and find-references for macros. Nothing follows `/load` across files yet, and
there is no formatting. There is a VS Code extension (`editors/vscode/`) for syntax
highlighting plus everything the server does; other editors can wire up the stdio server
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

Diagnostics for seven of the proven rules, each a pure function in `src/rules/`, under one of
two shapes (`src/rules/types.ts`): an `EntryRule` scans one `LogicalEntry` and returns offset
ranges into its joined text (four rules); a `FileRule` scans the whole file's raw lines and
returns positions directly, for the two line-by-line state machines that mirror
`load_file()`'s own `new_cmd`/`last_cmd_line` tracking (`indented-line-after-command`,
`trailing-space-after-backslash`). `diagnostics.ts` drives both kinds through one loop.
`bare-line-after-command` is the one exception, wired by hand rather than through that loop:
it doesn't just report a diagnostic, it also decides where every other rule's view of the
file gets truncated, since tf never reads past the line it aborts on.

| Rule | id | What it catches |
| --- | --- | --- |
| 2 | `if-multiline-top-level` | `/if` with no matching `/endif` in the same top-level command |
| 4 | `load-no-expansion` | `%{var}` in a top-level command (not expanded; needs `/eval`, or being inside a `/def`/`/for`/`/bind`/`/hook`/`/trig`-family body) |
| 5 | `let-swallows-endif` | `/let`/`/set` swallowing a following `/if` or `/endif` into its value |
| 6 | `dollar-bracket-in-if` | redundant `$[...]` inside an `/if`/`/elseif`/`/while` condition |
| — | `indented-line-after-command` | an indented line starting a new command right after one that didn't end in `\` — tf's own "possibly missing trailing \\" warning |
| — | `trailing-space-after-backslash` | a final `\` followed by whitespace (including a CRLF file's trailing `\r`) — not a continuation, tf warns and runs the line as-is |
| — | `bad-substitution-selector` | `%{selector}` followed directly by another `%`/`$` substitution (`%{foo%{bar}}`) — tf errors "unmatched { or illegal character"; nesting only works through the default value, `%{foo-%{bar}}` |
| — | `bare-line-after-command` | a line that is not blank, a comment, or a `/command` — tf aborts the rest of the file's load; everything after it is suppressed from the other rules, since tf never reads it either |

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

## Command data (drives completion; hover not wired up yet)

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
empty one just shows no description. A macro defined in the file being edited documents
itself: hover shows the `;;;` comment lines directly above its `/def` (stdlib.tf's own
convention), so `;;` notes and commented-out `;/` code are left out.

The `src/data/*.generated.ts` files are produced by `scripts/extract-command-tables.js`
from a sibling `tinyfugue/` checkout (run `npm run build` first, then
`node scripts/extract-command-tables.js`, by hand after a tinyfugue update) and checked in,
so the server itself never needs that checkout at runtime. `test/commandsData.test.ts`
re-parses the same sources directly (not through `dist/`, so it never needs a prior build),
when present, and fails on drift — the same sync-check shape as the private notes repo's own
`tinyfugue.pin.json`.

`src/completions.ts` wires this into `onCompletion`: right after typing `/` and an optional
partial word, the server offers every known command name (lowercase, matching how every real
script actually writes them, even though the source tables store uppercase). No `onHover` yet,
and no completion for anything other than command names — a fourth data source (`expr.c`'s
expression functions and `variable.c`'s special variables) is still needed for that.

## Layout

```
src/
  logicalEntries.ts   splits a document into tf's "one command per (joined) line" units
  rules/              one file per diagnostic rule, plus the shared Rule type
  diagnostics.ts       runs every rule over every entry, maps offsets back to positions
  server.ts            LSP server entry point (stdio): diagnostics on didOpen/didChange,
                        command-name completion, document symbols, folding ranges, code actions
  completions.ts        pure getCommandCompletions(linePrefix), used by server.ts
  symbols.ts           getDocumentSymbols(text): one symbol per macro-defining entry; /def
                        names follow macro.c's macro_spec() option grammar
  folding.ts           getFoldingRanges(text): continued entries and comment runs
  codeActions.ts       getCodeActions(text, range): quick fixes for the diagnostics that
                        have a mechanical remedy (recomputed server-side)
  navigation.ts        getHover / getDefinition / getReferences: single-file macro lookup
                        (case-insensitive, like tf); /@name always means the built-in
  data/                command names, usage synopses and descriptions for completion/hover
                        — see "Command data" above
test/
  diagnostics.test.ts   unit tests per rule
  logicalEntries.test.ts  regression tests for comment lines, backslash continuation, and CRLF
  completions.test.ts   unit tests for getCommandCompletions
  symbols.test.ts, folding.test.ts, codeActions.test.ts, navigation.test.ts  unit tests for
                        the four above
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

The server advertises `completionProvider` (triggered on `/`), `documentSymbolProvider`,
`foldingRangeProvider`, `codeActionProvider` (quick fixes only), `hoverProvider`,
`definitionProvider` and `referencesProvider`, and publishes diagnostics
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

Following scripting.md's roadmap order: diagnostics done, completion started (command names;
expression functions and special variables still needed), single-file document symbols,
folding, quick fixes, hover, go-to-definition and find-references done, then following
`/load`/`/require` for cross-file definitions, references and rename (needs a workspace
symbol table), then formatting.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — short version: a new diagnostic needs a case run
against real tf first, and that harness is a private, sibling project, so open an issue with
your script and tf's actual output rather than a PR straight to a new rule.

## Licence

MIT — see [LICENSE](LICENSE).
