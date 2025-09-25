/**
 * Unit tests for use-graph-persistence hook
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { useGraphPersistence } from "./use-graph-persistence";
import { useGraphStore } from "@/stores/graph-store";
import { logger, logError } from "@academic-explorer/utils/logger";
import type { GraphSnapshot, GraphNode, GraphEdge } from "@academic-explorer/graph";

// Mock dependencies
vi.mock("@/stores/graph-store");
vi.mock("@academic-explorer/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
	logError: vi.fn(),
}));

const mockUseGraphStore = useGraphStore as unknown as {
  getState: Mock;
};

// Create localStorage mock
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			const { [key]: _, ...rest } = store;
			store = rest;
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] || null),
	};
})();

// Mock localStorage
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

describe("useGraphPersistence", () => {
	const mockStore = {
		nodes: {} as Record<string, GraphNode>,
		edges: {} as Record<string, GraphEdge>,
		provider: {
			getSnapshot: vi.fn(),
			applyLayout: vi.fn(),
			loadSnapshot: vi.fn(),
			fitView: vi.fn(),
		},
		clear: vi.fn(),
		addNodes: vi.fn(),
		addEdges: vi.fn(),
		currentLayout: "force-directed",
	};

	const mockGraphSnapshot: GraphSnapshot = {
		nodes: [
			{
				id: "W123",
				entityType: "works",
				title: "Test Work",
				entityType: "works",
				data: { id: "W123", display_name: "Test Work" },
				position: { x: 100, y: 100 },
			},
			{
				id: "A456",
				entityType: "authors",
				title: "Test Author",
				entityType: "authors",
				data: { id: "A456", display_name: "Test Author" },
				position: { x: 200, y: 200 },
			},
		],
		edges: [
			{
				id: "edge1",
				source: "W123",
				target: "A456",
				entityType: "authored_by",
				label: "authored by",
			},
		],
		viewport: {
			zoom: 1.5,
			center: { x: 150, y: 150 },
		},
	};

	const mockSession = {
		id: "session_1234567890",
		name: "Test Session",
		createdAt: new Date("2023-01-01T00:00:00Z"),
		lastModified: new Date("2023-01-01T00:00:00Z"),
		snapshot: mockGraphSnapshot,
		metadata: {
			entityCounts: {
				works: 1,
				authors: 1,
				sources: 0,
				institutions: 0,
				total: 2,
			},
			description: "Test session description",
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();

		// Reset mock store - use Records instead of Maps
		mockStore.nodes = {
			"W123": mockGraphSnapshot.nodes[0],
			"A456": mockGraphSnapshot.nodes[1],
		};
		mockStore.edges = {
			"edge1": mockGraphSnapshot.edges[0],
		};

		// Reset provider to valid mock object
		mockStore.provider = {
			getSnapshot: vi.fn(),
			applyLayout: vi.fn(),
			loadSnapshot: vi.fn(),
			fitView: vi.fn(),
		};

		mockStore.provider.getSnapshot.mockReturnValue({
			viewport: { zoom: 1, center: { x: 0, y: 0 } },
		});

		mockUseGraphStore.getState = vi.fn().mockReturnValue(mockStore);

		// Mock Date.now for consistent session IDs
		vi.spyOn(Date, "now").mockReturnValue(1234567890);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("loadSessions", () => {
		it("should return empty array when no sessions stored", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const sessions = result.current.loadSessions();

			expect(sessions).toEqual([]);
		});

		it("should load and parse valid sessions from localStorage", () => {
			const storedSessions = [mockSession];
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify(storedSessions));

			const { result } = renderHook(() => useGraphPersistence());

			const sessions = result.current.loadSessions();

			expect(sessions).toHaveLength(1);
			expect(sessions[0]).toMatchObject({
				id: mockSession.id,
				name: mockSession.name,
				snapshot: mockSession.snapshot,
				metadata: mockSession.metadata,
			});
			expect(sessions[0].createdAt).toBeInstanceOf(Date);
			expect(sessions[0].lastModified).toBeInstanceOf(Date);
		});

		it("should filter out invalid sessions", () => {
			const invalidSessions = [
				mockSession,
				{ id: "invalid", name: "Invalid Session" }, // Missing snapshot
				{ id: "W123", snapshot: { nodes: [], edges: [] } }, // Missing name
				"not-an-object",
			];
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify(invalidSessions));

			const { result } = renderHook(() => useGraphPersistence());

			const sessions = result.current.loadSessions();

			expect(sessions).toHaveLength(1);
			expect(sessions[0].id).toBe(mockSession.id);
		});

		it("should handle invalid JSON gracefully", () => {
			localStorageMock.setItem("academic-explorer-sessions", "invalid-json");

			const { result } = renderHook(() => useGraphPersistence());

			const sessions = result.current.loadSessions();

			expect(sessions).toEqual([]);
			expect(logError).toHaveBeenCalledWith(
				"Failed to load graph sessions from storage",
				expect.any(Error),
				"useGraphPersistence",
				"storage"
			);
		});

		it("should handle non-array data format", () => {
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify({ not: "array" }));

			const { result } = renderHook(() => useGraphPersistence());

			const sessions = result.current.loadSessions();

			expect(sessions).toEqual([]);
			expect(logger.warn).toHaveBeenCalledWith(
				"storage",
				"Invalid sessions data format, expected array",
				{ parsed: "[object Object]" },
				"useGraphPersistence"
			);
		});
	});

	describe("saveSession", () => {
		it("should save current graph as session", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const sessionId = result.current.saveSession("My Test Session", "Test description");

			expect(sessionId).toBe("session_1234567890");

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions).toHaveLength(1);
			expect(sessions[0]).toMatchObject({
				id: "session_1234567890",
				name: "My Test Session",
				metadata: {
					description: "Test description",
					entityCounts: {
						works: 1,
						authors: 1,
						sources: 0,
						institutions: 0,
						total: 2,
					},
				},
			});
		});

		it("should throw error when trying to save empty graph", () => {
			mockStore.nodes = {}; // Empty graph

			const { result } = renderHook(() => useGraphPersistence());

			expect(() => {
				result.current.saveSession("Empty Session");
			}).toThrow("Cannot save empty graph");
		});

		it("should limit sessions to MAX_SESSIONS", () => {
			// Fill localStorage with 10 sessions
			const existingSessions = Array.from({ length: 10 }, (_, i) => ({
				...mockSession,
				id: `session_${i}`,
				name: `Session ${i}`,
			}));
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify(existingSessions));

			const { result } = renderHook(() => useGraphPersistence());

			result.current.saveSession("New Session");

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions).toHaveLength(10); // Still limited to 10
			expect(sessions[0].name).toBe("New Session"); // New session is first
			expect(sessions[9].name).toBe("Session 8"); // Last old session removed
		});

		it("should handle localStorage errors", () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("Storage full");
			});

			const { result } = renderHook(() => useGraphPersistence());

			expect(() => {
				result.current.saveSession("Test Session");
			}).toThrow("Failed to save session. Storage might be full.");

			expect(logError).toHaveBeenCalledWith(
				"Failed to save graph session to storage",
				expect.any(Error),
				"useGraphPersistence",
				"storage"
			);
		});

		it("should handle missing provider gracefully", () => {
			mockStore.provider = null;

			const { result } = renderHook(() => useGraphPersistence());

			const sessionId = result.current.saveSession("Test Session");

			expect(sessionId).toBe("session_1234567890");

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions[0].snapshot.viewport).toEqual({
				zoom: 1,
				center: { x: 0, y: 0 },
			});
		});
	});

	describe("loadSession", () => {
		beforeEach(() => {
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify([mockSession]));
		});

		it("should load session and restore graph state", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.loadSession(mockSession.id);

			expect(success).toBe(true);
			expect(mockStore.clear).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalledWith(mockSession.snapshot.nodes);
			expect(mockStore.addEdges).toHaveBeenCalledWith(mockSession.snapshot.edges);
			expect(mockStore.provider.applyLayout).toHaveBeenCalledWith("force-directed");
			expect(mockStore.provider.loadSnapshot).toHaveBeenCalledWith(mockSession.snapshot);
		});

		it("should use fitView when viewport not available", () => {
			const sessionWithoutViewport = {
				...mockSession,
				snapshot: {
					...mockSession.snapshot,
					viewport: undefined,
				},
			};
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify([sessionWithoutViewport]));

			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.loadSession(sessionWithoutViewport.id);

			expect(success).toBe(true);
			expect(mockStore.provider.fitView).toHaveBeenCalled();
			expect(mockStore.provider.loadSnapshot).not.toHaveBeenCalled();
		});

		it("should handle missing provider gracefully", () => {
			mockStore.provider = null;

			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.loadSession(mockSession.id);

			expect(success).toBe(true);
			expect(mockStore.clear).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalledWith(mockSession.snapshot.nodes);
			expect(mockStore.addEdges).toHaveBeenCalledWith(mockSession.snapshot.edges);
		});

		it("should return false for non-existent session", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.loadSession("non-existent-id");

			expect(success).toBe(false);
			expect(logError).toHaveBeenCalledWith(
				"Failed to load graph session from storage",
				expect.any(Error),
				"useGraphPersistence",
				"storage"
			);
		});

		it("should update lastModified when loading session", () => {
			const { result } = renderHook(() => useGraphPersistence());

			result.current.loadSession(mockSession.id);

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(new Date(sessions[0].lastModified).getTime()).toBeGreaterThan(
				mockSession.lastModified.getTime()
			);
		});
	});

	describe("deleteSession", () => {
		beforeEach(() => {
			const sessions = [mockSession, { ...mockSession, id: "session_2", name: "Session 2" }];
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify(sessions));
		});

		it("should delete specified session", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.deleteSession(mockSession.id);

			expect(success).toBe(true);

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions).toHaveLength(1);
			expect(sessions[0].id).toBe("session_2");
		});

		it("should handle localStorage errors", () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("Storage error");
			});

			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.deleteSession(mockSession.id);

			expect(success).toBe(false);
			expect(logError).toHaveBeenCalledWith(
				"Failed to delete graph session from storage",
				expect.any(Error),
				"useGraphPersistence",
				"storage"
			);
		});
	});

	describe("updateSession", () => {
		beforeEach(() => {
			localStorageMock.setItem("academic-explorer-sessions", JSON.stringify([mockSession]));
		});

		it("should update session name and description", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.updateSession(mockSession.id, {
				name: "Updated Name",
				description: "Updated description",
			});

			expect(success).toBe(true);

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions[0].name).toBe("Updated Name");
			expect(sessions[0].metadata.description).toBe("Updated description");
			expect(new Date(sessions[0].lastModified).getTime()).toBeGreaterThan(
				mockSession.lastModified.getTime()
			);
		});

		it("should update only specified fields", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.updateSession(mockSession.id, {
				name: "New Name Only",
			});

			expect(success).toBe(true);

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions[0].name).toBe("New Name Only");
			expect(sessions[0].metadata.description).toBe(mockSession.metadata.description);
		});

		it("should handle undefined description updates", () => {
			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.updateSession(mockSession.id, {
				description: undefined,
			});

			expect(success).toBe(true);

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions[0].metadata.description).toBe(mockSession.metadata.description);
		});

		it("should handle localStorage errors", () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("Storage error");
			});

			const { result } = renderHook(() => useGraphPersistence());

			const success = result.current.updateSession(mockSession.id, {
				name: "Updated Name",
			});

			expect(success).toBe(false);
			expect(logError).toHaveBeenCalledWith(
				"Failed to update graph session in storage",
				expect.any(Error),
				"useGraphPersistence",
				"storage"
			);
		});
	});

	describe("autoSave", () => {
		it("should save session with default auto-save name", () => {
			const { result } = renderHook(() => useGraphPersistence());

			act(() => {
				result.current.autoSave();
			});

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions).toHaveLength(1);
			expect(sessions[0].name).toBe("Auto-saved Session");
			expect(sessions[0].metadata.description).toBe("Automatically saved");
		});

		it("should save session with custom name", () => {
			const { result } = renderHook(() => useGraphPersistence());

			act(() => {
				result.current.autoSave("Custom Auto-save");
			});

			const stored = localStorageMock.getItem("academic-explorer-sessions");
			const sessions = JSON.parse(stored!);

			expect(sessions[0].name).toBe("Custom Auto-save");
		});

		it("should handle auto-save errors silently", () => {
			mockStore.nodes = {}; // Empty graph will cause saveSession to throw

			const { result } = renderHook(() => useGraphPersistence());

			// Should not throw
			expect(() => {
				result.current.autoSave();
			}).not.toThrow();

			expect(logger.warn).toHaveBeenCalledWith(
				"storage",
				"Auto-save failed",
				{ error: expect.any(Error) },
				"useGraphPersistence"
			);
		});
	});

	describe("function stability", () => {
		it("should return stable function references", () => {
			const { result, rerender } = renderHook(() => useGraphPersistence());

			const firstRender = { ...result.current };
			rerender();
			const secondRender = { ...result.current };

			expect(firstRender.loadSessions).toBe(secondRender.loadSessions);
			expect(firstRender.saveSession).toBe(secondRender.saveSession);
			expect(firstRender.loadSession).toBe(secondRender.loadSession);
			expect(firstRender.deleteSession).toBe(secondRender.deleteSession);
			expect(firstRender.updateSession).toBe(secondRender.updateSession);
			expect(firstRender.autoSave).toBe(secondRender.autoSave);
		});
	});
});