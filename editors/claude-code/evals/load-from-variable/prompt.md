---
name: load-from-variable
tags: [r2, r9]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep, Skill]
---

Write loader.tf, a TinyFugue script. At the top level it sets the variable mydir to /home/me/tf, then loads extra.tf from that directory, building the path from mydir rather than writing the directory out a second time.
