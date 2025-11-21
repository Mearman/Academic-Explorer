/**
 * Integration tests for work → keyword relationship detection
 * Tests complete T025-T034: Work Keywords User Story
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import type { GraphNode, DetectedRelationship } from "@/services/relationship-detection-service";

// Mock logger to avoid console noise during tests
vi.mock("@academic-explorer/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  __esModule: true,
}));

describe("Work Keywords Relationships - Integration", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeKeywordsForWork integration", () => {
    it("should create work→keyword relationships when work data and keyword nodes exist", () => {
      // Arrange
      const workData = {
        id: "W123456789",
        entityType: "works" as const,
        display_name: "Machine Learning in Healthcare Research",
        keywords: [
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
        ],
      };

      const existingNodes: GraphNode[] = [
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

      const relationships: DetectedRelationship[] = [];

      // Act - Test the private method directly through service interface
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(2);

      // Check first keyword relationship
      const mlRelation = relationships.find(rel =>
        rel.targetNodeId === "K123456789"
      );
      expect(mlRelation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "K123456789",
        relationType: "work_has_keyword",
        direction: "outbound",
        label: "has keyword",
        metadata: {
          keywordDisplayName: "Machine Learning",
          keywordScore: 0.95,
        },
      });

      // Check second keyword relationship
      const healthcareRelation = relationships.find(rel =>
        rel.targetNodeId === "K987654321"
      );
      expect(healthcareRelation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "K987654321",
        relationType: "work_has_keyword",
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
      const workData = {
        id: "W555666777",
        entityType: "works" as const,
        display_name: "Research Paper with Unscored Keywords",
        keywords: [
          {
            id: "K123456789",
            display_name: "Unscored Topic",
            // Missing score field
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Unscored Topic",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert - Edge should be created with undefined score
      expect(relationships).toHaveLength(1);

      const relation = relationships[0];
      expect(relation).toMatchObject({
        sourceNodeId: "W555666777",
        targetNodeId: "K123456789",
        relationType: "work_has_keyword",
        direction: "outbound",
        label: "has keyword",
        metadata: {
          keywordDisplayName: "Unscored Topic",
          keywordScore: undefined, // Should preserve missing score
        },
      });
    });

    it("should use display_name as keyword ID when ID is missing", () => {
      // Arrange
      const workData = {
        id: "W1112223333",
        entityType: "works" as const,
        display_name: "Research Paper with Display Name Keywords",
        keywords: [
          {
            // Missing id field
            display_name: "Artificial Intelligence",
            score: 0.92,
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "Artificial Intelligence",
          entityId: "Artificial Intelligence",
          entityType: "keywords",
          label: "Artificial Intelligence",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert - Edge should use display_name as targetNodeId
      expect(relationships).toHaveLength(1);

      const relation = relationships[0];
      expect(relation).toMatchObject({
        sourceNodeId: "W1112223333",
        targetNodeId: "Artificial Intelligence",
        relationType: "work_has_keyword",
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
      const workData = {
        id: "W9876543210",
        entityType: "works" as const,
        display_name: "Research Paper with Unknown Keywords",
        keywords: [
          {
            id: "K123456789",
            display_name: "Known Keyword",
            score: 0.88,
          },
          {
            id: "K999999999", // Non-existent keyword
            display_name: "Unknown Keyword",
            score: 0.75,
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Known Keyword",
        }),
        // Note: K999999999 is not in existingNodes
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert - Only one relationship should be created (for existing keyword)
      expect(relationships).toHaveLength(1);
      expect(relationships[0].targetNodeId).toBe("K123456789");
    });

    it("should handle work with no keywords", () => {
      // Arrange
      const workData = {
        id: "W0000000000",
        entityType: "works" as const,
        display_name: "Research Paper No Keywords",
        keywords: [], // Empty keywords array
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "K123456789",
          entityId: "K123456789",
          entityType: "keywords",
          label: "Some Keyword",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should handle malformed keyword data gracefully", () => {
      // Arrange
      const workData = {
        id: "W123456789",
        entityType: "works" as const,
        display_name: "Research Paper with Mixed Keywords",
        keywords: [
          {
            id: "K123456789",
            display_name: "Valid Keyword",
            score: 0.91,
          },
          {
            // Missing required fields
          } as any,
          {
            id: "K987654321",
            display_name: "Another Valid Keyword",
            score: 0.86,
          },
        ],
      };

      const existingNodes: GraphNode[] = [
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

      const relationships: DetectedRelationship[] = [];

      // Act & Assert - Should not throw error
      expect(() => {
        service["analyzeKeywordsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
      }).not.toThrow();

      // Should still create valid relationships for well-formed keywords
      expect(relationships).toHaveLength(2);
    });

    it("should handle keyword scores of various ranges", () => {
      // Arrange
      const workData = {
        id: "W1112223333",
        entityType: "works" as const,
        display_name: "Research Paper with Varied Score Keywords",
        keywords: [
          {
            id: "K111111111",
            display_name: "Low Score Keyword",
            score: 0.15,
          },
          {
            id: "K222222222",
            display_name: "Medium Score Keyword",
            score: 0.67,
          },
          {
            id: "K333333333",
            display_name: "High Score Keyword",
            score: 0.94,
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "K111111111",
          entityId: "K111111111",
          entityType: "keywords",
          label: "Low Score Keyword",
        }),
        createTestGraphNode({
          id: "K222222222",
          entityId: "K222222222",
          entityType: "keywords",
          label: "Medium Score Keyword",
        }),
        createTestGraphNode({
          id: "K333333333",
          entityId: "K333333333",
          entityType: "keywords",
          label: "High Score Keyword",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeKeywordsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert - All relationships should be created with correct scores
      expect(relationships).toHaveLength(3);

      const lowScoreRel = relationships.find(rel => rel.targetNodeId === "K111111111");
      const mediumScoreRel = relationships.find(rel => rel.targetNodeId === "K222222222");
      const highScoreRel = relationships.find(rel => rel.targetNodeId === "K333333333");

      expect(lowScoreRel?.metadata.keywordScore).toBe(0.15);
      expect(mediumScoreRel?.metadata.keywordScore).toBe(0.67);
      expect(highScoreRel?.metadata.keywordScore).toBe(0.94);
    });
  });
});