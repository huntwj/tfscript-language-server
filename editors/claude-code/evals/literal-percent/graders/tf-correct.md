---
type: llm
name: tf-correct
focus: {source: file, path: sale.tf}
weight: 2
---

The file is a TinyFugue script. Pass only if /sale is defined and, when run, would print exactly Everything is 50%-off today. In a macro body %-off is read as a substitution, so the text must be written 50%%-off (or built some other way that tf prints literally); writing 50%-off as is fails.
