/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: __dirname,
	cacheDir: "../../node_modules/.vite/packages/ui",
	plugins: [nxViteTsPaths()],
	define: {
		global: "globalThis",
	},
	ssr: {
		noExternal: ["lru-cache", "@asamuzakjp/css-color", "@asamuzakjp/dom-selector"],
	},
	optimizeDeps: {
		include: ["lru-cache", "@asamuzakjp/css-color", "@asamuzakjp/dom-selector", "cssstyle"],
		force: true,
	},
	test: {
		name: "component",
		globals: true,
		environment: "jsdom",
		watch: false,
		maxConcurrency: 1,
		maxWorkers: 1,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.component.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reportsDirectory: "../../coverage/packages/ui/component",
		},
	},
});
