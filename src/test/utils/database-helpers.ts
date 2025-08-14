/**
 * Database Testing Helper Utilities
 * 
 * Provides convenient utilities for testing with the mock database service.
 */

import { mockDb } from '../mocks/database';

// Type definitions for test data
export interface TestPaper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  year?: number;
  doi?: string;
  citations?: number;
  savedAt: number;
  tags?: string[];
  notes?: string;
}

export interface TestSearchResult {
  query: string;
  results: unknown[];
  timestamp: number;
  totalCount: number;
  filters?: Record<string, unknown>;
}

/**
 * Database test helpers
 */
export class DatabaseTestHelpers {
  /**
   * Clear all mock database stores
   */
  static async clearAll(): Promise<void> {
    await mockDb.clearAllStores();
  }

  /**
   * Create test search results
   */
  static async createTestSearchResults(
    query: string,
    results: unknown[] = [],
    totalCount = results.length,
    filters?: Record<string, unknown>
  ): Promise<void> {
    await mockDb.cacheSearchResults(query, results, totalCount, filters);
  }

  /**
   * Create test paper
   */
  static async createTestPaper(paper: Partial<TestPaper> = {}): Promise<TestPaper> {
    const testPaper: TestPaper = {
      id: paper.id || `test-paper-${Date.now()}`,
      title: paper.title || 'Test Paper Title',
      authors: paper.authors || ['Test Author'],
      abstract: paper.abstract,
      year: paper.year || 2024,
      doi: paper.doi,
      citations: paper.citations || 0,
      savedAt: paper.savedAt || Date.now(),
      tags: paper.tags,
      notes: paper.notes,
    };

    await mockDb.savePaper(testPaper);
    return testPaper;
  }

  /**
   * Create test collection
   */
  static async createTestCollection(
    name = 'Test Collection',
    description?: string
  ): Promise<string> {
    return await mockDb.createCollection(name, description);
  }

  /**
   * Get all data from a specific store
   */
  static async getStoreData(storeName: 'searchResults' | 'papers' | 'citations' | 'collections') {
    const store = mockDb.__getStore(storeName);
    return Array.from(store.entries());
  }

  /**
   * Verify search results exist in cache
   */
  static async verifySearchResultsCached(
    query: string,
    filters?: Record<string, unknown>
  ): Promise<boolean> {
    const results = await mockDb.getSearchResults(query, filters);
    return results !== null;
  }

  /**
   * Verify paper exists
   */
  static async verifyPaperExists(id: string): Promise<boolean> {
    const paper = await mockDb.getPaper(id);
    return paper !== null;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    const searchResults = mockDb.__getStore('searchResults');
    const papers = mockDb.__getStore('papers');
    const collections = mockDb.__getStore('collections');

    return {
      searchResultsCount: searchResults.size,
      papersCount: papers.size,
      collectionsCount: collections.size,
      totalEntries: searchResults.size + papers.size + collections.size,
    };
  }

  /**
   * Simulate cache expiry by manipulating timestamps
   */
  static async simulateCacheExpiry(ageInMs: number): Promise<void> {
    const searchResults = mockDb.__getStore('searchResults');
    const expiredTimestamp = Date.now() - ageInMs;
    
    for (const [key, value] of searchResults) {
      if (value && typeof value === 'object' && 'timestamp' in value) {
        value.timestamp = expiredTimestamp;
        searchResults.set(key, value);
      }
    }
  }

  /**
   * Create mock API response data
   */
  static createMockApiResponse(results: unknown[] = [], count = results.length) {
    return {
      meta: {
        count,
        db_response_time_ms: 10,
        page: 1,
        per_page: 25,
      },
      results,
    };
  }

  /**
   * Create mock work entity for testing
   */
  static createMockWork(id = 'W123456789', overrides: Record<string, unknown> = {}) {
    return {
      id: `https://openalex.org/${id}`,
      display_name: 'Test Work Title',
      authorships: [],
      cited_by_count: 100,
      publication_year: 2024,
      open_access: {
        is_oa: true,
        oa_status: 'gold',
      },
      ...overrides,
    };
  }

  /**
   * Create mock author entity for testing
   */
  static createMockAuthor(id = 'A123456789', overrides: Record<string, unknown> = {}) {
    return {
      id: `https://openalex.org/${id}`,
      display_name: 'Test Author',
      works_count: 50,
      cited_by_count: 500,
      affiliations: [],
      ...overrides,
    };
  }
}

// Export convenience functions
export const {
  clearAll,
  createTestSearchResults,
  createTestPaper,
  createTestCollection,
  getStoreData,
  verifySearchResultsCached,
  verifyPaperExists,
  getCacheStats,
  simulateCacheExpiry,
  createMockApiResponse,
  createMockWork,
  createMockAuthor,
} = DatabaseTestHelpers;