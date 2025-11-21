/**
 * Unit tests for work → concept relationship analyzer
 * Covers T057-T061: Legacy Concepts User Story 6 implementation
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import { RelationType } from "@academic-explorer/types";
import type { GraphNode, MinimalEntityData } from "@/services/relationship-detection-service";

describe("RelationshipDetectionService - Concepts Analyzer", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeConceptRelationshipsForWork", () => {
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

    it("should create work→concept relationships for concepts", () => {
      // Arrange
      workData.concepts = [
        {
          id: "C123456789",
          display_name: "Machine Learning",
          score: 0.89,
          level: 2,
          wikidata: "Q8024",
        },
        {
          id: "C987654321",
          display_name: "Artificial Intelligence",
          score: 0.92,
          level: 1,
          wikidata: "Q11660",
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "C123456789",
          entityId: "C123456789",
          entityType: "concepts",
          label: "Machine Learning",
        }),
        createTestGraphNode({
          id: "C987654321",
          entityId: "C987654321",
          entityType: "concepts",
          label: "Artificial Intelligence",
        }),
      ];

      // Act
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(2);

      // Check first concept relationship
      const mlRelation = result.find(rel => rel.targetNodeId === "C123456789");
      expect(mlRelation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "C123456789",
        relationType: RelationType.CONCEPT,
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 2,
          score: 0.89,
          wikidata: "Q8024",
        },
      });

      // Check second concept relationship
      const aiRelation = result.find(rel => rel.targetNodeId === "C987654321");
      expect(aiRelation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "C987654321",
        relationType: RelationType.CONCEPT,
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 1,
          score: 0.92,
          wikidata: "Q11660",
        },
      });
    });

    it("should handle concepts with missing wikidata", () => {
      // Arrange
      workData.concepts = [
        {
          id: "C555666777",
          display_name: "Data Science",
          score: 0.87,
          level: 3,
          // Missing wikidata field
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "C555666777",
          entityId: "C555666777",
          entityType: "concepts",
          label: "Data Science",
        }),
      ];

      // Act
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });

      // Assert - Edge should be created with undefined wikidata
      expect(result).toHaveLength(1);

      const relation = result[0];
      expect(relation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "C555666777",
        relationType: RelationType.CONCEPT,
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 3,
          score: 0.87,
          wikidata: undefined, // Should preserve missing wikidata
        },
      });
    });

    it("should skip concepts for concepts not in existing nodes", () => {
      // Arrange
      workData.concepts = [
        {
          id: "C123456789",
          display_name: "Known Concept",
          score: 0.88,
          level: 2,
        },
        {
          id: "C999999999", // Non-existent concept
          display_name: "Unknown Concept",
          score: 0.75,
          level: 1,
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "C123456789",
          entityId: "C123456789",
          entityType: "concepts",
          label: "Known Concept",
        }),
        // Note: C999999999 is not in existingNodes
      ];

      // Act
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });

      // Assert - Only one relationship should be created (for existing concept)
      expect(result).toHaveLength(1);
      expect(result[0].targetNodeId).toBe("C123456789");
    });

    it("should handle work with no concepts", () => {
      // Arrange
      workData.concepts = []; // Empty concepts array

      existingNodes = [
        createTestGraphNode({
          id: "C123456789",
          entityId: "C123456789",
          entityType: "concepts",
          label: "Some Concept",
        }),
      ];

      // Act
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should handle malformed concept data gracefully", () => {
      // Arrange
      workData.concepts = [
        {
          id: "C123456789",
          display_name: "Valid Concept",
          score: 0.91,
          level: 2,
          wikidata: "Q123",
        },
        {
          // Missing required fields
        } as any,
        {
          id: "C987654321",
          display_name: "Another Valid Concept",
          score: 0.86,
          level: 1,
          wikidata: "Q456",
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "C123456789",
          entityId: "C123456789",
          entityType: "concepts",
          label: "Valid Concept",
        }),
        createTestGraphNode({
          id: "C987654321",
          entityId: "C987654321",
          entityType: "concepts",
          label: "Another Valid Concept",
        }),
      ];

      // Act & Assert - Should not throw error
      expect(() => {
        const result = service["analyzeConceptRelationshipsForWork"]({
          workData,
          existingNodes,
        });
        expect(result).toHaveLength(2); // Two well-formed concepts processed
      }).not.toThrow();
    });

    it("should handle concepts with various hierarchy levels", () => {
      // Arrange
      workData.concepts = [
        {
          id: "C111111111",
          display_name: "Computer Science",
          score: 0.95,
          level: 0, // Top level
          wikidata: "Q21198",
        },
        {
          id: "C222222222",
          display_name: "Machine Learning",
          score: 0.88,
          level: 1, // First level
          wikidata: "Q25415",
        },
        {
          id: "C333333333",
          display_name: "Deep Learning",
          score: 0.82,
          level: 2, // Second level
          wikidata: "Q184246",
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "C111111111",
          entityId: "C111111111",
          entityType: "concepts",
          label: "Computer Science",
        }),
        createTestGraphNode({
          id: "C222222222",
          entityId: "C222222222",
          entityType: "concepts",
          label: "Machine Learning",
        }),
        createTestGraphNode({
          id: "C333333333",
          entityId: "C333333333",
          entityType: "concepts",
          label: "Deep Learning",
        }),
      ];

      // Act
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });

      // Assert - All relationships should be created with correct levels
      expect(result).toHaveLength(3);

      const csRelation = result.find(rel => rel.targetNodeId === "C111111111");
      const mlRelation = result.find(rel => rel.targetNodeId === "C222222222");
      const dlRelation = result.find(rel => rel.targetNodeId === "C333333333");

      expect(csRelation?.metadata?.level).toBe(0);
      expect(mlRelation?.metadata?.level).toBe(1);
      expect(dlRelation?.metadata?.level).toBe(2);
    });

    it("should handle concepts with various scores", () => {
      // Arrange
      workData.concepts = [
        {
          id: "C111111111",
          display_name: "High Score Concept",
          score: 0.99,
          level: 1,
          wikidata: "Q111",
        },
        {
          id: "C222222222",
          display_name: "Medium Score Concept",
          score: 0.67,
          level: 2,
          wikidata: "Q222",
        },
        {
          id: "C333333333",
          display_name: "Low Score Concept",
          score: 0.15,
          level: 3,
          wikidata: "Q333",
        },
      ];

      existingNodes = [
        createTestGraphNode({
          id: "C111111111",
          entityId: "C111111111",
          entityType: "concepts",
          label: "High Score Concept",
        }),
        createTestGraphNode({
          id: "C222222222",
          entityId: "C222222222",
          entityType: "concepts",
          label: "Medium Score Concept",
        }),
        createTestGraphNode({
          id: "C333333333",
          entityId: "C333333333",
          entityType: "concepts",
          label: "Low Score Concept",
        }),
      ];

      // Act
      const result = service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      });

      // Assert - All relationships should be created with correct scores
      expect(result).toHaveLength(3);

      const highScoreRel = result.find(rel => rel.targetNodeId === "C111111111");
      const mediumScoreRel = result.find(rel => rel.targetNodeId === "C222222222");
      const lowScoreRel = result.find(rel => rel.targetNodeId === "C333333333");

      expect(highScoreRel?.metadata?.score).toBe(0.99);
      expect(mediumScoreRel?.metadata?.score).toBe(0.67);
      expect(lowScoreRel?.metadata?.score).toBe(0.15);
    });
  });
});