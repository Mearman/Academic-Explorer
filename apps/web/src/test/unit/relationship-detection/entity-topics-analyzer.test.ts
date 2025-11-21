/**
 * Unit tests for entity → topic relationship analyzer
 * Covers T043-T048: Entity Topics User Stories 3-5 implementation
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import { RelationType } from "@academic-explorer/types";
import type { GraphNode, MinimalEntityData } from "@/services/relationship-detection-service";

describe("RelationshipDetectionService - Entity Topics Analyzer", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeTopicRelationshipsForEntity", () => {
    let entityData: MinimalEntityData;
    let existingNodes: GraphNode[];
    let relationships: any[];

    beforeEach(() => {
      entityData = {
        id: "A123456789",
        entityType: "authors",
        display_name: "Test Author",
      };
      existingNodes = [];
      relationships = [];
    });

    it("should create entity→topic relationships for authors", () => {
      // Arrange
      entityData.topics = [
        {
          id: "T10102",
          display_name: "Machine Learning",
          score: 0.9994,
          count: 23,
          subfield: {
            id: "S4210",
            display_name: "Artificial Intelligence",
          },
          field: {
            id: "F1234",
            display_name: "Computer Science",
          },
          domain: {
            id: "D1",
            display_name: "STEM",
          },
        },
        {
          id: "T10203",
          display_name: "Healthcare Research",
          score: 0.8756,
          count: 15,
          subfield: {
            id: "S4220",
            display_name: "Medical Sciences",
          },
          field: {
            id: "F1235",
            display_name: "Medicine",
          },
          domain: {
            id: "D2",
            display_name: "Health Sciences",
          },
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
        createTestGraphNode({
          id: "T10203",
          entityId: "T10203",
          entityType: "topics",
          label: "Healthcare Research",
        }),
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "authors",
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(2);

      // Check first topic relationship
      const mlRelation = result.find(rel => rel.targetNodeId === "T10102");
      expect(mlRelation).toMatchObject({
        sourceNodeId: "A123456789",
        targetNodeId: "T10102",
        relationType: RelationType.TOPIC,
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 23,
          score: 0.9994,
          subfield: { id: "S4210", display_name: "Artificial Intelligence" },
          field: { id: "F1234", display_name: "Computer Science" },
          domain: { id: "D1", display_name: "STEM" },
        },
      });

      // Check second topic relationship
      const healthcareRelation = result.find(rel => rel.targetNodeId === "T10203");
      expect(healthcareRelation).toMatchObject({
        sourceNodeId: "A123456789",
        targetNodeId: "T10203",
        relationType: RelationType.TOPIC,
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 15,
          score: 0.8756,
          subfield: { id: "S4220", display_name: "Medical Sciences" },
          field: { id: "F1235", display_name: "Medicine" },
          domain: { id: "D2", display_name: "Health Sciences" },
        },
      });
    });

    it("should handle entities with no topics", () => {
      // Arrange - entityData.topics is undefined
      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "authors",
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should handle empty topics array", () => {
      // Arrange
      entityData.topics = [];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "authors",
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should validate entityType - only process authors, sources, institutions", () => {
      // Arrange - works entity type
      entityData.entityType = "works";
      entityData.topics = [
        {
          id: "T10102",
          display_name: "Machine Learning",
          score: 0.95,
        },
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "works", // Not allowed
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should process sources entity type", () => {
      // Arrange
      entityData = {
        id: "S123456789", // Source ID
        entityType: "sources",
        display_name: "Test Source",
        topics: [
          {
            id: "T10102",
            display_name: "Machine Learning",
            score: 0.92,
            count: 156,
          },
        ],
      };

      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "sources",
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        sourceNodeId: "S123456789",
        targetNodeId: "T10102",
        relationType: RelationType.TOPIC,
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 156,
          score: 0.92,
        },
      });
    });

    it("should process institutions entity type", () => {
      // Arrange
      entityData = {
        id: "I123456789", // Institution ID
        entityType: "institutions",
        display_name: "Test Institution",
        topics: [
          {
            id: "T10102",
            display_name: "Machine Learning",
            score: 0.89,
            count: 342,
          },
        ],
      };

      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "institutions",
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        sourceNodeId: "I123456789",
        targetNodeId: "T10102",
        relationType: RelationType.TOPIC,
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 342,
          score: 0.89,
        },
      });
    });

    it("should skip topics for topics not in existing nodes", () => {
      // Arrange
      entityData.topics = [
        {
          id: "T10102",
          display_name: "Known Topic",
          score: 0.88,
          count: 45,
        },
        {
          id: "T999999999", // Non-existent topic
          display_name: "Unknown Topic",
          score: 0.75,
          count: 12,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Known Topic",
        }),
        // Note: T999999999 is not in existingNodes
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "authors",
        existingNodes,
      });

      // Assert - Only one relationship should be created (for existing topic)
      expect(result).toHaveLength(1);
      expect(result[0].targetNodeId).toBe("T10102");
    });

    it("should handle malformed topic data gracefully", () => {
      // Arrange
      entityData.topics = [
        {
          id: "T10102",
          display_name: "Valid Topic",
          score: 0.91,
          count: 28,
        },
        null as any, // null topic
        undefined as any, // undefined topic
        {
          id: "", // Empty string for missing id
          display_name: "Missing ID Topic",
          score: 0.85,
          count: 15,
        } as any,
      ];

      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Valid Topic",
        }),
      ];

      // Act & Assert - Should not throw error
      expect(() => {
        const result = service["analyzeTopicRelationshipsForEntity"]({
          entityData,
          entityType: "authors",
          existingNodes,
        });
        expect(result).toHaveLength(1); // Only valid topic processed
      }).not.toThrow();
    });

    it("should handle topics with minimal metadata", () => {
      // Arrange - Topic with only required fields
      entityData.topics = [
        {
          id: "T10102",
          display_name: "Minimal Topic",
          // Missing score, count, subfield, field, domain
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Minimal Topic",
        }),
      ];

      // Act
      const result = service["analyzeTopicRelationshipsForEntity"]({
        entityData,
        entityType: "authors",
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        sourceNodeId: "A123456789",
        targetNodeId: "T10102",
        relationType: RelationType.TOPIC,
        direction: "outbound",
        label: "research topic",
        metadata: {
          // Optional fields should be undefined when not provided
          count: undefined,
          score: undefined,
          subfield: undefined,
          field: undefined,
          domain: undefined,
        },
      });
    });
  });
});