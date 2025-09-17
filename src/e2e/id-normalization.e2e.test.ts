/**
 * E2E tests for OpenAlex ID normalization in Academic Explorer
 * Tests that lowercase entity IDs are properly normalized to uppercase
 */

import { test, expect as vitestExpect, describe } from "vitest"
import type { Page } from "@playwright/test"
import {
	mockOpenAlexAPI,
	waitForOpenAlexData
} from "../test/e2e-utils"

// Access global page instance
const getPage = (): Page => globalThis.e2ePage

describe("OpenAlex ID Normalization", () => {
	test("should redirect lowercase author ID to uppercase", async () => {
		const page = getPage()

		// Mock the normalized author data
		const mockAuthorData = {
			"/authors/A5025875274": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/A5025875274",
					display_name: "Test Author",
					works_count: 100,
					cited_by_count: 500
				}]
			}
		}

		await mockOpenAlexAPI(page, mockAuthorData)

		// Navigate to lowercase ID URL
		await page.goto("http://localhost:4173/#/authors/a5025875274")

		// Wait for redirect to complete
		await waitForOpenAlexData(page)

		// Verify the URL was normalized to uppercase
		const finalUrl = page.url()
		vitestExpect(finalUrl).toContain("#/authors/A5025875274")
		vitestExpect(finalUrl).not.toContain("/authors/a5025875274")
	})

	test("should redirect various OpenAlex URL formats to normalized author route", async () => {
		const page = getPage()

		// Mock the normalized author data
		const mockAuthorData = {
			"/authors/A5025875274": {
				meta: { count: 1 },
				results: [{
					id: "https://openalex.org/A5025875274",
					display_name: "Test Author",
					works_count: 100,
					cited_by_count: 500
				}]
			}
		}

		await mockOpenAlexAPI(page, mockAuthorData)

		// Test various OpenAlex URL formats that should all redirect to /authors/A5025875274
		// Use URL-encoded versions since browser transforms #/https:// to #/https:/
		const urlVariations = [
			"http://localhost:4173/#/" + encodeURIComponent("https:/openalex.org/authors/a5025875274"),
			"http://localhost:4173/#/" + encodeURIComponent("https:/openalex.org/authors/A5025875274"),
			"http://localhost:4173/#/" + encodeURIComponent("https:/api.openalex.org/people/A5025875274"),
			"http://localhost:4173/#/" + encodeURIComponent("https:/api.openalex.org/people/a5025875274")
		]

		for (const testUrl of urlVariations) {
			await page.goto(testUrl)
			await waitForOpenAlexData(page)

			const finalUrl = page.url()
			vitestExpect(finalUrl).toContain("#/authors/A5025875274")
			vitestExpect(finalUrl).not.toContain("https://")
			vitestExpect(finalUrl).not.toContain("api.openalex.org")
			vitestExpect(finalUrl).not.toContain("people")
			vitestExpect(finalUrl).not.toContain("a5025875274") // No lowercase
		}
	})
})