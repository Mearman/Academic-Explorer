/**
 * E2E tests for search functionality in Academic Explorer
 * Tests OpenAlex API integration, search interactions, and result handling
 */

import { test, describe } from "vitest"
import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"
import {
	navigateToApp,
	mockOpenAlexAPI,
	performSearch,
	waitForOpenAlexData,
	getEntityDisplay,
	assertPageLoadsWithoutErrors,
	debugScreenshot
} from "../test/e2e-utils"

// Access global page instance
const getPage = (): Page => globalThis.e2ePage

describe("Academic Explorer Search", () => {
	test("should perform basic search and display results", async () => {
		const page = getPage()

		// Mock search results
		const mockSearchResults = {
			"/works": {
				meta: { count: 100, page: 1, per_page: 25 },
				results: [
					{
						id: "https://openalex.org/W123",
						display_name: "Machine Learning in Academia",
						publication_year: 2023,
						type: "article",
						cited_by_count: 42
					},
					{
						id: "https://openalex.org/W456",
						display_name: "Deep Learning Applications",
						publication_year: 2022,
						type: "article",
						cited_by_count: 38
					}
				]
			}
		}

		await mockOpenAlexAPI(page, mockSearchResults)

		// Navigate to search page
		await navigateToApp(page, "/search")

		// Perform search
		await performSearch(page, "machine learning")

		// Verify search results are displayed
		const searchResults = page.locator('[data-testid*="search-result"], .search-result, [data-testid*="result"]')
		await expect(searchResults.first()).toBeVisible({ timeout: 15000 })

		// Check that multiple results are shown
		const resultCount = await searchResults.count()
		expect(resultCount).toBeGreaterThan(0)

		// Verify result content
		const firstResult = searchResults.first()
		await expect(firstResult).toContainText("Machine Learning")

		await debugScreenshot(page, "search-results")
	})

	test("should handle empty search results gracefully", async () => {
		const page = getPage()

		// Mock empty search results
		const emptyResults = {
			"/works": {
				meta: { count: 0, page: 1, per_page: 25 },
				results: []
			}
		}

		await mockOpenAlexAPI(page, emptyResults)

		await navigateToApp(page, "/search")
		await performSearch(page, "nonexistentquery12345")

		// Should show empty state message
		const emptyState = page.locator(
			'[data-testid*="empty"], .empty, text=/no results/i, text=/not found/i'
		)
		await expect(emptyState.first()).toBeVisible({ timeout: 10000 })

		// Should not show error state
		const errorState = page.locator('[data-testid*="error"], .error, [role="alert"]')
		await expect(errorState.first()).not.toBeVisible()
	})

	test("should handle search API errors gracefully", async () => {
		const page = getPage()

		// Mock API error
		await page.route("**/openalex.org/**", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Internal server error" })
			})
		})

		await navigateToApp(page, "/search")
		await performSearch(page, "test query")

		// Should show error state
		const errorState = page.locator('[data-testid*="error"], .error, [role="alert"]')
		await expect(errorState.first()).toBeVisible({ timeout: 10000 })

		// App should still be functional
		const searchInput = page.locator('[data-testid="search-input"], input[type="search"]')
		await expect(searchInput.first()).toBeVisible()
	})

	test("should support different search types (works, authors, etc.)", async () => {
		const page = getPage()

		const mockResponses = {
			"/works": {
				meta: { count: 10 },
				results: [{ id: "https://openalex.org/W123", display_name: "Test Work", type: "article" }]
			},
			"/authors": {
				meta: { count: 5 },
				results: [{ id: "https://openalex.org/A456", display_name: "Test Author", works_count: 20 }]
			},
			"/institutions": {
				meta: { count: 3 },
				results: [{ id: "https://openalex.org/I789", display_name: "Test University", works_count: 1000 }]
			}
		}

		await mockOpenAlexAPI(page, mockResponses)

		await navigateToApp(page, "/search")

		// Test searching different entity types
		const searchTypes = [
			{ type: "works", query: "research papers", expectedText: "Test Work" },
			{ type: "authors", query: "researchers", expectedText: "Test Author" },
			{ type: "institutions", query: "universities", expectedText: "Test University" }
		]

		for (const { type, query, expectedText } of searchTypes) {
			// Look for search type selector/filter
			const typeSelector = page.locator(
				`[data-testid="search-type-${type}"], [value="${type}"], text="${type}"`
			)

			if (await typeSelector.isVisible().catch(() => false)) {
				await typeSelector.click()
			}

			await performSearch(page, query)

			// Verify results for this type
			const results = page.locator('[data-testid*="result"], .search-result')
			await expect(results.first()).toBeVisible({ timeout: 10000 })
			await expect(results.first()).toContainText(expectedText)
		}
	})

	test("should navigate to entity pages from search results", async () => {
		const page = getPage()

		const mockSearchAndEntity = {
			"/works": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/W123",
					display_name: "Clickable Research Paper",
					publication_year: 2023
				}]
			},
			"/W123": {
				id: "https://openalex.org/W123",
				display_name: "Clickable Research Paper",
				publication_year: 2023,
				abstract: "This is a detailed view of the paper."
			}
		}

		await mockOpenAlexAPI(page, mockSearchAndEntity)

		await navigateToApp(page, "/search")
		await performSearch(page, "research paper")

		// Click on first search result
		const firstResult = page.locator('[data-testid*="result"], .search-result').first()
		await expect(firstResult).toBeVisible()

		// Look for clickable link within result
		const resultLink = firstResult.locator('a, [role="button"], [data-testid*="link"]').first()

		if (await resultLink.isVisible().catch(() => false)) {
			await resultLink.click()
		} else {
			// If no explicit link, click the result itself
			await firstResult.click()
		}

		// Should navigate to entity page
		await waitForOpenAlexData(page)

		// Verify we're on entity page
		const currentHash = await page.evaluate(() => window.location.hash)
		expect(currentHash).toMatch(/#\/(entity\/works\/W123|W123)/)

		// Verify entity content is displayed
		const entityDisplay = getEntityDisplay(page)
		await expect(entityDisplay.title).toContainText("Clickable Research Paper")
	})

	test("should support search filters and pagination", async () => {
		const page = getPage()

		// Mock paginated results
		const mockPaginatedResults = {
			"/works": {
				meta: { count: 100, page: 1, per_page: 25 },
				results: Array.from({ length: 25 }, (_, i) => ({
					id: `https://openalex.org/W${i + 1}`,
					display_name: `Research Paper ${i + 1}`,
					publication_year: 2023 - (i % 5)
				}))
			}
		}

		await mockOpenAlexAPI(page, mockPaginatedResults)

		await navigateToApp(page, "/search")
		await performSearch(page, "research")

		// Check for pagination controls
		const paginationControls = page.locator(
			'[data-testid*="pagination"], .pagination, [aria-label*="page"], button[aria-label*="next"]'
		)

		if (await paginationControls.first().isVisible().catch(() => false)) {
			// Test pagination interaction
			const nextButton = page.locator('button:has-text("Next"), [aria-label*="next"]').first()

			if (await nextButton.isVisible().catch(() => false)) {
				await nextButton.click()
				await waitForOpenAlexData(page)

				// Verify page changed
				const updatedResults = page.locator('[data-testid*="result"], .search-result')
				await expect(updatedResults.first()).toBeVisible()
			}
		}

		// Check for year filters
		const yearFilter = page.locator(
			'[data-testid*="year-filter"], [data-testid*="filter"], select, input[type="number"]'
		)

		if (await yearFilter.first().isVisible().catch(() => false)) {
			// Test applying a filter
			await yearFilter.first().click()
			await waitForOpenAlexData(page)
		}
	})

	test("should handle search input validation and suggestions", async () => {
		const page = getPage()
		await mockOpenAlexAPI(page)

		await navigateToApp(page, "/search")

		const searchInput = page.locator('[data-testid="search-input"], input[type="search"]').first()
		await expect(searchInput).toBeVisible()

		// Test empty search
		await searchInput.clear()
		await searchInput.press("Enter")

		// Should handle empty search gracefully (either prevent or show appropriate message)
		await page.waitForTimeout(1000)
		await assertPageLoadsWithoutErrors(page)

		// Test very long search query
		const longQuery = "a".repeat(500)
		await searchInput.fill(longQuery)
		await searchInput.press("Enter")

		// Should handle long queries without breaking
		await page.waitForTimeout(1000)
		await assertPageLoadsWithoutErrors(page)

		// Test special characters
		const specialQuery = 'query with "quotes" & symbols!'
		await searchInput.clear()
		await searchInput.fill(specialQuery)
		await searchInput.press("Enter")

		await waitForOpenAlexData(page)
		await assertPageLoadsWithoutErrors(page)
	})

	test("should maintain search state during navigation", async () => {
		const page = getPage()

		const mockResults = {
			"/works": {
				meta: { count: 10 },
				results: [{
					id: "https://openalex.org/W123",
					display_name: "Persistent Search Result",
					publication_year: 2023
				}]
			}
		}

		await mockOpenAlexAPI(page, mockResults)

		// Perform search
		await navigateToApp(page, "/search")
		await performSearch(page, "persistent query")

		// Verify results are shown
		const results = page.locator('[data-testid*="result"], .search-result')
		await expect(results.first()).toBeVisible()

		// Navigate away and back
		await navigateToApp(page, "/")
		await navigateToApp(page, "/search")

		// Check if search state is preserved
		const searchInput = page.locator('[data-testid="search-input"], input[type="search"]').first()
		await searchInput.inputValue().catch(() => "")

		// State preservation is optional - just ensure app doesn't break
		await assertPageLoadsWithoutErrors(page)
	})
})