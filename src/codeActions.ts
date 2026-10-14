import { getRefactorActions } from "./bodyLayout";
import { getDiagnostics, type Position, type Range, type TfDiagnostic, type TfTextEdit } from "./diagnostics";

/**
 * Quick fixes: the `fix` a diagnostic carries, the same one its hover shows. Diagnostics are
 * recomputed here rather than read back from the request's `context.diagnostics`: that copy only
 * carries what the client chose to echo. getDiagnostics() is linear in the file, apart from the
 * line-joining fixes, which try candidates but within a fixed budget per diagnostic (joinFix.ts).
 *
 * Two diagnostics can share one fix (load-no-expansion's `/eval` prefix covers every `%{...}` in
 * its command, and joining a top-level /if's lines fixes the indented lines inside it too); it is
 * offered once.
 */

export type { Range, TfTextEdit };

export interface TfCodeAction {
  title: string;
  edits: TfTextEdit[];
  diagnostic: TfDiagnostic;
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
    if (!overlaps(diagnostic.range, range) || !diagnostic.fix) continue;
    const key = JSON.stringify(diagnostic.fix.edits);
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push({ title: diagnostic.fix.title, edits: diagnostic.fix.edits, diagnostic });
  }

  return actions;
}

export const QUICK_FIX = "quickfix";
export const REFACTOR_REWRITE = "refactor.rewrite";
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
}

export interface RoutedCodeAction {
  title: string;
  kind: typeof QUICK_FIX | typeof REFACTOR_REWRITE;
  edits: TfTextEdit[];
  diagnostic?: TfDiagnostic;
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
    for (const a of getCodeActions(text, request.range, request.diagnostics)) out.push({ title: a.title, kind: QUICK_FIX, edits: a.edits, diagnostic: a.diagnostic });
  }
  const asked = request.triggerKind !== TRIGGER_AUTOMATIC || comparePositions(request.range.start, request.range.end) !== 0;
  if (asked && wants(request.only, REFACTOR_REWRITE)) {
    for (const a of getRefactorActions(text, request.range)) out.push({ title: a.title, kind: REFACTOR_REWRITE, edits: a.edits });
  }
  return out;
}
