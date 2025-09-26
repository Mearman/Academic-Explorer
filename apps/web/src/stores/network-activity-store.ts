/**
 * Store for tracking network activity and API requests
 * Monitors all HTTP requests with real-time status updates
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
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

  // Cached computed state for stable references
  activeRequests: NetworkRequest[];
  recentRequests: NetworkRequest[];
  networkStats: NetworkStats;
  filteredRequests: NetworkRequest[];

  // Filters
  filters: {
    status: string[];
    entityType: string[];
    category: string[];
    searchTerm: string;
    timeRange: number; // hours
  };

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

  // Recomputation functions (called after mutations)
  recomputeActiveRequests: () => void;
  recomputeRecentRequests: () => void;
  recomputeNetworkStats: () => void;
  recomputeFilteredRequests: () => void;
  recomputeAll: () => void;
}

const generateRequestId = () => `req_${Date.now().toString()}_${Math.random().toString(36).substring(2, 11)}`;

const computeActiveRequests = (requests: Record<string, NetworkRequest>): NetworkRequest[] => {
	return Object.values(requests).filter(req => req.status === "pending");
};

const computeRecentRequests = (requests: Record<string, NetworkRequest>): NetworkRequest[] => {
	return Object.values(requests)
		.sort((a, b) => b.startTime - a.startTime)
		.slice(0, 50); // Show last 50 requests
};

const computeNetworkStats = (requests: Record<string, NetworkRequest>): NetworkStats => {
	const requestList = Object.values(requests);
	const now = Date.now();
	const oneSecondAgo = now - 1000;

	const recentRequests = requestList.filter(req => req.startTime > oneSecondAgo);
	const completedRequests = requestList.filter(req => req.endTime !== undefined);
	const totalDuration = completedRequests.reduce((sum, req) => sum + (req.duration ?? 0), 0);

	return {
		totalRequests: requestList.length,
		activeRequests: requestList.filter(req => req.status === "pending").length,
		successCount: requestList.filter(req => req.status === "success").length,
		errorCount: requestList.filter(req => req.status === "error").length,
		cacheHits: requestList.filter(req => req.status === "cached").length,
		deduplicatedCount: requestList.filter(req => req.status === "deduplicated").length,
		averageResponseTime: completedRequests.length > 0 ? totalDuration / completedRequests.length : 0,
		requestsPerSecond: recentRequests.length,
		totalDataTransferred: requestList.reduce((sum, req) => sum + (req.size ?? 0), 0),
	};
};

const computeFilteredRequests = (
	requests: Record<string, NetworkRequest>,
	filters: NetworkActivityState["filters"]
): NetworkRequest[] => {
	const requestList = Object.values(requests);
	const cutoffTime = Date.now() - (filters.timeRange * 60 * 60 * 1000);

	return requestList.filter(req => {
		// Time range filter
		if (req.startTime < cutoffTime) return false;

		// Status filter
		if (filters.status.length > 0 && !filters.status.includes(req.status)) return false;

		// Type filter
		if (filters.entityType.length > 0 && !filters.entityType.includes(req.entityType)) return false;

		// Category filter
		if (filters.category.length > 0 && !filters.category.includes(req.category)) return false;

		// Search term filter
		if (filters.searchTerm) {
			const term = filters.searchTerm.toLowerCase();
			const searchableText = [
				req.url,
				req.method,
				req.metadata?.entityType,
				req.metadata?.entityId,
				req.error
			].filter(Boolean).join(" ").toLowerCase();

			if (!searchableText.includes(term)) return false;
		}

		return true;
	}).sort((a, b) => b.startTime - a.startTime);
};

export const useNetworkActivityStore = create<NetworkActivityState>()(
	immer((set, get) => ({
		// State
		requests: {},
		maxHistorySize: 500,

		// Cached computed state (stable references)
		activeRequests: [],
		recentRequests: [],
		networkStats: {
			totalRequests: 0,
			activeRequests: 0,
			successCount: 0,
			errorCount: 0,
			cacheHits: 0,
			deduplicatedCount: 0,
			averageResponseTime: 0,
			requestsPerSecond: 0,
			totalDataTransferred: 0,
		},
		filteredRequests: [],

		// Filters
		filters: {
			status: [],
			entityType: [],
			category: [],
			searchTerm: "",
			timeRange: 24, // 24 hours default
		},

		// Actions
		addRequest: (request) => {
			const id = generateRequestId();

			set(state => {
				state.requests[id] = {
					...request,
					id,
					startTime: Date.now(),
				};
			});

			get().recomputeAll();

			logger.debug("api", "Network request added", {
				id,
				url: request.url,
				entityType: request.entityType,
				category: request.category
			}, "NetworkActivityStore");

			return id;
		},

		updateRequest: (id, updates) => {
			set(state => {
				const request = state.requests[id];
				if (request) {
					Object.assign(request, updates);
				}
			});

			get().recomputeAll();
		},

		completeRequest: (id, statusCode, size) => {
			const endTime = Date.now();

			set(state => {
				const request = state.requests[id];
				if (request) {
					request.status = "success";
					request.endTime = endTime;
					request.duration = endTime - request.startTime;
					if (statusCode !== undefined) request.statusCode = statusCode;
					if (size !== undefined) request.size = size;
				}
			});

			get().recomputeAll();
		},

		failRequest: (id, error, statusCode) => {
			const endTime = Date.now();

			set(state => {
				const request = state.requests[id];
				if (request) {
					request.status = "error";
					request.endTime = endTime;
					request.duration = endTime - request.startTime;
					request.error = error;
					if (statusCode !== undefined) request.statusCode = statusCode;
				}
			});

			get().recomputeAll();

			logger.warn("api", "Network request failed", {
				id,
				error,
				statusCode
			}, "NetworkActivityStore");
		},

		removeRequest: (id) => {
			set(state => {
				const { [id]: removed, ...rest } = state.requests;
				state.requests = rest;
			});

			get().recomputeAll();
		},

		clearOldRequests: () => {
			const { maxHistorySize } = get();
			const requests = Object.values(get().requests);

			if (requests.length <= maxHistorySize) return;

			// Keep most recent requests
			const sorted = requests.sort((a, b) => b.startTime - a.startTime);
			const toKeep = sorted.slice(0, maxHistorySize);

			set(state => {
				state.requests = {};
				toKeep.forEach(req => {
					state.requests[req.id] = req;
				});
			});

			get().recomputeAll();

			logger.debug("api", "Cleared old network requests", {
				removed: requests.length - toKeep.length,
				kept: toKeep.length
			}, "NetworkActivityStore");
		},

		clearAllRequests: () => {
			set(state => {
				state.requests = {};
			});

			get().recomputeAll();

			logger.debug("api", "Cleared all network requests", {}, "NetworkActivityStore");
		},

		// Filter actions
		setStatusFilter: (statuses) => {
			set(state => {
				state.filters.status = statuses;
			});
			get().recomputeFilteredRequests();
		},

		setTypeFilter: (types) => {
			set(state => {
				state.filters.entityType = types;
			});
			get().recomputeFilteredRequests();
		},

		setCategoryFilter: (categories) => {
			set(state => {
				state.filters.category = categories;
			});
			get().recomputeFilteredRequests();
		},

		setSearchTerm: (term) => {
			set(state => {
				state.filters.searchTerm = term;
			});
			get().recomputeFilteredRequests();
		},

		setTimeRange: (hours) => {
			set(state => {
				state.filters.timeRange = hours;
			});
			get().recomputeFilteredRequests();
		},

		clearFilters: () => {
			set(state => {
				state.filters = {
					status: [],
					entityType: [],
					category: [],
					searchTerm: "",
					timeRange: 24,
				};
			});
			get().recomputeFilteredRequests();
		},

		// Recomputation functions (called after mutations)
		recomputeActiveRequests: () => {
			set(state => {
				state.activeRequests = computeActiveRequests(state.requests);
			});
		},

		recomputeRecentRequests: () => {
			set(state => {
				state.recentRequests = computeRecentRequests(state.requests);
			});
		},

		recomputeNetworkStats: () => {
			set(state => {
				state.networkStats = computeNetworkStats(state.requests);
			});
		},

		recomputeFilteredRequests: () => {
			set(state => {
				state.filteredRequests = computeFilteredRequests(state.requests, state.filters);
			});
		},

		recomputeAll: () => {
			const state = get();
			state.recomputeActiveRequests();
			state.recomputeRecentRequests();
			state.recomputeNetworkStats();
			state.recomputeFilteredRequests();

			// Auto-cleanup old requests
			if (Object.keys(state.requests).length > state.maxHistorySize) {
				state.clearOldRequests();
			}
		},
	}))
);