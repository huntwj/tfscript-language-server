# Contributing

Thanks for looking at this project. The one thing that makes it different from a typical
linter: **every diagnostic rule has to be proven against real tf before it's implemented** —
see the README's "Why every rule here is proven against real tf" section. tf's own manual and
ordinary scripting intuition have both been wrong about its syntax in ways that only showed
up when a script was actually run, so guessing is not an acceptable substitute here.

## Reporting a false positive or false negative

This is the most useful contribution, and doesn't require touching any code:

1. Open an issue with the `.tf` snippet that's mishandled.
2. If you can run it against real tf yourself (TinyFugue, not this engine) and include the
   exact output, even better — that's the proof a fix would need anyway.
3. If you can't, say so; a plausible-looking snippet is still useful as a starting point.

## Proposing a new rule

The harness that proves rules against real tf (`tf-script-check`, a throwaway Docker
container) lives in a separate, private project this repo doesn't own, so it can't be run
from a plain clone of this repo. If you have a case you believe is real tf behavior:

- Open an issue describing the construct and, ideally, what real tf actually does with it
  (exact warning/error text, or confirmation that it's silently accepted).
- A pull request implementing the rule is welcome, but it will need to go through the same
  "proven against real tf" verification before merging — expect that step to happen in
  review rather than being something you can run yourself.

## Code changes

- `npm install && npm run build && npm test` should pass. `npm test` is fast and needs no
  external tools; it's what CI runs.
- The analysis lives in `packages/core` (`@tfscript/core`, no LSP dependency), the LSP server
  in `packages/server` and the `tfscript check` command line in `packages/cli`; each package's
  tests are in its own `test/` directory.
- Match the existing style in `packages/core/src/rules/`: one rule per file, a doc comment
  citing exactly where its behavior was confirmed (a tf source function, a proven test case, or
  both), and a regression test for any bug fixed.
- A new diagnostic code goes in the rule table, `packages/core/src/rules/table.ts`, under the
  rule section it comes from, with a summary and its proof
  (`packages/core/test/ruleTable.test.ts` fails otherwise). Then run `npm run docs:rules`, which
  regenerates `docs/rules.md`, the README's rule table and the files under `docs/generated/`
  (`packages/core/test/ruleDocs.test.ts` fails while they are out of date).
- The Claude Code plugin (`editors/claude-code`) carries the command line, the server and its hook
  (`packages/cli/src/hook/`) as single-file bundles, committed because a plugin installs from git.
  After changing any of their sources (core included), run `npm run bundle:claude-code` and commit
  the bundles with the change; CI runs `npm run bundle:claude-code:check`, which fails while they
  are out of date.
- `scripts/check-corpus-live.js` and `scripts/extract-command-tables.js` only run inside the
  maintainer's own workspace layout (a sibling private notes checkout, Docker, `uv`) — you
  don't need either of them to contribute; they're documented for transparency about how
  rules get verified, not as a contributor requirement.
