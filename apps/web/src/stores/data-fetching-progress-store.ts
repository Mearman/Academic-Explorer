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
  DataFetchingProgressState,
  DataFetchingProgressActions
>({
  config: {
    name: "data-fetching-progress",
    initialState: {
      requests: {},
      workerReady: false,
    },
  },
  actionsFactory: ({ set, get }) => ({
    addRequest: (nodeId: string, entityName?: string, entityType?: string) => {
      set((state) => {
        state.requests[nodeId] = {
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
      });
    },

    updateProgress: (
      nodeId: string,
      progress: { completed: number; total: number; stage: string },
    ) => {
      set((state) => {
        const request = state.requests[nodeId];
        if (request?.status === "active") {
          request.progress = progress;
        }
      });
    },

    completeRequest: (nodeId: string) => {
      set((state) => {
        const request = state.requests[nodeId];
        if (request) {
          request.status = "completed";
          request.progress = {
            completed: request.progress.total,
            total: request.progress.total,
            stage: "Completed",
          };

          // Auto-remove completed requests after 3 seconds
          setTimeout(() => {
            set((state) => {
              delete state.requests[nodeId];
            });
          }, 3000);
        }
      });
    },

    failRequest: (nodeId: string, error: string) => {
      set((state) => {
        const request = state.requests[nodeId];
        if (request) {
          request.status = "error";
          request.error = error;
        }
      });
    },

    removeRequest: (nodeId: string) => {
      set((state) => {
        delete state.requests[nodeId];
      });
    },

    setWorkerReady: (ready: boolean) => {
      set((state) => {
        state.workerReady = ready;
      });
    },

    getActiveRequests: () => {
      const state = get();
      return Object.values(state.requests).filter(
        (req): req is DataFetchingProgressItem => req?.status === "active",
      );
    },

    getCompletedRequests: () => {
      const state = get();
      return Object.values(state.requests).filter(
        (req): req is DataFetchingProgressItem => req?.status === "completed",
      );
    },

    getFailedRequests: () => {
      const state = get();
      return Object.values(state.requests).filter(
        (req): req is DataFetchingProgressItem => req?.status === "error",
      );
    },

    clearCompleted: () => {
      set((state) => {
        Object.keys(state.requests).forEach((nodeId) => {
          const request = state.requests[nodeId];
          if (request?.status === "completed") {
            delete state.requests[nodeId];
          }
        });
      });
    },

    clearAll: () => {
      set((state) => {
        state.requests = {};
      });
    },

    getRequestByNodeId: (nodeId: string) => {
      const state = get();
      return state.requests[nodeId];
    },
  }),
});

export const useDataFetchingProgressStore =
  dataFetchingProgressStoreResult.useStore;
