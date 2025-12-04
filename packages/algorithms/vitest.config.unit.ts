/// <reference types='vitest' />
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: __dirname,
	test: {
		name: "unit",
		globals: true,
		environment: "node",
		watch: false,
		maxConcurrency: 1,
		maxWorkers: 1,
		include: ["__tests__/**/*.test.ts", "src/**/*.unit.test.ts"],
		coverage: {
			provider: "v8",
			reportsDirectory: "../../coverage/packages/algorithms/unit",
		},
	},
});
