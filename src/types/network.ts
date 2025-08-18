/**
 * Network status and retry strategy types for Academic Explorer
 */

/**
 * Network connection types based on Network Information API
 */
export type NetworkConnectionType = 
  | 'slow-2g' 
  | '2g' 
  | '3g' 
  | '4g' 
  | 'unknown';

/**
 * Connection quality categories
 */
export type ConnectionQuality = 
  | 'fast'        // 4g, high bandwidth
  | 'moderate'    // 3g, medium bandwidth  
  | 'slow'        // 3g/2g, low bandwidth
  | 'verySlow'    // 2g, very low bandwidth
  | 'unknown';    // Unable to determine

/**
 * Network status interface
 */
export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether the browser reports being offline */
  isOffline: boolean;
  /** Network connection type from Network Information API */
  connectionType: NetworkConnectionType;
  /** Effective connection type (may differ from actual) */
  effectiveConnectionType: NetworkConnectionType;
  /** Connection quality assessment */
  connectionQuality: ConnectionQuality;
  /** Whether this is considered a slow connection */
  isSlowConnection: boolean;
  /** Downlink bandwidth in Mbps */
  downlink: number;
  /** Round-trip time in milliseconds */
  rtt: number;
  /** Whether data saver mode is enabled */
  saveData: boolean;
  /** Timestamp of last time we were online */
  lastOnlineTime: number;
  /** Duration of last offline period in milliseconds */
  offlineDuration: number;
}

/**
 * Retry strategy types
 */
export type RetryStrategy = 
  | 'exponential'  // Exponential backoff (default)
  | 'linear'       // Linear increase in delay
  | 'adaptive'     // Adapt based on network conditions
  | 'immediate'    // No delay between retries
  | 'none';        // No retries

/**
 * Network-aware retry policy configuration
 */
export interface NetworkRetryPolicy {
  /** Base retry strategy */
  strategy: RetryStrategy;
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Whether to adapt delays based on network conditions */
  adaptToNetwork: boolean;
  /** Timeout for individual requests in milliseconds */
  requestTimeout: number;
}

/**
 * Network condition specific retry policies
 */
export interface NetworkConditionPolicies {
  /** Policy for fast connections */
  fast: NetworkRetryPolicy;
  /** Policy for moderate connections */
  moderate: NetworkRetryPolicy;
  /** Policy for slow connections */
  slow: NetworkRetryPolicy;
  /** Policy for very slow connections */
  verySlow: NetworkRetryPolicy;
  /** Policy for offline mode */
  offline: NetworkRetryPolicy;
  /** Policy when network status is unknown */
  unknown: NetworkRetryPolicy;
}

/**
 * Queued request for offline scenarios
 */
export interface QueuedRequest {
  /** Unique identifier for the request */
  id: string;
  /** URL or endpoint being requested */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Timestamp when request was queued */
  queuedAt: number;
  /** Number of retry attempts made */
  retryCount: number;
  /** Maximum retries allowed for this request */
  maxRetries: number;
  /** Priority level (higher numbers = higher priority) */
  priority: number;
  /** Whether this request should persist across sessions */
  persistent: boolean;
  /** Callback to resolve when request succeeds */
  resolve?: (data: unknown) => void;
  /** Callback to reject when request fails permanently */
  reject?: (error: Error) => void;
}

/**
 * Request queue status
 */
export interface RequestQueueStatus {
  /** Number of requests currently queued */
  pendingRequests: number;
  /** Number of high priority requests */
  highPriorityRequests: number;
  /** Whether the queue is actively processing requests */
  isProcessing: boolean;
  /** Timestamp of last successful request */
  lastSuccessfulRequest: number;
  /** Total number of requests processed in current session */
  totalProcessed: number;
  /** Total number of failed requests in current session */
  totalFailed: number;
}

/**
 * Background sync configuration
 */
export interface BackgroundSyncConfig {
  /** Whether background sync is enabled */
  enabled: boolean;
  /** Interval between sync attempts in milliseconds */
  syncInterval: number;
  /** Maximum time to keep trying sync in milliseconds */
  maxSyncDuration: number;
  /** Whether to sync immediately when coming online */
  syncOnConnect: boolean;
  /** Whether to show notifications during sync */
  showNotifications: boolean;
  /** Maximum number of requests to sync in one batch */
  batchSize: number;
}

/**
 * Network awareness context state
 */
export interface NetworkContextState {
  /** Current network status */
  networkStatus: NetworkStatus;
  /** Current retry policies for different conditions */
  retryPolicies: NetworkConditionPolicies;
  /** Current request queue status */
  queueStatus: RequestQueueStatus;
  /** Background sync configuration */
  syncConfig: BackgroundSyncConfig;
  /** Whether network awareness is initialised */
  isInitialised: boolean;
}

/**
 * Network awareness context actions
 */
export interface NetworkContextActions {
  /** Queue a request for later execution */
  queueRequest: (request: Omit<QueuedRequest, 'id' | 'queuedAt' | 'retryCount'>) => string;
  /** Cancel a queued request */
  cancelRequest: (requestId: string) => boolean;
  /** Clear all queued requests */
  clearQueue: () => void;
  /** Manually trigger sync attempt */
  triggerSync: () => Promise<void>;
  /** Update retry policies */
  updateRetryPolicies: (policies: Partial<NetworkConditionPolicies>) => void;
  /** Update background sync configuration */
  updateSyncConfig: (config: Partial<BackgroundSyncConfig>) => void;
  /** Test network connectivity */
  testConnectivity: () => Promise<boolean>;
  /** Get current retry policy based on connection quality */
  getCurrentRetryPolicy: () => NetworkRetryPolicy;
}

/**
 * Complete network context interface
 */
export interface NetworkContext extends NetworkContextState, NetworkContextActions {}

/**
 * Network event types
 */
export type NetworkEventType = 
  | 'online'
  | 'offline'
  | 'connection-change'
  | 'quality-change'
  | 'request-queued'
  | 'request-completed'
  | 'request-failed'
  | 'request-cancelled'
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'queue-cleared'
  | 'retry-policies-updated'
  | 'sync-config-updated'
  | 'provider-initialised'
  | 'connection-test-started'
  | 'connection-test-completed'
  | 'connection-test-failed';

/**
 * Network event interface
 */
export interface NetworkEvent {
  type: NetworkEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * Default retry policies for different network conditions
 */
export const DEFAULT_NETWORK_RETRY_POLICIES: NetworkConditionPolicies = {
  fast: {
    strategy: 'exponential',
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    adaptToNetwork: true,
    requestTimeout: 5000,
  },
  moderate: {
    strategy: 'exponential',
    maxRetries: 4,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    adaptToNetwork: true,
    requestTimeout: 8000,
  },
  slow: {
    strategy: 'adaptive',
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 20000,
    backoffMultiplier: 1.5,
    adaptToNetwork: true,
    requestTimeout: 15000,
  },
  verySlow: {
    strategy: 'adaptive',
    maxRetries: 6,
    baseDelay: 5000,
    maxDelay: 30000,
    backoffMultiplier: 1.2,
    adaptToNetwork: true,
    requestTimeout: 30000,
  },
  offline: {
    strategy: 'none',
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    adaptToNetwork: false,
    requestTimeout: 1000,
  },
  unknown: {
    strategy: 'exponential',
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    adaptToNetwork: false,
    requestTimeout: 10000,
  },
};

/**
 * Default background sync configuration
 */
export const DEFAULT_BACKGROUND_SYNC_CONFIG: BackgroundSyncConfig = {
  enabled: true,
  syncInterval: 30000, // 30 seconds
  maxSyncDuration: 300000, // 5 minutes
  syncOnConnect: true,
  showNotifications: false,
  batchSize: 10,
};