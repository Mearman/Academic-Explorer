/**
 * Group-based layout store for VSCode-style sidebar state management
 * Ribbon buttons represent tool groups (categories), multiple tools can be in each group
 * Pure Dexie implementation for persistence
 */

import Dexie, { type Table } from "dexie";
import { create } from "zustand";
import type { ProviderType } from "@academic-explorer/graph";
import {
  getDefaultSectionPlacements,
  getAllSectionIds,
  getSectionById,
} from "./section-registry";
import {
  updateGroupDefinition,
  getGroupDefinition,
  registerGroupDefinition,
} from "./group-registry";
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

// Initialize migration on first load (only in browser)
if (typeof window !== "undefined") {
  void persistenceService.migrateFromOldStorage();
}

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

interface LayoutActions {
  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  pinLeftSidebar: (pinned: boolean) => void;
  pinRightSidebar: (pinned: boolean) => void;
  setLeftSidebarAutoHidden: (autoHidden: boolean) => void;
  setRightSidebarAutoHidden: (autoHidden: boolean) => void;
  setLeftSidebarHovered: (hovered: boolean) => void;
  setRightSidebarHovered: (hovered: boolean) => void;
  setSectionCollapsed: ({
    sectionKey,
    collapsed,
  }: {
    sectionKey: string;
    collapsed: boolean;
  }) => void;
  expandSidebarToSection: ({
    sidebar,
    sectionKey,
  }: {
    sidebar: "left" | "right";
    sectionKey: string;
  }) => void;
  setActiveGroup: ({
    sidebar,
    groupId,
  }: {
    sidebar: "left" | "right";
    groupId: string | null;
  }) => void;
  addSectionToGroup: ({
    sidebar,
    groupId,
    sectionId,
  }: {
    sidebar: "left" | "right";
    groupId: string;
    sectionId: string;
  }) => void;
  removeSectionFromGroup: ({
    sidebar,
    groupId,
    sectionId,
  }: {
    sidebar: "left" | "right";
    groupId: string;
    sectionId: string;
  }) => void;
  setActiveTabInGroup: ({
    sidebar,
    groupId,
    sectionId,
  }: {
    sidebar: "left" | "right";
    groupId: string;
    sectionId: string;
  }) => void;
  moveSectionToSidebar: ({
    sectionId,
    targetSidebar,
  }: {
    sectionId: string;
    targetSidebar: "left" | "right";
  }) => void;
  resetSectionPlacements: () => void;
  getSectionsForSidebar: (sidebar: "left" | "right") => string[];
  getActiveGroup: (sidebar: "left" | "right") => string | null;
  getToolGroupsForSidebar: (
    sidebar: "left" | "right",
  ) => Record<string, ToolGroup>;
  reorderGroups: ({
    sidebar,
    sourceGroupId,
    targetGroupId,
    insertBefore,
  }: {
    sidebar: "left" | "right";
    sourceGroupId: string;
    targetGroupId: string;
    insertBefore: boolean;
  }) => void;
  moveGroupToSidebar: ({
    sourceGroupId,
    targetSidebar,
    targetGroupId,
    insertBefore,
  }: {
    sourceGroupId: string;
    targetSidebar: "left" | "right";
    targetGroupId?: string;
    insertBefore?: boolean;
  }) => void;
  setGraphProvider: (provider: ProviderType) => void;
  setPreviewEntity: (entityId: string | null) => void;
  setAutoPinOnLayoutStabilization: (enabled: boolean) => void;

  // Index signature to satisfy constraint
  [key: string]: unknown;
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

// Global state for Zustand compatibility
let currentState: LayoutState = {
  // Initial state
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
};

const listeners = new Set<(state: LayoutState) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(currentState));
};

// Initialize state from Dexie on first load
let initialized = false;
const initializeState = async () => {
  if (initialized || typeof window === "undefined" || process.env.VITEST)
    return;
  try {
    const persistedState = await persistenceService.getLayoutState();
    currentState = {
      ...currentState,
      ...persistedState,
    };
    notifyListeners();
    initialized = true;
  } catch (error) {
    logger?.error("layout-store", "Failed to initialize persisted state", {
      error,
    });
  }
};

// Create Zustand store
const zustandStore = create(() => currentState);

// Actions that update both Zustand and persistence
const actions: LayoutActions = {
  toggleLeftSidebar: () => {
    currentState = {
      ...currentState,
      leftSidebarOpen: !currentState.leftSidebarOpen,
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "leftSidebarOpen",
        currentState.leftSidebarOpen,
      ),
    );
  },

  toggleRightSidebar: () => {
    currentState = {
      ...currentState,
      rightSidebarOpen: !currentState.rightSidebarOpen,
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "rightSidebarOpen",
        currentState.rightSidebarOpen,
      ),
    );
  },

  setLeftSidebarOpen: (open) => {
    currentState = { ...currentState, leftSidebarOpen: open };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty("leftSidebarOpen", open),
    );
  },

  setRightSidebarOpen: (open) => {
    currentState = { ...currentState, rightSidebarOpen: open };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty("rightSidebarOpen", open),
    );
  },

  pinLeftSidebar: (pinned) => {
    currentState = { ...currentState, leftSidebarPinned: pinned };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty("leftSidebarPinned", pinned),
    );
  },

  pinRightSidebar: (pinned) => {
    currentState = { ...currentState, rightSidebarPinned: pinned };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty("rightSidebarPinned", pinned),
    );
  },

  setLeftSidebarAutoHidden: (autoHidden) => {
    currentState = { ...currentState, leftSidebarAutoHidden: autoHidden };
    zustandStore.setState(currentState);
    notifyListeners();
  },

  setRightSidebarAutoHidden: (autoHidden) => {
    currentState = { ...currentState, rightSidebarAutoHidden: autoHidden };
    zustandStore.setState(currentState);
    notifyListeners();
  },

  setLeftSidebarHovered: (hovered) => {
    currentState = { ...currentState, leftSidebarHovered: hovered };
    zustandStore.setState(currentState);
    notifyListeners();
  },

  setRightSidebarHovered: (hovered) => {
    currentState = { ...currentState, rightSidebarHovered: hovered };
    zustandStore.setState(currentState);
    notifyListeners();
  },

  setSectionCollapsed: ({ sectionKey, collapsed }) => {
    currentState = {
      ...currentState,
      collapsedSections: {
        ...currentState.collapsedSections,
        [sectionKey]: collapsed,
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "collapsedSections",
        currentState.collapsedSections,
      ),
    );
  },

  expandSidebarToSection: ({ sidebar, sectionKey }) => {
    // Find which group contains this section
    const toolGroups = currentState.toolGroups[sidebar];
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

    if (!targetGroupId) return;

    // Update the group's active section and set as active group
    const updatedGroups = {
      ...toolGroups,
      [targetGroupId]: {
        ...toolGroups[targetGroupId],
        activeSection: sectionKey,
      },
    };

    currentState = {
      // Open the appropriate sidebar
      ...currentState,
      leftSidebarOpen: sidebar === "left" ? true : currentState.leftSidebarOpen,
      rightSidebarOpen:
        sidebar === "right" ? true : currentState.rightSidebarOpen,
      toolGroups: {
        ...currentState.toolGroups,
        [sidebar]: updatedGroups,
      },
      activeGroups: {
        ...currentState.activeGroups,
        [sidebar]: targetGroupId,
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void Promise.all([
      persistenceService.setLayoutProperty(
        "toolGroups",
        currentState.toolGroups,
      ),
      persistenceService.setLayoutProperty(
        "activeGroups",
        currentState.activeGroups,
      ),
    ]);
  },

  setActiveGroup: ({ sidebar, groupId }) => {
    currentState = {
      ...currentState,
      activeGroups: {
        ...currentState.activeGroups,
        [sidebar]: groupId,
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "activeGroups",
        currentState.activeGroups,
      ),
    );
  },

  addSectionToGroup: ({ sidebar, groupId, sectionId }) => {
    const toolGroups = currentState.toolGroups[sidebar];
    const hasGroup = groupId in toolGroups;
    const group = hasGroup ? toolGroups[groupId] : undefined;

    logger.debug("ui", `addSectionToGroup called`, {
      sidebar,
      groupId,
      sectionId,
      groupExists: hasGroup,
      existingGroupIds: Object.keys(toolGroups),
      existingGroupSections: group?.sections,
    });

    // Handle existing group
    if (hasGroup && group) {
      // If group already contains the section, do nothing
      if (group.sections.includes(sectionId)) {
        logger.debug(
          "ui",
          `Section ${sectionId} already in group ${groupId}, skipping`,
        );
        return;
      }
    } else {
      // Check if this is a valid group definition from the registry
      const groupDefinition = getGroupDefinition(groupId);
      if (!groupDefinition) {
        logger.error(
          "ui",
          `Cannot add section to non-existent group - no group definition found`,
          {
            sidebar,
            groupId,
            sectionId,
            availableGroups: Object.keys(toolGroups),
          },
        );
        return; // Only allow adding to groups that exist in the registry
      }

      logger.debug("ui", `Creating new group from registry definition`, {
        sidebar,
        groupId,
        sectionId,
        groupDefinition: {
          id: groupDefinition.id,
          title: groupDefinition.title,
        },
      });
    }

    // Update existing group or create new one from registry
    let updatedGroup: ToolGroup;
    if (hasGroup && group) {
      // Update existing group
      updatedGroup = {
        ...group,
        sections: [...group.sections, sectionId],
        activeSection: sectionId, // Focus the newly added section
      };
    } else {
      // Create new group from registry definition
      updatedGroup = {
        id: groupId,
        sections: [sectionId],
        activeSection: sectionId,
      };
    }

    logger.debug("ui", `Adding section ${sectionId} to group ${groupId}`, {
      sidebar,
      groupId,
      sectionId,
      isNewGroup: !hasGroup,
      ...(hasGroup && group && { oldSections: group.sections }),
      newSections: updatedGroup.sections,
    });

    // Update group definition based on sections
    updateGroupDefinition(groupId, updatedGroup.sections, getSectionById);

    currentState = {
      ...currentState,
      toolGroups: {
        ...currentState.toolGroups,
        [sidebar]: {
          ...toolGroups,
          [groupId]: updatedGroup,
        },
      },
      activeGroups: {
        ...currentState.activeGroups,
        [sidebar]: groupId, // Activate the group
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void Promise.all([
      safePersist(
        persistenceService.setLayoutProperty(
          "toolGroups",
          currentState.toolGroups,
        ),
      ),
      safePersist(
        persistenceService.setLayoutProperty(
          "activeGroups",
          currentState.activeGroups,
        ),
      ),
    ]);
  },

  removeSectionFromGroup: ({ sidebar, groupId, sectionId }) => {
    const toolGroups = currentState.toolGroups[sidebar];
    const hasGroup = groupId in toolGroups;
    const group = hasGroup ? toolGroups[groupId] : undefined;

    if (!hasGroup || !group) return;

    const updatedSections = group.sections.filter((id) => id !== sectionId);
    const newActiveSection =
      group.activeSection === sectionId
        ? updatedSections[0] || null
        : group.activeSection;

    // If group becomes empty, remove it entirely
    if (updatedSections.length === 0) {
      const { [groupId]: _removedGroup, ...remainingGroups } = toolGroups;
      const newActiveGroup =
        currentState.activeGroups[sidebar] === groupId
          ? null
          : currentState.activeGroups[sidebar];

      // Remove group definition
      updateGroupDefinition(groupId, [], getSectionById);

      currentState = {
        ...currentState,
        toolGroups: {
          ...currentState.toolGroups,
          [sidebar]: remainingGroups,
        },
        activeGroups: {
          ...currentState.activeGroups,
          [sidebar]: newActiveGroup,
        },
      };
      zustandStore.setState(currentState);
      notifyListeners();
      void Promise.all([
        safePersist(
          persistenceService.setLayoutProperty(
            "toolGroups",
            currentState.toolGroups,
          ),
        ),
        safePersist(
          persistenceService.setLayoutProperty(
            "activeGroups",
            currentState.activeGroups,
          ),
        ),
      ]);
      return;
    }

    const updatedGroup = {
      ...group,
      sections: updatedSections,
      activeSection: newActiveSection,
    };

    // Update group definition based on new sections
    updateGroupDefinition(groupId, updatedGroup.sections, getSectionById);

    currentState = {
      ...currentState,
      toolGroups: {
        ...currentState.toolGroups,
        [sidebar]: {
          ...toolGroups,
          [groupId]: updatedGroup,
        },
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "toolGroups",
        currentState.toolGroups,
      ),
    );
  },

  setActiveTabInGroup: ({ sidebar, groupId, sectionId }) => {
    const toolGroups = currentState.toolGroups[sidebar];
    const hasGroup = groupId in toolGroups;
    const group = hasGroup ? toolGroups[groupId] : undefined;

    if (!hasGroup || !group?.sections.includes(sectionId)) return;

    const updatedGroup = {
      ...group,
      activeSection: sectionId,
    };

    currentState = {
      ...currentState,
      toolGroups: {
        ...currentState.toolGroups,
        [sidebar]: {
          ...toolGroups,
          [groupId]: updatedGroup,
        },
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "toolGroups",
        currentState.toolGroups,
      ),
    );
  },

  moveSectionToSidebar: ({ sectionId, targetSidebar }) => {
    currentState = {
      ...currentState,
      sectionPlacements: {
        ...currentState.sectionPlacements,
        [sectionId]: targetSidebar,
      },
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "sectionPlacements",
        currentState.sectionPlacements,
      ),
    );
  },

  resetSectionPlacements: () => {
    currentState = {
      ...currentState,
      sectionPlacements: getDefaultSectionPlacements(),
      activeGroups: { left: null, right: null },
      toolGroups: createDefaultToolGroups(),
    };
    zustandStore.setState(currentState);
    notifyListeners();
    void Promise.all([
      safePersist(
        persistenceService.setLayoutProperty(
          "sectionPlacements",
          currentState.sectionPlacements,
        ),
      ),
      safePersist(
        persistenceService.setLayoutProperty(
          "activeGroups",
          currentState.activeGroups,
        ),
      ),
      safePersist(
        persistenceService.setLayoutProperty(
          "toolGroups",
          currentState.toolGroups,
        ),
      ),
    ]);
  },

  getSectionsForSidebar: (sidebar) =>
    getAllSectionIds().filter(
      (sectionId) => currentState.sectionPlacements[sectionId] === sidebar,
    ),

  getActiveGroup: (sidebar) => currentState.activeGroups[sidebar],

  getToolGroupsForSidebar: (sidebar) => currentState.toolGroups[sidebar],

  reorderGroups: ({ sidebar, sourceGroupId, targetGroupId, insertBefore }) => {
    const state = currentState;

    logger.debug("ui", `Starting reorderGroups`, {
      sidebar,
      sourceGroupId,
      targetGroupId,
      insertBefore,
      availableGroups: Object.keys(state.toolGroups[sidebar]),
    });

    // Get group definitions for both source and target
    const sourceDefinition = getGroupDefinition(sourceGroupId);
    const targetDefinition = getGroupDefinition(targetGroupId);

    logger.debug("ui", `Group definitions found`, {
      sourceDefinition: sourceDefinition
        ? { id: sourceDefinition.id, order: sourceDefinition.order }
        : null,
      targetDefinition: targetDefinition
        ? { id: targetDefinition.id, order: targetDefinition.order }
        : null,
    });

    if (!sourceDefinition || !targetDefinition) {
      logger.warn("ui", `Missing group definitions, cannot reorder`, {
        sourceDefinition: !!sourceDefinition,
        targetDefinition: !!targetDefinition,
      });
      return;
    }

    // Get all groups for this sidebar and sort them by current order
    const allGroupIds = Object.keys(state.toolGroups[sidebar]);
    const allGroups = allGroupIds
      .map((id) => ({ id, definition: getGroupDefinition(id) }))
      .filter(
        (
          item,
        ): item is {
          id: string;
          definition: NonNullable<ReturnType<typeof getGroupDefinition>>;
        } => item.definition !== undefined,
      )
      .sort(
        (a, b) => (a.definition.order ?? 999) - (b.definition.order ?? 999),
      );

    // Create a new ordered list by removing source and inserting it at the target position
    const reorderedGroups = allGroups.filter(({ id }) => id !== sourceGroupId);
    const targetIndex = reorderedGroups.findIndex(
      ({ id }) => id === targetGroupId,
    );

    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
    reorderedGroups.splice(insertIndex, 0, {
      id: sourceGroupId,
      definition: sourceDefinition,
    });

    // Reassign orders starting from 1
    reorderedGroups.forEach(({ id, definition }, index) => {
      const newOrder = index + 1;
      logger.debug("ui", `Reassigning order for group ${id}`, {
        groupId: id,
        oldOrder: definition.order,
        newOrder,
      });

      registerGroupDefinition({
        ...definition,
        order: newOrder,
      });
    });

    logger.debug("ui", `Reorder complete`);
  },

  moveGroupToSidebar: ({
    sourceGroupId,
    targetSidebar,
    targetGroupId,
    insertBefore = false,
  }) => {
    logger.debug("ui", `Starting moveGroupToSidebar`, {
      sourceGroupId,
      targetSidebar,
      targetGroupId,
      insertBefore,
    });

    // Find the source group in both sidebars
    const leftGroups = currentState.toolGroups.left;
    const rightGroups = currentState.toolGroups.right;
    let sourceGroup: ToolGroup | null = null;
    let sourceSidebar: "left" | "right" | null = null;

    if (sourceGroupId in leftGroups) {
      sourceGroup = leftGroups[sourceGroupId] ?? null;
      sourceSidebar = "left";
    } else if (sourceGroupId in rightGroups) {
      sourceGroup = rightGroups[sourceGroupId] ?? null;
      sourceSidebar = "right";
    }

    if (!sourceGroup || !sourceSidebar) {
      logger.warn(
        "ui",
        `Source group ${sourceGroupId} not found in either sidebar`,
      );
      return;
    }

    if (sourceSidebar === targetSidebar) {
      logger.debug(
        "ui",
        `Group ${sourceGroupId} is already on ${targetSidebar} sidebar, using reorderGroups instead`,
      );
      if (targetGroupId) {
        actions.reorderGroups({
          sidebar: targetSidebar,
          sourceGroupId,
          targetGroupId,
          insertBefore,
        });
      }
      return;
    }

    logger.debug(
      "ui",
      `Moving group ${sourceGroupId} from ${sourceSidebar} to ${targetSidebar}`,
      {
        sourceGroup: { id: sourceGroup.id, sections: sourceGroup.sections },
      },
    );

    // Remove from source sidebar
    const newToolGroups = { ...currentState.toolGroups };

    // Remove from source sidebar
    if (sourceSidebar === "left") {
      const { [sourceGroupId]: _removed, ...remaining } = newToolGroups.left;
      newToolGroups.left = remaining;
    } else {
      const { [sourceGroupId]: _removed, ...remaining } = newToolGroups.right;
      newToolGroups.right = remaining;
    }

    // Add to target sidebar
    newToolGroups[targetSidebar] = {
      ...newToolGroups[targetSidebar],
      [sourceGroupId]: sourceGroup,
    };

    currentState = { ...currentState, toolGroups: newToolGroups };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "toolGroups",
        currentState.toolGroups,
      ),
    );

    // If a target position is specified, reorder within the target sidebar
    if (targetGroupId) {
      // Give a moment for the state to update, then reorder
      setTimeout(() => {
        actions.reorderGroups({
          sidebar: targetSidebar,
          sourceGroupId,
          targetGroupId,
          insertBefore,
        });
      }, 0);
    }

    // Set the moved group as active on the target sidebar
    actions.setActiveGroup({
      sidebar: targetSidebar,
      groupId: sourceGroupId,
    });

    // Open the target sidebar to show the moved group
    if (targetSidebar === "left") {
      actions.setLeftSidebarOpen(true);
    } else {
      actions.setRightSidebarOpen(true);
    }

    logger.debug("ui", `Move to ${targetSidebar} sidebar complete`);
  },

  setGraphProvider: (provider) => {
    currentState = { ...currentState, graphProvider: provider };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty("graphProvider", provider),
    );
  },

  setPreviewEntity: (entityId) => {
    if (currentState.previewEntityId !== entityId) {
      currentState = { ...currentState, previewEntityId: entityId };
      zustandStore.setState(currentState);
      notifyListeners();
    }
  },

  setAutoPinOnLayoutStabilization: (enabled) => {
    currentState = { ...currentState, autoPinOnLayoutStabilization: enabled };
    zustandStore.setState(currentState);
    notifyListeners();
    void safePersist(
      persistenceService.setLayoutProperty(
        "autoPinOnLayoutStabilization",
        enabled,
      ),
    );
  },
};

// Initialize on first access
if (typeof window !== "undefined") {
  void initializeState();
}

// Hook for Zustand-style usage
export const useLayoutStore = <T>(
  selector: (state: LayoutState & LayoutActions) => T,
): T => {
  // Initialize state if not done yet
  if (!initialized && typeof window !== "undefined") {
    void initializeState();
  }

  // Return state with actions for Zustand compatibility
  const stateWithActions = { ...currentState, ...actions };
  return selector(stateWithActions);
};

// Export Zustand-compatible store as layoutStore for backward compatibility
export const layoutStore = {
  getState: () => currentState,
  setState: (updater: LayoutState | ((state: LayoutState) => LayoutState)) => {
    if (typeof updater === "function") {
      currentState = updater(currentState);
    } else {
      currentState = { ...currentState, ...updater };
    }
    zustandStore.setState(currentState);
    notifyListeners();
  },
  subscribe: (listener: (state: LayoutState) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const layoutActions = actions;
