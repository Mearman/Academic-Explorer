/**
 * E2E Test Helper Utilities
 * 
 * Common utilities for end-to-end testing of the Academic Explorer application.
 */

import type { Page } from 'playwright';
import { expect } from 'vitest';

export interface TestEntity {
  id: string;
  type: 'work' | 'author' | 'institution' | 'source' | 'publisher' | 'concept' | 'topic';
  expectedTitle?: string;
  expectedData?: Record<string, any>;
}

export interface PageLoadAnalysis {
  hasLoadingElements: boolean;
  hasContentElements: boolean;
  networkResponses: string[];
  javascriptErrors: string[];
  loadingDuration: number;
  contentLoadedAt?: number;
}

/**
 * Analyze the loading behavior of an entity page
 */
export async function analyzePageLoading(page: Page, url: string, timeoutMs = 15000): Promise<PageLoadAnalysis> {
  const startTime = Date.now();
  const networkResponses: string[] = [];
  const javascriptErrors: string[] = [];
  
  // Set up monitoring
  page.on('response', (response) => {
    networkResponses.push(`${response.status()} ${response.url()}`);
  });
  
  page.on('pageerror', (error) => {
    javascriptErrors.push(error.message);
  });
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      javascriptErrors.push(msg.text());
    }
  });
  
  // Navigate to the page
  await page.goto(url, { waitUntil: 'networkidle' });
  
  let contentLoadedAt: number | undefined;
  let hasLoadingElements = false;
  let hasContentElements = false;
  
  // Poll for content loading with timeout
  const pollInterval = 500;
  const maxAttempts = Math.floor(timeoutMs / pollInterval);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.waitForTimeout(pollInterval);
    
    // Check for loading elements
    const loadingCount = await page.locator('.animate-pulse, [data-loading], [class*="loading"], [class*="skeleton"]').count();
    hasLoadingElements = loadingCount > 0;
    
    // Check for actual content
    const contentCount = await page.locator('.mantine-Card-root, .mantine-Stack-root, [data-testid*="content"]').count();
    hasContentElements = contentCount > 0;
    
    // If content has loaded and loading has stopped, we're done
    if (hasContentElements && !hasLoadingElements) {
      contentLoadedAt = Date.now();
      break;
    }
    
    // If we have content but still loading, record when content appeared
    if (hasContentElements && !contentLoadedAt) {
      contentLoadedAt = Date.now();
    }
  }
  
  const loadingDuration = Date.now() - startTime;
  
  return {
    hasLoadingElements,
    hasContentElements,
    networkResponses,
    javascriptErrors,
    loadingDuration,
    contentLoadedAt: contentLoadedAt ? contentLoadedAt - startTime : undefined,
  };
}

/**
 * Wait for entity page to load completely
 */
export async function waitForEntityPage(page: Page, entityType: string, timeoutMs = 15000): Promise<void> {
  // Wait for the entity template to load
  await page.waitForSelector('[data-testid="entity-page-template"], .entity-page-template', { timeout: timeoutMs });
  
  // Wait for loading to complete
  await page.waitForFunction(() => {
    const loadingElements = document.querySelectorAll('.animate-pulse, [data-loading]');
    return loadingElements.length === 0;
  }, { timeout: timeoutMs });
  
  // Wait for content to appear
  await page.waitForSelector('.mantine-Card-root, .mantine-Stack-root', { timeout: timeoutMs });
}

/**
 * Verify entity page content is displayed correctly
 */
export async function verifyEntityPageContent(page: Page, entity: TestEntity): Promise<void> {
  // Verify title/header
  if (entity.expectedTitle) {
    const titleElement = page.locator('h1, [data-testid="entity-title"]');
    await expect(titleElement).toContainText(entity.expectedTitle);
  }
  
  // Verify key metrics are displayed
  const metricsCards = page.locator('.mantine-Paper-root, [data-testid*="metric"]');
  expect(await metricsCards.count()).toBeGreaterThan(0);
  
  // Verify tabs are present
  const tabs = page.locator('.mantine-Tabs-tab, [data-testid*="tab"]');
  expect(await tabs.count()).toBeGreaterThan(0);
  
  // Verify entity-specific content based on type
  switch (entity.type) {
    case 'work':
      await expect(page.locator('text=Citations')).toBeVisible();
      await expect(page.locator('text=Authors')).toBeVisible();
      break;
    case 'author':
      await expect(page.locator('text=Works')).toBeVisible();
      await expect(page.locator('text=Citations')).toBeVisible();
      break;
    case 'institution':
      await expect(page.locator('text=Works')).toBeVisible();
      await expect(page.locator('text=h-index')).toBeVisible();
      break;
    // Add more cases as needed
  }
}

/**
 * Test entity page loading performance
 */
export async function testEntityPagePerformance(page: Page, url: string): Promise<{
  loadTime: number;
  apiResponseTime: number;
  renderTime: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let apiResponseTime = 0;
  let firstContentTime = 0;
  
  // Monitor API calls
  page.on('response', (response) => {
    if (response.url().includes('openalex.org') && apiResponseTime === 0) {
      apiResponseTime = Date.now() - startTime;
    }
  });
  
  // Monitor errors
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  await page.goto(url);
  
  // Wait for first content to appear
  await page.waitForSelector('.mantine-Card-root, .mantine-Stack-root').catch(() => {
    errors.push('Content never appeared');
  });
  
  firstContentTime = Date.now() - startTime;
  
  // Wait for loading to complete
  await page.waitForFunction(() => {
    return document.querySelectorAll('.animate-pulse').length === 0;
  }).catch(() => {
    errors.push('Loading never completed');
  });
  
  const totalLoadTime = Date.now() - startTime;
  
  return {
    loadTime: totalLoadTime,
    apiResponseTime,
    renderTime: firstContentTime,
    errors,
  };
}

/**
 * Debug page state for troubleshooting
 */
export async function debugPageState(page: Page): Promise<{
  url: string;
  title: string;
  bodyClasses: string;
  rootContent: string;
  loadingElements: number;
  contentElements: number;
  networkCalls: number;
  reactDevTools: boolean;
}> {
  return await page.evaluate(() => {
    const root = document.getElementById('root');
    const loadingElements = document.querySelectorAll('.animate-pulse, [data-loading]').length;
    const contentElements = document.querySelectorAll('.mantine-Card-root, .mantine-Stack-root').length;
    const networkCalls = performance.getEntries().filter(entry => 
      entry.name.includes('api.openalex.org')
    ).length;
    
    // Check for React DevTools
    const reactDevTools = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    return {
      url: window.location.href,
      title: document.title,
      bodyClasses: document.body.className,
      rootContent: root?.innerHTML?.substring(0, 300) || 'No root element',
      loadingElements,
      contentElements,
      networkCalls,
      reactDevTools,
    };
  });
}

/**
 * Mock network responses for testing
 */
export async function mockNetworkResponses(page: Page, mockData: Record<string, any>): Promise<void> {
  await page.route('**/api.openalex.org/**', async (route) => {
    const url = route.request().url();
    
    // Extract entity type and ID from URL
    const match = url.match(/\/([^\/]+)\/([^\/\?]+)/);
    if (match) {
      const [, entityType, entityId] = match;
      const mockKey = `${entityType}/${entityId}`;
      
      if (mockData[mockKey]) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockData[mockKey]),
        });
        return;
      }
    }
    
    // Continue with normal request if no mock data
    await route.continue();
  });
}

/**
 * Take screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results/${name}-${timestamp}.png`;
  
  await page.screenshot({ 
    path: filename, 
    fullPage: true 
  });
  
  console.log(`Debug screenshot saved: ${filename}`);
}

export const TEST_ENTITIES: TestEntity[] = [
  {
    id: 'W2741809807',
    type: 'work',
    expectedTitle: 'Test Work Title',
  },
  {
    id: 'A5000000001',
    type: 'author',
    expectedTitle: 'John Doe',
  },
  {
    id: 'I86987016',
    type: 'institution',
    expectedTitle: 'Harvard University',
  },
];