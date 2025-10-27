/**
 * Expansion settings store
 * Manages expansion configurations for each entity and edge type
 * React Context-based implementation replacing Zustand
 */

import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import { logger } from "@academic-explorer/utils/logger";
import type {
  ExpansionSettings,
  ExpansionTarget,
  SortCriteria,
  FilterCriteria,
} from "@academic-explorer/graph";
import { getDefaultSettingsForTarget } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";

interface ExpansionSettingsState {
  /** Settings per target type */
  settings: Record<ExpansionTarget, ExpansionSettings>;
}

// Action types
type ExpansionSettingsAction =
  | { type: "UPDATE_SETTINGS"; payload: { target: ExpansionTarget; settingsUpdate: Partial<ExpansionSettings> } }
  | { type: "RESET_SETTINGS"; payload: ExpansionTarget }
  | { type: "RESET_ALL_SETTINGS" }
  | { type: "ADD_SORT_CRITERIA"; payload: { target: ExpansionTarget; criteria: Omit<SortCriteria, "priority"> } }
  | { type: "UPDATE_SORT_CRITERIA"; payload: { target: ExpansionTarget; index: number; criteriaUpdate: Partial<SortCriteria> } }
  | { type: "REMOVE_SORT_CRITERIA"; payload: { target: ExpansionTarget; index: number } }
  | { type: "REORDER_SORT_CRITERIA"; payload: { target: ExpansionTarget; fromIndex: number; toIndex: number } }
  | { type: "ADD_FILTER_CRITERIA"; payload: { target: ExpansionTarget; criteria: FilterCriteria } }
  | { type: "UPDATE_FILTER_CRITERIA"; payload: { target: ExpansionTarget; index: number; criteriaUpdate: Partial<FilterCriteria> } }
  | { type: "REMOVE_FILTER_CRITERIA"; payload: { target: ExpansionTarget; index: number } }
  | { type: "TOGGLE_FILTER_ENABLED"; payload: { target: ExpansionTarget; index: number } }
  | { type: "IMPORT_SETTINGS"; payload: Record<string, ExpansionSettings> };

// Initialize with default settings
const initializeDefaultSettings = (): Record<
  ExpansionTarget,
  ExpansionSettings
> => {
  // Explicitly create the complete settings object with all required keys
  return {
    // Entity types
    works: getDefaultSettingsForTarget("works"),
    authors: getDefaultSettingsForTarget("authors"),
    sources: getDefaultSettingsForTarget("sources"),
    institutions: getDefaultSettingsForTarget("institutions"),
    topics: getDefaultSettingsForTarget("topics"),
    concepts: getDefaultSettingsForTarget("concepts"),
    publishers: getDefaultSettingsForTarget("publishers"),
    funders: getDefaultSettingsForTarget("funders"),
    keywords: getDefaultSettingsForTarget("keywords"),

    // Relation types - each unique and specific
    [RelationType.AUTHORED]: getDefaultSettingsForTarget(RelationType.AUTHORED),
    [RelationType.AFFILIATED]: getDefaultSettingsForTarget(
      RelationType.AFFILIATED,
    ),
    [RelationType.PUBLISHED_IN]: getDefaultSettingsForTarget(
      RelationType.PUBLISHED_IN,
    ),
    [RelationType.FUNDED_BY]: getDefaultSettingsForTarget(
      RelationType.FUNDED_BY,
    ),
    [RelationType.REFERENCES]: getDefaultSettingsForTarget(
      RelationType.REFERENCES,
    ),
    [RelationType.RELATED_TO]: getDefaultSettingsForTarget(
      RelationType.RELATED_TO,
    ),
    [RelationType.SOURCE_PUBLISHED_BY]: getDefaultSettingsForTarget(
      RelationType.SOURCE_PUBLISHED_BY,
    ),
    [RelationType.INSTITUTION_CHILD_OF]: getDefaultSettingsForTarget(
      RelationType.INSTITUTION_CHILD_OF,
    ),
    [RelationType.PUBLISHER_CHILD_OF]: getDefaultSettingsForTarget(
      RelationType.PUBLISHER_CHILD_OF,
    ),
    [RelationType.WORK_HAS_TOPIC]: getDefaultSettingsForTarget(
      RelationType.WORK_HAS_TOPIC,
    ),
    [RelationType.WORK_HAS_KEYWORD]: getDefaultSettingsForTarget(
      RelationType.WORK_HAS_KEYWORD,
    ),
    [RelationType.AUTHOR_RESEARCHES]: getDefaultSettingsForTarget(
      RelationType.AUTHOR_RESEARCHES,
    ),
    [RelationType.INSTITUTION_LOCATED_IN]: getDefaultSettingsForTarget(
      RelationType.INSTITUTION_LOCATED_IN,
    ),
    [RelationType.FUNDER_LOCATED_IN]: getDefaultSettingsForTarget(
      RelationType.FUNDER_LOCATED_IN,
    ),
    [RelationType.TOPIC_PART_OF_FIELD]: getDefaultSettingsForTarget(
      RelationType.TOPIC_PART_OF_FIELD,
    ),
  };
};

// Initial state
const getInitialState = (): ExpansionSettingsState => ({
  settings: initializeDefaultSettings(),
});

// Reducer
const expansionSettingsReducer = (
  state: ExpansionSettingsState,
  action: ExpansionSettingsAction
): ExpansionSettingsState => {
  switch (action.type) {
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...state.settings[action.payload.target],
            ...action.payload.settingsUpdate,
          },
        },
      };

    case "RESET_SETTINGS":
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload]: getDefaultSettingsForTarget(action.payload),
        },
      };

    case "RESET_ALL_SETTINGS":
      return {
        ...state,
        settings: initializeDefaultSettings(),
      };

    case "ADD_SORT_CRITERIA": {
      const settings = state.settings[action.payload.target];
      const sorts = settings.sorts ?? [];
      const newPriority = Math.max(0, ...sorts.map((s) => s.priority)) + 1;
      const newCriteria: SortCriteria = {
        ...action.payload.criteria,
        priority: newPriority,
      };

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...settings,
            sorts: [...sorts, newCriteria],
          },
        },
      };
    }

    case "UPDATE_SORT_CRITERIA": {
      const targetSettings = state.settings[action.payload.target];
      targetSettings.sorts ??= [];
      const existingCriteria = targetSettings.sorts[action.payload.index];

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...targetSettings,
            sorts: [
              ...targetSettings.sorts.slice(0, action.payload.index),
              { ...existingCriteria, ...action.payload.criteriaUpdate },
              ...targetSettings.sorts.slice(action.payload.index + 1),
            ],
          },
        },
      };
    }

    case "REMOVE_SORT_CRITERIA": {
      const removeSettings = state.settings[action.payload.target];
      removeSettings.sorts ??= [];
      const newSorts = [...removeSettings.sorts];
      newSorts.splice(action.payload.index, 1);

      // Renumber priorities to maintain sequence
      newSorts.forEach((sort, i) => {
        sort.priority = i + 1;
      });

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...removeSettings,
            sorts: newSorts,
          },
        },
      };
    }

    case "REORDER_SORT_CRITERIA": {
      const reorderSettings = state.settings[action.payload.target];
      reorderSettings.sorts ??= [];
      const reorderSorts = [...reorderSettings.sorts];

      // Move the item
      const [movedItem] = reorderSorts.splice(action.payload.fromIndex, 1);
      reorderSorts.splice(action.payload.toIndex, 0, movedItem);

      // Renumber priorities to maintain sequence
      reorderSorts.forEach((sort, i) => {
        sort.priority = i + 1;
      });

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...reorderSettings,
            sorts: reorderSorts,
          },
        },
      };
    }

    case "ADD_FILTER_CRITERIA": {
      const filterSettings = state.settings[action.payload.target];
      filterSettings.filters ??= [];

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...filterSettings,
            filters: [...filterSettings.filters, action.payload.criteria],
          },
        },
      };
    }

    case "UPDATE_FILTER_CRITERIA": {
      const updateFilterSettings = state.settings[action.payload.target];
      updateFilterSettings.filters ??= [];
      const existingFilter = updateFilterSettings.filters[action.payload.index];

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...updateFilterSettings,
            filters: [
              ...updateFilterSettings.filters.slice(0, action.payload.index),
              { ...existingFilter, ...action.payload.criteriaUpdate },
              ...updateFilterSettings.filters.slice(action.payload.index + 1),
            ],
          },
        },
      };
    }

    case "REMOVE_FILTER_CRITERIA": {
      const removeFilterSettings = state.settings[action.payload.target];
      removeFilterSettings.filters ??= [];
      const newFilters = [...removeFilterSettings.filters];
      newFilters.splice(action.payload.index, 1);

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...removeFilterSettings,
            filters: newFilters,
          },
        },
      };
    }

    case "TOGGLE_FILTER_ENABLED": {
      const toggleSettings = state.settings[action.payload.target];
      toggleSettings.filters ??= [];
      const filter = toggleSettings.filters[action.payload.index];

      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.target]: {
            ...toggleSettings,
            filters: [
              ...toggleSettings.filters.slice(0, action.payload.index),
              { ...filter, enabled: !filter.enabled },
              ...toggleSettings.filters.slice(action.payload.index + 1),
            ],
          },
        },
      };
    }

    case "IMPORT_SETTINGS": {
      // Start with current settings and update only valid targets
      const newSettings = { ...state.settings };

      // Copy only valid expansion targets (entity types or relation types)
      Object.entries(action.payload).forEach(([key, value]) => {
        // Type guard for entity types
        function isEntityType(
          k: string,
        ): k is
          | "works"
          | "authors"
          | "sources"
          | "institutions"
          | "topics"
          | "concepts"
          | "publishers"
          | "funders"
          | "keywords" {
          return [
            "works",
            "authors",
            "sources",
            "institutions",
            "topics",
            "concepts",
            "publishers",
            "funders",
            "keywords",
          ].includes(k);
        }

        // Type guard for relation types
        function isRelationType(k: string): k is RelationType {
          const relationTypes: string[] = Object.values(RelationType);
          return relationTypes.includes(k);
        }

        if (isEntityType(key) || isRelationType(key)) {
          newSettings[key] = value;
        }
      });

      return {
        ...state,
        settings: newSettings,
      };
    }

    default:
      return state;
  }
};

// Context
const ExpansionSettingsContext = createContext<{
  state: ExpansionSettingsState;
  dispatch: React.Dispatch<ExpansionSettingsAction>;
} | null>(null);

// Provider component
export const ExpansionSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(expansionSettingsReducer, getInitialState());

  const value = { state, dispatch };
  return (
    <ExpansionSettingsContext.Provider value={value}>
      {children}
    </ExpansionSettingsContext.Provider>
  );
};

// Hook for using expansion settings state
export const useExpansionSettingsState = () => {
  const context = useContext(ExpansionSettingsContext);
  if (!context) {
    throw new Error("useExpansionSettingsState must be used within ExpansionSettingsProvider");
  }
  return context.state;
};

// Hook for using expansion settings actions
export const useExpansionSettingsActions = () => {
  const context = useContext(ExpansionSettingsContext);
  if (!context) {
    throw new Error("useExpansionSettingsActions must be used within ExpansionSettingsProvider");
  }

  return {
    getSettings: useCallback((target: ExpansionTarget) => {
      return context.state.settings[target];
    }, [context.state.settings]),

    updateSettings: useCallback((target: ExpansionTarget, settingsUpdate: Partial<ExpansionSettings>) => {
      context.dispatch({ type: "UPDATE_SETTINGS", payload: { target, settingsUpdate } });
      logger.debug(
        "expansion",
        "Updated settings for target",
        { target, settingsUpdate },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    resetSettings: useCallback((target: ExpansionTarget) => {
      context.dispatch({ type: "RESET_SETTINGS", payload: target });
      logger.debug(
        "expansion",
        "Reset settings for target",
        { target },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    resetAllSettings: useCallback(() => {
      context.dispatch({ type: "RESET_ALL_SETTINGS" });
      logger.debug(
        "expansion",
        "Reset all expansion settings",
        {},
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    // Sort criteria management
    addSortCriteria: useCallback((
      target: ExpansionTarget,
      criteria: Omit<SortCriteria, "priority">,
    ) => {
      context.dispatch({ type: "ADD_SORT_CRITERIA", payload: { target, criteria } });
      logger.debug(
        "expansion",
        "Added sort criteria",
        { target, criteria },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    updateSortCriteria: useCallback((
      target: ExpansionTarget,
      index: number,
      criteriaUpdate: Partial<SortCriteria>,
    ) => {
      context.dispatch({ type: "UPDATE_SORT_CRITERIA", payload: { target, index, criteriaUpdate } });
      logger.debug(
        "expansion",
        "Updated sort criteria",
        { target, index, criteriaUpdate },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    removeSortCriteria: useCallback((target: ExpansionTarget, index: number) => {
      context.dispatch({ type: "REMOVE_SORT_CRITERIA", payload: { target, index } });
      logger.debug(
        "expansion",
        "Removed sort criteria",
        { target, index },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    reorderSortCriteria: useCallback((
      target: ExpansionTarget,
      fromIndex: number,
      toIndex: number,
    ) => {
      context.dispatch({ type: "REORDER_SORT_CRITERIA", payload: { target, fromIndex, toIndex } });
      logger.debug(
        "expansion",
        "Reordered sort criteria",
        { target, fromIndex, toIndex },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    // Filter criteria management
    addFilterCriteria: useCallback((target: ExpansionTarget, criteria: FilterCriteria) => {
      context.dispatch({ type: "ADD_FILTER_CRITERIA", payload: { target, criteria } });
      logger.debug(
        "expansion",
        "Added filter criteria",
        { target, criteria },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    updateFilterCriteria: useCallback((
      target: ExpansionTarget,
      index: number,
      criteriaUpdate: Partial<FilterCriteria>,
    ) => {
      context.dispatch({ type: "UPDATE_FILTER_CRITERIA", payload: { target, index, criteriaUpdate } });
      logger.debug(
        "expansion",
        "Updated filter criteria",
        { target, index, criteriaUpdate },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    removeFilterCriteria: useCallback((target: ExpansionTarget, index: number) => {
      context.dispatch({ type: "REMOVE_FILTER_CRITERIA", payload: { target, index } });
      logger.debug(
        "expansion",
        "Removed filter criteria",
        { target, index },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    toggleFilterEnabled: useCallback((target: ExpansionTarget, index: number) => {
      context.dispatch({ type: "TOGGLE_FILTER_ENABLED", payload: { target, index } });
      logger.debug(
        "expansion",
        "Toggled filter enabled",
        { target, index },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),

    // Utility functions
    getSettingsSummary: useCallback((target: ExpansionTarget): string => {
      const settings = context.state.settings[target];

      const parts: string[] = [];

      // Add sort summary
      const sorts = settings.sorts ?? [];
      if (sorts.length > 0) {
        const sortSummary = sorts
          .sort((a, b) => a.priority - b.priority)
          .map(
            (s) =>
              `${s.direction === "desc" ? "↓" : "↑"}${s.label ?? s.property}`,
          )
          .join(", ");
        parts.push(sortSummary);
      }

      // Add filter summary
      const filters = settings.filters ?? [];
      const enabledFilters = filters.filter((f) => f.enabled);
      if (enabledFilters.length > 0) {
        parts.push(`${enabledFilters.length.toString()} filters`);
      }

      // Add limit
      const limitValue = settings.limit ?? 0;
      parts.push(limitValue > 0 ? `${limitValue.toString()} max` : "unlimited");

      return parts.join(" | ");
    }, [context.state.settings]),

    exportSettings: useCallback(() => {
      return context.state.settings;
    }, [context.state.settings]),

    importSettings: useCallback((settingsObject: Record<string, ExpansionSettings>) => {
      context.dispatch({ type: "IMPORT_SETTINGS", payload: settingsObject });
      logger.debug(
        "expansion",
        "Imported settings",
        { count: Object.keys(settingsObject).length },
        "ExpansionSettingsStore",
      );
    }, [context.dispatch]),
  };
};

// Combined hook for both state and actions
export const useExpansionSettingsStore = () => {
  const state = useExpansionSettingsState();
  const actions = useExpansionSettingsActions();

  return {
    ...state,
    ...actions,
  };
};

// Export a hook for getting settings for a specific target
export const useExpansionSettings = (target: ExpansionTarget) => {
  const state = useExpansionSettingsState();
  return state.settings[target];
};

// Export a hook for getting the settings summary
export const useExpansionSettingsSummary = (target: ExpansionTarget) => {
  const actions = useExpansionSettingsActions();
  return actions.getSettingsSummary(target);
};

// Standalone store object for non-React usage
export const expansionSettingsActions = (() => {
  let currentState: ExpansionSettingsState = getInitialState();

  const getState = (): ExpansionSettingsState => ({ ...currentState });

  const setState = (updater: ExpansionSettingsState | ((state: ExpansionSettingsState) => ExpansionSettingsState)) => {
    currentState = typeof updater === 'function' ? updater(currentState) : updater;
  };

  return {
    getSettings: (target: ExpansionTarget) => {
      const state = getState();
      return state.settings[target];
    },
    updateSettings: (target: ExpansionTarget, updates: Partial<ExpansionSettings>) => {
      setState(state => expansionSettingsReducer(state, {
        type: "UPDATE_SETTINGS",
        payload: { target, settings: updates }
      }));
    },
    resetSettings: (target: ExpansionTarget) => {
      setState(state => expansionSettingsReducer(state, {
        type: "RESET_SETTINGS",
        payload: target
      }));
    },
    getSettingsSummary: (target: ExpansionTarget) => {
      const state = getState();
      const settings = state.settings[target];
      return {
        maxWorks: settings.maxWorks,
        maxAuthors: settings.maxAuthors,
        maxInstitutions: settings.maxInstitutions,
        maxSources: settings.maxSources,
        maxConcepts: settings.maxConcepts,
        maxTopics: settings.maxTopics,
        maxFunders: settings.maxFunders,
        maxPublishers: settings.maxPublishers,
      };
    },
  };
})();