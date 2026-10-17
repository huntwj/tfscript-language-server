---
name: if-else-in-macro
tags: [r3, r5]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write hp.tf, a TinyFugue script defining a macro /checkhp. When the global variable hp is below 30 it echoes LOW and sets the variable alarm to 1; otherwise it echoes ok. After that, in either case, it echoes done.
