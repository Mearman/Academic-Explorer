/**
 * Entity Loading Diagnosis E2E Tests
 * 
 * Comprehensive tests to diagnose the works page loading issue and verify
 * all entity pages load correctly.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { 
  analyzePageLoading, 
  waitForEntityPage, 
  verifyEntityPageContent,
  testEntityPagePerformance,
  debugPageState,
  takeDebugScreenshot,
  TEST_ENTITIES,
  type TestEntity
} from './utils/e2e-helpers';

describe('Entity Loading Diagnosis', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      javaScriptEnabled: true,
    });
    
    page = await context.newPage();
    
    // Enhanced error logging
    page.on('console', (msg) => {
      const type = msg.type();
      if (['error', 'warn'].includes(type)) {
        console.log(`Browser ${type}: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      console.error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  describe('Specific Works Page Issue', () => {
    it('should diagnose the W2741809807 loading issue', async () => {
      const workId = 'W2741809807';
      const workUrl = `${baseURL}/works/${workId}`;
      
      console.log(`\n=== Diagnosing Works Page: ${workUrl} ===`);
      
      const analysis = await analyzePageLoading(page, workUrl, 20000);
      
      console.log('Loading Analysis Results:');
      console.log(`- Loading Duration: ${analysis.loadingDuration}ms`);
      console.log(`- Content Loaded At: ${analysis.contentLoadedAt || 'Never'}ms`);
      console.log(`- Has Loading Elements: ${analysis.hasLoadingElements}`);
      console.log(`- Has Content Elements: ${analysis.hasContentElements}`);
      console.log(`- Network Responses: ${analysis.networkResponses.length}`);
      console.log(`- JavaScript Errors: ${analysis.javascriptErrors.length}`);
      
      if (analysis.javascriptErrors.length > 0) {
        console.log('JavaScript Errors:', analysis.javascriptErrors);
      }
      
      // Check API responses
      const apiResponses = analysis.networkResponses.filter(r => r.includes('openalex.org'));
      console.log('OpenAlex API Responses:', apiResponses);
      
      // Take screenshot for visual debugging
      await takeDebugScreenshot(page, `works-page-${workId}`);
      
      // Get detailed page state
      const debugInfo = await debugPageState(page);
      console.log('Page Debug Info:', debugInfo);
      
      // If we're stuck in loading, let's investigate further
      if (analysis.hasLoadingElements && !analysis.hasContentElements) {
        console.log('\n🔍 INVESTIGATING LOADING ISSUE...');
        
        // Check React component state
        const reactState = await page.evaluate(() => {
          const root = document.getElementById('root');
          if (!root) return { error: 'No root element' };
          
          // Try to find React fiber data
          const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
          const instanceKey = Object.keys(root).find(key => key.startsWith('__reactInternalInstance'));
          
          return {
            hasFiber: !!fiberKey,
            hasInstance: !!instanceKey,
            childrenCount: root.children.length,
            innerHTML: root.innerHTML.substring(0, 500),
          };
        });
        
        console.log('React State:', reactState);
        
        // Check if the data hook is working
        const hookState = await page.evaluate(() => {
          // Try to access any global state or debugging info
          const windowObj = window as any;
          
          return {
            hasZustandDevtools: !!windowObj.__ZUSTAND_DEVTOOLS__,
            hasReactQueryDevtools: !!windowObj.__REACT_QUERY_DEVTOOLS__,
            hasReactDevtools: !!windowObj.__REACT_DEVTOOLS_GLOBAL_HOOK__,
            performanceEntries: performance.getEntries().length,
          };
        });
        
        console.log('Hook/Devtools State:', hookState);
        
        // Force wait and recheck
        console.log('Waiting additional 10 seconds to see if loading resolves...');
        await page.waitForTimeout(10000);
        
        const finalCheck = await debugPageState(page);
        console.log('Final Check:', finalCheck);
        
        if (finalCheck.loadingElements > 0) {
          console.error('❌ CONFIRMED: Page is permanently stuck in loading state');
          console.error('This indicates a React state management or data fetching issue');
        }
      }
      
      // Test expectations
      expect(analysis.hasContentElements).toBe(true);
      expect(analysis.hasLoadingElements).toBe(false);
      expect(analysis.contentLoadedAt).toBeDefined();
      expect(analysis.contentLoadedAt!).toBeLessThan(15000); // Should load within 15 seconds
    }, 60000);

    it('should test works page performance metrics', async () => {
      const workUrl = `${baseURL}/works/W2741809807`;
      
      const performance = await testEntityPagePerformance(page, workUrl);
      
      console.log('\nPerformance Metrics:');
      console.log(`- Total Load Time: ${performance.loadTime}ms`);
      console.log(`- API Response Time: ${performance.apiResponseTime}ms`);
      console.log(`- Render Time: ${performance.renderTime}ms`);
      console.log(`- Errors: ${performance.errors.length}`);
      
      if (performance.errors.length > 0) {
        console.log('Performance Errors:', performance.errors);
      }
      
      // Performance expectations
      expect(performance.errors.length).toBe(0);
      expect(performance.loadTime).toBeLessThan(30000); // Should load within 30 seconds
      expect(performance.apiResponseTime).toBeLessThan(10000); // API should respond within 10 seconds
    }, 45000);
  });

  describe('All Entity Types Loading', () => {
    TEST_ENTITIES.forEach((entity) => {
      it(`should load ${entity.type} page correctly: ${entity.id}`, async () => {
        const entityUrl = `${baseURL}/${entity.type}s/${entity.id}`;
        
        console.log(`\nTesting ${entity.type}: ${entityUrl}`);
        
        try {
          await waitForEntityPage(page, entity.type, 20000);
          await verifyEntityPageContent(page, entity);
          
          console.log(`✅ ${entity.type} page loaded successfully`);
        } catch (error) {
          console.error(`❌ ${entity.type} page failed to load:`, error);
          
          // Debug the failure
          const debugInfo = await debugPageState(page);
          console.log('Debug info for failed page:', debugInfo);
          
          await takeDebugScreenshot(page, `failed-${entity.type}-${entity.id}`);
          
          throw error;
        }
      }, 30000);
    });
  });

  describe('Homepage and Navigation', () => {
    it('should load homepage and test navigation', async () => {
      await page.goto(baseURL);
      
      // Verify homepage loads
      await page.waitForSelector('h1', { timeout: 10000 });
      const title = await page.textContent('h1');
      expect(title).toContain('Academic Explorer');
      
      // Test search functionality
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      // Try to perform a search
      await searchInput.fill('machine learning');
      
      const searchButton = page.locator('button[type="submit"], button:has-text("Search")');
      await searchButton.click();
      
      // Wait a bit for search results
      await page.waitForTimeout(3000);
      
      // Check if search results appeared or if we can navigate to works manually
      const hasSearchResults = await page.locator('a[href*="/works/"]').count() > 0;
      
      if (hasSearchResults) {
        console.log('✅ Search functionality is working');
        
        // Click on first search result
        const firstResult = page.locator('a[href*="/works/"]').first();
        await firstResult.click();
        
        // Verify navigation worked
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/works\/W\d+/);
        
        console.log(`Navigated to: ${currentUrl}`);
        
        // Verify the works page loads
        await waitForEntityPage(page, 'work', 15000);
        console.log('✅ Navigation to works page successful');
      } else {
        console.log('⚠️  Search functionality not working, testing direct navigation');
        
        // Test direct navigation
        await page.goto(`${baseURL}/works/W2741809807`);
        await waitForEntityPage(page, 'work', 15000);
        console.log('✅ Direct navigation to works page successful');
      }
    }, 45000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent entity gracefully', async () => {
      const nonExistentUrl = `${baseURL}/works/W999999999`;
      
      await page.goto(nonExistentUrl);
      
      // Should show an error state, not infinite loading
      const errorElements = await page.locator('[data-testid*="error"], .error, [class*="error"]').count();
      const loadingElements = await page.locator('.animate-pulse').count();
      
      // After 10 seconds, we should have either error or content, not loading
      await page.waitForTimeout(10000);
      
      const finalLoadingElements = await page.locator('.animate-pulse').count();
      
      expect(finalLoadingElements).toBe(0); // Should not be stuck in loading
      
      console.log(`Error handling test - Loading elements: ${finalLoadingElements}, Error elements: ${errorElements}`);
    }, 20000);
  });
});