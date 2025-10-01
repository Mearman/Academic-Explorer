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
      expectedUrl: "/works?filter=publication_year:2020",
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
      expectedUrl: "/authors?sort=cited_by_count:desc",
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
        await expect(page.locator("h1")).toContainText("Search");
      },
    },
    // 10. Encoded params and invalid detection
    {
      url: "https://api.openalex.org/invalid/id?filter=display_name.search:john%20smith",
      expectedUrl:
        "/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid%2Fid%3Ffilter%3Ddisplay_name.search%3Ajohn%2520smith",
      assertUI: async (page) => {
        await expect(page.locator("h1")).toContainText("Search");
      },
    },
  ];

  testScenarios.forEach(({ url, expectedUrl, assertUI }) => {
    it(`should handle ${url} and redirect to ${expectedUrl}`, async () => {
      // Navigate to the openalex-url route with the encoded OpenAlex URL
      const encodedUrl = encodeURIComponent(url);
      await e2ePage.goto(`/#/openalex-url/${encodedUrl}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for redirect to complete - check the hash part of the URL
      await e2ePage.waitForFunction(
        (expectedUrl) => {
          const hash = window.location.hash;
          return hash === `#${expectedUrl}` || hash.startsWith(`#${expectedUrl}`);
        },
        expectedUrl,
        { timeout: 10000 }
      );

      // Run the UI assertion
      await assertUI(e2ePage);
    });
  });

    // Check initial hash after navigation
    const initialHash = await e2ePage.evaluate(() => window.location.hash);
    console.log("Initial hash after navigation:", initialHash);

    // Wait a bit for any redirects to happen
    await e2ePage.waitForTimeout(2000);

    // Check hash after waiting
    const finalHash = await e2ePage.evaluate(() => window.location.hash);
    console.log(
      "Final hash after waiting:",
      finalHash,
      "Expected:",
      `#${expectedUrl}`,
    );

    // Check if redirect happened
    if (finalHash !== `#${expectedUrl}`) {
      console.log("Redirect did not happen as expected");
      // Let's see what the page content shows
      const pageTitle = await e2ePage.title();
      console.log("Page title:", pageTitle);
      const h1Text = await e2ePage.locator("h1").first().textContent();
      console.log("H1 text:", h1Text);
    }

    // Wait for redirect to complete - check the hash part of the URL
    await e2ePage.waitForFunction(
      (expectedUrl) => {
        const hash = window.location.hash;
        console.log(
          "Current hash in waitForFunction:",
          hash,
          "Expected:",
          `#${expectedUrl}`,
        );
        return hash === `#${expectedUrl}` || hash.startsWith(`#${expectedUrl}`);
      },
      expectedUrl,
      { timeout: 10000 },
    );

    // Run the UI assertion
    await assertUI(e2ePage);
  });
});
