---
type: regex
name: inner-line-deferred
target: {source: file, path: mktrig.tf}
pattern: '/echo[^\n]*(?<!%)%(?:\{\*\}|\*|\{?P0)'
match: not_contains
---

Checks for the new trigger's echo written with one %, which /mktrig substitutes when it runs instead of the trigger.
