/**
 * Unit tests for RelationshipDetectionService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { RelationshipDetectionService } from "./relationship-detection-service";
import { graphStore } from "../stores/graph-store";
import { RelationType } from "@academic-explorer/graph";
import type { GraphNode, EntityType } from "@academic-explorer/graph";
import { cachedOpenAlex } from "@academic-explorer/client";

// Mock type guards from @academic-explorer/types
vi.mock("@academic-explorer/types", () => ({
  isWork: vi.fn((entity) => {
    return entity && typeof entity === "object" && "publication_year" in entity;
  }),
  isAuthor: vi.fn((entity) => {
    return entity && typeof entity === "object" && "works_count" in entity;
  }),
  isSource: vi.fn((entity) => {
    return entity && typeof entity === "object" && ("issn_l" in entity || "publisher" in entity);
  }),
  isInstitution: vi.fn((entity) => {
    return entity && typeof entity === "object" && "country_code" in entity;
  }),
  isNonNull: vi.fn((value) => value != null),
}));

// Mock the external dependencies
vi.mock("@academic-explorer/client", () => ({
  ADVANCED_FIELD_SELECTIONS: {
    works: {
      minimal: [
        "id",
        "display_name",
        "publication_year",
        "type",
        "open_access",
        "authorships",
        "primary_location",
        "referenced_works",
      ],
    },
    authors: {
      minimal: [
        "id",
        "display_name",
        "works_count",
        "last_known_institutions",
        "affiliations",
      ],
    },
    sources: {
      minimal: ["id", "display_name", "type", "publisher"],
    },
    institutions: {
      minimal: ["id", "display_name", "country_code", "type", "lineage"],
    },
    topics: {
      minimal: ["id", "display_name", "keywords"],
    },
    concepts: {
      minimal: ["id", "display_name", "keywords"],
    },
    publishers: {
      minimal: ["id", "display_name", "works_count"],
    },
    funders: {
      minimal: ["id", "display_name", "works_count"],
    },
  },
  cachedOpenAlex: {
    client: {
      works: {
        getWork: vi.fn(),
      },
      authors: {
        getAuthor: vi.fn(),
      },
      sources: {
        getSource: vi.fn(),
      },
      institutions: {
        getInstitution: vi.fn(),
      },
      topics: {
        get: vi.fn(),
      },
      publishers: {
        get: vi.fn(),
      },
      funders: {
        get: vi.fn(),
      },
      keywords: {
        getKeyword: vi.fn(),
      },
    },
  },
}));
// Mock graph store
vi.mock("../stores/graph-store", () => ({
  graphStore: {
    nodes: {},
    edges: {},
    getNode: vi.fn(),
    getPlaceholderNodes: vi.fn().mockReturnValue([]),
    addEdges: vi.fn(),
    getState: vi.fn(() => ({
      nodes: {},
      edges: {},
      getNode: vi.fn(),
      getPlaceholderNodes: vi.fn().mockReturnValue([]),
    })),
  },
}));
vi.mock("./request-deduplication-service");

describe("RelationshipDetectionService", () => {
  let service: RelationshipDetectionService;
  let queryClient: QueryClient;
  let mockStore: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    service = new RelationshipDetectionService(queryClient);

    // Mock the graph store
    mockStore = {
      getNode: vi.fn(),
      nodes: {},
      addEdges: vi.fn(),
    };
    vi.mocked(graphStore.getState).mockReturnValue(mockStore);

    // Configure graphStore to delegate to mockStore
    vi.mocked(graphStore.getNode).mockImplementation(mockStore.getNode);
    vi.mocked(graphStore.addEdges).mockImplementation(mockStore.addEdges);
    vi.mocked(graphStore.getPlaceholderNodes).mockReturnValue([]);

    // Make graphStore.nodes dynamically reference mockStore.nodes
    Object.defineProperty(graphStore, 'nodes', {
      get: () => mockStore.nodes,
      configurable: true,
    });

    // Mock the deduplication service to prevent undefined access
    const mockDeduplicationService = {
      getEntity: vi.fn(),
      getStats: vi.fn(),
      clear: vi.fn(),
      refreshEntity: vi.fn(),
    };
    (service as any).deduplicationService = mockDeduplicationService;
    (service as any).client = { getEntity: mockDeduplicationService.getEntity };

    // Setup cachedOpenAlex mocks
    vi.mocked(cachedOpenAlex.client.works.getWork).mockResolvedValue({
      id: "https://openalex.org/W123",
      display_name: "Test Work",
      ids: {
        openalex: "https://openalex.org/W123",
      },
      locations: [],
      locations_count: 0,
      authorships: [],
      countries_distinct_count: 0,
      institutions_distinct_count: 0,
      corresponding_author_ids: [],
      corresponding_institution_ids: [],
      referenced_works: ["https://openalex.org/W789"],
    } as any);
    vi.mocked(cachedOpenAlex.client.authors.getAuthor).mockResolvedValue({
      id: "https://openalex.org/A123",
      display_name: "Test Author",
      works_count: 1,
      cited_by_count: 0,
      ids: {
        openalex: "https://openalex.org/A123",
      },
      affiliations: [],
    } as any);
    vi.mocked(cachedOpenAlex.client.sources.getSource).mockResolvedValue({
      id: "https://openalex.org/S123",
      display_name: "Test Source",
      works_count: 1,
      cited_by_count: 0,
      is_oa: true,
      is_in_doaj: false,
      ids: {
        openalex: "https://openalex.org/S123",
      },
    } as any);
    vi.mocked(
      cachedOpenAlex.client.institutions.getInstitution,
    ).mockResolvedValue({
      id: "https://openalex.org/I123",
      display_name: "Test Institution",
      country_code: "US",
      type: "education",
      works_count: 1,
      cited_by_count: 0,
      ids: {
        openalex: "https://openalex.org/I123",
      },
    } as any);
  });

  describe("detectRelationshipsForNode", () => {
    it("should return empty array if node not found", async () => {
      mockStore.getNode.mockReturnValue(undefined);

      const result = await service.detectRelationshipsForNode("nonexistent");

      expect(result).toEqual([]);
      expect(mockStore.getNode).toHaveBeenCalledWith("nonexistent");
    });

    it("should skip minimal hydration nodes", async () => {
      const minimalNode: GraphNode = {
        id: "W123",
        entityType: "works",
        label: "Test Work",
        entityId: "https://openalex.org/W123",
        x: 0,
        y: 0,
        externalIds: [],
        metadata: { hydrationLevel: "minimal" as const },
      };

      mockStore.getNode.mockReturnValue(minimalNode);

      const result = await service.detectRelationshipsForNode("W123");

      expect(result).toEqual([]);
    });
  });

  describe("analyzeWorkRelationships", () => {
    it("should detect author relationships", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A456",
              display_name: "Test Author",
            },
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "A456",
          entityType: "authors" as EntityType,
          label: "Test Author",
          entityId: "https://openalex.org/A456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      // Access the private method via bracket notation for testing
      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceNodeId: "https://openalex.org/A456",
        targetNodeId: "https://openalex.org/W123",
        relationType: RelationType.AUTHORED,
        label: "authored",
        weight: 1.0,
      });
    });

    it("should detect source relationships", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        primary_location: {
          source: {
            id: "https://openalex.org/S789",
            display_name: "Test Journal",
          },
        },
      };

      const existingNodes: GraphNode[] = [
        {
          id: "S789",
          entityType: "sources" as EntityType,
          label: "Test Journal",
          entityId: "https://openalex.org/S789",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceNodeId: "https://openalex.org/W123",
        targetNodeId: "https://openalex.org/S789",
        relationType: RelationType.PUBLISHED_IN,
        label: "published in",
      });
    });

    it("should detect citation relationships", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        referenced_works: ["https://openalex.org/W456"],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "https://openalex.org/W456",
          entityType: "works" as EntityType,
          label: "Referenced Work",
          entityId: "https://openalex.org/W456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceNodeId: "https://openalex.org/W123",
        targetNodeId: "https://openalex.org/W456", // Use actual node ID (full URL format)
        relationType: RelationType.REFERENCES,
        label: "references",
      });
    });

    it("should handle citation relationships correctly (real-world scenario)", async () => {
      // This test replicates the real-world scenario: both referenced_works and graph nodes use full URL format
      const workData = {
        id: "https://openalex.org/W3188841554",
        entityType: "works" as EntityType,
        display_name: "Attention Is All You Need",
        referenced_works: [
          "https://openalex.org/W2250748100", // Full URL format
          "https://openalex.org/W3200026003", // Full URL format
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "https://openalex.org/W2250748100", // Full URL format (real graph node format)
          entityType: "works" as EntityType,
          label: "Referenced Work 1",
          entityId: "https://openalex.org/W2250748100", // Full URL in entityId
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "https://openalex.org/W3200026003", // Full URL format (real graph node format)
          entityType: "works" as EntityType,
          label: "Referenced Work 2",
          entityId: "https://openalex.org/W3200026003", // Full URL in entityId
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(2);
      expect(
        result.every((r) => r.relationType === RelationType.REFERENCES),
      ).toBe(true);
      // targetNodeId should be the actual node ID (full URL format)
      expect(result.map((r) => r.targetNodeId)).toEqual([
        "https://openalex.org/W2250748100", // Full URL (node.id)
        "https://openalex.org/W3200026003", // Full URL (node.id)
      ]);
      expect(result.map((r) => r.sourceNodeId)).toEqual([
        "https://openalex.org/W3188841554",
        "https://openalex.org/W3188841554",
      ]);
    });
  });

  describe("analyzeAuthorRelationships", () => {
    it("should detect institutional affiliations", () => {
      const authorData = {
        id: "https://openalex.org/A123",
        entityType: "authors" as EntityType,
        display_name: "Test Author",
        affiliations: [
          {
            institution: {
              id: "https://openalex.org/I456",
              display_name: "Test University",
            },
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "I456",
          entityType: "institutions" as EntityType,
          label: "Test University",
          entityId: "https://openalex.org/I456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = (service as any).analyzeAuthorRelationships({
        authorData,
        existingNodes,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceNodeId: "https://openalex.org/A123",
        targetNodeId: "https://openalex.org/I456",
        relationType: RelationType.AFFILIATED,
        label: "affiliated with",
      });
    });
  });

  describe("createEdgesFromRelationships", () => {
    it("should convert relationships to graph edges", () => {
      const relationships = [
        {
          sourceNodeId: "A123",
          targetNodeId: "W456",
          relationType: RelationType.AUTHORED,
          label: "authored",
          weight: 1.0,
        },
      ];

      const result = (service as any).createEdgesFromRelationships(
        relationships,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "A123-authored-W456",
        source: "A123",
        target: "W456",
        type: "authored",
        label: "authored",
        weight: 1.0,
      });
    });
  });

  describe("fetchMinimalEntityData", () => {
    let mockDeduplicationService: any;

    beforeEach(() => {
      // Mock the request deduplication service
      mockDeduplicationService = {
        getEntity: vi.fn(),
        getStats: vi.fn(),
        clear: vi.fn(),
        refreshEntity: vi.fn(),
      };
      (service as any).deduplicationService = mockDeduplicationService;
    });

    it("should fetch minimal data for works entity", async () => {
      const mockWorkData = {
        id: "https://openalex.org/W123",
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A456",
              display_name: "Test Author",
            },
          },
        ],
        referenced_works: ["https://openalex.org/W789"],
        primary_location: {
          source: {
            id: "https://openalex.org/S321",
            display_name: "Test Journal",
          },
        },
        // Required fields for isWork type guard
        locations: [],
        publication_year: 2023,
      };

      mockDeduplicationService.getEntity.mockResolvedValue(mockWorkData);

      const result = await (service as any).fetchMinimalEntityData({
        entityId: "https://openalex.org/W123",
        entityType: "works",
      });

      expect(result).toEqual({
        id: "https://openalex.org/W123",
        entityType: "works",
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A456",
              display_name: "Test Author",
            },
          },
        ],
        primary_location: {
          source: {
            id: "https://openalex.org/S321",
            display_name: "Test Journal",
          },
        },
        referenced_works: ["https://openalex.org/W789"],
      });
    });

    it("should fetch minimal data for authors entity", async () => {
      const mockAuthorData = {
        id: "https://openalex.org/A123",
        display_name: "Test Author",
        affiliations: [
          {
            institution: {
              id: "https://openalex.org/I456",
              display_name: "Test University",
            },
          },
        ],
        // Required fields for isAuthor type guard
        works_count: 10,
        last_known_institutions: [],
        orcid: null,
      };

      mockDeduplicationService.getEntity.mockResolvedValue(mockAuthorData);

      const result = await (service as any).fetchMinimalEntityData({
        entityId: "https://openalex.org/A123",
        entityType: "authors",
      });

      expect(result).toEqual({
        id: "https://openalex.org/A123",
        entityType: "authors",
        display_name: "Test Author",
        affiliations: [
          {
            institution: {
              id: "https://openalex.org/I456",
              display_name: "Test University",
            },
          },
        ],
      });
    });

    it("should fetch minimal data for sources entity", async () => {
      const mockSourceData = {
        id: "https://openalex.org/S123",
        display_name: "Test Journal",
        publisher: "https://openalex.org/P456",
        // Required fields for isSource type guard
        issn_l: "1234-5678",
        host_organization: null,
        abbreviated_title: "Test J",
      };

      mockDeduplicationService.getEntity.mockResolvedValue(mockSourceData);

      const result = await (service as any).fetchMinimalEntityData({
        entityId: "https://openalex.org/S123",
        entityType: "sources",
      });

      expect(result).toEqual({
        id: "https://openalex.org/S123",
        entityType: "sources",
        display_name: "Test Journal",
        publisher: "https://openalex.org/P456",
      });
    });

    it("should fetch minimal data for institutions entity", async () => {
      const mockInstitutionData = {
        id: "https://openalex.org/I123",
        display_name: "Test University",
      };

      mockDeduplicationService.getEntity.mockResolvedValue(mockInstitutionData);

      const result = await (service as any).fetchMinimalEntityData({
        entityId: "https://openalex.org/I123",
        entityType: "institutions",
      });

      expect(result).toEqual({
        id: "https://openalex.org/I123",
        entityType: "institutions",
        display_name: "Test University",
      });
    });

    it("should return null if entity fetching fails", async () => {
      mockDeduplicationService.getEntity.mockRejectedValue(
        new Error("API Error"),
      );

      const result = await (service as any).fetchMinimalEntityData({
        entityId: "https://openalex.org/W123",
        entityType: "works",
      });

      expect(result).toBeNull();
    });

    it("should handle entity types with no specific field mapping", async () => {
      const mockTopicData = {
        id: "https://openalex.org/T123",
        display_name: "Test Topic",
      };

      mockDeduplicationService.getEntity.mockResolvedValue(mockTopicData);

      const result = await (service as any).fetchMinimalEntityData({
        entityId: "https://openalex.org/T123",
        entityType: "topics",
      });

      expect(result).toEqual({
        id: "https://openalex.org/T123",
        entityType: "topics",
        display_name: "Test Topic",
      });
    });
  });

  describe("analyzeWorkRelationships - advanced scenarios", () => {
    it("should handle works with multiple authors", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A456",
              display_name: "First Author",
            },
          },
          {
            author: {
              id: "https://openalex.org/A789",
              display_name: "Second Author",
            },
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "A456",
          entityType: "authors" as EntityType,
          label: "Test Author",
          entityId: "https://openalex.org/A456",
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "A789",
          entityType: "authors" as EntityType,
          label: "Second Author",
          entityId: "https://openalex.org/A789",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(2);
      expect(result[0].relationType).toBe(RelationType.AUTHORED);
      expect(result[1].relationType).toBe(RelationType.AUTHORED);
      expect(result.map((r) => r.sourceNodeId)).toEqual([
        "https://openalex.org/A456",
        "https://openalex.org/A789",
      ]);
    });

    it("should handle works with multiple referenced works", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        referenced_works: [
          "https://openalex.org/W456",
          "https://openalex.org/W789",
          "https://openalex.org/W101",
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "W456",
          entityType: "works" as EntityType,
          label: "Referenced Work 1",
          entityId: "https://openalex.org/W456",
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "W789",
          entityType: "works" as EntityType,
          label: "Referenced Work 2",
          entityId: "https://openalex.org/W789",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(2);
      expect(
        result.every((r) => r.relationType === RelationType.REFERENCES),
      ).toBe(true);
      expect(result.map((r) => r.targetNodeId)).toEqual([
        "https://openalex.org/W456", // Use entity IDs as per the fixed pattern
        "https://openalex.org/W789", // Use entity IDs as per the fixed pattern
      ]);
    });

    it("should handle works with no matching existing nodes", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A999",
              display_name: "Unknown Author",
            },
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "A456",
          entityType: "authors" as EntityType,
          label: "Different Author",
          entityId: "https://openalex.org/A456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(0);
    });

    it("should handle works with complex authorship data", async () => {
      const workData = {
        id: "https://openalex.org/W123",
        entityType: "works" as EntityType,
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A456",
              display_name: "Test Author",
            },
            institutions: [
              {
                id: "https://openalex.org/I789",
                display_name: "Test University",
              },
            ],
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "A456",
          entityType: "authors" as EntityType,
          label: "Test Author",
          entityId: "https://openalex.org/A456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = await (service as any).analyzeWorkRelationships({
        workData,
        existingNodes,
      });

      expect(result).toHaveLength(1);
      expect(result[0].relationType).toBe(RelationType.AUTHORED);
      expect(result[0].sourceNodeId).toBe("https://openalex.org/A456");
      expect(result[0].targetNodeId).toBe("https://openalex.org/W123");
    });
  });

  describe("analyzeAuthorRelationships - advanced scenarios", () => {
    it("should handle authors with multiple affiliations", () => {
      const authorData = {
        id: "https://openalex.org/A123",
        entityType: "authors" as EntityType,
        display_name: "Test Author",
        affiliations: [
          {
            institution: {
              id: "https://openalex.org/I456",
              display_name: "Primary University",
            },
          },
          {
            institution: {
              id: "https://openalex.org/I789",
              display_name: "Secondary University",
            },
          },
        ],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "I456",
          entityType: "institutions" as EntityType,
          label: "Primary University",
          entityId: "https://openalex.org/I456",
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "I789",
          entityType: "institutions" as EntityType,
          label: "Secondary University",
          entityId: "https://openalex.org/I789",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = (service as any).analyzeAuthorRelationships({
        authorData,
        existingNodes,
      });

      expect(result).toHaveLength(2);
      expect(
        result.every((r) => r.relationType === RelationType.AFFILIATED),
      ).toBe(true);
      expect(result.map((r) => r.targetNodeId)).toEqual([
        "https://openalex.org/I456",
        "https://openalex.org/I789",
      ]);
    });

    it("should handle authors with no institutional connections", () => {
      const authorData = {
        id: "https://openalex.org/A123",
        entityType: "authors" as EntityType,
        display_name: "Test Author",
        affiliations: [],
      };

      const existingNodes: GraphNode[] = [
        {
          id: "I456",
          entityType: "institutions" as EntityType,
          label: "Some University",
          entityId: "https://openalex.org/I456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = (service as any).analyzeAuthorRelationships({
        authorData,
        existingNodes,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("analyzeSourceRelationships", () => {
    it("should detect relationships with publisher", () => {
      const sourceData = {
        id: "https://openalex.org/S123",
        entityType: "sources" as EntityType,
        display_name: "Test Journal",
        publisher: "https://openalex.org/P456",
      };

      const existingNodes: GraphNode[] = [
        {
          id: "P456",
          entityType: "publishers" as EntityType,
          label: "Test Publisher",
          entityId: "https://openalex.org/P456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = (service as any).analyzeSourceRelationships({
        sourceData,
        existingNodes,
      });

      expect(result).toHaveLength(1);
      expect(result[0].relationType).toBe(RelationType.SOURCE_PUBLISHED_BY);
      expect(result[0].sourceNodeId).toBe("https://openalex.org/S123");
      expect(result[0].targetNodeId).toBe("https://openalex.org/P456");
    });

    it("should handle sources without publisher relationships", () => {
      const sourceData = {
        id: "https://openalex.org/S123",
        entityType: "sources" as EntityType,
        display_name: "Test Journal",
      };

      const existingNodes: GraphNode[] = [
        {
          id: "P456",
          entityType: "publishers" as EntityType,
          label: "Some Publisher",
          entityId: "https://openalex.org/P456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = (service as any).analyzeSourceRelationships({
        sourceData,
        existingNodes,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("analyzeInstitutionRelationships", () => {
    it("should return empty array as institutions have no predefined relationships", () => {
      const institutionData = {
        id: "https://openalex.org/I123",
        entityType: "institutions" as EntityType,
        display_name: "Test University",
      };

      const existingNodes: GraphNode[] = [
        {
          id: "A456",
          entityType: "authors" as EntityType,
          label: "Some Author",
          entityId: "https://openalex.org/A456",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      const result = (service as any).analyzeInstitutionRelationships({
        institutionData,
        existingNodes,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("createEdgesFromRelationships - advanced scenarios", () => {
    it("should handle multiple relationships with different weights", () => {
      const relationships = [
        {
          sourceNodeId: "A123",
          targetNodeId: "W456",
          relationType: RelationType.AUTHORED,
          label: "authored",
          weight: 1.0,
        },
        {
          sourceNodeId: "W456",
          targetNodeId: "S789",
          relationType: RelationType.PUBLISHED_IN,
          label: "published in",
          weight: 0.8,
        },
      ];

      const result = (service as any).createEdgesFromRelationships(
        relationships,
      );

      expect(result).toHaveLength(2);
      expect(result[0].weight).toBe(1.0);
      expect(result[1].weight).toBe(0.8);
    });

    it("should handle relationships with metadata", () => {
      const relationships = [
        {
          sourceNodeId: "A123",
          targetNodeId: "W456",
          relationType: RelationType.AUTHORED,
          label: "authored",
          weight: 1.0,
          metadata: { collaborationType: "primary" },
        },
      ];

      const result = (service as any).createEdgesFromRelationships(
        relationships,
      );

      expect(result).toHaveLength(1);
      expect(result[0].metadata).toEqual({ collaborationType: "primary" });
    });

    it("should generate unique edge IDs", () => {
      const relationships = [
        {
          sourceNodeId: "A123",
          targetNodeId: "W456",
          relationType: RelationType.AUTHORED,
          label: "authored",
        },
        {
          sourceNodeId: "A789",
          targetNodeId: "W456",
          relationType: RelationType.AUTHORED,
          label: "authored",
        },
      ];

      const result = (service as any).createEdgesFromRelationships(
        relationships,
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("A123-authored-W456");
      expect(result[1].id).toBe("A789-authored-W456");
      expect(result[0].id).not.toBe(result[1].id);
    });
  });

  describe("error handling", () => {
    let mockDeduplicationService: any;

    beforeEach(() => {
      // Mock the request deduplication service for error tests
      mockDeduplicationService = {
        getEntity: vi.fn(),
        getStats: vi.fn(),
        clear: vi.fn(),
        refreshEntity: vi.fn(),
      };
      (service as any).deduplicationService = mockDeduplicationService;
    });

    it("should handle errors in detectRelationshipsForNode gracefully", async () => {
      const testNode: GraphNode = {
        id: "W123",
        entityType: "works" as EntityType,
        label: "Test Work",
        entityId: "https://openalex.org/W123",
        x: 0,
        y: 0,
        externalIds: [],
        metadata: { hydrationLevel: "full" as const },
      };

      mockStore.getNode.mockReturnValue(testNode);
      mockDeduplicationService.getEntity.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await service.detectRelationshipsForNode("W123");

      expect(result).toEqual([]);
    });

    it("should handle malformed entity data gracefully", async () => {
      const testNode: GraphNode = {
        id: "W123",
        entityType: "works" as EntityType,
        label: "Test Work",
        entityId: "https://openalex.org/W123",
        x: 0,
        y: 0,
        externalIds: [],
        metadata: { hydrationLevel: "full" as const },
      };

      mockStore.getNode.mockReturnValue(testNode);
      mockDeduplicationService.getEntity.mockResolvedValue(null);

      const result = await service.detectRelationshipsForNode("W123");

      expect(result).toEqual([]);
    });
  });

  describe("integration scenarios", () => {
    let mockDeduplicationService: any;

    beforeEach(() => {
      mockDeduplicationService = {
        getEntity: vi.fn(),
        getStats: vi.fn(),
        clear: vi.fn(),
        refreshEntity: vi.fn(),
      };
      (service as any).deduplicationService = mockDeduplicationService;
    });

    it("should handle complex multi-entity relationship detection", async () => {
      const testNode: GraphNode = {
        id: "W123",
        entityType: "works" as EntityType,
        label: "Test Work",
        entityId: "https://openalex.org/W123",
        x: 0,
        y: 0,
        externalIds: [],
        metadata: { hydrationLevel: "full" as const },
      };

      const mockWorkData = {
        id: "https://openalex.org/W123",
        display_name: "Test Work",
        authorships: [
          {
            author: {
              id: "https://openalex.org/A456",
              display_name: "Test Author",
            },
          },
        ],
        referenced_works: ["https://openalex.org/W789"],
        primary_location: {
          source: {
            id: "https://openalex.org/S321",
            display_name: "Test Journal",
          },
        },
        // Required fields for isWork type guard
        locations: [],
        publication_year: 2023,
      };

      const existingNodes = [
        {
          id: "A456",
          entityType: "authors" as EntityType,
          label: "Test Author",
          entityId: "https://openalex.org/A456",
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "W789",
          entityType: "works" as EntityType,
          label: "Referenced Work",
          entityId: "https://openalex.org/W789",
          x: 0,
          y: 0,
          externalIds: [],
        },
        {
          id: "S321",
          entityType: "sources" as EntityType,
          label: "Test Journal",
          entityId: "https://openalex.org/S321",
          x: 0,
          y: 0,
          externalIds: [],
        },
      ];

      mockStore.getNode.mockReturnValue(testNode);
      // Set up nodes as an object (not Map) for the graph store
      mockStore.nodes = Object.fromEntries(
        existingNodes.map((node) => [node.id, node]),
      );
      mockDeduplicationService.getEntity.mockResolvedValue(mockWorkData);

      const result = await service.detectRelationshipsForNode("W123");

      expect(result).toHaveLength(3);
    });
  });

  // Note: fetchEntityWithSelect is tested via integration tests since it depends on external API client
});
