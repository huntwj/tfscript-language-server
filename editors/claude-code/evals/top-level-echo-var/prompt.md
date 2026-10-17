---
name: top-level-echo-var
tags: [r2, top-level, hard]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write start.tf, a TinyFugue script. At the top level of the file, not inside a macro, set the variable greeting to hello, then, if greeting isn't empty, echo the line: greeting is <the value of greeting>, taking the value from the variable rather than writing hello again.
