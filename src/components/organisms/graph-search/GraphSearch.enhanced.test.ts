/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityGraphVertex } from '@/types/entity-graph';

import {
  FuzzySearchEngine,
  AdvancedSearchFilters,
  SearchResultWithScore,
  GraphSearchOptions,
  createAdvancedGraphSearch,
  fuzzySearch,
  filterByEntityType,
  filterByVisitStatus,
  filterByCitationRange,
  filterByDate,
  sortSearchResults,
  highlightSearchTerm,
  buildSearchIndex,
  SearchIndex,
} from './graph-search-enhanced';

// Mock test data
const mockVertices: EntityGraphVertex[] = [
  {
    id: 'W2741809807',
    displayName: 'Machine Learning for Citation Networks',
    entityType: EntityType.WORK,
    directlyVisited: true,
    firstSeen: '2024-01-01T00:00:00Z',
    lastVisited: '2024-01-01T10:00:00Z',
    visitCount: 5,
    encounters: [],
    encounterStats: {
      totalEncounters: 5,
      searchResultCount: 0,
      relatedEntityCount: 0,
    },
    metadata: {
      citedByCount: 250,
      url: 'https://openalex.org/W2741809807',
      publicationYear: 2020,
    },
  },
  {
    id: 'A2058174099',
    displayName: 'John Smith',
    entityType: EntityType.AUTHOR,
    directlyVisited: false,
    firstSeen: '2024-01-01T00:00:00Z',
    visitCount: 0,
    encounters: [],
    encounterStats: {
      totalEncounters: 0,
      searchResultCount: 0,
      relatedEntityCount: 0,
    },
    metadata: {
      citedByCount: 1500,
      url: 'https://openalex.org/A2058174099',
    },
  },
  {
    id: 'W3045678901',
    displayName: 'Deep Neural Networks in Scientific Research',
    entityType: EntityType.WORK,
    directlyVisited: true,
    firstSeen: '2024-01-01T00:00:00Z',
    lastVisited: '2024-01-01T11:00:00Z',
    visitCount: 3,
    encounters: [],
    encounterStats: {
      totalEncounters: 3,
      searchResultCount: 0,
      relatedEntityCount: 0,
    },
    metadata: {
      citedByCount: 89,
      url: 'https://openalex.org/W3045678901',
      publicationYear: 2021,
    },
  },
  {
    id: 'S1234567890',
    displayName: 'Nature Machine Intelligence',
    entityType: EntityType.SOURCE,
    directlyVisited: false,
    firstSeen: '2024-01-01T00:00:00Z',
    visitCount: 0,
    encounters: [],
    encounterStats: {
      totalEncounters: 0,
      searchResultCount: 0,
      relatedEntityCount: 0,
    },
    metadata: {
      citedByCount: 5000,
      url: 'https://openalex.org/S1234567890',
    },
  },
  {
    id: 'I1234567890',
    displayName: 'Stanford University',
    entityType: EntityType.INSTITUTION,
    directlyVisited: true,
    firstSeen: '2024-01-01T00:00:00Z',
    lastVisited: '2024-01-01T12:00:00Z',
    visitCount: 1,
    encounters: [],
    encounterStats: {
      totalEncounters: 1,
      searchResultCount: 0,
      relatedEntityCount: 0,
    },
    metadata: {
      citedByCount: 25000,
      url: 'https://openalex.org/I1234567890',
    },
  },
];

describe('Enhanced Graph Search', () => {
  describe('Fuzzy Search Engine', () => {
    it('should find exact matches with high scores', () => {
      const results = fuzzySearch(mockVertices, 'Machine Learning');
      
      expect(results).toHaveLength(1);
      expect(results[0].vertex.id).toBe('W2741809807');
      expect(results[0].score).toBeGreaterThan(0.8);
      expect(results[0].matchType).toBe('exact');
    });

    it('should find partial matches with lower scores', () => {
      const results = fuzzySearch(mockVertices, 'Learning');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      const machineResult = results.find(r => r.vertex.id === 'W2741809807');
      expect(machineResult).toBeDefined();
      expect(machineResult!.score).toBeGreaterThan(0.5);
    });

    it('should handle typos with fuzzy matching', () => {
      const results = fuzzySearch(mockVertices, 'Machien Lernign', {
        threshold: 0.3,
        enableFuzzy: true,
      });
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      const machineResult = results.find(r => r.vertex.id === 'W2741809807');
      expect(machineResult).toBeDefined();
      expect(machineResult!.matchType).toBe('fuzzy');
    });

    it('should search across multiple fields', () => {
      const results = fuzzySearch(mockVertices, 'openalex.org', {
        searchFields: ['displayName', 'metadata.url'],
      });
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      const urlResult = results.find(r => r.vertex.metadata.url?.includes('openalex.org'));
      expect(urlResult).toBeDefined();
      expect(urlResult!.matchType).toBe('metadata');
    });

    it('should respect search thresholds', () => {
      const strictResults = fuzzySearch(mockVertices, 'xyz', { threshold: 0.8 });
      const lenientResults = fuzzySearch(mockVertices, 'xyz', { threshold: 0.1 });
      
      expect(strictResults.length).toBeLessThanOrEqual(lenientResults.length);
    });

    it('should limit result count', () => {
      const results = fuzzySearch(mockVertices, 'a', { maxResults: 2 });
      
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter by entity type', () => {
      const workVertices = filterByEntityType(mockVertices, ['work' as EntityType]);
      
      expect(workVertices).toHaveLength(2);
      expect(workVertices.every(v => v.entityType === EntityType.WORK)).toBe(true);
    });

    it('should filter by multiple entity types', () => {
      const authorAndSourceVertices = filterByEntityType(mockVertices, ['author' as EntityType, 'source' as EntityType]);
      
      expect(authorAndSourceVertices).toHaveLength(2);
      expect(authorAndSourceVertices.some(v => v.entityType === EntityType.AUTHOR)).toBe(true);
      expect(authorAndSourceVertices.some(v => v.entityType === EntityType.SOURCE)).toBe(true);
    });

    it('should filter by visit status', () => {
      const visitedVertices = filterByVisitStatus(mockVertices, 'visited');
      const unvisitedVertices = filterByVisitStatus(mockVertices, 'unvisited');
      
      expect(visitedVertices.every(v => v.directlyVisited)).toBe(true);
      expect(unvisitedVertices.every(v => !v.directlyVisited)).toBe(true);
      expect(visitedVertices.length + unvisitedVertices.length).toBe(mockVertices.length);
    });

    it('should filter by citation count range', () => {
      const lowCitationVertices = filterByCitationRange(mockVertices, { min: 0, max: 100 });
      const highCitationVertices = filterByCitationRange(mockVertices, { min: 1000 });
      
      expect(lowCitationVertices.every(v => (v.metadata.citedByCount || 0) <= 100)).toBe(true);
      expect(highCitationVertices.every(v => (v.metadata.citedByCount || 0) >= 1000)).toBe(true);
    });

    it('should filter by date range', () => {
      const recentVertices = filterByDate(mockVertices, { from: '2021-01-01' });
      const olderVertices = filterByDate(mockVertices, { to: '2020-12-31' });
      
      expect(recentVertices.every(v => {
        const year = v.metadata.publicationYear || 0;
        return year >= 2021;
      })).toBe(true);
      
      expect(olderVertices.every(v => {
        const year = v.metadata.publicationYear || 0;
        return year <= 2020;
      })).toBe(true);
    });
  });

  describe('Search Index', () => {
    let searchIndex: SearchIndex;

    beforeEach(() => {
      searchIndex = buildSearchIndex(mockVertices);
    });

    it('should build comprehensive search index', () => {
      expect(searchIndex.termFrequency.size).toBeGreaterThan(0);
      expect(searchIndex.documentFrequency.size).toBeGreaterThan(0);
      expect(searchIndex.vertexTerms.size).toBe(mockVertices.length);
    });

    it('should calculate TF-IDF scores correctly', () => {
      const engine = new FuzzySearchEngine(mockVertices);
      const results = engine.searchWithTfIdf('machine learning');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeTypeOf('number');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should support incremental index updates', () => {
      const engine = new FuzzySearchEngine(mockVertices.slice(0, 2));
      const initialSize = engine.getIndexSize();
      
      engine.addToIndex(mockVertices[2]);
      
      expect(engine.getIndexSize()).toBeGreaterThan(initialSize);
    });

    it('should support index removal', () => {
      const engine = new FuzzySearchEngine(mockVertices);
      const initialSize = engine.getIndexSize();
      
      engine.removeFromIndex('W2741809807');
      
      expect(engine.getIndexSize()).toBeLessThan(initialSize);
    });
  });

  describe('Result Sorting and Ranking', () => {
    it('should sort by relevance score by default', () => {
      const results = fuzzySearch(mockVertices, 'machine');
      
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should sort by citation count', () => {
      const results = sortSearchResults(
        mockVertices.map(v => ({ vertex: v, score: 1, matchType: 'exact' as const })),
        'citationCount'
      );
      
      for (let i = 0; i < results.length - 1; i++) {
        const currentCitations = results[i].vertex.metadata.citedByCount || 0;
        const nextCitations = results[i + 1].vertex.metadata.citedByCount || 0;
        expect(currentCitations).toBeGreaterThanOrEqual(nextCitations);
      }
    });

    it('should sort by visit count', () => {
      const results = sortSearchResults(
        mockVertices.map(v => ({ vertex: v, score: 1, matchType: 'exact' as const })),
        'visitCount'
      );
      
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].vertex.visitCount).toBeGreaterThanOrEqual(results[i + 1].vertex.visitCount);
      }
    });

    it('should sort alphabetically', () => {
      const results = sortSearchResults(
        mockVertices.map(v => ({ vertex: v, score: 1, matchType: 'exact' as const })),
        'alphabetical'
      );
      
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].vertex.displayName.localeCompare(results[i + 1].vertex.displayName)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Search Highlighting', () => {
    it('should highlight exact matches', () => {
      const highlighted = highlightSearchTerm('Machine Learning for Citation Networks', 'Machine Learning');
      
      expect(highlighted).toContain('<mark>');
      expect(highlighted).toContain('</mark>');
      expect(highlighted).toContain('Machine Learning');
    });

    it('should highlight partial matches', () => {
      const highlighted = highlightSearchTerm('Machine Learning', 'Learn');
      
      expect(highlighted).toContain('<mark>Learn</mark>');
    });

    it('should handle case-insensitive highlighting', () => {
      const highlighted = highlightSearchTerm('Machine Learning', 'machine');
      
      expect(highlighted).toContain('<mark>Machine</mark>');
    });

    it('should handle multiple matches', () => {
      const highlighted = highlightSearchTerm('Machine Learning Machine', 'Machine');
      
      const matches = (highlighted.match(/<mark>Machine<\/mark>/g) || []).length;
      expect(matches).toBe(2);
    });
  });

  describe('Advanced Search Combinations', () => {
    it('should combine search query with filters', () => {
      const filters: AdvancedSearchFilters = {
        entityTypes: ['work' as EntityType],
        visitStatus: 'visited',
        citationRange: { min: 100 },
      };

      const engine = createAdvancedGraphSearch(mockVertices);
      const results = engine.search('machine', { filters });
      
      expect(results.every(r => r.vertex.entityType === EntityType.WORK)).toBe(true);
      expect(results.every(r => r.vertex.directlyVisited)).toBe(true);
      expect(results.every(r => (r.vertex.metadata.citedByCount || 0) >= 100)).toBe(true);
    });

    it('should handle empty search with filters only', () => {
      const filters: AdvancedSearchFilters = {
        entityTypes: ['author' as EntityType],
      };

      const engine = createAdvancedGraphSearch(mockVertices);
      const results = engine.search('', { filters });
      
      expect(results.every(r => r.vertex.entityType === EntityType.AUTHOR)).toBe(true);
    });

    it('should support search suggestions', () => {
      const engine = createAdvancedGraphSearch(mockVertices);
      const suggestions = engine.getSuggestions('mach');
      
      expect(suggestions).toContain('machine');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should support search history', () => {
      const engine = createAdvancedGraphSearch(mockVertices);
      
      engine.search('machine learning');
      engine.search('neural networks');
      
      const history = engine.getSearchHistory();
      
      expect(history).toContain('machine learning');
      expect(history).toContain('neural networks');
      expect(history).toHaveLength(2);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockVertices[0],
        id: `vertex-${i}`,
        displayName: `Test Vertex ${i}`,
      }));

      const start = performance.now();
      const results = fuzzySearch(largeDataset, 'Test Vertex');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(results.length).toBeGreaterThan(0);
    });

    it('should debounce rapid search queries', async () => {
      const onSearchCallback = vi.fn();
      const engine = createAdvancedGraphSearch(mockVertices, {
        debounceMs: 100,
        onSearch: onSearchCallback,
      });

      // Rapid fire searches
      engine.search('a');
      engine.search('ab');
      engine.search('abc');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only call the callback once with the final query
      expect(onSearchCallback).toHaveBeenCalledTimes(1);
      expect(onSearchCallback).toHaveBeenCalledWith('abc', expect.any(Array));
    });

    it('should limit memory usage with result caching', () => {
      const engine = createAdvancedGraphSearch(mockVertices, {
        cacheSize: 2,
      });

      engine.search('query1');
      engine.search('query2');
      engine.search('query3'); // Should evict query1 from cache

      expect(engine.getCacheSize()).toBe(2);
      expect(engine.getCacheKeys()).toContain('query2');
      expect(engine.getCacheKeys()).toContain('query3');
      expect(engine.getCacheKeys()).not.toContain('query1');
    });
  });
});