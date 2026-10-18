/**
 * The rule table: tf's scripting rules, one section per underlying rule (R1 to R9, and L1, the lint
 * tier: shapes tf runs without a word that may be deliberate), each with the
 * plain statement of the rule, the tf source that proves it, its proof cases, the diagnostic codes
 * it covers and the fix idiom. docs/rules.md, the README's rule table, the notes page's rule list,
 * the tf-scripting skill and the hover text and links for each diagnostic code are all generated
 * from it (src/rules/render.ts, scripts/generate-rule-docs.js), so they can't drift apart.
 *
 * Every diagnostic code the server emits belongs to exactly one section (test/ruleTable.test.ts).
 * Every behaviour stated here is proven by a case in ~/ai/mud/tests/tfscript/cases/ run against
 * real tf, except the ones a section lists under `sourceOnly`, which say where they come from. Source
 * locations are in ~/ai/mud/tinyfugue/src.
 */

export type SectionId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "L1";

export interface CodeEntry {
  /** The diagnostic code, as sent in the LSP `code`. */
  code: string;
  /** The rule's severity, and any variant's in brackets. */
  severity: string;
  /** One or two plain sentences: the problem and the fix. The hover's explanation of the code. */
  summary: string;
  /** What it catches and what it leaves alone, in full (the README's and docs/rules.md's text). */
  detail: string;
}

export interface SourceRef {
  /** A file under tinyfugue/src, with a line or range: `command.c:576`. */
  at: string;
  what: string;
}

export interface RuleSection {
  id: SectionId;
  title: string;
  /** The rule in plain sentences, one paragraph each. Markdown inline code only. */
  statement: string[];
  source: SourceRef[];
  /** Case names under ~/ai/mud/tests/tfscript/cases/, without `.tf`. */
  cases: string[];
  /** Claims stated here with no case that runs them, each saying where they come from instead. */
  sourceOnly?: string[];
  codes: CodeEntry[];
  /** How to write it so it works, one idiom each. */
  fix: string[];
}

/** The skill's and rules.md's preamble: when tf reads what. */
export const WHEN_CODE_RUNS: string[] = [
  "A macro body is parsed when it runs, not when it is defined. `/def` accepts a body with a syntax error, and the error " +
    "appears the first time the macro fires (for a trigger, on the first line that matches, then on every line). A clean " +
    "`/load` proves nothing about a macro: run it. The test cases do so with `;; run: /name` lines.",
  "A top-level command of a file runs, and is checked, as the file loads.",
];

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: "R1",
    title: "Lines",
    statement: [
      "tf reads a file one physical line at a time and drops each line's leading blanks. A line whose first non-blank " +
        "character is `;` or `#` is a comment and is skipped, also in the middle of a continuation. An empty or " +
        "whitespace-only line runs no command of its own, but it does end a command that a `\\` was continuing: the " +
        "line after it starts a new command.",
      "A line that ends in `\\` (and not in `%\\`) is joined to the next one. Otherwise the joined text is one complete " +
        "command. This applies to every line of a file, inside a `/def` or not.",
      "So a block (`/if` ... `/endif`, `/while` ... `/done`) must be complete within one command. A multi-line `/if` with " +
        "its lines left bare is rejected, because `/if` needs its `/endif` in the same command, and an indented second " +
        "line draws `possibly missing trailing \\`.",
      "Whitespace after a final `\\`, including the `\\r` of a CRLF file, draws `whitespace following final '\\'`, " +
        "and the line is not continued. A tf that drops that `\\r` (`tfscript.tfBuild` set to `fork`) reads a CRLF file " +
        "like an LF one.",
      "A command that doesn't start with `/` makes tf print \"Invalid command. Aborting.\" and stop loading the file; it " +
        "is never sent to a connected world. A byte order mark is not a blank, so a file that starts with one stops at " +
        "its first line. tf treats such a line as an implicit `/addworld` only in the `~/.tinytalk` file it reads at " +
        "start-up, never in a `/load`. Text in a `/def` body is different: it is sent when the macro runs.",
      "A file whose last command ends in `\\` draws `last command is incomplete because of trailing \\`, and that " +
        "command is dropped. tf says it after every \"Invalid command. Aborting.\" too, as the aborted command is still " +
        "held.",
      "A macro body whose last line ends in `%;` but not `\\` ends there: an unindented command on the next line runs " +
        "once, when the file loads, and tf says nothing.",
      "tf turns tabs into blanks as it reads a file, out to the next 8-column stop (`%tabsize`) of the physical line, " +
        "indentation included, before it joins continuations or strips leading blanks, whatever `%expand_tabs` says. So " +
        "a tab inside a command is stored as blanks, and how many depends on where the line starts: the same " +
        "`/let s=a<tab>b` gives four blanks in one place and six in another. A tab meant to stay a tab never does. " +
        "(Upstream's `lib/tf/quoter.tf` had a `[ <tab>]*` in `/qmac` that matched no tab for this reason; our fork " +
        "writes `[ \\\\t]*`.)",
    ],
    sourceOnly: [
      "That such a line is an `/addworld` in `~/.tinytalk` (`command.c:606-616`) is read from the source; the cases " +
        "only show that a `/load`ed file stops.",
    ],
    source: [
      { at: "command.c:575-577", what: "load_file() strips leading blanks and skips a comment line" },
      { at: "command.c:579-581", what: "`possibly missing trailing \\`" },
      { at: "command.c:585-589", what: "a final `\\`, not after `%`, joins the next line" },
      { at: "command.c:591-595", what: "`whitespace following final '\\'`" },
      { at: "command.c:597-601", what: "an empty line ends the command being continued" },
      { at: "command.c:602-605", what: "a command starting `/` runs at SUB_KEYWORD" },
      { at: "command.c:617-618", what: "\"Invalid command. Aborting.\"" },
      { at: "command.c:617-627", what: "`last command is incomplete because of trailing \\`, also after an abort" },
      { at: "tfio.c:1248-1250", what: "tfgetS() expands a tab to the next `tabsize` stop" },
    ],
    cases: [
      "if-multiline-top-level",
      "if-oneline-top-level",
      "if-multiline-top-level-backslash",
      "if-multiline-in-def",
      "indented-line-after-command",
      "comment-lines",
      "trailing-space-after-backslash",
      "bare-line-after-command",
      "blank-lines-between-defs",
      "tab-expanded-on-load",
      "missing-continuation-bare-endif",
      "missing-continuation-indented-endif",
      "missing-continuation-while",
      "body-continues-without-backslash",
      "incomplete-continuation",
      "continuation-ended-by-blank-line",
      "continuation-ended-by-whitespace-line",
      "bom-is-not-a-blank",
      "not-a-command-also-incomplete",
      "percent-backslash-not-joined",
      "crlf",
      "tab-expanded-with-expand-tabs-off",
    ],
    codes: [
      {
        code: "missing-continuation",
        severity: "error",
        summary:
          "A top-level `/if` or `/while` ends where its line ends, because the line has no `\\` to continue it. End every " +
          "line of the block but the last with `\\`, or write it on one line.",
        detail:
          "a top-level `/if` or `/while` still open where its line ends, with no `\\` to continue it. Reported once, at " +
          "the opener: the stray `/then`, `/else`, `/endif`, `/do` or `/done` and the indented lines that were meant to " +
          "be part of it are its related locations, not diagnostics of their own",
      },
      {
        code: "indented-line-after-command",
        severity: "warning",
        summary:
          "An indented line starts a new command, because the line before it has no `\\` at the end. Add the `\\` if " +
          "the line was meant to continue that command.",
        detail:
          "an indented line starting a new command right after one that didn't end in `\\` — tf's own \"possibly " +
          "missing trailing \\\\\" warning",
      },
      {
        code: "backslash-not-last",
        severity: "warning",
        summary:
          "This `\\` doesn't continue the line: whitespace or a CRLF line ending follows it, or a `%` comes before it. " +
          "End the line with a `\\` that has no `%` before it and nothing after it, in a file saved with LF line " +
          "endings.",
        detail:
          "a final `\\` followed by whitespace (including a CRLF file's trailing `\\r`, unless `tfscript.tfBuild` is " +
          "`fork`) — not a continuation, tf warns and runs the line as-is",
      },
      {
        code: "not-a-command",
        severity: "error",
        summary:
          "A line that isn't blank, a comment or a `/command` stops tf loading the rest of the file. Comment it out, or " +
          "remove the byte order mark that stops it being a command.",
        detail:
          "a line that is not blank, a comment, or a `/command` — tf aborts the rest of the file's load; everything " +
          "after it is suppressed from the other rules, since tf never reads it either",
      },
      {
        code: "incomplete-continuation",
        severity: "warning",
        summary:
          "The file's last command ends in `\\`, so tf drops it. Remove the `\\`.",
        detail:
          "(warning) the file's last command ends in `\\`: tf says \"last command is incomplete because of trailing " +
          "\\\\\" and drops it, so a macro it would define isn't defined. A final newline doesn't complete it (tf reads " +
          "no line after it); a real blank line does. The fix removes the `\\`",
      },
      {
        code: "body-continues-without-backslash",
        severity: "information",
        summary:
          "A macro body ends in `%;` without a `\\`, so the command on the next line runs once, at load, and is not " +
          "part of the body. End the line with `\\` if it was meant to be.",
        detail:
          "(information) a macro body whose last line ends in `%;` but not `\\`, with an unindented command on the next " +
          "line: that line is a command of its own, run when the file loads. Not when the body ends at a blank line, " +
          "nor when the next line runs the macro just defined",
      },
    ],
    fix: [
      "End every line of a multi-line command but the last with `\\`, and separate its statements with `%;`, at the " +
        "top level and in a `/def` alike.",
      "Or write the block on one line: `/if (x =~ \"\") /set x=1%; /endif`.",
      "Save `.tf` files with LF line endings, and with no blanks after a final `\\`.",
      "Comment out a line that isn't a command with `;`, on every physical line of it.",
    ],
  },
  {
    id: "R2",
    title: "Substitution level",
    statement: [
      "What tf substitutes depends on where the text is.",
      "A plain top-level command of a file substitutes nothing: only the command word at its start is read. `%{x}`, " +
        "`%x`, `%;`, `$[...]`, `$(...)` and `\\` are stored as typed. `/load %{dir}/x.tf` looks for a file whose name " +
        "is literally `%{dir}/x.tf`. `/let v=cd %; /echo x` sets `v` to the whole rest of the line and never runs " +
        "`/echo`. An unclosed `$[`, `%{`, `${` or string there is only text.",
      "A top-level line that starts with `/if` or `/while` reads `%;` and `%\\` as separators for the rest of the line, after " +
        "its `/endif` or `/done` too, and shortens a run of `%`s by one. Nothing else is substituted there either: a " +
        "`%{x}` stays as typed.",
      "A macro body, `/eval` text, the command of a `/repeat`, `/at` or `/quote` (after its backquote) and a `/for` " +
        "body substitute everything. `/eval -s0` substitutes nothing.",
      "An expression is evaluated the same at every level: an `/if` or `/while` condition and a top-level `/test` read " +
        "`%{x}` and `$[...]` as operands. So `/if (%{x} == 5)` works at the top level.",
      "A `%{x}` inside a string in a condition or a `$[...]` is never substituted, even in a macro body. The text of a " +
        "`/test`, `/return` or `/result` in a body is substituted at its statement's level first, so a `%{x}` in a " +
        "string there is substituted; in a top-level `/test` it is not.",
    ],
    source: [
      { at: "command.c:605", what: "a file's command runs at SUB_KEYWORD (\"Never use SUB_FULL here\")" },
      { at: "expand.c:1443-1444", what: "`/while` raises SUB_KEYWORD to SUB_NEWLINE" },
      { at: "expand.c:1542-1543", what: "`/if` raises SUB_KEYWORD to SUB_NEWLINE" },
      { at: "expand.c:1862", what: "`%` is read at SUB_NEWLINE and above" },
      { at: "expand.c:1806", what: "percentsub() substitutes a variable only at SUB_FULL" },
      { at: "expand.c:1856", what: "`\\` is read only at SUB_FULL" },
      { at: "expand.c:1871", what: "`$` is read only at SUB_FULL" },
      { at: "macro.c:1561", what: "a macro body is compiled at SUB_MACRO when it first runs" },
      { at: "expand.c:224", what: "`/eval` defaults to SUB_MACRO" },
      { at: "process.c:205", what: "a `/repeat` command is compiled at SUB_MACRO" },
      { at: "expr.c:2231", what: "primary_expr() reads `%`, `{`, `$[`, `$(` and `${` operands at any level" },
      { at: "expand.c:1653-1659", what: "a `/test`'s text is expanded at its statement's level before it is compiled" },
    ],
    cases: [
      "load-no-expansion",
      "load-with-eval",
      "separator-top-level",
      "unclosed-substitution-top-level-text",
      "top-level-literal-substitutions",
      "top-level-if-line-level",
      "repeat-substitutes",
      "at-command-substitutes",
      "quote-command-substitutes",
      "for-body-substitutes",
      "expression-operand-top-level",
      "string-substitution-body-test",
      "string-no-substitution-in-expressions",
      "while-reads-variable",
      "return-result-substituted",
      "separator-percent-backslash-top-level-if",
    ],
    codes: [
      {
        code: "not-substituted-here",
        severity: "warning (information for a `%;`)",
        summary:
          "tf reads this text without substituting it, so the `%{var}`, `%var` or `%;` stays as it is typed. The " +
          "message says how to get it substituted where that is meant, or that it may be meant as text.",
        detail:
          "text tf reads without substituting, where it was surely meant to be: a `%{var}` in a plain top-level line or " +
          "a top-level `/if` or `/while` line (the fix puts `/eval` in front), or in `/eval` or `/quote` " +
          "`-soff`/`-son` text (the fix leaves out the `-s`), and a `%var` in a `/load` or `/require` path there. Not " +
          "in a macro body, an `/eval`, the command of a `/repeat`, `/at` or `/quote` (after its backquote), a `/for`, " +
          "or an expression operand (`/if (%{x} == 5)`), which tf substitutes; never a `%name` elsewhere, as " +
          "`/set std_clock_format=%H:%M` is meant as text. Also a `%{var}` inside a string in a condition or " +
          "`$[...]`, which nothing substitutes, even in a macro body (a `$(...)` in one runs as a macro body). " +
          "(information) A `%;` with more after it on a plain top-level line or in `-soff` text, which doesn't " +
          "separate there: `/echo a%; /echo b` is one `/echo`; in a `/set`, `/let` or `/setenv` value it may be " +
          "meant. One table, `src/substitution.ts`, says which text is read at which level",
      },
    ],
    fix: [
      "Put `/eval` in front of a top-level command that needs a substitution: `/eval /load %{dir}/x.tf`.",
      "Put several commands in a `/def`, or start the line with `/eval`, to separate them with `%;`.",
      "In a condition, write the variable's name, `{x}`, not `%{x}`.",
    ],
  },
  {
    id: "R3",
    title: "Statements and keywords",
    statement: [
      "A statement runs to the next `%;`, `%|` or `%\\`, or to the `)` that closes its `$(...)`.",
      "tf reads a keyword (`/if`, `/then`, `/elseif`, `/else`, `/endif`, `/while`, `/do`, `/done`, `/break`, `/let`, " +
        "`/set`, `/setenv`, `/test`, `/return`, `/result`, `/exit`) only at the start of a statement. The first command " +
        "of a statement takes everything up to the separator: `/let`, `/set` and `/setenv` as their value, `/test`, " +
        "`/return` and `/result` as their expression, and any other command as its arguments. `/let name value`, with no `=`, takes it too.",
      "So `/if (1) /echo yes /else /echo no /endif` is one `/echo` whose text happens to contain `/else` and `/endif`, " +
        "and the `/if` is never closed (\"expected /endif, found end of body\" when the macro runs). With a `%;` before " +
        "the `/endif` the same line is valid, and quietly wrong: the `/else` branch does not exist. In " +
        "`/if (c) /let v=1 /endif` the `/endif` becomes part of the value.",
      "The same goes for a condition list: `/test` reads its expression up to the next `%;`, so it is " +
        "`/if /test x%; /then ...`, never `/if /test x /then ...`. A statement in a condition list that isn't a command " +
        "is sent to the world each time the condition is tested, and tf warns \"statement starting with 'x' in /IF " +
        "condition sends text to server\".",
      "tf reads a keyword up to a blank, a `%` or a `)`, so `/if(1)` runs a command named `if(1)` and finds none " +
        "(\"if(1): no such command or macro\").",
      "tf also rejects a keyword with no block to belong to (\"unexpected /ENDIF in outer block\"), text after " +
        "`/endif` or `/done` with no `%;` (\"expected end of statement after /endif\"), and a `/break` without a " +
        "positive number of loops (\"expected positive integer\"). It reports only the first error in a body, as it " +
        "stops compiling there.",
      "A name that only starts like a keyword is not one: `done:x`, `if!x` and `then?` are macro names, and such " +
        "macros can be defined and run.",
    ],
    source: [
      { at: "expand.c:1371", what: "list() reads a statement list" },
      { at: "expand.c:1408", what: "keyword_parse() runs only where a statement starts" },
      { at: "expand.c:1779", what: "a keyword is read up to a blank, `%` or `)`" },
      { at: "expand.c:1432-1435", what: "\"statement starting with ... in /IF condition sends text to server\"" },
      { at: "expand.c:1482", what: "`/BREAK` needs a positive integer" },
      { at: "expand.c:1742-1746", what: "\"expected end of statement after /endif\", \"Possibly missing '%;'\"" },
    ],
    cases: [
      "let-swallows-endif",
      "let-with-separator",
      "block-structure-keyword-mid-statement",
      "block-structure-keyword-as-text",
      "block-structure-stray-keyword",
      "block-structure-text-after-endif",
      "block-structure-condition-list",
      "block-structure-condition-list-ok",
      "block-structure-top-level",
      "keyword-mid-statement-set-value",
      "keyword-mid-statement-setenv",
      "keyword-mid-statement-let-no-equals",
      "condition-list-text",
      "keyword-needs-space",
      "keyword-glued-macro-names",
      "break-needs-positive-number",
      "only-first-error-in-body",
    ],
    codes: [
      {
        code: "keyword-mid-statement",
        severity: "error (warning where tf runs it as text without a word)",
        summary:
          "A keyword in the middle of a statement is text, because tf reads a keyword only at a statement's start and " +
          "the statement's first command takes the rest of it. Where it was meant as a keyword, a `%;` before it makes " +
          "it one.",
        detail:
          "a keyword in the middle of a statement, which tf reads as text: only a statement's start can hold one, and " +
          "its first command takes the rest of it, so `/if (1) /echo a /endif` never closes. An `/if` or `/while` in a " +
          "`/let`, `/set` or `/setenv` value is reported only where tf stops at what it leaves (the `/endif` with no " +
          "`/if`, its related location) and a `%;` before it clears that; in other text, or otherwise, it is just text " +
          "(`/set msg=use /if to branch`, `/echo see /if (x) for help`). (warning) A keyword such a value takes in a " +
          "block that still closes, which tf runs as text without a word: `/if (1) /set a=1 /else /set b=2%; /endif`; " +
          "an error where its fix clears what tf stops at. The fix puts `%;` before each keyword of the statement, only " +
          "where that runs as meant: not for text in a condition list, nor where text after the keyword would become a " +
          "statement, nor where it would leave a later keyword stray or add an empty statement",
      },
      {
        code: "condition-list-text",
        severity: "warning",
        summary:
          "A statement in a condition list that isn't a command is sent to the world each time the condition is " +
          "tested. Write the condition as `(expression)`, or as a command such as `/test`.",
        detail:
          "(warning) a statement in an `/if`, `/elseif` or `/while` condition list that isn't a command " +
          "(`/if x == 1%; /then`): tf sends it to the world each time the condition is tested, and warns \"statement " +
          "starting with 'x' in /IF condition sends text to server\"",
      },
      {
        code: "keyword-needs-space",
        severity: "error (warning before other punctuation)",
        summary:
          "A keyword glued to the next character is read as part of a command name, not as a keyword. Separate it as " +
          "the message says: with a blank after most keywords, or with `%;` after `/endif`, `/done` or `/break`.",
        detail:
          "a block keyword glued to a `(` or `/` after it (`/if(1)`, `/else/echo`): tf reads a keyword up to a blank, " +
          "`%` or `)`, so it runs a command named `if(1)` and finds none. The fix adds the blank (`%;` after `/endif`, " +
          "`/done` or `/break`; none for `/else(`, `/then(` or `/do(`); the stray keyword it leaves in a body is its " +
          "related location. (warning) Glued to other punctuation (`/endif;`), unless this file defines a macro of that " +
          "name (`/def done:x`)",
      },
      {
        code: "block-structure",
        severity: "error",
        summary:
          "The blocks don't fit together: a keyword is missing, has no block to belong to, or has text after it with no " +
          "`%;`, or a `/break` has no loop of its own to end. The message names the keyword to add, move or separate.",
        detail:
          "an `/if` or `/while` with no `/endif`, `/done`, `/then` or `/do`; a keyword with no block to belong to; text " +
          "after `/endif` or `/done` with no `%;`; a `/break` inside `$(...)` that would end a loop outside it, or has " +
          "no loop inside it to end. A keyword stuck mid-statement (`/echo a /endif`) that is the cause is " +
          "`keyword-mid-statement`'s",
      },
      {
        code: "nesting-too-deep",
        severity: "information",
        summary:
          "Not a problem in tf: this command nests deeper than this checker follows, so the rest of it is not checked.",
        detail:
          "(information) not a problem in tf: a command nesting more than 400 levels deep (each nested `/if`, `/while`, " +
          "`$(...)`, `$[...]` or `%{name-...}` default is a level), past which the structural check stops; what it read " +
          "before that still counts",
      },
    ],
    fix: [
      "Put `%;` before every keyword that starts a statement: `/let v=1%; /endif`, never `/let v=1 /endif`.",
      "Put a blank after a keyword: `/if (1)`, not `/if(1)`.",
      "Write a condition list's statements as commands: `/if /test x%; /then ...`.",
      "Put `%;` between `/endif` or `/done` and whatever follows it.",
    ],
  },
  {
    id: "R4",
    title: "Separators and escapes",
    statement: [
      "Where tf separates statements (a body, or a top-level `/if` or `/while` line), only a single `%` before `;`, " +
        "`|` or `\\` does it: `%;` and `%\\` separate, and `%|` pipes.",
      "Blanks beside `%;` in a body do not count: `/let v=ab %; ...` sets `ab`, not `ab `, and `/a %; /b` and " +
        "`/a%;/b` run the same.",
      "A run of two or more `%`s is text, and tf drops one `%` of it, so `%%;` and `%%%;` don't end a statement. " +
        "`\\%;` is text too.",
      "Quotes do not protect a `%;` outside an expression: `/set q=\"a%; /set r=b\"` is two commands.",
      "At the top level of a file `%;` is not a separator at all (R2).",
    ],
    sourceOnly: ["That `%|` pipes one statement's output into the next is read from the source; no case runs it."],
    source: [
      { at: "expand.c:1862-1866", what: "a `%` before `;`, `|` or `\\` ends the statement, and blanks before it are dropped" },
      { at: "expand.c:1802", what: "percentsub() copies the rest of a run of `%`s as text" },
      { at: "expand.c:1856", what: "`\\` escapes the next character at SUB_FULL" },
      { at: "util.c:103-105", what: "`\\`, `;` and `|` end a statement after a `%`" },
    ],
    cases: ["separator-blanks-in-body", "separator-literal-forms", "separator-percent-backslash", "separator-percent-runs"],
    codes: [],
    fix: [
      "Separate statements with one `%;`.",
      "Write `%%;` for a literal `%;` in a body.",
    ],
  },
  {
    id: "R5",
    title: "Empty statements",
    statement: [
      "An empty statement sends a blank line to the world each time it runs: a `%;` straight after another separator, " +
        "after `/then`, `/do`, `/else` or a `(condition)`, or at the start of a body. A `%;` at the very end sends " +
        "nothing.",
      "tf warns about some of these when it compiles the body: after a `(condition)` or `/else` it says \"sends blank " +
        "line to server\".",
    ],
    source: [
      { at: "expand.c:1938-1950", what: "statement() compiles text that isn't a command as a send" },
      { at: "expand.c:1425-1429", what: "the warning after `/if (...)` or `/while (...)`" },
      { at: "expand.c:1586-1590", what: "the warning after `/else`" },
    ],
    cases: [
      "separator-sends-blank-line",
      "empty-statement-double-separator",
      "empty-statement-after-then",
      "empty-statement-after-do",
      "empty-statement-after-else",
      "empty-statement-body-start",
      "empty-statement-trailing",
    ],
    codes: [
      {
        code: "empty-statement",
        severity: "warning",
        summary:
          "An empty statement sends a blank line to the world each time it runs. Remove the separator or the empty " +
          "`$()` that makes it, or put a command in it.",
        detail:
          "(warning) a statement with nothing in it, which tf sends to the world as a blank line each time it runs: a " +
          "`%;` or `%\\` right after another separator, after `/then`, `/do`, `/else` or a `(condition)`, before the " +
          "first command, or before the `)` of a `$(...)` (and an empty `$()`). In every text tf compiles: a macro body, " +
          "a top-level `/if` or `/while` line, `/eval`, `/repeat` and `/for` text. The message says whether tf warns " +
          "about it too (only after a `(condition)`, after `/else`, and in a condition list). Not a `%;` at the very " +
          "end, which sends nothing, nor one after a `/break`, `/return` or `/result`, which never runs",
      },
    ],
    fix: ["Delete the `%;` that ends the empty statement: `/if (x) /echo a%; /endif`, not `/if (x)%; /echo a%; /endif`."],
  },
  {
    id: "R6",
    title: "Substitution syntax",
    statement: [
      "Where tf substitutes (R2), a substitution must be complete. `%{name` needs its `}` before any blank or `%;`; " +
        "after the name comes `}` or `-default`. Another substitution can only nest through the default: " +
        "`%{foo-%{bar}}`, not `%{foo%{bar}}`.",
      "`%-` always starts a substitution (`%-1`, `%-L`), so `50%-off` in a body is \"illegal character '-' in " +
        "substitution\": write `50%%-off`.",
      "A `${` or `$(` must close too (\"unmatched ${\", \"unmatched (\").",
      "A plain top-level command substitutes nothing, so there all of these are only text.",
    ],
    source: [
      { at: "expand.c:2135", what: "varsub() reads `%{selector-default}`" },
      { at: "expand.c:2233-2234", what: "\"illegal character '-' in substitution\"" },
      { at: "expand.c:2293-2294", what: "\"unmatched { or bad substitution\", \"unmatched { or illegal character\"" },
      { at: "expand.c:2105", what: "\"unmatched ${\"" },
    ],
    cases: [
      "unclosed-substitution-percent-brace",
      "unclosed-substitution-percent-dash",
      "unclosed-substitution-dollar-brace-paren",
      "substitution-syntax-glued-in-body",
      "substitution-syntax-top-level-glued",
    ],
    codes: [
      {
        code: "substitution-syntax",
        severity: "error",
        summary:
          "tf can't read this substitution. Close it with its `}` or `)`, nest another substitution only through the " +
          "default, or write `%%-` for a literal `%-`, as the message says.",
        detail:
          "a substitution tf can't read: a `%{` that never closes, or with another substitution glued onto its selector " +
          "(`%{foo%{bar}}`; nesting only works through the default, `%{foo-%{bar}}`), a `%-` naming no parameter " +
          "(`50%-off`), and a `${` or `$(` that never closes. Only where tf substitutes: a macro body, `/eval`, " +
          "`/repeat`, `/at`, `/quote` or `/for` text, an expression; a plain top-level line prints it as it is",
      },
    ],
    fix: [
      "Close every `%{`, `${` and `$(`.",
      "Nest through the default: `%{foo-%{bar}}`.",
      "Write `%%-` for a literal `%-`: `50%%-off`.",
    ],
  },
  {
    id: "R7",
    title: "Expressions",
    statement: [
      "In an expression (a condition, `/test`, `/return`, `/result` or `$[...]`), a string is delimited by `\"`, `'` " +
        "or a backquote and must be closed (\"unmatched \\\" in string literal\"), parentheses must balance, and a " +
        "`$[` must close (\"unmatched $[\"). Strings only count inside an expression.",
      "In a macro body these are errors when it runs, and in a top-level condition or `/test` as the file loads.",
      "A condition is already an expression, so a `$[...]` inside one is redundant: tf warns \"$[...] substitution in " +
        "expression is legal, but redundant\", in a top-level `/test` and nested in another `$[...]` too. A `%{x}` " +
        "there draws \"legal, but can be confusing. Try using {x}\". tf prints each once per session unless " +
        "`%pedantic` is on. A body's `/test` text is substituted before it is compiled, so `/test $[3]` in a body " +
        "draws nothing.",
    ],
    source: [
      { at: "expr.c:2231", what: "primary_expr() reads an operand" },
      { at: "expr.c:2246", what: "an unclosed string literal" },
      { at: "expr.c:2269", what: "\"$[...] substitution in expression is legal, but redundant\"" },
      { at: "expand.c:2300-2303", what: "\"%{x} substitution in expression is legal, but can be confusing\"" },
      { at: "expand.c:2021", what: "\"unmatched $[\"" },
      { at: "expand.c:2054", what: "\"unmatched (\"" },
    ],
    cases: [
      "dollar-bracket-in-if",
      "if-expression-plain",
      "unclosed-substitution-dollar-bracket",
      "unclosed-substitution-string",
      "unclosed-substitution-condition",
      "expression-syntax-top-level-test",
      "substitution-in-expression-warns",
      "substitution-in-expression-body-test",
      "substitution-in-expression-once-per-session",
    ],
    codes: [
      {
        code: "expression-syntax",
        severity: "error",
        summary:
          "tf can't read this expression. Close the string, `(` or `$[` that is left open, or remove the `)` with no " +
          "`(`.",
        detail:
          "an expression tf can't read: a `$[` that never closes, a string or `(` left open, a `)` with no `(`, an " +
          "`/if` or `/while` condition with no `)`. In a condition and a top-level `/test` too, which tf compiles as " +
          "written",
      },
      {
        code: "substitution-in-expression",
        severity: "warning",
        summary:
          "A substitution used as an operand of an expression is redundant, and tf warns about it. Write `(...)` for " +
          "`$[...]` and `{x}` for `%{x}`.",
        detail:
          "(warning) a `$[...]`, `%x` or `%{x}` that is itself an operand of an expression: an `/if`, `/elseif` or " +
          "`/while` condition, a `$[...]`, or a top-level `/test`, `/return` or `/result`. tf warns that `$[...]` is " +
          "redundant and `%{x}` confusing (once per session, unless `%pedantic` is on); the fix writes `(...)` or " +
          "`{x}`, which mean the same. Not in a string, a substitution's default, `${...}` or `$(...)`, nor in a macro " +
          "body's `/test` text, which is substituted before it is compiled",
      },
    ],
    fix: [
      "Write the plain expression in a condition: `/if (strstr({P0}, \"x\") >= 0)`, not " +
        "`/if ($[strstr({P0}, \"x\")] >= 0)`.",
      "Write `{x}`, not `%{x}`, for a variable in an expression.",
    ],
  },
  {
    id: "R8",
    title: "Macro names",
    statement: [
      "A macro cannot be named after a keyword or `eval`. `/def if`, `/def SET`, `/def let`, `/def test`, `/def eval` " +
        "and the rest of the keyword table are refused with `\"SET\" is a reserved word.`, in any case, and nothing is " +
        "defined, so `/set` keeps meaning the keyword.",
      "A name that starts with `#`, `@`, `!` or `/`, or holds a space, is refused as an \"illegal macro name\". A " +
        "`/def` with its `=` left out (`/def greet /echo hi`) has a space in its name.",
      "Other builtins can be redefined: `/def quote` and `/def lcd` only draw \"conflicts with the builtin command\", " +
        "and the macro then runs.",
    ],
    source: [
      { at: "macro.c:865-866", what: "\"illegal macro name\"" },
      { at: "macro.c:870-874", what: "a keyword, or a builtin flagged reserved, is \"a reserved word\"" },
      { at: "expand.c:72-75", what: "the keyword table" },
      { at: "cmdlist.h:35", what: "EVAL is the one builtin flagged reserved" },
    ],
    cases: ["reserved-macro-name", "invalid-macro-name", "builtin-redefined"],
    codes: [
      {
        code: "invalid-macro-name",
        severity: "error",
        summary:
          "tf refuses this macro name and defines nothing. Choose another name, or put in the `=` that ends the name.",
        detail:
          "a top-level `/def` (or `/@def`) whose name tf refuses, so it defines nothing: a keyword (`if`, `then`, " +
          "`let`, `set`, `test`, ...) or `eval`, in any case (\"is a reserved word\"), or a name starting with `#`, `@`, " +
          "`!` or `/` or holding a space or tab (\"illegal macro name\"). The name is everything from the end of the " +
          "options to the first `=`, so a `/def` with its `=` left out (`/def greet /echo hi`) has a space in it; then " +
          "the fix puts the `=` in. Other builtins can be redefined, so they aren't flagged",
      },
    ],
    fix: ["Name macros with something other than a keyword, and write the `=`: `/def greet = /echo hi`."],
  },
  {
    id: "R9",
    title: "Load paths",
    statement: [
      "A relative `/load` path is tried against tf's current directory, not the loading file's directory, then " +
        "against each `TFPATH` directory in order, or `TFLIBDIR` when `TFPATH` is empty. So a non-empty `TFPATH` " +
        "must include the library directory for `/require alias.tf` to work.",
      "A call of a macro no loaded file defines prints \"NAME: no such command or macro\", and tf goes on with the " +
        "next command.",
    ],
    source: [
      { at: "command.c:512-541", what: "do_file_load() tries the path, then `TFPATH`, or `TFLIBDIR`" },
      { at: "expand.c:270", what: "\"no such command or macro\"" },
    ],
    cases: ["load-path-tfpath", "load-path-tfpath-target", "load-path-tfpath-replaces-libdir", "load-path-libdir", "load-not-loader-dir", "undefined-macro-goes-on"],
    codes: [
      {
        code: "unresolved-load",
        severity: "warning (information where it can't follow the path)",
        summary:
          "tf won't find the file this `/load` or `/require` names, or this check can't follow the path. The message " +
          "says what to fix: the path, or the `tfscript` setting that tells this check where tf runs.",
        detail:
          "a `/load` or `/require`, in a file on the load path, whose file tf wouldn't find; (information) one built from " +
          "something this check can't follow: a variable it doesn't know, a `~` with no home directory set, `~user`, or " +
          "one of tf's library files with no library folder set (`tfscript.libraryPath`). Turned off by " +
          "`tfscript.diagnostics.unresolvedLoads`",
      },
      {
        code: "undefined-macro",
        severity: "information (warning where no file this check can see defines it)",
        summary:
          "No file on this file's load path defines this macro, so unless something else defines it first, tf prints " +
          "\"no such command or macro\" when the call runs. The message says what to do: load the file that defines " +
          "it, check the name, or make a load this check can't follow resolve.",
        detail:
          "(information, or a warning where no file this check can see defines it) a call of a macro that no file on this file's load path defines; where another file defines " +
          "it, the fix adds the `/require`. Turned off by `tfscript.diagnostics.undefinedMacros`",
      },
    ],
    fix: [
      "Put library directories on `TFPATH`, and write paths relative to tf's current directory, not the script's.",
      "Build a path from a variable with `/eval`: `/eval /load %{dir}/x.tf`.",
    ],
  },
  {
    id: "L1",
    title: "Shapes that may be deliberate",
    statement: [
      "tf runs these without a word, and each may be what its author meant, so they are lint: warnings that don't count " +
        "as problems tf has, and that a comment turns off. A comment line holding `tflint:ignore-nextline` (`; " +
        "tflint:ignore-nextline`) turns off every lint warning on the line after it; with codes after it (`; " +
        "tflint:ignore-nextline empty-macro-body`), only those.",
      "A plain `/def` with an empty body (`/def x =`) sends a blank line to the world when it runs, through the `SEND` " +
        "hook. A trigger, hook or key binding with an empty body sends nothing when it fires.",
      "Text in a macro body that isn't a command is sent to the world when the macro runs, through the `SEND` hook, as " +
        "`/send -h text` sends it. Neither is flagged: bare text is tf's own idiom, and the fix list says which to write " +
        "in new code.",
      "`/require file` loads a file as `/load file` does, options and all, but not again once the file has run " +
        "`/loaded`, as most of tf's library files do; for a file without `/loaded`, it loads it again.",
      "In a macro, `/set` always writes the global variable, even where the macro made a local of that name with " +
        "`/let`, and the macro's own reads still see the local. `tfread(handle, name)` writes the local where a `/let` " +
        "made one first, else a global, which outlives the macro. `name := value` (and `++`, `+=` and the rest) " +
        "sets the nearest variable of that name, a local first; where there is none, upstream tf makes a global, and " +
        "only the fork makes a local (with `%local_assign` on, its default). A local is seen by the macros a macro " +
        "calls, too.",
      "Whether a variable is a local is the author's intent, which tf can't see: a project that names its locals by a " +
        "rule (a leading `_`, say) can say so with `tfscript.diagnostics.localPrefix`, and a write that would land on a " +
        "global of such a name is then a warning. tf's own library uses names with a leading `_` for globals, so no " +
        "prefix is assumed.",
    ],
    source: [
      { at: "expand.c:620", what: "text in a body runs the `SEND` hook, then is sent" },
      { at: "socket.c:2991", what: "handle_send_function() runs the `SEND` hook only for `-h`" },
    ],
    cases: ["lint-empty-body", "lint-empty-trigger-body", "lint-send-h", "set-writes-global-over-local", "tfread-writes-global-without-let"],
    sourceOnly: [
      "That `/send` passes `-h` on to `send()` is read from stdlib.tf's `/send` (lib/tf/stdlib.tf:103-115), and " +
        "that `send()` runs the `SEND` hook only for `-h`, so `/send` without it skips the hook, from socket.c:2991.",
      "That `/require` is `/let _required=1%; /load %{-L} %{L}`, and that `/loaded` ends the second load of a file, is " +
        "read from lib/tf/stdlib.tf:36-47; which library files run `/loaded` is read from lib/tf (scripts/extract-command-tables.js).",
      "That an assignment to a name with no variable makes a global upstream is read from upstream's expr.c, whose " +
        "assign() calls newglobalvar(); that it updates the nearest variable, a local first, from variable.c's " +
        "hfindnearestvar(). The fork's local_assign, which makes a local instead, is in its CHANGES.",
    ],
    codes: [
      {
        code: "empty-macro-body",
        severity: "warning",
        summary:
          "This macro's body is empty, so running it sends a blank line to the world. Give it a body, or put " +
          "`; tflint:ignore-nextline` on the line before if that is what you want.",
        detail:
          "a plain `/def` (no `-t`, `-h`, `-b` or `-B`) with nothing after its `=`, which sends an empty line when it " +
          "runs; a trigger, hook or key binding with an empty body sends nothing, so it isn't flagged",
      },
      {
        code: "load-of-library-file",
        severity: "warning",
        summary:
          "The file this `/load`s is one of tf's library files, so `/require` loads it only if it isn't loaded yet. Write " +
          "`/require`, or put `; tflint:ignore-nextline` on the line before if loading it again is the point.",
        detail:
          "a top-level `/load` of a library file that runs `/loaded`, named on its own (found through `TFPATH` or " +
          "`TFLIBDIR`); the fix writes `/require`. A file without `/loaded`, which `/require` would load again anyway, " +
          "isn't flagged",
      },
      {
        code: "set-writes-global",
        severity: "warning",
        summary:
          "This `/set` writes the global variable, not the macro's local of that name, which its own reads go on " +
          "seeing. Write `/let name=...` to change the local, or put `; tflint:ignore-nextline` on the line before if " +
          "the global is meant.",
        detail:
          "a `/set` in a macro body of a name the body made local with `/let` before it, or, with " +
          "`tfscript.diagnostics.localPrefix`, of a name starting with that prefix; the fix writes `/let`",
      },
      {
        code: "tfread-without-let",
        severity: "information (warning for a name with the project's local prefix)",
        summary:
          "This `tfread()` writes a global variable, as the macro has no local of that name, and the global outlives " +
          "the macro. Put `/let name=` before it for a local, or put `; tflint:ignore-nextline` on the line before if " +
          "the global is meant.",
        detail:
          "a `tfread()` in a macro body whose variable no `/let` before it made local; a warning where the name starts " +
          "with `tfscript.diagnostics.localPrefix`. The fix puts `/let name=%; ` before the statement",
      },
    ],
    fix: [
      "In code you write, send text to the world with `/send -h text`: it does what bare text does, the `SEND` hook " +
        "included, and says it is meant. Leave bare text already in a script as it is. Not `/send` alone, which " +
        "skips the hook, and not where the text starts with `-` or a substitution, which `/send` reads as an option.",
      "Load a library file with `/require`: `/require alias.tf`.",
      "In code you write, make every variable a macro only uses itself a local with `/let` before it is first " +
        "written (`/let _line=%; /while (tfread(h, _line) >= 0) ...`), and change it with `/let` or `:=`, never " +
        "`/set`, which writes the global.",
      "Turn a lint warning off where the shape is meant: `; tflint:ignore-nextline` on the line before.",
    ],
  },
];

/** Where docs/rules.md is published; each code is a heading there, so its slug is its anchor. */
export const RULES_DOC_URL = "https://github.com/huntwj/tfscript-language-server/blob/main/docs/rules.md";

/** The section holding `code`, and its entry, or undefined for a code the table doesn't know. */
export function findCode(code: string): { section: RuleSection; entry: CodeEntry } | undefined {
  for (const section of RULE_SECTIONS) {
    const entry = section.codes.find((c) => c.code === code);
    if (entry) return { section, entry };
  }
  return undefined;
}

/** The link to `code`'s entry in docs/rules.md. */
export function codeHref(code: string): string {
  return `${RULES_DOC_URL}#${code}`;
}

/** The anchor of a section's heading in docs/rules.md (GitHub's slug of "R2. Substitution level"). */
export function sectionSlug(section: RuleSection): string {
  return `${section.id}-${section.title}`.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
}
