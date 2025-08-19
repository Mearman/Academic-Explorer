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

		// CRITICAL: Force serial execution - no parallelism at all
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true, // Single thread execution to prevent memory leaks
				maxThreads: 1, // Absolute maximum: 1 thread
				minThreads: 1, // Minimum threads: 1
				isolate: true, // Strict thread isolation
				useAtomics: false, // Disable atomics to prevent worker communication issues
			},
		},

		// CRITICAL: Fully serial execution mode
		isolate: true,
		sequence: {
			concurrent: false, // No concurrent execution
			shuffle: false, // Deterministic test order
			hooks: "stack", // Stack hooks to prevent memory leaks
		},

		// CRITICAL: Absolute serial execution
		maxConcurrency: 1, // Absolute limit: 1 test at a time
		maxWorkers: 1, // Only 1 worker process
		minWorkers: 1, // Minimum 1 worker
		fileParallelism: false, // Disable file-level parallelism

		// CRITICAL: Extended timeouts for serial execution
		testTimeout: 60000, // 60 seconds max per test (increased for serial mode)
		hookTimeout: 20000, // 20 seconds for hooks
		teardownTimeout: 20000, // 20 seconds for teardown

		// CRITICAL: Disable coverage globally to prevent inspector/memory crashes
		coverage: {
			enabled: false,
			provider: "v8",
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
		reporter: process.env.CI === "true" ? ["dot"] : ["basic"],

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

					// PERFORMANCE: Optimized thread settings for unit tests (safe parallelism)
					pool: "threads",
					poolOptions: {
						threads: {
							singleThread: false,
							maxThreads: 2, // Limited parallelism for unit tests
							minThreads: 1,
							isolate: true,
							useAtomics: false,
						},
					},

					// PERFORMANCE: Controlled concurrency for unit tests
					isolate: true,
					sequence: {
						concurrent: true, // Allow concurrent unit tests
						shuffle: false,
						hooks: "stack",
					},
					maxConcurrency: 2, // Limit to 2 concurrent unit tests
					maxWorkers: 2,
					minWorkers: 1,
					fileParallelism: true, // Allow file-level parallelism

					// PERFORMANCE: Reduced timeouts due to parallelism
					testTimeout: process.env.CI === "true" ? 45000 : 30000,
					hookTimeout: 30000,
					teardownTimeout: 30000,

					// CRITICAL: Coverage disabled
					coverage: { enabled: false },

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

					// CRITICAL: Single thread for component tests (DOM intensive)
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

					// CRITICAL: Full serial execution for component tests
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

					// CRITICAL: Extended timeouts for DOM operations and serial mode
					testTimeout: process.env.CI === "true" ? 120000 : 90000,
					hookTimeout: 40000,
					teardownTimeout: 40000,

					// CRITICAL: Coverage disabled
					coverage: { enabled: false },

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

					// CRITICAL: Coverage disabled
					coverage: { enabled: false },

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

					// CRITICAL: Coverage disabled
					coverage: { enabled: false },

					// CRITICAL: Minimal reporter
					reporter: "dot",
				},
			},
		],
	},
});
