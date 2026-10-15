/** One of tf's expression functions (src/funclist.h). */
export interface TfFunction {
  name: string;
  /** Fewest arguments tf accepts. */
  min: number;
  /** Most arguments tf accepts; null for any number. */
  max: number | null;
  /** `regmatch(s1, s2)`, from htmldoc/topics/functions.html, when it documents the function; substr() has two. */
  synopses?: string[];
  /** The compile-time option the function needs (`ENABLE_GMCP`), when it isn't always built. */
  requires?: string;
}

/** One of tf's special variables (src/varlist.h). */
export interface TfVariable {
  name: string;
  type: "string" | "integer" | "time" | "position" | "enum" | "flag";
  /** The names an enum or flag variable accepts (it also takes their numbers). */
  values?: string[];
  /** Its value when tf starts, where the table gives a literal one. */
  default?: string;
  requires?: string;
}
