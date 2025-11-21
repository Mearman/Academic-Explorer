/**
 * Performance tests for work → funder relationship detection
 * Validates performance requirements for T022-T032: Work Funding User Story
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import type { GraphNode, MinimalEntityData } from "@/services/relationship-detection-service";

// Mock logger to avoid console noise during performance tests
vi.mock("@academic-explorer/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  __esModule: true,
}));

describe("Work Funding Relationships - Performance", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeGrantsForWork performance", () => {
    it("should process 100 grants in under 100ms", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Large Research Project",
        grants: Array.from({ length: 100 }, (_, i) => ({
          funder: `https://openalex.org/F${String(i).padStart(10, "0")}`,
          funder_display_name: `Funding Organization ${i + 1}`,
          award_id: `AWARD-${String(i).padStart(6, "0")}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.grants?.map((grant, i): GraphNode =>
        createTestGraphNode({
          id: `F${String(i).padStart(10, "0")}`,
          entityId: grant.funder,
          entityType: "funders",
          label: grant.funder_display_name,
          x: i * 50,
          y: i * 50,
        })
      ) || [];

      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(relationships).toHaveLength(100);

      // Verify all relationships were created correctly
      relationships.forEach((rel, index) => {
        expect(rel).toMatchObject({
          sourceNodeId: "W123456789",
          relationType: "funded_by",
          direction: "outbound",
          label: "funded by",
        });
        expect(rel.metadata).toHaveProperty("funderDisplayName");
        expect(rel.metadata).toHaveProperty("awardId");
      });
    });

    it("should handle 1000 grants in under 1s", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Massive Research Initiative",
        grants: Array.from({ length: 1000 }, (_, i) => ({
          funder: `https://openalex.org/F${String(i).padStart(10, "0")}`,
          funder_display_name: `Large Foundation ${i + 1}`,
          award_id: `LARGE-AWARD-${String(i).padStart(6, "0")}`,
        })),
      };

            const existingNodes: GraphNode[] = (workData.grants || []).slice(0, 100).map((grant, i) =>
    createTestGraphNode({
        id: `F${String(i).padStart(10, "0")}`,
        entityId: grant.funder,
        entityType: "funders",
        label: grant.funder_display_name,
      }));

      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(relationships).toHaveLength(100); // Only 100 funders exist in nodes
    });

    it("should handle repeated calls efficiently", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Performance Test Work",
        grants: Array.from({ length: 50 }, (_, i) => ({
          funder: `https://openalex.org/F${String(i).padStart(10, "0")}`,
          funder_display_name: `Foundation ${i + 1}`,
          award_id: `PERF-${String(i).padStart(3, "0")}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.grants?.map((grant, i): GraphNode =>
        createTestGraphNode({
          id: `F${String(i).padStart(10, "0")}`,
          entityId: grant.funder,
          entityType: "funders",
          label: grant.funder_display_name,
          x: i * 30,
          y: i * 30,
        })
      ) || [];

      const durations: number[] = [];

      // Act - Run multiple times and measure consistency
      for (let i = 0; i < 10; i++) {
        const relationships: any[] = [];
        const startTime = performance.now();
        service["analyzeGrantsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Assert
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeLessThan(50); // Average should be fast
      expect(maxDuration - minDuration).toBeLessThan(20); // Should be consistent
      expect(durations.every(d => d < 100)).toBe(true); // All should be under 100ms
    });

    it("should handle memory efficiently with large grant arrays", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Memory Test Work",
        grants: Array.from({ length: 500 }, (_, i) => ({
          funder: `https://openalex.org/F${String(i).padStart(10, "0")}`,
          funder_display_name: `Memory Test Foundation ${i + 1}`,
          award_id: `MEM-${String(i).padStart(6, "0")}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.grants?.slice(0, 50).map((grant, i): GraphNode => ({
        id: `F${String(i).padStart(10, "0")}`,
        entityId: grant.funder,
        entityType: "funders",
        label: grant.funder_display_name,
        color: "#4285F4",
        size: 25,
        x: i * 30,
        y: i * 30,
      }));

      // Measure memory before and after
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });
      const endTime = performance.now();
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Assert
      const duration = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      expect(duration).toBeLessThan(100);
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
      expect(relationships).toHaveLength(50); // Only 50 funders exist in nodes
    });

    it("should gracefully handle malformed grant data", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Malformed Data Test",
        grants: Array.from({ length: 100 }, (_, i) => {
          // Create some malformed grants
          if (i % 3 === 0) {
            return null as any;
          }
          if (i % 3 === 1) {
            return { missing: "fields" } as any;
          }
          return {
            funder: `https://openalex.org/F${String(i).padStart(10, "0")}`,
            funder_display_name: `Foundation ${i + 1}`,
            award_id: `MALFORMED-${String(i).padStart(3, "0")}`,
          };
        }).filter(Boolean),
      };

      const existingNodes: GraphNode[] = [];
      const relationships: any[] = [];

      // Act & Assert - Should not throw
      expect(() => {
        const startTime = performance.now();
        service["analyzeGrantsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
        const endTime = performance.now();

        const duration = endTime - startTime;
        expect(duration).toBeLessThan(50); // Should complete quickly even with malformed data
      }).not.toThrow();
    });
  });

  describe("detectRelationshipsForNodes performance with grants", () => {
    it("should detect relationships for multiple works with grants efficiently", async () => {
      // Arrange
      const workIds = Array.from({ length: 10 }, (_, i) => `W${String(123456789 + i).padStart(9, "0")}`);
      const existingNodes: GraphNode[] = Array.from({ length: 50 }, (_, i): GraphNode =>
        createTestGraphNode({
          id: `F${String(i).padStart(10, "0")}`,
          entityId: `https://openalex.org/F${String(i).padStart(10, "0")}`,
          entityType: "funders",
          label: `Foundation ${i + 1}`,
          x: i * 50,
          y: i * 50,
        })
      );

      // Act
      const startTime = performance.now();
      const relationships = await service.detectRelationshipsForNodes(workIds);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(relationships).toBeDefined();
    });
  });
});