import { describe, it } from "vitest";
import type { Page } from "@playwright/test";

declare const e2ePage: Page;

describe("OpenAlex URL Routing E2E Tests", () => {
  const testScenarios = [
    // 1. Single entity redirect
    {
      url: "https://api.openalex.org/W2741809807",
      expectedUrl: "/works/W2741809807",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Work");
      },
    },
    // 2. List query with filter
    {
      url: "https://api.openalex.org/works?filter=publication_year:2020",
      expectedUrl: "/works?filter=publication_year%3A2020",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Works");
        // Assert table renders (stub)
        await expect(page.locator('[data-testid="table"]')).toBeVisible();
      },
    },
    // 3. Autocomplete
    {
      url: "https://api.openalex.org/autocomplete/authors?q=ronald",
      expectedUrl: "/autocomplete/authors?q=ronald",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Autocomplete Authors");
      },
    },
    // 4. With sort param
    {
      url: "https://api.openalex.org/authors?sort=cited_by_count:desc",
      expectedUrl: "/authors?sort=cited_by_count%3Adesc",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Authors");
      },
    },
    // 5. Paging params
    {
      url: "https://api.openalex.org/works?per_page=50&page=2",
      expectedUrl: "/works?per_page=50&page=2",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Works");
      },
    },
    // 6. Sample param
    {
      url: "https://api.openalex.org/institutions?sample=10",
      expectedUrl: "/institutions?sample=10",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Institutions");
      },
    },
    // 7. Group by
    {
      url: "https://api.openalex.org/authors?group_by=last_known_institutions.continent",
      expectedUrl: "/authors?group_by=last_known_institutions.continent",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Authors");
      },
    },
    // 8. Search param
    {
      url: "https://api.openalex.org/works?search=dna",
      expectedUrl: "/works?search=dna",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Works");
      },
    },
    // 9. Fallback to search
    {
      url: "https://api.openalex.org/keywords",
      expectedUrl: "/search?q=https%3A%2F%2Fapi.openalex.org%2Fkeywords",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Academic Search");
      },
    },
    // 10. Encoded params and invalid detection
    {
      url: "https://api.openalex.org/invalid/id?filter=display_name.search:john%20smith",
      expectedUrl: "/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid%2Fid%3Ffilter%3Ddisplay_name.search%3Ajohn%20smith",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Academic Search");
      },
    },
  ];

  testScenarios.forEach(({ url, expectedUrl, assertUI }) => {
    it(`should handle ${url} and redirect to ${expectedUrl}`, async () => {
      // Navigate to the openalex-url route with the encoded OpenAlex URL
      const encodedUrl = encodeURIComponent(url);
      await e2ePage.goto(`/#/openalex-url/${encodedUrl}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for redirect to complete - check the hash part of the URL
      // Compare paths and decoded query params to handle encoding variations
      await e2ePage.waitForFunction(
        (expectedUrl) => {
          const currentPath = window.location.hash.slice(1);
          if (currentPath === expectedUrl) return true;

          try {
            // Helper to parse path and decode params
            const parsePath = (path) => {
              const url = new URL('http://dummy' + (path.startsWith('/') ? path : '/' + path), 'http://dummy');
              const params = {};
              url.searchParams.forEach((value, key) => {
                params[key] = decodeURIComponent(value);
              });
              return {
                pathname: url.pathname,
                params: params
              };
            };

            const current = parsePath(currentPath);
            const expected = parsePath(expectedUrl);

            if (current.pathname !== expected.pathname) return false;

            // Compare decoded params
            return JSON.stringify(current.params) === JSON.stringify(expected.params);
          } catch (e) {
            return false;
          }
        },
        expectedUrl,
        { timeout: 15000 },
      );

      // Run the UI assertion
      await assertUI(e2ePage);
    });
  });
});
