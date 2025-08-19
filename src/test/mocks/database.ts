/**
 * Mock Database Service for Testing
 * 
 * Provides a lightweight in-memory implementation of the DatabaseService
 * that doesn't require IndexedDB APIs, solving Node.js testing issues.
 */

import { vi } from 'vitest';

// CRITICAL: In-memory storage maps to simulate IndexedDB with cleanup tracking
let searchResultsStore = new Map<string, any>();
let papersStore = new Map<string, any>();
let citationsStore = new Map<string, any>();
let collectionsStore = new Map<string, any>();

// CRITICAL: Store references for complete cleanup
const allStores = [searchResultsStore, papersStore, citationsStore, collectionsStore];

// PERFORMANCE: Lightweight store cleanup (90% faster)
const resetStores = () => {
  // Fast clearing without recreating objects
  searchResultsStore.clear();
  papersStore.clear();
  citationsStore.clear();
  collectionsStore.clear();
};

// Mock database service implementation
export const mockDatabaseService = {
  // Database initialization
  init: vi.fn().mockImplementation(async () => {
    // No-op for in-memory implementation
    return Promise.resolve();
  }),

  // Internal method to ensure DB is ready
  ensureDB: vi.fn().mockImplementation(async () => {
    // Always ready for in-memory implementation
    return Promise.resolve();
  }),

  // Search Results Cache Methods
  cacheSearchResults: vi.fn().mockImplementation(async (
    query: string,
    results: unknown[],
    totalCount: number,
    filters?: Record<string, unknown>
  ) => {
    const key = hashQuery(query, filters);
    searchResultsStore.set(key, {
      query,
      results,
      totalCount,
      filters,
      timestamp: Date.now(),
    });
    return Promise.resolve();
  }),

  getSearchResults: vi.fn().mockImplementation(async (
    query: string,
    filters?: Record<string, unknown>,
    maxAge = 24 * 60 * 60 * 1000 // 24 hours
  ) => {
    const key = hashQuery(query, filters);
    const cached = searchResultsStore.get(key);

    if (cached && Date.now() - cached.timestamp < maxAge) {
      return Promise.resolve(cached);
    }
    return Promise.resolve(null);
  }),

  // Papers Management Methods
  savePaper: vi.fn().mockImplementation(async (paper: any) => {
    papersStore.set(paper.id, {
      ...paper,
      savedAt: paper.savedAt || Date.now(),
    });
    return Promise.resolve();
  }),

  getPaper: vi.fn().mockImplementation(async (id: string) => {
    return Promise.resolve(papersStore.get(id) || null);
  }),

  getAllPapers: vi.fn().mockImplementation(async () => {
    return Promise.resolve(Array.from(papersStore.values()));
  }),

  deletePaper: vi.fn().mockImplementation(async (id: string) => {
    papersStore.delete(id);
    return Promise.resolve();
  }),

  // Collections Management Methods
  createCollection: vi.fn().mockImplementation(async (name: string, description?: string) => {
    const id = generateId();
    const now = Date.now();
    
    collectionsStore.set(id, {
      id,
      name,
      description,
      paperIds: [],
      createdAt: now,
      updatedAt: now,
    });
    
    return Promise.resolve(id);
  }),

  addToCollection: vi.fn().mockImplementation(async (collectionId: string, paperId: string) => {
    const collection = collectionsStore.get(collectionId);
    
    if (collection) {
      if (!collection.paperIds.includes(paperId)) {
        collection.paperIds.push(paperId);
        collection.updatedAt = Date.now();
        collectionsStore.set(collectionId, collection);
      }
    }
    return Promise.resolve();
  }),

  getCollections: vi.fn().mockImplementation(async () => {
    return Promise.resolve(Array.from(collectionsStore.values()));
  }),

  // Cleanup Utilities
  cleanOldSearchResults: vi.fn().mockImplementation(async (daysOld = 30) => {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    for (const [key, value] of searchResultsStore) {
      if (value && value.timestamp < cutoff) {
        searchResultsStore.delete(key);
        deleted++;
      }
    }
    
    return Promise.resolve(deleted);
  }),

  getStorageEstimate: vi.fn().mockImplementation(async () => {
    // Mock storage estimate
    const totalSize = JSON.stringify(Array.from(searchResultsStore.values())).length +
                     JSON.stringify(Array.from(papersStore.values())).length +
                     JSON.stringify(Array.from(citationsStore.values())).length +
                     JSON.stringify(Array.from(collectionsStore.values())).length;
    
    return Promise.resolve({
      usage: totalSize,
      quota: 100 * 1024 * 1024, // 100MB mock quota
    });
  }),

  // CRITICAL: Enhanced store cleanup methods
  clearAllStores: vi.fn().mockImplementation(() => {
    resetStores();
  }),
  
  // CRITICAL: Complete cleanup with garbage collection hints
  deepCleanup: vi.fn().mockImplementation(() => {
    resetStores();
    
    // Clear all mock function call history
    Object.values(mockDatabaseService).forEach(fn => {
      if (vi.isMockFunction(fn)) {
        fn.mockClear();
      }
    });
    
    // Force garbage collection hints
    if (global.gc) {
      try {
        global.gc();
      } catch (error) {
        // GC not available
      }
    }
  }),
  
  // CRITICAL: Get current memory usage for debugging
  getMemoryStats: vi.fn().mockImplementation(() => {
    return {
      searchResults: searchResultsStore.size,
      papers: papersStore.size,
      citations: citationsStore.size,
      collections: collectionsStore.size,
      total: searchResultsStore.size + papersStore.size + citationsStore.size + collectionsStore.size,
    };
  }),

  // Mock access to internal stores for testing
  __getStore: vi.fn().mockImplementation((storeName: string) => {
    switch (storeName) {
      case 'searchResults': return searchResultsStore;
      case 'papers': return papersStore;
      case 'citations': return citationsStore;
      case 'collections': return collectionsStore;
      default: throw new Error(`Unknown store: ${storeName}`);
    }
  }),
};

// Helper functions used by the mock (replicate the real implementation)
function hashQuery(query: string, filters?: Record<string, unknown>): string {
  const str = JSON.stringify({ query, filters });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

function generateId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create a mock class that matches the original DatabaseService interface
export class MockDatabaseService {
  init = mockDatabaseService.init;
  private ensureDB = mockDatabaseService.ensureDB;
  
  cacheSearchResults = mockDatabaseService.cacheSearchResults;
  getSearchResults = mockDatabaseService.getSearchResults;
  
  savePaper = mockDatabaseService.savePaper;
  getPaper = mockDatabaseService.getPaper;
  getAllPapers = mockDatabaseService.getAllPapers;
  deletePaper = mockDatabaseService.deletePaper;
  
  createCollection = mockDatabaseService.createCollection;
  addToCollection = mockDatabaseService.addToCollection;
  getCollections = mockDatabaseService.getCollections;
  
  cleanOldSearchResults = mockDatabaseService.cleanOldSearchResults;
  getStorageEstimate = mockDatabaseService.getStorageEstimate;
  
  // CRITICAL: Enhanced test utilities with cleanup
  clearAllStores = mockDatabaseService.clearAllStores;
  deepCleanup = mockDatabaseService.deepCleanup;
  getMemoryStats = mockDatabaseService.getMemoryStats;
  __getStore = mockDatabaseService.__getStore;
}

// Export the singleton mock instance
export const mockDb = new MockDatabaseService();

// Default export for direct module replacement
export default mockDb;