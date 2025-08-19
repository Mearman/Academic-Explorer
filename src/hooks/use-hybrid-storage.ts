import { useEffect, useState, useRef } from 'react';

import { useAppStore } from '@/stores/app-store';

interface StorageMetrics {
  localStorageSize: number;
  indexedDBUsage?: number;
  indexedDBQuota?: number;
}

export function useHybridStorage() {
  const [isInitialised, setIsInitialised] = useState(false);
  const [metrics, setMetrics] = useState<StorageMetrics>({ localStorageSize: 0 });
  const searchHistory = useAppStore((state) => state.searchHistory);
  
  // Database reference for this hook instance
  const dbRef = useRef<typeof import('@/lib/db').db | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { db } = await import('@/lib/db');
        dbRef.current = db;
        await db.init();
        setIsInitialised(true);
        await updateMetrics();
      } catch (error) {
        console.error('Failed to initialise IndexedDB:', error);
      }
    };
    init();
  }, []);

  const updateMetrics = async () => {
    // Calculate localStorage usage
    let localStorageSize = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            localStorageSize += value.length + key.length;
          }
        }
      }
    } catch (error) {
      console.warn('Error calculating localStorage size:', error);
      localStorageSize = 0;
    }

    // Get IndexedDB usage
    const estimate = dbRef.current ? await dbRef.current.getStorageEstimate() : { usage: 0, quota: 0 };
    
    setMetrics({
      localStorageSize,
      indexedDBUsage: estimate.usage,
      indexedDBQuota: estimate.quota,
    });
  };

  // Archive old search results to IndexedDB
  const archiveSearchResults = async (
    query: string,
    results: unknown[],
    totalCount: number,
    filters?: Record<string, unknown>
  ) => {
    if (!isInitialised || !dbRef.current) return;
    
    try {
      await dbRef.current.cacheSearchResults(query, results, totalCount, filters);
      await updateMetrics();
    } catch (error) {
      console.error('Failed to archive search results:', error);
    }
  };

  // Retrieve cached search results
  const getCachedSearchResults = async (
    query: string,
    filters?: Record<string, unknown>
  ) => {
    if (!isInitialised || !dbRef.current) return null;
    
    try {
      return await dbRef.current.getSearchResults(query, filters);
    } catch (error) {
      console.error('Failed to retrieve cached results:', error);
      return null;
    }
  };

  // Save paper for offline access
  const savePaperOffline = async (paper: {
    id: string;
    title: string;
    authors: string[];
    abstract?: string;
    year?: number;
    doi?: string;
  }) => {
    if (!isInitialised || !dbRef.current) return;
    
    try {
      await dbRef.current.savePaper({
        ...paper,
        savedAt: Date.now(),
      });
      await updateMetrics();
    } catch (error) {
      console.error('Failed to save paper:', error);
    }
  };

  // Clean up old data
  const cleanupOldData = async (daysOld = 30) => {
    if (!isInitialised || !dbRef.current) return 0;
    
    try {
      const deleted = await dbRef.current.cleanOldSearchResults(daysOld);
      await updateMetrics();
      return deleted;
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      return 0;
    }
  };

  // Migrate search history to IndexedDB when it gets too large
  useEffect(() => {
    const migrateIfNeeded = async () => {
      if (!isInitialised || !dbRef.current || searchHistory.length <= 5) return;
      
      // Keep only last 5 in localStorage, archive the rest
      const toArchive = searchHistory.slice(5);
      
      for (const query of toArchive) {
        // Archive as empty result set for history tracking
        await dbRef.current.cacheSearchResults(query, [], 0);
      }
    };
    
    migrateIfNeeded();
  }, [searchHistory, isInitialised]);

  // Standard storage interface methods
  const getItem = async (key: string): Promise<string | null> => {
    try {
      // Try localStorage first (primary storage)
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        return localValue;
      }
      
      // Fallback to IndexedDB if not found in localStorage
      if (isInitialised && dbRef.current) {
        try {
          return await dbRef.current.getKeyValue(key);
        } catch (error) {
          console.warn('Failed to get item from IndexedDB:', error);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    try {
      // Save to localStorage (primary storage)
      localStorage.setItem(key, value);
      
      // Also save to IndexedDB for persistence
      if (isInitialised && dbRef.current) {
        try {
          await dbRef.current.setKeyValue(key, value);
        } catch (error) {
          console.warn('Failed to save item to IndexedDB:', error);
        }
      }
      
      // Update metrics after successful operation
      await updateMetrics();
    } catch (error) {
      console.error('Error setting item in storage:', error);
      throw error;
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    try {
      // Remove from localStorage
      localStorage.removeItem(key);
      
      // Remove from IndexedDB
      if (isInitialised && dbRef.current) {
        try {
          await dbRef.current.deleteKeyValue(key);
        } catch (error) {
          console.warn('Failed to remove item from IndexedDB:', error);
        }
      }
      
      // Update metrics after successful operation
      await updateMetrics();
    } catch (error) {
      console.error('Error removing item from storage:', error);
      throw error;
    }
  };

  return {
    isInitialised,
    metrics,
    archiveSearchResults,
    getCachedSearchResults,
    savePaperOffline,
    cleanupOldData,
    updateMetrics,
    getItem,
    setItem,
    removeItem,
  };
}