import * as path from "path"

/**
 * Shared configuration constants used across Vite and Vitest configs
 */

// Path aliases for consistent import resolution
export const pathAliases = {
	"@": path.resolve(__dirname, "../src"),
}

// Common resolve configuration
export const resolveConfig = {
	alias: pathAliases,
}

// Test setup files
export const testSetupFiles = ["./src/test/setup.ts"]

// Project root directory
export const projectRoot = path.resolve(__dirname, "..")