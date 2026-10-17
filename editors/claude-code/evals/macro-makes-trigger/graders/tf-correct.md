---
type: llm
name: tf-correct
focus: {source: file, path: mktrig.tf}
weight: 2
---

The file is a TinyFugue script. /mktrig's body defines a new trigger; whatever in that inner body must be substituted when the trigger fires (the matched line) has to be escaped with a doubled %, as in %%* or %%{*} (or %%{P0} with a regexp pattern that matches the whole line), while the word (%1 or %{1}) is substituted when /mktrig runs. Pass only if the trigger would echo saw: and the whole matched line; one % before *, {*} or P0 in the inner echo fails, and so does %%{P0} with a glob pattern (P0 is empty there).
