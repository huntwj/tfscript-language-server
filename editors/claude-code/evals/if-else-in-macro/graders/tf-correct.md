---
type: llm
name: tf-correct
focus: {source: file, path: hp.tf}
weight: 2
---

The file is a TinyFugue script. Pass only if /checkhp is defined with /def checkhp = ..., its body is one command (one line, or lines joined by a trailing backslash), statements are separated by %; with a %; before /else and /endif and between /endif and the final /echo, no %; directly after the /if condition, and the condition reads hp as a variable (hp < 30 or {hp} < 30), not $[...] or %{hp}.
