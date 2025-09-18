/**
 * Accessibility testing utilities
 * Provides helpers for testing accessibility in components and E2E tests
 */

import { axe } from "vitest-axe";
import type { RenderResult } from "@testing-library/react";
import type { Page } from "@playwright/test";
import type { AxeResults, RunOptions } from "axe-core";

// Note: vitest-axe matchers are extended globally via setup.ts

/**
 * Common axe configuration for consistent testing
 * Follows WCAG 2.1 AA standards
 */
export const axeConfig: RunOptions = {
  rules: {
    // Enable all WCAG 2.1 AA rules
    "color-contrast": { enabled: true },
    "keyboard-navigation": { enabled: true },
    "focus-management": { enabled: true },

    // Disable rules that may not apply to our context
    "region": { enabled: false }, // Main content regions may vary
    "page-has-heading-one": { enabled: false }, // SPA routing may not always have h1

    // Enable experimental rules for better coverage
    "color-contrast-enhanced": { enabled: true },
    "focus-order-semantics": { enabled: true },
  },
  tags: ["wcag2a", "wcag2aa", "wcag21aa"],
};

/**
 * Test a React component for accessibility violations
 * @param renderResult - The result from render() function
 * @param config - Optional axe configuration override
 */
export async function testComponentAccessibility(
  renderResult: RenderResult,
  config: RunOptions = axeConfig
): Promise<void> {
  const results = await axe(renderResult.container, config);
  (expect as unknown as { (actual: unknown): { toHaveNoViolations: () => void } })(results).toHaveNoViolations();
}

/**
 * Test a full page for accessibility violations using Playwright
 * @param page - Playwright page object
 * @param config - Optional axe configuration override
 */
export async function testPageAccessibility(
  page: Page,
  config: RunOptions = axeConfig
): Promise<void> {
  // Import axe-core in the page context
  await page.addScriptTag({
    url: "https://unpkg.com/axe-core@4.10.3/axe.min.js",
  });

  // Run axe accessibility scan
  const results = await page.evaluate(async (axeConfig) => {
    // @ts-expect-error axe is loaded globally from external script
    return await (globalThis as { axe: { run: (element: Document, config: unknown) => Promise<AxeResults> } }).axe.run(document, axeConfig);
  }, config);

  // Check for violations
  if (results.violations.length > 0) {
    const violationMessages = results.violations.map(
      (violation) => {
        const nodeMessages = violation.nodes.map((node) => node.html).join("\n  ");
        return `${violation.id}: ${violation.description}\n  ${nodeMessages}`;
      }
    ).join("\n\n");

    throw new Error(`Accessibility violations found:\n\n${violationMessages}`);
  }
}

/**
 * Test specific element accessibility
 * @param element - DOM element to test
 * @param config - Optional axe configuration override
 */
export async function testElementAccessibility(
  element: Element,
  config: RunOptions = axeConfig
): Promise<void> {
  const results = await axe(element, config);
  (expect as unknown as { (actual: unknown): { toHaveNoViolations: () => void } })(results).toHaveNoViolations();
}

/**
 * Custom accessibility test for dynamic content
 * Waits for content to be rendered before testing
 * @param renderResult - The result from render() function
 * @param selector - CSS selector to wait for
 * @param config - Optional axe configuration override
 */
export async function testDynamicContentAccessibility(
  renderResult: RenderResult,
  selector: string,
  config: RunOptions = axeConfig
): Promise<void> {
  // Wait for dynamic content to load
  await renderResult.findByTestId(selector.replace("[data-testid=\"", "").replace("\"]", ""));

  const results = await axe(renderResult.container, config);
  (expect as unknown as { (actual: unknown): { toHaveNoViolations: () => void } })(results).toHaveNoViolations();
}

/**
 * Test keyboard navigation accessibility
 * @param element - Element to test keyboard navigation on
 */
export function testKeyboardNavigation(element: Element): void {
  const focusableElements = element.querySelectorAll(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
  );

  focusableElements.forEach((el) => {
    const htmlElement = el as HTMLElement;
    expect(htmlElement.tabIndex).toBeGreaterThanOrEqual(0);
  });
}

/**
 * Test ARIA labels and descriptions
 * @param element - Element to test
 */
export function testAriaLabeling(element: Element): void {
  const interactiveElements = element.querySelectorAll(
    "button, [role=\"button\"], input, select, textarea, a[href]"
  );

  interactiveElements.forEach((el) => {
    const hasAriaLabel = el.hasAttribute("aria-label");
    const hasAriaLabelledBy = el.hasAttribute("aria-labelledby");
    const hasAriaDescribedBy = el.hasAttribute("aria-describedby");
    const hasVisibleText = (el.textContent?.trim().length ?? 0) > 0;

    expect(
      hasAriaLabel || hasAriaLabelledBy || hasAriaDescribedBy || hasVisibleText
    ).toBe(true);
  });
}

/**
 * Color contrast testing configuration for different contexts
 */
export const colorContrastConfig = {
  normal: {
    ...axeConfig,
    rules: {
      ...axeConfig.rules,
      "color-contrast": { enabled: true },
    },
  },
  enhanced: {
    ...axeConfig,
    rules: {
      ...axeConfig.rules,
      "color-contrast-enhanced": { enabled: true },
    },
  },
};

/**
 * Form accessibility testing helper
 * @param form - Form element to test
 */
export async function testFormAccessibility(form: Element): Promise<void> {
  // Test form-specific accessibility
  const formConfig: RunOptions = {
    ...axeConfig,
    rules: {
      ...axeConfig.rules,
      "label": { enabled: true },
      "form-field-multiple-labels": { enabled: true },
      "required-attr": { enabled: true },
    },
  };

  const results = await axe(form, formConfig);
  (expect as unknown as { (actual: unknown): { toHaveNoViolations: () => void } })(results).toHaveNoViolations();
}