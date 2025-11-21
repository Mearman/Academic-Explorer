/**
 * Performance tests for entity → topic relationship detection
 * Validates performance requirements for T043-T056: Entity Topics User Stories
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

describe("Entity Topics Relationships - Performance", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeTopicRelationshipsForEntity performance", () => {
    it("should process 25 topics in under 25ms", () => {
      // Arrange
      const authorData: MinimalEntityData = {
        id: "A123456789",
        entityType: "authors",
        display_name: "Author with Many Topics",
        topics: Array.from({ length: 25 }, (_, i) => ({
          id: `T${String(i).padStart(9, "0")}`,
          display_name: `Research Topic ${i + 1}`,
          score: Math.random(),
          count: Math.floor(Math.random() * 100) + 1,
          subfield: {
            id: `S${String(i).padStart(4, "0")}`,
            display_name: `Subfield ${i + 1}`,
          },
          field: {
            id: `F${String(i).padStart(4, "0")}`,
            display_name: `Field ${i + 1}`,
          },
          domain: {
            id: `D${String(Math.floor(i / 5)).padStart(1, "0")}`,
            display_name: `Domain ${Math.floor(i / 5) + 1}`,
          },
        })),
      };

      const existingNodes: GraphNode[] = authorData.topics?.map((topic, i) =>
        createTestGraphNode({
          id: topic.id,
          entityId: topic.id,
          entityType: "topics",
          label: topic.display_name,
          x: i * 20,
          y: i * 20,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData: authorData,
        entityType: "authors",
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(25);
      expect(result).toHaveLength(25);

      // Verify all relationships were created correctly
      result.forEach((rel, index) => {
        expect(rel).toMatchObject({
          sourceNodeId: "A123456789",
          relationType: "TOPIC",
          direction: "outbound",
          label: "research topic",
        });
        expect(rel.metadata).toHaveProperty("count");
        expect(rel.metadata).toHaveProperty("score");
      });
    });

    it("should handle 100 topics in under 100ms", () => {
      // Arrange
      const institutionData: MinimalEntityData = {
        id: "I123456789",
        entityType: "institutions",
        display_name: "Large Research Institution",
        topics: Array.from({ length: 100 }, (_, i) => ({
          id: `T${String(i).padStart(9, "0")}`,
          display_name: `Institutional Topic ${i + 1}`,
          score: Math.random(),
          count: Math.floor(Math.random() * 500) + 50,
        })),
      };

      const existingNodes: GraphNode[] = institutionData.topics?.slice(0, 75).map((topic, i) =>
        createTestGraphNode({
          id: topic.id,
          entityId: topic.id,
          entityType: "topics",
          label: topic.display_name,
          x: i * 10,
          y: i * 10,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData: institutionData,
        entityType: "institutions",
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(result).toHaveLength(75); // Only 75 topics exist in nodes
    });

    it("should handle repeated calls efficiently", () => {
      // Arrange
      const sourceData: MinimalEntityData = {
        id: "S123456789",
        entityType: "sources",
        display_name: "Performance Test Source",
        topics: Array.from({ length: 50 }, (_, i) => ({
          id: `T${String(i).padStart(9, "0")}`,
          display_name: `Journal Topic ${i + 1}`,
          score: Math.random(),
          count: Math.floor(Math.random() * 200) + 10,
        })),
      };

      const existingNodes: GraphNode[] = sourceData.topics?.map((topic, i) =>
        createTestGraphNode({
          id: topic.id,
          entityId: topic.id,
          entityType: "topics",
          label: topic.display_name,
          x: i * 15,
          y: i * 15,
        })
      ) || [];

      const durations: number[] = [];

      // Act - Run multiple times and measure consistency
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        service["analyzeTopicRelationshipsForEntity"]({
          entityData: sourceData,
          entityType: "sources",
          existingNodes,
        });
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Assert
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeLessThan(10); // Average should be fast
      expect(maxDuration - minDuration).toBeLessThan(10); // Should be consistent
      expect(durations.every(d => d < 25)).toBe(true); // All should be under 25ms
    });

    it("should handle memory efficiently with large topic arrays", () => {
      // Arrange
      const authorData: MinimalEntityData = {
        id: "A123456789",
        entityType: "authors",
        display_name: "Memory Test Author",
        topics: Array.from({ length: 200 }, (_, i) => ({
          id: `T${String(i).padStart(9, "0")}`,
          display_name: `Memory Test Topic ${i + 1}`,
          score: Math.random(),
          count: Math.floor(Math.random() * 1000) + 1,
          subfield: {
            id: `S${String(i).padStart(4, "0")}`,
            display_name: `Subfield ${i + 1}`,
          },
          field: {
            id: `F${String(Math.floor(i / 10)).padStart(4, "0")}`,
            display_name: `Field ${Math.floor(i / 10) + 1}`,
          },
          domain: {
            id: `D${String(Math.floor(i / 50)).padStart(1, "0")}`,
            display_name: `Domain ${Math.floor(i / 50) + 1}`,
          },
        })),
      };

      const existingNodes: GraphNode[] = authorData.topics?.slice(0, 100).map((topic, i) =>
        createTestGraphNode({
          id: topic.id,
          entityId: topic.id,
          entityType: "topics",
          label: topic.display_name,
          x: i * 8,
          y: i * 8,
        })
      ) || [];

      // Measure memory before and after
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Act
      const startTime = performance.now();
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData: authorData,
        entityType: "authors",
        existingNodes,
      });
      const endTime = performance.now();
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Assert
      const duration = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      expect(duration).toBeLessThan(50);
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
      expect(result).toHaveLength(100); // Only 100 topics exist in nodes
    });

    it("should gracefully handle malformed topic data", () => {
      // Arrange
      const authorData: MinimalEntityData = {
        id: "A123456789",
        entityType: "authors",
        display_name: "Malformed Data Test",
        topics: Array.from({ length: 100 }, (_, i) => {
          // Create some malformed topics
          if (i % 4 === 0) {
            return null as any;
          }
          if (i % 4 === 1) {
            return { missing: "fields" } as any;
          }
          return {
            id: `T${String(i).padStart(9, "0")}`,
            display_name: `Valid Topic ${i + 1}`,
            score: Math.random(),
            count: Math.floor(Math.random() * 100) + 1,
          };
        }).filter(Boolean),
      };

      const existingNodes: GraphNode[] = [];
      const validTopics = authorData.topics?.filter((topic): topic is { id: string; display_name: string } =>
        topic && typeof topic === 'object' && 'id' in topic && 'display_name' in topic
      ) || [];

      existingNodes.push(...validTopics.map((topic, i) =>
        createTestGraphNode({
          id: topic.id,
          entityId: topic.id,
          entityType: "topics",
          label: topic.display_name,
        })
      ));

      // Act & Assert - Should not throw
      expect(() => {
        const startTime = performance.now();
        const result = service["analyzeTopicRelationshipsForEntity"]({
          entityData: authorData,
          entityType: "authors",
          existingNodes,
        });
        const endTime = performance.now();

        const duration = endTime - startTime;
        expect(duration).toBeLessThan(25); // Should complete quickly even with malformed data
      }).not.toThrow();
    });

    it("should handle high topic scores efficiently", () => {
      // Arrange - Test with topics that have very high scores
      const institutionData: MinimalEntityData = {
        id: "I123456789",
        entityType: "institutions",
        display_name: "High Scoring Topics Institution",
        topics: Array.from({ length: 75 }, (_, i) => ({
          id: `T${String(i).padStart(9, "0")}`,
          display_name: `High Score Topic ${i + 1}`,
          score: 0.95 + Math.random() * 0.05, // All scores between 0.95 and 1.0
          count: Math.floor(Math.random() * 1000) + 100,
        })),
      };

      const existingNodes: GraphNode[] = institutionData.topics?.map((topic, i) =>
        createTestGraphNode({
          id: topic.id,
          entityId: topic.id,
          entityType: "topics",
          label: topic.display_name,
          x: i * 10,
          y: i * 10,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData: institutionData,
        entityType: "institutions",
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(result).toHaveLength(75);

      // Verify all high scores are preserved correctly
      result.forEach((rel) => {
        expect(rel.metadata?.score).toBeGreaterThanOrEqual(0.95);
        expect(rel.metadata?.score).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe("detectRelationshipsForNodes performance with topics", () => {
    it("should detect topic relationships for multiple entities efficiently", async () => {
      // Arrange
      const authorIds = Array.from({ length: 5 }, (_, i) => `A${String(123456789 + i).padStart(9, "0")}`);
      const existingNodes: GraphNode[] = Array.from({ length: 50 }, (_, i) =>
        createTestGraphNode({
          id: `T${String(i).padStart(9, "0")}`,
          entityId: `T${String(i).padStart(9, "0")}`,
          entityType: "topics",
          label: `Topic ${i + 1}`,
          x: i * 5,
          y: i * 5,
        })
      );

      // Act
      const startTime = performance.now();
      const relationships = await service.detectRelationshipsForNodes(authorIds);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(relationships).toBeDefined();
    });
  });
});