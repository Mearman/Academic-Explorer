/**
 * Store for tracking data fetching progress
 * Manages progress state for background data fetching operations
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface DataFetchingProgressItem {
  nodeId: string;
  entityName?: string;
  entityType?: string;
  progress: {
    completed: number;
    total: number;
    stage: string;
  };
  status: 'active' | 'completed' | 'error';
  error?: string;
  startTime: number;
}

interface DataFetchingProgressState {
  // State - using plain object instead of Map for Immer compatibility
  requests: Record<string, DataFetchingProgressItem>;
  workerReady: boolean;

  // Actions
  addRequest: (nodeId: string, entityName?: string, entityType?: string) => void;
  updateProgress: (nodeId: string, progress: { completed: number; total: number; stage: string }) => void;
  completeRequest: (nodeId: string) => void;
  failRequest: (nodeId: string, error: string) => void;
  removeRequest: (nodeId: string) => void;
  setWorkerReady: (ready: boolean) => void;
  clearCompleted: () => void;
  clearAll: () => void;

  // Selectors
  getActiveRequests: () => DataFetchingProgressItem[];
  getRequestByNodeId: (nodeId: string) => DataFetchingProgressItem | undefined;
}

export const useDataFetchingProgressStore = create<DataFetchingProgressState>()(
  immer((set, get) => ({
    // State - using plain object for Immer compatibility
    requests: {},
    workerReady: false,

    // Actions
    addRequest: (nodeId: string, entityName?: string, entityType?: string) =>
      set((state) => {
        state.requests[nodeId] = {
          nodeId,
          entityName,
          entityType,
          progress: {
            completed: 0,
            total: 1,
            stage: "Starting..."
          },
          status: 'active',
          startTime: Date.now()
        };
      }),

    updateProgress: (nodeId: string, progress: { completed: number; total: number; stage: string }) =>
      set((state) => {
        const request = state.requests[nodeId];
        if (request && request.status === 'active') {
          request.progress = progress;
        }
      }),

    completeRequest: (nodeId: string) =>
      set((state) => {
        const request = state.requests[nodeId];
        if (request) {
          request.status = 'completed';
          request.progress = {
            completed: request.progress.total,
            total: request.progress.total,
            stage: "Completed"
          };

          // Auto-remove completed requests after 3 seconds
          setTimeout(() => {
            get().removeRequest(nodeId);
          }, 3000);
        }
      }),

    failRequest: (nodeId: string, error: string) =>
      set((state) => {
        const request = state.requests[nodeId];
        if (request) {
          request.status = 'error';
          request.error = error;
          request.progress = {
            completed: 0,
            total: request.progress.total,
            stage: "Failed"
          };

          // Auto-remove failed requests after 5 seconds
          setTimeout(() => {
            get().removeRequest(nodeId);
          }, 5000);
        }
      }),

    removeRequest: (nodeId: string) =>
      set((state) => {
        delete state.requests[nodeId];
      }),

    setWorkerReady: (ready: boolean) =>
      set((state) => {
        state.workerReady = ready;
      }),

    clearCompleted: () =>
      set((state) => {
        Object.keys(state.requests).forEach(nodeId => {
          if (state.requests[nodeId].status === 'completed') {
            delete state.requests[nodeId];
          }
        });
      }),

    clearAll: () =>
      set((state) => {
        state.requests = {};
      }),

    // Selectors
    getActiveRequests: () => {
      return Object.values(get().requests);
    },

    getRequestByNodeId: (nodeId: string) => {
      return get().requests[nodeId];
    }
  }))
);