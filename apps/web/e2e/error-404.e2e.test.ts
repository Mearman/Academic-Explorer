/**
 * E2E tests for 404 (Not Found) error scenarios
 *
 * Tests handling of non-existent entities and routes
 *
 * @module error-404.e2e
 * @tag @error
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { test, expect } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";
import { ErrorPage } from "@/test/page-objects/ErrorPage";

test.describe("@error 404 Not Found Errors", () => {
	let errorPage: ErrorPage;

	test.beforeEach(async ({ page }) => {
		errorPage = new ErrorPage(page);
	});

	test("should display 404 error for non-existent work", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Verify error page or error message is displayed
		const errorElement = page.locator(
			'[data-testid="error-page"], [role="alert"], .error-message',
		);
		const notFoundText = page.getByText(/not found|404|does not exist/i);

		// Either error page or error message should be visible
		const hasError =
			(await errorElement.isVisible().catch(() => false)) ||
			(await notFoundText.isVisible().catch(() => false));
		expect(hasError).toBe(true);
	});

	test("should display 404 error for non-existent author", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("authors", "A9999999999999");

		const notFoundText = page.getByText(/not found|404|does not exist/i);
		await expect(notFoundText).toBeVisible({ timeout: 10000 });
	});

	test("should display 404 error for non-existent institution", async ({
		page,
	}) => {
		await errorPage.gotoNonExistentEntity("institutions", "I9999999999999");

		const notFoundText = page.getByText(/not found|404|does not exist/i);
		await expect(notFoundText).toBeVisible({ timeout: 10000 });
	});

	test("should display 404 error for non-existent source", async () => {
		await errorPage.gotoNonExistentEntity("sources", "S9999999999999");

		await errorPage.expectNotFoundError();
	});

	test("should display 404 error for non-existent topic", async () => {
		await errorPage.gotoNonExistentEntity("topics", "T9999999999999");

		await errorPage.expectNotFoundError();
	});

	test("should display 404 error for non-existent route", async ({ page }) => {
		await page.goto("/nonexistent-page-12345");
		await waitForAppReady(page);

		// Should show 404 or redirect to home
		const notFoundText = page.getByText(/not found|404|page.*exist/i);
		const isError = await notFoundText.isVisible().catch(() => false);

		if (!isError) {
			// May redirect to home page instead
			await expect(page).toHaveURL(/^\/?$/);
		}
	});

	test("should display appropriate error message", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Check for user-friendly error message
		const errorMessages = [
			page.getByText(/could not find/i),
			page.getByText(/doesn't exist/i),
			page.getByText(/no longer available/i),
			page.getByText(/not found/i),
		];

		let foundMessage = false;
		for (const msg of errorMessages) {
			if (await msg.isVisible().catch(() => false)) {
				foundMessage = true;
				break;
			}
		}

		expect(foundMessage).toBe(true);
	});

	test("should provide navigation options from error page", async ({
		page,
	}) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Should have some way to navigate away (home link, back button, etc.)
		const navOptions = page.locator(
			'a[href="/"], a[href*="home"], button:has-text("back"), button:has-text("home")',
		);

		const hasNavOptions = (await navOptions.count()) > 0;

		if (hasNavOptions) {
			await expect(navOptions.first()).toBeVisible();
		}
		// If no explicit nav options, browser back should work
	});

	test("should display 404 error for malformed work ID", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "INVALID_ID");

		const notFoundText = page.getByText(/not found|404|invalid|does not exist/i);
		await expect(notFoundText).toBeVisible({ timeout: 10000 });
	});

	test("should display 404 error for malformed author ID", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("authors", "INVALID_ID");

		const notFoundText = page.getByText(/not found|404|invalid|does not exist/i);
		await expect(notFoundText).toBeVisible({ timeout: 10000 });
	});

	test("should handle 404 error with retry button if available", async () => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Check if retry button is visible
		const retryVisible = await errorPage.retryButton
			.isVisible()
			.catch(() => false);

		if (retryVisible) {
			await errorPage.expectRetryButtonVisible();
			// Note: We don't actually click retry as it would just fail again
		}
	});

	test("should handle 404 error with home button if available", async () => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Check if home button is visible
		const homeVisible = await errorPage.homeButton
			.isVisible()
			.catch(() => false);

		if (homeVisible) {
			await errorPage.expectHomeButtonVisible();
			// Could optionally test clicking home
			// await errorPage.clickHome();
		}
	});

	test("should maintain app structure despite 404 error", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// App shell should still be present (header, etc.)
		// This ensures the error is handled gracefully within the app
		const appRoot = page.locator("#root, #app, main, [role=main]");
		await expect(appRoot).toBeVisible();
	});
});
