/**
 * Group-based layout store for VSCode-style sidebar state management
 * React Context-based implementation replacing Zustand
 */

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import Dexie, { type Table } from "dexie";
import type { ProviderType } from "@academic-explorer/graph";
import {
  getDefaultSectionPlacements,
  getAllSectionIds,
  getSectionById,
} from "./section-registry";
// Group registry imports available but not currently used
// import {
//   updateGroupDefinition,
//   getGroupDefinition,
//   registerGroupDefinition,
// } from "./group-registry";
import { logger } from "@academic-explorer/utils/logger";

// Database schema for layout persistence
interface LayoutRecord {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

// Dexie database class for layout store
class LayoutDB extends Dexie {
  layout!: Table<LayoutRecord>;

  constructor() {
    super("academic-explorer-layout");

    this.version(1).stores({
      layout: "++id, key, updatedAt",
    });
  }
}

// Singleton instance
let dbInstance: LayoutDB | null = null;

const getDB = (): LayoutDB => {
  dbInstance ??= new LayoutDB();
  return dbInstance;
};

/**
 * Pure Dexie layout persistence service
 */
class LayoutPersistenceService {
  private db: LayoutDB;
  private logger = logger;

  constructor() {
    this.db = getDB();
  }

  /**
   * Get persisted layout state
   */
  async getLayoutState(): Promise<Partial<LayoutPersistedState>> {
    try {
      const records = await this.db.layout.toArray();
      const layoutState: Partial<LayoutPersistedState> = {};

      for (const record of records) {
        try {
          const parsedValue = JSON.parse(record.value);

          switch (record.key) {
            case "leftSidebarOpen":
              layoutState.leftSidebarOpen = Boolean(parsedValue);
              break;
            case "leftSidebarPinned":
              layoutState.leftSidebarPinned = Boolean(parsedValue);
              break;
            case "rightSidebarOpen":
              layoutState.rightSidebarOpen = Boolean(parsedValue);
              break;
            case "rightSidebarPinned":
              layoutState.rightSidebarPinned = Boolean(parsedValue);
              break;
            case "collapsedSections":
              if (typeof parsedValue === "object" && parsedValue !== null) {
                layoutState.collapsedSections = parsedValue as Record<
                  string,
                  boolean
                >;
              }
              break;
            case "sectionPlacements":
              if (typeof parsedValue === "object" && parsedValue !== null) {
                layoutState.sectionPlacements = parsedValue as Record<
                  string,
                  "left" | "right"
                >;
              }
              break;
            case "activeGroups":
              if (typeof parsedValue === "object" && parsedValue !== null) {
                layoutState.activeGroups = parsedValue as Record<
                  "left" | "right",
                  string | null
                >;
              }
              break;
            case "toolGroups":
              if (typeof parsedValue === "object" && parsedValue !== null) {
                layoutState.toolGroups = parsedValue as Record<
                  "left" | "right",
                  Record<string, ToolGroup>
                >;
              }
              break;
            case "graphProvider":
              if (typeof parsedValue === "string") {
                layoutState.graphProvider = parsedValue as ProviderType;
              }
              break;
            case "autoPinOnLayoutStabilization":
              layoutState.autoPinOnLayoutStabilization = Boolean(parsedValue);
              break;
          }
        } catch (parseError) {
          this.logger?.warn(
            "layout-persistence",
            `Failed to parse stored value for key: ${record.key}`,
            {
              error: parseError,
              value: record.value,
            },
          );
        }
      }

      return layoutState;
    } catch (error) {
      this.logger?.error("layout-persistence", "Failed to load layout state", {
        error,
      });
      return {};
    }
  }

  /**
   * Persist a layout state property
   */
  async setLayoutProperty<K extends keyof LayoutPersistedState>(
    key: K,
    value: LayoutPersistedState[K],
  ): Promise<void> {
    try {
      await this.db.layout.put({
        key,
        value: JSON.stringify(value),
        updatedAt: new Date(),
      });

      this.logger?.debug(
        "layout-persistence",
        `Persisted layout property: ${key}`,
      );
    } catch (error) {
      this.logger?.error(
        "layout-persistence",
        `Failed to persist layout property: ${key}`,
        {
          error,
          value,
        },
      );
      throw error;
    }
  }

  /**
   * Clear all persisted layout state
   */
  async clearLayoutState(): Promise<void> {
    try {
      await this.db.layout.clear();
      this.logger?.debug(
        "layout-persistence",
        "Cleared all persisted layout state",
      );
    } catch (error) {
      this.logger?.error("layout-persistence", "Failed to clear layout state", {
        error,
      });
      throw error;
    }
  }

  /**
   * Migrate from old storage format if needed
   */
  async migrateFromOldStorage(): Promise<void> {
    try {
      // Check if migration already happened
      const migrationKey = "migration-completed";
      const existingMigration = await this.db.layout.get({
        key: migrationKey,
      });

      if (existingMigration) {
        this.logger?.debug("layout-persistence", "Migration already completed");
        return;
      }

      // Try to load from old localStorage (if any existed)
      let migratedData = false;

      if (typeof localStorage !== "undefined") {
        try {
          // Look for any old layout state in localStorage
          const oldLayoutState = localStorage.getItem("layout-store");
          if (oldLayoutState) {
            const parsed = JSON.parse(oldLayoutState);
            const state = parsed?.state;

            if (state && typeof state === "object") {
              // Migrate individual properties
              const persistableKeys: (keyof LayoutPersistedState)[] = [
                "leftSidebarOpen",
                "leftSidebarPinned",
                "rightSidebarOpen",
                "rightSidebarPinned",
                "collapsedSections",
                "sectionPlacements",
                "activeGroups",
                "toolGroups",
                "graphProvider",
                "autoPinOnLayoutStabilization",
              ];

              for (const key of persistableKeys) {
                if (key in state) {
                  await this.setLayoutProperty(key, state[key]);
                  migratedData = true;
                }
              }

              this.logger?.debug(
                "layout-persistence",
                "Migrated layout state from localStorage",
              );
            }
          }
        } catch (error) {
          this.logger?.warn(
            "layout-persistence",
            "Failed to migrate from localStorage",
            {
              error,
            },
          );
        }
      }

      // Mark migration as completed
      await this.db.layout.put({
        key: migrationKey,
        value: "true",
        updatedAt: new Date(),
      });

      this.logger?.debug("layout-persistence", "Migration completed", {
        migratedData,
      });
    } catch (error) {
      this.logger?.error("layout-persistence", "Migration failed", { error });
    }
  }
}

// Singleton instance
const persistenceService = new LayoutPersistenceService();

// Helper function to handle persistence operations safely in test environments
const safePersist = (operation: Promise<void>) => {
  // Skip persistence entirely in test environments to avoid slowdowns
  if (typeof process !== "undefined" && process.env.VITEST) {
    return Promise.resolve();
  }

  return operation.catch((error) => {
    // In test environments, persistence may fail due to missing IndexedDB
    if (typeof process !== "undefined" && process.env.VITEST) {
      logger?.debug("layout-store", "Persistence failed in test environment", {
        error,
      });
    } else {
      throw error;
    }
  });
};

interface ToolGroup {
  id: string;
  sections: string[];
  activeSection: string | null;
}

interface LayoutState {
  // Sidebar states
  leftSidebarOpen: boolean;
  leftSidebarPinned: boolean;
  rightSidebarOpen: boolean;
  rightSidebarPinned: boolean;

  // Autohide states
  leftSidebarAutoHidden: boolean;
  rightSidebarAutoHidden: boolean;

  // Hover states for autohide
  leftSidebarHovered: boolean;
  rightSidebarHovered: boolean;

  // Section collapsed states (for tool headers)
  collapsedSections: Record<string, boolean>;

  // Section placement states (which sidebar each section is in)
  sectionPlacements: Record<string, "left" | "right">;

  // Active group for each sidebar (VSCode-style single active group)
  activeGroups: Record<"left" | "right", string | null>;

  // Tool groups for each sidebar (category-based groups with multiple tools)
  toolGroups: Record<"left" | "right", Record<string, ToolGroup>>;

  // Graph provider selection
  graphProvider: ProviderType;

  // Preview entity (for hover/selection)
  previewEntityId: string | null;

  // Graph behavior preferences
  autoPinOnLayoutStabilization: boolean;
}

// Helper function to create default tool groups based on categories
const createDefaultToolGroups = (): Record<
  "left" | "right",
  Record<string, ToolGroup>
> => {
  const placements = getDefaultSectionPlacements();
  const leftSections = getAllSectionIds().filter(
    (id) => placements[id] === "left",
  );
  const rightSections = getAllSectionIds().filter(
    (id) => placements[id] === "right",
  );

  // Get unique categories for each sidebar
  const leftCategories = [
    ...new Set(
      leftSections
        .map((id) => getSectionById(id)?.category)
        .filter((cat): cat is string => Boolean(cat)),
    ),
  ];
  const rightCategories = [
    ...new Set(
      rightSections
        .map((id) => getSectionById(id)?.category)
        .filter((cat): cat is string => Boolean(cat)),
    ),
  ];

  const createGroupsForSide = (sections: string[], categories: string[]) => {
    const groups: Record<string, ToolGroup> = {};
    for (const category of categories) {
      const categorySections = sections.filter((id) => {
        const section = getSectionById(id);
        return section?.category === category;
      });
      if (categorySections.length > 0) {
        groups[category] = {
          id: category,
          sections: categorySections,
          activeSection: categorySections[0] ?? null, // Default to first section
        };
      }
    }
    return groups;
  };

  return {
    left: createGroupsForSide(leftSections, leftCategories),
    right: createGroupsForSide(rightSections, rightCategories),
  };
};

// Helper function to create default active groups (first group in each sidebar)
const createDefaultActiveGroups = (): Record<
  "left" | "right",
  string | null
> => {
  const toolGroups = createDefaultToolGroups();
  const leftGroupIds = Object.keys(toolGroups.left);
  const rightGroupIds = Object.keys(toolGroups.right);

  return {
    left: leftGroupIds[0] ?? null,
    right: rightGroupIds[0] ?? null,
  };
};

type LayoutPersistedState = Partial<
  Pick<
    LayoutState,
    | "leftSidebarOpen"
    | "leftSidebarPinned"
    | "rightSidebarOpen"
    | "rightSidebarPinned"
    | "collapsedSections"
    | "sectionPlacements"
    | "activeGroups"
    | "toolGroups"
    | "graphProvider"
    | "autoPinOnLayoutStabilization"
  >
>;

// Initial state
const getInitialState = (): LayoutState => ({
  leftSidebarOpen: true,
  leftSidebarPinned: false,
  rightSidebarOpen: true,
  rightSidebarPinned: false,
  leftSidebarAutoHidden: false,
  rightSidebarAutoHidden: false,
  leftSidebarHovered: false,
  rightSidebarHovered: false,
  collapsedSections: {},
  sectionPlacements: getDefaultSectionPlacements(),
  activeGroups: createDefaultActiveGroups(),
  toolGroups: createDefaultToolGroups(),
  graphProvider: "xyflow",
  previewEntityId: null,
  autoPinOnLayoutStabilization: false,
});

// Action types
type LayoutAction =
  | { type: "TOGGLE_LEFT_SIDEBAR" }
  | { type: "TOGGLE_RIGHT_SIDEBAR" }
  | { type: "SET_LEFT_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_OPEN"; payload: boolean }
  | { type: "PIN_LEFT_SIDEBAR"; payload: boolean }
  | { type: "PIN_RIGHT_SIDEBAR"; payload: boolean }
  | { type: "SET_LEFT_SIDEBAR_AUTO_HIDDEN"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_AUTO_HIDDEN"; payload: boolean }
  | { type: "SET_LEFT_SIDEBAR_HOVERED"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_HOVERED"; payload: boolean }
  | { type: "SET_SECTION_COLLAPSED"; payload: { sectionKey: string; collapsed: boolean } }
  | { type: "EXPAND_SIDEBAR_TO_SECTION"; payload: { sidebar: "left" | "right"; sectionKey: string } }
  | { type: "SET_ACTIVE_GROUP"; payload: { sidebar: "left" | "right"; groupId: string | null } }
  | { type: "SET_GRAPH_PROVIDER"; payload: ProviderType }
  | { type: "SET_PREVIEW_ENTITY"; payload: string | null }
  | { type: "SET_AUTO_PIN_ON_LAYOUT_STABILIZATION"; payload: boolean }
  | { type: "LOAD_PERSISTED_STATE"; payload: Partial<LayoutState> }
  | { type: "RESET_SECTION_PLACEMENTS" }
  | { type: "ADD_SECTION_TO_GROUP"; payload: { sidebar: "left" | "right"; groupId: string; sectionKey: string } }
  | { type: "REMOVE_SECTION_FROM_GROUP"; payload: { sidebar: "left" | "right"; groupId: string; sectionKey: string } }
  | { type: "REORDER_GROUPS"; payload: { sidebar: "left" | "right"; groupIds: string[] } }
  | { type: "MOVE_GROUP_TO_SIDEBAR"; payload: { fromSidebar: "left" | "right"; toSidebar: "left" | "right"; groupId: string } };

// Reducer
const layoutReducer = (state: LayoutState, action: LayoutAction): LayoutState => {
  switch (action.type) {
    case "TOGGLE_LEFT_SIDEBAR":
      return { ...state, leftSidebarOpen: !state.leftSidebarOpen };
    case "TOGGLE_RIGHT_SIDEBAR":
      return { ...state, rightSidebarOpen: !state.rightSidebarOpen };
    case "SET_LEFT_SIDEBAR_OPEN":
      return { ...state, leftSidebarOpen: action.payload };
    case "SET_RIGHT_SIDEBAR_OPEN":
      return { ...state, rightSidebarOpen: action.payload };
    case "PIN_LEFT_SIDEBAR":
      return { ...state, leftSidebarPinned: action.payload };
    case "PIN_RIGHT_SIDEBAR":
      return { ...state, rightSidebarPinned: action.payload };
    case "SET_LEFT_SIDEBAR_AUTO_HIDDEN":
      return { ...state, leftSidebarAutoHidden: action.payload };
    case "SET_RIGHT_SIDEBAR_AUTO_HIDDEN":
      return { ...state, rightSidebarAutoHidden: action.payload };
    case "SET_LEFT_SIDEBAR_HOVERED":
      return { ...state, leftSidebarHovered: action.payload };
    case "SET_RIGHT_SIDEBAR_HOVERED":
      return { ...state, rightSidebarHovered: action.payload };
    case "SET_SECTION_COLLAPSED":
      return {
        ...state,
        collapsedSections: {
          ...state.collapsedSections,
          [action.payload.sectionKey]: action.payload.collapsed,
        },
      };
    case "EXPAND_SIDEBAR_TO_SECTION": {
      const { sidebar, sectionKey } = action.payload;
      const toolGroups = state.toolGroups[sidebar];
      let targetGroupId: string | null = null;

      for (const [groupId, group] of Object.entries(toolGroups) as [
        string,
        ToolGroup,
      ][]) {
        if (group.sections.includes(sectionKey)) {
          targetGroupId = groupId;
          break;
        }
      }

      if (!targetGroupId) return state;

      const updatedGroups = {
        ...toolGroups,
        [targetGroupId]: {
          ...toolGroups[targetGroupId],
          activeSection: sectionKey,
        },
      };

      return {
        ...state,
        leftSidebarOpen: sidebar === "left" ? true : state.leftSidebarOpen,
        rightSidebarOpen: sidebar === "right" ? true : state.rightSidebarOpen,
        toolGroups: {
          ...state.toolGroups,
          [sidebar]: updatedGroups,
        },
        activeGroups: {
          ...state.activeGroups,
          [sidebar]: targetGroupId,
        },
      };
    }
    case "SET_ACTIVE_GROUP":
      return {
        ...state,
        activeGroups: {
          ...state.activeGroups,
          [action.payload.sidebar]: action.payload.groupId,
        },
      };
    case "SET_GRAPH_PROVIDER":
      return { ...state, graphProvider: action.payload };
    case "SET_PREVIEW_ENTITY":
      return { ...state, previewEntityId: action.payload };
    case "SET_AUTO_PIN_ON_LAYOUT_STABILIZATION":
      return { ...state, autoPinOnLayoutStabilization: action.payload };
    case "LOAD_PERSISTED_STATE":
      return { ...state, ...action.payload };
    case "RESET_SECTION_PLACEMENTS":
      return {
        ...state,
        sectionPlacements: getDefaultSectionPlacements(),
        activeGroups: createDefaultActiveGroups(),
        toolGroups: createDefaultToolGroups(),
      };

    case "ADD_SECTION_TO_GROUP": {
      const { sidebar, groupId, sectionKey } = action.payload;
      const currentToolGroups = { ...state.toolGroups };

      if (!currentToolGroups[sidebar]) {
        currentToolGroups[sidebar] = {};
      }

      if (!currentToolGroups[sidebar][groupId]) {
        currentToolGroups[sidebar][groupId] = { id: groupId, sections: [], activeSection: null };
      }

      const group = { ...currentToolGroups[sidebar][groupId] };
      if (!group.sections.includes(sectionKey)) {
        group.sections = [...group.sections, sectionKey];
      }

      currentToolGroups[sidebar][groupId] = group;

      return {
        ...state,
        toolGroups: currentToolGroups,
      };
    }

    case "REMOVE_SECTION_FROM_GROUP": {
      const { sidebar, groupId, sectionKey } = action.payload;
      const currentToolGroups = { ...state.toolGroups };

      if (currentToolGroups[sidebar]?.[groupId]) {
        const group = { ...currentToolGroups[sidebar][groupId] };
        group.sections = group.sections.filter(section => section !== sectionKey);
        currentToolGroups[sidebar][groupId] = group;
      }

      return {
        ...state,
        toolGroups: currentToolGroups,
      };
    }

    case "REORDER_GROUPS": {
      const { sidebar, groupIds } = action.payload;
      const currentToolGroups = { ...state.toolGroups };
      const sidebarGroups = currentToolGroups[sidebar] || {};
      const reorderedGroups: Record<string, ToolGroup> = {};

      groupIds.forEach(groupId => {
        if (sidebarGroups[groupId]) {
          reorderedGroups[groupId] = sidebarGroups[groupId];
        }
      });

      currentToolGroups[sidebar] = reorderedGroups;

      return {
        ...state,
        toolGroups: currentToolGroups,
      };
    }

    case "MOVE_GROUP_TO_SIDEBAR": {
      const { fromSidebar, toSidebar, groupId } = action.payload;
      const currentToolGroups = { ...state.toolGroups };
      const group = currentToolGroups[fromSidebar]?.[groupId];

      if (group) {
        // Remove from original sidebar
        const newFromSidebar = { ...currentToolGroups[fromSidebar] };
        delete newFromSidebar[groupId];
        currentToolGroups[fromSidebar] = newFromSidebar;

        // Add to new sidebar
        if (!currentToolGroups[toSidebar]) {
          currentToolGroups[toSidebar] = {};
        }
        currentToolGroups[toSidebar][groupId] = { id: groupId, sections: group.sections, activeSection: group.activeSection };
      }

      return {
        ...state,
        toolGroups: currentToolGroups,
      };
    }

    default:
      return state;
  }
};

// Context
const LayoutContext = createContext<{
  state: LayoutState;
  dispatch: React.Dispatch<LayoutAction>;
} | null>(null);

// Provider component
export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(layoutReducer, getInitialState());

  // Initialize persisted state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip in test environments
    if (typeof process !== "undefined" && process.env.VITEST) return;

    const initializeState = async () => {
      try {
        // Run migration first
        await persistenceService.migrateFromOldStorage();

        // Load persisted state
        const persistedState = await persistenceService.getLayoutState();
        if (Object.keys(persistedState).length > 0) {
          dispatch({ type: "LOAD_PERSISTED_STATE", payload: persistedState });
        }
      } catch (error) {
        logger?.error("layout-store", "Failed to initialize persisted state", {
          error,
        });
      }
    };

    void initializeState();
  }, []);

  // Persist state changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip in test environments
    if (typeof process !== "undefined" && process.env.VITEST) return;

    const persistChanges = async () => {
      const persistableKeys: (keyof LayoutPersistedState)[] = [
        "leftSidebarOpen",
        "leftSidebarPinned",
        "rightSidebarOpen",
        "rightSidebarPinned",
        "collapsedSections",
        "sectionPlacements",
        "activeGroups",
        "toolGroups",
        "graphProvider",
        "autoPinOnLayoutStabilization",
      ];

      for (const key of persistableKeys) {
        if (key in state) {
          await safePersist(
            persistenceService.setLayoutProperty(key, state[key]),
          );
        }
      }
    };

    void persistChanges();
  }, [
    state.leftSidebarOpen,
    state.leftSidebarPinned,
    state.rightSidebarOpen,
    state.rightSidebarPinned,
    state.collapsedSections,
    state.sectionPlacements,
    state.activeGroups,
    state.toolGroups,
    state.graphProvider,
    state.autoPinOnLayoutStabilization,
  ]);

  const value = { state, dispatch };
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

// Hook for using layout state
export const useLayoutState = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    // Log warning in development but return safe defaults to prevent hook ordering violations
    if (import.meta.env.DEV) {
      logger.warn("layout", "useLayoutState called outside LayoutProvider - returning defaults");
    }
    // Return initial state as fallback to maintain hook consistency
    return getInitialState();
  }
  return context.state;
};

// Stable no-op function for fallback
const createNoOpFunction = () => () => {
  logger.warn("layout", "Attempted to call layout action outside LayoutProvider");
};

// Create stable fallback objects once to maintain consistency
const createFallbackActions = () => {
  const noOp = createNoOpFunction();
  return {
    toggleLeftSidebar: noOp,
    toggleRightSidebar: noOp,
    setLeftSidebarOpen: noOp,
    setRightSidebarOpen: noOp,
    pinLeftSidebar: noOp,
    pinRightSidebar: noOp,
    setLeftSidebarAutoHidden: noOp,
    setRightSidebarAutoHidden: noOp,
    setLeftSidebarHovered: noOp,
    setRightSidebarHovered: noOp,
    setSectionCollapsed: noOp,
    expandSidebarToSection: noOp,
    setActiveGroup: noOp,
    setGraphProvider: noOp,
    setPreviewEntity: noOp,
    setAutoPinOnLayoutStabilization: noOp,
    resetSectionPlacements: noOp,
    getToolGroupsForSidebar: () => [],
    getActiveGroup: () => null,
    addSectionToGroup: noOp,
    removeSectionFromGroup: noOp,
    reorderGroups: noOp,
    moveGroupToSidebar: noOp,
  };
};

// Create stable fallback once
const fallbackActions = createFallbackActions();

// Hook for using layout actions
export const useLayoutActions = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    // Log warning in development but return safe no-op actions to prevent hook ordering violations
    if (import.meta.env.DEV) {
      logger.warn("layout", "useLayoutActions called outside LayoutProvider - returning no-op actions");
    }
    // Return stable fallback object to maintain hook consistency
    return fallbackActions;
  }

  return {
    toggleLeftSidebar: () => context.dispatch({ type: "TOGGLE_LEFT_SIDEBAR" }),
    toggleRightSidebar: () => context.dispatch({ type: "TOGGLE_RIGHT_SIDEBAR" }),
    setLeftSidebarOpen: (open: boolean) =>
      context.dispatch({ type: "SET_LEFT_SIDEBAR_OPEN", payload: open }),
    setRightSidebarOpen: (open: boolean) =>
      context.dispatch({ type: "SET_RIGHT_SIDEBAR_OPEN", payload: open }),
    pinLeftSidebar: (pinned: boolean) =>
      context.dispatch({ type: "PIN_LEFT_SIDEBAR", payload: pinned }),
    pinRightSidebar: (pinned: boolean) =>
      context.dispatch({ type: "PIN_RIGHT_SIDEBAR", payload: pinned }),
    setLeftSidebarAutoHidden: (autoHidden: boolean) =>
      context.dispatch({ type: "SET_LEFT_SIDEBAR_AUTO_HIDDEN", payload: autoHidden }),
    setRightSidebarAutoHidden: (autoHidden: boolean) =>
      context.dispatch({ type: "SET_RIGHT_SIDEBAR_AUTO_HIDDEN", payload: autoHidden }),
    setLeftSidebarHovered: (hovered: boolean) =>
      context.dispatch({ type: "SET_LEFT_SIDEBAR_HOVERED", payload: hovered }),
    setRightSidebarHovered: (hovered: boolean) =>
      context.dispatch({ type: "SET_RIGHT_SIDEBAR_HOVERED", payload: hovered }),
    setSectionCollapsed: ({ sectionKey, collapsed }: { sectionKey: string; collapsed: boolean }) =>
      context.dispatch({ type: "SET_SECTION_COLLAPSED", payload: { sectionKey, collapsed } }),
    expandSidebarToSection: ({ sidebar, sectionKey }: { sidebar: "left" | "right"; sectionKey: string }) =>
      context.dispatch({ type: "EXPAND_SIDEBAR_TO_SECTION", payload: { sidebar, sectionKey } }),
    setActiveGroup: ({ sidebar, groupId }: { sidebar: "left" | "right"; groupId: string | null }) =>
      context.dispatch({ type: "SET_ACTIVE_GROUP", payload: { sidebar, groupId } }),
    setGraphProvider: (provider: ProviderType) =>
      context.dispatch({ type: "SET_GRAPH_PROVIDER", payload: provider }),
    setPreviewEntity: (entityId: string | null) =>
      context.dispatch({ type: "SET_PREVIEW_ENTITY", payload: entityId }),
    setAutoPinOnLayoutStabilization: (enabled: boolean) =>
      context.dispatch({ type: "SET_AUTO_PIN_ON_LAYOUT_STABILIZATION", payload: enabled }),
    resetSectionPlacements: () =>
      context.dispatch({ type: "RESET_SECTION_PLACEMENTS" }),

    // Group management methods
    getToolGroupsForSidebar: (sidebar: "left" | "right") => {
      const groups = context.state.toolGroups?.[sidebar] || {};
      const activeGroupId = context.state.activeGroups?.[sidebar];
      return Object.entries(groups).map(([id, group]) => ({
        id,
        name: id,
        sections: group.sections || [],
        isActive: id === activeGroupId,
      }));
    },

    getActiveGroup: (sidebar: "left" | "right"): string | null => {
      const activeGroupId = context.state.activeGroups?.[sidebar];
      if (!activeGroupId) return null;

      const groups = context.state.toolGroups?.[sidebar] || {};
      return groups[activeGroupId] ? activeGroupId : null;
    },

    addSectionToGroup: ({ sidebar, groupId, sectionKey }: { sidebar: "left" | "right"; groupId: string; sectionKey: string }) => {
      context.dispatch({
        type: "ADD_SECTION_TO_GROUP",
        payload: { sidebar, groupId, sectionKey }
      });
    },

    removeSectionFromGroup: ({ sidebar, groupId, sectionKey }: { sidebar: "left" | "right"; groupId: string; sectionKey: string }) => {
      context.dispatch({
        type: "REMOVE_SECTION_FROM_GROUP",
        payload: { sidebar, groupId, sectionKey }
      });
    },

    reorderGroups: ({ sidebar, groupIds }: { sidebar: "left" | "right"; groupIds: string[] }) => {
      context.dispatch({
        type: "REORDER_GROUPS",
        payload: { sidebar, groupIds }
      });
    },

    moveGroupToSidebar: ({ fromSidebar, toSidebar, groupId }: { fromSidebar: "left" | "right"; toSidebar: "left" | "right"; groupId: string }) => {
      context.dispatch({
        type: "MOVE_GROUP_TO_SIDEBAR",
        payload: { fromSidebar, toSidebar, groupId }
      });
    },
  };
};

// Combined hook for both state and actions
export const useLayoutStore = () => {
  const state = useLayoutState();
  const actions = useLayoutActions();

  return {
    ...state,
    ...actions,
    // Ensure all methods are available
    getToolGroupsForSidebar: actions.getToolGroupsForSidebar,
    getActiveGroup: actions.getActiveGroup,
    setActiveGroup: actions.setActiveGroup,
    addSectionToGroup: actions.addSectionToGroup,
    removeSectionFromGroup: actions.removeSectionFromGroup,
    reorderGroups: actions.reorderGroups,
    moveGroupToSidebar: actions.moveGroupToSidebar,
  };
};

// Selector hook for optimized re-renders
export const useLayoutSelector = <T,>(selector: (state: LayoutState) => T): T => {
  const state = useLayoutState();
  return selector(state);
};