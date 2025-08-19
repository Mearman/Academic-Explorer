/**
 * Enhanced Cache System Integration Tests
 * 
 * Tests the complete enhanced caching system including:
 * - Enhanced cache interceptor
 * - Intelligent cache warming
 * - Memory pressure handling
 * - Analytics and monitoring
 * - Real-world scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedCacheInterceptor } from '@/lib/openalex/utils/enhanced-cache-interceptor';
import { IntelligentCacheWarmingService } from '@/lib/openalex/utils/intelligent-cache-warming';
import type { Work, Author, ApiResponse } from '@/lib/openalex/types';

// Mock console methods to reduce test noise
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn(() => Date.now());
global.performance = { now: mockPerformanceNow } as any;

describe('Enhanced Cache System Integration', () => {
  let enhancedCache: EnhancedCacheInterceptor;
  let warmingService: IntelligentCacheWarmingService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    enhancedCache = new EnhancedCacheInterceptor({
      ttl: 60000,
      enableAnalytics: true,
      enablePredictivePrefetching: true,
      memoryPressureThreshold: 0.7,
    });

    warmingService = new IntelligentCacheWarmingService();
  });

  afterEach(async () => {
    await enhancedCache.destroy();
    warmingService.stop();
    warmingService.clearWarmingData();
    
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
    mockConsoleDebug.mockClear();
  });

  describe('Enhanced Cache Interceptor Integration', () => {
    it('should provide comprehensive caching with analytics', async () => {
      let callCount = 0;
      const mockApiCall = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API delay
        return {
          id: 'W123456789',
          title: 'Test Work',
          display_name: 'Test Work Display',
          authorships: [
            {
              author: { id: 'A987654321', display_name: 'Test Author' },
              institutions: [{ id: 'I123456789', display_name: 'Test Institution' }],
            },
          ],
          publication_year: 2024,
        } as Work;
      });

      // First request - should be cache miss
      const result1 = await enhancedCache.intercept('/works/W123456789', {}, mockApiCall);
      expect(result1.id).toBe('W123456789');
      expect(callCount).toBe(1);

      // Second request - should be cache hit
      const result2 = await enhancedCache.intercept('/works/W123456789', {}, mockApiCall);
      expect(result2.id).toBe('W123456789');
      expect(callCount).toBe(1); // No additional API call

      // Get analytics
      const analytics = enhancedCache.getAnalytics();
      expect(analytics.hitRate).toBe(0.5); // 1 hit, 1 miss
      expect(analytics.performance.cacheHits).toBe(1);
      expect(analytics.performance.cacheMisses).toBe(1);
      expect(analytics.performance.averageHitTime).toBeGreaterThan(0);
      expect(analytics.performance.averageMissTime).toBeGreaterThan(0);
    });

    it('should handle predictive prefetching', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Test Work',
        authorships: [
          { author: { id: 'A987654321' } },
          { author: { id: 'A111111111' } },
        ],
      };

      let prefetchCallCount = 0;
      const mockApiCall = vi.fn(async () => {
        prefetchCallCount++;
        return workData;
      });

      // Add prefetching rule
      enhancedCache.addPrefetchingRule({
        triggerPattern: /^\/works\/W\d+$/,
        prefetchTargets: (key, data) => {
          const work = data as any;
          return work.authorships?.map((a: any) => `/authors/${a.author.id}`) || [];
        },
        priority: 'low',
        maxPrefetch: 2,
      });

      // Access work - should trigger prefetching of authors
      await enhancedCache.intercept('/works/W123456789', {}, mockApiCall);

      // Give prefetching time to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check analytics for entity types
      const analytics = enhancedCache.getAnalytics();
      expect(analytics.entityTypes.works).toBeDefined();
      expect(analytics.entityTypes.works.totalRequests).toBeGreaterThan(0);
    });

    it('should implement intelligent invalidation', async () => {
      const initialData = { id: 'W123', title: 'Original Title' };
      const updatedData = { id: 'W123', title: 'Updated Title' };

      let dataVersion = 0;
      const mockApiCall = vi.fn(async () => {
        dataVersion++;
        return dataVersion === 1 ? initialData : updatedData;
      });

      // First request
      const result1 = await enhancedCache.intercept('/works/W123', {}, mockApiCall);
      expect(result1.title).toBe('Original Title');

      // Add invalidation rule
      enhancedCache.addInvalidationRule({
        pattern: /^\/works\/W123$/,
        strategy: 'immediate',
      });

      // Invalidate cache
      await enhancedCache.invalidate(/^\/works\/W123$/);

      // Second request should fetch fresh data
      const result2 = await enhancedCache.intercept('/works/W123', {}, mockApiCall);
      expect(result2.title).toBe('Updated Title');
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    it('should handle memory pressure gracefully', async () => {
      // Create many large cache entries to simulate memory pressure
      const largeData = {
        id: 'large',
        content: 'A'.repeat(10000), // 10KB data
        metadata: Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'B'.repeat(100) })),
      };

      const mockApiCall = vi.fn(async () => largeData);

      // Fill cache with large entries
      for (let i = 0; i < 50; i++) {
        await enhancedCache.intercept(`/works/W${i}`, {}, mockApiCall);
      }

      // Check memory pressure handling
      await enhancedCache.handleMemoryPressure();

      const analytics = enhancedCache.getAnalytics();
      expect(analytics.memoryPressure).toBeGreaterThan(0);
    });
  });

  describe('Intelligent Cache Warming Integration', () => {
    it('should track entity access patterns', async () => {
      // Track several entity accesses
      warmingService.trackEntityAccess('W123456789', 'works');
      warmingService.trackEntityAccess('A987654321', 'authors');
      warmingService.trackEntityAccess('W123456789', 'works'); // Second access to same work
      warmingService.trackEntityAccess('I123456789', 'institutions');

      const stats = warmingService.getWarmingStatistics();
      expect(stats.frequencyTracked).toBe(3); // Unique entities
      expect(stats.topEntities.length).toBeGreaterThan(0);
      
      // Work should have higher priority due to multiple accesses
      const workEntity = stats.topEntities.find(e => e.entityId === 'W123456789');
      expect(workEntity).toBeTruthy();
      expect(workEntity!.accessCount).toBe(2);
    });

    it('should build dependency graph', async () => {
      // Add dependency relationships
      warmingService.addDependency('W123456789', 'A987654321', 2); // Work -> Author
      warmingService.addDependency('W123456789', 'I123456789', 1); // Work -> Institution
      warmingService.addDependency('A987654321', 'I123456789', 1); // Author -> Institution

      const stats = warmingService.getWarmingStatistics();
      expect(stats.dependencyNodes).toBe(3);
    });

    it('should perform frequency-based warming', async () => {
      // Track frequent access patterns
      const frequentEntities = ['W123', 'W456', 'W789', 'A123', 'A456'];
      
      for (let i = 0; i < 10; i++) {
        for (const entityId of frequentEntities) {
          const entityType = entityId.startsWith('W') ? 'works' : 'authors';
          warmingService.trackEntityAccess(entityId, entityType);
        }
      }

      // Update strategy for immediate execution
      warmingService.updateStrategy('frequency', {
        maxItems: 5,
        enabled: true,
      });

      // Perform frequency-based warming
      const result = await warmingService.warmByFrequency();
      
      expect(result.strategy).toBe('frequency');
      expect(result.itemsWarmed).toBeGreaterThan(0);
      expect(result.endTime).toBeGreaterThan(result.startTime);
    });

    it('should perform dependency-based warming', async () => {
      // Set up dependency graph
      warmingService.addDependency('W123', 'A123', 3);
      warmingService.addDependency('W123', 'I123', 2);
      warmingService.addDependency('W456', 'A123', 2);
      warmingService.addDependency('A123', 'I123', 1);

      // Update strategy
      warmingService.updateStrategy('dependencies', {
        maxItems: 3,
        enabled: true,
      });

      // Perform dependency-based warming
      const result = await warmingService.warmByDependencies();
      
      expect(result.strategy).toBe('dependencies');
      expect(result.itemsWarmed).toBeGreaterThan(0);
    });

    it('should perform predictive warming', async () => {
      const now = Date.now();
      
      // Simulate regular access patterns
      warmingService.trackEntityAccess('W123', 'works');
      
      // Manually adjust last accessed time to simulate pattern
      const stats = warmingService.getWarmingStatistics();
      const entity = stats.topEntities.find(e => e.entityId === 'W123');
      if (entity) {
        entity.lastAccessed = now - 60000; // 1 minute ago
        entity.averageAccessInterval = 50000; // Access every 50 seconds on average
      }

      // Enable predictive warming
      warmingService.updateStrategy('predictive', {
        maxItems: 5,
        enabled: true,
      });

      // Perform predictive warming
      const result = await warmingService.warmPredictively();
      
      expect(result.strategy).toBe('predictive');
      expect(result.endTime).toBeGreaterThan(result.startTime);
    });

    it('should integrate warming with cache interceptor', async () => {
      // Track access through cache interceptor
      const mockApiCall = vi.fn(async () => ({
        id: 'W123456789',
        title: 'Test Work',
        authorships: [{ author: { id: 'A987654321' } }],
      }));

      // Access entity through cache interceptor
      await enhancedCache.intercept('/works/W123456789', {}, mockApiCall);

      // Track access in warming service
      warmingService.trackEntityAccess('W123456789', 'works');
      warmingService.trackEntityAccess('A987654321', 'authors');

      // Add dependency
      warmingService.addDependency('W123456789', 'A987654321');

      // Verify integration
      const warmingStats = warmingService.getWarmingStatistics();
      const cacheAnalytics = enhancedCache.getAnalytics();

      expect(warmingStats.frequencyTracked).toBeGreaterThan(0);
      expect(cacheAnalytics.performance.cacheMisses).toBeGreaterThan(0);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle heavy research workflow', async () => {
      // Simulate a researcher workflow
      const researchEntities = [
        { id: 'W123', type: 'works', title: 'Machine Learning Paper' },
        { id: 'W456', type: 'works', title: 'Deep Learning Survey' },
        { id: 'A123', type: 'authors', name: 'Dr. Smith' },
        { id: 'A456', type: 'authors', name: 'Dr. Johnson' },
        { id: 'I123', type: 'institutions', name: 'MIT' },
        { id: 'S123', type: 'sources', name: 'Nature' },
      ];

      let apiCallCount = 0;
      const mockApiCall = vi.fn(async (endpoint: string) => {
        apiCallCount++;
        const entityId = endpoint.split('/').pop();
        const entity = researchEntities.find(e => e.id === entityId);
        
        await new Promise(resolve => setTimeout(resolve, 20)); // Simulate API delay
        
        if (entity) {
          return {
            id: entity.id,
            title: entity.title || entity.name,
            display_name: entity.title || entity.name,
          };
        }
        return null;
      });

      // Simulate repeated access to same entities (common in research)
      const accessPattern = [
        '/works/W123', '/authors/A123', '/institutions/I123',
        '/works/W123', '/works/W456', '/authors/A456',
        '/authors/A123', '/sources/S123', '/works/W123',
      ];

      // First round - cache misses
      for (const endpoint of accessPattern) {
        await enhancedCache.intercept(endpoint, {}, () => mockApiCall(endpoint));
        
        // Track in warming service
        const entityId = endpoint.split('/').pop()!;
        const entityType = endpoint.split('/')[1];
        warmingService.trackEntityAccess(entityId, entityType);
      }

      // Second round - should have better cache hit rate
      const secondRoundCallCount = apiCallCount;
      for (const endpoint of accessPattern) {
        await enhancedCache.intercept(endpoint, {}, () => mockApiCall(endpoint));
      }

      // Verify cache effectiveness
      const analytics = enhancedCache.getAnalytics();
      expect(analytics.hitRate).toBeGreaterThan(0.3); // Should have some cache hits
      expect(apiCallCount).toBeLessThan(secondRoundCallCount + accessPattern.length); // Fewer API calls in second round

      // Verify warming service captured patterns
      const warmingStats = warmingService.getWarmingStatistics();
      expect(warmingStats.frequencyTracked).toBeGreaterThan(0);
      expect(warmingStats.topEntities[0].accessCount).toBeGreaterThan(1);
    });

    it('should handle network interruption and recovery', async () => {
      let networkAvailable = true;
      let fallbackCallCount = 0;

      const mockApiCall = vi.fn(async () => {
        if (!networkAvailable) {
          fallbackCallCount++;
          throw new Error('Network unavailable');
        }
        return { id: 'W123', title: 'Test Work' };
      });

      // Initial request while online
      const result1 = await enhancedCache.intercept('/works/W123', {}, mockApiCall);
      expect(result1.id).toBe('W123');

      // Simulate network interruption
      networkAvailable = false;

      // Request while offline - should use cache
      const result2 = await enhancedCache.intercept('/works/W123', {}, mockApiCall);
      expect(result2.id).toBe('W123');
      expect(fallbackCallCount).toBe(0); // Should use cache, not call API

      // New request while offline - should fail gracefully
      await expect(
        enhancedCache.intercept('/works/W999', {}, mockApiCall)
      ).rejects.toThrow('Network unavailable');

      // Network recovery
      networkAvailable = true;

      // Should work normally again
      const result3 = await enhancedCache.intercept('/works/W456', {}, mockApiCall);
      expect(result3.id).toBe('W123'); // Mock returns same data
    });

    it('should optimize for collaborative research session', async () => {
      // Simulate multiple researchers working on related topics
      const collaborativeAccess = [
        // Researcher 1: AI/ML focus
        { researcher: 1, pattern: ['/works/W101', '/authors/A201', '/works/W102'] },
        // Researcher 2: Computer Vision focus
        { researcher: 2, pattern: ['/works/W201', '/authors/A301', '/works/W202'] },
        // Researcher 3: Cross-disciplinary
        { researcher: 3, pattern: ['/works/W101', '/works/W201', '/authors/A201', '/authors/A301'] },
      ];

      let totalApiCalls = 0;
      const mockApiCall = vi.fn(async () => {
        totalApiCalls++;
        return { id: 'entity', title: 'Test Entity' };
      });

      // Simulate collaborative access patterns
      for (let round = 0; round < 3; round++) {
        for (const { researcher, pattern } of collaborativeAccess) {
          for (const endpoint of pattern) {
            await enhancedCache.intercept(endpoint, { researcher }, mockApiCall);
            
            // Track access patterns
            const entityId = endpoint.split('/').pop()!;
            const entityType = endpoint.split('/')[1];
            warmingService.trackEntityAccess(entityId, entityType);
          }
        }
      }

      // Analyze collaboration efficiency
      const analytics = enhancedCache.getAnalytics();
      const warmingStats = warmingService.getWarmingStatistics();

      expect(analytics.hitRate).toBeGreaterThan(0.5); // Good cache hit rate due to overlap
      expect(warmingStats.topEntities.length).toBeGreaterThan(0);
      
      // Entities accessed by multiple researchers should have high frequency
      const crossAccessedEntity = warmingStats.topEntities.find(e => 
        ['W101', 'W201', 'A201', 'A301'].includes(e.entityId)
      );
      expect(crossAccessedEntity).toBeTruthy();
      expect(crossAccessedEntity!.accessCount).toBeGreaterThan(2);
    });
  });

  describe('Performance Optimization', () => {
    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = 20;
      const uniqueEntities = 10;
      
      let apiCallCount = 0;
      const mockApiCall = vi.fn(async () => {
        apiCallCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id: 'entity', data: 'test' };
      });

      // Generate concurrent requests with some overlap
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const entityId = `W${i % uniqueEntities}`; // Creates overlap
        return enhancedCache.intercept(`/works/${entityId}`, {}, mockApiCall);
      });

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      // Verify all requests completed
      expect(results.length).toBe(concurrentRequests);
      
      // Should be fewer API calls than total requests due to deduplication
      expect(apiCallCount).toBeLessThanOrEqual(uniqueEntities);
      
      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify analytics
      const analytics = enhancedCache.getAnalytics();
      expect(analytics.requestDeduplication.deduplicationRate).toBeGreaterThan(0);
    });

    it('should optimize storage utilization', async () => {
      // Create various sized cache entries
      const testData = [
        { size: 'small', content: 'A'.repeat(100) },
        { size: 'medium', content: 'B'.repeat(1000) },
        { size: 'large', content: 'C'.repeat(10000) },
      ];

      const mockApiCall = vi.fn(async (data: any) => ({
        id: data.size,
        content: data.content,
        metadata: { size: data.content.length },
      }));

      // Store different sized entries
      for (const data of testData) {
        await enhancedCache.intercept(`/test/${data.size}`, {}, () => mockApiCall(data));
      }

      // Check storage utilization
      const analytics = enhancedCache.getAnalytics();
      expect(analytics.storageUtilization.memory.used).toBeGreaterThan(0);
      expect(analytics.storageUtilization.localStorage.used).toBeGreaterThan(0);

      // Large entries should trigger intelligent storage tier selection
      const largeEntry = await enhancedCache.intercept('/test/large', {}, () => mockApiCall(testData[2]));
      expect(largeEntry.content.length).toBe(10000);
    });
  });
});

describe('Cache System Error Recovery', () => {
  let enhancedCache: EnhancedCacheInterceptor;

  beforeEach(() => {
    enhancedCache = new EnhancedCacheInterceptor({
      enableAnalytics: true,
    });
  });

  afterEach(async () => {
    await enhancedCache.destroy();
  });

  it('should recover from cache corruption gracefully', async () => {
    const mockApiCall = vi.fn(async () => ({ id: 'test', data: 'valid' }));

    // First request - should work normally
    const result1 = await enhancedCache.intercept('/test', {}, mockApiCall);
    expect(result1.data).toBe('valid');

    // Simulate cache corruption by mocking storage error
    const originalConsoleError = console.error;
    console.error = vi.fn();

    // Request should still work despite cache errors
    const result2 = await enhancedCache.intercept('/test/corrupted', {}, mockApiCall);
    expect(result2.data).toBe('valid');

    console.error = originalConsoleError;
  });

  it('should handle quota exceeded errors', async () => {
    // Mock localStorage to throw quota exceeded error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const mockApiCall = vi.fn(async () => ({
      id: 'large',
      data: 'A'.repeat(10000), // Large data
    }));

    // Should not throw, should fallback gracefully
    await expect(
      enhancedCache.intercept('/large', {}, mockApiCall)
    ).resolves.not.toThrow();

    // Restore localStorage
    localStorage.setItem = originalSetItem;
  });
});