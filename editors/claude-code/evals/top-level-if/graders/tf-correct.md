---
type: llm
name: tf-correct
focus: {source: file, path: startup.tf}
weight: 2
---

The file is a TinyFugue script. Judge only its tf correctness. Pass only if: the /if ... /endif is one command, either on one line or with every line but the last ending in a backslash; the statements inside it are separated by %; ; it tests hp_warn as a variable in the condition (hp_warn or {hp_warn} are both right, for example /if (hp_warn =~ "") or /if ({hp_warn} =~ "")), not with %{hp_warn}; and it sets hp_warn to 50 and echoes the message only when hp_warn was empty.
