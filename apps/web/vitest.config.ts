/// <reference types="vitest" />
import { defineConfig, mergeConfig } from "vitest/config";
import { baseVitestConfig } from "../../vitest.config.base";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import react from "@vitejs/plugin-react";
import * as path from "node:path";

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/apps/web",
		plugins: [nxViteTsPaths(), react()],

		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},

		test: {
			// Override for React/DOM environment
			environment: "jsdom",
			setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],

			// Pool options for better memory management
			pool: "forks",
			poolOptions: {
				forks: {
					singleFork: true,
					maxForks: 1,
					minForks: 1,
				},
			},

			// Aggressive cleanup between tests
			isolate: true,

			// File-level serial execution to prevent OOM
			fileParallelism: false,

			coverage: {
				reportsDirectory: "../../coverage/apps/web",
			},
		},
	}),
);
