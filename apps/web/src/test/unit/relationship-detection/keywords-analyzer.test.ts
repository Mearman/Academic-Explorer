/**
 * Tests for work → keyword relationship analyzer
 * Covers T025-T034: Work Keywords User Story implementation
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import { RelationType } from "@academic-explorer/types";
import type { GraphNode, MinimalEntityData } from "@/services/relationship-detection-service";

describe("RelationshipDetectionService - Keywords Analyzer", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeKeywordsForWork", () => {
    let workData: MinimalEntityData;
    let existingNodes: GraphNode[];
    let relationships: any[];

    beforeEach(() => {
      workData = {
        id: "W123456789",
        entityType: "works",
        display_name: "Test Research Paper",
      };
      existingNodes = [];
      relationships = [];
    });

    it("should create work→keyword relationships for keywords", () => {
      // Arrange
      workData.keywords = [
        {
          id: "K123456789",
          display_name: "Machine Learning",
          score: 0.95,
        },
        {
          id: "K987654321",
          display_name: "Healthcare",
          score: 0.87,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Machine Learning",
        }),
        createTestGraphNode({
          id: "K987654321",
          entityId: "K987654321",
          entityType: "keywords",
          label: "Healthcare",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(2);

      // First keyword relationship
      expect(relationships[0]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "K123456789",
        relationType: RelationType.WORK_HAS_KEYWORD,
        direction: "outbound",
        label: "has keyword",
        metadata: {
          keywordDisplayName: "Machine Learning",
          keywordScore: 0.95,
        },
      });

      // Second keyword relationship
      expect(relationships[1]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "K987654321",
        relationType: RelationType.WORK_HAS_KEYWORD,
        direction: "outbound",
        label: "has keyword",
        metadata: {
          keywordDisplayName: "Healthcare",
          keywordScore: 0.87,
        },
      });
    });

    it("should handle keywords with missing scores", () => {
      // Arrange
      workData.keywords = [
        {
          id: "K123456789",
          display_name: "Machine Learning",
          score: undefined, // Explicitly set to undefined
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Machine Learning",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "K123456789",
        relationType: RelationType.WORK_HAS_KEYWORD,
        direction: "outbound",
        label: "has keyword",
        metadata: {
          keywordDisplayName: "Machine Learning",
          keywordScore: undefined, // Should handle missing score gracefully
        },
      });
    });

    it("should use display_name as fallback for keyword ID", () => {
      // Arrange
      workData.keywords = [
        {
          id: "", // Empty string for missing id
          display_name: "Artificial Intelligence",
          score: 0.92,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "Artificial Intelligence",
          entityId: "Artificial Intelligence",
          entityType: "keywords",
          label: "Artificial Intelligence",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "Artificial Intelligence",
        relationType: RelationType.WORK_HAS_KEYWORD,
        direction: "outbound",
        label: "has keyword",
        metadata: {
          keywordDisplayName: "Artificial Intelligence",
          keywordScore: 0.92,
        },
      });
    });

    it("should skip keywords for keywords not in existing nodes", () => {
      // Arrange
      workData.keywords = [
        {
          id: "K123456789",
          display_name: "Machine Learning",
          score: 0.95,
        },
        {
          id: "K999999999",
          display_name: "Unknown Keyword",
          score: 0.85,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Machine Learning",
        }),
        // Note: K999999999 is not in existingNodes
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1); // Only one keyword exists in nodes
      expect(relationships[0].targetNodeId).toBe("K123456789");
    });

    it("should handle missing keywords field gracefully", () => {
      // Arrange - workData.keywords is undefined
      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Machine Learning",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should handle empty keywords array gracefully", () => {
      // Arrange
      workData.keywords = [];
      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Machine Learning",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should skip keywords with invalid IDs", () => {
      // Arrange
      workData.keywords = [
        {
          id: "", // Empty keyword ID
          display_name: "Invalid Keyword",
          score: 0.5,
        },
        {
          id: "K123456789",
          display_name: "Valid Keyword",
          score: 0.9,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Valid Keyword",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1); // Only valid keyword processed
      expect(relationships[0].targetNodeId).toBe("K123456789");
    });

    it("should skip self-referencing keywords", () => {
      // Arrange
      workData.keywords = [
        {
          id: "W123456789", // Same as work ID
          display_name: "Self Reference",
          score: 1.0,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "W123456789",
          entityId: "W123456789",
          entityType: "works",
          label: "Test Research Paper",
        }),
      ];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0); // Self-reference skipped
    });

    it("should handle malformed keyword data gracefully", () => {
      // Arrange
      workData.keywords = [
        {
          id: "K123456789",
          display_name: "Valid Keyword",
          score: 0.9,
        },
        {
          // Missing required fields
        } as any,
        {
          id: "K987654321",
          display_name: "Another Valid Keyword",
          score: 0.85,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Valid Keyword",
        }),
        createTestGraphNode({
          id: "K987654321",
          entityId: "K987654321",
          entityType: "keywords",
          label: "Another Valid Keyword",
        }),
      ];

      // Act & Assert - Should not throw error
      expect(() => {
        service["analyzeKeywordsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
      }).not.toThrow();

      // Should still create valid relationships for well-formed keywords
      expect(relationships).toHaveLength(2); // Two well-formed keywords processed
    });
  });
});