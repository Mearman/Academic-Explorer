/**
 * Integration tests for entity → topic relationship detection
 * Tests complete T043-T056: Entity Topics User Stories 3-5
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

describe("Entity Topics Relationships - Integration", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeTopicRelationshipsForEntity integration", () => {
    it("should create author→topic relationships with full metadata", () => {
      // Arrange - Test with author A5023888391 data (from spec)
      const authorData = {
        id: "A5023888391",
        entityType: "authors" as const,
        display_name: "John Smith",
        topics: [
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
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act - Test the private method directly through service interface
      service["analyzeTopicRelationshipsForEntity"]({
        entityData: authorData,
        entityType: "authors",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(1);

      const topicRelation = relationships[0];
      expect(topicRelation).toMatchObject({
        sourceNodeId: "A5023888391",
        targetNodeId: "T10102",
        relationType: "TOPIC",
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 23,
          score: 0.9994,
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
      });
    });

    it("should create source→topic relationships for journal coverage", () => {
      // Arrange - Source (journal) with topic coverage areas
      const sourceData = {
        id: "S123456789",
        entityType: "sources" as const,
        display_name: "Nature Machine Intelligence",
        topics: [
          {
            id: "T10102",
            display_name: "Machine Learning",
            score: 0.8921,
            count: 156,
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
            id: "T10304",
            display_name: "Neural Networks",
            score: 0.8765,
            count: 98,
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
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
        createTestGraphNode({
          id: "T10304",
          entityId: "T10304",
          entityType: "topics",
          label: "Neural Networks",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeTopicRelationshipsForEntity"]({
        entityData: sourceData,
        entityType: "sources",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(2);

      // Check first topic relationship
      const mlRelation = relationships.find(rel => rel.targetNodeId === "T10102");
      expect(mlRelation).toMatchObject({
        sourceNodeId: "S123456789",
        targetNodeId: "T10102",
        relationType: "TOPIC",
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 156,
          score: 0.8921,
        },
      });

      // Check second topic relationship
      const nnRelation = relationships.find(rel => rel.targetNodeId === "T10304");
      expect(nnRelation).toMatchObject({
        sourceNodeId: "S123456789",
        targetNodeId: "T10304",
        relationType: "TOPIC",
        direction: "outbound",
        label: "research topic",
        metadata: {
          count: 98,
          score: 0.8765,
        },
      });
    });

    it("should create institution→topic relationships for research focus", () => {
      // Arrange - Institution with research focus areas
      const institutionData = {
        id: "I123456789",
        entityType: "institutions" as const,
        display_name: "Stanford University",
        topics: [
          {
            id: "T10102",
            display_name: "Machine Learning",
            score: 0.9234,
            count: 892,
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
            id: "T10506",
            display_name: "Biomedical Engineering",
            score: 0.8456,
            count: 567,
            subfield: {
              id: "S4250",
              display_name: "Biomedical Engineering",
            },
            field: {
              id: "F1238",
              display_name: "Engineering",
            },
            domain: {
              id: "D1",
              display_name: "STEM",
            },
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
        createTestGraphNode({
          id: "T10506",
          entityId: "T10506",
          entityType: "topics",
          label: "Biomedical Engineering",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeTopicRelationshipsForEntity"]({
        entityData: institutionData,
        entityType: "institutions",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(2);

      // Check topic relationships have proper metadata
      const mlRelation = relationships.find(rel => rel.targetNodeId === "T10102");
      expect(mlRelation?.metadata?.count).toBe(892);
      expect(mlRelation?.metadata?.score).toBe(0.9234);

      const bioRelation = relationships.find(rel => rel.targetNodeId === "T10506");
      expect(bioRelation?.metadata?.count).toBe(567);
      expect(bioRelation?.metadata?.score).toBe(0.8456);
    });

    it("should handle topics with missing optional metadata", () => {
      // Arrange - Topic with minimal required fields only
      const authorData = {
        id: "A987654321",
        entityType: "authors" as const,
        display_name: "Jane Doe",
        topics: [
          {
            id: "T10102",
            display_name: "Machine Learning",
            // Missing score, count, subfield, field, domain
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Machine Learning",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeTopicRelationshipsForEntity"]({
        entityData: authorData,
        entityType: "authors",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(1);

      const topicRelation = relationships[0];
      expect(topicRelation).toMatchObject({
        sourceNodeId: "A987654321",
        targetNodeId: "T10102",
        relationType: "TOPIC",
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

    it("should skip topics not in existing nodes", () => {
      // Arrange - Entity with known and unknown topics
      const authorData = {
        id: "A555666777",
        entityType: "authors" as const,
        display_name: "Test Author",
        topics: [
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
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Known Topic",
        }),
        // Note: T999999999 is not in existingNodes
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeTopicRelationshipsForEntity"]({
        entityData: authorData,
        entityType: "authors",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert - Only one relationship should be created (for existing topic)
      expect(relationships).toHaveLength(1);
      expect(relationships[0].targetNodeId).toBe("T10102");
    });

    it("should handle entity with no topics", () => {
      // Arrange
      const authorData = {
        id: "A0000000000",
        entityType: "authors" as const,
        display_name: "No Topics Author",
        topics: [], // Empty topics array
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Some Topic",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeTopicRelationshipsForEntity"]({
        entityData: authorData,
        entityType: "authors",
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should handle malformed topic data gracefully", () => {
      // Arrange
      const authorData = {
        id: "A123456789",
        entityType: "authors" as const,
        display_name: "Author with Mixed Topics",
        topics: [
          {
            id: "T10102",
            display_name: "Valid Topic",
            score: 0.91,
            count: 28,
          },
          null as any, // null topic
          {
            // Missing required fields
          } as any,
          {
            id: "T987654321",
            display_name: "Another Valid Topic",
            score: 0.86,
            count: 19,
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "T10102",
          entityId: "T10102",
          entityType: "topics",
          label: "Valid Topic",
        }),
        createTestGraphNode({
          id: "T987654321",
          entityId: "T987654321",
          entityType: "topics",
          label: "Another Valid Topic",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act & Assert - Should not throw error
      expect(() => {
        service["analyzeTopicRelationshipsForEntity"]({
          entityData: authorData,
          entityType: "authors",
          existingNodes,
        }).forEach(rel => relationships.push(rel));
      }).not.toThrow();

      // Should still create valid relationships for well-formed topics
      expect(relationships).toHaveLength(2); // Two well-formed topics processed
    });
  });
});