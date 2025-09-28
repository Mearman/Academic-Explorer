/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ProviderType } from "@academic-explorer/graph";

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

import { useLayoutStore } from "./layout-store";

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
		useLayoutStore.setState({
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
			const state = useLayoutStore.getState();

			expect(state.leftSidebarOpen).toBe(true);
			expect(state.leftSidebarPinned).toBe(false);
			expect(state.rightSidebarOpen).toBe(true);
			expect(state.rightSidebarPinned).toBe(false);
			expect(state.graphProvider).toBe("xyflow");
			expect(state.previewEntityId).toBeNull();
		});

		it("should have all required action methods", () => {
			const state = useLayoutStore.getState();

			expect(typeof state.toggleLeftSidebar).toBe("function");
			expect(typeof state.toggleRightSidebar).toBe("function");
			expect(typeof state.setLeftSidebarOpen).toBe("function");
			expect(typeof state.setRightSidebarOpen).toBe("function");
			expect(typeof state.pinLeftSidebar).toBe("function");
			expect(typeof state.pinRightSidebar).toBe("function");
			expect(typeof state.setGraphProvider).toBe("function");
			expect(typeof state.setPreviewEntity).toBe("function");
		});
	});

	describe("Left Sidebar Actions", () => {
		it("should toggle left sidebar open state", () => {
			const { toggleLeftSidebar } = useLayoutStore.getState();

			// Initially true, should become false
			toggleLeftSidebar();
			expect(useLayoutStore.getState().leftSidebarOpen).toBe(false);

			// Should toggle back to true
			toggleLeftSidebar();
			expect(useLayoutStore.getState().leftSidebarOpen).toBe(true);
		});

		it("should set left sidebar open state directly", () => {
			const { setLeftSidebarOpen } = useLayoutStore.getState();

			setLeftSidebarOpen(false);
			expect(useLayoutStore.getState().leftSidebarOpen).toBe(false);

			setLeftSidebarOpen(true);
			expect(useLayoutStore.getState().leftSidebarOpen).toBe(true);
		});

		it("should set left sidebar pinned state", () => {
			const { pinLeftSidebar } = useLayoutStore.getState();

			pinLeftSidebar(true);
			expect(useLayoutStore.getState().leftSidebarPinned).toBe(true);

			pinLeftSidebar(false);
			expect(useLayoutStore.getState().leftSidebarPinned).toBe(false);
		});

		it("should maintain other state when updating left sidebar", () => {
			const { toggleLeftSidebar, pinLeftSidebar } = useLayoutStore.getState();
			const initialState = useLayoutStore.getState();

			toggleLeftSidebar();
			pinLeftSidebar(true);

			const newState = useLayoutStore.getState();

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
			const { toggleRightSidebar } = useLayoutStore.getState();

			// Initially true, should become false
			toggleRightSidebar();
			expect(useLayoutStore.getState().rightSidebarOpen).toBe(false);

			// Should toggle back to true
			toggleRightSidebar();
			expect(useLayoutStore.getState().rightSidebarOpen).toBe(true);
		});

		it("should set right sidebar open state directly", () => {
			const { setRightSidebarOpen } = useLayoutStore.getState();

			setRightSidebarOpen(false);
			expect(useLayoutStore.getState().rightSidebarOpen).toBe(false);

			setRightSidebarOpen(true);
			expect(useLayoutStore.getState().rightSidebarOpen).toBe(true);
		});

		it("should set right sidebar pinned state", () => {
			const { pinRightSidebar } = useLayoutStore.getState();

			pinRightSidebar(true);
			expect(useLayoutStore.getState().rightSidebarPinned).toBe(true);

			pinRightSidebar(false);
			expect(useLayoutStore.getState().rightSidebarPinned).toBe(false);
		});

		it("should maintain other state when updating right sidebar", () => {
			const { toggleRightSidebar, pinRightSidebar } = useLayoutStore.getState();
			const initialState = useLayoutStore.getState();

			toggleRightSidebar();
			pinRightSidebar(true);

			const newState = useLayoutStore.getState();

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
			const { setGraphProvider } = useLayoutStore.getState();

			setGraphProvider("xyflow");
			expect(useLayoutStore.getState().graphProvider).toBe("xyflow");
		});

		it("should set graph provider to cytoscape", () => {
			const { setGraphProvider } = useLayoutStore.getState();

			setGraphProvider("cytoscape");
			expect(useLayoutStore.getState().graphProvider).toBe("cytoscape");
		});

		it("should maintain other state when updating graph provider", () => {
			const { setGraphProvider } = useLayoutStore.getState();
			const initialState = useLayoutStore.getState();

			setGraphProvider("cytoscape");

			const newState = useLayoutStore.getState();

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
			const { setPreviewEntity } = useLayoutStore.getState();

			setPreviewEntity("W123456789");
			expect(useLayoutStore.getState().previewEntityId).toBe("W123456789");
		});

		it("should clear preview entity ID", () => {
			const { setPreviewEntity } = useLayoutStore.getState();

			// Set an entity first
			setPreviewEntity("W123456789");
			expect(useLayoutStore.getState().previewEntityId).toBe("W123456789");

			// Clear it
			setPreviewEntity(null);
			expect(useLayoutStore.getState().previewEntityId).toBeNull();
		});

		it("should handle multiple preview entity changes", () => {
			const { setPreviewEntity } = useLayoutStore.getState();

			const entityIds = ["W123456789", "A987654321", "S555666777", null, "I111222333"];

			for (const entityId of entityIds) {
				setPreviewEntity(entityId);
				expect(useLayoutStore.getState().previewEntityId).toBe(entityId);
			}
		});

		it("should maintain other state when updating preview entity", () => {
			const { setPreviewEntity } = useLayoutStore.getState();
			const initialState = useLayoutStore.getState();

			setPreviewEntity("W123456789");

			const newState = useLayoutStore.getState();

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
			const store = useLayoutStore.getState();

			// Update multiple properties
			store.setLeftSidebarOpen(false);
			store.pinLeftSidebar(true);
			store.setRightSidebarOpen(false);
			store.pinRightSidebar(true);
			store.setGraphProvider("cytoscape");
			store.setPreviewEntity("W123456789");

			const finalState = useLayoutStore.getState();

			expect(finalState.leftSidebarOpen).toBe(false);
			expect(finalState.leftSidebarPinned).toBe(true);
			expect(finalState.rightSidebarOpen).toBe(false);
			expect(finalState.rightSidebarPinned).toBe(true);
			expect(finalState.graphProvider).toBe("cytoscape");
			expect(finalState.previewEntityId).toBe("W123456789");
		});

		it("should handle rapid state changes", () => {
			const { toggleLeftSidebar, toggleRightSidebar } = useLayoutStore.getState();

			// Rapid toggles
			for (let i = 0; i < 10; i++) {
				toggleLeftSidebar();
				toggleRightSidebar();
			}

			const finalState = useLayoutStore.getState();

			// After 10 toggles, both should be back to their original state
			expect(finalState.leftSidebarOpen).toBe(true);
			expect(finalState.rightSidebarOpen).toBe(true);
		});

		it("should handle all provider types", () => {
			const { setGraphProvider } = useLayoutStore.getState();
			const providers: ProviderType[] = ["xyflow", "cytoscape"];

			for (const provider of providers) {
				setGraphProvider(provider);
				expect(useLayoutStore.getState().graphProvider).toBe(provider);
			}
		});
	});

	describe("Persistence Behavior", () => {
		it("should work with localStorage persistence (mock test)", () => {
			const { pinLeftSidebar, pinRightSidebar, setGraphProvider } = useLayoutStore.getState();

			// Test that persistence functions are available and state changes work
			pinLeftSidebar(true);
			expect(useLayoutStore.getState().leftSidebarPinned).toBe(true);

			pinRightSidebar(true);
			expect(useLayoutStore.getState().rightSidebarPinned).toBe(true);

			setGraphProvider("cytoscape");
			expect(useLayoutStore.getState().graphProvider).toBe("cytoscape");

			// Verify localStorage mock methods exist (testing infrastructure)
			expect(localStorageMock.setItem).toBeDefined();
			expect(localStorageMock.getItem).toBeDefined();
		});

		it("should update non-persisted state correctly", () => {
			const { setLeftSidebarOpen, setRightSidebarOpen, setPreviewEntity } = useLayoutStore.getState();

			// These should update state but are not persisted according to partialize config
			setLeftSidebarOpen(false);
			setRightSidebarOpen(false);
			setPreviewEntity("W123456789");

			// Verify state changes work
			const state = useLayoutStore.getState();
			expect(state.leftSidebarOpen).toBe(false);
			expect(state.rightSidebarOpen).toBe(false);
			expect(state.previewEntityId).toBe("W123456789");
		});

		it("should handle persistence configuration properly", () => {
			const { pinLeftSidebar, pinRightSidebar, setGraphProvider } = useLayoutStore.getState();

			// Update persisted state according to partialize config
			pinLeftSidebar(true);
			pinRightSidebar(true);
			setGraphProvider("cytoscape");

			// Verify state changes work
			const state = useLayoutStore.getState();
			expect(state.leftSidebarPinned).toBe(true);
			expect(state.rightSidebarPinned).toBe(true);
			expect(state.graphProvider).toBe("cytoscape");
		});
	});

	describe("Type Safety", () => {
		it("should maintain correct TypeScript types for all state properties", () => {
			const state = useLayoutStore.getState();

			// Boolean properties
			expect(typeof state.leftSidebarOpen).toBe("boolean");
			expect(typeof state.leftSidebarPinned).toBe("boolean");
			expect(typeof state.rightSidebarOpen).toBe("boolean");
			expect(typeof state.rightSidebarPinned).toBe("boolean");

			// String properties
			expect(typeof state.graphProvider).toBe("string");
			expect(["xyflow", "cytoscape"]).toContain(state.graphProvider);

			// Nullable properties
			expect(state.previewEntityId === null || typeof state.previewEntityId === "string").toBe(true);
		});

		it("should maintain correct TypeScript types for all action functions", () => {
			const state = useLayoutStore.getState();

			expect(typeof state.toggleLeftSidebar).toBe("function");
			expect(typeof state.toggleRightSidebar).toBe("function");
			expect(typeof state.setLeftSidebarOpen).toBe("function");
			expect(typeof state.setRightSidebarOpen).toBe("function");
			expect(typeof state.pinLeftSidebar).toBe("function");
			expect(typeof state.pinRightSidebar).toBe("function");
			expect(typeof state.setGraphProvider).toBe("function");
			expect(typeof state.setPreviewEntity).toBe("function");
		});
	});

	describe("Edge Cases", () => {
		it("should handle setting the same state value multiple times", () => {
			const { setLeftSidebarOpen, pinLeftSidebar } = useLayoutStore.getState();

			setLeftSidebarOpen(true);
			setLeftSidebarOpen(true);
			setLeftSidebarOpen(true);

			expect(useLayoutStore.getState().leftSidebarOpen).toBe(true);

			pinLeftSidebar(false);
			pinLeftSidebar(false);
			pinLeftSidebar(false);

			expect(useLayoutStore.getState().leftSidebarPinned).toBe(false);
		});

		it("should handle setting preview entity to the same value multiple times", () => {
			const { setPreviewEntity } = useLayoutStore.getState();

			setPreviewEntity("W123456789");
			setPreviewEntity("W123456789");
			setPreviewEntity("W123456789");

			expect(useLayoutStore.getState().previewEntityId).toBe("W123456789");

			setPreviewEntity(null);
			setPreviewEntity(null);
			setPreviewEntity(null);

			expect(useLayoutStore.getState().previewEntityId).toBeNull();
		});

		it("should handle setting graph provider to the same value multiple times", () => {
			const { setGraphProvider } = useLayoutStore.getState();

			setGraphProvider("cytoscape");
			setGraphProvider("cytoscape");
			setGraphProvider("cytoscape");

			expect(useLayoutStore.getState().graphProvider).toBe("cytoscape");
		});
	});

	describe("Store Integration", () => {
		it("should allow subscribing to state changes", () => {
			const mockCallback = vi.fn();
			const unsubscribe = useLayoutStore.subscribe(mockCallback);

			const { toggleLeftSidebar } = useLayoutStore.getState();
			toggleLeftSidebar();

			expect(mockCallback).toHaveBeenCalled();

			unsubscribe();
		});

		it("should allow manual state updates via setState", () => {
			useLayoutStore.setState({
				leftSidebarOpen: false,
				rightSidebarOpen: false,
				graphProvider: "cytoscape",
				previewEntityId: "W123456789",
			});

			const state = useLayoutStore.getState();

			expect(state.leftSidebarOpen).toBe(false);
			expect(state.rightSidebarOpen).toBe(false);
			expect(state.graphProvider).toBe("cytoscape");
			expect(state.previewEntityId).toBe("W123456789");
		});

		it("should maintain consistent state across multiple getState calls", () => {
			const { setPreviewEntity, setGraphProvider } = useLayoutStore.getState();

			setPreviewEntity("W123456789");
			setGraphProvider("cytoscape");

			const state1 = useLayoutStore.getState();
			const state2 = useLayoutStore.getState();

			expect(state1.previewEntityId).toBe(state2.previewEntityId);
			expect(state1.graphProvider).toBe(state2.graphProvider);
			expect(state1.leftSidebarOpen).toBe(state2.leftSidebarOpen);
		});
	});
});