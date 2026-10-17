---
name: multi-line-def
tags: [r1, r4]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write prep.tf, a TinyFugue script defining a macro /prep that sends three commands to the MUD, in order: wield sword, wear shield, stand. Put each command on its own line of the file so it is easy to read.
