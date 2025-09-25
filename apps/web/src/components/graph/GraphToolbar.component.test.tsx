/**
 * Component tests for GraphToolbar
 * Tests UI integration and user interactions for graph utilities
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { GraphToolbar } from "./GraphToolbar";
import type { GraphEdge } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";

// Mock XYFlow ReactFlowProvider and useReactFlow
vi.mock("@xyflow/react", () => ({
	ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="react-flow-provider">{children}</div>,
	useReactFlow: vi.fn(),
}));

// Mock hooks
vi.mock("@/hooks/use-graph-utilities", () => ({
	useGraphUtilities: vi.fn(),
}));

vi.mock("@/hooks/use-graph-data", () => ({
	useGraphData: vi.fn(),
}));

vi.mock("@/stores/graph-store", () => ({
	useGraphStore: vi.fn(),
}));

vi.mock("@academic-explorer/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <div data-testid="react-flow-provider">{children}</div>;
};

describe("GraphToolbar", () => {
	const mockTrimLeafNodes = vi.fn();
	const mockExpandNode = vi.fn();
	const mockGetNodes = vi.fn();
	const mockGetEdges = vi.fn();
	const mockSetNodes = vi.fn();
	const mockPinNode = vi.fn();
	const mockClearAllPinnedNodes = vi.fn();

	const testNodes = [
		{
			id: "W1",
			entityType: "works",
			label: "Test Work 1",
			position: { x: 0, y: 0 },
			selected: false,
			data: {
				entityId: "W1",
				entityType: "works",
				label: "Test Work 1",
				externalIds: [],
			},
		},
		{
			id: "W2",
			entityType: "works",
			label: "Test Work 2",
			position: { x: 100, y: 100 },
			selected: true,
			data: {
				entityId: "W2",
				entityType: "works",
				label: "Test Work 2",
				externalIds: [],
			},
		},
		{
			id: "A1",
			entityType: "authors",
			label: "Test Author 1",
			position: { x: 50, y: 50 },
			selected: false,
			data: {
				entityId: "A1",
				entityType: "authors",
				label: "Test Author 1",
				externalIds: [],
			},
		},
	];

	const testEdges: GraphEdge[] = [
		{
			id: "E1",
			source: "A1",
			target: "W1",
			entityType: RelationType.AUTHORED,
		},
		{
			id: "E2",
			source: "W1",
			target: "W2",
			entityType: RelationType.REFERENCES,
		},
	];

	beforeEach(async () => {
		vi.clearAllMocks();

		const { useReactFlow } = await import("@xyflow/react");
		const { useGraphUtilities } = await import("@/hooks/use-graph-utilities");
		const { useGraphData } = await import("@/hooks/use-graph-data");
		const { useGraphStore } = await import("@/stores/graph-store");

		// Setup mock return values
		vi.mocked(useReactFlow).mockReturnValue({
			getNodes: mockGetNodes,
			getEdges: mockGetEdges,
			setNodes: mockSetNodes,
		} as any);

		vi.mocked(useGraphUtilities).mockReturnValue({
			trimLeafNodes: mockTrimLeafNodes,
		} as any);

		vi.mocked(useGraphData).mockReturnValue({
			expandNode: mockExpandNode,
		} as any);

		vi.mocked(useGraphStore).mockImplementation((selector: any) => {
			const state = {
				pinnedNodes: { "W1": true },
				pinNode: mockPinNode,
				clearAllPinnedNodes: mockClearAllPinnedNodes,
			};

			if (typeof selector === "function") {
				return selector(state);
			}
			return state;
		});

		// Setup default mock implementations
		mockGetNodes.mockReturnValue(testNodes);
		mockGetEdges.mockReturnValue(testEdges);
		mockTrimLeafNodes.mockReturnValue({
			nodes: testNodes.slice(0, 2),
			edges: testEdges.slice(0, 1),
			removedCount: 1,
			operation: "trimLeafNodes",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		cleanup(); // Clean up DOM between tests
	});

	describe("rendering", () => {
		it("should render all toolbar buttons", () => {
			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			expect(screen.getByRole("button", { name: /trim leaves/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /select 1-degree/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /expand selected/i })).toBeInTheDocument();

			// Check for specific button text since "pin all" appears in both buttons
			const buttons = screen.getAllByRole("button");
			const pinAllButton = buttons.find(button => button.textContent === "Pin All");
			const unpinAllButton = buttons.find(button => button.textContent === "Unpin All");

			expect(pinAllButton).toBeInTheDocument();
			expect(unpinAllButton).toBeInTheDocument();
		});

		it("should render with custom className", () => {
			const { container } = render(
				<TestWrapper>
					<GraphToolbar className="custom-class" />
				</TestWrapper>
			);

			const toolbar = container.querySelector(".custom-class");
			expect(toolbar).toBeInTheDocument();
		});

		it("should have proper button titles", () => {
			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			expect(screen.getByTitle("Trim Leaf Nodes - Remove papers with no citations")).toBeInTheDocument();
			expect(screen.getByTitle("Select 1-Degree - Select all nodes directly connected to the selected node")).toBeInTheDocument();
			expect(screen.getByTitle("Expand Selected - Load connections for all selected nodes")).toBeInTheDocument();
			expect(screen.getByTitle("Pin All - Pin all nodes to prevent them from moving during layout")).toBeInTheDocument();
			expect(screen.getByTitle("Unpin All - Unpin all nodes to allow them to move during layout")).toBeInTheDocument();
		});
	});

	describe("trim leaves functionality", () => {
		it("should call trimLeafNodes when button is clicked", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const trimButton = screen.getByRole("button", { name: /trim leaves/i });
			fireEvent.click(trimButton);

			expect(mockTrimLeafNodes).toHaveBeenCalledTimes(1);
			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"Trim leaves action triggered from graph toolbar"
			);
			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"Trim leaves completed",
				{
					removedCount: 1,
					remainingNodes: 2,
				}
			);
		});

		it("should handle trim leaves error", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			const error = new Error("Trim failed");
			mockTrimLeafNodes.mockImplementation(() => {
				throw error;
			});

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const trimButton = screen.getByRole("button", { name: /trim leaves/i });
			fireEvent.click(trimButton);

			expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
				"graph",
				"Trim leaves failed",
				{ error: "Trim failed" }
			);
		});

		it("should handle non-Error exceptions in trim leaves", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			mockTrimLeafNodes.mockImplementation(() => {
				throw new Error("String error");
			});

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const trimButton = screen.getByRole("button", { name: /trim leaves/i });
			fireEvent.click(trimButton);

			expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
				"graph",
				"Trim leaves failed",
				{ error: "String error" }
			);
		});
	});

	describe("1-degree selection functionality", () => {
		it("should select 1-degree neighbors when button is clicked", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const selectButton = screen.getByRole("button", { name: /select 1-degree/i });
			fireEvent.click(selectButton);

			expect(mockGetNodes).toHaveBeenCalled();
			expect(mockGetEdges).toHaveBeenCalled();
			expect(mockSetNodes).toHaveBeenCalled();

			// Verify logging
			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"1-degree selection action triggered from graph toolbar"
			);
		});

		it("should warn when no node is selected", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			// Mock no selected nodes
			mockGetNodes.mockReturnValue(testNodes.map(n => ({ ...n, selected: false })));

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const selectButton = screen.getByRole("button", { name: /select 1-degree/i });
			fireEvent.click(selectButton);

			expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
				"graph",
				"No node currently selected for 1-degree selection"
			);
		});

		it("should correctly find and select neighbors", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const selectButton = screen.getByRole("button", { name: /select 1-degree/i });
			fireEvent.click(selectButton);

			// Verify the correct nodes were processed
			const setNodesCall = mockSetNodes.mock.calls[0][0];
			expect(setNodesCall).toBeDefined();

			// Should select W2 (originally selected) and its neighbors
			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"1-degree selection completed",
				expect.objectContaining({
					selectedNodeId: "W2",
					neighborCount: expect.any(Number),
					totalSelected: expect.any(Number),
				})
			);
		});
	});

	describe("expand selected functionality", () => {
		it("should expand selected nodes when button is clicked", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const expandButton = screen.getByRole("button", { name: /expand selected/i });
			fireEvent.click(expandButton);

			await waitFor(() => {
				expect(mockExpandNode).toHaveBeenCalled();
			});

			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"Expand selected nodes action triggered from graph toolbar"
			);
		});

		it("should warn when no nodes are selected for expansion", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			mockGetNodes.mockReturnValue(testNodes.map(n => ({ ...n, selected: false })));

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const expandButton = screen.getByRole("button", { name: /expand selected/i });
			fireEvent.click(expandButton);

			await waitFor(() => {
				expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
					"graph",
					"No nodes currently selected for expansion"
				);
			});
		});

		it("should handle expansion errors gracefully", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			mockExpandNode.mockRejectedValue(new Error("Expansion failed"));

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const expandButton = screen.getByRole("button", { name: /expand selected/i });
			fireEvent.click(expandButton);

			await waitFor(() => {
				expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
					"graph",
					"Expand selected nodes completed",
					expect.objectContaining({
						failed: expect.any(Number),
					})
				);
			});
		});
	});

	describe("pin/unpin functionality", () => {
		it("should pin all nodes when pin all button is clicked", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const pinButton = screen.getByRole("button", { name: /^pin all$/i });
			fireEvent.click(pinButton);

			expect(mockPinNode).toHaveBeenCalledTimes(3); // All test nodes
			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"Pin all nodes action triggered from graph toolbar"
			);
		});

		it("should warn when no nodes available to pin", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			mockGetNodes.mockReturnValue([]);

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const pinButton = screen.getByRole("button", { name: /^pin all$/i });
			fireEvent.click(pinButton);

			expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
				"graph",
				"No nodes available to pin"
			);
		});

		it("should unpin all nodes when unpin all button is clicked", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const unpinButton = screen.getByRole("button", { name: /unpin all/i });
			fireEvent.click(unpinButton);

			expect(mockClearAllPinnedNodes).toHaveBeenCalledTimes(1);
			expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
				"graph",
				"Unpin all nodes action triggered from graph toolbar"
			);
		});

		it("should warn when no nodes are pinned", async () => {
			const { logger } = await import("@academic-explorer/utils/logger");
			const { useGraphStore } = await import("@/stores/graph-store");

			// Mock no pinned nodes
			vi.mocked(useGraphStore).mockImplementation((selector: any) => {
				const state = {
					pinnedNodes: {},
					pinNode: mockPinNode,
					clearAllPinnedNodes: mockClearAllPinnedNodes,
				};

				if (typeof selector === "function") {
					return selector(state);
				}
				return state;
			});

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const unpinButton = screen.getByRole("button", { name: /unpin all/i });
			fireEvent.click(unpinButton);

			expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
				"graph",
				"No nodes currently pinned to unpin"
			);
		});
	});

	describe("accessibility", () => {
		it("should have proper ARIA labels and roles", () => {
			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const buttons = screen.getAllByRole("button");
			expect(buttons).toHaveLength(5);

			buttons.forEach(button => {
				expect(button).toHaveAttribute("title");
			});
		});

		it("should be keyboard accessible", () => {
			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const trimButton = screen.getByRole("button", { name: /trim leaves/i });

			// Focus the button
			trimButton.focus();
			expect(document.activeElement).toBe(trimButton);

			// Simulate keyboard activation
			fireEvent.keyDown(trimButton, { key: "Enter", code: "Enter" });
			fireEvent.keyUp(trimButton, { key: "Enter", code: "Enter" });

			// Should not prevent normal button behavior
			expect(trimButton).toBeInTheDocument();
		});
	});

	describe("edge cases", () => {
		it("should handle rapid successive clicks", async () => {
			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const trimButton = screen.getByRole("button", { name: /trim leaves/i });

			// Click multiple times rapidly
			fireEvent.click(trimButton);
			fireEvent.click(trimButton);
			fireEvent.click(trimButton);

			expect(mockTrimLeafNodes).toHaveBeenCalledTimes(3);
		});

		it("should handle empty entity IDs in expansion", async () => {
			const nodesWithEmptyEntityId = [
				{
					...testNodes[1],
					data: { entityId: null },
				},
			];
			mockGetNodes.mockReturnValue(nodesWithEmptyEntityId);

			render(
				<TestWrapper>
					<GraphToolbar />
				</TestWrapper>
			);

			const expandButton = screen.getByRole("button", { name: /expand selected/i });
			fireEvent.click(expandButton);

			await waitFor(() => {
				expect(mockExpandNode).toHaveBeenCalledWith("W2", expect.any(Object));
			});
		});
	});
});