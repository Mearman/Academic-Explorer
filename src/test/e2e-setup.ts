/**
 * E2E test setup for Playwright integration with Vitest
 * Handles browser lifecycle and test environment configuration
 */

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { injectAxe, checkA11y, configureAxe } from "@axe-core/playwright"
import { logger } from "@/lib/logger"
import { useGraphStore } from "@/stores/graph-store"

let browser: Browser | undefined
let context: BrowserContext | undefined
let page: Page | undefined

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
	if (!browser) throw new Error("Browser not initialized");
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

	// Inject axe-core for accessibility testing
	await (injectAxe as (page: Page) => Promise<void>)(page)

	// Configure axe for WCAG 2.1 AA compliance
	await (configureAxe as (page: Page, config: unknown) => Promise<void>)(page, {
		rules: {
			// Enable all WCAG 2.1 AA rules
			"color-contrast": { enabled: true },
			"keyboard-navigation": { enabled: true },
			"focus-management": { enabled: true },

			// Disable rules that may not apply to our SPA context
			"region": { enabled: false },
			"page-has-heading-one": { enabled: false },
		},
		tags: ["wcag2a", "wcag2aa", "wcag21aa"],
	})

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
	globalThis.useGraphStore = useGraphStore // Expose useGraphStore globally

	// Expose accessibility testing functions globally
	globalThis.checkA11y = checkA11y as (page: Page, selector?: string, options?: unknown) => Promise<void>
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
  var checkA11y: typeof checkA11y
}