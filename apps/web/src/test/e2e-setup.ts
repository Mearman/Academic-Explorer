/**
 * E2E test setup for Playwright integration with Vitest
 * Handles browser lifecycle and test environment configuration
 */

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { injectAxe, checkA11y, configureAxe } from "@axe-core/playwright"

// Type guard for axe-core functions to ensure they are callable
function isCallableFunction(fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
	return typeof fn === "function"
}
import { logger } from "@academic-explorer/utils";
import { useGraphStore } from "@/stores/graph-store"
import { useAnimatedGraphStore } from "@/stores/animated-graph-store"

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
		baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
		// Ignore HTTPS errors for local development
		ignoreHTTPSErrors: true,
		// Set user agent for consistent testing
		userAgent: "Academic-Explorer-E2E-Tests/1.0",
	})

	page = await context.newPage()

	// Inject axe-core for accessibility testing
	try {
		if (isCallableFunction(injectAxe)) {
			await injectAxe(page);
		} else {
			logger.warn("general", "injectAxe is not available", undefined, "e2e-setup");
		}
	} catch (error: unknown) {
		logger.warn("general", "Failed to inject axe-core", error instanceof Error ? { error: error.message } : undefined, "e2e-setup");
	}

	// Configure axe for WCAG 2.1 AA compliance
	try {
		if (isCallableFunction(configureAxe)) {
			await configureAxe(page, {
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
			});
		} else {
			logger.warn("general", "configureAxe is not available", undefined, "e2e-setup");
		}
	} catch (error: unknown) {
		logger.warn("general", "Failed to configure axe-core", error instanceof Error ? { error: error.message } : undefined, "e2e-setup");
	}

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
	globalThis.useAnimatedGraphStore = useAnimatedGraphStore // Expose animated graph store for debugging and tests

	// Expose accessibility testing functions globally
	try {
		if (isCallableFunction(checkA11y)) {
			globalThis.checkA11y = checkA11y;
		} else {
			logger.warn("general", "checkA11y is not available", undefined, "e2e-setup");
		}
	} catch (error: unknown) {
		logger.warn("general", "Failed to expose checkA11y globally", error instanceof Error ? { error: error.message } : undefined, "e2e-setup");
	}
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
  var useAnimatedGraphStore: typeof useAnimatedGraphStore
}
