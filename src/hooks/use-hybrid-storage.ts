import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
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

  useEffect(() => {
    const init = async () => {
      try {
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
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localStorageSize += localStorage[key].length + key.length;
      }
    }

    // Get IndexedDB usage
    const estimate = await db.getStorageEstimate();
    
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
    if (!isInitialised) return;
    
    try {
      await db.cacheSearchResults(query, results, totalCount, filters);
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
    if (!isInitialised) return null;
    
    try {
      return await db.getSearchResults(query, filters);
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
    if (!isInitialised) return;
    
    try {
      await db.savePaper({
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
    if (!isInitialised) return;
    
    try {
      const deleted = await db.cleanOldSearchResults(daysOld);
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
      if (!isInitialised || searchHistory.length <= 5) return;
      
      // Keep only last 5 in localStorage, archive the rest
      const toArchive = searchHistory.slice(5);
      
      for (const query of toArchive) {
        // Archive as empty result set for history tracking
        await db.cacheSearchResults(query, [], 0);
      }
    };
    
    migrateIfNeeded();
  }, [searchHistory, isInitialised]);

  return {
    isInitialised,
    metrics,
    archiveSearchResults,
    getCachedSearchResults,
    savePaperOffline,
    cleanupOldData,
    updateMetrics,
  };
}