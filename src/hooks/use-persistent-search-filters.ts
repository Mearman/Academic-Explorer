/**
 * Hook for persisting search filters to storage
 * Provides save, load, and clear functionality with hybrid storage fallback
 */

import { useState, useEffect, useCallback } from 'react';

import { db } from '@/lib/db';

import type { AdvancedSearchFormData } from './use-advanced-search-form';

export interface StoredSearchFilters extends AdvancedSearchFormData {
  savedAt: number;
  version: number;
}

interface UsePersistentSearchFiltersReturn {
  isLoading: boolean;
  isInitialized: boolean;
  savedFilters: StoredSearchFilters | null;
  error: string | null;
  saveFilters: (data: AdvancedSearchFormData, key?: string) => Promise<void>;
  loadFilters: (key?: string) => Promise<StoredSearchFilters | null>;
  clearFilters: (key?: string) => Promise<void>;
  clearError: () => void;
}

const CURRENT_VERSION = 1;
const DEFAULT_KEY = 'default';
const STORAGE_KEY_PREFIX = 'academic-explorer-search-filters-';

/**
 * Validates if data has the basic structure of search filters
 */
function isValidFilterData(data: unknown): data is Partial<AdvancedSearchFormData> {
  if (!data || typeof data !== 'object') return false;
  
  const filters = data as Record<string, unknown>;
  
  // Check if it has at least some expected fields
  const hasBasicFields = (
    typeof filters.query === 'string' ||
    typeof filters.searchField === 'string' ||
    typeof filters.searchMode === 'string'
  );
  
  return hasBasicFields;
}

/**
 * Migrates filter data to current version
 */
function migrateFilterData(data: unknown): StoredSearchFilters | null {
  if (!isValidFilterData(data)) {
    return null;
  }
  
  const filters = data as Partial<StoredSearchFilters>;
  
  // Add version if missing (legacy data)
  if (!filters.version) {
    (filters as StoredSearchFilters).version = 1;
  }
  
  // Ensure savedAt exists
  if (!filters.savedAt) {
    (filters as StoredSearchFilters).savedAt = Date.now();
  }
  
  return filters as StoredSearchFilters;
}

/**
 * Fallback storage using localStorage
 */
const localStorageFallback = {
  async save(key: string, data: StoredSearchFilters): Promise<void> {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(data));
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  },

  async load(key: string): Promise<StoredSearchFilters | null> {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return migrateFilterData(parsed);
    } catch (error) {
      console.warn('Failed to parse stored search filters from localStorage:', error);
      return null;
    }
  },

  async clear(key: string): Promise<void> {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
  }
};

export function usePersistentSearchFilters(): UsePersistentSearchFiltersReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedFilters, setSavedFilters] = useState<StoredSearchFilters | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useLocalStorageFallback, setUseLocalStorageFallback] = useState(false);

  // Initialize storage and load default filters
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await db.init();
        setUseLocalStorageFallback(false);
        
        // Try to load default filters on initialization
        const defaultFilters = await db.getSearchFilters(DEFAULT_KEY);
        if (defaultFilters) {
          const migrated = migrateFilterData(defaultFilters);
          setSavedFilters(migrated);
        }
        
        setIsInitialized(true);
        setError(null);
      } catch (initError) {
        console.error('Failed to initialize persistent search filters:', initError);
        
        // Fall back to localStorage
        setUseLocalStorageFallback(true);
        
        try {
          const defaultFilters = await localStorageFallback.load(DEFAULT_KEY);
          setSavedFilters(defaultFilters);
          setIsInitialized(true);
          setError(null);
        } catch (fallbackError) {
          console.error('Failed to initialize localStorage fallback:', fallbackError);
          setError('Failed to initialize storage');
          setIsInitialized(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();
  }, []);

  const saveFilters = useCallback(async (data: AdvancedSearchFormData, key = DEFAULT_KEY): Promise<void> => {
    if (!isInitialized) {
      setError('Storage not initialized');
      return;
    }

    try {
      const filtersWithMetadata: StoredSearchFilters = {
        ...data,
        savedAt: Date.now(),
        version: CURRENT_VERSION,
      };

      if (useLocalStorageFallback) {
        await localStorageFallback.save(key, filtersWithMetadata);
      } else {
        await db.saveSearchFilters(key, filtersWithMetadata as unknown as Record<string, unknown>);
      }

      // Update state if saving default filters
      if (key === DEFAULT_KEY) {
        setSavedFilters(filtersWithMetadata);
      }

      setError(null);
    } catch (saveError) {
      console.error('Failed to save search filters:', saveError);
      setError('Failed to save filters');
    }
  }, [isInitialized, useLocalStorageFallback]);

  const loadFilters = useCallback(async (key = DEFAULT_KEY): Promise<StoredSearchFilters | null> => {
    if (!isInitialized) {
      setError('Storage not initialized');
      return null;
    }

    try {
      let loadedFilters: unknown;
      
      if (useLocalStorageFallback) {
        loadedFilters = await localStorageFallback.load(key);
      } else {
        loadedFilters = await db.getSearchFilters(key);
      }

      if (!loadedFilters) {
        return null;
      }

      const migrated = migrateFilterData(loadedFilters);
      if (!migrated) {
        console.warn('Stored search filters are corrupted, ignoring:', loadedFilters);
        return null;
      }

      setError(null);
      return migrated;
    } catch (loadError) {
      console.error('Failed to load search filters:', loadError);
      setError('Failed to load filters');
      return null;
    }
  }, [isInitialized, useLocalStorageFallback]);

  const clearFilters = useCallback(async (key = DEFAULT_KEY): Promise<void> => {
    if (!isInitialized) {
      setError('Storage not initialized');
      return;
    }

    try {
      if (useLocalStorageFallback) {
        await localStorageFallback.clear(key);
      } else {
        await db.deleteSearchFilters(key);
      }

      // Update state if clearing default filters
      if (key === DEFAULT_KEY) {
        setSavedFilters(null);
      }

      setError(null);
    } catch (clearError) {
      console.error('Failed to clear search filters:', clearError);
      setError('Failed to clear filters');
    }
  }, [isInitialized, useLocalStorageFallback]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    isInitialized,
    savedFilters,
    error,
    saveFilters,
    loadFilters,
    clearFilters,
    clearError,
  };
}