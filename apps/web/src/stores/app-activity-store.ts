/**
 * Store for tracking general application activity and system events
 * Monitors user interactions, component lifecycle, performance metrics, and system state
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { logger } from "@academic-explorer/utils/logger";

export interface AppActivityEvent {
  id: string;
  type: "user" | "system" | "navigation" | "component" | "performance" | "error";
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

  // Actions
  addEvent: (event: Omit<AppActivityEvent, "id" | "timestamp">) => string;
  updateEvent: (id: string, updates: Partial<AppActivityEvent>) => void;
  removeEvent: (id: string) => void;
  clearOldEvents: () => void;
  clearAllEvents: () => void;

  // Convenience methods for common event types
  logUserInteraction: (action: string, component?: string, metadata?: Record<string, unknown>) => void;
  logNavigation: (from: string, to: string, metadata?: Record<string, unknown>) => void;
  logComponentMount: (component: string, metadata?: Record<string, unknown>) => void;
  logComponentUnmount: (component: string, metadata?: Record<string, unknown>) => void;
  logPerformanceMetric: (metric: string, value: number, metadata?: Record<string, unknown>) => void;
  logError: (error: string, component?: string, metadata?: Record<string, unknown>) => void;
  logWarning: (warning: string, component?: string, metadata?: Record<string, unknown>) => void;

  // Filter actions
  setTypeFilter: (types: string[]) => void;
  setCategoryFilter: (categories: string[]) => void;
  setSeverityFilter: (severities: string[]) => void;
  setSearchTerm: (term: string) => void;
  setTimeRange: (minutes: number) => void;
  clearFilters: () => void;

  // Recomputation functions (called after mutations)
  recomputeRecentEvents: () => void;
  recomputeActivityStats: () => void;
  recomputeFilteredEvents: () => void;
  recomputeAll: () => void;
}

const generateEventId = () => `evt_${Date.now().toString()}_${Math.random().toString(36).substring(2, 11)}`;

const computeRecentEvents = (events: Record<string, AppActivityEvent>): AppActivityEvent[] => {
  return Object.values(events)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100); // Show last 100 events
};

const computeActivityStats = (events: Record<string, AppActivityEvent>): AppActivityStats => {
  const eventList = Object.values(events);
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  const oneMinuteAgo = now - (60 * 1000);

  const recentEvents = eventList.filter(event => event.timestamp > fiveMinutesAgo);
  const lastMinuteEvents = eventList.filter(event => event.timestamp > oneMinuteAgo);

  // Calculate average event frequency (events per minute over last 5 minutes)
  const timespanMinutes = Math.max(1, (now - Math.min(...eventList.map(e => e.timestamp))) / (60 * 1000));
  const averageFrequency = eventList.length > 0 ? eventList.length / timespanMinutes : 0;

  const memoryUsage = getMemoryUsage();
  const performanceScore = calculatePerformanceScore(eventList);

  return {
    totalEvents: eventList.length,
    eventsLast5Min: recentEvents.length,
    eventsPerMinute: lastMinuteEvents.length,
    errorCount: eventList.filter(event => event.severity === "error").length,
    warningCount: eventList.filter(event => event.severity === "warning").length,
    userInteractions: eventList.filter(event => event.type === "user").length,
    componentLifecycleEvents: eventList.filter(event => event.type === "component").length,
    navigationEvents: eventList.filter(event => event.type === "navigation").length,
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

const calculatePerformanceScore = (events: AppActivityEvent[]): number | undefined => {
  const performanceEvents = events.filter(e => e.type === "performance" && e.duration);
  if (performanceEvents.length === 0) return undefined;

  const averageDuration = performanceEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / performanceEvents.length;
  // Score from 0-100 where lower duration = higher score
  return Math.max(0, Math.min(100, 100 - (averageDuration / 10)));
};

const computeFilteredEvents = (
  events: Record<string, AppActivityEvent>,
  filters: AppActivityState["filters"]
): AppActivityEvent[] => {
  const eventList = Object.values(events);
  const cutoffTime = Date.now() - (filters.timeRange * 60 * 1000);

  return eventList.filter(event => {
    // Time range filter
    if (event.timestamp < cutoffTime) return false;

    // Type filter
    if (filters.type.length > 0 && !filters.type.includes(event.type)) return false;

    // Category filter
    if (filters.category.length > 0 && !filters.category.includes(event.category)) return false;

    // Severity filter
    if (filters.severity.length > 0 && !filters.severity.includes(event.severity)) return false;

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const searchableText = [
        event.event,
        event.description,
        event.metadata?.component,
        event.metadata?.route,
        event.metadata?.entityType,
        event.metadata?.entityId
      ].filter(Boolean).join(" ").toLowerCase();

      if (!searchableText.includes(term)) return false;
    }

    return true;
  }).sort((a, b) => b.timestamp - a.timestamp);
};

export const useAppActivityStore = create<AppActivityState>()(
  immer((set, get) => ({
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

    // Actions
    addEvent: (event) => {
      const id = generateEventId();

      set(state => {
        state.events[id] = {
          ...event,
          id,
          timestamp: Date.now(),
        };
      });

      get().recomputeAll();

      logger.debug("ui", "App activity event added", {
        id,
        type: event.type,
        event: event.event,
        severity: event.severity,
      }, "AppActivityStore");

      return id;
    },

    updateEvent: (id, updates) => {
      set(state => {
        const existingEvent = state.events[id];
        if (existingEvent) {
          Object.assign(existingEvent, updates);
        }
      });

      get().recomputeAll();
    },

    removeEvent: (id) => {
      set(state => {
        const { [id]: removed, ...rest } = state.events;
        state.events = rest;
      });

      get().recomputeAll();
    },

    clearOldEvents: () => {
      const { maxHistorySize } = get();
      const events = Object.values(get().events);

      if (events.length <= maxHistorySize) return;

      // Keep most recent events
      const sorted = events.sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, maxHistorySize);

      set(state => {
        state.events = {};
        toKeep.forEach(event => {
          state.events[event.id] = event;
        });
      });

      get().recomputeAll();

      logger.debug("ui", "Cleared old app activity events", {
        removed: events.length - toKeep.length,
        kept: toKeep.length
      }, "AppActivityStore");
    },

    clearAllEvents: () => {
      set(state => {
        state.events = {};
      });

      get().recomputeAll();

      logger.debug("ui", "Cleared all app activity events", {}, "AppActivityStore");
    },

    // Convenience methods for common event types
    logUserInteraction: (action, component, metadata) => {
      get().addEvent({
        type: "user",
        category: "interaction",
        event: action,
        description: `User ${action}${component ? ` in ${component}` : ""}`,
        severity: "debug",
        metadata: {
          ...(component && { component }),
          ...metadata,
        },
      });
    },

    logNavigation: (from, to, metadata) => {
      get().addEvent({
        type: "navigation",
        category: "ui",
        event: "route_change",
        description: `Navigated from ${from} to ${to}`,
        severity: "info",
        metadata: {
          route: to,
          previousRoute: from,
          ...metadata,
        },
      });
    },

    logComponentMount: (component, metadata) => {
      get().addEvent({
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
    },

    logComponentUnmount: (component, metadata) => {
      get().addEvent({
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
    },

    logPerformanceMetric: (metric, value, metadata) => {
      get().addEvent({
        type: "performance",
        category: "background",
        event: metric,
        description: `Performance metric: ${metric} = ${value.toString()}`,
        severity: value > 1000 ? "warning" : "info", // Warn if metric is high
        duration: value,
        metadata: {
          performance: {
            timing: value,
          },
          ...metadata,
        },
      });
    },

    logError: (error, component, metadata) => {
      get().addEvent({
        type: "error",
        category: "ui",
        event: "error",
        description: error,
        severity: "error",
        metadata: {
          ...(component && { component }),
          ...metadata,
        },
      });
    },

    logWarning: (warning, component, metadata) => {
      get().addEvent({
        type: "system",
        category: "ui",
        event: "warning",
        description: warning,
        severity: "warning",
        metadata: {
          ...(component && { component }),
          ...metadata,
        },
      });
    },

    // Filter actions
    setTypeFilter: (types) => {
      set(state => {
        state.filters.type = types;
      });
      get().recomputeFilteredEvents();
    },

    setCategoryFilter: (categories) => {
      set(state => {
        state.filters.category = categories;
      });
      get().recomputeFilteredEvents();
    },

    setSeverityFilter: (severities) => {
      set(state => {
        state.filters.severity = severities;
      });
      get().recomputeFilteredEvents();
    },

    setSearchTerm: (term) => {
      set(state => {
        state.filters.searchTerm = term;
      });
      get().recomputeFilteredEvents();
    },

    setTimeRange: (minutes) => {
      set(state => {
        state.filters.timeRange = minutes;
      });
      get().recomputeFilteredEvents();
    },

    clearFilters: () => {
      set(state => {
        state.filters = {
          type: [],
          category: [],
          severity: [],
          searchTerm: "",
          timeRange: 30,
        };
      });
      get().recomputeFilteredEvents();
    },

    // Recomputation functions (called after mutations)
    recomputeRecentEvents: () => {
      set(state => {
        state.recentEvents = computeRecentEvents(state.events);
      });
    },

    recomputeActivityStats: () => {
      set(state => {
        state.activityStats = computeActivityStats(state.events);
      });
    },

    recomputeFilteredEvents: () => {
      set(state => {
        state.filteredEvents = computeFilteredEvents(state.events, state.filters);
      });
    },

    recomputeAll: () => {
      const state = get();
      state.recomputeRecentEvents();
      state.recomputeActivityStats();
      state.recomputeFilteredEvents();

      // Auto-cleanup old events
      if (Object.keys(state.events).length > state.maxHistorySize) {
        state.clearOldEvents();
      }
    },
  }))
);