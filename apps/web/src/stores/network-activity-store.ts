/**
 * Store for tracking network activity and API requests
 * Monitors all HTTP requests with real-time status updates
 * Uses shared createTrackedStore abstraction for DRY compliance
 */

import {
  generateSequentialId,
  createTrackedStore,
} from "@academic-explorer/utils/state";
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
  // State - using plain objects for Immer compatibility
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

interface NetworkActivityActions {
  // Actions
  addRequest: (request: Omit<NetworkRequest, "id" | "startTime">) => string;
  updateRequest: (id: string, updates: Partial<NetworkRequest>) => void;
  completeRequest: (id: string, statusCode?: number, size?: number) => void;
  failRequest: (id: string, error: string, statusCode?: number) => void;
  removeRequest: (id: string) => void;
  clearOldRequests: () => void;
  clearAllRequests: () => void;

  // Filter actions
  setStatusFilter: (statuses: string[]) => void;
  setTypeFilter: (types: string[]) => void;
  setCategoryFilter: (categories: string[]) => void;
  setSearchTerm: (term: string) => void;
  setTimeRange: (hours: number) => void;
  clearFilters: () => void;
}

// ID generator for requests
const generateRequestId = generateSequentialId("req");

const { useStore: useNetworkActivityStore } = createTrackedStore<
  NetworkActivityState,
  NetworkActivityActions
>(
  {
    name: "network-activity",
    initialState: {
      // State
      requests: {},
      maxHistorySize: 500,

      // Filters
      filters: {
        status: [],
        entityType: [],
        category: [],
        searchTerm: "",
        timeRange: 24, // 24 hours default
      },
    },
  },
  (set, get) => ({
    // Actions
    addRequest: (request) => {
      const id = generateRequestId();

      set((state) => {
        state.requests[id] = {
          ...request,
          id,
          startTime: Date.now(),
        };
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
    },

    updateRequest: (id, updates) => {
      set((state) => {
        const request = state.requests[id] as NetworkRequest | undefined;
        if (request) {
          Object.assign(request, updates);
        }
      });
    },

    completeRequest: (id, statusCode, size) => {
      const endTime = Date.now();

      set((state) => {
        const request = state.requests[id] as NetworkRequest | undefined;
        if (request) {
          request.status = "success";
          request.endTime = endTime;
          request.duration = endTime - request.startTime;
          if (statusCode !== undefined) request.statusCode = statusCode;
          if (size !== undefined) request.size = size;
        }
      });
    },

    failRequest: (id, error, statusCode) => {
      const endTime = Date.now();

      set((state) => {
        const request = state.requests[id] as NetworkRequest | undefined;
        if (request) {
          request.status = "error";
          request.endTime = endTime;
          request.duration = endTime - request.startTime;
          request.error = error;
          if (statusCode !== undefined) request.statusCode = statusCode;
        }
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
    },

    removeRequest: (id) => {
      set((state) => {
        const { [id]: _removed, ...rest } = state.requests;
        state.requests = rest;
      });
    },

    clearOldRequests: () => {
      const { maxHistorySize } = get();
      const requests = Object.values(get().requests);

      if (requests.length <= maxHistorySize) return;

      // Keep most recent requests
      const sorted = requests.sort((a, b) => b.startTime - a.startTime);
      const toKeep = sorted.slice(0, maxHistorySize);

      set((state) => {
        state.requests = {};
        toKeep.forEach((req) => {
          state.requests[req.id] = req;
        });
      });

      logger.debug(
        "api",
        "Cleared old network requests",
        {
          removed: requests.length - toKeep.length,
          kept: toKeep.length,
        },
        "NetworkActivityStore",
      );
    },

    clearAllRequests: () => {
      set((state) => {
        state.requests = {};
      });

      logger.debug(
        "api",
        "Cleared all network requests",
        {},
        "NetworkActivityStore",
      );
    },

    // Filter actions
    setStatusFilter: (statuses) => {
      set((state) => {
        state.filters.status = statuses;
      });
    },

    setTypeFilter: (types) => {
      set((state) => {
        state.filters.entityType = types;
      });
    },

    setCategoryFilter: (categories) => {
      set((state) => {
        state.filters.category = categories;
      });
    },

    setSearchTerm: (term) => {
      set((state) => {
        state.filters.searchTerm = term;
      });
    },

    setTimeRange: (hours) => {
      set((state) => {
        state.filters.timeRange = hours;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = {
          status: [],
          entityType: [],
          category: [],
          searchTerm: "",
          timeRange: 24,
        };
      });
    },
  }),
);

export { useNetworkActivityStore };

// Selectors for computed state
export const selectActiveRequests = (state: NetworkActivityState) =>
  Object.values(state.requests).filter((req) => req.status === "pending");

export const selectRecentRequests = (state: NetworkActivityState) =>
  Object.values(state.requests)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 50);

export const selectNetworkStats = (state: NetworkActivityState) => {
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
