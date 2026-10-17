---
type: regex
name: uses-eval
target: {source: file, path: loader.tf}
pattern: '/eval[ \t]+/load'
match: contains
---

Checks for /eval /load, which builds the path.
