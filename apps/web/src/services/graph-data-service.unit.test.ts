/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { GraphDataService } from "./graph-data-service";
import { EntityDetectionService } from "@academic-explorer/graph";
import { useGraphStore } from "@/stores/graph-store";
import type { EntityType, SearchOptions } from "@academic-explorer/graph";
import type {
  Work,
  PartialWork,
  Author,
  Institution,
  Source,
  OpenAlexEntity,
  OpenAlexResponse,
} from "@academic-explorer/client";

// Mock client
vi.mock("@academic-explorer/client", () => ({
  cachedOpenAlex: {
    client: {
      getEntity: vi.fn(),
      works: {
        getWorks: vi.fn(),
        getWork: vi.fn(),
      },
      authors: {
        getAuthors: vi.fn(),
        getAuthor: vi.fn(),
      },
      sources: {
        getSources: vi.fn(),
        getSource: vi.fn(),
      },
      institutions: {
        searchInstitutions: vi.fn(),
        getInstitution: vi.fn(),
      },
      topics: {
        getMultiple: vi.fn(),
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
  isWork: vi.fn(),
  isAuthor: vi.fn(),
  isSource: vi.fn(),
  isInstitution: vi.fn(),
  isTopic: vi.fn(),
  isPublisher: vi.fn(),
  isFunder: vi.fn(),
}));

vi.mock("@academic-explorer/graph", () => ({
  EntityDetectionService: {
    detectEntity: vi.fn(),
  },
  RelationType: {
    AUTHORED: "authored",
    AFFILIATED: "affiliated",
    PUBLISHED_IN: "published_in",
    REFERENCES: "references",
    CITES: "cites",
    CITED_BY: "cited_by",
    SIMILAR_TO: "similar_to",
    HAS_TOPIC: "has_topic",
    WORKS_IN_SOURCE: "works_in_source",
    WORK_HAS_TOPIC: "work_has_topic",
    FUNDED_BY: "funded_by",
    SOURCE_PUBLISHED_BY: "source_published_by",
    INSTITUTION_CHILD_OF: "institution_child_of",
    RELATED_TO: "related_to",
  },
}));

vi.mock("@/stores/graph-store", () => ({
  useGraphStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/stores/expansion-settings-store", () => ({
  useExpansionSettingsStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@academic-explorer/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
}));

vi.mock("./request-deduplication-service", () => ({
  createRequestDeduplicationService: vi.fn(),
}));

vi.mock("./relationship-detection-service", () => ({
  createRelationshipDetectionService: vi.fn(),
}));

// Import mocked modules
import { cachedOpenAlex } from "@academic-explorer/client";
import { logger, logError } from "@academic-explorer/utils/logger";
import { createRequestDeduplicationService } from "./request-deduplication-service";
import { createRelationshipDetectionService } from "./relationship-detection-service";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";

describe("GraphDataService", () => {
  let service: GraphDataService;
  let queryClient: QueryClient;
  let mockStore: any;
  let mockDeduplicationService: any;
  let mockRelationshipDetectionService: any;
  let mockExpansionSettingsStore: any;

  // Test data fixtures
  const mockWorkEntity: PartialWork = {
    id: "W123456789",
    display_name: "Test Work",
    type: "article",
    publication_year: 2023,
    doi: "10.1234/test",
    ids: {
      openalex: "W123456789",
      doi: "10.1234/test",
    },
    locations: [],
    locations_count: 1,
    authorships: [
      {
        author: {
          id: "A123456789",
          display_name: "Test Author",
          orcid: "0000-0000-0000-0000",
        },
        author_position: "first",
        institutions: [
          {
            id: "I123456789",
            display_name: "Test Institution",
            ror: "01abc23de",
            type: "education",
          },
        ],
        countries: [],
        is_corresponding: false,
      },
    ],
    countries_distinct_count: 1,
    institutions_distinct_count: 1,
    corresponding_author_ids: [],
    corresponding_institution_ids: [],
    cited_by_count: 100,
    cited_by_api_url: "https://api.openalex.org/works?filter=cites:W123456789",
    counts_by_year: [],
    updated_date: "2023-01-01T00:00:00.000000Z",
    created_date: "2023-01-01T00:00:00.000000Z",
    indexed_in: [],
    open_access: {
      is_oa: true,
      oa_date: "2023-01-01",
      oa_url: "https://example.com/open-access-url",
      any_repository_has_fulltext: false,
    },
    concepts: [],
  };

  const mockAuthorEntity: Author = {
    id: "A123456789",
    display_name: "Test Author",
    orcid: "0000-0000-0000-0000",
    works_count: 25,
    cited_by_count: 500,
    affiliations: [
      {
        institution: {
          id: "I123456789",
          display_name: "Test Institution",
          ror: "01abc23de",
        },
      },
    ],
  } as Author;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock store methods
    mockStore = {
      setLoading: vi.fn(),
      setError: vi.fn(),
      clear: vi.fn(),
      addNodes: vi.fn(),
      addEdges: vi.fn(),
      calculateNodeDepths: vi.fn(),
      pinNode: vi.fn(),
      selectNode: vi.fn(),
      updateSearchStats: vi.fn(),
      getNode: vi.fn(),
      getPlaceholderNodes: vi.fn().mockReturnValue([]),
      markNodeAsLoading: vi.fn(),
      markNodeAsLoaded: vi.fn(),
      markNodeAsError: vi.fn(),
      setGraphData: vi.fn(),
      nodes: {},
      edges: {},
      pinnedNodes: new Set(),
    };

    // Mock EntityDetectionService.detectEntity static method
    vi.mocked(EntityDetectionService.detectEntity).mockImplementation(
      (id: string) => {
        if (id === "invalid-id") {
          return null;
        }
        // Detect entity type based on ID prefix
        if (id.startsWith("W")) {
          return {
            entityType: "works",
            normalizedId: id,
            originalInput: id,
            detectionMethod: "OpenAlex ID",
          };
        } else if (id.startsWith("A")) {
          return {
            entityType: "authors",
            normalizedId: id,
            originalInput: id,
            detectionMethod: "OpenAlex ID",
          };
        } else if (id.startsWith("S")) {
          return {
            entityType: "sources",
            normalizedId: id,
            originalInput: id,
            detectionMethod: "OpenAlex ID",
          };
        } else if (id.startsWith("I")) {
          return {
            entityType: "institutions",
            normalizedId: id,
            originalInput: id,
            detectionMethod: "OpenAlex ID",
          };
        }
        return {
          entityType: "works",
          normalizedId: id,
          originalInput: id,
          detectionMethod: "OpenAlex ID",
        };
      },
    );

    // Mock useGraphStore
    vi.mocked(useGraphStore.getState).mockReturnValue(mockStore);

    // Mock expansion settings store
    mockExpansionSettingsStore = {
      getSettings: vi.fn().mockReturnValue({
        target: "works",
        limit: 25,
        sorts: [],
        filters: [],
        enabled: true,
        name: "Default Settings",
      }),
    };
    vi.mocked(useExpansionSettingsStore.getState).mockReturnValue(
      mockExpansionSettingsStore,
    );

    // Mock deduplication service
    mockDeduplicationService = {
      getEntity: vi.fn(),
    };
    vi.mocked(createRequestDeduplicationService).mockReturnValue(
      mockDeduplicationService,
    );

    // Mock relationship detection service
    mockRelationshipDetectionService = {
      detectRelationshipsForNode: vi.fn().mockResolvedValue([]),
      detectRelationshipsForNodes: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(createRelationshipDetectionService).mockReturnValue(
      mockRelationshipDetectionService,
    );

    // Setup client.getEntity mock to return appropriate mock data based on ID
    vi.mocked(cachedOpenAlex.client.getEntity).mockImplementation(
      (id: string) => {
        // Handle both direct IDs and full URLs
        const entityId = id.startsWith("https://openalex.org/")
          ? id.replace("https://openalex.org/", "")
          : id;

        switch (entityId) {
          case "W123456789":
            return Promise.resolve(mockWorkEntity as OpenAlexEntity);
          case "A123456789":
            return Promise.resolve(mockAuthorEntity);
          default:
            return Promise.reject(new Error(`Entity not found: ${id}`));
        }
      },
    );

    // Setup deduplication service to return mock entities
    mockDeduplicationService.getEntity.mockImplementation((id: string) => {
      const entityId = id.startsWith("https://openalex.org/")
        ? id.replace("https://openalex.org/", "")
        : id;
      switch (entityId) {
        case "W123456789":
          return Promise.resolve(mockWorkEntity as OpenAlexEntity);
        case "A123456789":
          return Promise.resolve(mockAuthorEntity);
        default:
          return Promise.reject(new Error(`Entity not found: ${id}`));
      }
    });

    // Create service AFTER all mocks are properly set up
    service = new GraphDataService(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("constructor", () => {
    it("should initialize with QueryClient", () => {
      const newService = new GraphDataService(queryClient);
      expect(newService).toBeInstanceOf(GraphDataService);
    });

    it("should initialize cache with empty maps and sets", () => {
      // Cache is private, but we can verify behavior through other methods
      expect(service).toBeDefined();
    });
  });

  describe("loadEntityGraph", () => {
    it("should load entity graph successfully", async () => {
      await service.loadEntityGraph("W123456789");

      expect(mockStore.setLoading).toHaveBeenCalledWith(true);
      expect(mockStore.setError).toHaveBeenCalledWith(null);
      expect(EntityDetectionService.detectEntity).toHaveBeenCalledWith(
        "W123456789",
      );
      expect(mockDeduplicationService.getEntity).toHaveBeenCalledWith(
        "https://openalex.org/W123456789",
        expect.any(Function),
      );
      expect(mockStore.clear).toHaveBeenCalled();
      expect(mockStore.addNodes).toHaveBeenCalled();
      expect(mockStore.addEdges).toHaveBeenCalled();
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });

    it("should handle entity detection failure", async () => {
      vi.mocked(EntityDetectionService.detectEntity).mockReturnValueOnce(null);

      await service.loadEntityGraph("invalid-id");

      expect(mockStore.setError).toHaveBeenCalledWith(
        "Unable to detect entity type for: invalid-id",
      );
      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to load entity graph",
        expect.any(Error),
        "GraphDataService",
        "graph",
      );
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });

    it("should handle API errors", async () => {
      const apiError = new Error("API error");
      mockDeduplicationService.getEntity.mockRejectedValueOnce(apiError);

      await service.loadEntityGraph("W123456789");

      expect(mockStore.setError).toHaveBeenCalledWith("API error");
      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to load entity graph",
        apiError,
        "GraphDataService",
        "graph",
      );
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe("loadEntityIntoGraph", () => {
    it("should select existing node if it exists", async () => {
      const existingNode = {
        id: "node-1",
        entityId: "A123456789",
        entityData: {
          id: "https://openalex.org/A123456789",
          display_name: "Test Entity",
        },
      };

      mockStore.nodes = { "node-1": existingNode };

      await service.loadEntityIntoGraph("A123456789");

      expect(mockStore.selectNode).toHaveBeenCalledWith("node-1");
      expect(mockDeduplicationService.getEntity).not.toHaveBeenCalled();
    });

    it("should load new entity if not exists", async () => {
      mockStore.nodes = {};

      await service.loadEntityIntoGraph("A123456789");

      expect(EntityDetectionService.detectEntity).toHaveBeenCalledWith(
        "A123456789",
      );
      expect(mockDeduplicationService.getEntity).toHaveBeenCalledWith(
        "https://openalex.org/A123456789",
        expect.any(Function),
      );
      expect(mockStore.addNodes).toHaveBeenCalled();
      expect(mockStore.addEdges).toHaveBeenCalled();
    });

    it("should handle detection errors", async () => {
      vi.mocked(EntityDetectionService.detectEntity).mockReturnValueOnce(null);

      await service.loadEntityIntoGraph("invalid-id");

      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to load entity into graph",
        expect.any(Error),
        "GraphDataService",
        "graph",
      );
    });
  });

  describe("searchAndVisualize", () => {
    const searchQuery = "machine learning";
    const searchOptions: SearchOptions = {
      query: searchQuery,
      entityTypes: ["works"],
      limit: 10,
    };

    beforeEach(() => {
      // Mock the individual client methods
      vi.mocked(cachedOpenAlex.client.works.getWorks).mockResolvedValue({
        results: [mockWorkEntity as Work],
        meta: { count: 1, per_page: 25, page: 1, db_response_time_ms: 50 },
      });
      vi.mocked(cachedOpenAlex.client.authors.getAuthors).mockResolvedValue({
        results: [],
        meta: { count: 0, per_page: 25, page: 1, db_response_time_ms: 30 },
      });
      vi.mocked(cachedOpenAlex.client.sources.getSources).mockResolvedValue({
        results: [],
        meta: { count: 0, per_page: 25, page: 1, db_response_time_ms: 40 },
      });
      vi.mocked(
        cachedOpenAlex.client.institutions.searchInstitutions,
      ).mockResolvedValue({
        results: [],
        meta: { count: 0, per_page: 25, page: 1, db_response_time_ms: 35 },
      });
      vi.mocked(cachedOpenAlex.client.topics.getMultiple).mockResolvedValue({
        results: [],
        meta: { count: 0, per_page: 25, page: 1, db_response_time_ms: 45 },
      });
    });

    it("should perform search and visualize results", async () => {
      await service.searchAndVisualize(searchQuery, searchOptions);

      expect(mockStore.setLoading).toHaveBeenCalledWith(true);
      expect(cachedOpenAlex.client.works.getWorks).toHaveBeenCalledWith({
        search: searchQuery,
        per_page: 10,
      });
      expect(mockStore.clear).toHaveBeenCalled();
      expect(mockStore.addNodes).toHaveBeenCalled();
      expect(mockStore.addEdges).toHaveBeenCalled();
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });

    it("should handle search errors gracefully", async () => {
      const searchError = new Error("Search failed");
      vi.mocked(cachedOpenAlex.client.works.getWorks).mockRejectedValueOnce(
        searchError,
      );

      await service.searchAndVisualize(searchQuery, searchOptions);

      expect(mockStore.setError).toHaveBeenCalledWith(null);
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
      expect(mockStore.clear).toHaveBeenCalled();
      expect(mockStore.addNodes).toHaveBeenCalled();
    });
  });

  describe("private method behaviors through public interface", () => {
    it("should transform work entity correctly", async () => {
      await service.loadEntityGraph("W123456789");

      expect(mockStore.addNodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            entityId: "W123456789",
            entityType: "works",
            label: "Test Work",
          }),
        ]),
      );
      expect(mockStore.addEdges).toHaveBeenCalled();
    });

    it("should transform author entity correctly", async () => {
      await service.loadEntityGraph("A123456789");

      expect(mockStore.addNodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            entityId: "A123456789",
            entityType: "authors",
            label: "Test Author",
          }),
        ]),
      );
    });

    it("should extract DOI from work entity", async () => {
      const workWithDoi: PartialWork = {
        ...mockWorkEntity,
        doi: "10.1234/test-doi",
      };

      mockDeduplicationService.getEntity.mockResolvedValueOnce(workWithDoi);

      await service.loadEntityGraph("W123456789");

      expect(mockStore.addNodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            externalIds: expect.arrayContaining([
              expect.objectContaining({
                type: "doi",
                value: "10.1234/test-doi",
              }),
            ]),
          }),
        ]),
      );
    });

    it("should extract ORCID from author entity", async () => {
      const authorWithOrcid: Author = {
        ...mockAuthorEntity,
        orcid: "0000-0000-0000-0001",
      };

      mockDeduplicationService.getEntity.mockResolvedValueOnce(authorWithOrcid);

      await service.loadEntityGraph("A123456789");

      expect(mockStore.addNodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            externalIds: expect.arrayContaining([
              expect.objectContaining({
                type: "orcid",
                value: "0000-0000-0000-0001",
              }),
            ]),
          }),
        ]),
      );
    });
  });

  describe("error handling", () => {
    it("should handle unknown entity types gracefully", async () => {
      const unknownEntity = {
        id: "X123456789",
        display_name: "Unknown Entity",
        type: "article",
        authorships: [],
        locations: [],
        locations_count: 0,
        countries_distinct_count: 0,
        institutions_distinct_count: 0,
        corresponding_author_ids: [],
        corresponding_institution_ids: [],
        cited_by_count: 0,
        cited_by_api_url:
          "https://api.openalex.org/works?filter=cites:X123456789",
        counts_by_year: [],
        updated_date: "2023-01-01T00:00:00.000000Z",
        created_date: "2023-01-01T00:00:00.000000Z",
        indexed_in: [],
        open_access: {
          is_oa: false,
          any_repository_has_fulltext: false,
        },
        concepts: [],
      };

      mockDeduplicationService.getEntity.mockResolvedValueOnce(
        unknownEntity as unknown as OpenAlexEntity,
      );

      await service.loadEntityGraph("X123456789");

      expect(mockStore.addNodes).toHaveBeenCalled();
    });

    it("should handle missing optional entity properties", async () => {
      const minimalWork: PartialWork = {
        id: "W123456789",
        display_name: "Minimal Work",
        type: "article",
        authorships: [],
        locations: [],
        locations_count: 0,
        countries_distinct_count: 0,
        institutions_distinct_count: 0,
        corresponding_author_ids: [],
        corresponding_institution_ids: [],
        cited_by_count: 0,
        cited_by_api_url:
          "https://api.openalex.org/works?filter=cites:W123456789",
        counts_by_year: [],
        updated_date: "2023-01-01T00:00:00.000000Z",
        created_date: "2023-01-01T00:00:00.000000Z",
        indexed_in: [],
        open_access: {
          is_oa: false,
          any_repository_has_fulltext: false,
        },
        concepts: [],
      };

      mockDeduplicationService.getEntity.mockResolvedValueOnce(
        minimalWork as Work,
      );

      await service.loadEntityGraph("W123456789");

      expect(mockStore.addNodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            entityId: "W123456789",
            entityType: "works",
            label: "Minimal Work",
          }),
        ]),
      );
    });
  });
});
