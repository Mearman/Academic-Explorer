/**
 * E2E tests for Browse Workflow
 * Tests the complete browse workflow: browse → select entity type → view index → select entity → view detail
 *
 * @module browse-workflow.e2e
 * @see BrowsePage page object
 * @see spec-020 Phase 2: Browse page E2E tests
 */

import { test, expect } from '@playwright/test';

import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';
import { BrowsePage } from '@/test/page-objects/BrowsePage';

test.describe('@workflow Browse Workflow', () => {
	test('should complete full workflow: browse → works index → work detail', async ({ page }) => {
		// Step 1: Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 2: Click "Works" entity type card
		await browsePage.expectEntityTypeVisible('Works');
		await browsePage.clickEntityType('Works');

		// Step 3: Wait for works index page to load
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify index page loaded with list
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30000 });

		// Verify page title
		const pageTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(pageTitle).toContainText('Works');

		// Step 4: Click first work from the list
		const firstWorkLink = page.locator('a[href*="/works/W"]').first();
		await expect(firstWorkLink).toBeVisible();

		const workTitle = await firstWorkLink.textContent();
		expect(workTitle).toBeTruthy();

		await firstWorkLink.click();

		// Step 5: Verify navigation to work detail page
		await expect(page).toHaveURL(/\/works\/W\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail page loaded
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify work title is displayed
		const displayedTitle = await entityTitle.textContent();
		expect(displayedTitle).toBeTruthy();
	});

	test('should complete full workflow: browse → authors index → author detail', async ({ page }) => {
		// Step 1: Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 2: Click "Authors" entity type card
		await browsePage.expectEntityTypeVisible('Authors');
		await browsePage.clickEntityType('Authors');

		// Step 3: Wait for authors index page to load
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		// Verify index page loaded with list
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30000 });

		// Verify page title
		const pageTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(pageTitle).toContainText('Authors');

		// Step 4: Click first author from the list
		const firstAuthorLink = page.locator('a[href*="/authors/A"]').first();
		await expect(firstAuthorLink).toBeVisible();

		const authorName = await firstAuthorLink.textContent();
		expect(authorName).toBeTruthy();

		await firstAuthorLink.click();

		// Step 5: Verify navigation to author detail page
		await expect(page).toHaveURL(/\/authors\/A\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail page loaded
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify author name is displayed
		const displayedName = await entityTitle.textContent();
		expect(displayedName).toBeTruthy();
	});

	test('should complete full workflow: browse → institutions index → institution detail', async ({ page }) => {
		// Step 1: Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 2: Click "Institutions" entity type card
		await browsePage.expectEntityTypeVisible('Institutions');
		await browsePage.clickEntityType('Institutions');

		// Step 3: Wait for institutions index page to load
		await expect(page).toHaveURL(/\/institutions\/?/);
		await waitForAppReady(page);

		// Verify index page loaded with list
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30000 });

		// Verify page title
		const pageTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(pageTitle).toContainText('Institutions');

		// Step 4: Click first institution from the list
		const firstInstitutionLink = page.locator('a[href*="/institutions/I"]').first();
		await expect(firstInstitutionLink).toBeVisible();

		const institutionName = await firstInstitutionLink.textContent();
		expect(institutionName).toBeTruthy();

		await firstInstitutionLink.click();

		// Step 5: Verify navigation to institution detail page
		await expect(page).toHaveURL(/\/institutions\/I\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail page loaded
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify institution name is displayed
		const displayedName = await entityTitle.textContent();
		expect(displayedName).toBeTruthy();
	});

	test('should support browser back navigation from detail to index', async ({ page }) => {
		// Navigate through browse workflow to work detail
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30000 });

		const firstWorkLink = page.locator('a[href*="/works/W"]').first();
		await firstWorkLink.click();

		await expect(page).toHaveURL(/\/works\/W\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Use browser back button to return to works index
		await page.goBack();

		// Verify we're back on works index page
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify entity list is still visible
		await expect(entityList).toBeVisible({ timeout: 30000 });

		// Verify page title
		const pageTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(pageTitle).toContainText('Works');
	});

	test('should support browser back navigation from index to browse', async ({ page }) => {
		// Navigate from browse to works index
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Verify browse page components
		await expect(page.locator('[data-testid="browse-grid"]')).toBeVisible();

		await browsePage.clickEntityType('Authors');
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30000 });

		// Use browser back button to return to browse page
		await page.goBack();

		// Verify we're back on browse page
		await expect(page).toHaveURL(/\/browse/);
		await waitForAppReady(page);

		// Verify browse grid is visible
		await browsePage.expectBrowseLoaded();
		await expect(page.locator('[data-testid="browse-grid"]')).toBeVisible();

		// Verify entity type cards are still visible
		await browsePage.expectEntityTypeVisible('Works');
		await browsePage.expectEntityTypeVisible('Authors');
		await browsePage.expectEntityTypeVisible('Institutions');
	});

	test('should handle multiple entity types in same session', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Test 1: Works
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		const worksListTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(worksListTitle).toContainText('Works');

		// Return to browse
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Test 2: Authors
		await browsePage.clickEntityType('Authors');
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		const authorsListTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(authorsListTitle).toContainText('Authors');

		// Return to browse
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Test 3: Institutions
		await browsePage.clickEntityType('Institutions');
		await expect(page).toHaveURL(/\/institutions\/?/);
		await waitForAppReady(page);

		const institutionsListTitle = page.locator('h1, [data-testid="page-title"]');
		await expect(institutionsListTitle).toContainText('Institutions');

		// Verify app remained stable throughout
		const root = page.locator('#root');
		await expect(root).toBeVisible();
	});

	test('should display entity list with multiple items on index pages', async ({ page }) => {
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Navigate to works index
		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify multiple work items are displayed
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30000 });

		const workLinks = page.locator('a[href*="/works/W"]');
		const workCount = await workLinks.count();

		// Should have at least a few works displayed (paginated results)
		expect(workCount).toBeGreaterThan(0);

		// Verify each link has text content
		for (let i = 0; i < Math.min(5, workCount); i++) {
			const linkText = await workLinks.nth(i).textContent();
			expect(linkText).toBeTruthy();
			expect(linkText?.trim().length).toBeGreaterThan(0);
		}
	});

	test('should handle browse page load without errors', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Monitor console errors
		const errors: string[] = [];
		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Verify no errors occurred
		expect(errors).toHaveLength(0);

		// Verify page structure is intact
		const root = page.locator('#root');
		await expect(root).toBeVisible();

		// Verify browse grid is present
		await expect(page.locator('[data-testid="browse-grid"]')).toBeVisible();

		// Verify minimum number of entity types are displayed
		await browsePage.expectMinimumEntityTypes(10); // Academic Explorer has 12 entity types
	});
});
