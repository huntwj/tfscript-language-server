/** The package's version (a test checks it matches package.json). */
export const VERSION = "0.2.0";

export const USAGE = `Usage: tfscript check [options] <file or folder>...

Checks tf scripts and reports what the tfscript language server would: each file's own
diagnostics, then the ones its load path gives (unresolved-load, undefined-macro), worked out
from the root folder the way the editor works them out from a workspace folder. A folder is
searched for .tf files, tfrc and .tfrc, skipping .git, .jj and node_modules, and not following
links to folders. The whole root is searched for what defines each macro, so a narrow --root
keeps a check fast.

Output:
  --format <human|json>         human (the default): one line per diagnostic,
                                path:line:col: severity code: message. json: one report,
                                described in the README.
  --max-warnings <n>            exit 1 when there are more than n warnings
  --setting-names <option|config>
                                how a message names a setting: as its option (the default),
                                or as its tfscript.json key (for the Claude Code hook)

Where tf runs (each is named after the tfscript.* setting in brackets):
  --root <folder>               the workspace folder (default: the folder of --config, else
                                the current folder)
  --config <file>               a tfscript.json to read these settings from (default: the
                                root's tfscript.json, if it has one); the options go over it
  --entry-file <file>           a file tf loads after stdlib.tf; repeat for more (entryFiles;
                                default: a tfrc, .tfrc or tfrc.tf in the root, else ~/.tfrc)
  --context <name>=<file>       a named way tf starts and a file it loads; repeat for more files
                                or contexts (contexts)
  --active-context <name>       which context files are seen through (activeContext)
  --library-path <folder>       tf's library, holding stdlib.tf (libraryPath; default: TFLIBDIR)
  --tf-path <folder>            a TFPATH folder; repeat for more (tfPath; default: TFPATH)
  --working-directory <folder>  tf's current directory (workingDirectory; default: the root)
  --home-directory <folder>     what ~ means to tf (homeDirectory)
  --path-mapping <tf>=<local>   where tf's absolute path <tf> is here; repeat for more
                                (pathMappings)
  --variable <name>=<value>     a variable set as tf starts; repeat for more (variables)

Which diagnostics:
  --no-unresolved-loads         leave out unresolved-load (diagnostics.unresolvedLoads)
  --no-undefined-macros         leave out undefined-macro (diagnostics.undefinedMacros)
  --ignore-macro <name>         a macro undefined-macro leaves alone, ignoring case, * a
                                wildcard; repeat for more (diagnostics.ignoreMacros)

  -h, --help                    show this help
  --version                     show the version

Relative paths in the options are relative to the root, not to the current folder, as the
editor's settings are relative to the workspace folder; in a tfscript.json, they are relative to
its own folder. With --root ws, the tfrc in ws is
--entry-file tfrc, not --entry-file ws/tfrc:
  tfscript check --root ws --entry-file tfrc ws/

Exit status: 0 when no errors are found, 1 when there are errors (or more warnings than
--max-warnings), 2 when it can't check: the command line is wrong, --root is missing or is a
file, the tfscript.json is missing or bad, a path doesn't exist, can't be read or is a folder
with no tf scripts, or an internal error.

Usage: tfscript format [--check] <file or folder>...

Lays out tf scripts the way the language server's Format Document does: a macro body on the
lines after its head, one statement per line ending %;\\, each /if and /while block indented two
spaces more. Only whitespace tf ignores changes. A command it can't prove the same once laid out
(one with a comment or blank line among its lines, a tab, or a structural error) is left as it
is, and so is a file with CRLF line endings. Folders are searched as for check. Each file that
changes is named on stdout.

  --check                       change nothing: name the files that would change, and exit 1
                                if there are any

Exit status: 0 when every file is formatted (with --check, when none would change), 1 with
--check when a file would change, 2 when the command line is wrong or a path can't be read or
written.
`;
