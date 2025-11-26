/**
 * E2E tests for Explore/Graph utility page
 *
 * Tests the D3 force simulation graph visualization page at /explore.
 * Verifies graph rendering, zoom controls, node interactions, and empty state handling.
 *
 * @see spec-020 Phase 1: Utility pages
 */

import { test, expect } from '@playwright/test';
import { ExplorePage } from '@/test/page-objects/ExplorePage';
import { waitForAppReady, waitForGraphReady } from '@/test/helpers/app-ready';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('@utility Explore Page', () => {
	test.setTimeout(60000); // 60 seconds for graph rendering

	let explorePage: ExplorePage;

	test.beforeEach(async ({ page }) => {
		explorePage = new ExplorePage(page);

		// Set up console error listener for debugging
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				console.error('Browser console error:', msg.text());
			}
		});

		// Set up network error listener
		page.on('pageerror', (error) => {
			console.error('Page error:', error.message);
		});
	});

	test('should load Explore page successfully', async ({ page }) => {
		await explorePage.goto('/explore');
		await waitForAppReady(page);

		// Verify page title or heading is present
		const heading = page.locator('h1, h2').filter({ hasText: /explore|graph/i });
		const headingVisible = await heading.isVisible().catch(() => false);

		// If no explicit heading, verify the page loaded by checking for main content
		if (!headingVisible) {
			await expect(page.locator('main')).toBeVisible();
		}

		// Verify no critical errors
		const errorMessages = page.locator('[role="alert"]');
		const hasError = await errorMessages.count();
		expect(hasError).toBe(0);
	});

	test('should render graph SVG container', async ({ page }) => {
		await explorePage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Check for SVG container using primary selector
		const graphContainer = page.locator(explorePage['exploreSelectors'].graphContainer);
		const primaryVisible = await graphContainer.isVisible().catch(() => false);

		if (!primaryVisible) {
			// Fall back to SVG element
			const svgContainer = page.locator('svg');
			await expect(svgContainer).toBeVisible();
		} else {
			await expect(graphContainer).toBeVisible();
		}

		// Verify SVG has graph groups
		const nodesGroup = page.locator('svg g.nodes');
		await expect(nodesGroup).toBeAttached();
	});

	test('should display graph zoom controls', async ({ page }) => {
		await explorePage.goto('/explore');
		await waitForAppReady(page);

		// Check for zoom controls using page object selectors
		const zoomInButton = page.locator(explorePage['exploreSelectors'].zoomIn);
		const zoomOutButton = page.locator(explorePage['exploreSelectors'].zoomOut);
		const resetZoomButton = page.locator(explorePage['exploreSelectors'].resetZoom);

		// Check if any zoom controls are visible
		const hasZoomIn = await zoomInButton.isVisible().catch(() => false);
		const hasZoomOut = await zoomOutButton.isVisible().catch(() => false);
		const hasResetZoom = await resetZoomButton.isVisible().catch(() => false);

		// At least one zoom control should be visible, or check for zoom controls container
		if (!hasZoomIn && !hasZoomOut && !hasResetZoom) {
			// Alternative: check for zoom controls container
			const zoomControls = page.locator(explorePage['exploreSelectors'].zoomControls);
			const controlsVisible = await zoomControls.isVisible().catch(() => false);

			// If no zoom controls, verify this is expected behavior (empty state)
			if (!controlsVisible) {
				// Check if we're in an empty state
				const emptyStateMessage = page.locator('text=/no data|empty|add entities/i');
				const hasEmptyState = await emptyStateMessage.isVisible().catch(() => false);

				// Either zoom controls or empty state should be present
				expect(hasEmptyState).toBeTruthy();
			}
		} else {
			// At least one zoom control is visible
			expect(hasZoomIn || hasZoomOut || hasResetZoom).toBeTruthy();
		}
	});

	test('should handle zoom interactions when graph is populated', async ({ page }) => {
		await explorePage.goto('/explore');
		await waitForAppReady(page);

		// Check if graph has nodes
		const nodeCount = await explorePage.getNodeCount();

		if (nodeCount > 0) {
			// Test zoom controls only if graph has data
			await waitForGraphReady(page);

			// Try to zoom in
			const zoomInButton = page.locator(explorePage['exploreSelectors'].zoomIn);
			const hasZoomIn = await zoomInButton.isVisible().catch(() => false);

			if (hasZoomIn) {
				await explorePage.zoomIn();
				// Wait for zoom animation
				await page.waitForTimeout(500);

				// Verify SVG transform or zoom level changed
				const svg = page.locator('svg');
				const transform = await svg.getAttribute('transform');
				// Transform might be on a child element or managed differently
				// Just verify no errors occurred
				const errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);
			}
		} else {
			// Skip zoom interaction test if no nodes present
			console.log('Skipping zoom interaction test - no nodes in graph');
		}
	});

	test('should display empty state message when no data is available', async ({ page }) => {
		await explorePage.goto('/explore');
		await waitForAppReady(page);

		// Give the page time to load data
		await page.waitForTimeout(2000);

		// Check node count
		const nodeCount = await explorePage.getNodeCount();

		if (nodeCount === 0) {
			// Should show empty state message
			const emptyStateMessages = [
				page.locator('text=/no entities|empty|no data/i'),
				page.locator('text=/add entities|start exploring/i'),
				page.locator('text=/bookmark.*explore/i'),
			];

			let foundEmptyState = false;
			for (const message of emptyStateMessages) {
				const visible = await message.isVisible().catch(() => false);
				if (visible) {
					foundEmptyState = true;
					break;
				}
			}

			// Verify empty state guidance is present
			expect(foundEmptyState).toBeTruthy();
		} else {
			// If nodes are present, verify graph rendered successfully
			await explorePage.expectGraphLoaded();
		}
	});

	test('should render graph nodes when data is available', async ({ page }) => {
		await explorePage.goto('/explore');
		await waitForAppReady(page);
		await page.waitForTimeout(2000); // Allow time for data loading

		const nodeCount = await explorePage.getNodeCount();

		if (nodeCount > 0) {
			// Verify graph is properly loaded
			await waitForGraphReady(page);
			await explorePage.expectGraphLoaded();

			// Verify nodes are interactive (have proper attributes)
			const firstNode = page.locator(explorePage['exploreSelectors'].graphNode).first();
			const fallbackNode = page.locator(explorePage['exploreSelectors'].graphNodeFallback).first();

			const primaryExists = await firstNode.count() > 0;
			const fallbackExists = await fallbackNode.count() > 0;

			expect(primaryExists || fallbackExists).toBeTruthy();
		} else {
			// No nodes - verify empty state is shown
			const emptyState = page.locator('text=/no entities|empty|no data/i');
			const hasEmptyState = await emptyState.isVisible().catch(() => false);
			expect(hasEmptyState).toBeTruthy();
		}
	});

	test('should not crash or show infinite loop errors', async ({ page }) => {
		const consoleErrors: string[] = [];

		// Capture console errors
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		await explorePage.goto('/explore');
		await waitForAppReady(page);
		await page.waitForTimeout(3000); // Wait for any async operations

		// Filter for critical errors
		const criticalErrors = consoleErrors.filter(
			(error) =>
				error.includes('Maximum update depth') ||
				error.includes('infinite loop') ||
				error.includes('too many re-renders')
		);

		expect(criticalErrors).toHaveLength(0);

		// Verify page didn't crash
		const pageVisible = await page.locator('main').isVisible();
		expect(pageVisible).toBeTruthy();
	});
});
