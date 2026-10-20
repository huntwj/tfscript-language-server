import type { TfBuild } from "../tfBuild";
import { LIBRARY_FILES } from "./libraryFiles.generated";
import { LIBRARY_FILES_WITH_LOADED } from "./libraryLoaded.generated";
import { UPSTREAM_LIBRARY_FILES } from "./upstreamLibraryFiles.generated";
import { UPSTREAM_LIBRARY_FILES_WITH_LOADED } from "./upstreamLibraryLoaded.generated";

/**
 * The .tf files `build` installs in its library. The tables without a prefix come from the
 * tinyfugue checkout, the fork; upstream's lacks the fork's kv.tf, bv.tf and kv-textlog.tf.
 */
export function libraryFiles(build: TfBuild): readonly string[] {
  return build === "fork" ? LIBRARY_FILES : UPSTREAM_LIBRARY_FILES;
}

/** Those of `build`'s library files that run /loaded, which /require loads only once. */
export function libraryFilesWithLoaded(build: TfBuild): readonly string[] {
  return build === "fork" ? LIBRARY_FILES_WITH_LOADED : UPSTREAM_LIBRARY_FILES_WITH_LOADED;
}
