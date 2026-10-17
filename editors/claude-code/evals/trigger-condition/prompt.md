---
name: trigger-condition
tags: [r7, r2, trigger]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write loot.tf, a TinyFugue script with a trigger: when the MUD sends a line matching the regular expression ^You get (.*) from the corpse\.$ , if the item it captured contains the word gold, echo GOLD! .
