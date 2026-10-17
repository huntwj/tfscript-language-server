---
type: llm
name: tf-correct
focus: {source: file, path: loot.tf}
weight: 2
---

The file is a TinyFugue script. Pass only if it defines a regexp trigger (/def -mregexp -t'...' name = ... or /trig with regexp matching) for that line, and the body tests the captured text with a plain expression such as /if (strstr({P1}, "gold") >= 0) or a regmatch() call; a condition that wraps the test in $[...] or writes %{P1} or %P1 inside the parentheses fails.
