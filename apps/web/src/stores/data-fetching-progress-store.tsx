/**
 * Data Fetching Progress Store with React Context and useReducer
 * React Context-based implementation for tracking data fetching progress
 * Manages progress state for background data fetching operations
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import { logger } from "@academic-explorer/utils/logger";

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
  // State - using plain object instead of Map for immutability
  requests: Record<string, DataFetchingProgressItem | undefined>;
  workerReady: boolean;
}

// Action types
type DataFetchingProgressAction =
  | { type: "ADD_REQUEST"; payload: { nodeId: string; entityName?: string; entityType?: string } }
  | { type: "UPDATE_PROGRESS"; payload: { nodeId: string; progress: { completed: number; total: number; stage: string } } }
  | { type: "COMPLETE_REQUEST"; payload: string }
  | { type: "FAIL_REQUEST"; payload: { nodeId: string; error: string } }
  | { type: "REMOVE_REQUEST"; payload: string }
  | { type: "SET_WORKER_READY"; payload: boolean }
  | { type: "CLEAR_COMPLETED" }
  | { type: "CLEAR_ALL" };

// Initial state
const getInitialState = (): DataFetchingProgressState => ({
  requests: {},
  workerReady: false,
});

// Reducer
const dataFetchingProgressReducer = (
  state: DataFetchingProgressState,
  action: DataFetchingProgressAction
): DataFetchingProgressState => {
  switch (action.type) {
    case "ADD_REQUEST": {
      const { nodeId, entityName, entityType } = action.payload;

      return {
        ...state,
        requests: {
          ...state.requests,
          [nodeId]: {
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
          },
        },
      };
    }

    case "UPDATE_PROGRESS": {
      const { nodeId, progress } = action.payload;
      const request = state.requests[nodeId];

      if (!request || request.status !== "active") {
        return state;
      }

      return {
        ...state,
        requests: {
          ...state.requests,
          [nodeId]: {
            ...request,
            progress,
          },
        },
      };
    }

    case "COMPLETE_REQUEST": {
      const nodeId = action.payload;
      const request = state.requests[nodeId];

      if (!request) {
        return state;
      }

      const completedRequest = {
        ...request,
        status: "completed" as const,
        progress: {
          completed: request.progress.total,
          total: request.progress.total,
          stage: "Completed",
        },
      };

      return {
        ...state,
        requests: {
          ...state.requests,
          [nodeId]: completedRequest,
        },
      };
    }

    case "FAIL_REQUEST": {
      const { nodeId, error } = action.payload;
      const request = state.requests[nodeId];

      if (!request) {
        return state;
      }

      return {
        ...state,
        requests: {
          ...state.requests,
          [nodeId]: {
            ...request,
            status: "error",
            error,
          },
        },
      };
    }

    case "REMOVE_REQUEST": {
      const nodeId = action.payload;
      const { [nodeId]: _removed, ...remainingRequests } = state.requests;

      return {
        ...state,
        requests: remainingRequests,
      };
    }

    case "SET_WORKER_READY": {
      return {
        ...state,
        workerReady: action.payload,
      };
    }

    case "CLEAR_COMPLETED": {
      const filteredRequests: Record<string, DataFetchingProgressItem | undefined> = {};

      Object.entries(state.requests).forEach(([nodeId, request]) => {
        if (request && request.status !== "completed") {
          filteredRequests[nodeId] = request;
        }
      });

      return {
        ...state,
        requests: filteredRequests,
      };
    }

    case "CLEAR_ALL": {
      return {
        ...state,
        requests: {},
      };
    }

    default:
      return state;
  }
};

// Context
const DataFetchingProgressContext = createContext<{
  state: DataFetchingProgressState;
  dispatch: React.Dispatch<DataFetchingProgressAction>;
} | null>(null);

// Provider component
export const DataFetchingProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataFetchingProgressReducer, getInitialState());

  const value = { state, dispatch };
  return (
    <DataFetchingProgressContext.Provider value={value}>
      {children}
    </DataFetchingProgressContext.Provider>
  );
};

// Hook for using data fetching progress state
export const useDataFetchingProgressState = () => {
  const context = useContext(DataFetchingProgressContext);
  if (!context) {
    throw new Error("useDataFetchingProgressState must be used within DataFetchingProgressProvider");
  }
  return context.state;
};

// Hook for using data fetching progress actions
export const useDataFetchingProgressActions = () => {
  const context = useContext(DataFetchingProgressContext);
  if (!context) {
    throw new Error("useDataFetchingProgressActions must be used within DataFetchingProgressProvider");
  }

  return {
    addRequest: useCallback((nodeId: string, entityName?: string, entityType?: string) => {
      context.dispatch({
        type: "ADD_REQUEST",
        payload: { nodeId, entityName, entityType }
      });

      logger.debug(
        "cache",
        "Data fetching request added",
        {
          nodeId,
          entityName,
          entityType,
        },
        "DataFetchingProgressStore",
      );
    }, [context.dispatch]),

    updateProgress: useCallback((
      nodeId: string,
      progress: { completed: number; total: number; stage: string }
    ) => {
      context.dispatch({
        type: "UPDATE_PROGRESS",
        payload: { nodeId, progress }
      });

      logger.debug(
        "cache",
        "Data fetching progress updated",
        {
          nodeId,
          progress,
        },
        "DataFetchingProgressStore",
      );
    }, [context.dispatch]),

    completeRequest: useCallback((nodeId: string) => {
      context.dispatch({
        type: "COMPLETE_REQUEST",
        payload: nodeId
      });

      logger.debug(
        "cache",
        "Data fetching request completed",
        {
          nodeId,
        },
        "DataFetchingProgressStore",
      );

      // Auto-remove completed requests after 3 seconds
      setTimeout(() => {
        context.dispatch({
          type: "REMOVE_REQUEST",
          payload: nodeId
        });
      }, 3000);
    }, [context.dispatch]),

    failRequest: useCallback((nodeId: string, error: string) => {
      context.dispatch({
        type: "FAIL_REQUEST",
        payload: { nodeId, error }
      });

      logger.warn(
        "cache",
        "Data fetching request failed",
        {
          nodeId,
          error,
        },
        "DataFetchingProgressStore",
      );
    }, [context.dispatch]),

    removeRequest: useCallback((nodeId: string) => {
      context.dispatch({
        type: "REMOVE_REQUEST",
        payload: nodeId
      });
    }, [context.dispatch]),

    setWorkerReady: useCallback((ready: boolean) => {
      context.dispatch({
        type: "SET_WORKER_READY",
        payload: ready
      });

      logger.debug(
        "cache",
        "Worker ready status updated",
        {
          ready,
        },
        "DataFetchingProgressStore",
      );
    }, [context.dispatch]),

    clearCompleted: useCallback(() => {
      context.dispatch({ type: "CLEAR_COMPLETED" });

      logger.debug(
        "cache",
        "Cleared completed data fetching requests",
        {},
        "DataFetchingProgressStore",
      );
    }, [context.dispatch]),

    clearAll: useCallback(() => {
      context.dispatch({ type: "CLEAR_ALL" });

      logger.debug(
        "cache",
        "Cleared all data fetching requests",
        {},
        "DataFetchingProgressStore",
      );
    }, [context.dispatch]),
  };
};

// Combined hook for both state and actions
export const useDataFetchingProgressStore = () => {
  const state = useDataFetchingProgressState();
  const actions = useDataFetchingProgressActions();

  // Memoized computed values (selectors)
  const computedValues = useMemo(() => {
    const getActiveRequests = useCallback((): DataFetchingProgressItem[] => {
      return Object.values(state.requests).filter(
        (req): req is DataFetchingProgressItem => req?.status === "active",
      );
    }, [state.requests]);

    const getCompletedRequests = useCallback((): DataFetchingProgressItem[] => {
      return Object.values(state.requests).filter(
        (req): req is DataFetchingProgressItem => req?.status === "completed",
      );
    }, [state.requests]);

    const getFailedRequests = useCallback((): DataFetchingProgressItem[] => {
      return Object.values(state.requests).filter(
        (req): req is DataFetchingProgressItem => req?.status === "error",
      );
    }, [state.requests]);

    const getRequestByNodeId = useCallback((nodeId: string): DataFetchingProgressItem | undefined => {
      return state.requests[nodeId];
    }, [state.requests]);

    return {
      getActiveRequests,
      getCompletedRequests,
      getFailedRequests,
      getRequestByNodeId,
    };
  }, [state.requests]);

  return {
    ...state,
    ...actions,
    ...computedValues,
  };
};

// Selector hook for optimized re-renders
export const useDataFetchingProgressSelector = <T,>(
  selector: (state: DataFetchingProgressState) => T
): T => {
  const state = useDataFetchingProgressState();
  return selector(state);
};

// Legacy selectors for backward compatibility
export const selectActiveRequests = (state: DataFetchingProgressState) =>
  Object.values(state.requests).filter(
    (req): req is DataFetchingProgressItem => req?.status === "active",
  );

export const selectCompletedRequests = (state: DataFetchingProgressState) =>
  Object.values(state.requests).filter(
    (req): req is DataFetchingProgressItem => req?.status === "completed",
  );

export const selectFailedRequests = (state: DataFetchingProgressState) =>
  Object.values(state.requests).filter(
    (req): req is DataFetchingProgressItem => req?.status === "error",
  );

export const selectRequestByNodeId = (state: DataFetchingProgressState, nodeId: string) =>
  state.requests[nodeId];