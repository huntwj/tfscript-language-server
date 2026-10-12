# tfscript-language-server

A language server for tfscript, TinyFugue's macro language. Private and early: diagnostics
for the handful of rules proven so far, nothing else yet.

## Why this needs its own parser

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

That directory belongs to the "tf dev" project (`~/ai/mud`), not this one — read it, don't
edit it. If a diagnostic here needs a new proven rule, that's a case to add there first (or a
message to that session).

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
| 4 | `load-no-expansion` | `%{var}` in a top-level command (not expanded; needs `/eval`) |
| 5 | `let-swallows-endif` | `/let`/`/set` swallowing a following `/if` or `/endif` into its value |
| 6 | `dollar-bracket-in-if` | redundant `$[...]` inside an `/if (...)` condition |
| — | `indented-line-after-command` | an indented line starting a new command right after one that didn't end in `\` — tf's own "possibly missing trailing \\" warning |
| — | `trailing-space-after-backslash` | a final `\` followed by whitespace — not a continuation, tf warns and runs the line as-is |
| — | `bare-line-after-command` | a line that is not blank, a comment, or a `/command` — tf aborts the rest of the file's load; everything after it is suppressed from the other rules, since tf never reads it either |

`src/logicalEntries.ts` is the part worth reading first: it models the two facts about tf's
file loader (`tinyfugue/src/command.c`'s `load_file()`) that the rules above depend on,
confirmed by reading that function and then checking live with `tf-script-check`, not from
scripting.md alone:

- a line is a comment, contributing nothing, when its first non-whitespace character is `;`
  or `#` — not only the `;;` convention the test-case headers use;
- a trailing `\` continues a top-level line onto the next one **generally**, not only inside
  `/def` bodies as scripting.md's rule 3 implies. A plain `/if (1) \` / `/echo yes%; \` /
  `/endif`, no `/def`, three physical lines, loads clean.

Rules 1 and 3 aren't diagnostics by themselves — rule 1 (parsed at run time) is why rule 2
can still fire usefully inside a `/def` body, and rule 3 is folded into the general
continuation handling above rather than kept as a `/def`-only exemption.

Known limitations: rule matching is heuristic (token/paren scanning, not a real grammar), the
`%;` command separator is split on literally (not quote- or brace-aware), and nested `/if`
ordering inside one entry isn't tracked, only counted.

## Layout

```
src/
  logicalEntries.ts   splits a document into tf's "one command per (joined) line" units
  rules/              one file per diagnostic rule, plus the shared Rule type
  diagnostics.ts       runs every rule over every entry, maps offsets back to positions
  server.ts            LSP server entry point (stdio), wires diagnostics to didOpen/didChange
test/
  diagnostics.test.ts   unit tests per rule
  logicalEntries.test.ts  regression tests for comment lines and backslash continuation
  indentedLineAfterCommand.test.ts, trailingSpaceAndAbort.test.ts  unit tests for the three
                        whole-file rules, including the abort-truncation behaviour
  groundTruth.test.ts   runs every case in ~/ai/mud/tests/tfscript/cases/ through this
                        engine and checks it against that file's own ;; expect: header
  wotmudCorpus.test.ts  regression guard over ~/ai/wotmud/tf/*.tf (real, in-use scripts from
                        a sibling project; read-only, never edit that repo from here)
scripts/
  check-corpus-live.js  slow, Docker-backed: cross-checks this engine against real tf
                        (tf-script-check) for each configured corpus. Not part of `npm test`.
```

## Use

```sh
npm install
npm run build          # tsc -> dist/
npm test               # vitest, fast, no Docker
npm run test:corpus-live  # slow: needs Docker, cross-checks real tf scripts against real tf
```

### Testing against real scripts

Two layers, matching ~/ai/mud's own fast-loop/slow-run split:

- **Fast (`npm test`):** `wotmudCorpus.test.ts` runs this engine over `~/ai/wotmud/tf/*.tf`
  (a sibling repo of real, in-use WoTMUD scripts — read-only, owned by the WoTMUD session)
  and asserts it doesn't crash and stays clean, matching what real tf says today. This is a
  regression guard, not an oracle: it can't ask tf anything new, it just catches a rule that
  starts misfiring on real scripts.
- **Slow (`npm run test:corpus-live`):** `scripts/check-corpus-live.js` actually asks real tf,
  via `tf-script-check`, mounting the corpus's repo read-only and loading its real entry
  point (so `/load` chains and `%{var}`-built paths resolve exactly as they do for a real
  user), then compares that verdict against this engine's own. Needs Docker; add a corpus to
  the `CORPORA` list in that script for another sibling project's scripts.

Nothing wires this into an editor yet. `dist/server.js` speaks LSP over stdio
(`textDocument/didOpen`, `didChange` -> `textDocument/publishDiagnostics`); a client config
(VS Code extension, Neovim, etc.) is future work, in the order scripting.md's roadmap entry
lays out: diagnostics first (here), then completion/hover from tf's own command/function/
variable tables, then go-to-definition for `/def` across `/load`, then formatting.

Licence: not decided.
