/**
 * Network Activity Store with React Context and useReducer
 * Replaces Zustand with built-in React patterns for tracking network requests
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import { logger } from "@academic-explorer/utils/logger";

export interface NetworkRequest {
  id: string;
  entityType: "api" | "cache" | "worker" | "resource";
  category: "foreground" | "background";
  url: string;
  method: string;
  status: "pending" | "success" | "error" | "cached" | "deduplicated";
  statusCode?: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  size?: number;
  cacheStrategy?: string;
  error?: string;
  metadata?: {
    entityType?: string;
    entityId?: string;
    queryParams?: Record<string, unknown>;
    headers?: Record<string, string>;
    fromCache?: boolean;
    deduplicated?: boolean;
  };
}

export interface NetworkStats {
  totalRequests: number;
  activeRequests: number;
  successCount: number;
  errorCount: number;
  cacheHits: number;
  deduplicatedCount: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  totalDataTransferred: number;
}

interface NetworkActivityState {
  // State - using plain objects for immutability
  requests: Record<string, NetworkRequest>;
  maxHistorySize: number;

  // Filters
  filters: {
    status: string[];
    entityType: string[];
    category: string[];
    searchTerm: string;
    timeRange: number; // hours
  };
}

// Action types
type NetworkActivityAction =
  | { type: "ADD_REQUEST"; payload: { request: Omit<NetworkRequest, "id" | "startTime">; id: string } }
  | { type: "UPDATE_REQUEST"; payload: { id: string; updates: Partial<NetworkRequest> } }
  | { type: "COMPLETE_REQUEST"; payload: { id: string; statusCode?: number; size?: number } }
  | { type: "FAIL_REQUEST"; payload: { id: string; error: string; statusCode?: number } }
  | { type: "REMOVE_REQUEST"; payload: string }
  | { type: "CLEAR_OLD_REQUESTS" }
  | { type: "CLEAR_ALL_REQUESTS" }
  | { type: "SET_STATUS_FILTER"; payload: string[] }
  | { type: "SET_TYPE_FILTER"; payload: string[] }
  | { type: "SET_CATEGORY_FILTER"; payload: string[] }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_TIME_RANGE"; payload: number }
  | { type: "CLEAR_FILTERS" };

// ID generator for requests
const createRequestIdGenerator = (() => {
  let counter = 1;
  return (prefix = "req") => `${prefix}-${counter++}`;
})();

// Initial state
const getInitialState = (): NetworkActivityState => ({
  requests: {},
  maxHistorySize: 500,
  filters: {
    status: [],
    entityType: [],
    category: [],
    searchTerm: "",
    timeRange: 24, // 24 hours default
  },
});

// Reducer
const networkActivityReducer = (
  state: NetworkActivityState,
  action: NetworkActivityAction
): NetworkActivityState => {
  switch (action.type) {
    case "ADD_REQUEST": {
      const { request, id } = action.payload;
      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            id,
            startTime: Date.now(),
          },
        },
      };
    }

    case "UPDATE_REQUEST": {
      const { id, updates } = action.payload;
      const request = state.requests[id];
      if (!request) return state;

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            ...updates,
          },
        },
      };
    }

    case "COMPLETE_REQUEST": {
      const { id, statusCode, size } = action.payload;
      const request = state.requests[id];
      if (!request) return state;

      const endTime = Date.now();
      const duration = endTime - request.startTime;

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            status: "success",
            endTime,
            duration,
            ...(statusCode !== undefined && { statusCode }),
            ...(size !== undefined && { size }),
          },
        },
      };
    }

    case "FAIL_REQUEST": {
      const { id, error, statusCode } = action.payload;
      const request = state.requests[id];
      if (!request) return state;

      const endTime = Date.now();
      const duration = endTime - request.startTime;

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            status: "error",
            endTime,
            duration,
            error,
            ...(statusCode !== undefined && { statusCode }),
          },
        },
      };
    }

    case "REMOVE_REQUEST": {
      const { [action.payload]: _removed, ...rest } = state.requests;
      return {
        ...state,
        requests: rest,
      };
    }

    case "CLEAR_OLD_REQUESTS": {
      const requests = Object.values(state.requests);

      if (requests.length <= state.maxHistorySize) return state;

      // Keep most recent requests
      const sorted = requests.sort((a, b) => b.startTime - a.startTime);
      const toKeep = sorted.slice(0, state.maxHistorySize);

      const newRequests: Record<string, NetworkRequest> = {};
      toKeep.forEach((req) => {
        newRequests[req.id] = req;
      });

      return {
        ...state,
        requests: newRequests,
      };
    }

    case "CLEAR_ALL_REQUESTS": {
      return {
        ...state,
        requests: {},
      };
    }

    case "SET_STATUS_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          status: action.payload,
        },
      };
    }

    case "SET_TYPE_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          entityType: action.payload,
        },
      };
    }

    case "SET_CATEGORY_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          category: action.payload,
        },
      };
    }

    case "SET_SEARCH_TERM": {
      return {
        ...state,
        filters: {
          ...state.filters,
          searchTerm: action.payload,
        },
      };
    }

    case "SET_TIME_RANGE": {
      return {
        ...state,
        filters: {
          ...state.filters,
          timeRange: action.payload,
        },
      };
    }

    case "CLEAR_FILTERS": {
      return {
        ...state,
        filters: {
          status: [],
          entityType: [],
          category: [],
          searchTerm: "",
          timeRange: 24,
        },
      };
    }

    default:
      return state;
  }
};

// Context
const NetworkActivityContext = createContext<{
  state: NetworkActivityState;
  dispatch: React.Dispatch<NetworkActivityAction>;
} | null>(null);

// Provider component
export const NetworkActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(networkActivityReducer, getInitialState());

  const value = { state, dispatch };
  return (
    <NetworkActivityContext.Provider value={value}>
      {children}
    </NetworkActivityContext.Provider>
  );
};

// Hook for using network activity state
export const useNetworkActivityState = () => {
  const context = useContext(NetworkActivityContext);
  if (!context) {
    throw new Error("useNetworkActivityState must be used within NetworkActivityProvider");
  }
  return context.state;
};

// Hook for using network activity actions
export const useNetworkActivityActions = () => {
  const context = useContext(NetworkActivityContext);
  if (!context) {
    throw new Error("useNetworkActivityActions must be used within NetworkActivityProvider");
  }

  return {
    addRequest: useCallback((request: Omit<NetworkRequest, "id" | "startTime">) => {
      const id = createRequestIdGenerator("req");

      context.dispatch({
        type: "ADD_REQUEST",
        payload: { request, id }
      });

      logger.debug(
        "api",
        "Network request added",
        {
          id,
          url: request.url,
          entityType: request.entityType,
          category: request.category,
        },
        "NetworkActivityStore",
      );

      return id;
    }, [context.dispatch]),

    updateRequest: useCallback((id: string, updates: Partial<NetworkRequest>) => {
      context.dispatch({
        type: "UPDATE_REQUEST",
        payload: { id, updates }
      });
    }, [context.dispatch]),

    completeRequest: useCallback((id: string, statusCode?: number, size?: number) => {
      context.dispatch({
        type: "COMPLETE_REQUEST",
        payload: { id, statusCode, size }
      });
    }, [context.dispatch]),

    failRequest: useCallback((id: string, error: string, statusCode?: number) => {
      context.dispatch({
        type: "FAIL_REQUEST",
        payload: { id, error, statusCode }
      });

      logger.warn(
        "api",
        "Network request failed",
        {
          id,
          error,
          statusCode,
        },
        "NetworkActivityStore",
      );
    }, [context.dispatch]),

    removeRequest: useCallback((id: string) => {
      context.dispatch({
        type: "REMOVE_REQUEST",
        payload: id
      });
    }, [context.dispatch]),

    clearOldRequests: useCallback(() => {
      const currentState = context.state;
      const requests = Object.values(currentState.requests);

      if (requests.length <= currentState.maxHistorySize) return;

      context.dispatch({ type: "CLEAR_OLD_REQUESTS" });

      const sorted = requests.sort((a, b) => b.startTime - a.startTime);
      const toKeep = sorted.slice(0, currentState.maxHistorySize);

      logger.debug(
        "api",
        "Cleared old network requests",
        {
          removed: requests.length - toKeep.length,
          kept: toKeep.length,
        },
        "NetworkActivityStore",
      );
    }, [context.dispatch, context.state]),

    clearAllRequests: useCallback(() => {
      context.dispatch({ type: "CLEAR_ALL_REQUESTS" });

      logger.debug(
        "api",
        "Cleared all network requests",
        {},
        "NetworkActivityStore",
      );
    }, [context.dispatch]),

    // Filter actions
    setStatusFilter: useCallback((statuses: string[]) => {
      context.dispatch({
        type: "SET_STATUS_FILTER",
        payload: statuses
      });
    }, [context.dispatch]),

    setTypeFilter: useCallback((types: string[]) => {
      context.dispatch({
        type: "SET_TYPE_FILTER",
        payload: types
      });
    }, [context.dispatch]),

    setCategoryFilter: useCallback((categories: string[]) => {
      context.dispatch({
        type: "SET_CATEGORY_FILTER",
        payload: categories
      });
    }, [context.dispatch]),

    setSearchTerm: useCallback((term: string) => {
      context.dispatch({
        type: "SET_SEARCH_TERM",
        payload: term
      });
    }, [context.dispatch]),

    setTimeRange: useCallback((hours: number) => {
      context.dispatch({
        type: "SET_TIME_RANGE",
        payload: hours
      });
    }, [context.dispatch]),

    clearFilters: useCallback(() => {
      context.dispatch({ type: "CLEAR_FILTERS" });
    }, [context.dispatch]),
  };
};

// Combined hook for both state and actions
export const useNetworkActivityStore = () => {
  const state = useNetworkActivityState();
  const actions = useNetworkActivityActions();

  // Memoized computed values
  const computedValues = useMemo(() => {
    const getActiveRequests = useCallback(() => {
      return Object.values(state.requests).filter((req) => req.status === "pending");
    }, [state.requests]);

    const getRecentRequests = useCallback(() => {
      return Object.values(state.requests)
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 50);
    }, [state.requests]);

    const getNetworkStats = useCallback((): NetworkStats => {
      const requestList = Object.values(state.requests);
      const now = Date.now();
      const oneSecondAgo = now - 1000;

      const recentRequests = requestList.filter(
        (req) => req.startTime > oneSecondAgo,
      );
      const completedRequests = requestList.filter(
        (req) => req.endTime !== undefined,
      );
      const totalDuration = completedRequests.reduce(
        (sum, req) => sum + (req.duration ?? 0),
        0,
      );

      return {
        totalRequests: requestList.length,
        activeRequests: requestList.filter((req) => req.status === "pending").length,
        successCount: requestList.filter((req) => req.status === "success").length,
        errorCount: requestList.filter((req) => req.status === "error").length,
        cacheHits: requestList.filter((req) => req.status === "cached").length,
        deduplicatedCount: requestList.filter(
          (req) => req.status === "deduplicated",
        ).length,
        averageResponseTime:
          completedRequests.length > 0
            ? totalDuration / completedRequests.length
            : 0,
        requestsPerSecond: recentRequests.length,
        totalDataTransferred: requestList.reduce(
          (sum, req) => sum + (req.size ?? 0),
          0,
        ),
      };
    }, [state.requests]);

    const getFilteredRequests = useCallback(() => {
      const requestList = Object.values(state.requests);
      const cutoffTime = Date.now() - state.filters.timeRange * 60 * 60 * 1000;

      return requestList
        .filter((req) => {
          // Time range filter
          if (req.startTime < cutoffTime) return false;

          // Status filter
          if (
            state.filters.status.length > 0 &&
            !state.filters.status.includes(req.status)
          )
            return false;

          // Type filter
          if (
            state.filters.entityType.length > 0 &&
            !state.filters.entityType.includes(req.entityType)
          )
            return false;

          // Category filter
          if (
            state.filters.category.length > 0 &&
            !state.filters.category.includes(req.category)
          )
            return false;

          // Search term filter
          if (state.filters.searchTerm) {
            const term = state.filters.searchTerm.toLowerCase();
            const searchableText = [
              req.url,
              req.method,
              req.metadata?.entityType,
              req.metadata?.entityId,
              req.error,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (!searchableText.includes(term)) return false;
          }

          return true;
        })
        .sort((a, b) => b.startTime - a.startTime);
    }, [state.requests, state.filters]);

    return {
      getActiveRequests,
      getRecentRequests,
      getNetworkStats,
      getFilteredRequests,
    };
  }, [state.requests, state.filters]);

  return {
    ...state,
    ...actions,
    ...computedValues,
  };
};

// Selector hook for optimized re-renders
export const useNetworkActivitySelector = <T,>(
  selector: (state: NetworkActivityState) => T
): T => {
  const state = useNetworkActivityState();
  return selector(state);
};

// Legacy selectors for backward compatibility
export const selectActiveRequests = (state: NetworkActivityState) =>
  Object.values(state.requests).filter((req) => req.status === "pending");

export const selectRecentRequests = (state: NetworkActivityState) =>
  Object.values(state.requests)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 50);

export const selectNetworkStats = (state: NetworkActivityState): NetworkStats => {
  const requestList = Object.values(state.requests);
  const now = Date.now();
  const oneSecondAgo = now - 1000;

  const recentRequests = requestList.filter(
    (req) => req.startTime > oneSecondAgo,
  );
  const completedRequests = requestList.filter(
    (req) => req.endTime !== undefined,
  );
  const totalDuration = completedRequests.reduce(
    (sum, req) => sum + (req.duration ?? 0),
    0,
  );

  return {
    totalRequests: requestList.length,
    activeRequests: requestList.filter((req) => req.status === "pending")
      .length,
    successCount: requestList.filter((req) => req.status === "success").length,
    errorCount: requestList.filter((req) => req.status === "error").length,
    cacheHits: requestList.filter((req) => req.status === "cached").length,
    deduplicatedCount: requestList.filter(
      (req) => req.status === "deduplicated",
    ).length,
    averageResponseTime:
      completedRequests.length > 0
        ? totalDuration / completedRequests.length
        : 0,
    requestsPerSecond: recentRequests.length,
    totalDataTransferred: requestList.reduce(
      (sum, req) => sum + (req.size ?? 0),
      0,
    ),
  };
};

export const selectFilteredRequests = (state: NetworkActivityState) => {
  const requestList = Object.values(state.requests);
  const cutoffTime = Date.now() - state.filters.timeRange * 60 * 60 * 1000;

  return requestList
    .filter((req) => {
      // Time range filter
      if (req.startTime < cutoffTime) return false;

      // Status filter
      if (
        state.filters.status.length > 0 &&
        !state.filters.status.includes(req.status)
      )
        return false;

      // Type filter
      if (
        state.filters.entityType.length > 0 &&
        !state.filters.entityType.includes(req.entityType)
      )
        return false;

      // Category filter
      if (
        state.filters.category.length > 0 &&
        !state.filters.category.includes(req.category)
      )
        return false;

      // Search term filter
      if (state.filters.searchTerm) {
        const term = state.filters.searchTerm.toLowerCase();
        const searchableText = [
          req.url,
          req.method,
          req.metadata?.entityType,
          req.metadata?.entityId,
          req.error,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(term)) return false;
      }

      return true;
    })
    .sort((a, b) => b.startTime - a.startTime);
};