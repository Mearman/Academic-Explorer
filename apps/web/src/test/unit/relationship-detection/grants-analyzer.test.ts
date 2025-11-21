/**
 * Tests for work → funder relationship analyzer
 * Covers T023-T032: Work Funding User Story implementation
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import { RelationType } from "@academic-explorer/types";
import type { GraphNode, MinimalEntityData } from "@/services/relationship-detection-service";

describe("RelationshipDetectionService - Grants Analyzer", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeGrantsForWork", () => {
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

    it("should create work→funder relationships for grants", () => {
      // Arrange
      workData.grants = [
        {
          funder: "https://openalex.org/F4320332161",
          funder_display_name: "National Institutes of Health",
          award_id: "R01-123456",
        },
        {
          funder: "https://openalex.org/F4320332162",
          funder_display_name: "National Science Foundation",
          award_id: "NSF-789012",
        },
      ];

      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        },
        {
          id: "F4320332162",
          entityId: "https://openalex.org/F4320332162",
          entityType: "funders",
          label: "National Science Foundation",
        },
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(2);

      // First grant relationship
      expect(relationships[0]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "https://openalex.org/F4320332161",
        relationType: RelationType.FUNDED_BY,
        direction: "outbound",
        label: "funded by",
        metadata: {
          funderDisplayName: "National Institutes of Health",
          awardId: "R01-123456",
        },
      });

      // Second grant relationship
      expect(relationships[1]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "https://openalex.org/F4320332162",
        relationType: RelationType.FUNDED_BY,
        direction: "outbound",
        label: "funded by",
        metadata: {
          funderDisplayName: "National Science Foundation",
          awardId: "NSF-789012",
        },
      });
    });

    it("should handle grants with null award IDs", () => {
      // Arrange
      workData.grants = [
        {
          funder: "https://openalex.org/F4320332161",
          funder_display_name: "Anonymous Foundation",
          award_id: null,
        },
      ];

      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "Anonymous Foundation",
        },
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toMatchObject({
        sourceNodeId: "W123456789",
        targetNodeId: "https://openalex.org/F4320332161",
        relationType: RelationType.FUNDED_BY,
        direction: "outbound",
        label: "funded by",
        metadata: {
          funderDisplayName: "Anonymous Foundation",
          awardId: null,
        },
      });
    });

    it("should skip grants for funders not in existing nodes", () => {
      // Arrange
      workData.grants = [
        {
          funder: "https://openalex.org/F4320332161",
          funder_display_name: "National Institutes of Health",
          award_id: "R01-123456",
        },
        {
          funder: "https://openalex.org/F4320339999",
          funder_display_name: "Unknown Foundation",
          award_id: "UNKNOWN-001",
        },
      ];

      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        },
        // Note: F4320339999 is not in existingNodes
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1); // Only one funder exists in nodes
      expect(relationships[0].targetNodeId).toBe("https://openalex.org/F4320332161");
    });

    it("should handle missing grants field gracefully", () => {
      // Arrange - workData.grants is undefined
      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        },
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should handle empty grants array gracefully", () => {
      // Arrange
      workData.grants = [];
      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        },
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should skip grants with invalid funder IDs", () => {
      // Arrange
      workData.grants = [
        {
          funder: "", // Empty funder ID
          funder_display_name: "Invalid Foundation",
          award_id: "INVALID-001",
        },
        {
          funder: "https://openalex.org/F4320332161",
          funder_display_name: "National Institutes of Health",
          award_id: "R01-123456",
        },
      ];

      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        },
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(1); // Only valid grant processed
      expect(relationships[0].targetNodeId).toBe("https://openalex.org/F4320332161");
    });

    it("should skip self-referencing grants", () => {
      // Arrange
      workData.grants = [
        {
          funder: "W123456789", // Same as work ID
          funder_display_name: "Self-Funded Research",
          award_id: "SELF-001",
        },
      ];

      existingNodes = [
        {
          id: "W123456789",
          entityId: "W123456789",
          entityType: "works",
          label: "Test Research Paper",
        },
      ];

      // Act
      service["analyzeGrantsForWork"]({
        workData,
        existingNodes,
        relationships,
      });

      // Assert
      expect(relationships).toHaveLength(0); // Self-reference skipped
    });

    it("should handle malformed grant data gracefully", () => {
      // Arrange
      workData.grants = [
        {
          funder: "https://openalex.org/F4320332161",
          funder_display_name: "National Institutes of Health",
          award_id: "R01-123456",
        },
        {
          // Missing required fields
        } as any,
        {
          funder: "https://openalex.org/F4320332162",
          funder_display_name: "National Science Foundation",
          award_id: "NSF-789012",
        },
      ];

      existingNodes = [
        {
          id: "F4320332161",
          entityId: "https://openalex.org/F4320332161",
          entityType: "funders",
          label: "National Institutes of Health",
        },
        {
          id: "F4320332162",
          entityId: "https://openalex.org/F4320332162",
          entityType: "funders",
          label: "National Science Foundation",
        },
      ];

      // Act & Assert - Should not throw error
      expect(() => {
        service["analyzeGrantsForWork"]({
          workData,
          existingNodes,
          relationships,
        });
      }).not.toThrow();

      // Should still create valid relationships for well-formed grants
      expect(relationships).toHaveLength(2); // Two well-formed grants processed
    });
  });
});