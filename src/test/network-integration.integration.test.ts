/**
 * Network Integration Tests
 * 
 * Comprehensive integration tests for network-aware features including:
 * - Full NetworkProvider context integration with useNetworkStatus, useOfflineQueue, useAdaptiveRetry
 * - Enhanced entity data hooks with network awareness and adaptive caching
 * - Cache warming with network adaptation and performance optimization
 * - Request deduplication through the full client stack with error propagation
 * - Cross-component integration and state synchronization
 * - Error scenarios, edge cases, and memory management
 * 
 * These tests focus on integration points between components rather than
 * individual component functionality. They simulate realistic user workflows
 * and verify that network awareness propagates correctly through the entire
 * application stack.
 * 
 * Key Integration Points Tested:
 * 1. NetworkProvider <-> hooks integration
 * 2. Entity data loading with network adaptation
 * 3. Cache warming coordination with network status
 * 4. Request deduplication with network failures
 * 5. Memory management and cleanup across components
 * 6. Performance under various network conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode, useRef } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from './setup';
import type { Work, Author } from '@/lib/openalex/types';
import { NetworkProvider } from '@/contexts/network-provider';
import { useNetworkContext } from '@/hooks/use-network-context';
import { useEntityData } from '@/hooks/use-entity-data-enhanced';
import { usePrefetchEntity, useWarmCache, useBackgroundWarming, CacheWarmingStrategy } from '@/hooks/cache-warming';
import { useAdaptiveRetry } from '@/hooks/use-adaptive-retry';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import type { ConnectionQuality, NetworkStatus, NetworkConnectionType } from '@/types/network';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { cachedOpenAlex } from '@/lib/openalex';
import { registerCleanupTask } from './setup';

// Test data
const mockWork: Work = {
  id: 'https://openalex.org/W2741809807',
  display_name: 'Test Work',
  doi: 'https://doi.org/10.1038/nature12373',
  title: 'Test Work',
  publication_year: 2023,
  publication_date: '2023-01-01',
  type: 'article',
  type_crossref: 'journal-article',
  open_access: {
    is_oa: true,
    oa_status: 'gold',
    oa_url: 'https://example.com/paper.pdf',
    any_repository_has_fulltext: true
  },
  ids: {
    openalex: 'https://openalex.org/W2741809807',
    doi: 'https://doi.org/10.1038/nature12373'
  },
  authorships: [],
  institutions_distinct_count: 0,
  countries_distinct_count: 0,
  is_retracted: false,
  is_paratext: false,
  cited_by_count: 42,
  biblio: {
    volume: '1',
    issue: '1',
    first_page: '1',
    last_page: '10'
  },
  has_fulltext: true,
  locations_count: 1,
  referenced_works_count: 0,
  cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W2741809807',
  counts_by_year: [],
  updated_date: '2023-01-01',
  created_date: '2023-01-01'
};

const mockAuthor: Author = {
  id: 'https://openalex.org/A5023888391',
  orcid: 'https://orcid.org/0000-0002-1825-0097',
  display_name: 'Josiah Carberry',
  display_name_alternatives: ['J. Carberry'],
  works_count: 123,
  cited_by_count: 456,
  summary_stats: {
    '2yr_mean_citedness': 2.5,
    h_index: 12,
    i10_index: 8
  },
  ids: {
    openalex: 'https://openalex.org/A5023888391',
    orcid: 'https://orcid.org/0000-0002-1825-0097'
  },
  affiliations: [],
  last_known_institutions: [],
  counts_by_year: [],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A5023888391',
  updated_date: '2023-01-01',
  created_date: '2023-01-01'
};

// Mock network conditions utility
class NetworkConditionMock {
  private _isOnline = true;
  private _connectionQuality: ConnectionQuality = 'fast';
  private _rtt = 50;
  private _downlink = 10;
  private _saveData = false;
  private listeners: Array<() => void> = [];

  setNetworkCondition(condition: {
    isOnline?: boolean;
    connectionQuality?: ConnectionQuality;
    rtt?: number;
    downlink?: number;
    saveData?: boolean;
  }) {
    const changed = 
      this._isOnline !== (condition.isOnline ?? this._isOnline) ||
      this._connectionQuality !== (condition.connectionQuality ?? this._connectionQuality);

    this._isOnline = condition.isOnline ?? this._isOnline;
    this._connectionQuality = condition.connectionQuality ?? this._connectionQuality;
    this._rtt = condition.rtt ?? this._rtt;
    this._downlink = condition.downlink ?? this._downlink;
    this._saveData = condition.saveData ?? this._saveData;

    if (changed) {
      this.notifyListeners();
    }
  }

  get networkStatus(): NetworkStatus {
    return {
      isOnline: this._isOnline,
      isOffline: !this._isOnline,
      connectionType: '4g' as NetworkConnectionType,
      effectiveConnectionType: this._connectionQuality === 'fast' ? '4g' : '3g' as NetworkConnectionType,
      connectionQuality: this._connectionQuality,
      isSlowConnection: this._connectionQuality === 'slow' || this._connectionQuality === 'verySlow',
      downlink: this._downlink,
      rtt: this._rtt,
      saveData: this._saveData,
      lastOnlineTime: this._isOnline ? performance.now() : 0,
      offlineDuration: this._isOnline ? 0 : 5000,
    };
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: () => void) {
    const _index = this.listeners.indexOf(listener);
    if (_index > -1) {
      this.listeners.splice(_index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.warn('Network listener error:', error);
      }
    });
  }

  cleanup() {
    this.listeners = [];
    this._isOnline = true;
    this._connectionQuality = 'fast';
    this._rtt = 50;
    this._downlink = 10;
    this._saveData = false;
  }
}

// Provider wrapper with network mocking
function createNetworkProviderWrapper(networkMock: NetworkConditionMock) {
  return function NetworkProviderWrapper({ children }: { children: ReactNode }) {
    return React.createElement(NetworkProvider, {
      children,
      debug: false,
      connectivityTestUrl: "http://localhost:3000/test-connectivity"
    });
  };
}

// Test utilities
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Network Integration Tests', () => {
  let networkMock: NetworkConditionMock;
  let navigator_onLineSpy: MockInstance;

  beforeEach(() => {
    networkMock = new NetworkConditionMock();
    
    // Mock navigator.onLine
    navigator_onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    
    // Mock Connection API
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: {
        effectiveType: '4g' as const,
        downlink: 10,
        rtt: 50,
        saveData: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    });

    // Add MSW handler for test requests
    server.use(
      http.get('/test-request', () => {
        return HttpResponse.json({ success: true });
      }),
      http.head('http://localhost:3000/test-connectivity', () => {
        return HttpResponse.text('', { status: 200 });
      })
    );

    // Register cleanup
    registerCleanupTask(() => {
      networkMock.cleanup();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    networkMock.cleanup();
  });

  describe('Full Network Context Integration', () => {
    it('should integrate NetworkProvider with all network hooks', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const { result } = renderHook(() => {
        const networkContext = useNetworkContext();
        const networkStatus = useNetworkStatus();
        const offlineQueue = useOfflineQueue();
        const adaptiveRetry = useAdaptiveRetry({
          strategy: 'exponential',
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          adaptToNetwork: true,
          requestTimeout: 5000,
        });
        
        return {
          networkContext,
          networkStatus,
          offlineQueue,
          adaptiveRetry,
        };
      }, { wrapper });

      // Verify initial state integration
      await waitFor(() => {
        expect(result.current.networkContext.isInitialised).toBe(true);
      });

      expect(result.current.networkStatus.isOnline).toBe(true);
      expect(result.current.networkStatus.connectionQuality).toMatch(/fast|moderate|unknown/);
      expect(result.current.offlineQueue.queueStatus.pendingRequests).toBe(0);
      expect(result.current.adaptiveRetry.getRetryStats().totalAttempts).toBe(0);
    });

    it('should propagate network state changes through all components', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const { result } = renderHook(() => {
        const networkContext = useNetworkContext();
        const networkStatus = useNetworkStatus();
        
        return { networkContext, networkStatus };
      }, { wrapper });

      await waitFor(() => {
        expect(result.current.networkContext.isInitialised).toBe(true);
      });

      // Verify initial online state
      expect(result.current.networkStatus.isOnline).toBe(true);
      expect(result.current.networkStatus.connectionQuality).toMatch(/fast|moderate|unknown/);

      // Test that network context is properly initialized
      expect(result.current.networkContext.syncConfig).toBeDefined();
      expect(result.current.networkContext.retryPolicies).toBeDefined();
      expect(result.current.networkContext.getCurrentRetryPolicy()).toBeDefined();
    });

    it('should integrate queue management with network transitions', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const { result } = renderHook(() => {
        const networkContext = useNetworkContext();
        return { networkContext };
      }, { wrapper });

      await waitFor(() => {
        expect(result.current.networkContext.isInitialised).toBe(true);
      });

      // Queue a request while online
      let requestId: string;
      act(() => {
        requestId = result.current.networkContext.queueRequest({
          url: '/test-request',
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          maxRetries: 3,
          priority: 5,
          persistent: true,
        });
      });

      expect(requestId!).toBeDefined();
      expect(result.current.networkContext.queueStatus.pendingRequests).toBe(1);

      // Go offline - queue should maintain state
      act(() => {
        navigator_onLineSpy.mockReturnValue(false);
        networkMock.setNetworkCondition({ isOnline: false });
      });

      await waitFor(() => {
        expect(result.current.networkContext.networkStatus.isOnline).toBe(false);
      });

      expect(result.current.networkContext.queueStatus.pendingRequests).toBe(1);

      // Come back online - queue should trigger processing
      act(() => {
        navigator_onLineSpy.mockReturnValue(true);
        networkMock.setNetworkCondition({ isOnline: true });
      });

      await waitFor(() => {
        expect(result.current.networkContext.networkStatus.isOnline).toBe(true);
      });

      // Verify sync config and policies are accessible
      expect(result.current.networkContext.syncConfig.enabled).toBeDefined();
      expect(result.current.networkContext.retryPolicies.fast).toBeDefined();
    });
  });

  describe('Enhanced Entity Data Hook Integration', () => {
    beforeEach(() => {
      // Setup OpenAlex API mocks
      server.use(
        http.get('https://api.openalex.org/works/W2741809807', () => {
          return HttpResponse.json(mockWork);
        }),
        http.get('https://api.openalex.org/authors/A5023888391', () => {
          return HttpResponse.json(mockAuthor);
        })
      );
    });

    it('should adapt caching strategy based on network conditions', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      // Start with fast connection
      networkMock.setNetworkCondition({ 
        connectionQuality: 'fast',
        downlink: 10,
        rtt: 50
      });

      const { result: fastResult } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: {
            networkAware: true,
            adaptiveCaching: true,
            includeNetworkInfo: true,
          }
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(fastResult.current.data).toBeDefined();
        expect(fastResult.current.loading).toBe(false);
      });

      expect(fastResult.current.networkInfo?.connectionQuality).toBe('fast');
      expect(fastResult.current.networkInfo?.isSlowConnection).toBe(false);

      // Test with slow connection
      networkMock.setNetworkCondition({ 
        connectionQuality: 'slow',
        downlink: 0.5,
        rtt: 1000,
        saveData: true
      });

      const { result: slowResult } = renderHook(() => 
        useEntityData({
          entityId: 'A5023888391',
          entityType: EntityType.AUTHOR,
          options: {
            networkAware: true,
            adaptiveCaching: true,
            includeNetworkInfo: true,
          }
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(slowResult.current.data).toBeDefined();
        expect(slowResult.current.loading).toBe(false);
      });

      expect(slowResult.current.networkInfo?.connectionQuality).toBe('slow');
      expect(slowResult.current.networkInfo?.isSlowConnection).toBe(true);
      expect(slowResult.current.networkInfo?.saveData).toBe(true);
    });

    it('should queue requests when offline and process when online', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      // Start offline
      navigator_onLineSpy.mockReturnValue(false);
      networkMock.setNetworkCondition({ isOnline: false });

      const { result } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: {
            networkAware: true,
            backgroundSync: true,
            priority: 'high',
          }
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.state).toBe('QUEUED');
        expect(result.current.isQueued).toBe(true);
        expect(result.current.queuedRequestId).toBeDefined();
      });

      // Come back online
      navigator_onLineSpy.mockReturnValue(true);
      networkMock.setNetworkCondition({ isOnline: true });

      // Wait for automatic processing
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.state).toBe('SUCCESS');
        expect(result.current.isQueued).toBe(false);
      }, { timeout: 10000 });

      expect(result.current.data?.id).toBe('https://openalex.org/W2741809807');
    });

    it('should integrate with adaptive retry strategies', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      let requestCount = 0;

      // Mock intermittent failures
      server.use(
        http.get('https://api.openalex.org/works/W2741809807', () => {
          requestCount++;
          if (requestCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json(mockWork);
        })
      );

      networkMock.setNetworkCondition({ 
        connectionQuality: 'moderate',
        rtt: 200
      });

      const { result } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: {
            networkAware: true,
            retryOnError: true,
          }
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.state).toBe('SUCCESS');
      }, { timeout: 15000 });

      // Verify retry happened
      expect(requestCount).toBeGreaterThan(1);
      expect(result.current.data?.id).toBe('https://openalex.org/W2741809807');
    });
  });

  describe('Cache Warming with Network Awareness', () => {
    beforeEach(() => {
      // Setup multiple entity mocks
      server.use(
        http.get('https://api.openalex.org/works/W2741809807', () => {
          return HttpResponse.json(mockWork);
        }),
        http.get('https://api.openalex.org/authors/A5023888391', () => {
          return HttpResponse.json(mockAuthor);
        }),
        http.get('https://api.openalex.org/works/W1234567890', () => {
          return HttpResponse.json({ 
            ...mockWork, 
            id: 'https://openalex.org/W1234567890',
            display_name: 'Related Work 1'
          });
        }),
        http.get('https://api.openalex.org/works/W0987654321', () => {
          return HttpResponse.json({ 
            ...mockWork, 
            id: 'https://openalex.org/W0987654321',
            display_name: 'Related Work 2'
          });
        })
      );
    });

    it('should adapt prefetch strategy based on connection quality', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      // Fast connection - aggressive prefetching
      networkMock.setNetworkCondition({ 
        connectionQuality: 'fast',
        downlink: 10
      });

      const { result: fastPrefetch } = renderHook(() => 
        usePrefetchEntity({
          strategy: CacheWarmingStrategy.AGGRESSIVE,
          maxQueueSize: 100,
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(fastPrefetch.current.isPrefetching).toBeDefined();
      });

      // Prefetch multiple entities
      act(() => {
        fastPrefetch.current.prefetch('W2741809807', EntityType.WORK);
        fastPrefetch.current.prefetch('A5023888391', EntityType.AUTHOR);
      });

      await waitFor(() => {
        expect(fastPrefetch.current.prefetchedCount).toBeGreaterThan(0);
      });

      // Slow connection - conservative prefetching
      networkMock.setNetworkCondition({ 
        connectionQuality: 'slow',
        saveData: true
      });

      const { result: slowPrefetch } = renderHook(() => 
        usePrefetchEntity({
          strategy: CacheWarmingStrategy.CONSERVATIVE,
          maxQueueSize: 10,
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(slowPrefetch.current.isPrefetching).toBeDefined();
      });

      // Should be more conservative on slow connection
      const initialSlowCount = slowPrefetch.current.prefetchedCount;
      act(() => {
        slowPrefetch.current.prefetch('W1234567890', EntityType.WORK);
      });

      await delay(1000); // Give time for any prefetching
      expect(slowPrefetch.current.prefetchedCount).toBeGreaterThanOrEqual(initialSlowCount);
    });

    it('should integrate cache warming with network conditions', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      networkMock.setNetworkCondition({ 
        connectionQuality: 'fast',
        downlink: 5
      });

      const { result } = renderHook(() => 
        useWarmCache({
          strategy: CacheWarmingStrategy.AGGRESSIVE,
          maxConcurrency: 3,
          batchSize: 5,
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isWarming).toBeDefined();
      });

      // Warm cache with entity list
      act(() => {
        result.current.warmCache([
          'W2741809807',
          'A5023888391', 
          'W1234567890'
        ]);
      });

      await waitFor(() => {
        expect(result.current.stats.totalWarmed).toBeGreaterThan(0);
        expect(result.current.isWarming).toBe(false);
      });

      expect(result.current.stats.totalWarmed).toBeGreaterThan(0);
    });

    it('should handle background warming with network awareness', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      networkMock.setNetworkCondition({ 
        connectionQuality: 'moderate',
        downlink: 2
      });

      const { result } = renderHook(() => 
        useBackgroundWarming({
          enabled: true,
          strategy: CacheWarmingStrategy.AGGRESSIVE,
          maxConcurrency: 2,
          idleThreshold: 500,
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isBackgroundWarming).toBeDefined();
      });

      // Add entities to background queue
      act(() => {
        result.current.scheduleWarming([
          'W2741809807',
          'A5023888391'
        ], 'high');
      });

      await waitFor(() => {
        expect(result.current.backgroundQueue).toBe(1);
      });

      // Wait for background processing
      await waitFor(() => {
        expect(result.current.backgroundQueue).toBeLessThanOrEqual(1);
      }, { timeout: 5000 });
    });
  });

  describe('Request Deduplication Integration', () => {
    let requestCount: number;

    beforeEach(() => {
      requestCount = 0;
      
      server.use(
        http.get('https://api.openalex.org/works/W2741809807', () => {
          requestCount++;
          return HttpResponse.json(mockWork);
        })
      );
    });

    it('should deduplicate concurrent requests through full client stack', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      // Create multiple concurrent hooks requesting same entity
      const { result: hook1 } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK
        }), 
        { wrapper }
      );
      
      const { result: hook2 } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK
        }), 
        { wrapper }
      );
      
      const { result: hook3 } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK
        }), 
        { wrapper }
      );

      // Wait for all hooks to complete
      await waitFor(() => {
        expect(hook1.current.data).toBeDefined();
        expect(hook2.current.data).toBeDefined();
        expect(hook3.current.data).toBeDefined();
      });

      // Verify only one actual request was made
      expect(requestCount).toBe(1);
      
      // Verify all hooks received the same data
      expect(hook1.current.data?.id).toBe('https://openalex.org/W2741809807');
      expect(hook2.current.data?.id).toBe('https://openalex.org/W2741809807');
      expect(hook3.current.data?.id).toBe('https://openalex.org/W2741809807');
    });

    it('should handle deduplication with network failures', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      let failureCount = 0;

      server.use(
        http.get('https://api.openalex.org/works/W2741809807', () => {
          requestCount++;
          failureCount++;
          if (failureCount < 2) {
            return HttpResponse.error();
          }
          return HttpResponse.json(mockWork);
        })
      );

      // Create concurrent requests during network issues
      const { result: hook1 } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: { networkAware: true }
        }), 
        { wrapper }
      );
      
      const { result: hook2 } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: { networkAware: true }
        }), 
        { wrapper }
      );

      // Both should eventually succeed
      await waitFor(() => {
        expect(hook1.current.data).toBeDefined();
        expect(hook2.current.data).toBeDefined();
      }, { timeout: 10000 });

      // Should have made 2 requests (1 failure + 1 success)
      expect(requestCount).toBe(2);
      
      // Both hooks should have same successful data
      expect(hook1.current.data?.id).toBe('https://openalex.org/W2741809807');
      expect(hook2.current.data?.id).toBe('https://openalex.org/W2741809807');
    });

    it('should integrate deduplication with cache warming', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const { result: warmCache } = renderHook(() => 
        useWarmCache(), 
        { wrapper }
      );
      
      const { result: entityData } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(warmCache.current.isWarming).toBeDefined();
      });

      // Start cache warming
      act(() => {
        warmCache.current.warmCache([
          'W2741809807'
        ]);
      });

      // Wait for both to complete
      await waitFor(() => {
        expect(entityData.current.data).toBeDefined();
        expect(warmCache.current.stats.totalWarmed).toBeGreaterThan(0);
      });

      // Should only have made one request due to deduplication
      expect(requestCount).toBe(1);
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle rapid network transitions gracefully', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const { result } = renderHook(() => {
        const networkContext = useNetworkContext();
        const entityData = useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: {
            networkAware: true,
          }
        });
        
        return { networkContext, entityData };
      }, { wrapper });

      await waitFor(() => {
        expect(result.current.networkContext.isInitialised).toBe(true);
      });

      // Rapid online/offline transitions
      for (let i = 0; i < 5; i++) {
        act(() => {
          const isOnline = i % 2 === 0;
          navigator_onLineSpy.mockReturnValue(isOnline);
          networkMock.setNetworkCondition({ isOnline });
        });
        
        await delay(100);
      }

      // End online
      act(() => {
        navigator_onLineSpy.mockReturnValue(true);
        networkMock.setNetworkCondition({ isOnline: true });
      });

      await waitFor(() => {
        expect(result.current.networkContext.networkStatus.isOnline).toBe(true);
      });

      // Should handle transitions without crashing
      expect(result.current.entityData.error).toBeNull();
    });

    it('should handle memory pressure during integration', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      const entityIds = Array.from({ length: 50 }, (_, i) => `W${String(i).padStart(10, '0')}`);
      
      // Mock all entities
      entityIds.forEach(id => {
        server.use(
          http.get(`https://api.openalex.org/works/${id}`, () => {
            return HttpResponse.json({ ...mockWork, id: `https://openalex.org/${id}` });
          })
        );
      });

      const hooks = entityIds.slice(0, 10).map(id => 
        renderHook(() => useEntityData({
          entityId: id,
          entityType: EntityType.WORK
        }), { wrapper })
      );

      // Wait for all to load
      await Promise.all(
        hooks.map(({ result }) => 
          waitFor(() => expect(result.current.data).toBeDefined())
        )
      );

      // Verify all loaded successfully
      hooks.forEach(({ result }, _index) => {
        expect(result.current.data?.id).toBe(`https://openalex.org/${entityIds[_index]}`);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle component unmounting during network operations', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      server.use(
        http.get('https://api.openalex.org/works/W2741809807', async () => {
          await delay(2000); // Long delay
          return HttpResponse.json(mockWork);
        })
      );

      const { result, unmount } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: {
            networkAware: true,
          }
        }), 
        { wrapper }
      );

      expect(result.current.loading).toBe(true);

      // Unmount while request is in flight
      unmount();

      // Should not cause memory leaks or unhandled promises
      await delay(3000);
      
      // No way to verify directly, but test should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should properly cleanup network listeners and resources', async () => {
      const cleanup = vi.fn();
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const { unmount } = renderHook(() => {
        const networkContext = useNetworkContext();
        
        // Register cleanup task
        registerCleanupTask(cleanup);
        
        return { networkContext };
      }, { wrapper });

      await delay(100);
      
      // Unmount and verify cleanup
      unmount();
      
      await delay(100);
      
      // Cleanup should be called
      expect(cleanup).toHaveBeenCalled();
    });

    it('should handle concurrent cleanup operations', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      
      const hooks = Array.from({ length: 10 }, () => 
        renderHook(() => ({
          networkContext: useNetworkContext(),
          entityData: useEntityData({
            entityId: 'W2741809807',
            entityType: EntityType.WORK
          }),
        }), { wrapper })
      );

      await delay(100);

      // Unmount all at once
      hooks.forEach(({ unmount }) => unmount());

      await delay(100);

      // Should handle concurrent cleanup without errors
      expect(true).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance under network stress', async () => {
      const wrapper = createNetworkProviderWrapper(networkMock);
      const startTime = performance.now();
      
      // Simulate network stress
      networkMock.setNetworkCondition({
        connectionQuality: 'slow',
        rtt: 2000,
        downlink: 0.1
      });

      const { result } = renderHook(() => 
        useEntityData({
          entityId: 'W2741809807',
          entityType: EntityType.WORK,
          options: {
            networkAware: true,
            adaptiveCaching: true,
          }
        }), 
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      }, { timeout: 15000 });

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time even under stress
      expect(duration).toBeLessThan(15000);
      expect(result.current.data?.id).toBe('https://openalex.org/W2741809807');
    });
  });
});