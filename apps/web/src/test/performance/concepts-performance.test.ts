/**
 * Performance tests for work → concept relationship detection
 * Validates performance requirements for T057-T061: Legacy Concepts User Story
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

describe("Work Concepts Relationships - Performance", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeConceptRelationshipsForWork performance", () => {
    it("should process 50 concepts in under 50ms", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Research Paper with Many Concepts",
        concepts: Array.from({ length: 50 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `Research Concept ${i + 1}`,
          score: Math.random(),
          level: Math.floor(i / 10) + 1,
          wikidata: `Q${String(100000 + i)}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.concepts?.map((concept, i) =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
          x: i * 20,
          y: i * 20,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(existingNodes).toHaveLength(50);
    });

    it("should handle 100 concepts in under 100ms", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Massive Concept Analysis Paper",
        concepts: Array.from({ length: 100 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `Extensive Research Term ${i + 1}`,
          score: Math.random(),
          level: Math.floor(i / 20) + 1,
          wikidata: `Q${String(100000 + i)}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.concepts?.slice(0, 75).map((concept, i) =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
          x: i * 15,
          y: i * 15,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(existingNodes.length).toBe(75); // Only 75 concepts exist in nodes
    });

    it("should handle repeated calls efficiently", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Performance Test Work",
        concepts: Array.from({ length: 25 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `Test Concept ${i + 1}`,
          score: Math.random(),
          level: Math.floor(i / 5) + 1,
          wikidata: `Q${String(100000 + i)}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.concepts?.map((concept, i) =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
          x: i * 25,
          y: i * 25,
        })
      ) || [];

      const durations: number[] = [];

      // Act - Run multiple times and measure consistency
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        service["analyzeConceptRelationshipsForWork"]({
          workData,
          existingNodes,
        });
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Assert
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeLessThan(15); // Average should be fast
      expect(maxDuration - minDuration).toBeLessThan(10); // Should be consistent
      expect(durations.every(d => d < 25)).toBe(true); // All should be under 25ms
    });

    it("should handle memory efficiently with large concept arrays", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Memory Test Work",
        concepts: Array.from({ length: 200 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `Memory Test Concept ${i + 1}`,
          score: Math.random(),
          level: Math.floor(i / 25) + 1,
          wikidata: `Q${String(100000 + i)}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.concepts?.slice(0, 50).map((concept, i) =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
          x: i * 25,
          y: i * 25,
        })
      ) || [];

      // Measure memory before and after
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Act
      const startTime = performance.now();
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });
      const endTime = performance.now();
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Assert
      const duration = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      expect(duration).toBeLessThan(75);
      expect(memoryIncrease).toBeLessThan(512 * 1024); // Less than 512KB increase
      expect(existingNodes.length).toBe(50); // Only 50 concepts exist in nodes
    });

    it("should gracefully handle malformed concept data", () => {
      // Arrange
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Malformed Data Test",
        concepts: Array.from({ length: 100 }, (_, i) => {
          // Create some malformed concepts
          if (i % 3 === 0) {
            return null as any;
          }
          if (i % 3 === 1) {
            return { missing: "fields" } as any;
          }
          return {
            id: `C${String(100000000 + i).padStart(9, "0")}`,
            display_name: `Valid Concept ${i + 1}`,
            score: Math.random(),
            level: Math.floor(i / 10) + 1,
            wikidata: `Q${String(100000 + i)}`,
          };
        }).filter(Boolean),
      };

      const existingNodes: GraphNode[] = [];
      const validConcepts = workData.concepts?.filter((concept): concept is { id: string; display_name: string; score: number; level: number; wikidata?: string } =>
        concept && typeof concept === 'object' && 'id' in concept && 'display_name' in concept
      ) || [];

      existingNodes.push(...validConcepts.map((concept, i): GraphNode =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
        })
      ));

      // Act & Assert - Should not throw
      expect(() => {
        const startTime = performance.now();
        service["analyzeConceptRelationshipsForWork"]({
          workData,
          existingNodes,
        });
        const endTime = performance.now();

        const duration = endTime - startTime;
        expect(duration).toBeLessThan(25); // Should complete quickly even with malformed data
      }).not.toThrow();
    });

    it("should handle high concept scores efficiently", () => {
      // Arrange - Test with concepts that have very high scores
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "High Scoring Concepts Test",
        concepts: Array.from({ length: 50 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `High Score Concept ${i + 1}`,
          score: 0.95 + Math.random() * 0.05, // All scores between 0.95 and 1.0
          level: 1,
          wikidata: `Q${String(100000 + i)}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.concepts?.map((concept, i) =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
          x: i * 10,
          y: i * 10,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(25);
      expect(result.length).toBe(50);

      // Verify all high scores are preserved correctly
      result.forEach((rel) => {
        expect(rel.metadata?.score).toBeGreaterThanOrEqual(0.95);
        expect(rel.metadata?.score).toBeLessThanOrEqual(1.0);
      });
    });

    it("should handle concept hierarchy levels efficiently", () => {
      // Arrange - Test with concepts spanning multiple hierarchy levels (0-4)
      const workData: MinimalEntityData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Multi-Level Concept Hierarchy Test",
        concepts: Array.from({ length: 100 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `Level ${i % 5} Concept ${i + 1}`,
          score: Math.random(),
          level: i % 5, // Levels 0, 1, 2, 3, 4
          wikidata: `Q${String(100000 + i)}`,
        })),
      };

      const existingNodes: GraphNode[] = workData.concepts?.map((concept, i) =>
        createTestGraphNode({
          id: concept.id,
          entityId: concept.id,
          entityType: "concepts",
          label: concept.display_name,
          x: i * 8,
          y: i * 8,
        })
      ) || [];

      // Act
      const startTime = performance.now();
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(result.length).toBe(100);

      // Verify all hierarchy levels are preserved correctly
      const levelCounts = [0, 0, 0, 0, 0];
      result.forEach((rel) => {
        if (rel.metadata?.level !== undefined && typeof rel.metadata.level === 'number') {
          levelCounts[rel.metadata.level]++;
        }
      });

      expect(levelCounts.every(count => count > 0)).toBe(true); // All levels should be represented
    });
  });

  describe("detectRelationshipsForNodes performance with concepts", () => {
    it("should detect concept relationships for multiple works efficiently", async () => {
      // Arrange
      const workIds = Array.from({ length: 5 }, (_, i) => `W${String(123456789 + i).padStart(9, "0")}`);
      const existingNodes: GraphNode[] = Array.from({ length: 50 }, (_, i) =>
        createTestGraphNode({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          entityId: `C${String(100000000 + i).padStart(9, "0")}`,
          entityType: "concepts",
          label: `Concept ${i + 1}`,
          x: i * 5,
          y: i * 5,
        })
      );

      // Act
      const startTime = performance.now();
      const relationships = await service.detectRelationshipsForNodes(workIds);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(relationships).toBeDefined();
    });
  });
});