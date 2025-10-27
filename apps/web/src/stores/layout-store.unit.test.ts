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
    this: Record<string, unknown>,
    _name?: string,
  ) {
    this.version = vi.fn().mockImplementation((_version: number) => {
      return {
        stores: vi.fn().mockImplementation((schema: Record<string, unknown>) => {
          // Set up the table properties based on the schema
          Object.keys(schema).forEach((tableName) => {
            this[tableName] = mockTable;
          });
          return this;
        }),
      };
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

import { useLayoutStore, useLayoutActions } from "./layout-store";

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

    // Reset store to initial state by setting defaults
    const actions = useLayoutActions();
    actions.setLeftSidebarOpen(true);
    actions.pinLeftSidebar(false);
    actions.setRightSidebarOpen(true);
    actions.pinRightSidebar(false);
    actions.setGraphProvider("xyflow");
    actions.setPreviewEntity(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct default values", () => {
      const state = useLayoutStore();

      expect(state.leftSidebarOpen).toBe(true);
      expect(state.leftSidebarPinned).toBe(false);
      expect(state.rightSidebarOpen).toBe(true);
      expect(state.rightSidebarPinned).toBe(false);
      expect(state.graphProvider).toBe("xyflow");
      expect(state.previewEntityId).toBeNull();
    });

    it("should have all required action methods available through useLayoutActions()", () => {
      expect(typeof useLayoutActions().toggleLeftSidebar).toBe("function");
      expect(typeof useLayoutActions().toggleRightSidebar).toBe("function");
      expect(typeof useLayoutActions().setLeftSidebarOpen).toBe("function");
      expect(typeof useLayoutActions().setRightSidebarOpen).toBe("function");
      expect(typeof useLayoutActions().pinLeftSidebar).toBe("function");
      expect(typeof useLayoutActions().pinRightSidebar).toBe("function");
      expect(typeof useLayoutActions().setGraphProvider).toBe("function");
      expect(typeof useLayoutActions().setPreviewEntity).toBe("function");
    });
  });

  describe("Left Sidebar Actions", () => {
    it("should toggle left sidebar open state", () => {
      const { toggleLeftSidebar } = useLayoutActions();

      // Initially true, should become false
      toggleLeftSidebar();
      expect(useLayoutStore().leftSidebarOpen).toBe(false);

      // Should toggle back to true
      toggleLeftSidebar();
      expect(useLayoutStore().leftSidebarOpen).toBe(true);
    });

    it("should set left sidebar open state directly", () => {
      const { setLeftSidebarOpen } = useLayoutActions();

      setLeftSidebarOpen(false);
      expect(useLayoutStore().leftSidebarOpen).toBe(false);

      setLeftSidebarOpen(true);
      expect(useLayoutStore().leftSidebarOpen).toBe(true);
    });

    it("should set left sidebar pinned state", () => {
      const { pinLeftSidebar } = useLayoutActions();

      pinLeftSidebar(true);
      expect(useLayoutStore().leftSidebarPinned).toBe(true);

      pinLeftSidebar(false);
      expect(useLayoutStore().leftSidebarPinned).toBe(false);
    });

    it("should maintain other state when updating left sidebar", () => {
      const { toggleLeftSidebar, pinLeftSidebar } = useLayoutActions();
      const initialState = useLayoutStore();

      toggleLeftSidebar();
      pinLeftSidebar(true);

      const newState = useLayoutStore();

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
      const { toggleRightSidebar } = useLayoutActions();

      // Initially true, should become false
      toggleRightSidebar();
      expect(useLayoutStore().rightSidebarOpen).toBe(false);

      // Should toggle back to true
      toggleRightSidebar();
      expect(useLayoutStore().rightSidebarOpen).toBe(true);
    });

    it("should set right sidebar open state directly", () => {
      const { setRightSidebarOpen } = useLayoutActions();

      setRightSidebarOpen(false);
      expect(useLayoutStore().rightSidebarOpen).toBe(false);

      setRightSidebarOpen(true);
      expect(useLayoutStore().rightSidebarOpen).toBe(true);
    });

    it("should set right sidebar pinned state", () => {
      const { pinRightSidebar } = useLayoutActions();

      pinRightSidebar(true);
      expect(useLayoutStore().rightSidebarPinned).toBe(true);

      pinRightSidebar(false);
      expect(useLayoutStore().rightSidebarPinned).toBe(false);
    });

    it("should maintain other state when updating right sidebar", () => {
      const { toggleRightSidebar, pinRightSidebar } = useLayoutActions();
      const initialState = useLayoutStore();

      toggleRightSidebar();
      pinRightSidebar(true);

      const newState = useLayoutStore();

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
      const { setGraphProvider } = useLayoutActions();

      setGraphProvider("xyflow");
      expect(useLayoutStore().graphProvider).toBe("xyflow");
    });

    it("should set graph provider to cytoscape", () => {
      const { setGraphProvider } = useLayoutActions();

      setGraphProvider("cytoscape");
      expect(useLayoutStore().graphProvider).toBe("cytoscape");
    });

    it("should maintain other state when updating graph provider", () => {
      const { setGraphProvider } = useLayoutActions();
      const initialState = useLayoutStore();

      setGraphProvider("cytoscape");

      const newState = useLayoutStore();

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
      const { setPreviewEntity } = useLayoutActions();

      setPreviewEntity("W123456789");
      expect(useLayoutStore().previewEntityId).toBe("W123456789");
    });

    it("should clear preview entity ID", () => {
      const { setPreviewEntity } = useLayoutActions();

      // Set an entity first
      setPreviewEntity("W123456789");
      expect(useLayoutStore().previewEntityId).toBe("W123456789");

      // Clear it
      setPreviewEntity(null);
      expect(useLayoutStore().previewEntityId).toBeNull();
    });

    it("should handle multiple preview entity changes", () => {
      const { setPreviewEntity } = useLayoutActions();

      const entityIds = [
        "W123456789",
        "A987654321",
        "S555666777",
        null,
        "I111222333",
      ];

      for (const entityId of entityIds) {
        setPreviewEntity(entityId);
        expect(useLayoutStore().previewEntityId).toBe(entityId);
      }
    });

    it("should maintain other state when updating preview entity", () => {
      const { setPreviewEntity } = useLayoutActions();
      const initialState = useLayoutStore();

      setPreviewEntity("W123456789");

      const newState = useLayoutStore();

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
      useLayoutActions().setLeftSidebarOpen(false);
      useLayoutActions().pinLeftSidebar(true);
      useLayoutActions().setRightSidebarOpen(false);
      useLayoutActions().pinRightSidebar(true);
      useLayoutActions().setGraphProvider("cytoscape");
      useLayoutActions().setPreviewEntity("W123456789");

      const finalState = useLayoutStore();

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
        useLayoutActions().toggleLeftSidebar();
        useLayoutActions().toggleRightSidebar();
      }

      const finalState = useLayoutStore();

      // After 10 toggles, both should be back to their original state
      expect(finalState.leftSidebarOpen).toBe(true);
      expect(finalState.rightSidebarOpen).toBe(true);
    });

    it("should handle all provider types", () => {
      const { setGraphProvider } = useLayoutActions();
      const providers: ProviderType[] = ["xyflow", "cytoscape"];

      for (const provider of providers) {
        setGraphProvider(provider);
        expect(useLayoutStore().graphProvider).toBe(provider);
      }
    });
  });

  describe("Persistence Behavior", () => {
    it("should work with localStorage persistence (mock test)", () => {
      // Test that persistence functions are available and state changes work
      useLayoutActions().pinLeftSidebar(true);
      expect(useLayoutStore().leftSidebarPinned).toBe(true);

      useLayoutActions().pinRightSidebar(true);
      expect(useLayoutStore().rightSidebarPinned).toBe(true);

      useLayoutActions().setGraphProvider("cytoscape");
      expect(useLayoutStore().graphProvider).toBe("cytoscape");

      // Verify localStorage mock methods exist (testing infrastructure)
      expect(localStorageMock.setItem).toBeDefined();
      expect(localStorageMock.getItem).toBeDefined();
    });

    it("should update non-persisted state correctly", () => {
      // These should update state but are not persisted according to partialize config
      useLayoutActions().setLeftSidebarOpen(false);
      useLayoutActions().setRightSidebarOpen(false);
      useLayoutActions().setPreviewEntity("W123456789");

      // Verify state changes work
      const state = useLayoutStore();
      expect(state.leftSidebarOpen).toBe(false);
      expect(state.rightSidebarOpen).toBe(false);
      expect(state.previewEntityId).toBe("W123456789");
    });

    it("should handle persistence configuration properly", () => {
      // Update persisted state according to partialize config
      useLayoutActions().pinLeftSidebar(true);
      useLayoutActions().pinRightSidebar(true);
      useLayoutActions().setGraphProvider("cytoscape");

      // Verify state changes work
      const state = useLayoutStore();
      expect(state.leftSidebarPinned).toBe(true);
      expect(state.rightSidebarPinned).toBe(true);
      expect(state.graphProvider).toBe("cytoscape");
    });
  });

  describe("Type Safety", () => {
    it("should maintain correct TypeScript types for all state properties", () => {
      const state = useLayoutStore();

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
      expect(typeof useLayoutActions().toggleLeftSidebar).toBe("function");
      expect(typeof useLayoutActions().toggleRightSidebar).toBe("function");
      expect(typeof useLayoutActions().setLeftSidebarOpen).toBe("function");
      expect(typeof useLayoutActions().setRightSidebarOpen).toBe("function");
      expect(typeof useLayoutActions().pinLeftSidebar).toBe("function");
      expect(typeof useLayoutActions().pinRightSidebar).toBe("function");
      expect(typeof useLayoutActions().setGraphProvider).toBe("function");
      expect(typeof useLayoutActions().setPreviewEntity).toBe("function");
    });
  });

  describe("Edge Cases", () => {
    it("should handle setting the same state value multiple times", () => {
      const { setLeftSidebarOpen, pinLeftSidebar } = useLayoutActions();

      setLeftSidebarOpen(true);
      setLeftSidebarOpen(true);
      setLeftSidebarOpen(true);

      expect(useLayoutStore().leftSidebarOpen).toBe(true);

      pinLeftSidebar(false);
      pinLeftSidebar(false);
      pinLeftSidebar(false);

      expect(useLayoutStore().leftSidebarPinned).toBe(false);
    });

    it("should handle setting preview entity to the same value multiple times", () => {
      const { setPreviewEntity } = useLayoutActions();

      setPreviewEntity("W123456789");
      setPreviewEntity("W123456789");
      setPreviewEntity("W123456789");

      expect(useLayoutStore().previewEntityId).toBe("W123456789");

      setPreviewEntity(null);
      setPreviewEntity(null);
      setPreviewEntity(null);

      expect(useLayoutStore().previewEntityId).toBeNull();
    });

    it("should handle setting graph provider to the same value multiple times", () => {
      const { setGraphProvider } = useLayoutActions();

      setGraphProvider("cytoscape");
      setGraphProvider("cytoscape");
      setGraphProvider("cytoscape");

      expect(useLayoutStore().graphProvider).toBe("cytoscape");
    });
  });

  describe("Store Integration", () => {
    it("should maintain consistent state across multiple calls", () => {
      const { setPreviewEntity, setGraphProvider } = useLayoutActions();

      setPreviewEntity("W123456789");
      setGraphProvider("cytoscape");

      const store1 = useLayoutStore();
      const store2 = useLayoutStore();

      expect(store1.previewEntityId).toBe(store2.previewEntityId);
      expect(store1.graphProvider).toBe(store2.graphProvider);
      expect(store1.leftSidebarOpen).toBe(store2.leftSidebarOpen);
    });
  });
});
