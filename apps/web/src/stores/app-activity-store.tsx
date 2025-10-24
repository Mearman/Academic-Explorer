/**
 * Store for tracking general application activity and system events
 * Monitors user interactions, component lifecycle, performance metrics, and system state
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { logger } from "@academic-explorer/utils/logger";
import Dexie, { type Table } from "dexie";

// Dexie database for persistent app activity storage
interface StoredAppActivityEvent extends Omit<AppActivityEvent, "id"> {
  id?: number;
}

class AppActivityDB extends Dexie {
  appActivityEvents!: Table<StoredAppActivityEvent, number>;

  constructor() {
    super("app-activity");

    this.version(1).stores({
      appActivityEvents: "++id, type, category, event, timestamp, severity",
    });
  }
}

// Singleton database instance
let dbInstance: AppActivityDB | null = null;
const getDB = (): AppActivityDB => {
  if (!dbInstance) {
    dbInstance = new AppActivityDB();
  }
  return dbInstance;
};

export interface AppActivityEvent {
  id: string;
  type:
    | "user"
    | "system"
    | "navigation"
    | "component"
    | "performance"
    | "error"
    | "api";
  category: "interaction" | "lifecycle" | "data" | "ui" | "background";
  event: string;
  description: string;
  timestamp: number;
  duration?: number;
  severity: "info" | "warning" | "error" | "debug";
  metadata?: {
    component?: string;
    route?: string;
    previousRoute?: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    queryParams?: Record<string, unknown>;
    searchQuery?: string;
    filters?: string;
    search?: string;
    pageType?: string;
    searchParams?: Record<string, unknown>;
    performance?: {
      memory?: number;
      timing?: number;
      fps?: number;
    };
    data?: Record<string, unknown>;
  };
}

export interface AppActivityStats {
  totalEvents: number;
  eventsLast5Min: number;
  eventsPerMinute: number;
  errorCount: number;
  warningCount: number;
  userInteractions: number;
  componentLifecycleEvents: number;
  navigationEvents: number;
  apiCallEvents: number;
  averageEventFrequency: number;
  memoryUsage?: number;
  performanceScore?: number;
}

interface AppActivityState {
  // State - using plain objects for Immer compatibility
  events: Record<string, AppActivityEvent>;
  maxHistorySize: number;

  // Cached computed state for stable references
  recentEvents: AppActivityEvent[];
  activityStats: AppActivityStats;
  filteredEvents: AppActivityEvent[];

  // Filters
  filters: {
    type: string[];
    category: string[];
    severity: string[];
    searchTerm: string;
    timeRange: number; // minutes
  };
}

type AppActivityAction =
  | { type: "ADD_EVENT"; payload: Omit<AppActivityEvent, "id" | "timestamp"> }
  | { type: "UPDATE_EVENT"; payload: { id: string; updates: Partial<AppActivityEvent> } }
  | { type: "REMOVE_EVENT"; payload: string }
  | { type: "CLEAR_OLD_EVENTS" }
  | { type: "CLEAR_ALL_EVENTS" }
  | { type: "LOAD_EVENTS"; payload: Record<string, AppActivityEvent> }
  | { type: "SET_TYPE_FILTER"; payload: string[] }
  | { type: "SET_CATEGORY_FILTER"; payload: string[] }
  | { type: "SET_SEVERITY_FILTER"; payload: string[] }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_TIME_RANGE"; payload: number }
  | { type: "CLEAR_FILTERS" }
  | { type: "RECOMPUTE_STATE" };

const generateEventId = () =>
  `evt_${Date.now().toString()}_${Math.random().toString(36).substring(2, 11)}`;

const computeRecentEvents = (
  events: Record<string, AppActivityEvent>,
): AppActivityEvent[] => {
  return Object.values(events)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100); // Show last 100 events
};

const computeActivityStats = (
  events: Record<string, AppActivityEvent>,
): AppActivityStats => {
  const eventList = Object.values(events);
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const oneMinuteAgo = now - 60 * 1000;

  const recentEvents = eventList.filter(
    (event) => event.timestamp > fiveMinutesAgo,
  );
  const lastMinuteEvents = eventList.filter(
    (event) => event.timestamp > oneMinuteAgo,
  );

  // Calculate average event frequency (events per minute over last 5 minutes)
  const timespanMinutes = Math.max(
    1,
    (now - Math.min(...eventList.map((e) => e.timestamp))) / (60 * 1000),
  );
  const averageFrequency =
    eventList.length > 0 ? eventList.length / timespanMinutes : 0;

  const memoryUsage = getMemoryUsage();
  const performanceScore = calculatePerformanceScore(eventList);

  return {
    totalEvents: eventList.length,
    eventsLast5Min: recentEvents.length,
    eventsPerMinute: lastMinuteEvents.length,
    errorCount: eventList.filter((event) => event.severity === "error").length,
    warningCount: eventList.filter((event) => event.severity === "warning")
      .length,
    userInteractions: eventList.filter((event) => event.type === "user").length,
    componentLifecycleEvents: eventList.filter(
      (event) => event.type === "component",
    ).length,
    navigationEvents: eventList.filter((event) => event.type === "navigation")
      .length,
    apiCallEvents: eventList.filter((event) => event.type === "api").length,
    averageEventFrequency: averageFrequency,
    ...(memoryUsage !== undefined && { memoryUsage }),
    ...(performanceScore !== undefined && { performanceScore }),
  };
};

const getMemoryUsage = (): number | undefined => {
  // Memory usage monitoring disabled to avoid type assertions
  // Performance.memory is not standardized and requires unsafe type casting
  return undefined;
};

const calculatePerformanceScore = (
  events: AppActivityEvent[],
): number | undefined => {
  const performanceEvents = events.filter(
    (e) => e.type === "performance" && e.duration,
  );
  if (performanceEvents.length === 0) return undefined;

  const averageDuration =
    performanceEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0) /
    performanceEvents.length;
  // Score from 0-100 where lower duration = higher score
  return Math.max(0, Math.min(100, 100 - averageDuration / 10));
};

const computeFilteredEvents = (
  events: Record<string, AppActivityEvent>,
  filters: AppActivityState["filters"],
): AppActivityEvent[] => {
  const eventList = Object.values(events);
  const cutoffTime = Date.now() - filters.timeRange * 60 * 1000;

  return eventList
    .filter((event) => {
      // Time range filter
      if (event.timestamp < cutoffTime) return false;

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(event.type))
        return false;

      // Category filter
      if (
        filters.category.length > 0 &&
        !filters.category.includes(event.category)
      )
        return false;

      // Severity filter
      if (
        filters.severity.length > 0 &&
        !filters.severity.includes(event.severity)
      )
        return false;

      // Search term filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const searchableText = [
          event.event,
          event.description,
          event.metadata?.component,
          event.metadata?.route,
          event.metadata?.entityType,
          event.metadata?.entityId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(term)) return false;
      }

      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
};

const initialState: AppActivityState = {
  // State
  events: {},
  maxHistorySize: 1000,

  // Cached computed state (stable references)
  recentEvents: [],
  activityStats: {
    totalEvents: 0,
    eventsLast5Min: 0,
    eventsPerMinute: 0,
    errorCount: 0,
    warningCount: 0,
    userInteractions: 0,
    componentLifecycleEvents: 0,
    navigationEvents: 0,
    apiCallEvents: 0,
    averageEventFrequency: 0,
  },
  filteredEvents: [],

  // Filters
  filters: {
    type: [],
    category: [],
    severity: [],
    searchTerm: "",
    timeRange: 30, // 30 minutes default
  },
};

const appActivityReducer = (
  state: AppActivityState,
  action: AppActivityAction,
): AppActivityState => {
  switch (action.type) {
    case "ADD_EVENT": {
      const id = generateEventId();
      const fullEvent = {
        ...action.payload,
        id,
        timestamp: Date.now(),
      };

      // Save to Dexie asynchronously
      getDB()
        .appActivityEvents.add({
          ...fullEvent,
          id: undefined,
        })
        .catch((error) => {
          logger.error(
            "ui",
            "Failed to save event to Dexie",
            { error, eventId: id, component: "AppActivityStore" },
          );
        });

      const newEvents = {
        ...state.events,
        [id]: fullEvent,
      };

      logger.debug(
        "ui",
        "App activity event added",
        {
          id,
          type: action.payload.type,
          category: action.payload.category,
          event: action.payload.event,
          component: "AppActivityStore",
        },
      );

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "UPDATE_EVENT": {
      const { id, updates } = action.payload;
      const event = state.events[id];
      if (!event) return state;

      const newEvents = {
        ...state.events,
        [id]: { ...event, ...updates },
      };

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "REMOVE_EVENT": {
      const { [action.payload]: _removed, ...newEvents } = state.events;

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "CLEAR_OLD_EVENTS": {
      const events = Object.values(state.events);
      if (events.length <= state.maxHistorySize) return state;

      const sorted = events.sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, state.maxHistorySize);
      const toRemove = sorted.slice(state.maxHistorySize);
      const idsToRemove = toRemove
        .map((event) => parseInt(event.id.split("_")[2] || "0"))
        .filter((id) => !isNaN(id));

      if (idsToRemove.length > 0) {
        getDB()
          .appActivityEvents.bulkDelete(idsToRemove)
          .catch((error) => {
            logger.error(
              "ui",
              "Failed to delete old events from Dexie",
              { error, count: idsToRemove.length, component: "AppActivityStore" },
            );
          });
      }

      const newEvents: Record<string, AppActivityEvent> = {};
      toKeep.forEach((event) => {
        newEvents[event.id] = event;
      });

      logger.debug(
        "ui",
        "Cleared old app activity events",
        {
          removed: toRemove.length,
          kept: toKeep.length,
          component: "AppActivityStore",
        },
      );

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "CLEAR_ALL_EVENTS": {
      getDB()
        .appActivityEvents.clear()
        .catch((error) => {
          logger.error(
            "ui",
            "Failed to clear events from Dexie",
            { error, component: "AppActivityStore" },
          );
        });

      logger.debug(
        "ui",
        "Cleared all app activity events",
        { component: "AppActivityStore" },
      );

      return {
        ...state,
        events: {},
        recentEvents: [],
        activityStats: {
          totalEvents: 0,
          eventsLast5Min: 0,
          eventsPerMinute: 0,
          errorCount: 0,
          warningCount: 0,
          userInteractions: 0,
          componentLifecycleEvents: 0,
          navigationEvents: 0,
          apiCallEvents: 0,
          averageEventFrequency: 0,
        },
        filteredEvents: [],
      };
    }

    case "LOAD_EVENTS": {
      const newEvents = action.payload;

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "SET_TYPE_FILTER": {
      const newFilters = { ...state.filters, type: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_CATEGORY_FILTER": {
      const newFilters = { ...state.filters, category: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_SEVERITY_FILTER": {
      const newFilters = { ...state.filters, severity: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_SEARCH_TERM": {
      const newFilters = { ...state.filters, searchTerm: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_TIME_RANGE": {
      const newFilters = { ...state.filters, timeRange: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "CLEAR_FILTERS": {
      const newFilters = {
        type: [],
        category: [],
        severity: [],
        searchTerm: "",
        timeRange: 60,
      };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "RECOMPUTE_STATE": {
      return {
        ...state,
        recentEvents: computeRecentEvents(state.events),
        activityStats: computeActivityStats(state.events),
        filteredEvents: computeFilteredEvents(state.events, state.filters),
      };
    }

    default:
      return state;
  }
};

// Context type
interface AppActivityContextType {
  state: AppActivityState;
  // Actions
  addEvent: (event: Omit<AppActivityEvent, "id" | "timestamp">) => string;
  updateEvent: (id: string, updates: Partial<AppActivityEvent>) => void;
  removeEvent: (id: string) => void;
  clearOldEvents: () => void;
  clearAllEvents: () => void;
  loadEvents: () => Promise<void>;

  // Convenience methods for common event types
  logUserInteraction: (
    action: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logNavigation: (
    from: string,
    to: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logComponentMount: (
    component: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logComponentUnmount: (
    component: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logPerformanceMetric: (
    metric: string,
    value: number,
    metadata?: Record<string, unknown>,
  ) => void;
  logError: (
    error: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logWarning: (
    warning: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logApiCall: (
    entityType: string,
    entityId?: string,
    queryParams?: Record<string, unknown>,
  ) => void;

  // Filter actions
  setTypeFilter: (types: string[]) => void;
  setCategoryFilter: (categories: string[]) => void;
  setSeverityFilter: (severities: string[]) => void;
  setSearchTerm: (term: string) => void;
  setTimeRange: (minutes: number) => void;
  clearFilters: () => void;
}

// Create context
const AppActivityContext = createContext<AppActivityContextType | null>(null);

// Provider component
interface AppActivityProviderProps {
  children: ReactNode;
}

export const AppActivityProvider: React.FC<AppActivityProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appActivityReducer, initialState);

  // Load persisted events on mount
  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        const dbEvents = await getDB()
          .appActivityEvents.orderBy("timestamp")
          .reverse()
          .limit(1000)
          .toArray();

        const events: Record<string, AppActivityEvent> = {};
        dbEvents.forEach((event) => {
          if (event.id !== undefined) {
            const id = event.id.toString();
            events[id] = {
              ...event,
              id,
            };
          }
        });

        dispatch({ type: "LOAD_EVENTS", payload: events });

        // Check if we need to clear old events after loading
        if (Object.keys(events).length > initialState.maxHistorySize) {
          dispatch({ type: "CLEAR_OLD_EVENTS" });
        }
      } catch (error) {
        logger.error(
          "ui",
          "Failed to load events from Dexie",
          { error, component: "AppActivityStore" },
        );
      }
    };

    void loadEvents();
  }, []);

  // Action creators
  const addEvent = useCallback(
    (event: Omit<AppActivityEvent, "id" | "timestamp">): string => {
      const id = generateEventId();
      dispatch({ type: "ADD_EVENT", payload: event });

      // Check if we need to clear old events
      const currentEventCount = Object.keys(state.events).length + 1;
      if (currentEventCount > state.maxHistorySize) {
        dispatch({ type: "CLEAR_OLD_EVENTS" });
      }

      return id;
    },
    [state.events.length, state.maxHistorySize],
  );

  const updateEvent = useCallback((id: string, updates: Partial<AppActivityEvent>) => {
    dispatch({ type: "UPDATE_EVENT", payload: { id, updates } });
  }, []);

  const removeEvent = useCallback((id: string) => {
    dispatch({ type: "REMOVE_EVENT", payload: id });
  }, []);

  const clearOldEvents = useCallback(() => {
    dispatch({ type: "CLEAR_OLD_EVENTS" });
  }, []);

  const clearAllEvents = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_EVENTS" });
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const dbEvents = await getDB()
        .appActivityEvents.orderBy("timestamp")
        .reverse()
        .limit(1000)
        .toArray();

      const events: Record<string, AppActivityEvent> = {};
      dbEvents.forEach((event) => {
        if (event.id !== undefined) {
          const id = event.id.toString();
          events[id] = {
            ...event,
            id,
          };
        }
      });

      dispatch({ type: "LOAD_EVENTS", payload: events });

      // Check if we need to clear old events after loading
      if (Object.keys(events).length > state.maxHistorySize) {
        dispatch({ type: "CLEAR_OLD_EVENTS" });
      }
    } catch (error) {
      logger.error(
        "ui",
        "Failed to load events from Dexie",
        { error, component: "AppActivityStore" },
      );
    }
  }, [state.maxHistorySize]);

  // Convenience methods
  const logUserInteraction = useCallback((
    action: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "user",
      category: "interaction",
      event: action,
      description: `User ${action}${component ? ` in ${component}` : ""}`,
      severity: "info",
      metadata: {
        component,
        ...metadata,
      },
    });
  }, [addEvent]);

  const logNavigation = useCallback((
    from: string,
    to: string,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "navigation",
      category: "interaction",
      event: "navigate",
      description: `Navigation from ${from} to ${to}`,
      severity: "info",
      metadata: {
        route: to,
        previousRoute: from,
        ...metadata,
      },
    });
  }, [addEvent]);

  const logComponentMount = useCallback((
    component: string,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "component",
      category: "lifecycle",
      event: "mount",
      description: `Component ${component} mounted`,
      severity: "debug",
      metadata: {
        component,
        ...metadata,
      },
    });
  }, [addEvent]);

  const logComponentUnmount = useCallback((
    component: string,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "component",
      category: "lifecycle",
      event: "unmount",
      description: `Component ${component} unmounted`,
      severity: "debug",
      metadata: {
        component,
        ...metadata,
      },
    });
  }, [addEvent]);

  const logPerformanceMetric = useCallback((
    metric: string,
    value: number,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "performance",
      category: "data",
      event: metric,
      description: `Performance metric: ${metric} = ${value}`,
      severity: "info",
      metadata: {
        performance: {
          [metric]: value,
        },
        ...metadata,
      },
    });
  }, [addEvent]);

  const logError = useCallback((
    error: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "error",
      category: "data",
      event: "error",
      description: error,
      severity: "error",
      metadata: {
        component,
        ...metadata,
      },
    });
  }, [addEvent]);

  const logWarning = useCallback((
    warning: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "system",
      category: "data",
      event: "warning",
      description: warning,
      severity: "warning",
      metadata: {
        component,
        ...metadata,
      },
    });
  }, [addEvent]);

  const logApiCall = useCallback((
    entityType: string,
    entityId?: string,
    queryParams?: Record<string, unknown>,
  ) => {
    addEvent({
      type: "api",
      category: "data",
      event: "call",
      description: `API call for ${entityType}${entityId ? ` (${entityId})` : ""}`,
      severity: "info",
      metadata: {
        entityType,
        entityId,
        queryParams,
      },
    });
  }, [addEvent]);

  // Filter actions
  const setTypeFilter = useCallback((types: string[]) => {
    dispatch({ type: "SET_TYPE_FILTER", payload: types });
  }, []);

  const setCategoryFilter = useCallback((categories: string[]) => {
    dispatch({ type: "SET_CATEGORY_FILTER", payload: categories });
  }, []);

  const setSeverityFilter = useCallback((severities: string[]) => {
    dispatch({ type: "SET_SEVERITY_FILTER", payload: severities });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: "SET_SEARCH_TERM", payload: term });
  }, []);

  const setTimeRange = useCallback((minutes: number) => {
    dispatch({ type: "SET_TIME_RANGE", payload: minutes });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
  }, []);

  const contextValue: AppActivityContextType = {
    state,
    addEvent,
    updateEvent,
    removeEvent,
    clearOldEvents,
    clearAllEvents,
    loadEvents,
    logUserInteraction,
    logNavigation,
    logComponentMount,
    logComponentUnmount,
    logPerformanceMetric,
    logError,
    logWarning,
    logApiCall,
    setTypeFilter,
    setCategoryFilter,
    setSeverityFilter,
    setSearchTerm,
    setTimeRange,
    clearFilters,
  };

  return (
    <AppActivityContext.Provider value={contextValue}>
      {children}
    </AppActivityContext.Provider>
  );
};

// Hooks for consuming the context
export const useAppActivityState = (): AppActivityState => {
  const context = useContext(AppActivityContext);
  if (!context) {
    throw new Error("useAppActivityState must be used within an AppActivityProvider");
  }
  return context.state;
};

export const useAppActivityActions = () => {
  const context = useContext(AppActivityContext);
  if (!context) {
    throw new Error("useAppActivityActions must be used within an AppActivityProvider");
  }

  return {
    addEvent: context.addEvent,
    updateEvent: context.updateEvent,
    removeEvent: context.removeEvent,
    clearOldEvents: context.clearOldEvents,
    clearAllEvents: context.clearAllEvents,
    loadEvents: context.loadEvents,
    logUserInteraction: context.logUserInteraction,
    logNavigation: context.logNavigation,
    logComponentMount: context.logComponentMount,
    logComponentUnmount: context.logComponentUnmount,
    logPerformanceMetric: context.logPerformanceMetric,
    logError: context.logError,
    logWarning: context.logWarning,
    logApiCall: context.logApiCall,
    setTypeFilter: context.setTypeFilter,
    setCategoryFilter: context.setCategoryFilter,
    setSeverityFilter: context.setSeverityFilter,
    setSearchTerm: context.setSearchTerm,
    setTimeRange: context.setTimeRange,
    clearFilters: context.clearFilters,
  };
};

export const useAppActivityStore = (): AppActivityContextType => {
  const context = useContext(AppActivityContext);
  if (!context) {
    throw new Error("useAppActivityStore must be used within an AppActivityProvider");
  }
  return context;
};

