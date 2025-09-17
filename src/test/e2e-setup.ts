/**
 * E2E test setup for Playwright integration with Vitest
 * Handles browser lifecycle and test environment configuration
 */

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { logger } from "@/lib/logger"

let browser: Browser
let context: BrowserContext
let page: Page

// Global browser setup
beforeAll(async () => {
	browser = await chromium.launch({
		headless: process.env.HEADLESS !== "false",
		slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
	})
})

afterAll(async () => {
	if (browser) {
		await browser.close()
	}
})

// Per-test context and page setup
beforeEach(async () => {
	context = await browser.newContext({
		viewport: { width: 1280, height: 720 },
		// Academic Explorer specific settings
		baseURL: process.env.E2E_BASE_URL || "http://localhost:4173",
		// Ignore HTTPS errors for local development
		ignoreHTTPSErrors: true,
		// Set user agent for consistent testing
		userAgent: "Academic-Explorer-E2E-Tests/1.0",
	})

	page = await context.newPage()

	// Set up console logging in tests
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			logger.error("general", `Browser console error: ${msg.text()}`, undefined, "e2e-setup")
		}
	})

	// Set up error handling
	page.on("pageerror", (error) => {
		logger.error("general", `Browser page error: ${error.message}`, undefined, "e2e-setup")
	})

	// Make page available globally for tests
	globalThis.e2ePage = page
	globalThis.e2eContext = context
})

afterEach(async () => {
	if (page) {
		await page.close()
	}
	if (context) {
		await context.close()
	}
})

// Global types for test access
declare global {
  var e2ePage: Page
  var e2eContext: BrowserContext
}