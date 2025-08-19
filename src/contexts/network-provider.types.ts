import type { ReactNode } from 'react';

import type {
  NetworkContextState,
  NetworkEvent,
  NetworkConditionPolicies,
  BackgroundSyncConfig,
  RequestQueueStatus,
} from '@/types/network';

/**
 * Network context state
 */
export interface NetworkProviderState extends NetworkContextState {
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
export type NetworkProviderAction =
  | { type: 'SET_INITIALISED'; payload: boolean }
  | { type: 'UPDATE_RETRY_POLICIES'; payload: Partial<NetworkConditionPolicies> }
  | { type: 'UPDATE_SYNC_CONFIG'; payload: Partial<BackgroundSyncConfig> }
  | { type: 'ADD_EVENT'; payload: NetworkEvent }
  | { type: 'SET_CONNECTIVITY_TEST_IN_PROGRESS'; payload: boolean }
  | { type: 'SET_CONNECTIVITY_TEST_RESULT'; payload: { success: boolean; latency?: number } }
  | { type: 'UPDATE_QUEUE_STATUS'; payload: RequestQueueStatus };

/**
 * Network provider props
 */
export interface NetworkProviderProps {
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