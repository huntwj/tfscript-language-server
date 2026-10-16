import { getRefactorActions } from "./bodyLayout";
import { getDiagnostics, type Position, type Range, type TfDiagnostic, type TfTextEdit } from "./diagnostics";
import { getExtractActions } from "./extractMacro";
import { getExtractVariableActions } from "./extractVariable";
import { getInlineActions } from "./inlineMacro";

/**
 * Quick fixes: the `fix` a diagnostic carries, the same one its hover shows. Diagnostics are
 * recomputed here rather than read back from the request's `context.diagnostics`: that copy only
 * carries what the client chose to echo. getDiagnostics() is linear in the file, apart from the
 * line-joining fixes, which try candidates but within a fixed budget per diagnostic (joinFix.ts).
 *
 * Two diagnostics can share one fix (not-substituted-here's `/eval` prefix covers every `%{...}` in
 * its command, and joining a top-level /if's lines fixes the indented lines inside it too); it is
 * offered once.
 */

export type { Range, TfTextEdit };

export interface TfCodeAction {
  title: string;
  edits: TfTextEdit[];
  diagnostic: TfDiagnostic;
  /** The first of a diagnostic's two fixes, the likelier reading (LSP `isPreferred`). */
  preferred?: boolean;
}

function comparePositions(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

function overlaps(a: Range, b: Range): boolean {
  return comparePositions(a.start, b.end) <= 0 && comparePositions(b.start, a.end) <= 0;
}

/**
 * `diagnostics` defaults to the file's own (getDiagnostics); the server passes what it last
 * published, which adds the workspace's (load-path and undefined-macro diagnostics and their fixes).
 */
export function getCodeActions(text: string, range: Range, diagnostics: TfDiagnostic[] = getDiagnostics(text)): TfCodeAction[] {
  const seen = new Set<string>();
  const actions: TfCodeAction[] = [];

  for (const diagnostic of diagnostics) {
    // A missing-continuation's stray and indented lines are its own (it reports them once, as
    // related locations), so its fix is offered on them too.
    const at =
      overlaps(diagnostic.range, range) ||
      (diagnostic.code === "missing-continuation" && !!diagnostic.related?.some((r) => overlaps(r.range, range)));
    if (!at) continue;
    for (const fix of [diagnostic.fix, diagnostic.alternative]) {
      if (!fix) continue;
      const key = JSON.stringify(fix.edits);
      if (seen.has(key)) continue;
      seen.add(key);
      // Only keyword-needs-space's two fixes have a likelier one; keyword-mid-statement's pair (the
      // keyword or its block's closer) is an even choice.
      const preferred = fix === diagnostic.fix && !!diagnostic.alternative && diagnostic.code === "keyword-needs-space";
      actions.push({ title: fix.title, edits: fix.edits, diagnostic, ...(preferred ? { preferred } : {}) });
    }
  }

  return actions;
}

export const QUICK_FIX = "quickfix";
export const REFACTOR_REWRITE = "refactor.rewrite";
export const REFACTOR_EXTRACT = "refactor.extract";
export const REFACTOR_INLINE = "refactor.inline";
/** LSP's CodeActionTriggerKind: the user asked (a menu, a shortcut), or the editor asked on its own (the lightbulb). */
export const TRIGGER_INVOKED = 1;
export const TRIGGER_AUTOMATIC = 2;

export interface CodeActionRequest {
  range: Range;
  /** The kinds the client wants; a kind covers the kinds nested under it, and `""` covers all. */
  only?: string[];
  triggerKind?: number;
  /** What the server last published for the document; defaults to the file's own. */
  diagnostics?: TfDiagnostic[];
  /** Whether a macro name (lower case) is already taken where the file runs, for a new macro's name. */
  isTaken?: (name: string) => boolean;
  /** Whether a macro (lower case) may also be defined outside this file, for inlining. */
  definedOutside?: (name: string) => boolean;
  /**
   * Whether a file other than this one names a macro (lower case), before its /def is removed; and
   * whether it mentions a word at all, before a new local variable takes it as its name.
   */
  mentionedOutside?: (name: string) => boolean;
  /** The file is in tf's library, whose macros aren't inlined. */
  library?: boolean;
  /** Whether a macro (lower case) is called as a function, `name(...)`, anywhere that can be seen. */
  calledAsFunction?: (name: string) => boolean;
  /** The client shows an action greyed out with the reason it can't run (LSP `disabled`). */
  disabledSupport?: boolean;
}

export interface RoutedCodeAction {
  title: string;
  kind: typeof QUICK_FIX | typeof REFACTOR_REWRITE | typeof REFACTOR_EXTRACT | typeof REFACTOR_INLINE;
  edits: TfTextEdit[];
  diagnostic?: TfDiagnostic;
  /** The likelier of a diagnostic's two fixes (LSP `isPreferred`). */
  preferred?: boolean;
  /** Why it can't run: shown greyed out, with this reason. */
  disabled?: string;
  /** Where a name the action made is once its edits are applied, to rename it straight after. */
  rename?: Position;
}

/**
 * `action` as an LSP code action for the document at `uri`, its diagnostic converted with
 * `toDiagnostic`. With `renameCommand`, a command of the client's own (it names it in its
 * initializationOptions), an action that made a name also runs that command with the document's
 * URI and the name's position once its edit is applied, so the client can start a rename there.
 * A client that names no such command gets the edit alone.
 */
export function toLspCodeAction<D>(action: RoutedCodeAction, uri: string, toDiagnostic: (d: TfDiagnostic) => D, renameCommand?: string) {
  const rename = action.disabled === undefined && renameCommand && action.rename ? { command: { title: "Rename", command: renameCommand, arguments: [uri, action.rename] } } : {};
  return {
    title: action.title,
    kind: action.kind,
    ...(action.preferred ? { isPreferred: true } : {}),
    ...(action.diagnostic ? { diagnostics: [toDiagnostic(action.diagnostic)] } : {}),
    ...(action.disabled === undefined ? { edit: { changes: { [uri]: action.edits } } } : { disabled: { reason: action.disabled } }),
    ...rename,
  };
}

function wants(only: string[] | undefined, kind: string): boolean {
  if (!only) return true;
  return only.some((k) => k === "" || kind === k || kind.startsWith(`${k}.`));
}

/**
 * The actions for one code-action request. Refactorings aren't any diagnostic's fix, so they are
 * only offered when asked for: on an invoked request, or over a selection, not on each cursor
 * move the editor checks for a lightbulb.
 */
export function routeCodeActions(text: string, request: CodeActionRequest): RoutedCodeAction[] {
  const out: RoutedCodeAction[] = [];
  if (wants(request.only, QUICK_FIX)) {
    for (const a of getCodeActions(text, request.range, request.diagnostics)) {
      out.push({ title: a.title, kind: QUICK_FIX, edits: a.edits, diagnostic: a.diagnostic, ...(a.preferred ? { preferred: true } : {}) });
    }
  }
  const asked = request.triggerKind !== TRIGGER_AUTOMATIC || comparePositions(request.range.start, request.range.end) !== 0;
  if (asked && wants(request.only, REFACTOR_REWRITE)) {
    for (const a of getRefactorActions(text, request.range)) out.push({ title: a.title, kind: REFACTOR_REWRITE, edits: a.edits });
  }
  // Extracting needs a selection; a disabled one only where the client can show why.
  if (wants(request.only, REFACTOR_EXTRACT)) {
    const options = {
      ...(request.isTaken ? { isTaken: request.isTaken } : {}),
      ...(request.calledAsFunction ? { calledAsFunction: request.calledAsFunction } : {}),
    };
    const variable = request.mentionedOutside ? { mentionedOutside: request.mentionedOutside } : {};
    for (const a of [...getExtractActions(text, request.range, options), ...getExtractVariableActions(text, request.range, variable)]) {
      if (a.disabled === undefined) out.push({ title: a.title, kind: REFACTOR_EXTRACT, edits: a.edits, ...(a.rename ? { rename: a.rename } : {}) });
      else if (request.disabledSupport) out.push({ title: a.title, kind: REFACTOR_EXTRACT, edits: [], disabled: a.disabled });
    }
  }
  if (asked && wants(request.only, REFACTOR_INLINE)) {
    const options = {
      ...(request.definedOutside ? { definedOutside: request.definedOutside } : {}),
      ...(request.mentionedOutside ? { mentionedOutside: request.mentionedOutside } : {}),
      ...(request.library ? { library: true } : {}),
      ...(request.calledAsFunction ? { calledAsFunction: request.calledAsFunction } : {}),
    };
    for (const a of getInlineActions(text, request.range, options)) {
      if (a.disabled === undefined) out.push({ title: a.title, kind: REFACTOR_INLINE, edits: a.edits });
      else if (request.disabledSupport) out.push({ title: a.title, kind: REFACTOR_INLINE, edits: [], disabled: a.disabled });
    }
  }
  return out;
}
