/**
 * Offline-first data access patterns
 * Provides seamless data access that works offline and syncs when online
 */

import React from 'react';

import { useIntelligentOfflineQueue } from '@/hooks/use-intelligent-offline-queue';
import type { IntelligentQueuedRequest } from '@/hooks/use-intelligent-offline-queue';
import { useNetworkStatus } from '@/hooks/use-network-status';

import { db } from './db';

/**
 * Data freshness levels
 */
export type DataFreshness = 'fresh' | 'stale' | 'expired' | 'unknown';

/**
 * Cache strategies for offline-first access
 */
export type CacheStrategy = 
  | 'cache-first'           // Try cache first, fall back to network
  | 'network-first'         // Try network first, fall back to cache
  | 'stale-while-revalidate' // Return cache immediately, update in background
  | 'cache-only'            // Only use cache, never network
  | 'network-only';         // Only use network, never cache

/**
 * Data access options
 */
export interface DataAccessOptions {
  strategy?: CacheStrategy;
  maxAge?: number;          // Maximum age in milliseconds
  timeout?: number;         // Network timeout in milliseconds
  priority?: number;        // Queue priority (1-10)
  persistent?: boolean;     // Whether to persist in offline queue
  background?: boolean;     // Whether to run in background
  retries?: number;         // Number of retries
}

/**
 * Data response with metadata
 */
export interface DataResponse<T> {
  data: T | null;
  error: Error | null;
  freshness: DataFreshness;
  fromCache: boolean;
  timestamp: number;
  etag?: string;
  lastModified?: number;
}

/**
 * Sync status for data items
 */
export interface SyncStatus {
  id: string;
  lastSynced: number;
  pendingChanges: boolean;
  conflictResolution?: 'pending' | 'resolved';
  version: number;
}

/**
 * Get data freshness based on age and max age
 */
function getDataFreshness(timestamp: number, maxAge?: number): DataFreshness {
  if (!timestamp) return 'unknown';
  
  const age = Date.now() - timestamp;
  
  if (!maxAge) return 'fresh';
  
  if (age < maxAge) return 'fresh';
  if (age < maxAge * 2) return 'stale';
  
  return 'expired';
}

/**
 * Offline-first data access class
 */
export class OfflineFirstData {
  private queueManager: ReturnType<typeof useIntelligentOfflineQueue> | null = null;
  private networkStatus: ReturnType<typeof useNetworkStatus> | null = null;

  constructor() {
    // Initialize database
    db.init().catch(console.error);
  }

  /**
   * Set queue manager and network status (for React components)
   */
  setContext(
    queueManager: ReturnType<typeof useIntelligentOfflineQueue>,
    networkStatus: ReturnType<typeof useNetworkStatus>
  ): void {
    this.queueManager = queueManager;
    this.networkStatus = networkStatus;
  }

  /**
   * Get search results with offline-first strategy
   */
  async getSearchResults(
    query: string,
    filters?: Record<string, unknown>,
    options: DataAccessOptions = {}
  ): Promise<DataResponse<unknown[]>> {
    const {
      strategy = 'stale-while-revalidate',
      maxAge = 24 * 60 * 60 * 1000, // 24 hours
      timeout = 10000,
      priority = 5,
      persistent = false,
    } = options;

    try {
      // Always try cache first for search results
      const cached = await db.getSearchResults(query, filters, maxAge);
      const freshness = cached ? getDataFreshness(cached.timestamp, maxAge) : 'unknown';

      // Handle cache-only strategy
      if (strategy === 'cache-only') {
        return {
          data: cached?.results || null,
          error: cached ? null : new Error('No cached data available'),
          freshness,
          fromCache: true,
          timestamp: cached?.timestamp || 0,
        };
      }

      // Handle network-only strategy
      if (strategy === 'network-only') {
        const networkData = await this.fetchFromNetwork(
          this.buildSearchUrl(query, filters),
          { timeout, priority, persistent }
        );
        
        // Cache the result
        if (networkData.data) {
          await db.cacheSearchResults(
            query,
            (networkData.data as any).results || [],
            (networkData.data as any).meta?.count || 0,
            filters
          );
        }

        return networkData as DataResponse<unknown[]>;
      }

      // Cache-first strategy
      if (strategy === 'cache-first') {
        if (cached && freshness !== 'expired') {
          return {
            data: cached.results,
            error: null,
            freshness,
            fromCache: true,
            timestamp: cached.timestamp,
          };
        }

        // Fall back to network
        const networkData = await this.fetchFromNetwork(
          this.buildSearchUrl(query, filters),
          { timeout, priority, persistent }
        );

        if (networkData.data) {
          await db.cacheSearchResults(
            query,
            (networkData.data as any).results || [],
            (networkData.data as any).meta?.count || 0,
            filters
          );
        }

        return networkData as DataResponse<unknown[]>;
      }

      // Network-first strategy
      if (strategy === 'network-first') {
        try {
          const networkData = await this.fetchFromNetwork(
            this.buildSearchUrl(query, filters),
            { timeout, priority, persistent }
          );

          if (networkData.data) {
            await db.cacheSearchResults(
              query,
              (networkData.data as any).results || [],
              (networkData.data as any).meta?.count || 0,
              filters
            );
          }

          return networkData as DataResponse<unknown[]>;
        } catch (error) {
          // Fall back to cache
          if (cached) {
            return {
              data: cached.results,
              error: error as Error,
              freshness,
              fromCache: true,
              timestamp: cached.timestamp,
            };
          }
          throw error;
        }
      }

      // Stale-while-revalidate strategy (default)
      if (cached) {
        // Return cached data immediately
        const response: DataResponse<unknown[]> = {
          data: cached.results,
          error: null,
          freshness,
          fromCache: true,
          timestamp: cached.timestamp,
        };

        // Update in background if stale
        if (freshness === 'stale' || freshness === 'expired') {
          this.fetchFromNetwork(
            this.buildSearchUrl(query, filters),
            { timeout, priority: 1, persistent: false, background: true }
          ).then(networkData => {
            if (networkData.data) {
              db.cacheSearchResults(
                query,
                (networkData.data as any).results || [],
                (networkData.data as any).meta?.count || 0,
                filters
              );
            }
          }).catch(console.error);
        }

        return response;
      }

      // No cache, fetch from network
      const networkData = await this.fetchFromNetwork(
        this.buildSearchUrl(query, filters),
        { timeout, priority, persistent }
      );

      if (networkData.data) {
        await db.cacheSearchResults(
          query,
          (networkData.data as any).results || [],
          (networkData.data as any).meta?.count || 0,
          filters
        );
      }

      return networkData as DataResponse<unknown[]>;

    } catch (error) {
      return {
        data: null,
        error: error as Error,
        freshness: 'unknown',
        fromCache: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Save paper with offline support
   */
  async savePaper(
    paper: Parameters<typeof db.savePaper>[0],
    options: DataAccessOptions = {}
  ): Promise<DataResponse<void>> {
    const {
      priority = 7, // High priority for user actions
      persistent = true,
    } = options;

    try {
      // Always save to local storage first (optimistic update)
      await db.savePaper(paper);

      // If online, sync to server
      if (this.networkStatus?.isOnline && this.queueManager) {
        const request: Omit<IntelligentQueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
          url: `/api/papers/${paper.id}`,
          method: 'PUT',
          body: paper,
          maxRetries: 3,
          priority,
          persistent,
          conflictStrategy: 'version',
          idempotent: true,
          lastModified: paper.savedAt,
        };

        this.queueManager.queueIntelligentRequest(request);
      }

      return {
        data: undefined,
        error: null,
        freshness: 'fresh',
        fromCache: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        data: undefined,
        error: error as Error,
        freshness: 'unknown',
        fromCache: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get paper with offline support
   */
  async getPaper(
    id: string,
    options: DataAccessOptions = {}
  ): Promise<DataResponse<any>> {
    const {
      strategy = 'cache-first',
      timeout = 5000,
      priority = 5,
    } = options;

    // Check local storage first
    const cached = await db.getPaper(id);

    try {

      if (strategy === 'cache-only' || (strategy === 'cache-first' && cached)) {
        return {
          data: cached,
          error: null,
          freshness: cached ? 'fresh' : 'unknown',
          fromCache: true,
          timestamp: cached?.savedAt || 0,
        };
      }

      // Try network
      const networkData = await this.fetchFromNetwork(
        `/api/papers/${id}`,
        { timeout, priority, persistent: false }
      );

      // Update cache if we got data
      if (networkData.data) {
        await db.savePaper(networkData.data as any);
      }

      return networkData;
    } catch (error) {
      // Fall back to cache on network error
      if (cached) {
        return {
          data: cached,
          error: error as Error,
          freshness: 'stale',
          fromCache: true,
          timestamp: cached.savedAt,
        };
      }

      return {
        data: null,
        error: error as Error,
        freshness: 'unknown',
        fromCache: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Fetch data from network with intelligent queueing
   */
  private async fetchFromNetwork(
    url: string,
    options: {
      timeout?: number;
      priority?: number;
      persistent?: boolean;
      background?: boolean;
    } = {}
  ): Promise<DataResponse<unknown>> {
    const {
      timeout = 10000,
      priority = 5,
      persistent = false,
      background = false,
    } = options;

    // If offline or no queue manager, throw error
    if (!this.networkStatus?.isOnline || !this.queueManager) {
      throw new Error('Network not available');
    }

    return new Promise((resolve, reject) => {
      const request: Omit<IntelligentQueuedRequest, 'id' | 'queuedAt' | 'retryCount'> = {
        url,
        method: 'GET',
        maxRetries: 3,
        priority,
        persistent,
        conflictStrategy: 'version',
        idempotent: true,
        resolve: (data) => {
          resolve({
            data,
            error: null,
            freshness: 'fresh',
            fromCache: false,
            timestamp: Date.now(),
          });
        },
        reject: (error) => {
          reject(error);
        },
      };

      this.queueManager!.queueIntelligentRequest(request);
    });
  }

  /**
   * Build search URL with query and filters
   */
  private buildSearchUrl(query: string, filters?: Record<string, unknown>): string {
    const baseUrl = 'https://api.openalex.org/works';
    const searchParams = new URLSearchParams();
    
    searchParams.set('search', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }

    return `${baseUrl}?${searchParams.toString()}`;
  }

  /**
   * Get sync status for all data
   */
  async getSyncStatus(): Promise<SyncStatus[]> {
    // This would typically read from a sync status table
    // For now, return mock data
    return [
      {
        id: 'search-cache',
        lastSynced: Date.now() - 60000,
        pendingChanges: false,
        version: 1,
      },
      {
        id: 'saved-papers',
        lastSynced: Date.now() - 300000,
        pendingChanges: true,
        version: 2,
      },
    ];
  }

  /**
   * Force sync all pending changes
   */
  async forceSyncAll(): Promise<void> {
    if (!this.queueManager) {
      throw new Error('Queue manager not available');
    }

    await this.queueManager.processQueueIntelligently();
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    await db.clearAllStores();
  }

  /**
   * Get storage usage estimates
   */
  async getStorageUsage(): Promise<{ usage?: number; quota?: number }> {
    return db.getStorageEstimate();
  }
}

// Singleton instance
export const offlineFirstData = new OfflineFirstData();

/**
 * React hook for offline-first data access
 */
export function useOfflineFirstData() {
  const queueManager = useIntelligentOfflineQueue();
  const networkStatus = useNetworkStatus();

  // Set context on the singleton
  React.useEffect(() => {
    offlineFirstData.setContext(queueManager, networkStatus);
  }, [queueManager, networkStatus]);

  return {
    getSearchResults: offlineFirstData.getSearchResults.bind(offlineFirstData),
    savePaper: offlineFirstData.savePaper.bind(offlineFirstData),
    getPaper: offlineFirstData.getPaper.bind(offlineFirstData),
    getSyncStatus: offlineFirstData.getSyncStatus.bind(offlineFirstData),
    forceSyncAll: offlineFirstData.forceSyncAll.bind(offlineFirstData),
    clearAllCache: offlineFirstData.clearAllCache.bind(offlineFirstData),
    getStorageUsage: offlineFirstData.getStorageUsage.bind(offlineFirstData),
    networkStatus,
    queueStatus: queueManager.queueStatus,
  };
}

export default offlineFirstData;