/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vitest/config"

import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(mergeConfig(baseVitestConfig, {
	plugins: [nxViteTsPaths()],
}))
