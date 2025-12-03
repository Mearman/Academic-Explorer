/**
 * Page Smoke Tests - Auto-discovered E2E tests for all application routes
 *
 * Routes are automatically discovered from routeTree.gen.ts, ensuring new
 * routes are tested without manual updates.
 *
 * Tests verify that every page:
 * 1. Navigates successfully (no 404, no infinite redirect loops)
 * 2. Renders without JavaScript errors
 * 3. Shows meaningful content (not a blank page)
 * @module page-smoke.e2e
 */

import { expect, test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";
import { getEntityId, getExternalId } from "@/test/helpers/entity-discovery";
import {
	categorizeRoutes,
	extractEntityType,
	getAllRoutes,
	getExternalIdInfo,
	resolveExternalIdRoute,
	resolveRoute,
} from "@/test/helpers/route-discovery";

// Base URL from environment or defaults
const BASE_URL =
	process.env.BASE_URL ||
	process.env.E2E_BASE_URL ||
	(process.env.CI ? "http://localhost:4173" : "http://localhost:5173");

// Discover and categorize all routes at module load time
const allRoutes = getAllRoutes();
const routes = categorizeRoutes(allRoutes);

// Helper to build hash routes (SPA uses hash routing)
const buildUrl = (path: string): string => `${BASE_URL}/#${path}`;

// Helper to check page loads without errors
const expectPageLoads = async (page: import("@playwright/test").Page, path: string, options?: {
		expectContent?: string | RegExp;
		skipContentCheck?: boolean;
	}): Promise<void> => {
	const errors: string[] = [];
	page.on("pageerror", (error) => {
		errors.push(error.message);
	});

	const url = buildUrl(path);
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
	await waitForAppReady(page, { timeout: 30_000 });

	// Verify no JavaScript errors
	expect(errors, `JavaScript errors on ${path}`).toHaveLength(0);

	// Verify root element exists and has content
	const root = page.locator("#root");
	await expect(root).toBeVisible();

	// Verify page has meaningful content (not blank)
	if (!options?.skipContentCheck) {
		const contentSelector =
			(await page.locator("main").count()) > 0 ? "main" : "body";
		const content = await page.locator(contentSelector).textContent();
		expect(
			content?.trim().length,
			`Page ${path} should have content`
		).toBeGreaterThan(10);
	}

	// Check for specific content if provided
	if (options?.expectContent) {
		const locator =
			typeof options.expectContent === "string"
				? page.locator(`text=${options.expectContent}`)
				: page.locator(`text=${options.expectContent.source}`);
		await expect(locator.first()).toBeVisible({ timeout: 10_000 });
	}

	// Verify no error state displayed
	const errorHeading = await page.locator('h1:has-text("Error")').count();
	const error404Count = await page.locator('text="404"').count();

	// Allow 404 only for explicitly invalid routes
	if (!path.includes("invalid") && !path.includes("999999")) {
		expect(errorHeading, `Page ${path} should not show Error heading`).toBe(0);
		expect(error404Count, `Page ${path} should not show 404`).toBe(0);
	}
};

// ============================================================================
// Auto-discovered Static Routes
// ============================================================================

test.describe("Auto-discovered Static Routes", () => {
	test.setTimeout(60_000);

	for (const route of routes.static) {
		const isHomepage = route === "/";
		const isErrorTest = route === "/error-test";

		test(`${route} loads successfully`, async ({ page }) => {
			await expectPageLoads(page, route, {
				expectContent: isHomepage ? "BibGraph" : undefined,
				skipContentCheck: isErrorTest,
			});
		});
	}
});

// ============================================================================
// Auto-discovered Entity Index Pages
// ============================================================================

test.describe("Auto-discovered Entity Index Pages", () => {
	test.setTimeout(60_000);

	for (const route of routes.entityIndex) {
		test(`${route} loads successfully`, async ({ page }) => {
			await expectPageLoads(page, route);
		});
	}
});

// ============================================================================
// Auto-discovered Entity Detail Pages
// ============================================================================

test.describe("Auto-discovered Entity Detail Pages", () => {
	test.setTimeout(90_000);

	for (const route of routes.entityDetail) {
		const entityType = extractEntityType(route);

		if (!entityType) {
			// Skip routes we can't determine entity type for
			continue;
		}

		test(`${route} loads with discovered entity`, async ({ page }) => {
			// Get entity ID (runtime discovery with fallback)
			const entityId = await getEntityId(entityType);
			const resolvedPath = resolveRoute(route, entityId);

			await expectPageLoads(page, resolvedPath);
		});
	}
});

// ============================================================================
// Auto-discovered External ID Routes
// ============================================================================

test.describe("Auto-discovered External ID Routes", () => {
	test.setTimeout(60_000);

	for (const route of routes.externalId) {
		const externalIdInfo = getExternalIdInfo(route);

		if (!externalIdInfo) {
			continue;
		}

		test(`${route} resolves successfully`, async ({ page }) => {
			// Get external ID (runtime discovery with fallback)
			const externalId = await getExternalId(
				externalIdInfo.idType as "orcid" | "issn" | "ror" | "doi"
			);
			const resolvedPath = resolveExternalIdRoute(route, externalId);

			await expectPageLoads(page, resolvedPath);
		});
	}
});

// ============================================================================
// Auto-discovered Autocomplete Pages
// ============================================================================

test.describe("Auto-discovered Autocomplete Pages", () => {
	test.setTimeout(60_000);

	for (const route of routes.autocomplete) {
		test(`${route} loads successfully`, async ({ page }) => {
			await expectPageLoads(page, route);
		});
	}
});

// ============================================================================
// Route Discovery Summary (for debugging)
// ============================================================================

test.describe("Route Discovery Summary", () => {
	test("reports discovered routes", async () => {
		console.log("\n=== Route Discovery Summary ===");
		console.log(`Total routes discovered: ${allRoutes.length}`);
		console.log(`  Static: ${routes.static.length}`);
		console.log(`  Entity Index: ${routes.entityIndex.length}`);
		console.log(`  Entity Detail: ${routes.entityDetail.length}`);
		console.log(`  External ID: ${routes.externalId.length}`);
		console.log(`  Autocomplete: ${routes.autocomplete.length}`);
		console.log(`  Skipped: ${routes.skip.length}`);
		console.log("\nSkipped routes:", routes.skip);
		console.log("===============================\n");

		// Verify we discovered a reasonable number of routes
		expect(allRoutes.length).toBeGreaterThan(40);
		expect(routes.static.length).toBeGreaterThan(10);
		expect(routes.entityIndex.length).toBeGreaterThan(5);
	});
});
