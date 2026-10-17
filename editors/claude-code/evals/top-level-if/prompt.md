---
name: top-level-if
tags: [r1, top-level]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write startup.tf, a TinyFugue script tf loads at start-up. At the top level of the file, not inside a macro, it should set the variable hp_warn to 50 when hp_warn is empty, and echo "hp_warn defaulted to 50" when it does. Lay the /if out over several lines so it is easy to read.
