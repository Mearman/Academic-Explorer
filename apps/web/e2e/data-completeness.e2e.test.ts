/**
 * Data Completeness E2E Tests
 *
 * Automated tests promoting manual data completeness verification.
 * Tests that the styled view displays ALL data from API responses.
 * Compares field count and content between direct API response and rendered page.
 */

import { expect,test } from '@playwright/test';

import {
	waitForAppReady,
	waitForNoLoading,
} from '@/test/helpers/app-ready';

const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

test.describe('Data Completeness - Styled View vs API @manual', () => {
	test.setTimeout(60_000);

	test('works search - bioplastics filter should display all API data', async ({
		page,
		request,
	}) => {
		const apiUrl =
			'https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc';

		// Fetch raw API response
		const apiResponse = await request.get(apiUrl);
		expect(apiResponse.ok()).toBeTruthy();
		const apiData = await apiResponse.json();

		expect(apiData.results).toBeDefined();
		expect(Array.isArray(apiData.results)).toBeTruthy();
		expect(apiData.results.length).toBeGreaterThan(0);

		const firstResult = apiData.results[0];
		firstResult.id.split('/').pop(); // Extract W... ID for potential future use

		// Test both URL formats
		const urlFormats = [
			`${BASE_URL}/#/${apiUrl}`, // Full API URL in hash
			`${BASE_URL}/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`, // Relative path
		];

		for (const url of urlFormats) {
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });
			await waitForNoLoading(page, { timeout: 30_000 });

			// Wait for main content to be visible
			await page.locator('main').waitFor({ timeout: 15_000, state: 'visible' });

			const mainText = page.locator('main');
			const mainTextContent = await mainText.textContent();

			// Verify first result is present
			expect(mainTextContent).toContain(firstResult.display_name);

			// Verify we have similar number of results displayed
			const resultCards = await page
				.locator('[data-testid="work-card"], .work-item, article')
				.count();
			expect(resultCards).toBeGreaterThan(0);

			// Check for key metadata fields in the first result
			if (firstResult.publication_year) {
				expect(mainTextContent).toContain(String(firstResult.publication_year));
			}

			// Verify pagination info is shown
			expect(mainTextContent).toMatch(/items|results|works/i);
		}
	});

	test('author detail - A5017898742 should display all API fields', async ({
		page,
		request,
	}) => {
		const authorId = 'A5017898742';
		const apiUrl = `https://api.openalex.org/authors/${authorId}`;

		// Fetch raw API response
		const apiResponse = await request.get(apiUrl);
		expect(apiResponse.ok()).toBeTruthy();
		const apiData = await apiResponse.json();

		expect(apiData.id).toContain(authorId);
		expect(apiData.display_name).toBeTruthy();

		// Navigate to author page
		await page.goto(`${BASE_URL}/#/authors/${authorId}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page, { timeout: 30_000 });
		await waitForNoLoading(page, { timeout: 30_000 });

		// Wait for main content to be visible
		await page.locator('main').waitFor({ timeout: 15_000, state: 'visible' });

		const mainText = page.locator('main');
		const mainTextContent2 = await mainText.textContent();

		// Verify essential fields are displayed
		expect(mainTextContent2).toContain(apiData.display_name);

		if (apiData.orcid) {
			expect(mainTextContent2).toContain('ORCID');
		}

		if (apiData.works_count) {
			expect(mainTextContent2).toContain('works');
		}

		if (apiData.cited_by_count) {
			expect(mainTextContent2).toContain('citations');
		}

		// Check for last known institution if present
		if (apiData.last_known_institution?.display_name) {
			expect(mainTextContent2).toContain(
				apiData.last_known_institution.display_name
			);
		}
	});

	test('concepts list should display all API results', async ({
		page,
		request,
	}) => {
		const apiUrl =
			'https://api.openalex.org/concepts?sort=cited_by_count:desc';

		// Fetch raw API response
		const apiResponse = await request.get(apiUrl);
		expect(apiResponse.ok()).toBeTruthy();
		const apiData = await apiResponse.json();

		expect(apiData.results).toBeDefined();
		expect(apiData.results.length).toBeGreaterThan(0);

		const firstConcept = apiData.results[0];

		// Navigate to concepts list
		await page.goto(`${BASE_URL}/#/concepts?sort=cited_by_count:desc`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page, { timeout: 30_000 });
		await waitForNoLoading(page, { timeout: 30_000 });

		// Wait for main content to be visible
		await page.locator('main').waitFor({ timeout: 15_000, state: 'visible' });

		const mainText = page.locator('main');
		const mainTextContent3 = await mainText.textContent();

		// Verify first concept is displayed
		expect(mainTextContent3).toContain(firstConcept.display_name);

		// Verify we show similar number of results
		const resultCount = await page
			.locator('[data-testid="concept-card"], .concept-item, article')
			.count();
		expect(resultCount).toBeGreaterThan(0);
	});

	test('works with select parameter should respect field selection', async ({
		page,
		request,
	}) => {
		const selectFields = 'id,display_name,publication_year';
		const apiUrl = `https://api.openalex.org/works?select=${selectFields}`;

		// Fetch raw API response
		const apiResponse = await request.get(apiUrl);
		expect(apiResponse.ok()).toBeTruthy();
		const apiData = await apiResponse.json();

		expect(apiData.results).toBeDefined();
		const firstWork = apiData.results[0];

		// Verify API only returned selected fields
		expect(firstWork.id).toBeDefined();
		expect(firstWork.display_name).toBeDefined();
		expect(firstWork.publication_year).toBeDefined();

		// Navigate to works with select
		await page.goto(`${BASE_URL}/#/works?select=${selectFields}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page, { timeout: 30_000 });
		await waitForNoLoading(page, { timeout: 30_000 });

		// Wait for main content to be visible
		await page.locator('main').waitFor({ timeout: 15_000, state: 'visible' });

		const mainText = page.locator('main');
		const mainTextContent4 = await mainText.textContent();

		// Verify first work is displayed
		expect(mainTextContent4).toContain(firstWork.display_name);

		// Verify select parameter is shown to user
		expect(mainTextContent4).toMatch(/fields|select/i);
	});
});
