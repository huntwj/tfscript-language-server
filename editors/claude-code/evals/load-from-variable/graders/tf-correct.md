---
type: llm
name: tf-correct
focus: {source: file, path: loader.tf}
weight: 2
---

The file is a TinyFugue script. Pass only if the variable is set with /set (or equivalent) and the load is written so tf substitutes the variable: at the top level of a file a plain /load %{mydir}/extra.tf is not substituted, so it must be /eval /load %{mydir}/extra.tf (or the load must run inside a macro). A plain top-level /load with %{mydir} fails.
