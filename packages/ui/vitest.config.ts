/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vitest/config"
import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/packages/ui",
		plugins: [nxViteTsPaths()],

		// Fix for lru-cache ES module compatibility issue
		define: {
			// Ensure global exports are available for ES modules
			global: 'globalThis',
		},

		optimizeDeps: {
			include: [
				// Pre-bundle lru-cache to avoid ES module issues
				'lru-cache',
			],
			// Force optimization even for dependencies
			force: true,
		},

		test: {
			environment: "jsdom",
			setupFiles: ["./src/test/setup.ts"],
			coverage: {
				reportsDirectory: "../../coverage/packages/ui",
			},
		},
	})
)
