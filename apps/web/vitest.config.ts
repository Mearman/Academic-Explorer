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
				inline: [/@bibgraph\/.*/],
			},

			// Exclude E2E and performance tests from CI - they use Playwright or are too intensive
			exclude: [
				...(baseVitestConfig.test?.exclude || []),
				"**/*.e2e.test.ts",
				"**/*.e2e.test.tsx",
				"**/*.performance.test.ts",
				"**/test/e2e/**",
			],

			// Pool options for better memory management with parallel execution
			pool: "forks",
			poolOptions: {
				forks: {
					singleFork: false,
					maxForks: Math.min(4, require('os').cpus().length),
					minForks: 1,
				},
			},

			// Moderate cleanup between tests
			isolate: false,

			// Enable file-level parallel execution for faster CI
			fileParallelism: true,

			coverage: {
				reportsDirectory: "../../coverage/apps/web",
				// Skip coverage for slow test types to improve CI speed
				exclude: [
					"src/test/**",
					"src/**/*.integration.test.{ts,tsx}",
					"src/**/*.component.test.{ts,tsx}",
				],
				// Collect coverage only for unit tests to reduce overhead
				include: ["src/**/*.unit.test.{ts,tsx}"],
				// Minimal coverage reporters for CI speed
				reporter: ["text", "json"],
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
							inline: [/@bibgraph\/.*/],
						},
						// Faster timeouts for unit tests
						testTimeout: 5000,
						hookTimeout: 5000,
						// Enable parallel execution
						fileParallelism: true,
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
							inline: [/@bibgraph\/.*/],
						},
						// Moderate timeouts for component tests
						testTimeout: 10000,
						hookTimeout: 8000,
						// Enable parallel execution
						fileParallelism: true,
						// Disable coverage for component tests (already handled globally)
						coverage: { enabled: false },
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
							inline: [/@bibgraph\/.*/],
						},
						// Longer timeouts for integration tests but reasonable
						testTimeout: 20000,
						hookTimeout: 10000,
						// Sequential execution for integration tests to avoid race conditions
						fileParallelism: false,
						// Disable coverage for integration tests (already handled globally)
						coverage: { enabled: false },
					},
				},
			],
		},
	}),
);
