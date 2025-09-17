/**
 * E2E test utilities for Academic Explorer
 * Provides common helpers for testing OpenAlex integration and app functionality
 */

import type { Page } from "@playwright/test"
import { expect as vitestExpect } from "vitest"

/**
 * Wait for the Academic Explorer app to be fully loaded and interactive
 */
export async function waitForAppReady(page: Page): Promise<void> {
	// Wait for the main AppShell header with "Academic Explorer" text to render
	await page.waitForSelector("text=Academic Explorer", { timeout: 30000 })

	// Wait for any loading skeletons to disappear
	await page.waitForFunction(
		() => document.querySelectorAll('[data-testid*="loading"]').length === 0,
		{ timeout: 10000 }
	).catch(() => {
		// Loading skeletons might not be present, that's ok
	})

	// Ensure router is ready
	await page.waitForFunction(
		() => window.location.hash !== "",
		{ timeout: 5000 }
	).catch(() => {
		// Hash might be empty on root route, that's ok
	})
}

/**
 * Navigate to Academic Explorer and wait for it to be ready
 */
export async function navigateToApp(page: Page, path: string = "/"): Promise<void> {
	const url = path.startsWith("/") ? `#${path}` : `#/${path}`
	await page.goto(url)
	await waitForAppReady(page)
}

/**
 * Mock OpenAlex API responses for testing
 */
export async function mockOpenAlexAPI(page: Page, responses: Record<string, unknown> = {}): Promise<void> {
	await page.route("**/openalex.org/**", async (route) => {
		const url = route.request().url()

		// Extract the endpoint from the URL
		const endpoint = url.split("openalex.org")[1]?.split("?")[0] || ""

		// Use provided mock data or default responses
		if (responses[endpoint]) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(responses[endpoint])
			})
		} else {
			// Default mock responses for common endpoints
			const defaultResponse = {
				meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
				results: [],
				group_by: []
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(defaultResponse)
			})
		}
	})
}

/**
 * Wait for OpenAlex data to load (loading states to disappear)
 */
export async function waitForOpenAlexData(page: Page): Promise<void> {
	// Wait for loading skeletons to disappear
	const loadingSelectors = [
		'[data-testid="loading-skeleton"]',
		'[data-testid*="loading"]',
		".loading",
		'[aria-label*="loading" i]'
	]

	for (const selector of loadingSelectors) {
		try {
			await page.waitForSelector(selector, { state: "detached", timeout: 5000 })
		} catch {
			// Selector might not exist, continue
		}
	}

	// Wait a bit for any async updates to complete
	await page.waitForTimeout(500)
}

/**
 * Search for content using the main search interface
 */
export async function performSearch(page: Page, query: string): Promise<void> {
	// Look for search input
	const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[placeholder*="search" i]').first()
	await searchInput.waitFor({ timeout: 10000 })

	// Clear and enter search query
	await searchInput.clear()
	await searchInput.fill(query)

	// Submit search (look for button or press Enter)
	const searchButton = page.locator('[data-testid="search-button"], button[type="submit"]').first()

	if (await searchButton.isVisible().catch(() => false)) {
		await searchButton.click()
	} else {
		await searchInput.press("Enter")
	}

	// Wait for search results to load
	await waitForOpenAlexData(page)
}

/**
 * Navigate to a specific entity page
 */
export async function navigateToEntity(page: Page, entityType: string, entityId: string): Promise<void> {
	const path = `/${entityType}/${entityId}`
	await navigateToApp(page, path)
	await waitForOpenAlexData(page)
}

/**
 * Get entity display elements (title, description, etc.)
 */
export function getEntityDisplay(page: Page) {
	return {
		title: page.locator('[data-testid="entity-title"], h1, h2').first(),
		description: page.locator('[data-testid="entity-description"]').first(),
		metadata: page.locator('[data-testid="entity-metadata"]').first(),
		content: page.locator('[data-testid="entity-content"]').first(),
	}
}

/**
 * Check if the current page shows an error state
 */
export async function hasErrorState(page: Page): Promise<boolean> {
	const errorSelectors = [
		'[data-testid*="error"]',
		".error",
		'[role="alert"]',
		"text=/error/i",
		"text=/not found/i",
		"text=/failed/i"
	]

	for (const selector of errorSelectors) {
		try {
			const element = page.locator(selector).first()
			if (await element.isVisible({ timeout: 1000 })) {
				return true
			}
		} catch {
			// Selector not found, continue
		}
	}

	return false
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, expectedPath?: string): Promise<void> {
	if (expectedPath) {
		await page.waitForFunction(
			(path) => window.location.hash.includes(path),
			expectedPath,
			{ timeout: 10000 }
		)
	}

	await waitForAppReady(page)
}

/**
 * Take a screenshot for debugging
 */
export async function debugScreenshot(page: Page, name: string): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const filename = `debug-${name}-${timestamp}.png`

	await page.screenshot({
		path: `./test-results/${filename}`,
		fullPage: true
	}).catch(() => {
		// Ignore screenshot errors in tests
	})
}

/**
 * Assert that a page loads without errors
 */
export async function assertPageLoadsWithoutErrors(page: Page, url?: string): Promise<void> {
	if (url) {
		await navigateToApp(page, url)
	}

	// Check for error states
	const hasErrors = await hasErrorState(page)
	vitestExpect(hasErrors).toBe(false)

	// Check that main content is present
	const hasContent = await page.locator('main, [role="main"], #root > *').first().isVisible()
	vitestExpect(hasContent).toBe(true)
}