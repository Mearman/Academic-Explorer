import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import path from "path";

const sharedConfig = {
	plugins: [react(), vanillaExtractPlugin()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@/lib": path.resolve(__dirname, "./src/lib"),
			"@/components": path.resolve(__dirname, "./src/components"),
		},
	},
};

export default defineConfig({
	...sharedConfig,
	test: {
		// Global test configuration with aggressive memory optimization
		globals: true,
		setupFiles: ["./src/test/setup.ts", "./src/test/jest-dom-setup.ts"],
		environment: "jsdom",

		// CRITICAL: Optimized for fast serial execution
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true, // Single fork for absolute memory control
				isolate: true, // Strict process isolation
			},
		},

		// CRITICAL: Fully serial execution mode for memory efficiency
		isolate: true,
		sequence: {
			concurrent: false, // No concurrent execution
			shuffle: false, // Deterministic test order
			hooks: "stack", // Stack hooks for proper cleanup
		},

		// CRITICAL: Absolute serial execution
		maxConcurrency: 1, // Absolute limit: 1 test at a time
		maxWorkers: 1, // Only 1 worker process
		minWorkers: 1, // Minimum 1 worker
		fileParallelism: false, // Disable file-level parallelism

		// CRITICAL: Aggressive timeouts for fast execution
		testTimeout: 10000, // 10 seconds max per test (reduced for speed)
		hookTimeout: 5000, // 5 seconds for hooks
		teardownTimeout: 5000, // 5 seconds for teardown

		// Coverage configuration for all test types
		coverage: {
			enabled: false, // Disabled by default, enabled via CLI flags
			provider: "v8",
			reporter: ["text", "json", "html", "lcov", "clover"],
			reportsDirectory: "coverage",
			include: [
				"src/**/*.{ts,tsx}",
				"!src/**/*.d.ts",
				"!src/**/*.test.{ts,tsx}",
				"!src/**/*.spec.{ts,tsx}",
				"!src/test/**",
				"!src/vite-env.d.ts",
				"!src/routeTree.gen.ts"
			],
			exclude: [
				"node_modules/**",
				"dist/**",
				"coverage/**",
				"src/test/**",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
				"**/*.d.ts",
				"src/routeTree.gen.ts",
				"src/vite-env.d.ts",
				"src/debug-mantine-vars.js"
			],
			thresholds: {
				global: {
					branches: 70,
					functions: 70,
					lines: 70,
					statements: 70
				}
			},
			skipFull: false,
			clean: true,
			cleanOnRerun: true,
			all: true
		},

		// CRITICAL: Force garbage collection and cleanup
		forceRerunTriggers: [
			"**/package-lock.json",
			"**/yarn.lock",
			"**/pnpm-lock.yaml",
		],

		// CRITICAL: Disable file watching and force test completion
		watch: false,

		// CRITICAL: Minimal reporter configuration for stability
		reporter: process.env.CI === "true" ? ["dot"] : ["default"],

		// CRITICAL: Optimized project configuration
		projects: [
			{
				...sharedConfig,
				test: {
					name: "unit",
					include: ["**/*.unit.test.{js,ts,jsx,tsx}"],
					exclude: ["node_modules/**", "dist/**", "**/*.skip.*"],
					environment: "jsdom",
					setupFiles: [
						"./src/test/setup.ts",
						"./src/test/jest-dom-setup.ts",
					],

					// PERFORMANCE: Serial execution for unit tests (memory optimized)
					pool: "forks",
					poolOptions: {
						forks: {
							singleFork: true, // Single fork for memory control
							isolate: true,
						},
					},

					// PERFORMANCE: Serial unit test execution
					isolate: true,
					sequence: {
						concurrent: false, // No concurrency for stability
						shuffle: false,
						hooks: "stack",
					},
					maxConcurrency: 1, // Single test at a time
					maxWorkers: 1,
					minWorkers: 1,
					fileParallelism: false, // No file parallelism

					// PERFORMANCE: Fast timeouts for unit tests
					testTimeout: 8000, // 8 seconds for unit tests
					hookTimeout: 3000, // 3 seconds for hooks
					teardownTimeout: 3000, // 3 seconds for teardown

					// Coverage for unit tests
					coverage: {
						enabled: false, // Controlled by CLI flags
						reportsDirectory: "coverage/unit"
					},

					// CRITICAL: Memory monitoring
					logHeapUsage: process.env.CI !== "true",

					// CRITICAL: Minimal reporter for unit tests
					reporter: "dot",
				},
			},
			{
				...sharedConfig,
				test: {
					name: "component",
					include: ["**/*.component.test.{js,ts,jsx,tsx}"],
					exclude: ["node_modules/**", "dist/**", "**/*.skip.*"],
					environment: "jsdom",
					setupFiles: [
						"./src/test/setup.ts",
						"./src/test/jest-dom-setup.ts",
					],

					// CRITICAL: Optimized execution for component tests (DOM intensive)
					pool: "forks",
					poolOptions: {
						forks: {
							singleFork: true,
							isolate: true,
						},
					},

					// CRITICAL: Serial execution for component tests
					isolate: true,
					sequence: {
						concurrent: false,
						shuffle: false,
						hooks: "stack",
					},
					maxConcurrency: 1,
					maxWorkers: 1,
					minWorkers: 1,
					fileParallelism: false,

					// CRITICAL: Optimized timeouts for DOM operations
					testTimeout: 12000, // 12 seconds for component tests
					hookTimeout: 5000, // 5 seconds for hooks
					teardownTimeout: 5000, // 5 seconds for teardown

					// Coverage for component tests
					coverage: {
						enabled: false, // Controlled by CLI flags
						reportsDirectory: "coverage/component"
					},

					// CRITICAL: Minimal reporter
					reporter: "dot",
				},
			},
			{
				...sharedConfig,
				test: {
					name: "integration",
					include: ["**/*.integration.test.{js,ts,jsx,tsx}"],
					exclude: ["node_modules/**", "dist/**", "**/*.skip.*"],
					environment: "jsdom",
					setupFiles: [
						"./src/test/setup.ts",
						"./src/test/jest-dom-setup.ts",
					],

					// CRITICAL: Node environment with single thread
					pool: "threads",
					poolOptions: {
						threads: {
							singleThread: true,
							maxThreads: 1,
							minThreads: 1,
							isolate: true,
							useAtomics: false,
						},
					},

					// CRITICAL: Full serial execution for integration tests
					isolate: true,
					sequence: {
						concurrent: false,
						shuffle: false,
						hooks: "stack",
					},
					maxConcurrency: 1,
					maxWorkers: 1,
					minWorkers: 1,
					fileParallelism: false,

					// CRITICAL: Extended timeouts for API calls and serial mode
					testTimeout: process.env.CI === "true" ? 180000 : 120000,
					hookTimeout: 60000,
					teardownTimeout: 60000,

					// Coverage for integration tests
					coverage: {
						enabled: false, // Controlled by CLI flags
						reportsDirectory: "coverage/integration"
					},

					// CRITICAL: Minimal reporter
					reporter: "dot",
				},
			},
			{
				...sharedConfig,
				test: {
					name: "e2e",
					include: ["**/*.e2e.test.{js,ts,jsx,tsx}"],
					exclude: ["node_modules/**", "dist/**", "**/*.skip.*"],
					environment: "jsdom",
					setupFiles: [
						"./src/test/setup.ts",
						"./src/test/jest-dom-setup.ts",
					],

					// CRITICAL: Single thread for E2E tests
					pool: "threads",
					poolOptions: {
						threads: {
							singleThread: true,
							maxThreads: 1,
							minThreads: 1,
							isolate: true,
							useAtomics: false,
						},
					},

					// CRITICAL: Full serial E2E execution
					isolate: true,
					sequence: {
						concurrent: false,
						shuffle: false,
						hooks: "stack",
					},
					maxConcurrency: 1,
					maxWorkers: 1,
					minWorkers: 1,
					fileParallelism: false,

					// CRITICAL: Very long timeouts for E2E and serial mode
					testTimeout: process.env.CI === "true" ? 300000 : 240000,
					hookTimeout: 120000,
					teardownTimeout: 120000,

					// Coverage for e2e tests
					coverage: {
						enabled: false, // Controlled by CLI flags
						reportsDirectory: "coverage/e2e"
					},

					// CRITICAL: Minimal reporter
					reporter: "dot",
				},
			},
		],
	},
});
