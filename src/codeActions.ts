import { getDiagnostics, type Position, type Range, type TfDiagnostic, type TfTextEdit } from "./diagnostics";

/**
 * Quick fixes: the `fix` a diagnostic carries, the same one its hover shows. Diagnostics are
 * recomputed here rather than read back from the request's `context.diagnostics`: that copy only
 * carries what the client chose to echo, and getDiagnostics() is cheap enough to run per request.
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

export function getCodeActions(text: string, range: Range): TfCodeAction[] {
  const seen = new Set<string>();
  const actions: TfCodeAction[] = [];

  for (const diagnostic of getDiagnostics(text)) {
    if (!overlaps(diagnostic.range, range) || !diagnostic.fix) continue;
    const key = JSON.stringify(diagnostic.fix.edits);
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push({ title: diagnostic.fix.title, edits: diagnostic.fix.edits, diagnostic });
  }

  return actions;
}
