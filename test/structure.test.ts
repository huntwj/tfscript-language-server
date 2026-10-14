import { describe, expect, it } from "vitest";
import { checkStructure, macroBodyStart, parseRegions, parseStatements, type StructureMode } from "../src/structure";

/**
 * Every input here was run through real tf (tf-script-check, 2026-10-13): the macro bodies as
 * `/def -i name = BODY` and then run, the top-level lines loaded from a file. The comment on each
 * is what tf printed.
 */
function issue(text: string, mode: StructureMode = "body"): string {
  const found = checkStructure(text, mode);
  return found.map((i) => `${i.kind}@${text.slice(i.start, i.end)}`).join(" ");
}

describe("checkStructure in a macro body", () => {
  it("reports a block left open, pointing at a keyword swallowed mid-statement when there is one", () => {
    // expected /endif, found end of body
    expect(issue("/if (1) /echo yes /else /echo no /endif")).toBe("block@/else");
    expect(issue("/if (1) /echo a%; /echo b")).toBe("block@/if");
    // expected /done, found end of body
    expect(issue("/while (0) /echo a")).toBe("block@/while");
    // expected end of statement after /endif / after /done
    expect(issue("/if (1) /echo a%; /endif /echo b")).toBe("block@/echo");
    expect(issue("/echo a %; /while (0) /echo x%; /done /echo after")).toBe("block@/echo");
  });

  it("explains the swallowed keyword", () => {
    const [found] = checkStructure("/if (1) /echo yes /else /echo no /endif", "body");
    expect(found?.message).toBe("/else here is not a keyword: it is part of the /echo command, so the /if is never closed.");
    expect(found?.explanation).toContain("Put `%;` before each keyword");
  });

  it("reports keywords with no block to belong to", () => {
    expect(issue("/echo a%; /endif")).toBe("block@/endif"); // unexpected /ENDIF in outer block
    expect(issue("/if (1) /echo a%; /else /echo b%; /else /echo c%; /endif")).toBe("block@/else"); // in ELSE block
    expect(issue("/if (1) /echo a%; /done")).toBe("block@/done"); // in IF body
    expect(issue("/then /echo x")).toBe("block@/then");
    expect(issue("/do /echo x")).toBe("block@/do");
    expect(issue("/while (0) /echo a%; /endif")).toBe("block@/endif"); // in WHILE body
    expect(issue("/if (1) /echo a%; /endif%; /elseif (1) /echo x")).toBe("block@/elseif");
    expect(issue("/if (1) /echo a%; /else /echo b%; /elseif (1) /echo c%; /endif")).toBe("block@/elseif");
    expect(issue("/if (1) /then /echo x%; /endif")).toBe("block@/then"); // unexpected /THEN in IF body
  });

  it("says what is unclosed and how to close it, in plain words", () => {
    expect(checkStructure('/echo $["abc]', "body")[0]?.message).toBe('This string is never closed: add the closing ".');
    expect(checkStructure("/echo $[1+2", "body")[0]?.message).toBe("This $[ is never closed: add ].");
    expect(checkStructure("/echo %{x y}", "body")[0]?.message).toBe("This %{ needs its } before the space.");
    // A CRLF file's \r ends the line; it isn't a character in the name.
    expect(checkStructure("/echo %{foo\r", "body")[0]?.message).toBe("This %{ is never closed: add }.");
  });

  it("knows a condition list needs %; before its /then", () => {
    // /test reads "1 /then /echo co" as its expression; then /endif is unexpected in IF block
    expect(issue("/if /test 1 /then /echo co%; /endif")).toBe("block@/then");
    expect(issue("/if /test 1 %; /echo a%; /endif")).toBe("block@/endif");
    expect(issue("/if (1) /echo a%; /elseif /echo b%; /endif")).toBe("block@/endif");
  });

  it("reports substitutions, strings and conditions that never close", () => {
    expect(issue("/echo $[1+2")).toBe("bracket@$["); // unmatched $[
    expect(issue("/echo %{foo")).toBe("bracket@%{"); // unmatched { or bad substitution
    expect(issue("/echo ${foo")).toBe("bracket@${"); // unmatched ${
    expect(issue("/echo $(/echo x")).toBe("bracket@$("); // unmatched (
    expect(issue('/echo $["abc]')).toBe('bracket@"'); // unmatched " in string literal
    expect(issue("/if (1 /echo a%; /endif")).toBe("bracket@("); // condition syntax error
    expect(issue("/test (1 + 2")).toBe("bracket@("); // expected ')' after '(...'
    expect(issue('/result redisCmd("RPUSH", {1}, redisEscape({2})')).toBe("bracket@(");
    expect(checkStructure('/result redisCmd("RPUSH", {1}, redisEscape({2})', "body")[0]?.start).toBe(16); // the redisCmd( one
    expect(issue('/test strlen("a"%; /echo after')).toBe("bracket@("); // reported, then runs on
    expect(issue("/echo $[1+(2]")).toBe("bracket@]"); // expected ')' after '(...', found ']'
    expect(issue("/echo %{x y}")).toBe("bracket@%{"); // unmatched { or illegal character ' '
    expect(issue("/echo %{x-a%;b}")).toBe("bracket@%{"); // unmatched { or illegal character '%'
  });

  it("knows a %- that names no selector is an error, not text", () => {
    // illegal character '-' in substitution, each of these
    expect(issue("/echo 50%-off")).toBe("bracket@%-off");
    expect(issue("/echo 50%- off")).toBe("bracket@%-");
    expect(issue("/echo %-P1")).toBe("bracket@%-P1");
    expect(issue("/echo %-*")).toBe("bracket@%-*");
    expect(issue("/echo ok %-L %-2 %{-L2} 50%%-off")).toBe("");
  });

  it("knows %\\ separates, like %; and %|", () => {
    expect(issue("/echo a%\\/echo b")).toBe("");
    expect(issue("/if (1) /echo ok%\\/endif")).toBe("");
    expect(issue("/if (1) /echo ok%; /endif%\\/echo b")).toBe("");
  });

  it("reads $(...), ${...} and {var-default} in an expression as a body does, where quotes are text", () => {
    expect(issue("/if ($(/echo it's) =~ \"it's\") /echo ok%; /endif")).toBe("");
    expect(issue("/if ({1-it's} =~ \"it's\") /echo ok%; /endif")).toBe("");
    expect(issue("/echo ok $[ ${it's} ]")).toBe("");
  });

  it("reports a ) with nothing to close in /test and $[...]", () => {
    expect(issue("/test 1)%; /echo after")).toBe("bracket@)"); // expected end of expression, found ')'
    expect(issue("/echo $[ 1 ) ]")).toBe("bracket@)"); // expected operator or ']', found ')'
  });

  it("only points at a mid-statement keyword that would fix the error", () => {
    // The real error is the second /else, not the /then in the first /echo's text.
    expect(issue("/if (a) /echo use /then here %; /else /echo b %; /else /echo c %; /endif")).toBe("block@/else");
    expect(issue("/echo see /else docs %; /endif")).toBe("block@/endif");
    // An /endif inside $(...) or a closed block is no help to the /if outside it.
    expect(issue("/if (1) /echo x $(/echo /endif)")).toBe("block@/if");
    expect(issue("/if (1) /if (2) /echo /endif%; /endif")).toBe("block@/if");
  });

  it("leaves only the /endif after a /let name=value to let-swallows-endif", () => {
    expect(issue("/if (1) /let v=1 /endif")).toBe("");
    // tf: expected /endif, found end of body; let-swallows-endif doesn't match "/let y 1"
    expect(issue("/if (1) /let y 1 /endif")).toBe("block@/endif");
  });

  it("reads backtick strings in expressions", () => {
    expect(issue("/test regmatch(`a'b\"c`, \"x\")%; /echo ok")).toBe("");
    expect(issue("/echo ok $[strlen(`a]`)]")).toBe("");
  });

  it("leaves well-formed bodies alone", () => {
    for (const body of [
      "/if /test 1%; /then /echo ok%; /endif",
      "/if /echo ok%; /then /echo ok2%; /endif",
      "/let i=0%; /while (i < 1) /let i=$[i+1]%; /echo ok%; /done",
      "/if (0) /echo a%; /elseif (1) /echo ok%; /else /echo c%; /endif",
      "/while (1) /echo ok%; /break%; /done",
      '/echo ok $[strcat("a]", "b")] %{foo-x}',
      "/if (1) /if (1) /echo ok%; /endif%; /endif",
      "/def -i inner = /if (1) /echo ok%%; /endif%; /inner",
      "/if (1) /echo ok%; /endif%; /echo ok2",
      "/while /test 0%; /do /echo x%; /done%; /echo ok",
      "/if (1) /echo ok%; /ENDIF",
      "/@if (1) /echo ok%; /@endif",
      "/if (1) /echo ok %; /endif %; /echo ok2",
      "/echo ok $(/echo x) ${foo}",
      "/while (0) /echo x%; /done%; /if (1) /echo ok%; /endif",
      "/test 1%; /if (1) /echo ok%; /endif",
      '/echo qa "x%; /echo qa2 y"',
      "/echo qb x%%; /echo qb2 /endif",
      "/echo qc x%%%; /echo qc2 /endif",
      "/echo qd x\\%; /echo qd2 /endif",
      "/if /test 1%; /then /echo ok%; /else /echo b%; /endif",
      "/if /test 0%; /then /echo a%; /elseif /test 1%; /then /echo ok%; /endif",
      "/break",
      "/if (1) /echo ok%;/endif%;/echo ok2",
      "/if (1) /echo ok%; /else /if (0) /echo x%; /endif%; /endif",
      '/echo qo $[ "%;" ]',
      '/if ("%;" =~ "x") /echo a%; /endif%; /echo ok',
      "/echo -e %% qq $(/echo -e %%%% inner) after",
      "/echo ok %{1} %{-L} %{L2} %{P1} %{#} %{*} %{?} %{-1} %-1 %* %{PL} %{R}",
    ]) {
      expect(issue(body), body).toBe("");
    }
  });

  it("warns about a %; straight after /if (...) or /else, and carries on", () => {
    expect(issue("/if (1)%; /echo ok%; /endif")).toBe("blank-line@%;");
    expect(issue("/if (1) /echo ok%; /else%; /endif")).toBe("blank-line@%;");
  });
});

describe("checkStructure on a top-level line", () => {
  it("only reads keywords: plain commands are one statement, with nothing substituted", () => {
    for (const line of [
      "/echo top1 $[1+2",
      "/echo top2 %{foo",
      '/echo top3 "abc',
      "/echo top7 /endif /else",
      "/echo top10 ${foo",
      "/if (1) /echo top-a $[1+2 %; /endif",
      "/while (0) /echo x %; /done %; /echo top-b",
      "/if (1) /echo top-c%;/endif",
      "/IF (1) /echo top-e%; /EndIf",
      "/break",
    ]) {
      expect(issue(line, "top"), line).toBe("");
    }
  });

  it("reports blocks and conditions as tf does when it loads the file", () => {
    expect(issue("/if (1) /echo top4", "top")).toBe("if-top@/if");
    expect(issue("/endif", "top")).toBe("block@/endif");
    expect(issue("/then", "top")).toBe("block@/then");
    expect(issue("/if (1 /echo top6%; /endif", "top")).toBe("bracket@(");
    expect(issue("/if (1) /echo top9%; /endif /echo y", "top")).toBe("block@/echo");
    expect(issue("/test (1 + 2", "top")).toBe("bracket@(");
  });
});

describe("macroBodyStart", () => {
  it("finds the body after =, past quoted options, and after an /alias name", () => {
    const def = '/def -t"a=b" foo = /echo x';
    expect(def.slice(macroBodyStart(def))).toBe(" /echo x");
    expect("/alias foo /echo x".slice(macroBodyStart("/alias foo /echo x"))).toBe("/echo x");
    // An unquoted option argument runs to the next blank, = and all (macro_spec(), nextopt()).
    const trig = "/def -t*hp=* -i foo = /echo x";
    expect(trig.slice(macroBodyStart(trig))).toBe(" /echo x");
    const regexp = "/def -mregexp -t^HP=(\\d+) hp = /echo x";
    expect(regexp.slice(macroBodyStart(regexp))).toBe(" /echo x");
    // /bind, /hook and /trig take the first = of all (split_args()), quotes or not.
    expect("/trig a\"=b\" = /echo x".slice(macroBodyStart("/trig a\"=b\" = /echo x"))).toBe("b\" = /echo x");
    expect(macroBodyStart("/def foo")).toBe(-1);
    expect(macroBodyStart("/echo a = b")).toBe(-1);
  });
});

describe("parseStatements", () => {
  const texts = (text: string, mode: StructureMode) => parseStatements(text, mode).map((st) => text.slice(st.start, st.end));

  it("splits a body on %; but reads a plain top-level command to the end of the line", () => {
    expect(texts("/load a.tf%; /echo x", "body")).toEqual(["/load a.tf", "/echo x"]);
    expect(texts("/load a.tf%; /echo x", "top")).toEqual(["/load a.tf%; /echo x"]);
    expect(texts("/if (1) /load a.tf%; /endif", "top")).toEqual(["/load a.tf"]);
  });

  it("gives nothing when compiling stops at an error, since tf then runs none of it", () => {
    // Real tf: this top-level line loaded nothing and echoed nothing.
    expect(texts("/if (1) /load a.tf%; /echo x", "top")).toEqual([]);
    expect(texts("/echo a%; /if (1) /echo b", "body")).toEqual([]);
  });
});

describe("deep nesting", () => {
  it("gives up instead of overflowing the stack", () => {
    const n = 5000;
    const bodies = [
      `${"/if (1) ".repeat(n)}/echo x${"%; /endif".repeat(n)}`,
      `/echo ${"$(/echo ".repeat(n)}${")".repeat(n)}`,
      `/echo ${"$[".repeat(n)}1${"]".repeat(n)}`,
      `/echo ${"%{x-".repeat(n)}${"}".repeat(n)}`,
    ];
    for (const body of bodies) {
      expect(() => checkStructure(body, "body")).not.toThrow();
      // It says where it stopped, rather than leaving the rest silently unchecked.
      expect(checkStructure(body, "body").map((i) => i.kind)).toEqual(["too-deep"]);
    }
    expect(() => checkStructure(`${"/if (1) ".repeat(n)}/echo x${"%; /endif".repeat(n)}`, "top")).not.toThrow();
    expect(checkStructure(`${"/if (1) ".repeat(390)}/echo x${"%; /endif".repeat(390)}`, "body")).toEqual([]);
  });

  // The check stopping isn't tf stopping: tf runs the text, so the statements already read stand.
  it("keeps the statements read before it gives up, and follows 250 levels in full", () => {
    const deep = (n: number) => `/echo ${"$[".repeat(n)}1${"]".repeat(n)}`;
    const texts = (text: string) => parseStatements(text, "body").map((st) => text.slice(st.start, st.end));
    expect(texts(`/load a.tf%; ${deep(5000)}`)).toEqual(["/load a.tf"]);
    expect(texts(`${deep(250)}%; /load a.tf`)).toEqual([deep(250), "/load a.tf"]);
  });
});

describe("parseRegions", () => {
  const regions = (text: string, mode: StructureMode) =>
    parseRegions(text, mode).expressions.map((ex) => `${ex.kind}${ex.level ? `/${ex.level}` : ""}:${text.slice(ex.start, ex.end)}`);

  it("finds every expression tf compiles: $[...], conditions, and /test, /return and /result text", () => {
    expect(regions("/if (x > 1) /test y := $[z]%; /endif%; /@result w%; /echo $[v]", "body")).toEqual([
      "condition:x > 1",
      "bracket:z",
      "statement/full:y := $[z]",
      "statement/full:w",
      "bracket:v",
    ]);
  });

  it("finds no $[...] in a top-level command, where tf doesn't substitute it", () => {
    expect(regions("/echo $[x]", "top")).toEqual([]);
    expect(regions("/test x", "top")).toEqual(["statement/keyword:x"]);
  });

  it("finds the inside of each $(...)", () => {
    const text = "/echo $(/let a=1%; /echo $(/echo b)) c";
    expect(parseRegions(text, "body").cmdsubs.map((c) => text.slice(c.start, c.end))).toEqual(["/echo b", "/let a=1%; /echo $(/echo b)"]);
  });

  it("keeps what was read before an error", () => {
    expect(regions("/test x%; /if (1) /echo b", "body")).toEqual(["statement/full:x", "condition:1"]);
  });
});
