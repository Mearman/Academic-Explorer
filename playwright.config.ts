import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for e2e tests with coverage support
 * 
 * CRITICAL: Serial execution only - no parallel workers
 * Memory constraints require single-threaded execution
 */
export default defineConfig({
	// Test directory
	testDir: './src/test',
	testMatch: /.*\.playwright\.test\.ts$/,

	// CRITICAL: Serial execution configuration
	fullyParallel: false,
	workers: 1, // Single worker only
	maxFailures: 1, // Stop on first failure

	// Timeouts
	timeout: 60000, // 60s per test
	expect: {
		timeout: 10000, // 10s for assertions
	},

	// Reporters
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['json', { outputFile: 'test-results/playwright-results.json' }],
		['junit', { outputFile: 'test-results/playwright-results.xml' }],
	],

	// Global test configuration
	use: {
		// Base URL for testing
		baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',

		// Browser context options
		headless: true,
		viewport: { width: 1280, height: 720 },
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		trace: 'retain-on-failure',

		// Coverage collection
		...(process.env.PLAYWRIGHT_COVERAGE && {
			coverage: {
				mode: 'all',
				include: [
					'src/**/*.{ts,tsx}',
					'!src/**/*.test.{ts,tsx}',
					'!src/**/*.spec.{ts,tsx}',
					'!src/test/**/*',
					'!src/vite-env.d.ts',
					'!src/routeTree.gen.ts',
				],
				exclude: [
					'node_modules/**',
					'dist/**',
					'coverage/**',
					'test-results/**',
					'playwright-report/**',
				],
			},
		}),
	},

	// Project configurations
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
		// Mobile testing
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] },
		},
		{
			name: 'Mobile Safari',
			use: { ...devices['iPhone 12'] },
		},
	],

	// Web server for testing
	webServer: process.env.CI
		? {
				command: 'pnpm preview',
				port: 4173,
				reuseExistingServer: !process.env.CI,
		  }
		: {
				command: 'pnpm dev',
				port: 5173,
				reuseExistingServer: !process.env.CI,
		  },

	// Output directories
	outputDir: 'test-results/',
});