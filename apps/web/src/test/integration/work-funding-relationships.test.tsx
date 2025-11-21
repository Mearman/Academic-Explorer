/**
 * Integration tests for work → funder relationship detection
 * Tests complete T022-T032: Work Funding User Story
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

describe("Work Funding Relationships - Integration", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeGrantsForWork integration", () => {
    it("should create work→funder relationships when work data and funder nodes exist", () => {
      // Arrange
      const workData = {
        id: "W123456789",
        entityType: "works" as const,
        display_name: "Machine Learning in Healthcare Research",
        grants: [
          {
            funder: "https://openalex.org/F4320332161",
            funder_display_name: "National Institutes of Health",
            award_id: "R01-ML-HEALTH-2023",
          },
          {
            funder: "https://openalex.org/F4320332162",
            funder_display_name: "National Science Foundation",
            award_id: "NSF-AI-2023-001",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
          x: 100,
          y: 100,
        }),
        createTestGraphNode({
          id: "F4320332162",
          entityId: "https://openalex.org/F4320332162",
          entityType: "funders",
          label: "National Science Foundation",
          x: 200,
          y: 200,
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act - Test the private method directly through service interface
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(2);

      // Check first funder relationship
      const nihRelation = relationships.find(rel =>
        rel.targetNodeId === "https://openalex.org/F4320332161"
      );
      expect(nihRelation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "https://openalex.org/F4320332161",
        relationType: "funded_by",
        direction: "outbound",
        label: "funded by",
        metadata: {
          funderDisplayName: "National Institutes of Health",
          awardId: "R01-ML-HEALTH-2023",
        },
      });

      // Check second funder relationship
      const nsfRelation = relationships.find(rel =>
        rel.targetNodeId === "https://openalex.org/F4320332162"
      );
      expect(nsfRelation).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "https://openalex.org/F4320332162",
        relationType: "funded_by",
        direction: "outbound",
        label: "funded by",
        metadata: {
          funderDisplayName: "National Science Foundation",
          awardId: "NSF-AI-2023-001",
        },
      });
    });

    it("should handle grants with null award IDs", () => {
      // Arrange
      const workData = {
        id: "W5556667777",
        entityType: "works" as const,
        display_name: "Research Paper with Anonymous Funding",
        grants: [
          {
            funder: "https://openalex.org/F4320332161",
            funder_display_name: "Anonymous Foundation",
            award_id: null, // Null award ID
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "Anonymous Foundation",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert - Edge should be created with null award ID
      expect(relationships).toHaveLength(1);

      const relation = relationships[0];
      expect(relation).toMatchObject({
        sourceNodeId: "W5556667777",
        targetNodeId: "https://openalex.org/F4320332161",
        relationType: "funded_by",
        direction: "outbound",
        label: "funded by",
        metadata: {
          funderDisplayName: "Anonymous Foundation",
          awardId: null, // Should preserve null award ID
        },
      });
    });

    it("should skip grants for funders not in existing nodes", () => {
      // Arrange
      const workData = {
        id: "W1112223333",
        entityType: "works" as const,
        display_name: "Research Paper with Unknown Funder",
        grants: [
          {
            funder: "https://openalex.org/F4320339999", // Non-existent funder
            funder_display_name: "Unknown Foundation",
            award_id: "UNKNOWN-001",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "Different Foundation",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert - No relationships should be created (funder node doesn't exist)
      expect(relationships).toHaveLength(0);
    });

    it("should handle work with no grants", () => {
      // Arrange
      const workData = {
        id: "W9876543210",
        entityType: "works" as const,
        display_name: "Research Paper No Funding",
        grants: [], // Empty grants array
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should handle malformed grant data gracefully", () => {
      // Arrange
      const workData = {
        id: "W123456789",
        entityType: "works" as const,
        display_name: "Research Paper with Mixed Grants",
        grants: [
          {
            funder: "https://openalex.org/F4320332161",
            funder_display_name: "Valid Foundation",
            award_id: "VALID-001",
          },
          {
            // Missing required fields
          } as any,
          {
            funder: "https://openalex.org/F4320332162",
            funder_display_name: "Another Valid Foundation",
            award_id: "VALID-002",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "Valid Foundation",
        }),
        createTestGraphNode({
          id: "F4320332162",
          entityId: "https://openalex.org/F4320332162",
          entityType: "funders",
          label: "Another Valid Foundation",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act & Assert - Should not throw error
      expect(() => {
        service["analyzeGrantsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
      }).not.toThrow();

      // Should still create valid relationships for well-formed grants
      expect(relationships).toHaveLength(2);
    });
  });
});