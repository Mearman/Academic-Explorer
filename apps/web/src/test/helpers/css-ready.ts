/**
 * CSS Loading Helpers
 *
 * Utilities to wait for CSS and Mantine styles to be fully loaded and applied.
 * Addresses timing issues in CI environments where styles load asynchronously.
 */

import type { Page } from "@playwright/test";

/**
 * Wait for Mantine CSS to be fully loaded and applied
 * This fixes issues where element size/visibility checks fail before styles are loaded
 */
export const waitForMantineStyles = async (page: Page, timeout = 15_000): Promise<void> => {
  await page.waitForFunction(() => {
    // Create a test element with Mantine class
    const testElement = document.createElement('div');
    testElement.className = 'mantine-Text-root';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.pointerEvents = 'none';
    document.body.append(testElement);

    // Check if Mantine styles are applied by verifying computed styles
    const computedStyle = getComputedStyle(testElement);
    const hasMantineStyles = computedStyle.fontFamily !== 'initial' &&
                             computedStyle.fontFamily !== '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif';

    testElement.remove();
    return hasMantineStyles;
  }, { timeout });
};

/**
 * Wait for CSS to be fully loaded using the existing BasePageObject approach
 * This provides a more reliable CSS load detection than simple timeouts
 */
export const waitForStylesApplied = async (page: Page, timeout = 15_000): Promise<void> => {
  await page.waitForFunction(() => {
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.pointerEvents = 'none';
    document.body.append(testElement);

    const computedStyle = getComputedStyle(testElement);
    const stylesLoaded = computedStyle && computedStyle.position === 'absolute';

    testElement.remove();
    return stylesLoaded;
  }, { timeout });

  // Additional wait for Mantine styles to settle
  await page.waitForTimeout(200);
};

/**
 * Wait for app to be ready including CSS and basic element detection
 * Combines CSS loading with basic app readiness checks
 */
export const waitForAppReady = async (page: Page, timeout = 20_000): Promise<void> => {
  // Wait for root element to be present
  await page.waitForSelector('#root', { timeout });

  // Wait for CSS to be applied
  await waitForStylesApplied(page, timeout);

  // Wait for Mantine styles specifically
  await waitForMantineStyles(page, timeout);
};

/**
 * Enhanced wait for element that also ensures CSS is loaded
 * Useful for elements that need correct styling for size/visibility checks
 */
export const waitForVisibleElement = async (
  page: Page,
  selector: string,
  options: { timeout?: number; ensureCSS?: boolean } = {}
): Promise<void> => {
  const { timeout = 15_000, ensureCSS = true } = options;

  if (ensureCSS) {
    // Ensure CSS is loaded before checking element visibility
    await waitForMantineStyles(page, timeout);
  }

  await page.waitForSelector(selector, {
    state: 'visible',
    timeout
  });
};