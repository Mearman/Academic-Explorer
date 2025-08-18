/**
 * Network awareness context provider
 * 
 * Provides global network state management, policy configuration,
 * queue management, connectivity testing, and persistence.
 */

import React, { 
  createContext, 
  useContext, 
  useCallback, 
  useEffect, 
  useReducer,
  useRef,
  type ReactNode 
} from 'react';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import {
  DEFAULT_NETWORK_RETRY_POLICIES,
  DEFAULT_BACKGROUND_SYNC_CONFIG
} from '@/types/network';
import type {
  NetworkContext,
  NetworkContextState,
  NetworkConditionPolicies,
  BackgroundSyncConfig,
  QueuedRequest,
  RequestQueueStatus,
  NetworkRetryPolicy,
  NetworkEvent,
  NetworkEventType
} from '@/types/network';

/**
 * Storage keys for persistence
 */
const STORAGE_KEYS = {
  RETRY_POLICIES: 'network-retry-policies',
  SYNC_CONFIG: 'network-sync-config',
  NETWORK_EVENTS: 'network-events',
} as const;

/**
 * Maximum events to keep in history
 */
const MAX_EVENT_HISTORY = 100;

/**
 * Network context state
 */
interface NetworkProviderState extends NetworkContextState {
  /** Event history for debugging and analytics */
  eventHistory: NetworkEvent[];
  /** Connection test status */
  connectivityTestInProgress: boolean;
  /** Last connectivity test result */
  lastConnectivityTest: {
    timestamp: number;
    success: boolean;
    latency?: number;
  } | null;
}

/**
 * Network context actions for reducer
 */
type NetworkProviderAction =
  | { type: 'SET_INITIALISED'; payload: boolean }
  | { type: 'UPDATE_RETRY_POLICIES'; payload: Partial<NetworkConditionPolicies> }
  | { type: 'UPDATE_SYNC_CONFIG'; payload: Partial<BackgroundSyncConfig> }
  | { type: 'ADD_EVENT'; payload: NetworkEvent }
  | { type: 'SET_CONNECTIVITY_TEST_IN_PROGRESS'; payload: boolean }
  | { type: 'SET_CONNECTIVITY_TEST_RESULT'; payload: { success: boolean; latency?: number } }
  | { type: 'UPDATE_QUEUE_STATUS'; payload: RequestQueueStatus };

/**
 * Load persisted data from localStorage with fallback
 */
function loadPersistedData<T>(key: string, defaultValue: T): T {
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
function saveDataToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save data to localStorage for ${key}:`, error);
  }
}

/**
 * Initial state for the network provider
 */
function getInitialState(): NetworkProviderState {
  const retryPolicies = loadPersistedData(
    STORAGE_KEYS.RETRY_POLICIES,
    DEFAULT_NETWORK_RETRY_POLICIES
  );
  
  const syncConfig = loadPersistedData(
    STORAGE_KEYS.SYNC_CONFIG,
    DEFAULT_BACKGROUND_SYNC_CONFIG
  );
  
  const persistedEventHistory = loadPersistedData<NetworkEvent[]>(
    STORAGE_KEYS.NETWORK_EVENTS,
    []
  );
  
  // Ensure eventHistory is always an array
  const eventHistory = Array.isArray(persistedEventHistory) 
    ? persistedEventHistory 
    : [];

  return {
    networkStatus: {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      connectionType: 'unknown',
      effectiveConnectionType: 'unknown',
      connectionQuality: 'unknown',
      isSlowConnection: false,
      downlink: 0,
      rtt: 0,
      saveData: false,
      lastOnlineTime: navigator.onLine ? performance.now() : 0,
      offlineDuration: 0,
    },
    retryPolicies,
    queueStatus: {
      pendingRequests: 0,
      highPriorityRequests: 0,
      isProcessing: false,
      lastSuccessfulRequest: 0,
      totalProcessed: 0,
      totalFailed: 0,
    },
    syncConfig,
    isInitialised: false,
    eventHistory: eventHistory.slice(-MAX_EVENT_HISTORY),
    connectivityTestInProgress: false,
    lastConnectivityTest: null,
  };
}

/**
 * Network provider reducer
 */
function networkProviderReducer(
  state: NetworkProviderState,
  action: NetworkProviderAction
): NetworkProviderState {
  switch (action.type) {
    case 'SET_INITIALISED':
      return {
        ...state,
        isInitialised: action.payload,
      };

    case 'UPDATE_RETRY_POLICIES': {
      const newRetryPolicies = {
        ...state.retryPolicies,
        ...action.payload,
      };
      saveDataToStorage(STORAGE_KEYS.RETRY_POLICIES, newRetryPolicies);
      return {
        ...state,
        retryPolicies: newRetryPolicies,
      };
    }

    case 'UPDATE_SYNC_CONFIG': {
      const newSyncConfig = {
        ...state.syncConfig,
        ...action.payload,
      };
      saveDataToStorage(STORAGE_KEYS.SYNC_CONFIG, newSyncConfig);
      return {
        ...state,
        syncConfig: newSyncConfig,
      };
    }

    case 'ADD_EVENT': {
      const newEventHistory = [...state.eventHistory, action.payload]
        .slice(-MAX_EVENT_HISTORY);
      saveDataToStorage(STORAGE_KEYS.NETWORK_EVENTS, newEventHistory);
      return {
        ...state,
        eventHistory: newEventHistory,
      };
    }

    case 'SET_CONNECTIVITY_TEST_IN_PROGRESS':
      return {
        ...state,
        connectivityTestInProgress: action.payload,
      };

    case 'SET_CONNECTIVITY_TEST_RESULT':
      return {
        ...state,
        connectivityTestInProgress: false,
        lastConnectivityTest: {
          timestamp: Date.now(),
          ...action.payload,
        },
      };

    case 'UPDATE_QUEUE_STATUS':
      return {
        ...state,
        queueStatus: action.payload,
      };

    default:
      return state;
  }
}

/**
 * Network provider context
 */
const NetworkProviderContext = createContext<NetworkContext | null>(null);

/**
 * Network provider props
 */
interface NetworkProviderProps {
  children: ReactNode;
  /** Initial retry policies (for testing/customization) */
  initialRetryPolicies?: Partial<NetworkConditionPolicies>;
  /** Initial sync configuration (for testing/customization) */
  initialSyncConfig?: Partial<BackgroundSyncConfig>;
  /** Test connectivity endpoint URL */
  connectivityTestUrl?: string;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Network provider component
 */
export function NetworkProvider({
  children,
  initialRetryPolicies,
  initialSyncConfig,
  connectivityTestUrl = 'https://httpbin.org/status/200',
  debug = false,
}: NetworkProviderProps) {
  const [state, dispatch] = useReducer(networkProviderReducer, getInitialState());
  const networkStatus = useNetworkStatus();
  const offlineQueue = useOfflineQueue();
  const mountedRef = useRef(true);
  const syncTimeoutRef = useRef<number | null>(null);

  /**
   * Debug logging utility
   */
  const debugLog = useCallback((message: string, ...args: unknown[]) => {
    if (debug) {
      console.log(`[NetworkProvider] ${message}`, ...args);
    }
  }, [debug]);

  /**
   * Add event to history
   */
  const addEvent = useCallback((type: NetworkEventType, data?: unknown) => {
    const event: NetworkEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    
    dispatch({ type: 'ADD_EVENT', payload: event });
    debugLog(`Event: ${type}`, data);
  }, [debugLog]);

  /**
   * Test network connectivity
   */
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    if (state.connectivityTestInProgress) {
      return false;
    }

    dispatch({ type: 'SET_CONNECTIVITY_TEST_IN_PROGRESS', payload: true });
    addEvent('connection-test-started');
    
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(connectivityTestUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = performance.now() - startTime;
      const success = response.ok;

      dispatch({ 
        type: 'SET_CONNECTIVITY_TEST_RESULT', 
        payload: { success, latency } 
      });

      addEvent('connection-test-completed', { success, latency });
      debugLog(`Connectivity test ${success ? 'passed' : 'failed'} (${latency.toFixed(2)}ms)`);
      
      return success;
    } catch (error) {
      const latency = performance.now() - startTime;
      
      dispatch({ 
        type: 'SET_CONNECTIVITY_TEST_RESULT', 
        payload: { success: false, latency } 
      });

      addEvent('connection-test-failed', { error: error instanceof Error ? error.message : String(error) });
      debugLog('Connectivity test failed:', error);
      
      return false;
    }
  }, [state.connectivityTestInProgress, connectivityTestUrl, addEvent, debugLog]);

  /**
   * Get current retry policy based on connection quality
   */
  const getCurrentRetryPolicy = useCallback((): NetworkRetryPolicy => {
    const { connectionQuality } = networkStatus;
    
    switch (connectionQuality) {
      case 'fast':
        return state.retryPolicies.fast;
      case 'moderate':
        return state.retryPolicies.moderate;
      case 'slow':
        return state.retryPolicies.slow;
      case 'verySlow':
        return state.retryPolicies.verySlow;
      case 'unknown':
        return state.retryPolicies.unknown;
      default:
        return state.retryPolicies.unknown;
    }
  }, [networkStatus, state.retryPolicies]);

  /**
   * Queue request wrapper that adds event tracking
   */
  const queueRequest = useCallback((
    request: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'>
  ): string => {
    const requestId = offlineQueue.queueRequest(request);
    addEvent('request-queued', { requestId, url: request.url, priority: request.priority });
    debugLog(`Queued request ${requestId}`, request);
    return requestId;
  }, [offlineQueue, addEvent, debugLog]);

  /**
   * Cancel request wrapper that adds event tracking
   */
  const cancelRequest = useCallback((requestId: string): boolean => {
    const cancelled = offlineQueue.cancelRequest(requestId);
    if (cancelled) {
      addEvent('request-cancelled', { requestId });
      debugLog(`Cancelled request ${requestId}`);
    }
    return cancelled;
  }, [offlineQueue, addEvent, debugLog]);

  /**
   * Clear queue wrapper that adds event tracking
   */
  const clearQueue = useCallback(() => {
    const { pendingRequests } = offlineQueue.queueStatus;
    offlineQueue.clearQueue();
    addEvent('queue-cleared', { clearedCount: pendingRequests });
    debugLog(`Cleared queue (${pendingRequests} requests)`);
  }, [offlineQueue, addEvent, debugLog]);

  /**
   * Trigger sync wrapper that adds event tracking
   */
  const triggerSync = useCallback(async (): Promise<void> => {
    if (!networkStatus.isOnline) {
      debugLog('Cannot trigger sync while offline');
      return;
    }

    addEvent('sync-started');
    debugLog('Manually triggered sync');
    
    try {
      await offlineQueue.processQueue();
      addEvent('sync-completed');
      debugLog('Manual sync completed');
    } catch (error) {
      addEvent('sync-failed', { error: error instanceof Error ? error.message : String(error) });
      debugLog('Manual sync failed:', error);
      throw error;
    }
  }, [networkStatus.isOnline, offlineQueue, addEvent, debugLog]);

  /**
   * Update retry policies
   */
  const updateRetryPolicies = useCallback((
    policies: Partial<NetworkConditionPolicies>
  ) => {
    dispatch({ type: 'UPDATE_RETRY_POLICIES', payload: policies });
    addEvent('retry-policies-updated', policies);
    debugLog('Updated retry policies', policies);
  }, [addEvent, debugLog]);

  /**
   * Update sync configuration
   */
  const updateSyncConfig = useCallback((
    config: Partial<BackgroundSyncConfig>
  ) => {
    dispatch({ type: 'UPDATE_SYNC_CONFIG', payload: config });
    addEvent('sync-config-updated', config);
    debugLog('Updated sync config', config);
  }, [addEvent, debugLog]);

  /**
   * Initialize the provider with custom configurations
   */
  useEffect(() => {
    if (initialRetryPolicies) {
      updateRetryPolicies(initialRetryPolicies);
    }
    
    if (initialSyncConfig) {
      updateSyncConfig(initialSyncConfig);
    }

    dispatch({ type: 'SET_INITIALISED', payload: true });
    addEvent('provider-initialised');
    debugLog('Network provider initialised');

    return () => {
      mountedRef.current = false;
    };
  }, [initialRetryPolicies, initialSyncConfig, updateRetryPolicies, updateSyncConfig, addEvent, debugLog]);

  /**
   * Track network status changes
   */
  useEffect(() => {
    const prevStatus = state.networkStatus;
    
    // Update internal network status (this gets overridden by the live one)
    if (
      prevStatus.isOnline !== networkStatus.isOnline ||
      prevStatus.connectionQuality !== networkStatus.connectionQuality
    ) {
      if (networkStatus.isOnline !== prevStatus.isOnline) {
        addEvent(networkStatus.isOnline ? 'online' : 'offline');
      }
      
      if (networkStatus.connectionQuality !== prevStatus.connectionQuality) {
        addEvent('quality-change', { 
          from: prevStatus.connectionQuality,
          to: networkStatus.connectionQuality 
        });
      }
    }
  }, [networkStatus, state.networkStatus, addEvent]);

  /**
   * Sync queue status with offline queue
   */
  useEffect(() => {
    dispatch({ type: 'UPDATE_QUEUE_STATUS', payload: offlineQueue.queueStatus });
  }, [offlineQueue.queueStatus]);

  /**
   * Background sync interval management
   */
  useEffect(() => {
    if (!state.syncConfig.enabled || !networkStatus.isOnline) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      return;
    }

    const scheduleSyncAttempt = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current && networkStatus.isOnline && offlineQueue.queueStatus.pendingRequests > 0) {
          debugLog('Background sync triggered');
          triggerSync().catch(error => {
            debugLog('Background sync failed:', error);
          });
        }
        scheduleSyncAttempt();
      }, state.syncConfig.syncInterval);
    };

    scheduleSyncAttempt();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [state.syncConfig.enabled, state.syncConfig.syncInterval, networkStatus.isOnline, offlineQueue.queueStatus.pendingRequests, triggerSync, debugLog]);

  /**
   * Auto-sync when coming online
   */
  useEffect(() => {
    if (
      state.syncConfig.syncOnConnect &&
      networkStatus.isOnline &&
      offlineQueue.queueStatus.pendingRequests > 0
    ) {
      debugLog('Auto-sync on connect triggered');
      // Small delay to allow network stabilization
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          triggerSync().catch(error => {
            debugLog('Auto-sync on connect failed:', error);
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [state.syncConfig.syncOnConnect, networkStatus.isOnline, offlineQueue.queueStatus.pendingRequests, triggerSync, debugLog]);

  /**
   * Context value
   */
  const contextValue: NetworkContext = {
    // State
    networkStatus,
    retryPolicies: state.retryPolicies,
    queueStatus: state.queueStatus,
    syncConfig: state.syncConfig,
    isInitialised: state.isInitialised,
    
    // Actions
    queueRequest,
    cancelRequest,
    clearQueue,
    triggerSync,
    updateRetryPolicies,
    updateSyncConfig,
    testConnectivity,
    getCurrentRetryPolicy,
  };

  return (
    <NetworkProviderContext.Provider value={contextValue}>
      {children}
    </NetworkProviderContext.Provider>
  );
}

/**
 * Hook to use network context
 */
export function useNetworkContext(): NetworkContext {
  const context = useContext(NetworkProviderContext);
  
  if (!context) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  
  return context;
}

/**
 * Hook to get network context safely with optional fallback
 */
export function useNetworkContextOptional(): NetworkContext | null {
  return useContext(NetworkProviderContext);
}