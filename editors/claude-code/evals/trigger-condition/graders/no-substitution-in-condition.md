---
type: regex
name: no-substitution-in-condition
target: {source: file, path: loot.tf}
pattern: '/if[ \t]*\([^\n]*(?:\$\[|%\{?P1)'
match: not_contains
---

Checks for a $[...] or %P1 inside the /if condition.
