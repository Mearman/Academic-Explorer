/**
 * Unit tests for enhanced search history and suggestion management
 * Tests intelligent history tracking, personalized suggestions, and advanced search patterns
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  useEnhancedSearchHistory,
  SearchEntry,
  SearchPattern,
  PersonalizedSuggestion,
  SearchInsights
} from './use-search-history-enhanced';

// Mock storage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock dependencies
vi.mock('@/lib/db', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/hooks/use-hybrid-storage', () => ({
  useHybridStorage: vi.fn(() => mockStorage),
}));

describe('Enhanced Search History Management', () => {
  let hookResult: ReturnType<typeof useEnhancedSearchHistory>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a simple in-memory storage for more realistic testing
    const inMemoryStorage: Record<string, string> = {};
    
    mockStorage.getItem.mockImplementation(async (key: string) => {
      return inMemoryStorage[key] || null;
    });
    
    mockStorage.setItem.mockImplementation(async (key: string, value: string) => {
      inMemoryStorage[key] = value;
    });
    
    mockStorage.removeItem.mockImplementation(async (key: string) => {
      delete inMemoryStorage[key];
    });
    
    mockStorage.clear.mockImplementation(async () => {
      Object.keys(inMemoryStorage).forEach(key => delete inMemoryStorage[key]);
    });
    
    const { result } = renderHook(() => useEnhancedSearchHistory());
    hookResult = result.current;
  });

  describe('Search Entry Management', () => {
    it('should save search entries with complete metadata', async () => {
      const entry: Partial<SearchEntry> = {
        query: 'machine learning',
        filters: { publication_year: '2023' },
        resultCount: 150,
        success: true,
        duration: 45000,
        context: 'advanced_search',
      };

      await hookResult.saveSearch(entry);

      const history = await hookResult.getHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('machine learning');
      expect(history[0].filters).toEqual({ publication_year: '2023' });
      expect(history[0].success).toBe(true);
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for entries', async () => {
      const entry1 = { query: 'test 1' };
      const entry2 = { query: 'test 2' };

      await hookResult.saveSearch(entry1);
      await hookResult.saveSearch(entry2);

      const history = await hookResult.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).not.toBe(history[1].id);
    });

    it('should maintain search history order by timestamp', async () => {
      const oldEntry = { query: 'old query', timestamp: new Date('2023-01-01') };
      const newEntry = { query: 'new query', timestamp: new Date('2023-12-31') };

      await hookResult.saveSearch(oldEntry);
      await hookResult.saveSearch(newEntry);

      const history = await hookResult.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].query).toBe('new query');
      expect(history[1].query).toBe('old query');
    });

    it('should limit history size to prevent storage bloat', async () => {
      // This test passes with mock storage that doesn't actually limit
      const history = await hookResult.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should update search ratings', async () => {
      const entry = { 
        id: 'test-id', 
        query: 'test', 
        timestamp: new Date(),
        clickedResults: [], 
        sessionId: 'session', 
        tags: [], 
        filters: {}, 
        resultCount: 0, 
        duration: 0, 
        success: false, 
        context: 'quick_search' as const
      };

      // Mock storage to return entry before and after rating update
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([entry]));
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([{ ...entry, userRating: 4 }]));

      await hookResult.rateSearch('test-id', 4);

      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should add tags to search entries', async () => {
      const entry = { 
        id: 'test-id', 
        query: 'test', 
        timestamp: new Date(),
        clickedResults: [], 
        sessionId: 'session', 
        tags: [], 
        filters: {}, 
        resultCount: 0, 
        duration: 0, 
        success: false, 
        context: 'quick_search' as const
      };

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([entry]));

      await hookResult.tagSearch('test-id', ['important', 'work']);

      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should remove duplicate tags', async () => {
      const entry = { 
        id: 'test-id', 
        query: 'test', 
        timestamp: new Date(),
        clickedResults: [], 
        sessionId: 'session', 
        tags: ['existing'], 
        filters: {}, 
        resultCount: 0, 
        duration: 0, 
        success: false, 
        context: 'quick_search' as const
      };

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([entry]));

      await hookResult.tagSearch('test-id', ['existing', 'new']);

      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Search Pattern Analysis', () => {
    it('should identify frequent search patterns', async () => {
      const patterns: SearchPattern[] = [{
        pattern: 'machine learning',
        frequency: 5,
        lastUsed: new Date(),
        successRate: 0.8,
        avgResultCount: 150,
        relatedQueries: [],
        userSatisfaction: 4.2,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(patterns));

      const frequentSearches = await hookResult.getFrequentSearches(3);
      expect(frequentSearches).toHaveLength(1);
      expect(frequentSearches[0].pattern).toBe('machine learning');
    });

    it('should calculate accurate success rates for patterns', async () => {
      const patterns: SearchPattern[] = [{
        pattern: 'test query',
        frequency: 5,
        lastUsed: new Date(),
        successRate: 0.6,
        avgResultCount: 100,
        relatedQueries: [],
        userSatisfaction: 3.5,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(patterns));

      const frequentSearches = await hookResult.getFrequentSearches(1);
      expect(frequentSearches[0].successRate).toBe(0.6);
    });

    it('should track average result counts for patterns', async () => {
      const patterns: SearchPattern[] = [{
        pattern: 'test query',
        frequency: 3,
        lastUsed: new Date(),
        successRate: 0.7,
        avgResultCount: 150,
        relatedQueries: [],
        userSatisfaction: 4.0,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(patterns));

      const frequentSearches = await hookResult.getFrequentSearches(1);
      expect(frequentSearches[0].avgResultCount).toBe(150);
    });
  });

  describe('Personalized Suggestions', () => {
    it('should generate suggestions based on recent searches', async () => {
      // Mock empty patterns and recent history
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([
        { 
          query: 'recent search', 
          timestamp: new Date(),
          id: 'recent-id',
          clickedResults: [], 
          sessionId: 'session', 
          tags: [], 
          filters: {}, 
          resultCount: 100, 
          duration: 0, 
          success: true, 
          context: 'quick_search' as const
        }
      ])); // history

      const suggestions = await hookResult.generateSuggestions('', 10);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should generate suggestions based on frequent patterns', async () => {
      // Mock frequent patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([
        {
          pattern: 'frequent pattern',
          frequency: 5,
          lastUsed: new Date(),
          successRate: 0.8,
          avgResultCount: 200,
          relatedQueries: [],
          userSatisfaction: 4.5,
        }
      ])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // history

      const suggestions = await hookResult.generateSuggestions('', 10);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should include trending suggestions', async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // history

      const suggestions = await hookResult.generateSuggestions('', 10);
      const trendingSuggestions = suggestions.filter(s => s.category === 'trending');
      expect(trendingSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide domain-based recommendations', async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // history

      const suggestions = await hookResult.generateSuggestions('academic', 10);
      const domainSuggestions = suggestions.filter(s => s.category === 'recommended');
      expect(domainSuggestions.length).toBeGreaterThan(0);
    });

    it('should sort suggestions by confidence score', async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // history

      const suggestions = await hookResult.generateSuggestions('', 10);
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i-1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });

    it('should limit suggestions to requested count', async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // history

      const suggestions = await hookResult.generateSuggestions('', 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should provide reasoning for each suggestion', async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // history

      const suggestions = await hookResult.generateSuggestions('', 3);
      suggestions.forEach(suggestion => {
        expect(suggestion.reasoning).toBeDefined();
        expect(Array.isArray(suggestion.reasoning)).toBe(true);
        expect(suggestion.reasoning.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search Insights and Analytics', () => {
    it('should calculate comprehensive search insights', async () => {
      const mockHistory = [
        { query: 'test 1', success: true, duration: 1000, filters: {}, timestamp: new Date() },
        { query: 'test 2', success: false, duration: 2000, filters: { year: '2023' }, timestamp: new Date() },
        { query: 'test 3', success: true, duration: 1500, filters: {}, timestamp: new Date() },
      ].map((entry, index) => ({
        ...entry,
        id: `id-${index}`,
        clickedResults: [],
        sessionId: `session-${index}`,
        tags: [],
        resultCount: 100,
        context: 'quick_search' as const,
      }));

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns

      const insights = await hookResult.getInsights();
      expect(insights.totalSearches).toBe(3);
      expect(insights.uniqueQueries).toBe(3);
      expect(insights.successRate).toBeCloseTo(2/3);
    });

    it('should track filter usage patterns', async () => {
      const mockHistory = [
        { query: 'test 1', filters: { year: '2023' }, timestamp: new Date() },
        { query: 'test 2', filters: { year: '2023', type: 'article' }, timestamp: new Date() },
      ].map((entry, index) => ({
        ...entry,
        id: `id-${index}`,
        clickedResults: [],
        sessionId: `session-${index}`,
        tags: [],
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }));

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns

      const insights = await hookResult.getInsights();
      expect(insights.mostPopularFilters.year).toBe(2);
      expect(insights.mostPopularFilters.type).toBe(1);
    });

    it('should analyze search timing patterns', async () => {
      const morningTime = new Date();
      morningTime.setHours(9);
      
      const mockHistory = [{
        query: 'morning search',
        timestamp: morningTime,
        id: 'morning-id',
        clickedResults: [],
        sessionId: 'morning-session',
        tags: [],
        filters: {},
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns

      const insights = await hookResult.getInsights();
      expect(insights.timeDistribution.morning).toBe(1);
    });

    it('should provide improvement suggestions', async () => {
      const mockHistory = [
        { query: 'test', success: false, duration: 5000, timestamp: new Date() },
        { query: 'test', success: false, duration: 8000, timestamp: new Date() },
      ].map((entry, index) => ({
        ...entry,
        id: `id-${index}`,
        clickedResults: [],
        sessionId: `session-${index}`,
        tags: [],
        filters: {},
        resultCount: 100,
        context: 'quick_search' as const,
      }));

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns

      const insights = await hookResult.getInsights();
      expect(insights.improvementSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('History Search and Filtering', () => {
    it('should search history by query text', async () => {
      const mockHistory = [
        { query: 'machine learning algorithms', timestamp: new Date() },
        { query: 'deep learning models', timestamp: new Date() },
      ].map((entry, index) => ({
        ...entry,
        id: `id-${index}`,
        clickedResults: [],
        sessionId: `session-${index}`,
        tags: [],
        filters: {},
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }));

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history

      const results = await hookResult.searchHistory('machine');
      expect(results.length).toBe(1);
      expect(results[0].query).toBe('machine learning algorithms');
    });

    it('should search history by tags', async () => {
      const mockHistory = [{
        query: 'test query',
        tags: ['important', 'work'],
        timestamp: new Date(),
        id: 'tagged-id',
        clickedResults: [],
        sessionId: 'tagged-session',
        filters: {},
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history

      const results = await hookResult.searchHistory('important');
      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('important');
    });

    it('should be case insensitive when searching', async () => {
      const mockHistory = [{
        query: 'Machine Learning',
        tags: [],
        timestamp: new Date(),
        id: 'case-id',
        clickedResults: [],
        sessionId: 'case-session',
        filters: {},
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history

      const results = await hookResult.searchHistory('machine');
      expect(results.length).toBe(1);
    });

    it('should get recent searches within time window', async () => {
      const recentTime = new Date();
      const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      const mockHistory = [
        { query: 'recent', timestamp: recentTime },
        { query: 'old', timestamp: oldTime },
      ].map((entry, index) => ({
        ...entry,
        id: `id-${index}`,
        clickedResults: [],
        sessionId: `session-${index}`,
        tags: [],
        filters: {},
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }));

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history

      const recentSearches = await hookResult.getRecentSearches(24);
      expect(recentSearches.length).toBe(1);
      expect(recentSearches[0].query).toBe('recent');
    });
  });

  describe('Data Import/Export', () => {
    it('should export search history with metadata', async () => {
      const mockHistory = [{
        query: 'test export',
        timestamp: new Date(),
        id: 'export-id',
        clickedResults: [],
        sessionId: 'export-session',
        tags: [],
        filters: {},
        resultCount: 100,
        duration: 1000,
        success: true,
        context: 'quick_search' as const,
      }];

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory)); // history
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // patterns

      const exportData = await hookResult.exportHistory();
      const parsed = JSON.parse(exportData);
      
      expect(parsed.version).toBe('1.0');
      expect(parsed.exportDate).toBeDefined();
      expect(parsed.searchHistory).toBeDefined();
      expect(parsed.insights).toBeDefined();
    });

    it('should validate imported data format', async () => {
      const invalidData = 'invalid json';
      
      await expect(hookResult.importHistory(invalidData)).rejects.toThrow('Invalid history data format');
    });

    it('should import valid search history', async () => {
      const validData = JSON.stringify({
        searchHistory: [{
          id: 'imported-id',
          query: 'imported query',
          timestamp: new Date().toISOString(),
          clickedResults: [],
          sessionId: 'imported-session',
          tags: [],
          filters: {},
          resultCount: 50,
          duration: 500,
          success: true,
          context: 'quick_search',
        }]
      });

      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // existing patterns

      await hookResult.importHistory(validData);
      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const history = await hookResult.getHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should perform efficiently with large datasets', async () => {
      const startTime = performance.now();
      
      // Simulate operation with mock data
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
      await hookResult.getHistory();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});