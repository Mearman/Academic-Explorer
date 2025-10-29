/**
 * Debug test to check what's actually on the homepage
 */

import { expect, test } from "@playwright/test";

test.describe("Debug Homepage", () => {
  test("should log page content and check for errors", async ({ page }) => {
    const errors: string[] = [];
    const consoleMessages: string[] = [];

    // Listen for errors and console messages
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    page.on("console", (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto("http://localhost:5173/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait a bit for React to potentially mount
    await page.waitForTimeout(2000);

    // Log the page title
    const title = await page.title();
    console.log("Page title:", title);

    // Check if root element exists
    const rootElement = await page.locator("#root").count();
    console.log("Root element count:", rootElement);

    // Check if root has content
    if (rootElement > 0) {
      const rootContent = await page.locator("#root").textContent();
      console.log("Root content length:", rootContent?.length);
      console.log("Root content preview:", rootContent?.substring(0, 200));
    }

    // Log all text content
    const allText = await page.locator("body").textContent();
    console.log("All body text content length:", allText?.length);
    console.log("All body text content preview:", allText?.substring(0, 500));

    // Log all h1 elements
    const h1Elements = await page.locator("h1").allTextContents();
    console.log("H1 elements:", h1Elements);

    // Check if Academic Explorer text exists anywhere
    const academicExplorerText = await page
      .locator("text=Academic Explorer")
      .count();
    console.log("Academic Explorer text count:", academicExplorerText);

    // Check for header
    const header = await page.locator("header").count();
    console.log("Header count:", header);

    // Check for any React root content
    const reactContent = await page
      .locator("[data-reactroot], [data-react-helmet]")
      .count();
    console.log("React content indicators:", reactContent);

    // Log errors
    console.log("JavaScript errors:", errors);
    console.log("Console messages count:", consoleMessages.length);
    console.log("Recent console messages:", consoleMessages.slice(-5));

    // Take a screenshot for debugging
    await page.screenshot({ path: "debug-homepage.png", fullPage: true });

    // Basic assertion - page should load without JS errors
    expect(errors.length).toBe(0);
    expect(title).toBe("Academic Explorer");
  });
});
