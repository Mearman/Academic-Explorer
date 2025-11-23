/**
 * Test Helper Contracts for E2E Test Coverage Enhancement
 *
 * These interfaces define the contracts for test helper utilities used in E2E tests.
 * Helpers encapsulate common test operations to improve maintainability and reduce
 * code duplication across test suites.
 *
 * Pattern: Dependency injection via constructor/factory
 * Usage: const nav = new NavigationHelper(page);
 *
 * See: specs/020-e2e-test-coverage/research.md (Research Task 3)
 */

import type { Page } from '@playwright/test';
import type { EntityType } from '@academic-explorer/types';

/**
 * Navigation helper
 * Handles app navigation with TanStack Router awareness
 */
export interface NavigationHelper {
  readonly page: Page;

  /**
   * Navigate to entity detail page
   * @param entityType - Entity type (works, authors, etc.)
   * @param entityId - OpenAlex entity ID
   * @param options - Navigation options
   */
  navigateToEntity(
    entityType: EntityType,
    entityId: string,
    options?: NavigationOptions
  ): Promise<void>;

  /**
   * Navigate to entity index page
   * @param entityType - Entity type (works, authors, etc.)
   * @param options - Navigation options
   */
  navigateToIndex(entityType: EntityType, options?: NavigationOptions): Promise<void>;

  /**
   * Navigate to search page
   * @param query - Optional search query
   * @param options - Navigation options
   */
  navigateToSearch(query?: string, options?: NavigationOptions): Promise<void>;

  /**
   * Navigate to browse page
   * @param options - Navigation options
   */
  navigateToBrowse(options?: NavigationOptions): Promise<void>;

  /**
   * Navigate back in browser history
   */
  goBack(): Promise<void>;

  /**
   * Navigate forward in browser history
   */
  goForward(): Promise<void>;

  /**
   * Reload current page
   */
  reload(): Promise<void>;

  /**
   * Wait for navigation to complete
   * Uses app-ready checks instead of generic networkidle
   */
  waitForNavigationComplete(timeout?: number): Promise<void>;

  /**
   * Wait for TanStack Router to finish loading
   */
  waitForRouterReady(timeout?: number): Promise<void>;
}

/**
 * Storage test helper
 * Handles IndexedDB operations for test isolation
 * Uses InMemoryStorageProvider for test isolation
 */
export interface StorageTestHelper {
  /**
   * Clear all storage (IndexedDB, localStorage, sessionStorage)
   * Called in beforeEach to prevent cross-test pollution
   */
  clearStorage(): Promise<void>;

  /**
   * Initialize special lists (bookmarks, history)
   * Must be called before storage operations
   */
  initializeSpecialLists(): Promise<void>;

  /**
   * Seed bookmarks with test data
   * @param count - Number of bookmarks to create
   * @param entities - Optional specific entities to bookmark
   */
  seedBookmarks(count: number, entities?: SeedEntity[]): Promise<void>;

  /**
   * Seed catalogue list with test data
   * @param listId - Catalogue list ID
   * @param entityCount - Number of entities to add
   * @param entities - Optional specific entities
   */
  seedCatalogueList(
    listId: string,
    entityCount: number,
    entities?: SeedEntity[]
  ): Promise<void>;

  /**
   * Verify storage state matches expected
   * @param expected - Expected storage state
   */
  verifyStorageState(expected: StorageState): Promise<void>;

  /**
   * Get current bookmarks count
   */
  getBookmarksCount(): Promise<number>;

  /**
   * Get current history count
   */
  getHistoryCount(): Promise<number>;

  /**
   * Get catalogue list by ID
   */
  getCatalogueList(listId: string): Promise<CatalogueList | null>;
}

/**
 * Assertion helper
 * Encapsulates common test assertions with deterministic waits
 */
export interface AssertionHelper {
  readonly page: Page;

  /**
   * Wait for entity data to load
   * Uses app-ready checks: API response received + data rendered
   * @param timeout - Max wait time in milliseconds (default: 30000)
   */
  waitForEntityData(timeout?: number): Promise<void>;

  /**
   * Wait for no error state
   * Ensures error components are not displayed
   * @param timeout - Max wait time in milliseconds (default: 5000)
   */
  waitForNoError(timeout?: number): Promise<void>;

  /**
   * Wait for search results to appear
   * @param minCount - Minimum number of results expected
   * @param timeout - Max wait time in milliseconds (default: 10000)
   */
  waitForSearchResults(minCount: number, timeout?: number): Promise<void>;

  /**
   * Verify accessibility compliance
   * Uses @axe-core/playwright for WCAG 2.1 AA validation
   * @param options - Axe scan options
   */
  verifyAccessibility(options?: AxeScanOptions): Promise<void>;

  /**
   * Wait for graph to render
   * D3 force simulation complete + nodes visible
   * @param timeout - Max wait time in milliseconds (default: 10000)
   */
  waitForGraphReady(timeout?: number): Promise<void>;

  /**
   * Verify element is visible
   * @param selector - CSS selector
   * @param timeout - Max wait time in milliseconds (default: 5000)
   */
  assertVisible(selector: string, timeout?: number): Promise<void>;

  /**
   * Verify element is not visible
   * @param selector - CSS selector
   * @param timeout - Max wait time in milliseconds (default: 5000)
   */
  assertNotVisible(selector: string, timeout?: number): Promise<void>;

  /**
   * Verify text content matches
   * @param selector - CSS selector
   * @param expectedText - Expected text or regex pattern
   * @param timeout - Max wait time in milliseconds (default: 5000)
   */
  assertTextContent(
    selector: string,
    expectedText: string | RegExp,
    timeout?: number
  ): Promise<void>;

  /**
   * Verify element count matches
   * @param selector - CSS selector
   * @param expectedCount - Expected number of elements
   * @param timeout - Max wait time in milliseconds (default: 5000)
   */
  assertElementCount(selector: string, expectedCount: number, timeout?: number): Promise<void>;
}

/**
 * API mock helper
 * Handles MSW (Mock Service Worker) setup and configuration
 */
export interface ApiMockHelper {
  /**
   * Setup MSW handlers for test
   * @param handlers - Request handlers
   */
  setupHandlers(handlers: ApiMockHandler[]): Promise<void>;

  /**
   * Reset all handlers to default state
   */
  resetHandlers(): Promise<void>;

  /**
   * Mock successful entity response
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param data - Response data
   */
  mockEntitySuccess(entityType: EntityType, entityId: string, data: unknown): Promise<void>;

  /**
   * Mock entity error response
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param errorType - Error type (404, 500, network)
   */
  mockEntityError(
    entityType: EntityType,
    entityId: string,
    errorType: '404' | '500' | 'network'
  ): Promise<void>;

  /**
   * Mock search results
   * @param query - Search query
   * @param results - Search results
   */
  mockSearchResults(query: string, results: unknown[]): Promise<void>;

  /**
   * Wait for MSW to initialize
   * Prevents race conditions in test setup
   */
  waitForMswReady(timeout?: number): Promise<void>;

  /**
   * Verify API call was made
   * @param url - Request URL pattern
   * @param method - HTTP method
   */
  verifyApiCall(url: string | RegExp, method?: string): Promise<boolean>;
}

/**
 * Performance helper
 * Measures and asserts performance metrics
 */
export interface PerformanceHelper {
  readonly page: Page;

  /**
   * Start performance measurement
   */
  startMeasurement(label: string): void;

  /**
   * Stop performance measurement
   * @param label - Measurement label
   * @returns Duration in milliseconds
   */
  stopMeasurement(label: string): number;

  /**
   * Measure navigation timing
   * @returns Navigation timing metrics
   */
  getNavigationTiming(): Promise<NavigationTiming>;

  /**
   * Measure graph rendering time
   * @returns Render time in milliseconds
   */
  measureGraphRenderTime(): Promise<number>;

  /**
   * Assert operation completed within time limit
   * @param label - Measurement label
   * @param maxDuration - Max duration in milliseconds
   */
  assertWithinTimeLimit(label: string, maxDuration: number): void;

  /**
   * Get Web Vitals metrics
   * @returns Core Web Vitals (LCP, FID, CLS)
   */
  getWebVitals(): Promise<WebVitals>;
}

/**
 * Screenshot helper
 * Captures screenshots for visual regression testing
 */
export interface ScreenshotHelper {
  readonly page: Page;

  /**
   * Capture full page screenshot
   * @param name - Screenshot name
   * @param options - Screenshot options
   */
  captureFullPage(name: string, options?: ScreenshotOptions): Promise<Buffer>;

  /**
   * Capture element screenshot
   * @param selector - CSS selector
   * @param name - Screenshot name
   * @param options - Screenshot options
   */
  captureElement(selector: string, name: string, options?: ScreenshotOptions): Promise<Buffer>;

  /**
   * Compare screenshot with baseline
   * @param name - Screenshot name
   * @param threshold - Max acceptable difference (0-1)
   */
  compareWithBaseline(name: string, threshold?: number): Promise<boolean>;
}

// Supporting Types

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  referer?: string;
}

export interface SeedEntity {
  id: string;
  type: EntityType;
  title: string;
  metadata?: Record<string, unknown>;
}

export interface StorageState {
  bookmarksCount?: number;
  historyCount?: number;
  catalogueLists?: Record<string, CatalogueList>;
}

export interface CatalogueList {
  id: string;
  title: string;
  type: 'list' | 'bookmarks' | 'history';
  entityCount: number;
  entities?: SeedEntity[];
}

export interface AxeScanOptions {
  rules?: Record<string, { enabled: boolean }>;
  tags?: string[];
  exclude?: string[];
}

export interface ApiMockHandler {
  url: string | RegExp;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: number;
  response: unknown;
  delay?: number;
}

export interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export interface WebVitals {
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift (score)
  fcp?: number; // First Contentful Paint (ms)
  ttfb?: number; // Time to First Byte (ms)
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  omitBackground?: boolean;
  timeout?: number;
}
