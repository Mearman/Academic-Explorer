/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vite"
import { baseVitestConfig } from "../../vitest.config.base.js"

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/apps/cli",
		plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"])],
		// Uncomment this if you are using workers.
		// worker: {
		//  plugins: [ nxViteTsPaths() ],
		// },
		test: {
			watch: false,
			environment: "node",
			coverage: {
				reportsDirectory: "../../coverage/apps/cli",
			},
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
					},
				},
			],
		},
	})
)
