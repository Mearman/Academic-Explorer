/**
 * Integration tests for work → concept relationship detection
 * Tests complete T057-T065: Legacy Concepts User Story 6
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

describe("Work Concepts Relationships - Integration", () => {
  let service: RelationshipDetectionService;
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      fetchQuery: vi.fn(),
    };
    service = new RelationshipDetectionService(mockQueryClient);
  });

  describe("analyzeConceptRelationshipsForWork integration", () => {
    it("should create work→concept relationships with full metadata", () => {
      // Arrange - Test with work W2741809807 data (from spec)
      const workData = {
        id: "W2741809807",
        entityType: "works" as const,
        display_name: "Machine Learning in Healthcare Research",
        concepts: [
          {
            id: "C41008148",
            display_name: "Machine learning",
            score: 0.896,
            level: 2,
            wikidata: "Q25167",
          },
          {
            id: "C185592680",
            display_name: "Computer science",
            score: 0.923,
            level: 1,
            wikidata: "Q21198",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "C41008148",
          entityId: "C41008148",
          entityType: "concepts",
          label: "Machine learning",
        }),
        createTestGraphNode({
          id: "C185592680",
          entityId: "C185592680",
          entityType: "concepts",
          label: "Computer science",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act - Test the private method directly through service interface
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(2);

      // Check first concept relationship (Machine learning)
      const mlRelation = relationships.find(rel =>
        rel.targetNodeId === "C41008148"
      );
      expect(mlRelation).toMatchObject({
        sourceNodeId: "W2741809807",
        targetNodeId: "C41008148",
        relationType: "concept",
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 2,
          score: 0.896,
          wikidata: "Q25167",
        },
      });

      // Check second concept relationship (Computer science)
      const csRelation = relationships.find(rel =>
        rel.targetNodeId === "C185592680"
      );
      expect(csRelation).toMatchObject({
        sourceNodeId: "W2741809807",
        targetNodeId: "C185592680",
        relationType: "concept",
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 1,
          score: 0.923,
          wikidata: "Q21198",
        },
      });
    });

    it("should handle concepts with null wikidata", () => {
      // Arrange
      const workData = {
        id: "W5556667777",
        entityType: "works" as const,
        display_name: "Research Paper with Anonymous Concepts",
        concepts: [
          {
            id: "C4320332161",
            display_name: "Anonymous Concept",
            score: 0.75,
            level: 2,
            // wikidata: null, // Null wikidata
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "C4320332161",
          entityId: "C4320332161",
          entityType: "concepts",
          label: "Anonymous Concept",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert - Edge should be created with null wikidata
      expect(relationships).toHaveLength(1);

      const relation = relationships[0];
      expect(relation).toMatchObject({
        sourceNodeId: "W5556667777",
        targetNodeId: "C4320332161",
        relationType: "concept",
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 2,
          score: 0.75,
          // wikidata: undefined, // Should preserve missing wikidata
        },
      });
    });

    it("should skip concepts for concepts not in existing nodes", () => {
      // Arrange
      const workData = {
        id: "W1112223333",
        entityType: "works" as const,
        display_name: "Research Paper with Unknown Concepts",
        concepts: [
          {
            id: "C4320339999", // Non-existent concept
            display_name: "Unknown Concept",
            score: 0.65,
            level: 2,
            wikidata: "Q99999",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "C4320332161",
          entityId: "C4320332161",
          entityType: "concepts",
          label: "Different Concept",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert - No relationships should be created (concept node doesn't exist)
      expect(relationships).toHaveLength(0);
    });

    it("should handle work with no concepts", () => {
      // Arrange
      const workData = {
        id: "W9876543210",
        entityType: "works" as const,
        display_name: "Research Paper No Concepts",
        concepts: [], // Empty concepts array
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "C4320332161",
          entityId: "C4320332161",
          entityType: "concepts",
          label: "Some Concept",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(0);
    });

    it("should handle malformed concept data gracefully", () => {
      // Arrange
      const workData = {
        id: "W123456789",
        entityType: "works" as const,
        display_name: "Research Paper with Mixed Concepts",
        concepts: [
          {
            id: "C4320332161",
            display_name: "Valid Concept",
            score: 0.89,
            level: 2,
            wikidata: "Q123456",
          },
          {
            // Missing required fields
          } as any,
          {
            id: "C4320332162",
            display_name: "Another Valid Concept",
            score: 0.86,
            level: 1,
            wikidata: "Q654321",
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "C4320332161",
          entityId: "C4320332161",
          entityType: "concepts",
          label: "Valid Concept",
        }),
        createTestGraphNode({
          id: "C4320332162",
          entityId: "C4320332162",
          entityType: "concepts",
          label: "Another Valid Concept",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act & Assert - Should not throw error
      expect(() => {
        service["analyzeConceptRelationshipsForWork"]({
          workData,
          existingNodes,
        }).forEach(rel => relationships.push(rel));
      }).not.toThrow();

      // Should still create valid relationships for well-formed concepts
      expect(relationships).toHaveLength(2);
    });

    it("should handle concepts with minimal metadata", () => {
      // Arrange - Concept with only required fields
      const workData = {
        id: "W0000000000",
        entityType: "works" as const,
        display_name: "Research Paper Minimal Concepts",
        concepts: [
          {
            id: "C123456789",
            display_name: "Minimal Concept",
            score: 0.75,
            level: 2,
            // Missing wikidata
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        createTestGraphNode({
          id: "C123456789",
          entityId: "C123456789",
          entityType: "concepts",
          label: "Minimal Concept",
        }),
      ];

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(1);

      const conceptRelation = relationships[0];
      expect(conceptRelation).toMatchObject({
        sourceNodeId: "W0000000000",
        targetNodeId: "C123456789",
        relationType: "concept",
        direction: "outbound",
        label: "classified as",
        metadata: {
          level: 2,
          score: 0.75,
          wikidata: undefined, // Should preserve missing wikidata
        },
      });
    });

    it("should demonstrate legacy concept classification", () => {
      // Arrange - Test showing 19 concepts (legacy) alongside topics (current)
      const workData = {
        id: "W2741809807",
        entityType: "works" as const,
        display_name: "Historical Research Paper",
        concepts: Array.from({ length: 5 }, (_, i) => ({
          id: `C${String(100000000 + i).padStart(9, "0")}`,
          display_name: `Legacy Concept ${i + 1}`,
          score: 0.7 + (i * 0.05),
          level: Math.floor(i / 2) + 1,
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

      const relationships: DetectedRelationship[] = [];

      // Act
      service["analyzeConceptRelationshipsForWork"]({
        workData,
        existingNodes,
      }).forEach(rel => relationships.push(rel));

      // Assert
      expect(relationships).toHaveLength(5);

      // Verify all concepts are classified as legacy
      relationships.forEach((rel, index) => {
        expect(rel.label).toBe("classified as");
        expect(rel.metadata?.level).toBeGreaterThan(0);
        expect(rel.metadata?.score).toBeGreaterThan(0);
        expect(rel.metadata?.wikidata).toMatch(/^Q\d+$/);
      });
    });
  });
});