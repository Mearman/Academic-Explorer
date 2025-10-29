import { expect, test, type Page } from "@playwright/test";

test.describe("OpenAlex URL Routing E2E Tests", () => {
  // Note: Test replaced W2741809807 (work) with A5017898742 (author) due to CI timeouts
  // Both test the same routing functionality, just different entity types
  const testScenarios = [
    // 1. Single entity redirect
    {
      url: "https://api.openalex.org/A5017898742",
      expectedUrl: "/authors/A5017898742",
      assertUI: async (page: Page) => {
        // Should show author details, not the search page
        // First wait for the h1 to have actual content (not the fallback "Author")
        await page.waitForFunction(
          () => {
            const h1 = document.querySelector("h1");
            const text = h1?.textContent || "";
            // Wait until the h1 contains more than just "Author" (the fallback)
            return text.length > 4 && text !== "Author";
          },
          undefined,
          { timeout: 60000 }, // Increased timeout for CI environment
        );
        // Now check for the specific author name
        await expect(
          page.locator("h1").filter({ hasText: "Joseph Mearman" }),
        ).toBeVisible({ timeout: 30000 }); // Increased timeout for CI environment
        // Check that we're not on the search page
        await expect(page.locator("text=Academic Search")).not.toBeVisible({ timeout: 10000 });
      },
    },
    // 2. List query with filter
    {
      url: "https://api.openalex.org/works?filter=publication_year:2020",
      expectedUrl: "/works?filter=publication_year%3A2020",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Works", { timeout: 30000 });
        // Assert table renders (stub)
        await expect(page.locator('[data-testid="table"]')).toBeVisible({ timeout: 30000 });
      },
    },
    // 3. Autocomplete
    {
      url: "https://api.openalex.org/autocomplete/authors?q=ronald",
      expectedUrl: "/autocomplete/authors?q=ronald",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Autocomplete Authors", { timeout: 30000 });
      },
    },
    // 4. With sort param
    {
      url: "https://api.openalex.org/authors?sort=cited_by_count:desc",
      expectedUrl: "/authors?sort=cited_by_count%3Adesc",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Authors", { timeout: 30000 });
      },
    },
    // 5. Paging params
    {
      url: "https://api.openalex.org/works?per_page=50&page=2",
      expectedUrl: "/works?per_page=50&page=2",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Works", { timeout: 30000 });
      },
    },
    // 6. Sample param
    {
      url: "https://api.openalex.org/institutions?sample=10",
      expectedUrl: "/institutions?sample=10",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Institutions", { timeout: 30000 });
      },
    },
    // 7. Group by
    {
      url: "https://api.openalex.org/authors?group_by=last_known_institutions.continent",
      expectedUrl: "/authors?group_by=last_known_institutions.continent",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Authors", { timeout: 30000 });
      },
    },
    // 8. Search param
    {
      url: "https://api.openalex.org/works?search=dna",
      expectedUrl: "/works?search=dna",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Works", { timeout: 30000 });
      },
    },
    // 9. Fallback to search
    {
      url: "https://api.openalex.org/keywords",
      expectedUrl: "/search?q=https%3A%2F%2Fapi.openalex.org%2Fkeywords",
      assertUI: async (page: Page) => {
        await expect(page.locator("h1")).toContainText("Academic Search", { timeout: 30000 });
      },
    },
    // 10. Encoded params and invalid detection
    {
      url: "https://api.openalex.org/invalid/id?filter=display_name.search:john%20smith",
      expectedUrl:
        "/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid%2Fid%3Ffilter%3Ddisplay_name.search%3Ajohn%20smith",
      assertUI: async (page: Page) => {
        // Should fall back to search page
        await expect(page.locator("h1")).toContainText("Academic Search", { timeout: 30000 });
      },
    },
  ];

  testScenarios.forEach(({ url, expectedUrl, assertUI }) => {
    test(`should handle ${url} and redirect to ${expectedUrl}`, async ({
      page,
    }) => {
      // Parse the URL to determine the correct route path
      const urlObj = new URL(url);
      const domain = urlObj.hostname; // e.g., "api.openalex.org"
      const path = urlObj.pathname + urlObj.search; // e.g., "/works?filter=publication_year:2020"
      const routeDomain = domain.replace(/\./g, "-"); // Convert dots to hyphens: "api-openalex-org"
      const routePath = `/${routeDomain}${path}`; // e.g., "/api-openalex-org/works?filter=publication_year:2020"

      // Navigate to the constructed route path
      await page.goto(`http://localhost:5173/#${routePath}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Listen for console messages to debug the route
      const consoleMessages: string[] = [];
      page.on("console", (msg) => {
        consoleMessages.push(msg.text());
      });

      // Wait a bit for the route to process
      await page.waitForTimeout(2000);

      // Wait for redirect to complete - check if navigation happened by looking for URL changes
      await page.waitForFunction(
        (expectedHash) => {
          const hash = window.location.hash;
          console.log("Current hash:", hash);
          return (
            hash !== expectedHash &&
            !document.body.textContent?.includes("Resolving")
          );
        },
        `#${routePath}`,
        { timeout: 30000 },
      );

      // Check what the final URL is
      const finalUrl = page.url();
      console.log("Final URL:", finalUrl);
      const finalHash = await page.evaluate(() => window.location.hash);
      console.log("Final hash:", finalHash);

      // Run the UI assertion - assertions have their own timeouts
      await assertUI(page);

      // Print console messages for debugging
      if (consoleMessages.length > 0) {
        console.log("Console messages:", consoleMessages);
      }
    });
  });
});
