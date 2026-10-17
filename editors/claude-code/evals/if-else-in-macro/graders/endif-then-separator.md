---
type: regex
name: endif-then-separator
target: {source: file, path: hp.tf}
pattern: '/endif(?!%;)[ \t]*\\?\n?[ \t]*/'
match: not_contains
---

Checks for a statement after /endif with no %; between them.
