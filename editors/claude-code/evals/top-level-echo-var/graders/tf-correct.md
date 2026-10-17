---
type: llm
name: tf-correct
focus: {source: file, path: start.tf}
weight: 2
---

The file is a TinyFugue script. At the top level of a file (and inside a top-level /if), tf does not substitute %{greeting} or $[...]: /echo greeting is %{greeting} prints those characters. Pass only if the echo goes through /eval (for example /if (greeting !~ "") /eval /echo greeting is %{greeting}%; /endif) or otherwise really prints greeting is hello, and the condition tests the variable.
