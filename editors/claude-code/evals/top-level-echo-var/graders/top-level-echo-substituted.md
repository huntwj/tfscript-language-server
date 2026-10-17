---
type: regex
name: top-level-echo-substituted
target: {source: file, path: start.tf}
pattern: '^(?![ \t]*/def)(?:(?!/eval)[^\n])*/echo[^\n]*(?:%\{?greeting|\$\[)'
flags: m
match: not_contains
---

Checks for a top-level /echo of %{greeting} or $[...] with no /eval, which tf prints as written.
