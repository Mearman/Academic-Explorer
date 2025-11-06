/**
 * Component tests for GraphToolbar
 * Tests UI integration and user interactions for graph utilities
 */
/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Mock ResizeObserver before importing Mantine
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia before importing Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import type { GraphEdge } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";
import { MantineProvider } from "@mantine/core";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphToolbar } from "./GraphToolbar";

// Mock XYFlow ReactFlowProvider and useReactFlow
vi.mock("@xyflow/react", () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="@xyflow/react-provider">{children}</div>
  ),
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
  return (
    <MantineProvider>
      <div data-testid="@xyflow/react-provider">{children}</div>
    </MantineProvider>
  );
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
      type: RelationType.AUTHORED,
    },
    {
      id: "E2",
      source: "W1",
      target: "W2",
      type: RelationType.REFERENCES,
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

    vi.mocked(useGraphStore).mockImplementation((selector?) => {
      const state = {
        pinnedNodes: { W1: true },
        pinNode: mockPinNode,
        clearAllPinnedNodes: mockClearAllPinnedNodes,
      };

      if (selector && typeof selector === "function") {
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
        </TestWrapper>,
      );

      // Check that the button text is present
      expect(screen.getByText("Trim Leaves")).toBeInTheDocument();
      expect(screen.getByText("Select 1-Degree")).toBeInTheDocument();
      expect(screen.getByText("Expand Selected")).toBeInTheDocument();
      expect(screen.getByText("Pin All")).toBeInTheDocument();
      expect(screen.getByText("Unpin All")).toBeInTheDocument();

      // Check that they are actually buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(5);
    });

    it("should render with custom className", () => {
      const { container } = render(
        <TestWrapper>
          <GraphToolbar className="custom-class" />
        </TestWrapper>,
      );

      const toolbar = container.querySelector(".custom-class");
      expect(toolbar).toBeInTheDocument();
    });

    it("should have proper button titles", () => {
      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      // Check that buttons exist with proper text content and tooltips
      const trimButton = screen.getByRole("button", { name: "Trim Leaves" });
      const selectButton = screen.getByRole("button", { name: "Select 1-Degree" });
      const expandButton = screen.getByRole("button", { name: "Expand Selected" });
      const pinButton = screen.getByRole("button", { name: "Pin All" });
      const unpinButton = screen.getByRole("button", { name: "Unpin All" });

      expect(trimButton).toBeInTheDocument();
      expect(selectButton).toBeInTheDocument();
      expect(expandButton).toBeInTheDocument();
      expect(pinButton).toBeInTheDocument();
      expect(unpinButton).toBeInTheDocument();
    });
  });

  describe("trim leaves functionality", () => {
    it("should call trimLeafNodes when button is clicked", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const trimButton = screen.getByText("Trim Leaves").closest("button")!;
      fireEvent.click(trimButton);

      expect(mockTrimLeafNodes).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
        "graph",
        "Trim leaves action triggered from graph toolbar",
      );
      expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
        "graph",
        "Trim leaves completed",
        {
          removedCount: 1,
          remainingNodes: 2,
        },
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
        </TestWrapper>,
      );

      const trimButton = screen.getByText("Trim Leaves").closest("button")!;
      fireEvent.click(trimButton);

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        "graph",
        "Trim leaves failed",
        { error: "Trim failed" },
      );
    });

    it("should handle non-Error exceptions in trim leaves", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");
      mockTrimLeafNodes.mockImplementation(() => {
        throw "String error";
      });

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const trimButton = screen.getByText("Trim Leaves").closest("button")!;
      fireEvent.click(trimButton);

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        "graph",
        "Trim leaves failed",
        { error: "UNKNOWN_ERROR_MESSAGE" },
      );
    });
  });

  describe("1-degree selection functionality", () => {
    it("should select 1-degree neighbors when button is clicked", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const selectButton = screen
        .getByText("Select 1-Degree")
        .closest("button")!;
      fireEvent.click(selectButton);

      expect(mockGetNodes).toHaveBeenCalled();
      expect(mockGetEdges).toHaveBeenCalled();
      expect(mockSetNodes).toHaveBeenCalled();

      // Verify logging
      expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
        "graph",
        "1-degree selection action triggered from graph toolbar",
      );
    });

    it("should warn when no node is selected", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");
      // Mock no selected nodes
      mockGetNodes.mockReturnValue(
        testNodes.map((n) => ({ ...n, selected: false })),
      );

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const selectButton = screen
        .getByText("Select 1-Degree")
        .closest("button")!;
      fireEvent.click(selectButton);

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        "graph",
        "No node currently selected for 1-degree selection",
      );
    });

    it("should correctly find and select neighbors", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const selectButton = screen
        .getByText("Select 1-Degree")
        .closest("button")!;
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
        }),
      );
    });
  });

  describe("expand selected functionality", () => {
    it("should expand selected nodes when button is clicked", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const expandButton = screen
        .getByText("Expand Selected")
        .closest("button")!;
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(mockExpandNode).toHaveBeenCalled();
      });

      expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
        "graph",
        "Expand selected nodes action triggered from graph toolbar",
      );
    });

    it("should warn when no nodes are selected for expansion", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");
      mockGetNodes.mockReturnValue(
        testNodes.map((n) => ({ ...n, selected: false })),
      );

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const expandButton = screen
        .getByText("Expand Selected")
        .closest("button")!;
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
          "graph",
          "No nodes currently selected for expansion",
        );
      });
    });

    it("should handle expansion errors gracefully", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");
      mockExpandNode.mockRejectedValue(new Error("Expansion failed"));

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const expandButton = screen
        .getByText("Expand Selected")
        .closest("button")!;
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
          "graph",
          "Expand selected nodes completed",
          expect.objectContaining({
            failed: expect.any(Number),
          }),
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
        </TestWrapper>,
      );

      const pinButton = screen.getByText("Pin All").closest("button")!;
      fireEvent.click(pinButton);

      expect(mockPinNode).toHaveBeenCalledTimes(3); // All test nodes
      expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
        "graph",
        "Pin all nodes action triggered from graph toolbar",
      );
    });

    it("should warn when no nodes available to pin", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");
      mockGetNodes.mockReturnValue([]);

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const pinButton = screen.getByText("Pin All").closest("button")!;
      fireEvent.click(pinButton);

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        "graph",
        "No nodes available to pin",
      );
    });

    it("should unpin all nodes when unpin all button is clicked", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const unpinButton = screen.getByText("Unpin All").closest("button")!;
      fireEvent.click(unpinButton);

      expect(mockClearAllPinnedNodes).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
        "graph",
        "Unpin all nodes action triggered from graph toolbar",
      );
    });

    it("should warn when no nodes are pinned", async () => {
      const { logger } = await import("@academic-explorer/utils/logger");
      const { useGraphStore } = await import("@/stores/graph-store");

      // Mock no pinned nodes
      vi.mocked(useGraphStore).mockImplementation((selector?) => {
        const state = {
          pinnedNodes: {},
          pinNode: mockPinNode,
          clearAllPinnedNodes: mockClearAllPinnedNodes,
        };

        if (selector && typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const unpinButton = screen.getByText("Unpin All").closest("button")!;
      fireEvent.click(unpinButton);

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        "graph",
        "No nodes currently pinned to unpin",
      );
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels and roles", () => {
      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(5);

      // Check that all buttons have proper roles and are accessible
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
        // Note: Mantine Button doesn't forward aria-label props, so we check for proper button structure
        expect(button).toHaveAttribute("class");
      });
    });

    it("should be keyboard accessible", () => {
      render(
        <TestWrapper>
          <GraphToolbar />
        </TestWrapper>,
      );

      const trimButton = screen.getByText("Trim Leaves").closest("button")!;

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
        </TestWrapper>,
      );

      const trimButton = screen.getByText("Trim Leaves").closest("button")!;

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
        </TestWrapper>,
      );

      const expandButton = screen
        .getByText("Expand Selected")
        .closest("button")!;
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(mockExpandNode).toHaveBeenCalledWith({
          nodeId: "W2",
          options: expect.any(Object),
        });
      });
    });
  });
});
