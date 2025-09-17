/**
 * Basic E2E setup verification test
 * Tests that the E2E infrastructure is working correctly
 */

import { test, expect as vitestExpect, describe } from "vitest"
import { expect as playwrightExpect } from "@playwright/test"
import type { Page } from "@playwright/test"

// Access global page instance
const getPage = (): Page => globalThis.e2ePage

describe("E2E Setup Verification", () => {
  test("should have browser page available", async () => {
    const page = getPage()
    vitestExpect(page).toBeDefined()
    vitestExpect(typeof page.goto).toBe('function')
  })

  test("should be able to navigate to data URL", async () => {
    const page = getPage()

    // Create a simple HTML page as data URL
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <div data-testid="test-content">Hello E2E World!</div>
        </body>
      </html>
    `

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`

    await page.goto(dataUrl)

    // Verify content is loaded
    const testElement = page.locator('[data-testid="test-content"]')
    await playwrightExpect(testElement).toBeVisible()
    await playwrightExpect(testElement).toHaveText('Hello E2E World!')
  })

  test("should be able to mock network requests", async () => {
    const page = getPage()

    // Set up route mock for absolute URL
    await page.route('**/test-api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'mocked response' })
      })
    })

    // Create page that makes a request to absolute URL
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="result">Loading...</div>
          <script>
            fetch('https://example.com/test-api/data')
              .then(r => r.json())
              .then(data => {
                document.getElementById('result').textContent = data.message;
              })
              .catch(err => {
                document.getElementById('result').textContent = 'Error: ' + err.message;
              });
          </script>
        </body>
      </html>
    `

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    await page.goto(dataUrl)

    // Wait for the mocked response
    await page.waitForFunction(() => {
      const result = document.getElementById('result');
      return result && result.textContent === 'mocked response';
    }, { timeout: 5000 })

    const result = page.locator('#result')
    await playwrightExpect(result).toHaveText('mocked response')
  })

  test("should handle timeouts gracefully", async () => {
    const page = getPage()

    // This should complete quickly and not timeout
    const startTime = Date.now()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body><div id="fast">Fast content</div></body>
      </html>
    `

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    await page.goto(dataUrl)

    await page.locator('#fast').waitFor({ timeout: 1000 })

    const elapsed = Date.now() - startTime
    vitestExpect(elapsed).toBeLessThan(2000) // Should be much faster than timeout
  })
})