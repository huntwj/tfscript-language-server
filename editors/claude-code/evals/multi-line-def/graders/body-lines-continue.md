---
type: regex
name: body-lines-continue
target: {source: file, path: prep.tf}
pattern: '^[ \t]*(?:/send[ \t]+)?(?:wield|wear)\b[^\n]*[^\\\n]$'
flags: m
match: not_contains
---

Checks for a body line that doesn't end in \, which ends the macro there.
