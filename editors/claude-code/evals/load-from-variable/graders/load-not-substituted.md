---
type: regex
name: load-not-substituted
target: {source: file, path: loader.tf}
pattern: '^[ \t]*/load[ \t]+[^\n]*%'
flags: m
match: not_contains
---

Checks for a top-level /load whose path holds a substitution tf won't do there.
