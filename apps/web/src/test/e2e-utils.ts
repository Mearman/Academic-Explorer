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
	// First wait for React to mount by checking for the root element
	await page.waitForSelector("#root", { timeout: 30000 })

	// Wait for Mantine components to be loaded (AppShell renders after Mantine initializes)
	await page.waitForFunction(
		() => {
			const root = document.getElementById("root");
			return root && root.children.length > 0;
		},
		{ timeout: 30000 }
	)

	// Try multiple selectors for the app header - be more flexible
	const headerSelectors = [
		"text=Academic Explorer",
		"[data-mantine-color-scheme]", // Mantine theme provider
		"header", // AppShell header
		'[role="banner"]', // Header with role
		".mantine-AppShell-header" // Mantine AppShell header class
	];

	let headerFound = false;
	for (const selector of headerSelectors) {
		try {
			await page.waitForSelector(selector, { timeout: 15000 });
			headerFound = true;
			break;
		} catch {
			// Try next selector
		}
	}

	if (!headerFound) {
		// Last resort - wait for any significant content
		await page.waitForFunction(
			() => {
				const root = document.getElementById("root");
				if (!root) return false;
				const textContent = root.textContent || "";
				return textContent.length > 100; // App has substantial content
			},
			{ timeout: 30000 }
		);
	}

	// Wait for any loading skeletons to disappear
	await page.waitForFunction(
		() => document.querySelectorAll('[data-testid*="loading"]').length === 0,
		{ timeout: 10000 }
	).catch(() => {
		// Loading skeletons might not be present, that's ok
	})

	// Give the app a moment to stabilize
	await page.waitForTimeout(1000);
}

/**
 * Navigate to Academic Explorer and wait for it to be ready
 */
export async function navigateToApp(page: Page, path: string = "/"): Promise<void> {
	// Construct the full URL with hash routing
	const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5173"
	const hashPath = path.startsWith("/") ? `#${path}` : `#/${path}`
	const fullUrl = `${baseUrl}/${hashPath}`

	await page.goto(fullUrl, { waitUntil: "domcontentloaded" })
	await waitForAppReady(page)
}

/**
 * Mock OpenAlex API responses for testing
 */
export async function mockOpenAlexAPI(page: Page, responses: Record<string, unknown> = {}): Promise<void> {
 	console.log("DEBUG: mockOpenAlexAPI called with responses:", Object.keys(responses));

 	// Intercept both external OpenAlex API calls and local API proxy calls
 	// Use two separate route handlers for better matching

  	// Handle external OpenAlex API calls - be more specific to avoid intercepting dev server requests
  	await page.route(/^https?:\/\/api\.openalex\.org\/.*/, async (route) => {
  		console.log("DEBUG: Intercepted OpenAlex API request:", route.request().url());
 		const url = route.request().url()
 		const urlParts = url.split("api.openalex.org")
 		let endpoint = urlParts[1]?.split("?")[0] || ""
 		const endpointWithoutSlash = endpoint.startsWith("/") ? endpoint.substring(1) : endpoint

 		// Clean OpenAlex IDs in the endpoint - handle both encoded and decoded URLs
 		let cleanEndpoint = endpoint
 		try {
 			// Decode URL-encoded parts
 			const decodedEndpoint = decodeURIComponent(endpoint)
 			// Replace full OpenAlex URLs with short IDs
 			cleanEndpoint = decodedEndpoint.replace(/https?:\/\/openalex\.org\//g, "")
 		} catch {
 			// If decoding fails, try direct replacement
 			cleanEndpoint = endpoint.replace(/https?%3A%2F%2Fopenalex\.org%2F/g, "")
 		}

 		const mockData = responses[cleanEndpoint] || responses[`/${cleanEndpoint}`] || responses[cleanEndpoint] || responses[endpoint] || responses[`/${endpointWithoutSlash}`] || responses[endpointWithoutSlash]


		if (mockData) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockData)
			})
		} else {
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

	// Handle local API proxy calls - be more specific to avoid intercepting Vite dev server requests
	await page.route(/^https?:\/\/localhost:\d+\/api\/.*/, async (route) => {
		const url = route.request().url()
		const apiMatch = url.match(/\/api\/(.+?)(?:\?|$)/)
		const endpoint = apiMatch ? `/${apiMatch[1]}` : ""
		const endpointWithoutSlash = endpoint.startsWith("/") ? endpoint.substring(1) : endpoint

		const mockData = responses[endpoint] || responses[`/${endpointWithoutSlash}`] || responses[endpointWithoutSlash]


		if (mockData) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockData)
			})
		} else {
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
		title: page.locator('[data-testid="rich-entity-display-title"]').first(),
		description: page.locator('[data-testid="entity-description"], [class*="description"], p').first(),
		metadata: page.locator('[data-testid="entity-metadata"], [class*="metadata"], [class*="info"]').first(),
		content: page.locator('[data-testid="entity-content"], main, article, [class*="content"]').first(),
	}
}

/**
 * Check if the current page shows an error state
 */
export async function hasErrorState(page: Page): Promise<boolean> {
	// Only check for actual page-level error UI components, not API error messages
	const errorSelectors = [
		'[data-testid="error-boundary"]',
		'[data-testid="page-error"]',
		'[data-testid*="error-display"]',
		".error-boundary",
		'[role="alert"][class*="error"]',
		"text=/something went wrong/i",
		"text=/page not found/i"
		// Removed generic 404/500 checks as they can match API error messages
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

	// Check that main content is present - be more specific to Academic Explorer structure
	const contentSelectors = [
		"[data-mantine-color-scheme]", // Mantine app wrapper
		".mantine-AppShell-root", // AppShell component
		"main", // AppShell.Main
		"header", // AppShell.Header
		"#root > div", // Any content in root
		'[class*="AppShell"]' // Any AppShell related class
	];

	let hasContent = false;
	for (const selector of contentSelectors) {
		try {
			const element = page.locator(selector).first();
			if (await element.isVisible({ timeout: 5000 })) {
				hasContent = true;
				break;
			}
		} catch {
			// Continue to next selector
		}
	}

	vitestExpect(hasContent).toBe(true)
}