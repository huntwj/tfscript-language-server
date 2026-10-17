---
type: regex
name: no-empty-statement-after-condition
target: {source: file, path: hp.tf}
pattern: '/(?:if|elseif)[ \t]*\([^\n]*\)[ \t]*%;'
match: not_contains
---

Checks for a %; straight after an /if condition, an empty statement.
