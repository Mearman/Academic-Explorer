/// <reference types='vitest' />
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: __dirname,
	test: {
		name: "integration",
		globals: true,
		environment: "node",
		watch: false,
		maxConcurrency: 1,
		maxWorkers: 1,
		testTimeout: 30000,
		include: ["src/**/*.integration.test.ts"],
		coverage: {
			provider: "v8",
			reportsDirectory: "../../coverage/packages/algorithms/integration",
		},
	},
});
