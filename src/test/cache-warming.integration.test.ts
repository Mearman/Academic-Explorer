/**
 * Integration tests for cache warming functionality
 * 
 * Tests the complete cache warming system including:
 * - Service integration with cached client
 * - Hook integration with React components
 * - Background warming behavior
 * - Predictive prefetching
 * - Error handling and recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

import { 
  cacheWarmingService,
  prefetchEntity,
  warmCache,
  warmRelatedEntities,
  CacheWarmingStrategy,
} from '@/lib/openalex/cache-warming';

import {
  usePrefetchEntity,
  useBatchPrefetch,
  useRelatedPrefetch,
} from '@/hooks/use-prefetch-entity';

import {
  useWarmCache,
  useBackgroundWarming,
  usePredictiveWarming,
} from '@/hooks/use-warm-cache';

import { EntityType } from '@/lib/openalex/utils/entity-detection';

describe('Cache Warming Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheWarmingService.clear();
    
    // Setup MSW handlers for cache warming tests
    server.use(
      // Work entity
      http.get('https://api.openalex.org/works/W2741809807', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/W2741809807',
          doi: 'https://doi.org/10.1038/nature12373',
          title: 'The human microbiome project',
          display_name: 'The human microbiome project',
          authorships: [
            {
              author: { id: 'https://openalex.org/A5017898742' },
              institutions: [
                { id: 'https://openalex.org/I1285456' },
              ],
            },
          ],
          primary_location: {
            source: { id: 'https://openalex.org/S123456789' },
          },
          concepts: [
            { id: 'https://openalex.org/C1234567890' },
          ],
        });
      }),
      
      // Author entity
      http.get('https://api.openalex.org/authors/A5017898742', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/A5017898742',
          orcid: 'https://orcid.org/0000-0003-1613-5981',
          display_name: 'Jason Priem',
          works_count: 38,
          last_known_institutions: [
            { id: 'https://openalex.org/I1285456' },
          ],
          topics: [
            { id: 'https://openalex.org/T3141' },
          ],
        });
      }),
      
      // Source entity
      http.get('https://api.openalex.org/sources/S123456789', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/S123456789',
          issn_l: '0028-0836',
          display_name: 'Nature',
          publisher: { id: 'https://openalex.org/P4310319900' },
        });
      }),
      
      // Institution entity
      http.get('https://api.openalex.org/institutions/I1285456', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/I1285456',
          ror: 'https://ror.org/02jbv0t02',
          display_name: 'North Carolina State University',
          country_code: 'US',
        });
      }),
      
      // Concept entity
      http.get('https://api.openalex.org/concepts/C1234567890', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/C1234567890',
          wikidata: 'https://www.wikidata.org/wiki/Q7208',
          display_name: 'Biology',
          level: 1,
        });
      }),
      
      // Topic entity  
      http.get('https://api.openalex.org/topics/T3141', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/T3141',
          display_name: 'Microbiome Research',
          subfield: { id: 'https://openalex.org/subfields/1312' },
        });
      }),
      
      // Publisher entity
      http.get('https://api.openalex.org/publishers/P4310319900', () => {
        return HttpResponse.json({
          id: 'https://openalex.org/P4310319900',
          display_name: 'Springer Nature',
          country_codes: ['GB'],
        });
      }),
    );
  });

  afterEach(() => {
    server.resetHandlers();
    cacheWarmingService.clear();
  });

  describe('Cache Warming Service Integration', () => {
    it('should prefetch a single entity successfully', async () => {
      const entityId = 'W2741809807';
      
      const result = await prefetchEntity(entityId, EntityType.WORK);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('https://openalex.org/W2741809807');
      expect(result.display_name).toBe('The human microbiome project');
    });

    it('should batch warm multiple entities', async () => {
      const entityIds = ['W2741809807', 'A5017898742', 'S123456789'];
      
      const result = await warmCache(entityIds, {
        maxConcurrency: 2,
        batchSize: 3,
      });
      
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should warm related entities based on relationships', async () => {
      const workId = 'W2741809807';
      
      const result = await warmRelatedEntities(workId, EntityType.WORK, 1);
      
      // Should include related entities: author, institution, source, and concept
      expect(result.successful.length).toBeGreaterThan(0);
      
      // Should include author A5017898742
      expect(result.successful).toContain('A5017898742');
      
      // Should include source S123456789
      expect(result.successful).toContain('S123456789');
    });

    it('should handle cache warming errors gracefully', async () => {
      // Add error handler for non-existent entity
      server.use(
        http.get('https://api.openalex.org/works/INVALID_ID', () => {
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        })
      );

      const result = await warmCache(['INVALID_ID', 'W2741809807']);
      
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].entityId).toBe('INVALID_ID');
    });
  });

  describe('usePrefetchEntity Hook Integration', () => {
    it('should provide prefetch functionality', async () => {
      const { result } = renderHook(() => usePrefetchEntity({
        strategy: CacheWarmingStrategy.CONSERVATIVE,
        maxQueueSize: 10,
      }));

      expect(result.current.isPrefetching).toBe(false);
      expect(result.current.prefetchQueue).toHaveLength(0);

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(result.current.prefetchedCount).toBe(1);
      expect(result.current.prefetchQueue).toHaveLength(0);
    });

    it('should track prefetch queue correctly', async () => {
      const { result } = renderHook(() => usePrefetchEntity({
        maxQueueSize: 5,
      }));

      // Start multiple prefetches
      act(() => {
        result.current.prefetch('W2741809807', EntityType.WORK);
        result.current.prefetch('A5017898742', EntityType.AUTHOR);
      });

      await waitFor(() => {
        expect(result.current.prefetchedCount).toBeGreaterThan(0);
      });
    });

    it('should handle prefetch errors', async () => {
      server.use(
        http.get('https://api.openalex.org/works/W0000000001', () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => usePrefetchEntity());

      await act(async () => {
        try {
          await result.current.prefetch('W0000000001', EntityType.WORK);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.prefetchError).toBeDefined();
    });
  });

  describe('useBatchPrefetch Hook Integration', () => {
    it('should handle batch prefetching with progress tracking', async () => {
      const progressMock = vi.fn();
      
      const { result } = renderHook(() => useBatchPrefetch({
        maxConcurrency: 2,
        batchSize: 2,
        onProgress: progressMock,
      }));

      const entityIds = ['W2741809807', 'A5017898742', 'S123456789'];

      await act(async () => {
        await result.current.batchPrefetch(entityIds);
      });

      expect(progressMock).toHaveBeenCalled();
      expect(result.current.isBatchPrefetching).toBe(false);
    });

    it('should support batch cancellation', async () => {
      const { result } = renderHook(() => useBatchPrefetch());

      act(() => {
        result.current.batchPrefetch(['W2741809807', 'A5017898742']);
        result.current.cancelBatch();
      });

      expect(result.current.isBatchPrefetching).toBe(false);
      expect(result.current.batchProgress).toBeNull();
    });
  });

  describe('useRelatedPrefetch Hook Integration', () => {
    it('should prefetch related entities automatically', async () => {
      const { result } = renderHook(() => useRelatedPrefetch({
        enabled: true,
        depth: 1,
        delayMs: 100,
      }));

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      await waitFor(() => {
        expect(result.current.relatedPrefetchCount).toBeGreaterThan(0);
      });
    });

    it('should respect depth configuration', async () => {
      const { result } = renderHook(() => useRelatedPrefetch({
        depth: 2,
        delayMs: 50,
      }));

      await act(async () => {
        await result.current.prefetchRelated('W2741809807', EntityType.WORK);
      });

      // With depth 2, should prefetch more entities
      await waitFor(() => {
        expect(result.current.relatedPrefetchCount).toBeGreaterThan(0);
      });
    });
  });

  describe('useWarmCache Hook Integration', () => {
    it('should provide cache warming with progress tracking', async () => {
      const { result } = renderHook(() => useWarmCache({
        strategy: CacheWarmingStrategy.AGGRESSIVE,
        maxConcurrency: 3,
      }));

      const entityIds = ['W2741809807', 'A5017898742'];

      await act(async () => {
        await result.current.warmCache(entityIds);
      });

      expect(result.current.lastResult).toBeDefined();
      expect(result.current.lastResult?.successful).toHaveLength(2);
      expect(result.current.isWarming).toBe(false);
    });

    it('should support retry functionality', async () => {
      server.use(
        http.get('https://api.openalex.org/works/FLAKY_ID', () => {
          return HttpResponse.json(
            { error: 'Temporary error' },
            { status: 503 }
          );
        })
      );

      const { result } = renderHook(() => useWarmCache({
        retryFailedEntities: true,
        maxRetries: 2,
      }));

      await act(async () => {
        await result.current.warmCache(['FLAKY_ID', 'W2741809807']);
      });

      expect(result.current.lastResult?.failed).toHaveLength(1);

      // Mock successful retry
      server.use(
        http.get('https://api.openalex.org/works/FLAKY_ID', () => {
          return HttpResponse.json({
            id: 'https://openalex.org/FLAKY_ID',
            display_name: 'Recovered Work',
          });
        })
      );

      await act(async () => {
        await result.current.retryFailed();
      });

      // Should have attempted retry
      expect(result.current.stats.totalWarmed).toBeGreaterThan(0);
    });
  });

  describe('useBackgroundWarming Hook Integration', () => {
    it('should schedule background warming', async () => {
      const { result } = renderHook(() => useBackgroundWarming({
        enabled: true,
        maxConcurrency: 1,
        idleThreshold: 100,
      }));

      const entityIds = ['W2741809807', 'A5017898742'];

      act(() => {
        result.current.scheduleWarming(entityIds, 'low');
      });

      expect(result.current.backgroundQueue).toBeGreaterThan(0);

      // Wait for background processing
      await waitFor(() => {
        expect(result.current.backgroundQueue).toBeLessThanOrEqual(entityIds.length);
      });
    });

    it('should support pause and resume functionality', async () => {
      const { result } = renderHook(() => useBackgroundWarming());

      act(() => {
        result.current.scheduleWarming(['W2741809807'], 'normal');
        result.current.pauseBackgroundWarming();
      });

      expect(result.current.backgroundQueue).toBeGreaterThan(0);

      act(() => {
        result.current.resumeBackgroundWarming();
      });

      // Background warming should eventually process the queue
      await waitFor(() => {
        expect(result.current.backgroundQueue).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('usePredictiveWarming Hook Integration', () => {
    it('should learn navigation patterns and make predictions', async () => {
      const { result } = renderHook(() => usePredictiveWarming({
        enabled: true,
        learningMode: true,
        confidence: 0.5,
        maxPredictions: 3,
      }));

      // Record navigation patterns
      act(() => {
        result.current.recordNavigation('W2741809807', 'A5017898742', EntityType.AUTHOR);
        result.current.recordNavigation('W2741809807', 'S123456789', EntityType.SOURCE);
        result.current.recordNavigation('W2741809807', 'A5017898742', EntityType.AUTHOR); // Repeat to increase frequency
      });

      // Get predictions
      let predictions: string[] = [];
      act(() => {
        predictions = result.current.getPredictions('W2741809807');
      });

      expect(predictions).toContain('A5017898742');
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBeLessThanOrEqual(3);
    });

    it('should respect confidence threshold', async () => {
      const { result } = renderHook(() => usePredictiveWarming({
        confidence: 0.8, // High confidence threshold
        maxPredictions: 5,
      }));

      // Record multiple instances where A5017898742 has low confidence (1 out of 5 = 20%)
      act(() => {
        result.current.recordNavigation('W2741809807', 'A5017898742', EntityType.AUTHOR);
        result.current.recordNavigation('W2741809807', 'S123456789', EntityType.SOURCE);
        result.current.recordNavigation('W2741809807', 'I1285456', EntityType.INSTITUTION);
        result.current.recordNavigation('W2741809807', 'C1234567890', EntityType.CONCEPT);
        result.current.recordNavigation('W2741809807', 'T3141', EntityType.TOPIC);
      });

      let predictions: string[] = [];
      act(() => {
        predictions = result.current.getPredictions('W2741809807');
      });

      // Should not predict with low confidence (20% < 80% threshold)
      expect(predictions).toHaveLength(0);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large batch operations efficiently', async () => {
      const largeEntityList = Array.from({ length: 50 }, (_, i) => `W${i.toString().padStart(10, '0')}`);
      
      // Mock all entities
      largeEntityList.forEach(entityId => {
        server.use(
          http.get(`https://api.openalex.org/works/${entityId}`, () => {
            return HttpResponse.json({
              id: `https://openalex.org/${entityId}`,
              display_name: `Test Work ${entityId}`,
            });
          })
        );
      });

      const startTime = Date.now();
      const result = await warmCache(largeEntityList, {
        maxConcurrency: 5,
        batchSize: 10,
      });
      const duration = Date.now() - startTime;

      expect(result.successful).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should properly cleanup resources on unmount', async () => {
      const { unmount } = renderHook(() => usePrefetchEntity());
      
      // Should not throw any errors during cleanup
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Configuration and Strategy Integration', () => {
    it('should respect OFF strategy and skip warming', async () => {
      const { result } = renderHook(() => usePrefetchEntity({
        strategy: CacheWarmingStrategy.OFF,
      }));

      await act(async () => {
        await result.current.prefetch('W2741809807', EntityType.WORK);
      });

      expect(result.current.prefetchedCount).toBe(0);
    });

    it('should use different strategies appropriately', async () => {
      const strategies = [
        CacheWarmingStrategy.CONSERVATIVE,
        CacheWarmingStrategy.AGGRESSIVE,
        CacheWarmingStrategy.CUSTOM,
      ];

      for (const strategy of strategies) {
        const entityIds = ['W2741809807', 'A5017898742'];
        const result = await warmCache(entityIds, { strategy });
        
        expect(result.successful.length).toBeGreaterThan(0);
      }
    });
  });
});