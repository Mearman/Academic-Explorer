/**
 * E2E Tests for Works Page Loading Issue
 * 
 * These tests are designed to identify why the works page gets stuck in a loading state
 * despite successful API responses.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { server } from './setup';

describe('Works Page Loading E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let baseURL: string;

  beforeAll(async () => {
    // Start development server
    const { spawn } = await import('child_process');
    
    // Use a different port for testing to avoid conflicts
    process.env.PORT = '3002';
    baseURL = 'http://localhost:3002';
    
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 50,
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
      // Enable JavaScript
      javaScriptEnabled: true,
      // Set a user agent
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    page = await context.newPage();
    
    // Set up console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser error: ${msg.text()}`);
      }
    });

    // Set up network monitoring
    page.on('response', (response) => {
      if (response.url().includes('openalex.org')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Set up page error monitoring
    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`);
    });
  });

  afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  describe('Works Page Data Loading', () => {
    it('should load the homepage successfully', async () => {
      await page.goto(baseURL);
      
      // Wait for the page to load
      await page.waitForSelector('h1', { timeout: 10000 });
      
      // Verify homepage elements are present
      const title = await page.textContent('h1');
      expect(title).toContain('Academic Explorer');
      
      const searchInput = await page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
    });

    it('should identify the works page loading issue', async () => {
      const workId = 'W2741809807';
      const workUrl = `${baseURL}/works/${workId}`;
      
      console.log(`Testing works page: ${workUrl}`);
      
      // Navigate to works page
      await page.goto(workUrl, { waitUntil: 'networkidle' });
      
      // Wait for initial render
      await page.waitForTimeout(1000);
      
      // Check for loading states
      const loadingElements = await page.locator('.animate-pulse, [data-loading], [class*="loading"], [class*="skeleton"]').count();
      console.log(`Found ${loadingElements} loading elements`);
      
      // Check for actual content
      const contentElements = await page.locator('.mantine-Card-root, .mantine-Stack-root, [data-testid*="work"]').count();
      console.log(`Found ${contentElements} content elements`);
      
      // Check network requests
      const responses: string[] = [];
      page.on('response', (response) => {
        responses.push(`${response.status()} ${response.url()}`);
      });
      
      // Wait for API calls to complete (with extended timeout)
      await page.waitForTimeout(5000);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/works-page-loading.png', fullPage: true });
      
      // Check if we're still in loading state
      const stillLoading = await page.locator('.animate-pulse').count() > 0;
      const hasContent = await page.locator('.mantine-Card-root').count() > 0;
      
      // Log current page state
      const pageState = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyClasses: document.body.className,
          rootContent: document.getElementById('root')?.innerHTML?.substring(0, 200) || 'No root',
        };
      });
      
      console.log('Page state:', pageState);
      console.log('Network responses:', responses);
      
      // This test is designed to identify the issue, not necessarily pass
      if (stillLoading) {
        console.warn('ISSUE IDENTIFIED: Page is stuck in loading state');
        console.warn(`Loading elements present: ${loadingElements}`);
        console.warn(`Content elements present: ${contentElements}`);
        
        // Try to identify the cause
        const jsErrors = await page.evaluate(() => {
          // Check for any global error states
          return {
            hasReactError: window.__REACT_ERROR_BOUNDARY_STATE__ || false,
            hasUnhandledRejections: window.__UNHANDLED_PROMISE_REJECTIONS__ || [],
            hasConsoleErrors: window.__CONSOLE_ERRORS__ || [],
          };
        });
        
        console.log('JavaScript state:', jsErrors);
      }
      
      // Assert that we should not be in a permanent loading state
      expect(stillLoading).toBe(false);
      expect(hasContent).toBe(true);
    }, 30000); // 30 second timeout

    it('should track data loading lifecycle', async () => {
      const workId = 'W2741809807';
      const workUrl = `${baseURL}/works/${workId}`;
      
      const events: string[] = [];
      
      // Monitor network activity
      page.on('request', (request) => {
        if (request.url().includes('openalex')) {
          events.push(`REQUEST: ${request.method()} ${request.url()}`);
        }
      });
      
      page.on('response', (response) => {
        if (response.url().includes('openalex')) {
          events.push(`RESPONSE: ${response.status()} ${response.url()}`);
        }
      });
      
      // Monitor DOM changes
      await page.goto(workUrl);
      
      // Set up mutation observer to track loading state changes
      await page.evaluate(() => {
        const events = (window as any).__TEST_EVENTS__ = [];
        
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof Element) {
                  if (node.classList.contains('animate-pulse')) {
                    events.push('LOADING_STARTED');
                  }
                  if (node.classList.contains('mantine-Card-root')) {
                    events.push('CONTENT_RENDERED');
                  }
                }
              });
              
              mutation.removedNodes.forEach((node) => {
                if (node instanceof Element && node.classList.contains('animate-pulse')) {
                  events.push('LOADING_ENDED');
                }
              });
            }
            
            if (mutation.type === 'attributes' && mutation.target instanceof Element) {
              const target = mutation.target;
              if (target.classList.contains('animate-pulse')) {
                events.push('LOADING_ACTIVE');
              }
            }
          });
        });
        
        const root = document.getElementById('root');
        if (root) {
          observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
          });
        }
      });
      
      // Wait for loading and data resolution
      await page.waitForTimeout(10000);
      
      // Get the events that occurred
      const domEvents = await page.evaluate(() => (window as any).__TEST_EVENTS__ || []);
      
      console.log('Network events:', events);
      console.log('DOM events:', domEvents);
      
      // Analyze the event timeline
      const hasApiRequest = events.some(e => e.includes('REQUEST'));
      const hasApiResponse = events.some(e => e.includes('RESPONSE'));
      const hasLoadingStart = domEvents.includes('LOADING_STARTED');
      const hasContentRender = domEvents.includes('CONTENT_RENDERED');
      const hasLoadingEnd = domEvents.includes('LOADING_ENDED');
      
      console.log('Event analysis:', {
        hasApiRequest,
        hasApiResponse,
        hasLoadingStart,
        hasContentRender,
        hasLoadingEnd,
      });
      
      // This helps identify where the loading lifecycle breaks
      expect(hasApiRequest).toBe(true);
      expect(hasApiResponse).toBe(true);
      
      // If API succeeds but content doesn't render, that's our issue
      if (hasApiResponse && !hasContentRender) {
        console.error('ISSUE: API succeeded but content failed to render');
        
        // Try to capture React component state
        const reactState = await page.evaluate(() => {
          // Try to access React DevTools data if available
          const reactRoot = document.getElementById('root');
          if (reactRoot && (reactRoot as any)._reactInternalFiber) {
            return 'React fiber detected';
          }
          if (reactRoot && (reactRoot as any).__reactInternalInstance) {
            return 'React instance detected';
          }
          return 'No React debug info available';
        });
        
        console.log('React state:', reactState);
      }
    }, 45000); // 45 second timeout
  });

  describe('Entity Navigation Flow', () => {
    it('should test complete entity navigation workflow', async () => {
      // Start from homepage
      await page.goto(baseURL);
      await page.waitForSelector('input[placeholder*="Search"]');
      
      // Perform a search
      await page.fill('input[placeholder*="Search"]', 'machine learning');
      await page.click('button[type="submit"], button:has-text("Search")');
      
      // Wait for search results
      await page.waitForTimeout(3000);
      
      // Check if search results loaded
      const hasResults = await page.locator('[data-testid*="result"], .search-result, a[href*="/works/"]').count() > 0;
      
      if (hasResults) {
        // Click on first result
        const firstResult = page.locator('a[href*="/works/"]').first();
        await firstResult.click();
        
        // Wait for navigation
        await page.waitForTimeout(3000);
        
        // Check if we're on a works page and it loads properly
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/works\/W\d+/);
        
        // Verify content loads
        const contentLoaded = await page.locator('.mantine-Card-root, [data-testid*="work-content"]').count() > 0;
        const stillLoading = await page.locator('.animate-pulse').count() > 0;
        
        expect(contentLoaded).toBe(true);
        expect(stillLoading).toBe(false);
      } else {
        console.log('Search functionality may not be working - checking direct navigation');
        
        // Test direct navigation as fallback
        await page.goto(`${baseURL}/works/W2741809807`);
        await page.waitForTimeout(5000);
        
        const contentLoaded = await page.locator('.mantine-Card-root').count() > 0;
        const stillLoading = await page.locator('.animate-pulse').count() > 0;
        
        expect(contentLoaded).toBe(true);
        expect(stillLoading).toBe(false);
      }
    }, 60000); // 60 second timeout
  });
});