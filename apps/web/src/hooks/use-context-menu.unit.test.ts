/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextMenu } from "./use-context-menu";
import type { GraphNode } from "@academic-explorer/graph";

describe("useContextMenu", () => {
	let mockGraphNode: GraphNode;

	beforeEach(() => {
		// Mock window dimensions for viewport calculations
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1920,
		});

		Object.defineProperty(window, "innerHeight", {
			writable: true,
			configurable: true,
			value: 1080,
		});

		// Create mock graph node
		mockGraphNode = {
			id: "test-node-1",
			label: "Test Node",
			type: "works",
			entityId: "W123456789",
			position: { x: 100, y: 100 },
			externalIds: [],
		};
	});

	describe("initial state", () => {
		it("should initialize with correct default state", () => {
			const { result } = renderHook(() => useContextMenu());

			expect(result.current.contextMenu).toEqual({
				node: null,
				x: 0,
				y: 0,
				visible: false,
			});
			expect(typeof result.current.showContextMenu).toBe("function");
			expect(typeof result.current.hideContextMenu).toBe("function");
		});
	});

	describe("showContextMenu", () => {
		it("should show context menu with correct position", () => {
			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 300,
				clientY: 400,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(mockEvent.stopPropagation).toHaveBeenCalled();
			expect(result.current.contextMenu).toEqual({
				node: mockGraphNode,
				x: 300,
				y: 400,
				visible: true,
			});
		});

		it("should prevent context menu from extending beyond right edge of viewport", () => {
			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 1800, // Close to right edge (viewport width: 1920)
				clientY: 400,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			// Should be constrained to window.innerWidth - 200 = 1720
			expect(result.current.contextMenu.x).toBe(1720);
			expect(result.current.contextMenu.y).toBe(400);
		});

		it("should prevent context menu from extending beyond bottom edge of viewport", () => {
			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 300,
				clientY: 900, // Close to bottom edge (viewport height: 1080)
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			// Should be constrained to window.innerHeight - 300 = 780
			expect(result.current.contextMenu.x).toBe(300);
			expect(result.current.contextMenu.y).toBe(780);
		});

		it("should handle exact viewport boundary conditions", () => {
			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 1920, // Exactly at right edge
				clientY: 1080, // Exactly at bottom edge
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			expect(result.current.contextMenu.x).toBe(1720); // window.innerWidth - 200
			expect(result.current.contextMenu.y).toBe(780);  // window.innerHeight - 300
		});

		it("should handle multiple consecutive calls", () => {
			const { result } = renderHook(() => useContextMenu());

			const firstEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 100,
				clientY: 100,
			} as unknown as React.MouseEvent;

			const secondEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 500,
				clientY: 600,
			} as unknown as React.MouseEvent;

			const secondNode = {
				...mockGraphNode,
				id: "test-node-2",
				label: "Second Node",
			};

			// First call
			act(() => {
				result.current.showContextMenu(mockGraphNode, firstEvent);
			});

			expect(result.current.contextMenu).toEqual({
				node: mockGraphNode,
				x: 100,
				y: 100,
				visible: true,
			});

			// Second call should update state
			act(() => {
				result.current.showContextMenu(secondNode, secondEvent);
			});

			expect(result.current.contextMenu).toEqual({
				node: secondNode,
				x: 500,
				y: 600,
				visible: true,
			});
		});

		it("should work with native MouseEvent", () => {
			const { result } = renderHook(() => useContextMenu());

			// Create mock event with native MouseEvent properties
			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 250,
				clientY: 350,
				bubbles: true,
				cancelable: true,
				type: "contextmenu",
			} as unknown as MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(mockEvent.stopPropagation).toHaveBeenCalled();
			expect(result.current.contextMenu).toEqual({
				node: mockGraphNode,
				x: 250,
				y: 350,
				visible: true,
			});
		});
	});

	describe("hideContextMenu", () => {
		it("should hide context menu while preserving node and position", () => {
			const { result } = renderHook(() => useContextMenu());

			// First show the context menu
			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 300,
				clientY: 400,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			// Verify it's visible
			expect(result.current.contextMenu.visible).toBe(true);

			// Now hide it
			act(() => {
				result.current.hideContextMenu();
			});

			expect(result.current.contextMenu).toEqual({
				node: mockGraphNode,
				x: 300,
				y: 400,
				visible: false, // Only visible changes
			});
		});

		it("should work when called multiple times", () => {
			const { result } = renderHook(() => useContextMenu());

			// Show context menu first
			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 300,
				clientY: 400,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			// Hide multiple times
			act(() => {
				result.current.hideContextMenu();
			});

			const firstHideState = { ...result.current.contextMenu };

			act(() => {
				result.current.hideContextMenu();
			});

			// State should remain the same
			expect(result.current.contextMenu).toEqual(firstHideState);
			expect(result.current.contextMenu.visible).toBe(false);
		});

		it("should work when called on initial state", () => {
			const { result } = renderHook(() => useContextMenu());

			// Hide without ever showing
			act(() => {
				result.current.hideContextMenu();
			});

			expect(result.current.contextMenu).toEqual({
				node: null,
				x: 0,
				y: 0,
				visible: false,
			});
		});
	});

	describe("viewport boundary edge cases", () => {
		it("should handle very small viewport dimensions", () => {
			// Set very small viewport
			Object.defineProperty(window, "innerWidth", {
				value: 100,
				configurable: true,
			});
			Object.defineProperty(window, "innerHeight", {
				value: 150,
				configurable: true,
			});

			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 50,
				clientY: 100,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			// Should constrain to negative values in this case
			expect(result.current.contextMenu.x).toBe(-100); // 100 - 200
			expect(result.current.contextMenu.y).toBe(-150); // 150 - 300
		});

		it("should handle zero coordinates", () => {
			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 0,
				clientY: 0,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(mockGraphNode, mockEvent);
			});

			expect(result.current.contextMenu.x).toBe(0);
			expect(result.current.contextMenu.y).toBe(0);
		});
	});

	describe("function stability", () => {
		it("should maintain function reference stability", () => {
			const { result, rerender } = renderHook(() => useContextMenu());

			const initialShowContextMenu = result.current.showContextMenu;
			const initialHideContextMenu = result.current.hideContextMenu;

			// Force re-render
			rerender();

			expect(result.current.showContextMenu).toBe(initialShowContextMenu);
			expect(result.current.hideContextMenu).toBe(initialHideContextMenu);
		});
	});

	describe("node data handling", () => {
		it("should handle different node types correctly", () => {
			const authorNode: GraphNode = {
				id: "author-node",
				label: "Author Node",
				type: "authors",
				entityId: "A123456789",
				position: { x: 50, y: 75 },
				externalIds: [
					{
						type: "orcid",
						value: "0000-0000-0000-0000",
						url: "https://orcid.org/0000-0000-0000-0000",
					},
				],
			};

			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 300,
				clientY: 400,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(authorNode, mockEvent);
			});

			expect(result.current.contextMenu.node).toEqual(authorNode);
			expect(result.current.contextMenu.node?.type).toBe("authors");
		});

		it("should handle nodes with complex external IDs", () => {
			const nodeWithMultipleIds: GraphNode = {
				id: "complex-node",
				label: "Complex Node",
				type: "institutions",
				entityId: "I123456789",
				position: { x: 0, y: 0 },
				externalIds: [
					{
						type: "ror",
						value: "01abc23de",
						url: "https://ror.org/01abc23de",
					},
					{
						type: "wikidata",
						value: "Q123456",
						url: "https://www.wikidata.org/entity/Q123456",
					},
				],
			};

			const { result } = renderHook(() => useContextMenu());

			const mockEvent = {
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				clientX: 300,
				clientY: 400,
			} as unknown as React.MouseEvent;

			act(() => {
				result.current.showContextMenu(nodeWithMultipleIds, mockEvent);
			});

			expect(result.current.contextMenu.node).toEqual(nodeWithMultipleIds);
			expect(result.current.contextMenu.node?.externalIds).toHaveLength(2);
		});
	});
});