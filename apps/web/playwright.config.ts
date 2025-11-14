/**
 * Playwright configuration for Academic Explorer E2E tests
 * Uses Playwright's built-in test runner and web server management
 */

import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";

export default defineConfig({
  // Test directory - using src and e2e for all tests
  testDir: "./",

  // Test files pattern for E2E tests
  // Smoke mode (CI default): Only run critical smoke tests
  // Full mode (E2E_FULL_SUITE=true): Run all tests except manual
  testMatch: process.env.E2E_FULL_SUITE
    ? ["**/*.e2e.test.ts", "**/e2e/**/*.e2e.test.ts"]
    : [
        "**/sample-urls-ci.e2e.test.ts",
      ],
  testIgnore: process.env.E2E_FULL_SUITE ? ["**/manual/**"] : ["**/manual/**", "**/*-full.e2e.test.ts"],

  // Run tests in parallel - E2E tests are browser-isolated
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "test-results/playwright-report" }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests - configurable for production testing
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Record video on failure
    video: "retain-on-failure",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Set user agent for consistency
    userAgent: "Academic-Explorer-E2E-Tests/1.0 Playwright",

    // Timeout settings
    actionTimeout: 10000,
    navigationTimeout: 20000,

    // Browser launch options for IndexedDB support
    launchOptions: {
      args: [
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--enable-features=SharedArrayBuffer',
      ],
    },

    // Grant permissions for storage APIs
    permissions: ['storage-access'],

    // Enable service workers and storage partitioning bypass
    serviceWorkers: 'allow',
  },

  // Test timeout
  timeout: 60000,

  // Global setup and teardown for cache warming and cleanup
  globalSetup: "./playwright.global-setup.ts",
  globalTeardown: "./playwright.global-teardown.ts",

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Reuse storage state for faster tests (cached cookies, localStorage, IndexedDB)
        storageState: fs.existsSync("./test-results/storage-state/state.json") ? "./test-results/storage-state/state.json" : undefined,
      },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Output directories
  outputDir: "test-results/playwright-artifacts",

  // Web server configuration for E2E tests
  webServer: {
    command: "cd ../../ && pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120000,
    env: {
      NODE_ENV: "development",
      RUNNING_E2E: "true",
    },
  },
});