/**
 * Integration tests for repository and role relationship detection
 * Tests T066-T077: Phase 7 Repositories & Roles User Stories 7-8
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { RelationshipDetectionService, createTestGraphNode } from "@/services/relationship-detection-service";
import type { GraphNode, DetectedRelationship } from "@/services/relationship-detection-service";
import { RELATIONSHIP_TYPE_LABELS } from "@/types/relationship";

// Mock logger to avoid console noise during tests
vi.mock("@academic-explorer/utils", async (importOriginal) => ({
  ...await importOriginal(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  __esModule: true,
}));

describe("Institution Repository & Role Relationships - Integration", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeRepositoryRelationshipsForInstitution integration", () => {
    it("should create institution→repository relationships with metadata", () => {
      // Arrange - Test with institution I27837315 data (from spec)
      const institutionData = {
        id: "I27837315",
        entityType: "institutions" as const,
        display_name: "Test University",
        repositories: [
          {
            id: "S123456789",
            display_name: "University Research Repository",
            host_organization: "I27837315",
            host_organization_name: "Test University",
          },
          {
            id: "S987654321",
            display_name: "Institutional Archive",
            host_organization: "I27837315",
            host_organization_name: "Test University",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "S123456789",
          entityId: "S123456789",
          entityType: "sources",
          label: "University Research Repository",
        }),
        createTestGraphNode({
          id: "S987654321",
          entityId: "S987654321",
          entityType: "sources",
          label: "Institutional Archive",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeRepositoryRelationshipsForInstitution"]({
        institution: institutionData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(2);

      // Check first repository relationship
      const repo1Relation = relationships.find(rel => rel.targetNodeId === "S123456789");
      expect(repo1Relation).toMatchObject({
        sourceNodeId: "I27837315",
        targetNodeId: "S123456789",
        relationType: "institution_has_repository",
        direction: "outbound",
        label: "hosts repository",
        metadata: {
          host_organization: "I27837315",
          host_organization_name: "Test University",
        },
      });

      // Check second repository relationship
      const repo2Relation = relationships.find(rel => rel.targetNodeId === "S987654321");
      expect(repo2Relation).toMatchObject({
        sourceNodeId: "I27837315",
        targetNodeId: "S987654321",
        relationType: "institution_has_repository",
        direction: "outbound",
        label: "hosts repository",
      });
    });

    it("should skip repositories not in existing nodes", () => {
      // Arrange
      const institutionData = {
        id: "I27837315",
        entityType: "institutions" as const,
        display_name: "Test University",
        repositories: [
          {
            id: "S123456789", // This repository exists in graph
            display_name: "Existing Repository",
            host_organization: "I27837315",
          },
          {
            id: "S999999999", // This repository doesn't exist in graph
            display_name: "Missing Repository",
            host_organization: "I27837315",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "S123456789",
          entityId: "S123456789",
          entityType: "sources",
          label: "Existing Repository",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeRepositoryRelationshipsForInstitution"]({
        institution: institutionData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert - Only one relationship should be created (for existing repository)
      expect(relationships).toHaveLength(1);
      expect(relationships[0].targetNodeId).toBe("S123456789");
    });

    it("should handle institution with no repositories", () => {
      // Arrange
      const institutionData = {
        id: "I27837315",
        entityType: "institutions" as const,
        display_name: "Test University",
        repositories: [], // Empty repositories array
      };

      const existingNodes: GraphNode[] = [];
      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeRepositoryRelationshipsForInstitution"]({
        institution: institutionData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(0);
    });
  });

  describe("analyzeRoleRelationshipsForEntity integration", () => {
    it("should create multi-role relationships for institutions", () => {
      // Arrange - Test with institution that acts as both funder and publisher
      const institutionData = {
        id: "I27837315",
        entityType: "institutions" as const,
        display_name: "Multi-Role University",
        roles: [
          {
            id: "F4320309652",
            role: "funder",
            works_count: 42,
          },
          {
            id: "P4310316579",
            role: "publisher",
            works_count: 15,
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "F4320309652",
          entityId: "F4320309652",
          entityType: "funders",
          label: "University Funding Office",
        }),
        createTestGraphNode({
          id: "P4310316579",
          entityId: "P4310316579",
          entityType: "publishers",
          label: "University Press",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeRoleRelationshipsForEntity"]({
        entity: institutionData,
        entityType: "institutions",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(2);

      // Check funder role relationship
      const funderRole = relationships.find(rel => rel.targetNodeId === "F4320309652");
      expect(funderRole).toMatchObject({
        sourceNodeId: "I27837315",
        targetNodeId: "F4320309652",
        relationType: "has_role",
        direction: "outbound",
        label: "acts as funder",
        metadata: {
          role: "funder",
          works_count: 42,
        },
      });

      // Check publisher role relationship
      const publisherRole = relationships.find(rel => rel.targetNodeId === "P4310316579");
      expect(publisherRole).toMatchObject({
        sourceNodeId: "I27837315",
        targetNodeId: "P4310316579",
        relationType: "has_role",
        direction: "outbound",
        label: "acts as publisher",
        metadata: {
          role: "publisher",
          works_count: 15,
        },
      });
    });

    it("should skip roles for unsupported entity types", () => {
      // Arrange - Authors should not process roles (only institutions, funders, publishers)
      const authorData = {
        id: "A123456789",
        entityType: "authors" as const,
        display_name: "Test Author",
        roles: [
          {
            id: "I27837315",
            role: "institution",
            works_count: 5,
          },
        ],
      };

      const existingNodes: GraphNode[] = [];
      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeRoleRelationshipsForEntity"]({
        entity: authorData,
        entityType: "authors",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert - No relationships should be created (authors not supported)
      expect(relationships).toHaveLength(0);
    });
  });

  describe("Label mapping verification", () => {
    it("should verify Repository and Role relationship type labels are mapped", () => {
      // Use imported RELATIONSHIP_TYPE_LABELS
      expect(RELATIONSHIP_TYPE_LABELS.institution_has_repository).toBe("Repository");
      expect(RELATIONSHIP_TYPE_LABELS.has_role).toBe("Roles");
    });
  });
});