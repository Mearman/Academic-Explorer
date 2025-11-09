/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vitest/config"
import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/packages/ui",
		plugins: [nxViteTsPaths()],

	// Configure Node.js module resolution to handle ES module issues
		define: {
			// Ensure global exports are available for ES modules
			global: 'globalThis',
		},

		// Externalize problematic packages to avoid bundling issues
		ssr: {
			noExternal: ['lru-cache', '@asamuzakjp/css-color', '@asamuzakjp/dom-selector'],
		},

		optimizeDeps: {
			include: [
				// Pre-bundle these problematic packages
				'lru-cache',
				'@asamuzakjp/css-color',
				'@asamuzakjp/dom-selector',
				'cssstyle',
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
