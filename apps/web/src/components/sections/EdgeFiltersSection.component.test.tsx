/**
 * @vitest-environment jsdom
 */

/**
 * Component tests for EdgeFiltersSection direction filter
 * User Story 3 (T046): Verify direction filter toggle functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { EdgeFiltersSection, filterByDirection, type EdgeDirectionFilter } from "./EdgeFiltersSection";
import { RelationType, type GraphEdge } from "@academic-explorer/graph";

// Helper to render component with Mantine provider
const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

// Mock dependencies
vi.mock("@/stores/graph-store", () => ({
  useGraphStore: () => ({
    visibleEdgeTypes: {
      [RelationType.AUTHORSHIP]: true,
      [RelationType.AFFILIATION]: true,
      [RelationType.PUBLICATION]: true,
      [RelationType.REFERENCE]: true,
      [RelationType.FUNDED_BY]: false,
      [RelationType.HOST_ORGANIZATION]: false,
      [RelationType.LINEAGE]: false,
    },
    edgeTypeStats: {
      visible: 100,
      total: 150,
      [RelationType.AUTHORSHIP]: { visible: 20, total: 30 },
      [RelationType.AFFILIATION]: { visible: 15, total: 20 },
      [RelationType.PUBLICATION]: { visible: 10, total: 15 },
      [RelationType.REFERENCE]: { visible: 55, total: 85 },
      [RelationType.FUNDED_BY]: { visible: 0, total: 0 },
      [RelationType.HOST_ORGANIZATION]: { visible: 0, total: 0 },
      [RelationType.LINEAGE]: { visible: 0, total: 0 },
    },
    toggleEdgeTypeVisibility: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-theme-colors", () => ({
  useThemeColors: () => ({
    colors: {
      primary: "#000",
      secondary: "#fff",
    },
  }),
}));

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}));

describe("EdgeFiltersSection - Direction Filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI Rendering", () => {
    it("should render direction filter section", () => {
      renderWithMantine(<EdgeFiltersSection />);

      // Check for section title
      expect(screen.getByText("Edge Direction")).toBeInTheDocument();

      // Check for direction options - use getAllByText since text appears multiple times
      expect(screen.getAllByText("Outbound").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Inbound").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Both").length).toBeGreaterThan(0);
    });

    it("should display direction filter description", () => {
      renderWithMantine(<EdgeFiltersSection />);

      expect(
        screen.getByText("Filter edges by their data ownership direction:")
      ).toBeInTheDocument();
      expect(screen.getByText("- Data stored on source entity")).toBeInTheDocument();
      expect(
        screen.getByText("- Data discovered via reverse lookup")
      ).toBeInTheDocument();
    });

    it("should show 'Both' as default filter", () => {
      renderWithMantine(<EdgeFiltersSection />);

      expect(screen.getByText("All Directions")).toBeInTheDocument();
    });
  });

  describe("Direction Filter Toggle", () => {
    it("should update filter when Outbound is clicked", async () => {
      const user = userEvent.setup();
      renderWithMantine(<EdgeFiltersSection />);

      // Get the Outbound button from SegmentedControl (second occurrence)
      const outboundButtons = screen.getAllByText("Outbound");
      await user.click(outboundButtons[outboundButtons.length - 1]);

      // Check that the filter badge updates
      expect(screen.getByText("outbound")).toBeInTheDocument();
    });

    it("should update filter when Inbound is clicked", async () => {
      const user = userEvent.setup();
      renderWithMantine(<EdgeFiltersSection />);

      // Get the Inbound button from SegmentedControl (second occurrence)
      const inboundButtons = screen.getAllByText("Inbound");
      await user.click(inboundButtons[inboundButtons.length - 1]);

      // Check that the filter badge updates
      expect(screen.getByText("inbound")).toBeInTheDocument();
    });

    it("should update filter when Both is clicked", async () => {
      const user = userEvent.setup();
      renderWithMantine(<EdgeFiltersSection />);

      // First click outbound
      const outboundButtons = screen.getAllByText("Outbound");
      await user.click(outboundButtons[outboundButtons.length - 1]);

      // Then click both
      const bothButton = screen.getByText("Both");
      await user.click(bothButton);

      // Check that the filter badge updates
      expect(screen.getByText("All Directions")).toBeInTheDocument();
    });

    it("should toggle between all three filter states", async () => {
      const user = userEvent.setup();
      renderWithMantine(<EdgeFiltersSection />);

      // Start with Both (default)
      expect(screen.getByText("All Directions")).toBeInTheDocument();

      // Click Outbound
      const outboundButtons = screen.getAllByText("Outbound");
      await user.click(outboundButtons[outboundButtons.length - 1]);
      expect(screen.getByText("outbound")).toBeInTheDocument();

      // Click Inbound
      const inboundButtons = screen.getAllByText("Inbound");
      await user.click(inboundButtons[inboundButtons.length - 1]);
      expect(screen.getByText("inbound")).toBeInTheDocument();

      // Click Both
      await user.click(screen.getByText("Both"));
      expect(screen.getByText("All Directions")).toBeInTheDocument();
    });
  });

  describe("filterByDirection() Function", () => {
    const createTestEdge = (
      id: string,
      direction?: "outbound" | "inbound"
    ): GraphEdge => ({
      id,
      source: "A1",
      target: "B1",
      type: RelationType.AUTHORSHIP,
      direction,
    });

    it("should return all edges when direction is 'both'", () => {
      const edges: GraphEdge[] = [
        createTestEdge("E1", "outbound"),
        createTestEdge("E2", "inbound"),
        createTestEdge("E3", "outbound"),
      ];

      const filtered = filterByDirection(edges, "both");

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(edges);
    });

    it("should filter to only outbound edges", () => {
      const edges: GraphEdge[] = [
        createTestEdge("E1", "outbound"),
        createTestEdge("E2", "inbound"),
        createTestEdge("E3", "outbound"),
        createTestEdge("E4", "inbound"),
      ];

      const filtered = filterByDirection(edges, "outbound");

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.direction === "outbound")).toBe(true);
      expect(filtered.map((e) => e.id)).toEqual(["E1", "E3"]);
    });

    it("should filter to only inbound edges", () => {
      const edges: GraphEdge[] = [
        createTestEdge("E1", "outbound"),
        createTestEdge("E2", "inbound"),
        createTestEdge("E3", "outbound"),
        createTestEdge("E4", "inbound"),
      ];

      const filtered = filterByDirection(edges, "inbound");

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.direction === "inbound")).toBe(true);
      expect(filtered.map((e) => e.id)).toEqual(["E2", "E4"]);
    });

    it("should treat edges without direction field as outbound (legacy fallback)", () => {
      const edges: GraphEdge[] = [
        createTestEdge("E1", "outbound"),
        createTestEdge("E2"), // No direction field
        createTestEdge("E3", "inbound"),
        createTestEdge("E4"), // No direction field
      ];

      const filtered = filterByDirection(edges, "outbound");

      // Should include explicit outbound + legacy edges without direction
      expect(filtered).toHaveLength(3);
      expect(filtered.map((e) => e.id)).toEqual(["E1", "E2", "E4"]);
    });

    it("should return empty array when no edges match filter", () => {
      const edges: GraphEdge[] = [
        createTestEdge("E1", "outbound"),
        createTestEdge("E2", "outbound"),
      ];

      const filtered = filterByDirection(edges, "inbound");

      expect(filtered).toHaveLength(0);
    });

    it("should handle empty edge array", () => {
      const edges: GraphEdge[] = [];

      const filtered = filterByDirection(edges, "outbound");

      expect(filtered).toHaveLength(0);
    });
  });

  describe("Performance", () => {
    it("should handle large edge arrays efficiently", () => {
      const edges: GraphEdge[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `E${i}`,
        source: `A${i}`,
        target: `B${i}`,
        type: RelationType.AUTHORSHIP,
        direction: i % 2 === 0 ? "outbound" : "inbound",
      }));

      const startTime = performance.now();
      const filtered = filterByDirection(edges, "outbound");
      const endTime = performance.now();

      // Should filter correctly
      expect(filtered).toHaveLength(500);

      // Should be fast (< 10ms for 1000 edges)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10);
    });
  });
});
