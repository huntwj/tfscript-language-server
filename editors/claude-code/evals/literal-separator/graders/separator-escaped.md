---
type: regex
name: separator-escaped
target: {source: file, path: legend.tf}
pattern: '(?<!%)%; to separate'
match: not_contains
---

Checks for a bare %;, which splits the body there.
