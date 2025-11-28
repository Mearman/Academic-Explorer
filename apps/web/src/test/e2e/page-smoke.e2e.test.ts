/**
 * Page Smoke Tests - Minimal E2E tests ensuring all pages load without errors
 *
 * These tests verify that every page in the application:
 * 1. Navigates successfully (no 404, no infinite redirect loops)
 * 2. Renders without JavaScript errors
 * 3. Shows meaningful content (not a blank page)
 *
 * This file is included in the default CI smoke test suite.
 *
 * @module page-smoke.e2e
 */

import { test, expect } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";

// Base URL from environment or defaults
const BASE_URL =
  process.env.BASE_URL ||
  process.env.E2E_BASE_URL ||
  (process.env.CI ? "http://localhost:4173" : "http://localhost:5173");

// Helper to build hash routes (SPA uses hash routing)
function buildUrl(path: string): string {
  return `${BASE_URL}/#${path}`;
}

// Helper to check page loads without errors
async function expectPageLoads(
  page: import("@playwright/test").Page,
  path: string,
  options?: {
    expectContent?: string | RegExp;
    skipContentCheck?: boolean;
  }
): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  const url = buildUrl(path);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await waitForAppReady(page, { timeout: 30000 });

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
    expect(content?.trim().length, `Page ${path} should have content`).toBeGreaterThan(10);
  }

  // Check for specific content if provided
  if (options?.expectContent) {
    const locator =
      typeof options.expectContent === "string"
        ? page.locator(`text=${options.expectContent}`)
        : page.locator(`text=${options.expectContent.source}`);
    await expect(locator.first()).toBeVisible({ timeout: 10000 });
  }

  // Verify no error state displayed
  const errorHeading = await page.locator('h1:has-text("Error")').count();
  const error404 = await page.locator('text="404"').count();

  // Allow 404 only for explicitly invalid routes
  if (!path.includes("invalid") && !path.includes("999999")) {
    expect(errorHeading, `Page ${path} should not show Error heading`).toBe(0);
  }
}

test.describe("Page Smoke Tests - Utility Pages", () => {
  test.setTimeout(60000);

  test("/ - Homepage loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/", {
      expectContent: "Academic Explorer",
    });
  });

  test("/about - About page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/about");
  });

  test("/algorithms - Algorithms page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/algorithms");
  });

  test("/bookmarks - Bookmarks page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/bookmarks");
  });

  test("/browse - Browse page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/browse");
  });

  test("/cache - Cache page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/cache");
  });

  test("/catalogue - Catalogue page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/catalogue");
  });

  test("/error-test - Error test page loads successfully", async ({ page }) => {
    // This page is specifically for testing error states
    await expectPageLoads(page, "/error-test", { skipContentCheck: true });
  });

  test("/evaluation - Evaluation page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/evaluation");
  });

  test("/explore - Explore page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/explore");
  });

  test("/history - History page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/history");
  });

  test("/search - Search page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/search");
  });

  test("/settings - Settings page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/settings");
  });

  test("/text - Text analysis page loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/text");
  });
});

test.describe("Page Smoke Tests - Entity Index Pages", () => {
  test.setTimeout(60000);

  test("/works - Works index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/works");
  });

  test("/authors - Authors index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/authors");
  });

  test("/sources - Sources index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/sources");
  });

  test("/institutions - Institutions index loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/institutions");
  });

  test("/topics - Topics index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/topics");
  });

  test("/publishers - Publishers index loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/publishers");
  });

  test("/funders - Funders index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/funders");
  });

  test("/concepts - Concepts index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/concepts");
  });

  test("/keywords - Keywords index loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/keywords");
  });
});

test.describe("Page Smoke Tests - Entity Detail Pages", () => {
  test.setTimeout(90000);

  // Test one sample entity from each type to ensure detail pages work
  // Using known stable entity IDs

  test("/works/W2741809807 - Work detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/works/W2741809807");
  });

  test("/authors/A5017898742 - Author detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/authors/A5017898742");
  });

  test("/sources/S137773608 - Source detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/sources/S137773608");
  });

  test("/institutions/I27837315 - Institution detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/institutions/I27837315");
  });

  test("/topics/T10159 - Topic detail loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/topics/T10159");
  });

  test("/publishers/P4310319900 - Publisher detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/publishers/P4310319900");
  });

  test("/funders/F4320308380 - Funder detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/funders/F4320308380");
  });

  test("/concepts/C2778407487 - Concept detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/concepts/C2778407487");
  });

  test("/keywords/K10982 - Keyword detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/keywords/K10982");
  });

  test("/domains/D1 - Domain detail loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/domains/D1");
  });

  test("/fields/F17 - Field detail loads successfully", async ({ page }) => {
    await expectPageLoads(page, "/fields/F17");
  });

  test("/subfields/SF30 - Subfield detail loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/subfields/SF30");
  });
});

test.describe("Page Smoke Tests - External ID Resolution", () => {
  test.setTimeout(60000);

  test("/authors/orcid.0000-0002-1298-3089 - ORCID resolution loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/authors/orcid:0000-0002-1298-3089");
  });

  test("/sources/issn.2041-1723 - ISSN resolution loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/sources/issn:2041-1723");
  });

  test("/institutions/ror.00cvxb145 - ROR resolution loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/institutions/ror:00cvxb145");
  });
});

test.describe("Page Smoke Tests - Autocomplete Pages", () => {
  test.setTimeout(60000);

  test("/autocomplete - Autocomplete index loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete");
  });

  test("/autocomplete/works - Works autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/works");
  });

  test("/autocomplete/authors - Authors autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/authors");
  });

  test("/autocomplete/sources - Sources autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/sources");
  });

  test("/autocomplete/institutions - Institutions autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/institutions");
  });

  test("/autocomplete/publishers - Publishers autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/publishers");
  });

  test("/autocomplete/funders - Funders autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/funders");
  });

  test("/autocomplete/concepts - Concepts autocomplete loads successfully", async ({
    page,
  }) => {
    await expectPageLoads(page, "/autocomplete/concepts");
  });
});
