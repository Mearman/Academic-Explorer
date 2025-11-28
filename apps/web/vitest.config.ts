/// <reference types="vitest" />
import * as path from "node:path";

import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";

import { baseVitestConfig } from "../../vitest.config.base";

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/apps/web",
		plugins: [
			nxViteTsPaths(),
			react(),
			vanillaExtractPlugin(),
		],

		resolve: {
			// Use source condition to resolve workspace packages to source files
			// This works with the "source" export condition in workspace package.json files
			conditions: ["source", "import", "module", "default"],
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},

		// Fix for lru-cache ES module compatibility issue
		define: {
			global: 'globalThis',
		},

		optimizeDeps: {
			include: ['lru-cache'],
			force: true,
		},

		server: {
			deps: {
				inline: [
					"@bibgraph/types",
					"@bibgraph/utils",
					"@bibgraph/client",
					"@bibgraph/ui",
				],
			},
		},

		test: {
			watch: false,
			environment: "jsdom",
			setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],

			// Force vitest to bundle workspace packages through vite's resolver
			deps: {
				inline: [/@academic-explorer\/.*/],
			},

			// Exclude E2E tests from Vitest - they use Playwright
			exclude: [
				...(baseVitestConfig.test?.exclude || []),
				"**/*.e2e.test.ts",
				"**/*.e2e.test.tsx",
			],

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

			// Named projects for targeted test execution
			// Note: Each project must explicitly set plugins, resolve.alias, setupFiles, and deps since projects run independently
			projects: [
				{
					plugins: [nxViteTsPaths(), react(), vanillaExtractPlugin()],
					resolve: {
						alias: {
							"@": path.resolve(__dirname, "./src"),
						},
					},
					test: {
						name: "unit",
						include: ["src/**/*.unit.test.{ts,tsx}"],
						environment: "jsdom",
						globals: true,
						setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
						deps: {
							inline: [/@academic-explorer\/.*/],
						},
					},
				},
				{
					plugins: [nxViteTsPaths(), react(), vanillaExtractPlugin()],
					resolve: {
						alias: {
							"@": path.resolve(__dirname, "./src"),
						},
					},
					test: {
						name: "component",
						include: ["src/**/*.component.test.{ts,tsx}"],
						environment: "jsdom",
						globals: true,
						setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
						deps: {
							inline: [/@academic-explorer\/.*/],
						},
					},
				},
				{
					plugins: [nxViteTsPaths(), react(), vanillaExtractPlugin()],
					resolve: {
						alias: {
							"@": path.resolve(__dirname, "./src"),
						},
					},
					test: {
						name: "integration",
						include: ["src/**/*.integration.test.{ts,tsx}"],
						environment: "jsdom",
						globals: true,
						setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
						deps: {
							inline: [/@academic-explorer\/.*/],
						},
						testTimeout: 30000,
					},
				},
			],
		},
	}),
);
