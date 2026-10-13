/**
 * The `%{...}` selectors that aren't variable names (htmldoc topics/substitution.html lists
 * them; these one-line descriptions are this project's own wording, MIT like the rest).
 */
export const SELECTORS: readonly { label: string; detail: string }[] = [
  { label: "*", detail: "all the macro's arguments" },
  { label: "#", detail: "how many arguments there are" },
  { label: "?", detail: "the return value of the last command run (builtin or macro)" },
  { label: "0", detail: "the name of the running macro" },
  { label: "1", detail: "the first argument (2, 3... the next ones)" },
  { label: "-1", detail: "every argument after the first (-2: after the second...)" },
  { label: "L", detail: "the last argument (L2: the one before it...)" },
  { label: "-L", detail: "every argument except the last (-L2: except the last two...)" },
  { label: "P0", detail: "the text the last successful regexp match in scope matched (P1, P2...: its groups)" },
  { label: "PL", detail: "the text before the last successful regexp match in scope" },
  { label: "PR", detail: "the text after the last successful regexp match in scope" },
  { label: "R", detail: "one argument chosen at random" },
];
