---
type: regex
name: if-lines-continue
target: {source: file, path: startup.tf}
pattern: '^[ \t]*/if\b(?![^\n]*/endif)[^\n]*[^\\\n]$'
flags: m
match: not_contains
---

Checks for an /if line that neither holds its /endif nor ends in \.
