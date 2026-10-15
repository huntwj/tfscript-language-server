import type { TfFunction } from "./data/types";

/** `regmatch(s1, s2)`, or one made from the argument counts when htmldoc has none. */
export function functionSynopses(f: TfFunction): string[] {
  if (f.synopses) return f.synopses;
  const args = Array.from({ length: f.min }, (_, i) => `arg${i + 1}`);
  if (f.max === null) args.push("...");
  else if (f.max > f.min) args.push(`[${f.max - f.min} more]`);
  return [`${f.name}(${args.join(", ")})`];
}
