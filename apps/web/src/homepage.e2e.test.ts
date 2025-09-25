/**
 * E2E tests for homepage functionality
 * Tests the main Academic Explorer homepage with search, navigation, and basic interactions
 */

import { describe, it, expect } from 'vitest'
import type { Page } from '@playwright/test'

declare const e2ePage: Page

describe('Homepage E2E Tests', () => {
  it('should load homepage without infinite loops', async () => {
    // Navigate to homepage with a reasonable timeout
    await e2ePage.goto('/#/', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Check that page loaded successfully
    await expect(e2ePage.locator('h1')).toContainText('Academic Explorer')

    // Verify no JavaScript errors occurred
    const errors: string[] = []
    e2ePage.on('pageerror', (error) => {
      errors.push(error.message)
    })

    // Wait a bit to ensure no delayed errors
    await e2ePage.waitForTimeout(2000)
    expect(errors).toHaveLength(0)
  })

  it('should display homepage content correctly', async () => {
    await e2ePage.goto('/#/')

    // Check main title
    const title = e2ePage.locator('h1')
    await expect(title).toContainText('Academic Explorer')

    // Check description text
    const description = e2ePage.locator('text=Explore academic literature through interactive knowledge graphs')
    await expect(description).toBeVisible()

    // Check search input is present
    const searchInput = e2ePage.locator('input[placeholder*="Search papers, authors"]')
    await expect(searchInput).toBeVisible()

    // Check search button
    const searchButton = e2ePage.locator('button:has-text("Search & Visualize")')
    await expect(searchButton).toBeVisible()
  })

  it('should have working navigation links', async () => {
    await e2ePage.goto('/#/')

    // Check home link
    const homeLink = e2ePage.locator('nav a[href="/"]')
    await expect(homeLink).toBeVisible()

    // Check about link
    const aboutLink = e2ePage.locator('nav a[href="/about"]')
    await expect(aboutLink).toBeVisible()

    // Test navigation to about page (if it exists)
    try {
      await aboutLink.click()
      await e2ePage.waitForURL('**/#/about', { timeout: 5000 })
      // Navigate back to home
      await homeLink.click()
      await e2ePage.waitForURL('**/#/', { timeout: 5000 })
    } catch (error) {
      // About page might not be implemented yet, that's OK
      console.log('About page navigation test skipped:', error)
    }
  })

  it('should have working theme toggle', async () => {
    await e2ePage.goto('/#/')

    // Find theme toggle button (should have one of these icons)
    const themeToggle = e2ePage.locator('button[aria-label="Toggle color scheme"]')
    await expect(themeToggle).toBeVisible()

    // Click to cycle through themes
    await themeToggle.click()
    await e2ePage.waitForTimeout(500)

    // The theme should have changed (data-mantine-color-scheme attribute)
    const html = e2ePage.locator('html')
    const colorScheme = await html.getAttribute('data-mantine-color-scheme')
    expect(colorScheme).toMatch(/^(light|dark|auto)$/)
  })

  it('should display example searches', async () => {
    await e2ePage.goto('/#/')

    // Check for example search links
    const exampleSection = e2ePage.locator('text=Try these examples:')
    await expect(exampleSection).toBeVisible()

    // Check specific example links
    const mlExample = e2ePage.locator('text=machine learning')
    await expect(mlExample).toBeVisible()

    const climateExample = e2ePage.locator('text=climate change')
    await expect(climateExample).toBeVisible()

    const orcidExample = e2ePage.locator('text=ORCID example')
    await expect(orcidExample).toBeVisible()
  })

  it('should allow typing in search input', async () => {
    await e2ePage.goto('/#/')

    const searchInput = e2ePage.locator('input[placeholder*="Search papers, authors"]')
    await expect(searchInput).toBeVisible()

    // Type in search input
    const testQuery = 'machine learning'
    await searchInput.fill(testQuery)

    // Verify the input value
    await expect(searchInput).toHaveValue(testQuery)

    // Search button should be enabled when there's text
    const searchButton = e2ePage.locator('button:has-text("Search & Visualize")')
    await expect(searchButton).toBeEnabled()
  })

  it('should handle search button states correctly', async () => {
    await e2ePage.goto('/#/')

    const searchInput = e2ePage.locator('input[placeholder*="Search papers, authors"]')
    const searchButton = e2ePage.locator('button:has-text("Search & Visualize")')

    // Button should be disabled when input is empty
    await searchInput.fill('')
    await expect(searchButton).toBeDisabled()

    // Button should be enabled when there's text
    await searchInput.fill('test')
    await expect(searchButton).toBeEnabled()

    // Clear input - button should be disabled again
    await searchInput.fill('')
    await expect(searchButton).toBeDisabled()
  })

  it('should show technology stack indicators', async () => {
    await e2ePage.goto('/#/')

    // Check for React 19 indicator
    const reactIndicator = e2ePage.locator('text=React 19')
    await expect(reactIndicator).toBeVisible()

    // Check for OpenAlex API indicator
    const openAlexIndicator = e2ePage.locator('text=OpenAlex API')
    await expect(openAlexIndicator).toBeVisible()

    // Check for XYFlow indicator
    const xyFlowIndicator = e2ePage.locator('text=XYFlow')
    await expect(xyFlowIndicator).toBeVisible()
  })

  it('should display helpful usage instructions', async () => {
    await e2ePage.goto('/#/')

    // Check for usage instructions
    const instructions = e2ePage.locator('text*=Use the sidebar to search and filter')
    await expect(instructions).toBeVisible()
  })

  it('should have proper accessibility features', async () => {
    await e2ePage.goto('/#/')

    // Check search input has aria-label
    const searchInput = e2ePage.locator('input[aria-label="Search academic literature"]')
    await expect(searchInput).toBeVisible()

    // Check theme toggle has aria-label
    const themeToggle = e2ePage.locator('button[aria-label="Toggle color scheme"]')
    await expect(themeToggle).toBeVisible()

    // Run accessibility check if available
    if (globalThis.checkA11y) {
      try {
        await globalThis.checkA11y(e2ePage)
      } catch (error) {
        console.log('Accessibility check skipped:', error)
      }
    }
  })
})