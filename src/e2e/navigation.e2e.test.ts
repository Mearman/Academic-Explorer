/**
 * E2E tests for core navigation functionality in Academic Explorer
 * Tests routing, entity navigation, and basic user journeys
 */

import { test, describe } from "vitest"
import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"
import {
	navigateToApp,
	mockOpenAlexAPI,
	navigateToEntity,
	getEntityDisplay,
	assertPageLoadsWithoutErrors,
	waitForNavigation,
	debugScreenshot
} from "../test/e2e-utils"

// Access global page instance
const getPage = (): Page => globalThis.e2ePage

describe("Academic Explorer Navigation", () => {
	test("should load the home page without errors", async () => {
		const page = getPage()

		// Mock OpenAlex API to prevent external calls
		await mockOpenAlexAPI(page)

		// Navigate to home page
		await navigateToApp(page, "/")

		// Assert page loads correctly
		await assertPageLoadsWithoutErrors(page)

		// Check that the app container is present
		const appContainer = page.locator('[data-testid="app-container"], #root, main')
		await expect(appContainer.first()).toBeVisible()
	})

	test("should handle hash-based routing correctly", async () => {
		const page = getPage()
		await mockOpenAlexAPI(page)

		// Test different route patterns
		const routes = [
			"/",
			"/about",
			"/search",
			"/explore"
		]

		for (const route of routes) {
			await navigateToApp(page, route)

			// Verify hash routing works
			const currentHash = await page.evaluate(() => window.location.hash)
			expect(currentHash).toContain(route === "/" ? "#/" : `#${route}`)

			// Ensure no errors
			await assertPageLoadsWithoutErrors(page)
		}
	})

	test("should navigate to entity pages via URL patterns", async () => {
		const page = getPage()

		// Mock entity data
		const mockEntityData = {
			"/works/W123": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/W123",
					display_name: "Test Work",
					publication_year: 2023,
					type: "article"
				}]
			},
			"/authors/A456": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/A456",
					display_name: "Test Author",
					works_count: 10
				}]
			}
		}

		await mockOpenAlexAPI(page, mockEntityData)

		// Test entity navigation patterns
		const entityTests = [
			{ type: "works", id: "W123", expectedTitle: "Test Work" },
			{ type: "authors", id: "A456", expectedTitle: "Test Author" }
		]

		for (const { type, id, expectedTitle } of entityTests) {
			await navigateToEntity(page, type, id)

			// Verify URL
			const currentHash = await page.evaluate(() => window.location.hash)
			expect(currentHash).toContain(`/entity/${type}/${id}`)

			// Verify entity display
			const entityDisplay = getEntityDisplay(page)
			await expect(entityDisplay.title).toContainText(expectedTitle)

			// Take debug screenshot
			await debugScreenshot(page, `entity-${type}-${id}`)
		}
	})

	test("should handle external URL detection and routing", async () => {
		const page = getPage()
		await mockOpenAlexAPI(page, {
			"/W123": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/W123",
					display_name: "External URL Work",
					publication_year: 2023
				}]
			}
		})

		// Test OpenAlex URL routing (https.$.tsx pattern)
		const openalexUrl = "/https/openalex.org/W123"
		await navigateToApp(page, openalexUrl)

		// Should redirect to proper entity route
		await waitForNavigation(page)

		// Verify final URL
		const finalHash = await page.evaluate(() => window.location.hash)
		expect(finalHash).toMatch(/#\/(entity\/works\/W123|W123)/)

		await assertPageLoadsWithoutErrors(page)
	})

	test("should handle numeric ID detection and auto-routing", async () => {
		const page = getPage()
		await mockOpenAlexAPI(page, {
			"/W123456789": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/W123456789",
					display_name: "Numeric ID Work",
					publication_year: 2023
				}]
			}
		})

		// Test bare ID routing ($bareId.tsx pattern)
		await navigateToApp(page, "/123456789")

		// Should detect as work and route appropriately
		await waitForNavigation(page)

		// Verify entity loads
		await assertPageLoadsWithoutErrors(page)

		const entityDisplay = getEntityDisplay(page)
		await expect(entityDisplay.title).toBeVisible()
	})

	test("should handle 404 and error states gracefully", async () => {
		const page = getPage()

		// Mock 404 response
		await page.route("**/openalex.org/**", async (route) => {
			await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({ error: "Not found" })
			})
		})

		// Navigate to non-existent entity
		await navigateToApp(page, "/entity/works/NONEXISTENT")

		// Should show error state without crashing
		const errorElement = page.locator('[data-testid*="error"], .error, [role="alert"]')
		await expect(errorElement.first()).toBeVisible({ timeout: 10000 })

		// App should still be functional
		const appContainer = page.locator('[data-testid="app-container"], #root')
		await expect(appContainer.first()).toBeVisible()
	})

	test("should maintain navigation history", async () => {
		const page = getPage()
		await mockOpenAlexAPI(page)

		// Navigate through multiple pages
		await navigateToApp(page, "/")
		await navigateToApp(page, "/about")
		await navigateToApp(page, "/search")

		// Test browser back navigation
		await page.goBack()
		let currentHash = await page.evaluate(() => window.location.hash)
		expect(currentHash).toContain("#/about")

		await page.goBack()
		currentHash = await page.evaluate(() => window.location.hash)
		expect(currentHash).toContain("#/")

		// Test browser forward navigation
		await page.goForward()
		currentHash = await page.evaluate(() => window.location.hash)
		expect(currentHash).toContain("#/about")
	})

	test("should handle simultaneous route changes without conflicts", async () => {
		const page = getPage()
		await mockOpenAlexAPI(page)

		// Rapidly navigate between routes
		const routes = ["/search", "/about", "/", "/explore"]

		for (let i = 0; i < routes.length; i++) {
			// Don't await - test rapid navigation
			navigateToApp(page, routes[i])

			// Small delay to allow route processing
			await page.waitForTimeout(100)
		}

		// Wait for final navigation to settle
		await waitForNavigation(page)

		// Should end up on the last route without errors
		await assertPageLoadsWithoutErrors(page)

		const finalHash = await page.evaluate(() => window.location.hash)
		expect(finalHash).toContain("#/explore")
	})
})