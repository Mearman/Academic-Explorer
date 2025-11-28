import type { Page } from '@playwright/test';

/**
 * Navigation helper for E2E tests in BibGraph SPA (TanStack Router).
 * Provides deterministic navigation utilities with proper wait conditions.
 */
export class NavigationHelper {
	constructor(private readonly page: Page) {}

	/**
	 * Navigate to a relative path using the configured baseURL.
	 * @param path - Relative path to navigate to (e.g., "/authors/A123")
	 */
	async goto(path: string): Promise<void> {
		await this.page.goto(path);
		await this.waitForRouterReady();
	}

	/**
	 * Navigate to an entity detail page.
	 * @param entityType - Entity type (e.g., "authors", "works")
	 * @param entityId - Entity ID (e.g., "A123", "W123")
	 */
	async gotoEntity(entityType: string, entityId: string): Promise<void> {
		const path = `/${entityType}/${entityId}`;
		await this.goto(path);
	}

	/**
	 * Wait for TanStack Router to be ready.
	 * Checks for __tanstack_router__ on window object.
	 */
	async waitForRouterReady(): Promise<void> {
		await this.page.waitForFunction(
			() => {
				return (
					typeof window !== 'undefined' &&
					'__tanstack_router__' in window &&
					window.__tanstack_router__ !== null &&
					window.__tanstack_router__ !== undefined
				);
			},
			{ timeout: 10000 }
		);
	}

	/**
	 * Get the current pathname from the browser location.
	 * @returns Current pathname (e.g., "/authors/A123")
	 */
	async getCurrentPath(): Promise<string> {
		return await this.page.evaluate(() => window.location.pathname);
	}

	/**
	 * Navigate back in browser history.
	 */
	async goBack(): Promise<void> {
		await this.page.goBack();
		await this.waitForRouterReady();
	}

	/**
	 * Navigate forward in browser history.
	 */
	async goForward(): Promise<void> {
		await this.page.goForward();
		await this.waitForRouterReady();
	}

	/**
	 * Wait for navigation to complete with optional timeout.
	 * Uses deterministic wait for router ready state.
	 * @param timeout - Optional timeout in milliseconds (default: 10000)
	 */
	async waitForNavigation(timeout = 10000): Promise<void> {
		await this.page.waitForFunction(
			() => {
				// Check router is ready and document is in ready state
				return (
					typeof window !== 'undefined' &&
					'__tanstack_router__' in window &&
					window.__tanstack_router__ !== null &&
					document.readyState === 'complete'
				);
			},
			{ timeout }
		);
	}
}

/**
 * Singleton pattern factory for NavigationHelper.
 * Usage: const nav = navigationHelper(page);
 */
export const navigationHelper = (page: Page): NavigationHelper =>
	new NavigationHelper(page);
