---
name: tf-scripting
description: Use when writing, editing, reviewing or debugging TinyFugue scripts (.tf files, /def macros, triggers, hooks, /load, /log, /eval) - tf's macro language breaks in ways ordinary scripting intuition does not predict, and a script that loads silently can still be broken.
---

<!-- Generated from packages/core/src/rules/table.ts by scripts/generate-rule-docs.js (npm run docs:rules). Edit the table, not this file. -->

# TinyFugue scripting

Do not trust memory or the manual for tf macro syntax. Each rule below was proven by running a script against the real tf (cases in `~/ai/mud/tests/tfscript/cases/`, full page `site/src/content/docs/tinyfugue/scripting.md` in `~/ai/mud`), except what a rule lists as not run. Check every .tf edit against them. The tfscript language server reports the codes named under each rule.

## When code runs

A macro body is parsed when it runs, not when it is defined. `/def` accepts a body with a syntax error, and the error appears the first time the macro fires (for a trigger, on the first line that matches, then on every line). A clean `/load` proves nothing about a macro: run it. The test cases do so with `;; run: /name` lines.

A top-level command of a file runs, and is checked, as the file loads.

## R1. Lines

- tf reads a file one physical line at a time and drops each line's leading blanks. A line whose first non-blank character is `;` or `#` is a comment and is skipped, also in the middle of a continuation. An empty or whitespace-only line runs no command of its own, but it does end a command that a `\` was continuing: the line after it starts a new command.
- A line that ends in `\` (and not in `%\`) is joined to the next one. Otherwise the joined text is one complete command. This applies to every line of a file, inside a `/def` or not.
- So a block (`/if` ... `/endif`, `/while` ... `/done`) must be complete within one command. A multi-line `/if` with its lines left bare is rejected, because `/if` needs its `/endif` in the same command, and an indented second line draws `possibly missing trailing \`.
- Whitespace after a final `\`, including the `\r` of a CRLF file, draws `whitespace following final '\'`, and the line is not continued. A tf that drops that `\r` (`tfscript.tfBuild` set to `fork`) reads a CRLF file like an LF one.
- A command that doesn't start with `/` makes tf print "Invalid command. Aborting." and stop loading the file; it is never sent to a connected world. A byte order mark is not a blank, so a file that starts with one stops at its first line. tf treats such a line as an implicit `/addworld` only in the `~/.tinytalk` file it reads at start-up, never in a `/load`. Text in a `/def` body is different: it is sent when the macro runs.
- A file whose last command ends in `\` draws `last command is incomplete because of trailing \`, and that command is dropped. tf says it after every "Invalid command. Aborting." too, as the aborted command is still held.
- A macro body whose last line ends in `%;` but not `\` ends there: an unindented command on the next line runs once, when the file loads, and tf says nothing.
- tf turns tabs into blanks as it reads a file, out to the next 8-column stop (`%tabsize`) of the physical line, indentation included, before it joins continuations or strips leading blanks, whatever `%expand_tabs` says. So a tab inside a command is stored as blanks, and how many depends on where the line starts: the same `/let s=a<tab>b` gives four blanks in one place and six in another. A tab meant to stay a tab never does. (Upstream's `lib/tf/quoter.tf` had a `[ <tab>]*` in `/qmac` that matched no tab for this reason; our fork writes `[ \\t]*`.)

Fix:

- End every line of a multi-line command but the last with `\`, and separate its statements with `%;`, at the top level and in a `/def` alike.
- Or write the block on one line: `/if (x =~ "") /set x=1%; /endif`.
- Save `.tf` files with LF line endings, and with no blanks after a final `\`.
- Comment out a line that isn't a command with `;`, on every physical line of it.

Codes: `missing-continuation`, `indented-line-after-command`, `backslash-not-last`, `not-a-command`, `incomplete-continuation`, `body-continues-without-backslash`. Cases: `if-multiline-top-level`, `if-oneline-top-level`, `if-multiline-top-level-backslash`, `if-multiline-in-def`, `indented-line-after-command`, `comment-lines`, `trailing-space-after-backslash`, `bare-line-after-command`, `blank-lines-between-defs`, `tab-expanded-on-load`, `missing-continuation-bare-endif`, `missing-continuation-indented-endif`, `missing-continuation-while`, `body-continues-without-backslash`, `incomplete-continuation`, `continuation-ended-by-blank-line`, `continuation-ended-by-whitespace-line`, `bom-is-not-a-blank`, `not-a-command-also-incomplete`, `percent-backslash-not-joined`, `crlf`, `tab-expanded-with-expand-tabs-off`.

Not run: That such a line is an `/addworld` in `~/.tinytalk` (`command.c:606-616`) is read from the source; the cases only show that a `/load`ed file stops.

## R2. Substitution level

- What tf substitutes depends on where the text is.
- A plain top-level command of a file substitutes nothing: only the command word at its start is read. `%{x}`, `%x`, `%;`, `$[...]`, `$(...)` and `\` are stored as typed. `/load %{dir}/x.tf` looks for a file whose name is literally `%{dir}/x.tf`. `/let v=cd %; /echo x` sets `v` to the whole rest of the line and never runs `/echo`. An unclosed `$[`, `%{`, `${` or string there is only text.
- A top-level line that starts with `/if` or `/while` reads `%;` and `%\` as separators for the rest of the line, after its `/endif` or `/done` too, and shortens a run of `%`s by one. Nothing else is substituted there either: a `%{x}` stays as typed.
- A macro body, `/eval` text, the command of a `/repeat`, `/at` or `/quote` (after its backquote) and a `/for` body substitute everything. `/eval -s0` substitutes nothing.
- An expression is evaluated the same at every level: an `/if` or `/while` condition and a top-level `/test` read `%{x}` and `$[...]` as operands. So `/if (%{x} == 5)` works at the top level.
- A `%{x}` inside a string in a condition or a `$[...]` is never substituted, even in a macro body. The text of a `/test`, `/return` or `/result` in a body is substituted at its statement's level first, so a `%{x}` in a string there is substituted; in a top-level `/test` it is not.

Fix:

- Put `/eval` in front of a top-level command that needs a substitution: `/eval /load %{dir}/x.tf`.
- Put several commands in a `/def`, or start the line with `/eval`, to separate them with `%;`.
- In a condition, write the variable's name, `{x}`, not `%{x}`.

Codes: `not-substituted-here`. Cases: `load-no-expansion`, `load-with-eval`, `separator-top-level`, `unclosed-substitution-top-level-text`, `top-level-literal-substitutions`, `top-level-if-line-level`, `repeat-substitutes`, `at-command-substitutes`, `quote-command-substitutes`, `for-body-substitutes`, `expression-operand-top-level`, `string-substitution-body-test`, `string-no-substitution-in-expressions`, `while-reads-variable`, `return-result-substituted`, `separator-percent-backslash-top-level-if`.

## R3. Statements and keywords

- A statement runs to the next `%;`, `%|` or `%\`, or to the `)` that closes its `$(...)`.
- tf reads a keyword (`/if`, `/then`, `/elseif`, `/else`, `/endif`, `/while`, `/do`, `/done`, `/break`, `/let`, `/set`, `/setenv`, `/test`, `/return`, `/result`, `/exit`) only at the start of a statement. The first command of a statement takes everything up to the separator: `/let`, `/set` and `/setenv` as their value, `/test`, `/return` and `/result` as their expression, and any other command as its arguments. `/let name value`, with no `=`, takes it too.
- So `/if (1) /echo yes /else /echo no /endif` is one `/echo` whose text happens to contain `/else` and `/endif`, and the `/if` is never closed ("expected /endif, found end of body" when the macro runs). With a `%;` before the `/endif` the same line is valid, and quietly wrong: the `/else` branch does not exist. In `/if (c) /let v=1 /endif` the `/endif` becomes part of the value.
- The same goes for a condition list: `/test` reads its expression up to the next `%;`, so it is `/if /test x%; /then ...`, never `/if /test x /then ...`. A statement in a condition list that isn't a command is sent to the world each time the condition is tested, and tf warns "statement starting with 'x' in /IF condition sends text to server".
- tf reads a keyword up to a blank, a `%` or a `)`, so `/if(1)` runs a command named `if(1)` and finds none ("if(1): no such command or macro").
- tf also rejects a keyword with no block to belong to ("unexpected /ENDIF in outer block"), text after `/endif` or `/done` with no `%;` ("expected end of statement after /endif"), and a `/break` without a positive number of loops ("expected positive integer"). It reports only the first error in a body, as it stops compiling there.
- A name that only starts like a keyword is not one: `done:x`, `if!x` and `then?` are macro names, and such macros can be defined and run.

Fix:

- Put `%;` before every keyword that starts a statement: `/let v=1%; /endif`, never `/let v=1 /endif`.
- Put a blank after a keyword: `/if (1)`, not `/if(1)`.
- Write a condition list's statements as commands: `/if /test x%; /then ...`.
- Put `%;` between `/endif` or `/done` and whatever follows it.

Codes: `keyword-mid-statement`, `condition-list-text`, `keyword-needs-space`, `block-structure`, `nesting-too-deep`. Cases: `let-swallows-endif`, `let-with-separator`, `block-structure-keyword-mid-statement`, `block-structure-keyword-as-text`, `block-structure-stray-keyword`, `block-structure-text-after-endif`, `block-structure-condition-list`, `block-structure-condition-list-ok`, `block-structure-top-level`, `keyword-mid-statement-set-value`, `keyword-mid-statement-setenv`, `keyword-mid-statement-let-no-equals`, `condition-list-text`, `keyword-needs-space`, `keyword-glued-macro-names`, `break-needs-positive-number`, `only-first-error-in-body`.

## R4. Separators and escapes

- Where tf separates statements (a body, or a top-level `/if` or `/while` line), only a single `%` before `;`, `|` or `\` does it: `%;` and `%\` separate, and `%|` pipes.
- Blanks beside `%;` in a body do not count: `/let v=ab %; ...` sets `ab`, not `ab `, and `/a %; /b` and `/a%;/b` run the same.
- A run of two or more `%`s is text, and tf drops one `%` of it, so `%%;` and `%%%;` don't end a statement. `\%;` is text too.
- Quotes do not protect a `%;` outside an expression: `/set q="a%; /set r=b"` is two commands.
- At the top level of a file `%;` is not a separator at all (R2).

Fix:

- Separate statements with one `%;`.
- Write `%%;` for a literal `%;` in a body.

Codes: none of its own. Cases: `separator-blanks-in-body`, `separator-literal-forms`, `separator-percent-backslash`, `separator-percent-runs`.

Not run: That `%|` pipes one statement's output into the next is read from the source; no case runs it.

## R5. Empty statements

- An empty statement sends a blank line to the world each time it runs: a `%;` straight after another separator, after `/then`, `/do`, `/else` or a `(condition)`, or at the start of a body. A `%;` at the very end sends nothing.
- tf warns about some of these when it compiles the body: after a `(condition)` or `/else` it says "sends blank line to server".

Fix:

- Delete the `%;` that ends the empty statement: `/if (x) /echo a%; /endif`, not `/if (x)%; /echo a%; /endif`.

Codes: `empty-statement`. Cases: `separator-sends-blank-line`, `empty-statement-double-separator`, `empty-statement-after-then`, `empty-statement-after-do`, `empty-statement-after-else`, `empty-statement-body-start`, `empty-statement-trailing`.

## R6. Substitution syntax

- Where tf substitutes (R2), a substitution must be complete. `%{name` needs its `}` before any blank or `%;`; after the name comes `}` or `-default`. Another substitution can only nest through the default: `%{foo-%{bar}}`, not `%{foo%{bar}}`.
- `%-` always starts a substitution (`%-1`, `%-L`), so `50%-off` in a body is "illegal character '-' in substitution": write `50%%-off`.
- A `${` or `$(` must close too ("unmatched ${", "unmatched (").
- A plain top-level command substitutes nothing, so there all of these are only text.

Fix:

- Close every `%{`, `${` and `$(`.
- Nest through the default: `%{foo-%{bar}}`.
- Write `%%-` for a literal `%-`: `50%%-off`.

Codes: `substitution-syntax`. Cases: `unclosed-substitution-percent-brace`, `unclosed-substitution-percent-dash`, `unclosed-substitution-dollar-brace-paren`, `substitution-syntax-glued-in-body`, `substitution-syntax-top-level-glued`.

## R7. Expressions

- In an expression (a condition, `/test`, `/return`, `/result` or `$[...]`), a string is delimited by `"`, `'` or a backquote and must be closed ("unmatched \" in string literal"), parentheses must balance, and a `$[` must close ("unmatched $["). Strings only count inside an expression.
- In a macro body these are errors when it runs, and in a top-level condition or `/test` as the file loads.
- A condition is already an expression, so a `$[...]` inside one is redundant: tf warns "$[...] substitution in expression is legal, but redundant", in a top-level `/test` and nested in another `$[...]` too. A `%{x}` there draws "legal, but can be confusing. Try using {x}". tf prints each once per session unless `%pedantic` is on. A body's `/test` text is substituted before it is compiled, so `/test $[3]` in a body draws nothing.

Fix:

- Write the plain expression in a condition: `/if (strstr({P0}, "x") >= 0)`, not `/if ($[strstr({P0}, "x")] >= 0)`.
- Write `{x}`, not `%{x}`, for a variable in an expression.

Codes: `expression-syntax`, `substitution-in-expression`. Cases: `dollar-bracket-in-if`, `if-expression-plain`, `unclosed-substitution-dollar-bracket`, `unclosed-substitution-string`, `unclosed-substitution-condition`, `expression-syntax-top-level-test`, `substitution-in-expression-warns`, `substitution-in-expression-body-test`, `substitution-in-expression-once-per-session`.

## R8. Macro names

- A macro cannot be named after a keyword or `eval`. `/def if`, `/def SET`, `/def let`, `/def test`, `/def eval` and the rest of the keyword table are refused with `"SET" is a reserved word.`, in any case, and nothing is defined, so `/set` keeps meaning the keyword.
- A name that starts with `#`, `@`, `!` or `/`, or holds a space, is refused as an "illegal macro name". A `/def` with its `=` left out (`/def greet /echo hi`) has a space in its name.
- Other builtins can be redefined: `/def quote` and `/def lcd` only draw "conflicts with the builtin command", and the macro then runs.

Fix:

- Name macros with something other than a keyword, and write the `=`: `/def greet = /echo hi`.

Codes: `invalid-macro-name`. Cases: `reserved-macro-name`, `invalid-macro-name`, `builtin-redefined`.

## R9. Load paths

- A relative `/load` path is tried against tf's current directory, not the loading file's directory, then against each `TFPATH` directory in order, or `TFLIBDIR` when `TFPATH` is empty. So a non-empty `TFPATH` must include the library directory for `/require alias.tf` to work.
- A call of a macro no loaded file defines prints "NAME: no such command or macro", and tf goes on with the next command.

Fix:

- Put library directories on `TFPATH`, and write paths relative to tf's current directory, not the script's.
- Build a path from a variable with `/eval`: `/eval /load %{dir}/x.tf`.

Codes: `unresolved-load`, `undefined-macro`. Cases: `load-path-tfpath`, `load-path-tfpath-target`, `load-path-tfpath-replaces-libdir`, `load-path-libdir`, `load-not-loader-dir`, `undefined-macro-goes-on`.

## L1. Shapes that may be deliberate

- tf runs these without a word, and each may be what its author meant, so they are lint: warnings that don't count as problems tf has, and that a comment turns off. A comment line holding `tflint:ignore-nextline` (`; tflint:ignore-nextline`) turns off every lint warning on the line after it; with codes after it (`; tflint:ignore-nextline text-sent-from-body`), only those.
- A plain `/def` with an empty body (`/def x =`) sends a blank line to the world when it runs, through the `SEND` hook. A trigger, hook or key binding with an empty body sends nothing when it fires.
- Text in a macro body that isn't a command is sent to the world when the macro runs, through the `SEND` hook, as `/send -h text` sends it.
- `/require file` loads a file as `/load file` does, options and all, but not again once the file has run `/loaded`, as most of tf's library files do; for a file without `/loaded`, it loads it again.

Fix:

- Send text on purpose with `/send -h text`.
- Load a library file with `/require`: `/require alias.tf`.
- Turn a lint warning off where the shape is meant: `; tflint:ignore-nextline` on the line before.

Codes: `empty-macro-body`, `text-sent-from-body`, `load-of-library-file`. Cases: `lint-empty-body`, `lint-empty-trigger-body`, `lint-send-h`.

Not run: That `/send` passes `-h` on to `send()` is read from stdlib.tf's `/send` (lib/tf/stdlib.tf:103-115), and that `send()` runs the `SEND` hook only for `-h`, so `/send` without it skips the hook, from socket.c:2991.

Not run: That `/require` is `/let _required=1%; /load %{-L} %{L}`, and that `/loaded` ends the second load of a file, is read from lib/tf/stdlib.tf:36-47; which library files run `/loaded` is read from lib/tf (scripts/extract-command-tables.js).

## Checking a script with tf-script-check (do this instead of guessing)

From `~/ai/mud` (use `MSYS_NO_PATHCONV=1` in Git Bash for container paths):

    just tf-script-check PATH/TO/script.tf                              # load it, list problems
    just tf-script-check --mount HOSTDIR=/wotmud /wotmud/tf/main.tf    # a script that loads others
    ... --world NAME --server-text "line" --server-text "line"          # connect to a fake server so hooks/triggers fire
    ... --cmd "/macroname arg"                                          # run a macro after loading
    ... --all                                                           # show every % line tf prints

Exit 1 means tf printed a syntax error, missing file, unknown command or warning. Feed trigger scripts the server lines that should fire them. To learn a new rule, write a case in `tests/tfscript/cases/` (`;; expect: clean|problem`, `;; run: ...`, `;; rule: ...`), run `just test-tfscript`, then add it to the rule table in the language server's `packages/core/src/rules/table.ts` and regenerate this file. Only write a rule down after a test proved it; an untested rule from memory has already been wrong once.
