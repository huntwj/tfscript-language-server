import { getDiagnostics, type TfDiagnostic } from "../diagnostics";
import type { WorkspaceIndex } from "./workspaceIndex";

/**
 * Every diagnostic for a document: its own (getDiagnostics), then, when it is a file on disk
 * (`file`), its load-path ones from the workspace (unresolved-load, undefined-macro). What the
 * server publishes and the command line reports.
 */
export function documentDiagnostics(text: string, file: string | undefined, index: WorkspaceIndex): TfDiagnostic[] {
  const tfBuild = file ? index.tfBuildFor(file) : undefined;
  return [...getDiagnostics(text, tfBuild ? { tfBuild } : {}), ...(file ? index.loadPathDiagnostics(file, text) : [])];
}
