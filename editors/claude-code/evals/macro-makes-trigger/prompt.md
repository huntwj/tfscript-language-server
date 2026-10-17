---
name: macro-makes-trigger
tags: [r2, trigger, hard]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write mktrig.tf, a TinyFugue script defining a macro /mktrig. Running /mktrig <word> creates a trigger that fires on any line from the MUD containing that word and echoes saw: followed by the whole line that matched. For example, after /mktrig dragon, the line A dragon appears. makes it echo saw: A dragon appears.
