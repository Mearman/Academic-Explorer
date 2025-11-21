/**
 * Performance tests for work → keyword relationship detection
 * Validates performance requirements for T025-T034: Work Keywords User Story
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

describe("Work Keywords Relationships - Performance", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeKeywordsForWork performance", () => {
    it("should process 50 keywords in under 50ms", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Research Paper with Many Keywords",
        keywords: Array.from({ length: 50 }, (_, i) => ({
          id: `K${String(i).padStart(9, "0")}`,
          display_name: `Research Keyword ${i + 1}`,
          score: Math.random(),
        })),
      };

      const existingNodes: GraphNode[] = workData.keywords?.map((keyword, i) =>
        createTestGraphNode({
          id: keyword.id,
          entityId: keyword.id,
          entityType: "keywords",
          label: keyword.display_name,
          x: i * 30,
          y: i * 30,
        })
      ) || [];

      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(relationships).toHaveLength(50);

      // Verify all relationships were created correctly
      relationships.forEach((rel, index) => {
        expect(rel).toMatchObject({
          sourceNodeId: "W123456789",
          relationType: "work_has_keyword",
          direction: "outbound",
          label: "has keyword",
        });
        expect(rel.metadata).toHaveProperty("keywordDisplayName");
        expect(rel.metadata).toHaveProperty("keywordScore");
      });
    });

    it("should handle 500 keywords in under 500ms", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Massive Keyword Analysis Paper",
        keywords: Array.from({ length: 500 }, (_, i) => ({
          id: `K${String(i).padStart(9, "0")}`,
          display_name: `Extensive Research Term ${i + 1}`,
          score: Math.random(),
        })),
      };

      const existingNodes: GraphNode[] = workData.keywords?.slice(0, 100).map((keyword, i) =>
        createTestGraphNode({
          id: keyword.id,
          entityId: keyword.id,
          entityType: "keywords",
          label: keyword.display_name,
          x: i * 20,
          y: i * 20,
        })
      ) || [];

      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(relationships).toHaveLength(100); // Only 100 keywords exist in nodes
    });

    it("should handle repeated calls efficiently", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Performance Test Work",
        keywords: Array.from({ length: 25 }, (_, i) => ({
          id: `K${String(i).padStart(9, "0")}`,
          display_name: `Test Keyword ${i + 1}`,
          score: Math.random(),
        })),
      };

      const existingNodes: GraphNode[] = workData.keywords?.map((keyword, i) =>
        createTestGraphNode({
          id: keyword.id,
          entityId: keyword.id,
          entityType: "keywords",
          label: keyword.display_name,
          x: i * 25,
          y: i * 25,
        })
      ) || [];

      const durations: number[] = [];

      // Act - Run multiple times and measure consistency
      for (let i = 0; i < 10; i++) {
        const relationships: any[] = [];
        const startTime = performance.now();
        service["analyzeKeywordsForWork"]({
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

      expect(avgDuration).toBeLessThan(25); // Average should be fast
      expect(maxDuration - minDuration).toBeLessThan(15); // Should be consistent
      expect(durations.every(d => d < 50)).toBe(true); // All should be under 50ms
    });

    it("should handle memory efficiently with large keyword arrays", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Memory Test Work",
        keywords: Array.from({ length: 300 }, (_, i) => ({
          id: `K${String(i).padStart(9, "0")}`,
          display_name: `Memory Test Keyword ${i + 1}`,
          score: Math.random(),
        })),
      };

      const existingNodes: GraphNode[] = workData.keywords?.slice(0, 50).map((keyword, i) =>
        createTestGraphNode({
          id: keyword.id,
          entityId: keyword.id,
          entityType: "keywords",
          label: keyword.display_name,
          x: i * 25,
          y: i * 25,
        })
      ) || [];

      // Measure memory before and after
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeKeywordsForWork"]({
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
      expect(memoryIncrease).toBeLessThan(512 * 1024); // Less than 512KB increase
      expect(relationships).toHaveLength(50); // Only 50 keywords exist in nodes
    });

    it("should gracefully handle malformed keyword data", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Malformed Data Test",
        keywords: Array.from({ length: 100 }, (_, i) => {
          // Create some malformed keywords
          if (i % 3 === 0) {
            return null as any;
          }
          if (i % 3 === 1) {
            return { missing: "fields" } as any;
          }
          return {
            id: `K${String(i).padStart(9, "0")}`,
            display_name: `Valid Keyword ${i + 1}`,
            score: Math.random(),
          };
        }).filter(Boolean),
      };

      const existingNodes: GraphNode[] = [];
      const relationships: any[] = [];

      // Act & Assert - Should not throw
      expect(() => {
        const startTime = performance.now();
        service["analyzeKeywordsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
        const endTime = performance.now();

        const duration = endTime - startTime;
        expect(duration).toBeLessThan(50); // Should complete quickly even with malformed data
      }).not.toThrow();
    });

    it("should handle high keyword scores efficiently", () => {
      // Arrange - Test with keywords that have very high scores
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "High Scoring Keywords Test",
        keywords: Array.from({ length: 100 }, (_, i) => ({
          id: `K${String(i).padStart(9, "0")}`,
          display_name: `High Score Keyword ${i + 1}`,
          score: 0.95 + Math.random() * 0.05, // All scores between 0.95 and 1.0
        })),
      };

      const existingNodes: GraphNode[] = workData.keywords?.map((keyword, i) =>
        createTestGraphNode({
          id: keyword.id,
          entityId: keyword.id,
          entityType: "keywords",
          label: keyword.display_name,
          x: i * 15,
          y: i * 15,
        })
      ) || [];

      const relationships: any[] = [];

      // Act
      const startTime = performance.now();
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(relationships).toHaveLength(100);

      // Verify all high scores are preserved correctly
      relationships.forEach((rel) => {
        expect(rel.metadata.keywordScore).toBeGreaterThanOrEqual(0.95);
        expect(rel.metadata.keywordScore).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe("detectRelationshipsForNodes performance with keywords", () => {
    it("should detect relationships for multiple works with keywords efficiently", async () => {
      // Arrange
      const workIds = Array.from({ length: 10 }, (_, i) => `W${String(123456789 + i).padStart(9, "0")}`);
      const existingNodes: GraphNode[] = Array.from({ length: 100 }, (_, i) =>
        createTestGraphNode({
          id: `K${String(i).padStart(9, "0")}`,
          entityId: `K${String(i).padStart(9, "0")}`,
          entityType: "keywords",
          label: `Keyword ${i + 1}`,
          x: i * 10,
          y: i * 10,
        })
      );

      // Act
      const startTime = performance.now();
      const relationships = await service.detectRelationshipsForNodes(workIds, existingNodes);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(relationships).toBeDefined();
    });
  });
});