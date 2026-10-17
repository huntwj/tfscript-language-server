---
type: regex
name: percent-dash-escaped
target: {source: file, path: sale.tf}
pattern: '50%-off'
match: not_contains
---

Checks for %- starts a substitution; the literal needs %%-.
