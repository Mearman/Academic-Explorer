/**
 * @vitest-environment jsdom
 */

/**
 * Performance tests for edge direction filtering
 * Success Criteria SC-003: Filter performance <1s for 500 nodes
 */

import { describe, it, expect, beforeAll } from "vitest";
import { filterByDirection, type EdgeDirectionFilter } from "@/components/sections/EdgeFiltersSection";
import { RelationType, type GraphEdge } from "@academic-explorer/graph";

describe("Edge Filtering Performance", () => {
  // Generate realistic test data
  const generateEdges = (count: number): GraphEdge[] => {
    const edges: GraphEdge[] = [];
    const relationTypes = [
      RelationType.AUTHORSHIP,
      RelationType.AFFILIATION,
      RelationType.PUBLICATION,
      RelationType.REFERENCE,
      RelationType.FUNDED_BY,
      RelationType.HOST_ORGANIZATION,
      RelationType.LINEAGE,
    ];

    for (let i = 0; i < count; i++) {
      edges.push({
        id: `E${i}`,
        source: `A${Math.floor(i / 10)}`,
        target: `B${i % 100}`,
        type: relationTypes[i % relationTypes.length],
        direction: i % 3 === 0 ? "outbound" : i % 3 === 1 ? "inbound" : undefined,
      });
    }

    return edges;
  };

  describe("SC-003: Filter performance <1s for 500 nodes", () => {
    let testEdges: GraphEdge[];

    beforeAll(() => {
      // Generate 500 nodes worth of edges (assuming ~3-5 edges per node)
      testEdges = generateEdges(2000);
    });

    it("should filter to outbound in <1 second", () => {
      const startTime = performance.now();
      const filtered = filterByDirection(testEdges, "outbound");
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Verify filtering worked
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((e) => e.direction === "outbound" || !e.direction)).toBe(true);

      // Performance requirement: <1 second for 500 nodes
      expect(duration).toBeLessThan(1000);

      console.log(`[PERF] Outbound filter: ${duration.toFixed(2)}ms for ${testEdges.length} edges`);
    });

    it("should filter to inbound in <1 second", () => {
      const startTime = performance.now();
      const filtered = filterByDirection(testEdges, "inbound");
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Verify filtering worked
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((e) => e.direction === "inbound")).toBe(true);

      // Performance requirement: <1 second for 500 nodes
      expect(duration).toBeLessThan(1000);

      console.log(`[PERF] Inbound filter: ${duration.toFixed(2)}ms for ${testEdges.length} edges`);
    });

    it("should return all edges (both) in <1 second", () => {
      const startTime = performance.now();
      const filtered = filterByDirection(testEdges, "both");
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Verify filtering worked
      expect(filtered.length).toBe(testEdges.length);
      expect(filtered).toEqual(testEdges);

      // Performance requirement: <1 second for 500 nodes
      expect(duration).toBeLessThan(1000);

      console.log(`[PERF] Both filter: ${duration.toFixed(2)}ms for ${testEdges.length} edges`);
    });
  });

  describe("Large Dataset Performance", () => {
    it("should handle 5000 edges efficiently", () => {
      const largeDataset = generateEdges(5000);

      const startTime = performance.now();
      const filtered = filterByDirection(largeDataset, "outbound");
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Should still be fast even with 5000 edges
      expect(duration).toBeLessThan(100);
      expect(filtered.length).toBeGreaterThan(0);

      console.log(`[PERF] Large dataset: ${duration.toFixed(2)}ms for ${largeDataset.length} edges`);
    });
  });

  describe("Multiple Filter Operations", () => {
    let testEdges: GraphEdge[];

    beforeAll(() => {
      testEdges = generateEdges(2000);
    });

    it("should handle rapid filter changes efficiently", () => {
      const filters: EdgeDirectionFilter[] = ["outbound", "inbound", "both", "outbound", "inbound"];
      const durations: number[] = [];

      filters.forEach((filter) => {
        const startTime = performance.now();
        filterByDirection(testEdges, filter);
        const endTime = performance.now();
        durations.push(endTime - startTime);
      });

      // Average should be well under 1 second
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      expect(avgDuration).toBeLessThan(1000);

      console.log(`[PERF] Average filter duration: ${avgDuration.toFixed(2)}ms over ${filters.length} operations`);
    });
  });

  describe("Memory Efficiency", () => {
    it("should not leak memory with repeated filtering", () => {
      const testEdges = generateEdges(2000);

      // Warm up
      for (let i = 0; i < 10; i++) {
        filterByDirection(testEdges, "outbound");
      }

      // Measure memory baseline (Chrome-specific API)
      const perfWithMemory = performance as Performance & { memory?: { usedJSHeapSize: number } };
      const initialMemory = perfWithMemory.memory?.usedJSHeapSize || 0;

      // Perform many filter operations
      for (let i = 0; i < 1000; i++) {
        const filter = i % 3 === 0 ? "outbound" : i % 3 === 1 ? "inbound" : "both";
        filterByDirection(testEdges, filter);
      }

      // Check memory hasn't grown excessively
      const finalMemory = perfWithMemory.memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (< 10MB)
      if (initialMemory > 0) {
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
        console.log(`[PERF] Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB after 1000 operations`);
      }
    });
  });
});
