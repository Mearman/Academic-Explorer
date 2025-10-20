/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ProviderType } from "@academic-explorer/graph";

// Mock Dexie to prevent IndexedDB operations in tests
vi.mock("dexie", () => {
  const mockTable = {
    put: vi.fn().mockResolvedValue(undefined),
    toArray: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(undefined),
  };

  const DexieMock = vi.fn().mockImplementation(function (
    this: any,
    name?: string,
  ) {
    this.version = vi.fn().mockImplementation((version: number) => {
      const versionObj = {
        stores: vi.fn().mockImplementation((schema: any) => {
          // Set up the table properties based on the schema
          Object.keys(schema).forEach((tableName) => {
            this[tableName] = mockTable;
          });
          return this;
        }),
      };
      return versionObj;
    });
    return this;
  });

  return {
    default: DexieMock,
    Dexie: DexieMock,
    type: {
      Table: vi.fn(),
    },
  };
});

// Mock the section-registry and group-registry modules to avoid import resolution issues
vi.mock("./section-registry", () => ({
  getDefaultSectionPlacements: vi.fn(() => ({})),
  getAllSectionIds: vi.fn(() => []),
  getSectionById: vi.fn(() => ({})),
}));

vi.mock("./group-registry", () => ({
  updateGroupDefinition: vi.fn(),
  getGroupDefinition: vi.fn(() => ({})),
  registerGroupDefinition: vi.fn(),
}));

import { useLayoutStore, layoutStore, layoutActions } from "./layout-store";

// Mock localStorage for Zustand persistence
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      store[key] = undefined as any;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Layout Store", () => {
  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset store to initial state
    layoutStore.setState({
      leftSidebarOpen: true,
      leftSidebarPinned: false,
      rightSidebarOpen: true,
      rightSidebarPinned: false,
      graphProvider: "xyflow",
      previewEntityId: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct default values", () => {
      const state = layoutStore.getState();

      expect(state.leftSidebarOpen).toBe(true);
      expect(state.leftSidebarPinned).toBe(false);
      expect(state.rightSidebarOpen).toBe(true);
      expect(state.rightSidebarPinned).toBe(false);
      expect(state.graphProvider).toBe("xyflow");
      expect(state.previewEntityId).toBeNull();
    });

    it("should have all required action methods available through layoutActions", () => {
      expect(typeof layoutActions.toggleLeftSidebar).toBe("function");
      expect(typeof layoutActions.toggleRightSidebar).toBe("function");
      expect(typeof layoutActions.setLeftSidebarOpen).toBe("function");
      expect(typeof layoutActions.setRightSidebarOpen).toBe("function");
      expect(typeof layoutActions.pinLeftSidebar).toBe("function");
      expect(typeof layoutActions.pinRightSidebar).toBe("function");
      expect(typeof layoutActions.setGraphProvider).toBe("function");
      expect(typeof layoutActions.setPreviewEntity).toBe("function");
    });
  });

  describe("Left Sidebar Actions", () => {
    it("should toggle left sidebar open state", () => {
      const { toggleLeftSidebar } = layoutActions;

      // Initially true, should become false
      toggleLeftSidebar();
      expect(layoutStore.getState().leftSidebarOpen).toBe(false);

      // Should toggle back to true
      toggleLeftSidebar();
      expect(layoutStore.getState().leftSidebarOpen).toBe(true);
    });

    it("should set left sidebar open state directly", () => {
      const { setLeftSidebarOpen } = layoutActions;

      setLeftSidebarOpen(false);
      expect(layoutStore.getState().leftSidebarOpen).toBe(false);

      setLeftSidebarOpen(true);
      expect(layoutStore.getState().leftSidebarOpen).toBe(true);
    });

    it("should set left sidebar pinned state", () => {
      const { pinLeftSidebar } = layoutActions;

      pinLeftSidebar(true);
      expect(layoutStore.getState().leftSidebarPinned).toBe(true);

      pinLeftSidebar(false);
      expect(layoutStore.getState().leftSidebarPinned).toBe(false);
    });

    it("should maintain other state when updating left sidebar", () => {
      const { toggleLeftSidebar, pinLeftSidebar } = layoutActions;
      const initialState = layoutStore.getState();

      toggleLeftSidebar();
      pinLeftSidebar(true);

      const newState = layoutStore.getState();

      // Left sidebar state should change
      expect(newState.leftSidebarOpen).toBe(false);
      expect(newState.leftSidebarPinned).toBe(true);

      // Other state should remain unchanged
      expect(newState.rightSidebarOpen).toBe(initialState.rightSidebarOpen);
      expect(newState.rightSidebarPinned).toBe(initialState.rightSidebarPinned);
      expect(newState.graphProvider).toBe(initialState.graphProvider);
      expect(newState.previewEntityId).toBe(initialState.previewEntityId);
    });
  });

  describe("Right Sidebar Actions", () => {
    it("should toggle right sidebar open state", () => {
      const { toggleRightSidebar } = layoutActions;

      // Initially true, should become false
      toggleRightSidebar();
      expect(layoutStore.getState().rightSidebarOpen).toBe(false);

      // Should toggle back to true
      toggleRightSidebar();
      expect(layoutStore.getState().rightSidebarOpen).toBe(true);
    });

    it("should set right sidebar open state directly", () => {
      const { setRightSidebarOpen } = layoutActions;

      setRightSidebarOpen(false);
      expect(layoutStore.getState().rightSidebarOpen).toBe(false);

      setRightSidebarOpen(true);
      expect(layoutStore.getState().rightSidebarOpen).toBe(true);
    });

    it("should set right sidebar pinned state", () => {
      const { pinRightSidebar } = layoutActions;

      pinRightSidebar(true);
      expect(layoutStore.getState().rightSidebarPinned).toBe(true);

      pinRightSidebar(false);
      expect(layoutStore.getState().rightSidebarPinned).toBe(false);
    });

    it("should maintain other state when updating right sidebar", () => {
      const { toggleRightSidebar, pinRightSidebar } = layoutActions;
      const initialState = layoutStore.getState();

      toggleRightSidebar();
      pinRightSidebar(true);

      const newState = layoutStore.getState();

      // Right sidebar state should change
      expect(newState.rightSidebarOpen).toBe(false);
      expect(newState.rightSidebarPinned).toBe(true);

      // Other state should remain unchanged
      expect(newState.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
      expect(newState.leftSidebarPinned).toBe(initialState.leftSidebarPinned);
      expect(newState.graphProvider).toBe(initialState.graphProvider);
      expect(newState.previewEntityId).toBe(initialState.previewEntityId);
    });
  });

  describe("Graph Provider Actions", () => {
    it("should set graph provider to xyflow", () => {
      const { setGraphProvider } = layoutActions;

      setGraphProvider("xyflow");
      expect(layoutStore.getState().graphProvider).toBe("xyflow");
    });

    it("should set graph provider to cytoscape", () => {
      const { setGraphProvider } = layoutActions;

      setGraphProvider("cytoscape");
      expect(layoutStore.getState().graphProvider).toBe("cytoscape");
    });

    it("should maintain other state when updating graph provider", () => {
      const { setGraphProvider } = layoutActions;
      const initialState = layoutStore.getState();

      setGraphProvider("cytoscape");

      const newState = layoutStore.getState();

      // Graph provider should change
      expect(newState.graphProvider).toBe("cytoscape");

      // Other state should remain unchanged
      expect(newState.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
      expect(newState.leftSidebarPinned).toBe(initialState.leftSidebarPinned);
      expect(newState.rightSidebarOpen).toBe(initialState.rightSidebarOpen);
      expect(newState.rightSidebarPinned).toBe(initialState.rightSidebarPinned);
      expect(newState.previewEntityId).toBe(initialState.previewEntityId);
    });
  });

  describe("Preview Entity Actions", () => {
    it("should set preview entity ID", () => {
      const { setPreviewEntity } = layoutActions;

      setPreviewEntity("W123456789");
      expect(layoutStore.getState().previewEntityId).toBe("W123456789");
    });

    it("should clear preview entity ID", () => {
      const { setPreviewEntity } = layoutActions;

      // Set an entity first
      setPreviewEntity("W123456789");
      expect(layoutStore.getState().previewEntityId).toBe("W123456789");

      // Clear it
      setPreviewEntity(null);
      expect(layoutStore.getState().previewEntityId).toBeNull();
    });

    it("should handle multiple preview entity changes", () => {
      const { setPreviewEntity } = layoutActions;

      const entityIds = [
        "W123456789",
        "A987654321",
        "S555666777",
        null,
        "I111222333",
      ];

      for (const entityId of entityIds) {
        setPreviewEntity(entityId);
        expect(layoutStore.getState().previewEntityId).toBe(entityId);
      }
    });

    it("should maintain other state when updating preview entity", () => {
      const { setPreviewEntity } = layoutActions;
      const initialState = layoutStore.getState();

      setPreviewEntity("W123456789");

      const newState = layoutStore.getState();

      // Preview entity should change
      expect(newState.previewEntityId).toBe("W123456789");

      // Other state should remain unchanged
      expect(newState.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
      expect(newState.leftSidebarPinned).toBe(initialState.leftSidebarPinned);
      expect(newState.rightSidebarOpen).toBe(initialState.rightSidebarOpen);
      expect(newState.rightSidebarPinned).toBe(initialState.rightSidebarPinned);
      expect(newState.graphProvider).toBe(initialState.graphProvider);
    });
  });

  describe("Complex State Updates", () => {
    it("should handle multiple simultaneous updates", () => {
      // Update multiple properties
      layoutActions.setLeftSidebarOpen(false);
      layoutActions.pinLeftSidebar(true);
      layoutActions.setRightSidebarOpen(false);
      layoutActions.pinRightSidebar(true);
      layoutActions.setGraphProvider("cytoscape");
      layoutActions.setPreviewEntity("W123456789");

      const finalState = layoutStore.getState();

      expect(finalState.leftSidebarOpen).toBe(false);
      expect(finalState.leftSidebarPinned).toBe(true);
      expect(finalState.rightSidebarOpen).toBe(false);
      expect(finalState.rightSidebarPinned).toBe(true);
      expect(finalState.graphProvider).toBe("cytoscape");
      expect(finalState.previewEntityId).toBe("W123456789");
    });

    it("should handle rapid state changes", () => {
      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        layoutActions.toggleLeftSidebar();
        layoutActions.toggleRightSidebar();
      }

      const finalState = layoutStore.getState();

      // After 10 toggles, both should be back to their original state
      expect(finalState.leftSidebarOpen).toBe(true);
      expect(finalState.rightSidebarOpen).toBe(true);
    });

    it("should handle all provider types", () => {
      const { setGraphProvider } = layoutActions;
      const providers: ProviderType[] = ["xyflow", "cytoscape"];

      for (const provider of providers) {
        setGraphProvider(provider);
        expect(layoutStore.getState().graphProvider).toBe(provider);
      }
    });
  });

  describe("Persistence Behavior", () => {
    it("should work with localStorage persistence (mock test)", () => {
      // Test that persistence functions are available and state changes work
      layoutActions.pinLeftSidebar(true);
      expect(layoutStore.getState().leftSidebarPinned).toBe(true);

      layoutActions.pinRightSidebar(true);
      expect(layoutStore.getState().rightSidebarPinned).toBe(true);

      layoutActions.setGraphProvider("cytoscape");
      expect(layoutStore.getState().graphProvider).toBe("cytoscape");

      // Verify localStorage mock methods exist (testing infrastructure)
      expect(localStorageMock.setItem).toBeDefined();
      expect(localStorageMock.getItem).toBeDefined();
    });

    it("should update non-persisted state correctly", () => {
      // These should update state but are not persisted according to partialize config
      layoutActions.setLeftSidebarOpen(false);
      layoutActions.setRightSidebarOpen(false);
      layoutActions.setPreviewEntity("W123456789");

      // Verify state changes work
      const state = layoutStore.getState();
      expect(state.leftSidebarOpen).toBe(false);
      expect(state.rightSidebarOpen).toBe(false);
      expect(state.previewEntityId).toBe("W123456789");
    });

    it("should handle persistence configuration properly", () => {
      // Update persisted state according to partialize config
      layoutActions.pinLeftSidebar(true);
      layoutActions.pinRightSidebar(true);
      layoutActions.setGraphProvider("cytoscape");

      // Verify state changes work
      const state = layoutStore.getState();
      expect(state.leftSidebarPinned).toBe(true);
      expect(state.rightSidebarPinned).toBe(true);
      expect(state.graphProvider).toBe("cytoscape");
    });
  });

  describe("Type Safety", () => {
    it("should maintain correct TypeScript types for all state properties", () => {
      const state = layoutStore.getState();

      // Boolean properties
      expect(typeof state.leftSidebarOpen).toBe("boolean");
      expect(typeof state.leftSidebarPinned).toBe("boolean");
      expect(typeof state.rightSidebarOpen).toBe("boolean");
      expect(typeof state.rightSidebarPinned).toBe("boolean");

      // String properties
      expect(typeof state.graphProvider).toBe("string");
      expect(["xyflow", "cytoscape"]).toContain(state.graphProvider);

      // Nullable properties
      expect(
        state.previewEntityId === null ||
          typeof state.previewEntityId === "string",
      ).toBe(true);
    });

    it("should maintain correct TypeScript types for all action functions", () => {
      expect(typeof layoutActions.toggleLeftSidebar).toBe("function");
      expect(typeof layoutActions.toggleRightSidebar).toBe("function");
      expect(typeof layoutActions.setLeftSidebarOpen).toBe("function");
      expect(typeof layoutActions.setRightSidebarOpen).toBe("function");
      expect(typeof layoutActions.pinLeftSidebar).toBe("function");
      expect(typeof layoutActions.pinRightSidebar).toBe("function");
      expect(typeof layoutActions.setGraphProvider).toBe("function");
      expect(typeof layoutActions.setPreviewEntity).toBe("function");
    });
  });

  describe("Edge Cases", () => {
    it("should handle setting the same state value multiple times", () => {
      const { setLeftSidebarOpen, pinLeftSidebar } = layoutActions;

      setLeftSidebarOpen(true);
      setLeftSidebarOpen(true);
      setLeftSidebarOpen(true);

      expect(layoutStore.getState().leftSidebarOpen).toBe(true);

      pinLeftSidebar(false);
      pinLeftSidebar(false);
      pinLeftSidebar(false);

      expect(layoutStore.getState().leftSidebarPinned).toBe(false);
    });

    it("should handle setting preview entity to the same value multiple times", () => {
      const { setPreviewEntity } = layoutActions;

      setPreviewEntity("W123456789");
      setPreviewEntity("W123456789");
      setPreviewEntity("W123456789");

      expect(layoutStore.getState().previewEntityId).toBe("W123456789");

      setPreviewEntity(null);
      setPreviewEntity(null);
      setPreviewEntity(null);

      expect(layoutStore.getState().previewEntityId).toBeNull();
    });

    it("should handle setting graph provider to the same value multiple times", () => {
      const { setGraphProvider } = layoutActions;

      setGraphProvider("cytoscape");
      setGraphProvider("cytoscape");
      setGraphProvider("cytoscape");

      expect(layoutStore.getState().graphProvider).toBe("cytoscape");
    });
  });

  describe("Store Integration", () => {
    it("should allow subscribing to state changes", () => {
      const mockCallback = vi.fn();
      const unsubscribe = layoutStore.subscribe(mockCallback);

      const { toggleLeftSidebar } = layoutActions;
      toggleLeftSidebar();

      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
    });

    it("should allow manual state updates via setState", () => {
      layoutStore.setState({
        leftSidebarOpen: false,
        rightSidebarOpen: false,
        graphProvider: "cytoscape",
        previewEntityId: "W123456789",
      });

      const state = layoutStore.getState();

      expect(state.leftSidebarOpen).toBe(false);
      expect(state.rightSidebarOpen).toBe(false);
      expect(state.graphProvider).toBe("cytoscape");
      expect(state.previewEntityId).toBe("W123456789");
    });

    it("should maintain consistent state across multiple getState calls", () => {
      const { setPreviewEntity, setGraphProvider } = layoutActions;

      setPreviewEntity("W123456789");
      setGraphProvider("cytoscape");

      const state1 = layoutStore.getState();
      const state2 = layoutStore.getState();

      expect(state1.previewEntityId).toBe(state2.previewEntityId);
      expect(state1.graphProvider).toBe(state2.graphProvider);
      expect(state1.leftSidebarOpen).toBe(state2.leftSidebarOpen);
    });
  });
});
