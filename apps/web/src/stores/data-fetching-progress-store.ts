/**
 * Store for tracking data fetching progress
 * Manages progress state for background data fetching operations
 * Uses shared createTrackedStore abstraction for DRY compliance
 */

import { createTrackedStore } from "@academic-explorer/utils/state";

export interface DataFetchingProgressItem {
  nodeId: string;
  entityName?: string;
  entityType?: string;
  progress: {
    completed: number;
    total: number;
    stage: string;
  };
  status: "active" | "completed" | "error";
  error?: string;
  startTime: number;
}

interface DataFetchingProgressState {
  // State - using plain object instead of Map for Immer compatibility
  requests: Record<string, DataFetchingProgressItem | undefined>;
  workerReady: boolean;
}

interface DataFetchingProgressActions {
  // Actions
  addRequest: (
    nodeId: string,
    entityName?: string,
    entityType?: string,
  ) => void;
  updateProgress: (
    nodeId: string,
    progress: { completed: number; total: number; stage: string },
  ) => void;
  completeRequest: (nodeId: string) => void;
  failRequest: (nodeId: string, error: string) => void;
  removeRequest: (nodeId: string) => void;
  setWorkerReady: (ready: boolean) => void;
  clearCompleted: () => void;
  clearAll: () => void;

  // Selectors
  getActiveRequests: () => DataFetchingProgressItem[];
  getRequestByNodeId: (nodeId: string) => DataFetchingProgressItem | undefined;

  // Index signature to satisfy constraint
  [key: string]: (...args: never[]) => void;
}

const dataFetchingProgressStoreResult = createTrackedStore<
  DataFetchingProgressState & DataFetchingProgressActions
>({
  // State - using plain object for Immer compatibility
  requests: {},
  workerReady: false,

  // Actions
  addRequest: function (
    nodeId: string,
    entityName?: string,
    entityType?: string,
  ) {
    this.requests[nodeId] = {
      nodeId,
      ...(entityName && { entityName }),
      ...(entityType && { entityType }),
      progress: {
        completed: 0,
        total: 1,
        stage: "Starting...",
      },
      status: "active",
      startTime: Date.now(),
    };
  },

  updateProgress: function (
    nodeId: string,
    progress: { completed: number; total: number; stage: string },
  ) {
    const request = this.requests[nodeId];
    if (request?.status === "active") {
      request.progress = progress;
    }
  },

  completeRequest: function (nodeId: string) {
    const request = this.requests[nodeId];
    if (request) {
      request.status = "completed";
      request.progress = {
        completed: request.progress.total,
        total: request.progress.total,
        stage: "Completed",
      };

      // Auto-remove completed requests after 3 seconds
      setTimeout(() => {
        this.removeRequest(nodeId);
      }, 3000);
    }
  },

  failRequest: function (nodeId: string, error: string) {
    const request = this.requests[nodeId];
    if (request) {
      request.status = "error";
      request.error = error;
      request.progress = {
        completed: 0,
        total: request.progress.total,
        stage: "Failed",
      };

      // Auto-remove failed requests after 5 seconds
      setTimeout(() => {
        this.removeRequest(nodeId);
      }, 5000);
    }
  },

  removeRequest: function (nodeId: string) {
    const { [nodeId]: _removed, ...rest } = this.requests;
    this.requests = rest;
  },

  setWorkerReady: function (ready: boolean) {
    this.workerReady = ready;
  },

  clearCompleted: function () {
    const filteredRequests: Record<string, DataFetchingProgressItem> = {};
    Object.entries(this.requests).forEach(([nodeId, request]) => {
      if (request && request.status !== "completed") {
        filteredRequests[nodeId] = request;
      }
    });
    this.requests = filteredRequests;
  },

  clearAll: function () {
    this.requests = {};
  },

  // Selectors
  getActiveRequests: function () {
    return Object.values(this.requests).filter(
      (request): request is NonNullable<typeof request> => request != null,
    );
  },

  getRequestByNodeId: function (nodeId: string) {
    return this.requests[nodeId];
  },
});

export const useDataFetchingProgressStore =
  dataFetchingProgressStoreResult.useStore;
