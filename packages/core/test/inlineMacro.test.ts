import { describe, expect, it } from "vitest";
import type { Position, TfTextEdit } from "../src/diagnostics";
import { getInlineActions, type InlineOptions } from "../src/inlineMacro";
import { routeCodeActions, REFACTOR_INLINE } from "../src/codeActions";

/** Applies edits, last first, so earlier positions stay valid. */
function apply(text: string, edits: TfTextEdit[]): string {
  const lines = text.split("\n");
  const offset = (p: Position): number => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  let out = text;
  for (const e of [...edits].sort((a, b) => offset(b.range.start) - offset(a.range.start))) {
    out = out.slice(0, offset(e.range.start)) + e.newText + out.slice(offset(e.range.end));
  }
  return out;
}

/** The position one character into the first `sub` in `text`. */
function at(text: string, sub: string): Position {
  const i = text.indexOf(sub);
  if (i < 0) throw new Error(`no ${sub}`);
  const before = text.slice(0, i + 1).split("\n");
  return { line: before.length - 1, character: (before[before.length - 1] as string).length };
}

function actions(text: string, sub: string, options: InlineOptions = {}) {
  const p = at(text, sub);
  return getInlineActions(text, { start: p, end: p }, options);
}

function inline(text: string, sub: string, options: InlineOptions = {}): string | undefined {
  const a = actions(text, sub, options).find((x) => x.title.startsWith("Inline /"));
  return a && !a.disabled ? apply(text, a.edits) : undefined;
}

function inlineAll(text: string, sub: string, options: InlineOptions = {}): string | undefined {
  const a = actions(text, sub, options).find((x) => x.title.startsWith("Inline all"));
  return a && !a.disabled ? apply(text, a.edits) : undefined;
}

function reason(text: string, sub: string, options: InlineOptions = {}): string | undefined {
  return actions(text, sub, options).find((x) => x.title.startsWith("Inline /"))?.disabled;
}

describe("inline a macro", () => {
  it("replaces a call with the body, on the call's line", () => {
    const text = "/def -i hi = /echo hi%; /echo there\n/def -i go = /echo a%; /hi%; /echo b\n";
    expect(inline(text, "/hi%;")).toBe("/def -i hi = /echo hi%; /echo there\n/def -i go = /echo a%; /echo hi%; /echo there%; /echo b\n");
  });

  it("inlines a call that passes %*, but not one with no arguments when the body reads them", () => {
    const text = "/def -i hi = /echo %1 %*\n/def -i go = /hi %*%; /hi\n";
    expect(inline(text, "/hi %*")).toBe("/def -i hi = /echo %1 %*\n/def -i go = /echo %1 %*%; /hi\n");
    expect(reason(text, "/hi\n")).toMatch(/reads its arguments, which this call doesn't pass/);
    expect(reason("/def -i hi = /echo %%1\n/def -i go = /hi\n", "/hi\n")).toMatch(/reads its arguments/);
    expect(reason("/def -i hi = /echo x\n/def -i go = /hi a b\n", "/hi a")).toMatch(/arguments of its own/);
  });

  it("drops a %; that only ends the body, so no empty statement is made", () => {
    const text = "/def -i hi = /echo a%;\n/def -i go = /hi%; /echo b\n";
    expect(inline(text, "/hi%;")).toBe("/def -i hi = /echo a%;\n/def -i go = /echo a%; /echo b\n");
  });

  it("inlines into an /if branch", () => {
    const text = "/def -i hi = /echo a%; /echo b\n/def -i go = /if (1) /hi%; /else /echo n%; /endif\n";
    expect(inline(text, "/hi%;")).toBe("/def -i hi = /echo a%; /echo b\n/def -i go = /if (1) /echo a%; /echo b%; /else /echo n%; /endif\n");
  });

  it("lays a body out one statement per line in a macro written over several lines, ending lines as the caller does", () => {
    const text = ["/def -i hi = /echo a%; /if (1) /echo b%; /endif", "/def -i go = \\", "    /echo x%; \\", "    /hi%; \\", "    /echo y", ""].join("\n");
    expect(inline(text, "/hi%;")).toBe(
      [
        "/def -i hi = /echo a%; /if (1) /echo b%; /endif",
        "/def -i go = \\",
        "    /echo x%; \\",
        "    /echo a%; \\",
        "    /if (1) \\",
        "        /echo b%; \\",
        "    /endif%; \\",
        "    /echo y",
        "",
      ].join("\n"),
    );
  });

  it("refuses what would run differently in the caller", () => {
    const def = (body: string, caller = "/hi%; /echo b"): string => `/def -i hi = ${body}\n/def -i go = ${caller}\n`;
    expect(reason(def("/return 1"), "/hi%;")).toMatch(/\/return would end \/go/);
    expect(reason(def("/result 1"), "/hi%;")).toMatch(/\/result would end/);
    expect(reason(def("/shift"), "/hi%;")).toMatch(/\/shift/);
    expect(reason(def("/echo %0"), "/hi%;")).toMatch(/%0/);
    expect(reason(def('/test getopts("a", "")'), "/hi%;")).toMatch(/getopts\(\)/);
    expect(reason(def("/echo a%; /break", "/while (1) /hi%; /done"), "/hi%;")).toMatch(/\/break in \/hi ends \/hi/);
    expect(inline(def("/while (1) /break%; /done"), "/hi%;")).toBeDefined();
    expect(reason(def("/let x=1%; /echo %x", "/hi%; /echo %x"), "/hi%;")).toMatch(/\/lets x.*\/go uses x itself/);
    expect(reason(def("/let x=1", "/hi%; /other"), "/hi%;")).toMatch(/also runs \/other/);
    expect(inline(def("/let x=1%; /echo %x"), "/hi%;")).toBeDefined();
    expect(reason(def("/test fresh := 4", "/hi%; /echo %fresh"), "/hi%;")).toMatch(/assigns fresh/);
    // An assignment to the caller's own /let sets that local either way.
    expect(inline(def("/test n := n + 1", "/let n=1%; /hi%; /echo %n"), "/hi%;")).toBeDefined();
    expect(reason(def("/test n := n + 1", "/if (1) /let n=1%; /endif%; /hi%; /echo %n"), "/hi%;")).toMatch(/assigns n/);
    expect(reason(def('/test regmatch("b", "abc")', "/hi%; /echo %P0"), "/hi%;")).toMatch(/regmatch\(\)/);
    expect(reason(def("/echo a", "/!hi%; /echo b"), "/!hi")).toMatch(/negates/);
    expect(reason(def("/echo a", "/echo $(/hi)"), "/hi)")).toMatch(/\$\(\.\.\.\)/);
    expect(reason(def("/echo a", "/if /hi%; /then /echo y%; /endif"), "/hi%;")).toMatch(/condition list/);
    expect(reason(def("/echo a", "/hi %| /echo b"), "/hi %|")).toMatch(/%\|/);
    expect(reason(def("/echo a\t b"), "/hi%;")).toMatch(/tab/);
    expect(reason(def(""), "/hi%;")).toMatch(/empty/);
    expect(reason(def("/echo a%; /hi"), "/hi%; /echo b")).toMatch(/calls itself/);
  });

  it("refuses a macro that may have another /def", () => {
    expect(reason("/def -i hi = /echo a\n/def -i hi = /echo b\n/def -i go = /hi\n", "/hi\n")).toMatch(/defined more than once/);
    expect(reason("/def -i h%1 = /echo a\n/def -i hi = /echo b\n/def -i go = /hi\n", "/hi\n")).toMatch(/defined more than once/);
    expect(reason("/def -i hi = /echo a\n/def -i go = /hi\n", "/hi\n", { definedOutside: (n) => n === "hi" })).toMatch(/another file/);
    expect(reason("/def -i hi = /echo a\n/def -i go = /hi\n/undef hi\n", "/hi\n")).toMatch(/undefines or edits/);
  });

  it("leaves calls in tf's library alone, whose macros are there to be redefined", () => {
    const text = "/def -i proxy_command = /proxy_connect\n/def -i proxy_connect = telnet x\n";
    const all = actions(text, "/proxy_connect\n", { library: true });
    expect(all.map((a) => a.title)).toEqual(["Inline /proxy_connect", "Inline all calls to /proxy_connect and remove it"]);
    expect(all.every((a) => a.disabled?.includes("tf's library"))).toBe(true);
  });

  it("refuses a /def after the caller when a command between them may run the caller first", () => {
    const text = "/def -i go = /hi\n/go\n/def -i hi = /echo a\n";
    expect(reason(text, "/hi\n")).toMatch(/defined after this macro/);
    expect(inline("/def -i go = /hi\n/def -i hi = /echo a\n", "/hi\n")).toBe("/def -i go = /echo a\n/def -i hi = /echo a\n");
  });

  it("offers nothing for a builtin, a /@ call, a top-level call or a CRLF file", () => {
    expect(actions("/def -i go = /echo a\n", "/echo")).toEqual([]);
    expect(actions("/def -i echo = /@echo x\n/def -i go = /@echo a\n", "/@echo a").filter((a) => a.title.startsWith("Inline /"))).toEqual([]);
    expect(actions("/def -i hi = /echo a\n/hi\n", "/hi\n")).toEqual([]);
    expect(actions("/def -i hi = /echo a\r\n/def -i go = /hi\r\n", "/hi\r")).toEqual([]);
  });

  it("inlines every call and removes the /def, with its ;;; doc comment", () => {
    const text = ";;; says shared\n/def -i hi = /echo shared\n\n/def -i one = /hi%; /echo 1\n/def -i two = /echo 2%; /hi\n";
    expect(inlineAll(text, "/hi%;")).toBe("/def -i one = /echo shared%; /echo 1\n/def -i two = /echo 2%; /echo shared\n");
    expect(inlineAll(text, "hi =")).toBe("/def -i one = /echo shared%; /echo 1\n/def -i two = /echo 2%; /echo shared\n");
  });

  it("refuses to remove a /def something else still needs", () => {
    const a = (text: string, sub: string, options: InlineOptions = {}) => actions(text, sub, options).find((x) => x.title.startsWith("Inline all"))?.disabled;
    expect(a("/def -i -t'ping' hi = /echo a\n/def -i go = /hi\n", "/hi\n")).toMatch(/options other than -i/);
    expect(a("/def -i hi = /echo a\n/def -i go = /hi\n", "/hi\n", { mentionedOutside: (n) => n === "hi" })).toMatch(/Another file/);
    expect(a("/def -i hi = /echo a\n/def -i go = /hi%; /test ismacro('hi')\n", "/hi%;")).toMatch(/names \/hi other than/);
    expect(a("/def -i hi = /echo a\n/def -i go = /hi%; /eval /hi\n", "/hi%;")).toMatch(/can't take its body/);
    expect(a("/def -i hi = /echo %1\n/def -i go = /hi %*%; /hi\n", "/hi %*")).toMatch(/^The call on line 2: /);
    expect(a("/def -i hi = /echo a\n/def -i go = /hi%; /def -i inner = /hi\n", "/hi%;")).toMatch(/from a \/def inside another macro's body, on line 2/);
    expect(a("/def -i hi = /echo a\n/def -i go = /hi%; /eval /hi\n", "/hi%;")).toMatch(/from \/eval text on line 2/);
  });

  it("removes only the ;;; doc block directly above, not one a blank line separates", () => {
    const text = ";;; file notes\n\n/def -i hi = /echo shared\n\n/def -i one = /hi\n";
    expect(inlineAll(text, "/hi\n")).toBe(";;; file notes\n\n/def -i one = /echo shared\n");
  });
});

describe("inline: what the loop and the caller's callers see", () => {
  it("refuses a body that makes a local, when the call is inside a /while", () => {
    // In tf, `/let n=$[n+1]` called in a /while gave 1,1,1; inlined it gave 1,2,3.
    const loop = (body: string): string => `/def -i hi = ${body}\n/def -i go = /let i=0%; /while (i<3) /hi%; /test ++i%; /done\n`;
    expect(reason(loop("/let n=$[n+1]%; /echo %n"), "/hi%;")).toMatch(/inside a \/while, and \/hi makes a local n/);
    expect(reason(loop("/test c := c + 1%; /echo %c"), "/hi%;")).toMatch(/makes a local c/);
    expect(reason(loop("/if (seen) /echo s%; /endif%; /let seen=1"), "/hi%;")).toMatch(/makes a local seen/);
    expect(inline(loop("/echo a"), "/hi%;")).toBeDefined();
    // An assignment to the caller's own /let sets that local, in the loop or not.
    expect(inline("/def -i hi = /test n := n + 1\n/def -i go = /let n=0%; /while (n<3) /hi%; /done\n", "/hi%;")).toBeDefined();
  });

  it("refuses %* when the caller is called as a function, whose arguments %* splits again", () => {
    // In tf, go("p q", "r") gave /hi %1=[p], but the inlined body %1=[p q].
    const text = "/def -i hi = /echo %1\n/def -i go = /hi %*\n";
    expect(reason(text, "/hi %*", { calledAsFunction: (n) => n === "go" })).toMatch(/called as a function, go\(\.\.\.\)/);
    expect(inline(text, "/hi %*")).toBeDefined();
    expect(inline("/def -i hi = /echo a\n/def -i go = /hi %*\n", "/hi %*", { calledAsFunction: () => true })).toBeDefined();
  });

  it("refuses a body that runs text built when it runs, when the call passes no arguments", () => {
    // In tf, `/eval %{cmd}` with cmd holding %1 read the arguments of the macro running it.
    expect(reason("/def -i hi = /eval %{cmd}\n/def -i go = /hi\n", "/hi\n")).toMatch(/reads its arguments/);
    expect(reason('/def -i hi = /test eval(x)\n/def -i go = /hi\n', "/hi\n")).toMatch(/reads its arguments/);
    expect(inline("/def -i hi = /eval /echo plain\n/def -i go = /hi\n", "/hi\n")).toBeDefined();
  });

  it("refuses /break 0, which tf refuses to compile", () => {
    expect(inline("/def -i hi = /while (1) /break 0%; /done\n/def -i go = /hi\n", "/hi\n")).toBeUndefined();
  });

  it("ends laid-out lines the way the caller's other lines do", () => {
    const text = ["/def -i hi = /echo a%; /echo b", "/def -i go = \\", "    /echo x%; \\", "    /hi", ""].join("\n");
    expect(inline(text, "/hi\n")).toBe(["/def -i hi = /echo a%; /echo b", "/def -i go = \\", "    /echo x%; \\", "    /echo a%; \\", "    /echo b", ""].join("\n"));
  });
});

describe("routing", () => {
  it("offers inlining as refactor.inline, only when asked, and disabled ones only to clients that show why", () => {
    const text = "/def -i hi = /return 1\n/def -i go = /hi\n";
    const p = at(text, "/hi\n");
    const range = { start: p, end: p };
    expect(routeCodeActions(text, { range, triggerKind: 2 }).filter((a) => a.kind === REFACTOR_INLINE)).toEqual([]);
    expect(routeCodeActions(text, { range, triggerKind: 1 }).filter((a) => a.kind === REFACTOR_INLINE)).toEqual([]);
    const shown = routeCodeActions(text, { range, triggerKind: 1, disabledSupport: true }).filter((a) => a.kind === REFACTOR_INLINE);
    expect(shown.map((a) => a.title)).toEqual(["Inline /hi", "Inline all calls to /hi and remove it"]);
    expect(shown.every((a) => a.disabled)).toBe(true);
    const ok = "/def -i hi = /echo a\n/def -i go = /hi\n";
    expect(routeCodeActions(ok, { range, triggerKind: 1, only: ["refactor.inline"] }).map((a) => a.kind)).toEqual([REFACTOR_INLINE, REFACTOR_INLINE]);
  });
});
