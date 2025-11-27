/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vitest/config"

import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(mergeConfig(baseVitestConfig, {
	plugins: [nxViteTsPaths()],
	test: {
		watch: false,
		// Named projects for targeted test execution
		projects: [
			{
				test: {
					name: "unit",
					include: ["src/**/*.unit.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "integration",
					include: ["src/**/*.integration.test.ts"],
					environment: "node",
					testTimeout: 30000,
				},
			},
		],
	},
}))
