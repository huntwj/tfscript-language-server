---
type: llm
name: tf-correct
focus: {source: file, path: greet.tf}
weight: 2
---

The file is a TinyFugue script. Pass only if /greet echoes Hello, bob for /greet bob; Hello, <defname> with no argument when defname is set; and Hello, stranger when neither is. A substitution default nested as %{1-%{defname-stranger}} does this, as does an /if chain that tests {#} or {1} and defname correctly.
