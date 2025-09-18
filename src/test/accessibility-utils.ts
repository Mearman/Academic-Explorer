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
 * Type guard to check if an object has violations property
 */
function hasViolationsProperty(obj: object): obj is { violations: unknown } {
  return "violations" in obj;
}

/**
 * Type guard to check if a value is a record (object with string keys)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if data structure matches AxeResults
 */
function isAxeResults(data: unknown): data is AxeResults {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  // Check if it has violations property
  if (!hasViolationsProperty(data)) {
    return false;
  }

  const violationsValue = data.violations;
  if (!Array.isArray(violationsValue)) {
    return false;
  }

  // Validate violations structure
  for (const violation of violationsValue) {
    // Use type guard to check if violation is a valid record
    if (!isRecord(violation)) {
      return false;
    }

    // Check if violation has required properties
    if (!("id" in violation) || !("description" in violation) || !("nodes" in violation)) {
      return false;
    }

    // Access properties safely - TypeScript knows violation is Record<string, unknown>
    const id = violation.id;
    const description = violation.description;
    const nodes = violation.nodes;

    // Validate that all required properties exist and have correct types
    if (typeof id !== "string") {
      return false;
    }

    if (typeof description !== "string") {
      return false;
    }

    if (!Array.isArray(nodes)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates and safely converts unknown data to AxeResults
 * @param data - Unknown data from browser context
 * @returns Validated AxeResults
 */
function validateAxeResults(data: unknown): AxeResults {
  if (!isAxeResults(data)) {
    throw new Error("Invalid axe results structure");
  }
  return data;
}

/**
 * Type-safe wrapper for accessibility assertions
 * Handles the vitest-axe extension properly
 */
function assertNoA11yViolations(results: AxeResults): void {
  if (results.violations.length > 0) {
    const violationMessages = results.violations.map(
      (violation) => {
        const nodeMessages = violation.nodes.map((node) => {
          return typeof node.html === "string" ? node.html : String(node.html);
        }).join("\n  ");
        const violationId = typeof violation.id === "string" ? violation.id : String(violation.id);
        const violationDesc = typeof violation.description === "string" ? violation.description : String(violation.description);
        return `${violationId}: ${violationDesc}\n  ${nodeMessages}`;
      }
    ).join("\n\n");

    throw new Error(`Accessibility violations found:\n\n${violationMessages}`);
  }
}

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
  assertNoA11yViolations(results);
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

  // Run axe accessibility scan using string-based evaluation to avoid type issues
  const configString = JSON.stringify(config);
  const evaluationScript = `
    (async function() {
      if (typeof window.axe === 'undefined') {
        throw new Error('Axe-core is not loaded in the page context');
      }
      const axeConfig = ${configString};
      const results = await window.axe.run(document, axeConfig);
      return JSON.stringify(results);
    })()
  `;

  const rawResultsString: string = await page.evaluate(evaluationScript);
  const rawResults: unknown = JSON.parse(rawResultsString);

  // Validate the results
  const results = validateAxeResults(rawResults);

  // Check for violations
  if (results.violations.length > 0) {
    const violationMessages = results.violations.map(
      (violation) => {
        const nodeMessages = violation.nodes.map((node) => {
          return typeof node.html === "string" ? node.html : String(node.html);
        }).join("\n  ");
        const violationId = typeof violation.id === "string" ? violation.id : String(violation.id);
        const violationDesc = typeof violation.description === "string" ? violation.description : String(violation.description);
        return `${violationId}: ${violationDesc}\n  ${nodeMessages}`;
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
  assertNoA11yViolations(results);
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
  assertNoA11yViolations(results);
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
    if (el instanceof HTMLElement) {
      expect(el.tabIndex).toBeGreaterThanOrEqual(0);
    }
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
  assertNoA11yViolations(results);
}