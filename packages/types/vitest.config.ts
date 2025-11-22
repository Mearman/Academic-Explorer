/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
	root: __dirname,
	cacheDir: "../../node_modules/.vite/packages/types",
	plugins: [nxViteTsPaths()],
	test: {
		globals: true,
		environment: "node",
		passWithNoTests: true,
		coverage: {
			reportsDirectory: "../../coverage/packages/types",
			provider: "v8",
		},
	},
})
