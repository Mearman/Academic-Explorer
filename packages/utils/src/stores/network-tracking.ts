import type { BaseActivity, StatusTracking } from "./activity-tracking"
import { createContextStore } from "./react-context-store"

/**
 * Network request tracking interface
 */
export interface NetworkRequest extends BaseActivity, StatusTracking {
  url: string
  method: string
  entityType: "api" | "cache" | "worker" | "resource"
  category: "foreground" | "background"
  statusCode?: number
  size?: number
  cacheStrategy?: string
  metadata?: {
    entityType?: string
    entityId?: string
    queryParams?: Record<string, unknown>
    headers?: Record<string, string>
    fromCache?: boolean
    deduplicated?: boolean
  }
}

/**
 * Network statistics interface
 */
export interface NetworkStats {
  totalRequests: number
  activeRequests: number
  successCount: number
  errorCount: number
  cacheHits: number
  deduplicatedCount: number
  averageResponseTime: number
  requestsPerSecond: number
  totalDataTransferred: number
}

// Network action types
interface StartNetworkAction {
  type: "startRequest"
  payload: Omit<NetworkRequest, 'id' | 'timestamp' | 'status' | 'startTime'>
}

interface CompleteNetworkAction {
  type: "completeRequest"
  payload: { id: string; statusCode?: number; size?: number; cacheStrategy?: string }
}

interface FailNetworkAction {
  type: "failRequest"
  payload: { id: string; error: string }
}

interface CacheNetworkAction {
  type: "cacheRequest"
  payload: { id: string; cacheStrategy: string }
}

interface DeduplicateNetworkAction {
  type: "deduplicateRequest"
  payload: { id: string }
}

interface ClearCompletedAction {
  type: "clearCompleted"
}

interface ClearAllAction {
  type: "clearAll"
}

type NetworkAction =
  | StartNetworkAction
  | CompleteNetworkAction
  | FailNetworkAction
  | CacheNetworkAction
  | DeduplicateNetworkAction
  | ClearCompletedAction
  | ClearAllAction

interface NetworkState {
  requests: Record<string, NetworkRequest | undefined>
  stats: NetworkStats
}

const initialState: NetworkState = {
  requests: {},
  stats: {
    totalRequests: 0,
    activeRequests: 0,
    successCount: 0,
    errorCount: 0,
    cacheHits: 0,
    deduplicatedCount: 0,
    averageResponseTime: 0,
    requestsPerSecond: 0,
    totalDataTransferred: 0,
  }
}

const networkReducer = (state: NetworkState, action: NetworkAction): NetworkState => {
  switch (action.type) {
    case "startRequest": {
      const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const now = Date.now()

      const request: NetworkRequest = {
        ...action.payload,
        id,
        timestamp: now,
        status: "active",
        startTime: now,
      }

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: request,
        },
        stats: {
          ...state.stats,
          totalRequests: state.stats.totalRequests + 1,
          activeRequests: state.stats.activeRequests + 1,
          cacheHits: action.payload.metadata?.fromCache
            ? state.stats.cacheHits + 1
            : state.stats.cacheHits,
          deduplicatedCount: action.payload.metadata?.deduplicated
            ? state.stats.deduplicatedCount + 1
            : state.stats.deduplicatedCount,
        }
      }
    }

    case "completeRequest": {
      const request = state.requests[action.payload.id]
      if (!request || request.status === "completed") return state

      const now = Date.now()
      const duration = now - request.startTime
      const successCount = state.stats.successCount + 1
      const currentAvg = state.stats.averageResponseTime

      return {
        ...state,
        requests: {
          ...state.requests,
          [action.payload.id]: {
            ...request,
            ...action.payload,
            status: "completed",
            endTime: now,
            duration,
          }
        },
        stats: {
          ...state.stats,
          activeRequests: state.stats.activeRequests - 1,
          successCount,
          averageResponseTime: ((currentAvg * (successCount - 1)) + duration) / successCount,
          totalDataTransferred: action.payload.size
            ? state.stats.totalDataTransferred + action.payload.size
            : state.stats.totalDataTransferred,
        }
      }
    }

    case "failRequest": {
      const request = state.requests[action.payload.id]
      if (!request || request.status === "error") return state

      return {
        ...state,
        requests: {
          ...state.requests,
          [action.payload.id]: {
            ...request,
            status: "error",
            endTime: Date.now(),
            duration: Date.now() - request.startTime,
            error: action.payload.error,
          }
        },
        stats: {
          ...state.stats,
          activeRequests: state.stats.activeRequests - 1,
          errorCount: state.stats.errorCount + 1,
        }
      }
    }

    case "cacheRequest": {
      const request = state.requests[action.payload.id]
      if (!request) return state

      return {
        ...state,
        requests: {
          ...state.requests,
          [action.payload.id]: {
            ...request,
            status: "completed",
            endTime: Date.now(),
            duration: 0,
            cacheStrategy: action.payload.cacheStrategy,
            metadata: {
              ...request.metadata,
              fromCache: true,
            },
          }
        },
        stats: {
          ...state.stats,
          cacheHits: state.stats.cacheHits + 1,
        }
      }
    }

    case "deduplicateRequest": {
      const request = state.requests[action.payload.id]
      if (!request) return state

      return {
        ...state,
        requests: {
          ...state.requests,
          [action.payload.id]: {
            ...request,
            status: "completed",
            endTime: Date.now(),
            duration: 0,
            metadata: {
              ...request.metadata,
              deduplicated: true,
            },
          }
        },
        stats: {
          ...state.stats,
          deduplicatedCount: state.stats.deduplicatedCount + 1,
        }
      }
    }

    case "clearCompleted": {
      const completedIds = Object.entries(state.requests)
        .filter(([_, request]) => request?.status === "completed")
        .map(([id]) => id)

      const newRequests = { ...state.requests }
      completedIds.forEach((id) => {
        delete newRequests[id]
      })

      return { ...state, requests: newRequests }
    }

    case "clearAll":
      return initialState

    default:
      return state
  }
}

// Create context store
const { useStoreState: useNetworkState, useStoreActions: useNetworkActions, Provider: NetworkProvider } = createContextStore<
  NetworkState,
  NetworkAction
>(
  "network-store",
  initialState,
  networkReducer
)

// Hook for using the network store with combined state and actions
export const useNetworkStore = () => {
  const state = useNetworkState()
  const actions = useNetworkActions()

  const selectors = {
    getActiveRequests: () => {
      return Object.values(state.requests).filter(
        (request): request is NetworkRequest => request?.status === "active"
      )
    },

    getCompletedRequests: () => {
      return Object.values(state.requests).filter(
        (request): request is NetworkRequest => request?.status === "completed"
      )
    },

    getErrorRequests: () => {
      return Object.values(state.requests).filter(
        (request): request is NetworkRequest => request?.status === "error"
      )
    },

    getRequestsByUrl: (url: string) => {
      return Object.values(state.requests).filter(
        (request): request is NetworkRequest => request?.url === url
      )
    },

    getRequestsByEntityType: (entityType: string) => {
      return Object.values(state.requests).filter(
        (request): request is NetworkRequest =>
          request?.metadata?.entityType === entityType
      )
    },

    getRequestById: (id: string) => {
      return state.requests[id] || null
    },
  }

  return {
    ...state,
    ...actions,
    ...selectors,
  }
}

export { NetworkProvider }
