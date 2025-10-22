import * as path from "path";
import { fileURLToPath } from "node:url";

/**
 * Shared configuration constants used across workspace
 * Note: Individual apps/packages may have their own configs
 */

// Get __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project root directory (workspace root)
export const workspaceRoot = path.resolve(__dirname, "..");

// Common paths for workspace-level tooling
export const workspacePaths = {
  apps: path.resolve(workspaceRoot, "apps"),
  packages: path.resolve(workspaceRoot, "packages"),
  tools: path.resolve(workspaceRoot, "tools"),
  scripts: path.resolve(workspaceRoot, "scripts"),
};

// Static data cache path (relative to workspace root)
export const STATIC_DATA_CACHE_PATH = "apps/web/public/data/openalex";

/**
 * Get the absolute path to the static data cache directory
 * @param projectRoot - Optional project root override (defaults to workspaceRoot)
 */
export function getStaticDataCachePath(
  projectRoot: string = workspaceRoot,
): string {
  return path.join(projectRoot, STATIC_DATA_CACHE_PATH);
}
