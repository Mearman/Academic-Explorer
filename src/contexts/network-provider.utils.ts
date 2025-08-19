/**
 * Storage keys for persistence
 */
export const STORAGE_KEYS = {
  RETRY_POLICIES: 'network-retry-policies',
  SYNC_CONFIG: 'network-sync-config',
  NETWORK_EVENTS: 'network-events',
} as const;

/**
 * Maximum events to keep in history
 */
export const MAX_EVENT_HISTORY = 100;

/**
 * Load persisted data from localStorage with fallback
 */
export function loadPersistedData<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that parsed data has the expected shape
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...defaultValue, ...parsed };
      }
    }
  } catch (error) {
    console.warn(`Failed to load persisted data for ${key}:`, error);
  }
  return defaultValue;
}

/**
 * Save data to localStorage with error handling
 */
export function saveDataToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save data to localStorage for ${key}:`, error);
  }
}