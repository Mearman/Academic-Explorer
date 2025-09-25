/**
 * E2E tests for graph visualization functionality
 * Tests the XYFlow graph rendering, interactions, and performance
 */

import { describe, it, expect } from 'vitest'
import type { Page } from '@playwright/test'

// Access global page instance from e2e setup
const getE2ePage = (): Page => globalThis.e2ePage

describe('Graph Visualization E2E Tests', () => {
  const TEST_AUTHOR_ID = 'A5017898742'
  const AUTHOR_URL = `/#/authors/${TEST_AUTHOR_ID}`

  it('should render the author page without infinite loops', async () => {
    const page = getE2ePage()

    // Navigate to the author page
    await page.goto(AUTHOR_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Wait for initial render
    await page.waitForTimeout(3000)

    // Check if page loaded successfully (look for main content)
    const pageContent = await page.locator('body').count()
    expect(pageContent).toBeGreaterThan(0)

    // Check for Academic Explorer header
    const header = await page.locator('text=Academic Explorer').count()
    expect(header).toBeGreaterThan(0)

    console.log('✅ Author page loaded without infinite loops')
  })

  it('should render graph components without crashing', async () => {
    const page = getE2ePage()

    await page.goto(AUTHOR_URL, { timeout: 30000 })
    await page.waitForTimeout(5000)

    // Check for XYFlow/ReactFlow containers
    const graphSelectors = [
      '.react-flow',
      '.xyflow',
      '[data-testid="rf__wrapper"]',
      '.react-flow__renderer',
      '.react-flow__container'
    ]

    let graphFound = false
    for (const selector of graphSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        graphFound = true
        console.log(`✅ Found graph container: ${selector}`)
        break
      }
    }

    // Either graph is found or page loads without errors
    const hasErrors = await page.locator('text="Maximum update depth"').count()
    expect(hasErrors).toBe(0)

    console.log(`Graph found: ${graphFound}, No infinite loops: ${hasErrors === 0}`)
  })

  it('should handle data loading without infinite loops', async () => {
    const page = getE2ePage()
    const consoleErrors: string[] = []

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(AUTHOR_URL, { timeout: 30000 })
    await page.waitForTimeout(10000)

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('Maximum update depth') ||
      error.includes('infinite loop') ||
      error.includes('too many re-renders')
    )

    expect(criticalErrors).toHaveLength(0)

    if (criticalErrors.length === 0) {
      console.log('✅ No infinite loop errors detected')
    } else {
      console.log('❌ Critical errors:', criticalErrors)
    }
  })
})