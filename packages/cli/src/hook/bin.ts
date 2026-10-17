import * as path from "node:path";
import { hookMain } from "./main";

// The entry point of the plugin's bundled hook (tfscript-hook.js), which sits beside the bundled
// command line (tfscript.js). With --cloud-only (the copy a repo commits for cloud sessions,
// scripts/cloud-kit.js), it does nothing unless the session is a cloud one (CLAUDE_CODE_REMOTE is
// "true"): on a machine with the plugin, the plugin's own hook checks the file, and a second
// check would tell Claude everything twice.
if (process.argv.includes("--cloud-only") && process.env.CLAUDE_CODE_REMOTE !== "true") process.exit(0);
hookMain(path.join(__dirname, "tfscript.js"));
