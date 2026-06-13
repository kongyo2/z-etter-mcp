import { createRequire } from "node:module";

// Read the version straight from package.json at runtime so it always matches
// what was published, without duplicating the string in source.
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version?: string };

/** The running package version (e.g. "0.1.0"). */
export const VERSION: string = pkg.version ?? "0.0.0";
