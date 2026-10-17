---
name: nested-default
tags: [r6, hard]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write greet.tf, a TinyFugue script defining a macro /greet that echoes Hello, followed by a name: the macro's first argument if it was given one, else the value of the global variable defname if that isn't empty, else stranger. For example /greet bob echoes Hello, bob.
