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

  // Index signature to satisfy constraint
  [key: string]: (...args: never[]) => void;
}

// ID generator for requests
const generateRequestId = generateSequentialId("req");

const networkActivityStoreResult = createTrackedStore<
  NetworkActivityState & NetworkActivityActions
>({
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

  // Actions
  addRequest: function (request) {
    const id = generateRequestId();

    this.requests[id] = {
      ...request,
      id,
      startTime: Date.now(),
    };

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

  updateRequest: function (id, updates) {
    const request = this.requests[id];
    if (request) {
      Object.assign(request, updates);
    }
  },

  completeRequest: function (id, statusCode, size) {
    const endTime = Date.now();

    const request = this.requests[id];
    if (request) {
      request.status = "success";
      request.endTime = endTime;
      request.duration = endTime - request.startTime;
      if (statusCode !== undefined) request.statusCode = statusCode;
      if (size !== undefined) request.size = size;
    }
  },

  failRequest: function (id, error, statusCode) {
    const endTime = Date.now();

    const request = this.requests[id];
    if (request) {
      request.status = "error";
      request.endTime = endTime;
      request.duration = endTime - request.startTime;
      request.error = error;
      if (statusCode !== undefined) request.statusCode = statusCode;
    }

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

  removeRequest: function (id) {
    const { [id]: _removed, ...rest } = this.requests;
    this.requests = rest;
  },

  clearOldRequests: function () {
    const requests = Object.values(this.requests);

    if (requests.length <= this.maxHistorySize) return;

    // Keep most recent requests
    const sorted = requests.sort((a, b) => b.startTime - a.startTime);
    const toKeep = sorted.slice(0, this.maxHistorySize);

    this.requests = {};
    toKeep.forEach((req) => {
      this.requests[req.id] = req;
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

  clearAllRequests: function () {
    this.requests = {};

    logger.debug(
      "api",
      "Cleared all network requests",
      {},
      "NetworkActivityStore",
    );
  },

  // Filter actions
  setStatusFilter: function (statuses) {
    this.filters.status = statuses;
  },

  setTypeFilter: function (types) {
    this.filters.entityType = types;
  },

  setCategoryFilter: function (categories) {
    this.filters.category = categories;
  },

  setSearchTerm: function (term) {
    this.filters.searchTerm = term;
  },

  setTimeRange: function (hours) {
    this.filters.timeRange = hours;
  },

  clearFilters: function () {
    this.filters = {
      status: [],
      entityType: [],
      category: [],
      searchTerm: "",
      timeRange: 24,
    };
  },
});

export const useNetworkActivityStore = networkActivityStoreResult.useStore;

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
