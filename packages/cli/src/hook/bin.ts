import * as path from "node:path";
import { hookMain } from "./main";

// The entry point of the plugin's bundled hook (tfscript-hook.js), which sits beside the bundled
// command line (tfscript.js).
hookMain(path.join(__dirname, "tfscript.js"));
