/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vitest/config"
import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/packages/utils",
		plugins: [nxViteTsPaths()],
		test: {
			environment: "node",
			coverage: {
				reportsDirectory: "../../coverage/packages/utils",
			},
		},
	})
)
