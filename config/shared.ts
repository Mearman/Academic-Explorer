import * as path from "path"

/**
 * Shared configuration constants used across workspace
 * Note: Individual apps/packages may have their own configs
 */

// Project root directory (workspace root)
export const workspaceRoot = path.resolve(__dirname, "..")

// Common paths for workspace-level tooling
export const workspacePaths = {
	apps: path.resolve(workspaceRoot, "apps"),
	packages: path.resolve(workspaceRoot, "packages"),
	tools: path.resolve(workspaceRoot, "tools"),
	scripts: path.resolve(workspaceRoot, "scripts"),
}