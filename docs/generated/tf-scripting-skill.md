---
name: tf-scripting
description: Use when writing, editing, reviewing or debugging TinyFugue scripts (.tf files, /def macros, triggers, hooks, /load, /log, /eval) - tf's macro language breaks in ways ordinary scripting intuition does not predict, and a script that loads silently can still be broken.
---

<!-- Generated from src/rules/table.ts by scripts/generate-rule-docs.js (npm run docs:rules). Edit the table, not this file. -->

# TinyFugue scripting

Do not trust memory or the manual for tf macro syntax. Each rule below was proven by running a script against the real tf (cases in `~/ai/mud/tests/tfscript/cases/`). Check every .tf edit against them. The tfscript language server reports the codes named under each rule.

## When code runs

A macro body is parsed when it runs, not when it is defined. `/def` accepts a body with a syntax error, and the error appears the first time the macro fires (for a trigger, on the first line that matches, then on every line). A clean `/load` proves nothing about a macro: run it. The test cases do so with `;; run: /name` lines.

A top-level command of a file runs, and is checked, as the file loads.

## R1. Lines

- tf reads a file one physical line at a time and drops each line's leading blanks. A line whose first non-blank character is `;` or `#` is a comment and is skipped, also in the middle of a continuation. Empty and whitespace-only lines are skipped.
- A line that ends in `\` (and not in `%\`) is joined to the next one. Otherwise the joined text is one complete command. This applies to every line of a file, inside a `/def` or not.
- So a block (`/if` ... `/endif`, `/while` ... `/done`) must be complete within one command. A multi-line `/if` with its lines left bare is rejected, because `/if` needs its `/endif` in the same command, and an indented second line draws `possibly missing trailing \`.
- Whitespace after a final `\`, including the `\r` of a CRLF file, draws `whitespace following final '\'`, and the line is not continued.
- A command that doesn't start with `/` makes tf print "Invalid command. Aborting." and stop loading the file; it is never sent to a connected world. A byte order mark is not a blank. tf treats such a line as an implicit `/addworld` only in the `~/.tinytalk` file it reads at start-up, never in a `/load`. Text in a `/def` body is different: it is sent when the macro runs.
- A file whose last command ends in `\` draws `last command is incomplete because of trailing \`, and that command is dropped.
- A macro body whose last line ends in `%;` but not `\` ends there: an unindented command on the next line runs once, when the file loads, and tf says nothing.
- tf turns tabs into blanks as it reads a file, out to the next 8-column stop (`%tabsize`) of the physical line, indentation included, before it joins continuations or strips leading blanks. A tab meant to stay a tab never does: the pattern `[ <tab>]*` in `lib/tf/quoter.tf`'s `/qmac` is stored as `[    ]*`, so it matches no tab.

Fix:

- End every line of a multi-line command but the last with `\`, and separate its statements with `%;`, at the top level and in a `/def` alike.
- Or write the block on one line: `/if (x =~ "") /set x=1%; /endif`.
- Save `.tf` files with LF line endings, and with no blanks after a final `\`.
- Comment out a line that isn't a command with `;`, on every physical line of it.

Codes: `missing-continuation`, `indented-line-after-command`, `backslash-not-last`, `not-a-command`, `incomplete-continuation`, `body-continues-without-backslash`. Cases: `if-multiline-top-level`, `if-oneline-top-level`, `if-multiline-top-level-backslash`, `if-multiline-in-def`, `indented-line-after-command`, `comment-lines`, `trailing-space-after-backslash`, `bare-line-after-command`, `blank-lines-between-defs`, `tab-expanded-on-load`.

## R2. Substitution level

- What tf substitutes depends on where the text is.
- A plain top-level command of a file substitutes nothing: only the command word at its start is read. `%{x}`, `%x`, `%;`, `$[...]`, `$(...)` and `\` are stored as typed. `/load %{dir}/x.tf` looks for a file whose name is literally `%{dir}/x.tf`; so does `/log -r %{dir}/<world>/`. `/let v=cd %; /echo x` sets `v` to the whole rest of the line and never runs `/echo`. An unclosed `$[`, `%{`, `${` or string there is only text.
- A top-level line that starts with `/if` or `/while` reads `%;`, `%|` and `%\` as separators for the rest of the line, after its `/endif` or `/done` too, and shortens a run of `%`s by one. Nothing else is substituted there either.
- A macro body (`/def`, `/bind`, `/hook`, `/trig` and its variants), `/eval` text, the command of a `/repeat` and a `/for` body substitute everything. `/eval -s0` substitutes nothing.
- An expression is evaluated the same at every level: an `/if` or `/while` condition, a `$[...]`, and the text of a top-level `/test`, `/return` or `/result` read `%x`, `{x}`, `$[...]` and `$(...)` as operands. So `/if (%{x} == 5)` works at the top level. A `%{var}` inside a string in an expression is never substituted.

Fix:

- Put `/eval` in front of a top-level command that needs a substitution: `/eval /load %{dir}/x.tf`, `/eval /log -r %{dir}/<world>/`.
- Put several commands in a `/def`, or start the line with `/eval`, to separate them with `%;`.
- In a condition, write the variable's name, `{x}`, not `%{x}`.

Codes: `not-substituted-here`. Cases: `load-no-expansion`, `load-with-eval`, `separator-top-level`, `unclosed-substitution-top-level-text`.

## R3. Statements and keywords

- A statement runs to the next `%;`, `%|` or `%\`, or to the `)` that closes its `$(...)`.
- tf reads a keyword (`/if`, `/then`, `/elseif`, `/else`, `/endif`, `/while`, `/do`, `/done`, `/break`, `/let`, `/set`, `/setenv`, `/test`, `/return`, `/result`, `/exit`) only at the start of a statement. The first command of a statement takes everything up to the separator: `/let`, `/set` and `/setenv` as their value, `/test`, `/return` and `/result` as their expression, and any other command as its arguments.
- So `/if (1) /echo yes /else /echo no /endif` is one `/echo` whose text happens to contain `/else` and `/endif`, and the `/if` is never closed ("expected /endif, found end of body" when the macro runs). With a `%;` before the `/endif` the same line is valid, and quietly wrong: the `/else` branch does not exist. In `/if (c) /let v=1 /endif` the `/endif` becomes part of the value.
- The same goes for a condition list: `/test` reads its expression up to the next `%;`, so it is `/if /test x%; /then ...`, never `/if /test x /then ...`. A statement in a condition list that isn't a command is sent to the world each time the condition is tested, and tf warns "statement starting with 'x' in /IF condition sends text to server".
- tf reads a keyword up to a blank, a `%` or a `)`, so `/if(1)` runs a command named `if(1)` and finds none ("if(1): no such command or macro").
- tf also rejects a keyword with no block to belong to ("unexpected /ENDIF in outer block"), text after `/endif` or `/done` with no `%;` ("expected end of statement after /endif"), and a `/break` without a positive number of loops. It reports only the first error in a body, as it stops compiling there.

Fix:

- Put `%;` before every keyword that starts a statement: `/let v=1%; /endif`, never `/let v=1 /endif`.
- Put a blank after a keyword: `/if (1)`, not `/if(1)`.
- Write a condition list's statements as commands: `/if /test x%; /then ...`.
- Put `%;` between `/endif` or `/done` and whatever follows it.

Codes: `keyword-mid-statement`, `condition-list-text`, `keyword-needs-space`, `block-structure`, `nesting-too-deep`. Cases: `let-swallows-endif`, `let-with-separator`, `block-structure-keyword-mid-statement`, `block-structure-keyword-as-text`, `block-structure-stray-keyword`, `block-structure-text-after-endif`, `block-structure-condition-list`, `block-structure-condition-list-ok`, `block-structure-top-level`.

## R4. Separators and escapes

- Where tf separates statements (a body, or a top-level `/if` or `/while` line), only a single `%` before `;`, `|` or `\` does it: `%;` and `%\` separate, and `%|` pipes.
- Blanks beside `%;` in a body do not count: `/let v=ab %; ...` sets `ab`, not `ab `, and `/a %; /b` and `/a%;/b` run the same.
- A run of two or more `%`s is text, and tf drops one `%` of it, so `%%;` and `%%%;` don't end a statement. `\%;` is text too.
- Quotes do not protect a `%;` outside an expression: `/set q="a%; /set r=b"` is two commands.
- At the top level of a file `%;` is not a separator at all (R2).

Fix:

- Separate statements with one `%;`.
- Write `%%;` for a literal `%;` in a body.

Codes: none of its own. Cases: `separator-blanks-in-body`, `separator-literal-forms`, `separator-percent-backslash`.

## R5. Empty statements

- An empty statement sends a blank line to the world each time it runs: a `%;` straight after another separator, after `/then`, `/do`, `/else` or a `(condition)`, or at the start of a body. A `%;` at the very end sends nothing.
- tf warns about some of these when it compiles the body: after a `(condition)` or `/else` it says "sends blank line to server".

Fix:

- Delete the `%;` that ends the empty statement: `/if (x) /echo a%; /endif`, not `/if (x)%; /echo a%; /endif`.

Codes: `empty-statement`. Cases: `separator-sends-blank-line`.

## R6. Substitution syntax

- Where tf substitutes (R2), a substitution must be complete. `%{name` needs its `}` before any blank or `%;`; after the name comes `}` or `-default`. Another substitution can only nest through the default: `%{foo-%{bar}}`, not `%{foo%{bar}}`.
- `%-` always starts a substitution (`%-1`, `%-L`), so `50%-off` in a body is "illegal character '-' in substitution": write `50%%-off`.
- A `${` or `$(` must close too ("unmatched ${").
- A plain top-level command substitutes nothing, so there all of these are only text.

Fix:

- Close every `%{`, `${` and `$(`.
- Nest through the default: `%{foo-%{bar}}`.
- Write `%%-` for a literal `%-`: `50%%-off`.

Codes: `substitution-syntax`. Cases: `unclosed-substitution-percent-brace`, `unclosed-substitution-percent-dash`.

## R7. Expressions

- In an expression (a condition, `/test`, `/return`, `/result` or `$[...]`), a string is delimited by `"`, `'` or a backquote and must be closed ("unmatched \" in string literal"), parentheses must balance, and a `$[` must close ("unmatched $["). Strings only count inside an expression.
- In a macro body these are errors when it runs, and in a top-level condition or `/test` as the file loads.
- A condition is already an expression, so a `$[...]` inside one is redundant: tf warns "$[...] substitution in expression is legal, but redundant". A `%{x}` there draws "legal, but can be confusing. Try using {x}". tf prints each once per session unless `%pedantic` is on.

Fix:

- Write the plain expression in a condition: `/if (strstr({P0}, "x") >= 0)`, not `/if ($[strstr({P0}, "x")] >= 0)`.
- Write `{x}`, not `%{x}`, for a variable in an expression.

Codes: `expression-syntax`, `substitution-in-expression`. Cases: `dollar-bracket-in-if`, `if-expression-plain`, `unclosed-substitution-dollar-bracket`, `unclosed-substitution-string`, `unclosed-substitution-condition`.

## R8. Macro names

- A macro cannot be named after a keyword or `eval`. `/def if`, `/def SET`, `/def let`, `/def test`, `/def eval` and the rest of the keyword table are refused with `"SET" is a reserved word.`, in any case, and nothing is defined, so `/set` keeps meaning the keyword.
- A name that starts with `#`, `@`, `!` or `/`, or holds a space, is refused as an "illegal macro name". A `/def` with its `=` left out (`/def greet /echo hi`) has a space in its name.
- Other builtins can be redefined: `/def quote` and `/def lcd` only draw "conflicts with the builtin command", and the macro then runs.

Fix:

- Name macros with something other than a keyword, and write the `=`: `/def greet = /echo hi`.

Codes: `invalid-macro-name`. Cases: `reserved-macro-name`.

## R9. Load paths

- A relative `/load` path is tried against tf's current directory, not the loading file's directory, then against each `TFPATH` directory in order, or `TFLIBDIR` when `TFPATH` is empty. So a non-empty `TFPATH` must include the library directory for `/require alias.tf` to work.
- A call of a macro no loaded file defines prints "NAME: no such command or macro", and tf goes on with the next command.

Fix:

- Put library directories on `TFPATH`, and write paths relative to tf's current directory, not the script's.
- Build a path from a variable with `/eval`: `/eval /load %{dir}/x.tf`.

Codes: `unresolved-load`, `undefined-macro`.

## Shapes that may be deliberate (planned)

Some shapes tf runs without a word may be deliberate, so nothing flags them now. The plan, not built yet, is a lint-level warning for each, which a `; tflint:ignore-nextline` comment on the line before turns off.

The candidates so far are an empty `/def x =` body, and bare text in a body, which tf sends to the world. For the second the warning would suggest `/send -h text`, which says that on purpose and does the same: bare text runs the SEND hook (`expand.c:620`), and `/send` runs it only with `-h` (`socket.c:2953`).

## Checking a script with tf-script-check (do this instead of guessing)

From `~/ai/mud` (use `MSYS_NO_PATHCONV=1` in Git Bash for container paths):

    just tf-script-check PATH/TO/script.tf                              # load it, list problems
    just tf-script-check --mount HOSTDIR=/wotmud /wotmud/tf/main.tf    # a script that loads others
    ... --world NAME --server-text "line" --server-text "line"          # connect to a fake server so hooks/triggers fire
    ... --cmd "/macroname arg"                                          # run a macro after loading
    ... --all                                                           # show every % line tf prints

Exit 1 means tf printed a syntax error, missing file, unknown command or warning. Feed trigger scripts the server lines that should fire them. To learn a new rule, write a case in `tests/tfscript/cases/` (`;; expect: clean|problem`, `;; run: ...`, `;; rule: ...`), run `just test-tfscript`, then add it to the rule table in the language server's `src/rules/table.ts` and regenerate this file. Only write a rule down after a test proved it; an untested rule from memory has already been wrong once.
