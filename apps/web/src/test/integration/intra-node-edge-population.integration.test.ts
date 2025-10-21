/**
 * Integration tests for intra-node edge population
 * Verifies that all edges between related nodes are automatically created when nodes are added to the graph
 */

import type {
  Author,
  InstitutionEntity,
  Source,
  Work,
} from "@academic-explorer/types";
import type { EntityType, GraphNode } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the graph store with properly shared state
const { mockStore } = vi.hoisted(() => {
  // This is the shared state object that both test and service will see
  const sharedState = {
    nodes: {} as Record<string, GraphNode>,
    edges: {} as Record<string, any>,
    // Store methods that operate on shared state
    addNode: (node: GraphNode) => {
      sharedState.nodes[node.id] = node;
    },
    addNodes: (nodes: GraphNode[]) => {
      nodes.forEach((node) => {
        sharedState.nodes[node.id] = node;
      });
    },
    addEdge: (edge: any) => {
      sharedState.edges[edge.id] = edge;
    },
    addEdges: (edges: any[]) => {
      edges.forEach((edge) => {
        sharedState.edges[edge.id] = edge;
      });
    },
    getNode: (nodeId: string) => sharedState.nodes[nodeId],
    clear: () => {
      sharedState.nodes = {};
      sharedState.edges = {};
    },
    // Add other methods as no-ops but also operate on shared state
    removeNode: vi.fn(),
    removeEdge: vi.fn(),
    updateNode: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setGraphData: vi.fn(),
    selectNode: vi.fn(),
    hoverNode: vi.fn(),
    addToSelection: vi.fn(),
    removeFromSelection: vi.fn(),
    clearSelection: vi.fn(),
    pinNode: vi.fn(),
    unpinNode: vi.fn(),
    clearAllPinnedNodes: vi.fn(),
    isPinned: vi.fn(() => false),
    setLayout: vi.fn(),
    applyCurrentLayout: vi.fn(),
    toggleEntityTypeVisibility: vi.fn(),
    toggleEdgeTypeVisibility: vi.fn(),
    setEntityTypeVisibility: vi.fn(),
    setEdgeTypeVisibility: vi.fn(),
    setAllEntityTypesVisible: vi.fn(),
    resetEntityTypesToDefaults: vi.fn(),
    getEntityTypeStats: vi.fn(() => ({
      total: {},
      visible: {},
      searchResults: {},
    })),
    getVisibleNodes: vi.fn(() => Object.values(sharedState.nodes)),
    setShowAllCachedNodes: vi.fn(),
    setTraversalDepth: vi.fn(),
    updateSearchStats: vi.fn(),
    markNodeAsLoading: vi.fn(),
    markNodeAsLoaded: vi.fn(),
    markNodeAsError: vi.fn(),
    calculateNodeDepths: vi.fn(),
    getMinimalNodes: vi.fn(() => Object.values(sharedState.nodes)),
    getNodesWithinDepth: vi.fn(() => []),
    getNeighbors: vi.fn(() => []),
    getConnectedEdges: vi.fn(() => []),
    findShortestPath: vi.fn(() => []),
    getConnectedComponent: vi.fn(() => []),
    setProvider: vi.fn(),
    setProviderType: vi.fn(),
    hasPlaceholderOrLoadingNodes: vi.fn(() => false),
  };

  // The mock store object that Zustand would normally return
  const mockStore = {
    getState: () => ({
      ...sharedState,
      // Include all methods in the state object for tests that call getState()
      addNode: sharedState.addNode,
      addNodes: sharedState.addNodes,
      addEdge: sharedState.addEdge,
      addEdges: sharedState.addEdges,
      getNode: sharedState.getNode,
      clear: sharedState.clear,
      removeNode: sharedState.removeNode,
      removeEdge: sharedState.removeEdge,
      updateNode: sharedState.updateNode,
      setLoading: sharedState.setLoading,
      setError: sharedState.setError,
      setGraphData: sharedState.setGraphData,
      selectNode: sharedState.selectNode,
      hoverNode: sharedState.hoverNode,
      addToSelection: sharedState.addToSelection,
      removeFromSelection: sharedState.removeFromSelection,
      clearSelection: sharedState.clearSelection,
      pinNode: sharedState.pinNode,
      unpinNode: sharedState.unpinNode,
      clearAllPinnedNodes: sharedState.clearAllPinnedNodes,
      isPinned: sharedState.isPinned,
      setLayout: sharedState.setLayout,
      applyCurrentLayout: sharedState.applyCurrentLayout,
      toggleEntityTypeVisibility: sharedState.toggleEntityTypeVisibility,
      toggleEdgeTypeVisibility: sharedState.toggleEdgeTypeVisibility,
      setEntityTypeVisibility: sharedState.setEntityTypeVisibility,
      setEdgeTypeVisibility: sharedState.setEdgeTypeVisibility,
      setAllEntityTypesVisible: sharedState.setAllEntityTypesVisible,
      resetEntityTypesToDefaults: sharedState.resetEntityTypesToDefaults,
      getEntityTypeStats: sharedState.getEntityTypeStats,
      getVisibleNodes: sharedState.getVisibleNodes,
      setShowAllCachedNodes: sharedState.setShowAllCachedNodes,
      setTraversalDepth: sharedState.setTraversalDepth,
      updateSearchStats: sharedState.updateSearchStats,
      markNodeAsLoading: sharedState.markNodeAsLoading,
      markNodeAsLoaded: sharedState.markNodeAsLoaded,
      markNodeAsError: sharedState.markNodeAsError,
      calculateNodeDepths: sharedState.calculateNodeDepths,
      getMinimalNodes: sharedState.getMinimalNodes,
      getNodesWithinDepth: sharedState.getNodesWithinDepth,
      getNeighbors: sharedState.getNeighbors,
      getConnectedEdges: sharedState.getConnectedEdges,
      findShortestPath: sharedState.findShortestPath,
      getConnectedComponent: sharedState.getConnectedComponent,
      setProvider: sharedState.setProvider,
      setProviderType: sharedState.setProviderType,
      hasPlaceholderOrLoadingNodes: sharedState.hasPlaceholderOrLoadingNodes,
    }),
    setState: vi.fn(),
    // Direct access to shared state properties and methods for tests
    get nodes() {
      return sharedState.nodes;
    },
    get edges() {
      return sharedState.edges;
    },
    addNode: sharedState.addNode,
    addNodes: sharedState.addNodes,
    addEdge: sharedState.addEdge,
    addEdges: sharedState.addEdges,
    getNode: sharedState.getNode,
    clear: sharedState.clear,
    // All other methods
    removeNode: sharedState.removeNode,
    removeEdge: sharedState.removeEdge,
    updateNode: sharedState.updateNode,
    setLoading: sharedState.setLoading,
    setError: sharedState.setError,
    setGraphData: sharedState.setGraphData,
    selectNode: sharedState.selectNode,
    hoverNode: sharedState.hoverNode,
    addToSelection: sharedState.addToSelection,
    removeFromSelection: sharedState.removeFromSelection,
    clearSelection: sharedState.clearSelection,
    pinNode: sharedState.pinNode,
    unpinNode: sharedState.unpinNode,
    clearAllPinnedNodes: sharedState.clearAllPinnedNodes,
    isPinned: sharedState.isPinned,
    setLayout: sharedState.setLayout,
    applyCurrentLayout: sharedState.applyCurrentLayout,
    toggleEntityTypeVisibility: sharedState.toggleEntityTypeVisibility,
    toggleEdgeTypeVisibility: sharedState.toggleEdgeTypeVisibility,
    setEntityTypeVisibility: sharedState.setEntityTypeVisibility,
    setEdgeTypeVisibility: sharedState.setEdgeTypeVisibility,
    setAllEntityTypesVisible: sharedState.setAllEntityTypesVisible,
    resetEntityTypesToDefaults: sharedState.resetEntityTypesToDefaults,
    getEntityTypeStats: sharedState.getEntityTypeStats,
    getVisibleNodes: sharedState.getVisibleNodes,
    setShowAllCachedNodes: sharedState.setShowAllCachedNodes,
    setTraversalDepth: sharedState.setTraversalDepth,
    updateSearchStats: sharedState.updateSearchStats,
    markNodeAsLoading: sharedState.markNodeAsLoading,
    markNodeAsLoaded: sharedState.markNodeAsLoaded,
    markNodeAsError: sharedState.markNodeAsError,
    calculateNodeDepths: sharedState.calculateNodeDepths,
    getMinimalNodes: sharedState.getMinimalNodes,
    getNodesWithinDepth: sharedState.getNodesWithinDepth,
    getNeighbors: sharedState.getNeighbors,
    getConnectedEdges: sharedState.getConnectedEdges,
    findShortestPath: sharedState.findShortestPath,
    getConnectedComponent: sharedState.getConnectedComponent,
    setProvider: sharedState.setProvider,
    setProviderType: sharedState.setProviderType,
    hasPlaceholderOrLoadingNodes: sharedState.hasPlaceholderOrLoadingNodes,
  };

  return { mockStore };
});

vi.mock("../../stores/graph-store", () => ({
  useGraphStore: mockStore,
  graphStore: mockStore,
}));

// Mock the cached client with proper nested structure
const {
  mockWorks,
  mockAuthors,
  mockSources,
  mockInstitutions,
  mockTopics,
  mockPublishers,
  mockFunders,
  mockKeywords,
  mockClient,
} = vi.hoisted(() => ({
  mockWorks: { getWork: vi.fn() },
  mockAuthors: { getAuthor: vi.fn() },
  mockSources: { getSource: vi.fn() },
  mockInstitutions: { getInstitution: vi.fn() },
  mockTopics: { get: vi.fn() },
  mockPublishers: { get: vi.fn() },
  mockFunders: { get: vi.fn() },
  mockKeywords: { getKeyword: vi.fn() },
  mockClient: {
    works: { getWork: vi.fn() },
    authors: { getAuthor: vi.fn() },
    sources: { getSource: vi.fn() },
    institutions: { getInstitution: vi.fn() },
    topics: { get: vi.fn() },
    publishers: { get: vi.fn() },
    funders: { get: vi.fn() },
    keywords: { getKeyword: vi.fn() },
  },
}));

vi.mock("@academic-explorer/client", () => {
  return {
    cachedOpenAlex: {
      client: mockClient,
    },
    // Type guards that work with test data
    isWork: vi.fn(
      (entity: unknown) =>
        entity !== null &&
        typeof entity === "object" &&
        "authorships" in entity,
    ),
    isAuthor: vi.fn(
      (entity: unknown) =>
        entity !== null &&
        typeof entity === "object" &&
        "affiliations" in entity,
    ),

    isSource: vi.fn(
      (entity: unknown) =>
        entity !== null && typeof entity === "object" && "issn_l" in entity,
    ),
    isInstitution: vi.fn(
      (entity: unknown) =>
        entity !== null && typeof entity === "object" && "lineage" in entity,
    ),
    isNonNull: vi.fn(
      <T>(value: T | null | undefined): value is T =>
        value !== null && value !== undefined,
    ),
    isOpenAlexEntity: vi.fn(
      (entity: unknown) =>
        entity !== null && typeof entity === "object" && "id" in entity,
    ),
    ADVANCED_FIELD_SELECTIONS: {
      works: {
        minimal: [
          "id",
          "display_name",
          "authorships",
          "primary_location",
          "referenced_works",
          "publication_year",
          "type",
          "open_access",
        ],
      },
      authors: {
        minimal: [
          "id",
          "display_name",
          "affiliations",
          "works_count",
          "last_known_institutions",
        ],
      },
      sources: { minimal: ["id", "display_name", "publisher", "type"] },
      institutions: {
        minimal: ["id", "display_name", "lineage", "country_code", "type"],
      },
      concepts: { minimal: ["id", "display_name", "keywords"] },
      topics: { minimal: ["id", "display_name", "keywords"] },
      publishers: { minimal: ["id", "display_name", "works_count"] },
      funders: { minimal: ["id", "display_name", "works_count"] },
    },
  };
});

// Mock logger to prevent test output noise
vi.mock("@academic-explorer/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logError: vi.fn(),
}));

// Mock network interceptor to prevent dependency issues
vi.mock("@/services/network-interceptor", () => ({
  trackDeduplication: vi.fn(),
  trackCacheOperation: vi.fn(),
}));

// Mock request deduplication service to prevent API calls
vi.mock("@/services/request-deduplication-service", () => ({
  createRequestDeduplicationService: vi.fn(() => ({
    getEntity: vi.fn(async (entityId: string, fallback: () => Promise<any>) => {
      // Call the fallback function which should be our mocked API
      return await fallback();
    }),
  })),
}));

// Test data fixtures - realistic OpenAlex entities
const createMockWork = (
  id: string,
  authorIds: string[] = [],
  sourceId?: string,
  referencedWorkIds: string[] = [],
): Work =>
  ({
    id,
    display_name: `Test Work ${id}`,
    authorships: authorIds.map((authorId, index) => ({
      author: {
        id: authorId,
        display_name: `Test Author ${authorId}`,
      },
      institutions: [],
      is_corresponding: false,
      raw_author_name: `Test Author ${authorId}`,
      raw_affiliation_strings: [],
      author_position: `first` as const,
      countries: [],
    })),
    locations: [], // Required by isWork type guard
    primary_location: sourceId
      ? {
          source: {
            id: sourceId,
            display_name: `Test Source ${sourceId}`,
            issn_l: `1234-567${sourceId.slice(-1)}`,
            issn: [`1234-567${sourceId.slice(-1)}`],
            is_oa: false,
            is_in_doaj: false,
            type: "journal",
          } as any,
          landing_page_url: `https://example.com/${id}`,
          is_oa: false,
          version: undefined,
          license: undefined,
        }
      : undefined,
    referenced_works: referencedWorkIds,
    publication_year: 2023,
    type: "article",
    open_access: {
      is_oa: false,
      oa_date: undefined,
      oa_url: undefined,
      any_repository_has_fulltext: false,
    },
    biblio: {
      volume: "1",
      issue: "1",
      first_page: "1",
      last_page: "10",
    },
    is_retracted: false,
    is_paratext: false,
    language: "en",
    grants: [],
    apc_list: undefined,
    apc_paid: undefined,
    has_fulltext: false,
    fulltext_origin: undefined,
    cited_by_count: 0,
    cited_by_api_url: `https://api.openalex.org/works?filter=cites:${id}`,
    counts_by_year: [],
    updated_date: new Date().toISOString(),
    created_date: new Date().toISOString(),
  }) as any;

const createMockAuthor = (id: string, institutionIds: string[] = []): Author =>
  ({
    id,
    display_name: `Test Author ${id}`,
    affiliations: institutionIds.map((institutionId) => ({
      institution: {
        id: institutionId,
        display_name: `Test Institution ${institutionId}`,
        type: "education",
      } as any,
      years: [2023],
    })),
    orcid: undefined,
    works_count: 10,
    cited_by_count: 100,
    last_known_institutions: institutionIds.map((institutionId) => ({
      // Required by isAuthor type guard
      id: institutionId,
      display_name: `Test Institution ${institutionId}`,
      type: "education",
    })) as any,
    counts_by_year: [],
    works_api_url: `https://api.openalex.org/works?filter=author.id:${id}`,
    updated_date: new Date().toISOString(),
    created_date: new Date().toISOString(),
  }) as any;

const createMockSource = (id: string, publisherId?: string): Source =>
  ({
    id,
    display_name: `Test Source ${id}`,
    issn_l: `1234-567${id.slice(-1)}`,
    issn: [`1234-567${id.slice(-1)}`],
    publisher: publisherId || undefined,
    host_organization_name: publisherId
      ? `Test Publisher ${publisherId}`
      : undefined,
    host_organization_lineage: publisherId ? [publisherId] : [],
    entityType: "journal",
    homepage_url: `https://example.com/source/${id}`,
    apc_prices: [],
    apc_usd: undefined,
    country_code: "US",
    societies: [],
    is_oa: false,
    is_in_doaj: false,
    works_count: 1000,
    cited_by_count: 5000,
    h_index: 25,
    i10_index: 100,
    counts_by_year: [],
    works_api_url: `https://api.openalex.org/works?filter=primary_location.source.id:${id}`,
    updated_date: new Date().toISOString(),
    created_date: new Date().toISOString(),
  }) as any;

const createMockInstitution = (
  id: string,
  parentIds: string[] = [],
): InstitutionEntity =>
  ({
    id,
    display_name: `Test Institution ${id}`,
    ror: `https://ror.org/${id}`,
    country_code: "US",
    entityType: "education",
    lineage: [id, ...parentIds],
    homepage_url: `https://example.com/institution/${id}`,
    image_url: undefined,
    image_thumbnail_url: undefined,
    display_name_acronyms: [],
    display_name_alternatives: [],
    works_count: 5000,
    cited_by_count: 25000,
    counts_by_year: [],
    works_api_url: `https://api.openalex.org/works?filter=institutions.id:${id}`,
    updated_date: new Date().toISOString(),
    created_date: new Date().toISOString(),
    geo: {
      city: "Test City",
      geonames_city_id: "123456",
      region: "Test State",
      country_code: "US",
      country: "United States",
      latitude: 40.7128,
      longitude: -74.006,
    },
    international: {
      display_name: {
        en: `Test Institution ${id}`,
      },
    },
    repositories: [],
    roles: [],
  }) as any;

// Helper to create test graph nodes matching the actual GraphNode interface
const createTestNode = (
  entityId: string,
  entityType: EntityType,
  entity: any,
): GraphNode => ({
  id: entityId, // Use same ID pattern as production
  entityId,
  entityType,
  label: entity.display_name,
  x: 0,
  y: 0,
  externalIds: [],
  entityData: entity,
});

// Import services after mocks are set up
import {
  RelationshipDetectionService,
  createRelationshipDetectionService,
} from "../../services/relationship-detection-service";
import { useGraphStore } from "../../stores/graph-store";

describe("Intra-Node Edge Population Integration Tests", () => {
  let queryClient: QueryClient;
  let relationshipService: RelationshipDetectionService;

  beforeEach(async () => {
    // Clear the mocked store state
    mockStore.clear();

    // Create fresh services
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    relationshipService = createRelationshipDetectionService(queryClient);

    // Clear all mocks
    vi.clearAllMocks();

    // Clear all mock functions
    mockClient.works.getWork.mockReset();
    mockClient.authors.getAuthor.mockReset();
    mockClient.sources.getSource.mockReset();
    mockClient.institutions.getInstitution.mockReset();
    mockClient.topics.get.mockReset();
    mockClient.publishers.get.mockReset();
    mockClient.funders.get.mockReset();
    mockClient.keywords.getKeyword.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Single Node Relationship Detection", () => {
    it("should detect and create authorship edges when adding a work with existing authors", async () => {
      // Create test data
      const authorId = "https://openalex.org/A123";
      const workId = "https://openalex.org/W456";

      const author = createMockAuthor(authorId);
      const work = createMockWork(workId, [authorId]);

      // Mock API responses - ensure the API returns the same work data
      // Handle both with and without select parameters
      mockClient.works.getWork.mockImplementation(
        (id: string, params?: any) => {
          if (id === workId) {
            return Promise.resolve(work);
          }
          return Promise.reject(new Error(`Unknown work ID: ${id}`));
        },
      );

      // First, add the author node to the graph
      const authorNode = createTestNode(authorId, "authors", author);
      mockStore.addNode(authorNode);

      // Now add the work and detect relationships
      const workNode = createTestNode(workId, "works", work);
      mockStore.addNode(workNode);

      // Detect relationships for the work
      const detectedEdges =
        await relationshipService.detectRelationshipsForNode(workNode.id);

      // Verify authorship edge was created
      expect(detectedEdges).toHaveLength(1);
      expect(detectedEdges[0]).toMatchObject({
        source: authorId,
        target: workId,
        type: RelationType.AUTHORED,
        label: "authored",
      });

      // Note: The RelationshipDetectionService adds edges to the store automatically
      // So we should see them in the store after detection
      const edgeValues = Object.values(mockStore.edges).filter(Boolean);
      expect(edgeValues).toHaveLength(1);
      expect(edgeValues[0]).toMatchObject({
        source: authorId,
        target: workId,
        type: RelationType.AUTHORED,
      });
    });

    it("should detect and create publication edges when adding a work with existing source", async () => {
      const store = useGraphStore as any;

      // Create test data
      const sourceId = "https://openalex.org/S789";
      const workId = "https://openalex.org/W456";

      const source = createMockSource(sourceId);
      const work = createMockWork(workId, [], sourceId);

      // Mock API responses
      mockClient.works.getWork.mockResolvedValue(work);

      // First, add the source node to the graph
      const sourceNode = createTestNode(sourceId, "sources", source);
      store.addNode(sourceNode);

      // Now add the work and detect relationships
      const workNode = createTestNode(workId, "works", work);
      store.addNode(workNode);

      // Detect relationships for the work
      const detectedEdges =
        await relationshipService.detectRelationshipsForNode(workNode.id);

      // Verify publication edge was created
      expect(detectedEdges).toHaveLength(1);
      expect(detectedEdges[0]).toMatchObject({
        source: workId,
        target: sourceId,
        type: RelationType.PUBLISHED_IN,
        label: "published in",
      });
    });

    it("should detect and create citation edges when adding a work that references existing works", async () => {
      const store = useGraphStore as any;

      // Create test data
      const referencedWorkId1 = "https://openalex.org/W111";
      const referencedWorkId2 = "https://openalex.org/W222";
      const citingWorkId = "https://openalex.org/W456";

      const referencedWork1 = createMockWork(referencedWorkId1);
      const referencedWork2 = createMockWork(referencedWorkId2);
      const citingWork = createMockWork(citingWorkId, [], undefined, [
        referencedWorkId1,
        referencedWorkId2,
      ]);

      // Mock API responses - ensure the API returns the correct work data
      mockClient.works.getWork.mockImplementation(
        (id: string, params?: any) => {
          if (id === citingWorkId) {
            return Promise.resolve({
              ...citingWork,
              referenced_works: [referencedWorkId1, referencedWorkId2],
            });
          }
          return Promise.reject(new Error(`Unknown work ID: ${id}`));
        },
      );

      // First, add the referenced works to the graph
      const referencedNode1 = createTestNode(
        referencedWorkId1,
        "works",
        referencedWork1,
      );
      const referencedNode2 = createTestNode(
        referencedWorkId2,
        "works",
        referencedWork2,
      );
      store.addNode(referencedNode1);
      store.addNode(referencedNode2);

      // Now add the citing work and detect relationships
      const citingNode = createTestNode(citingWorkId, "works", citingWork);
      store.addNode(citingNode);

      // Check if node exists in store
      const graphStore = useGraphStore as any;
      const foundNode = graphStore.getNode(citingNode.id);

      // Detect relationships for the citing work
      const detectedEdges =
        await relationshipService.detectRelationshipsForNode(citingNode.id);

      // Verify citation edges were created
      expect(detectedEdges).toHaveLength(2);

      const citationEdge1 = detectedEdges.find(
        (edge) => edge.target === referencedWorkId1,
      );
      const citationEdge2 = detectedEdges.find(
        (edge) => edge.target === referencedWorkId2,
      );

      expect(citationEdge1).toMatchObject({
        source: citingWorkId,
        target: referencedWorkId1,
        type: RelationType.REFERENCES,
        label: "references",
      });

      expect(citationEdge2).toMatchObject({
        source: citingWorkId,
        target: referencedWorkId2,
        type: RelationType.REFERENCES,
        label: "references",
      });
    });

    it("should detect and create affiliation edges when adding an author with existing institutions", async () => {
      const store = useGraphStore as any;

      // Create test data
      const institutionId = "https://openalex.org/I123";
      const authorId = "https://openalex.org/A456";

      const institution = createMockInstitution(institutionId);
      const author = createMockAuthor(authorId, [institutionId]);

      // Mock API responses
      mockClient.authors.getAuthor.mockResolvedValue(author);

      // First, add the institution node to the graph
      const institutionNode = createTestNode(
        institutionId,
        "institutions",
        institution,
      );
      store.addNode(institutionNode);

      // Now add the author and detect relationships
      const authorNode = createTestNode(authorId, "authors", author);
      store.addNode(authorNode);

      // Detect relationships for the author
      const detectedEdges =
        await relationshipService.detectRelationshipsForNode(authorNode.id);

      // Verify affiliation edge was created
      expect(detectedEdges).toHaveLength(1);
      expect(detectedEdges[0]).toMatchObject({
        source: authorId,
        target: institutionId,
        type: RelationType.AFFILIATED,
        label: "affiliated with",
      });
    });
  });

  describe("Batch Relationship Detection", () => {
    it("should detect relationships between all nodes when multiple related nodes are added together", async () => {
      const store = useGraphStore as any;

      // Create test data - a complete research network
      const authorId = "https://openalex.org/A123";
      const institutionId = "https://openalex.org/I456";
      const sourceId = "https://openalex.org/S789";
      const workId = "https://openalex.org/W101";

      const author = createMockAuthor(authorId, [institutionId]);
      const institution = createMockInstitution(institutionId);
      const source = createMockSource(sourceId);
      const work = createMockWork(workId, [authorId], sourceId);

      // Mock API responses for all entities
      mockClient.authors.getAuthor.mockResolvedValue(author);
      mockClient.institutions.getInstitution.mockResolvedValue(institution);
      mockClient.sources.getSource.mockResolvedValue(source);
      mockClient.works.getWork.mockResolvedValue(work);

      // Create all nodes
      const authorNode = createTestNode(authorId, "authors", author);
      const institutionNode = createTestNode(
        institutionId,
        "institutions",
        institution,
      );
      const sourceNode = createTestNode(sourceId, "sources", source);
      const workNode = createTestNode(workId, "works", work);

      // Add all nodes to the graph
      store.addNodes([authorNode, institutionNode, sourceNode, workNode]);

      // Detect relationships for all nodes in batch
      const allNodeIds = [
        authorNode.id,
        institutionNode.id,
        sourceNode.id,
        workNode.id,
      ];
      const detectedEdges =
        await relationshipService.detectRelationshipsForNodes(allNodeIds);

      // Verify all expected relationships were created
      expect(detectedEdges.length).toBeGreaterThanOrEqual(3);

      // Check for authorship edge
      const authorshipEdge = detectedEdges.find(
        (edge) =>
          edge.type === RelationType.AUTHORED &&
          edge.source === authorId &&
          edge.target === workId,
      );
      expect(authorshipEdge).toBeDefined();

      // Check for affiliation edge
      const affiliationEdge = detectedEdges.find(
        (edge) =>
          edge.type === RelationType.AFFILIATED &&
          edge.source === authorId &&
          edge.target === institutionId,
      );
      expect(affiliationEdge).toBeDefined();

      // Check for publication edge
      const publicationEdge = detectedEdges.find(
        (edge) =>
          edge.type === RelationType.PUBLISHED_IN &&
          edge.source === workId &&
          edge.target === sourceId,
      );
      expect(publicationEdge).toBeDefined();

      // Verify edges were added to the store
      const storeState = useGraphStore as any;
      const edgeValues = Object.values(storeState.edges).filter(Boolean);
      expect(edgeValues.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Cross-Batch Relationship Detection", () => {
    it("should detect citation relationships between works added in the same batch", async () => {
      const store = useGraphStore as any;

      // Create test data - two works where one cites the other
      const referencedWorkId = "https://openalex.org/W111";
      const citingWorkId = "https://openalex.org/W222";

      const referencedWork = createMockWork(referencedWorkId);
      const citingWork = createMockWork(citingWorkId, [], undefined, [
        referencedWorkId,
      ]);

      // Mock API responses
      mockClient.works.getWork.mockImplementation((id: string) => {
        if (id === referencedWorkId) return Promise.resolve(referencedWork);
        if (id === citingWorkId) return Promise.resolve(citingWork);
        return Promise.reject(new Error(`Unknown work ID: ${id}`));
      });

      // Create nodes for both works
      const referencedNode = createTestNode(
        referencedWorkId,
        "works",
        referencedWork,
      );
      const citingNode = createTestNode(citingWorkId, "works", citingWork);

      // Add both nodes to the graph in the same batch
      store.addNodes([referencedNode, citingNode]);

      // Detect relationships for both nodes in batch (this should catch cross-batch citations)
      const allNodeIds = [referencedNode.id, citingNode.id];
      const detectedEdges =
        await relationshipService.detectRelationshipsForNodes(allNodeIds);

      // Verify citation edge was created between the two works
      const citationEdge = detectedEdges.find(
        (edge) =>
          edge.type === RelationType.REFERENCES &&
          edge.source === citingWorkId &&
          edge.target === referencedWorkId,
      );
      expect(citationEdge).toBeDefined();
      expect(citationEdge).toMatchObject({
        source: citingWorkId,
        target: referencedWorkId,
        type: RelationType.REFERENCES,
        label: "references",
      });
    });
  });

  describe("Edge Deduplication", () => {
    it("should not create duplicate edges when relationships are detected multiple times", async () => {
      const store = useGraphStore as any;

      // Create test data
      const authorId = "https://openalex.org/A123";
      const workId = "https://openalex.org/W456";

      const author = createMockAuthor(authorId);
      const work = createMockWork(workId, [authorId]);

      // Mock API responses
      mockClient.works.getWork.mockResolvedValue(work);

      // Add nodes to the graph
      const authorNode = createTestNode(authorId, "authors", author);
      const workNode = createTestNode(workId, "works", work);
      store.addNode(authorNode);
      store.addNode(workNode);

      // Detect relationships multiple times
      const detectedEdges1 =
        await relationshipService.detectRelationshipsForNode(workNode.id);
      const detectedEdges2 =
        await relationshipService.detectRelationshipsForNode(workNode.id);

      // Verify both detection runs found the same edge
      expect(detectedEdges1).toHaveLength(1);
      expect(detectedEdges2).toHaveLength(1);

      // But verify no duplicate edges exist in the store
      const storeState = useGraphStore as any;
      const edgeValues = Object.values(storeState.edges).filter(Boolean);
      expect(edgeValues).toHaveLength(1);

      // Verify the edge has the expected properties
      expect(edgeValues[0]).toMatchObject({
        source: authorId,
        target: workId,
        type: RelationType.AUTHORED,
      });
    });

    it("should deduplicate edges when processing batch relationships", async () => {
      const store = useGraphStore as any;

      // Create test data that would naturally create duplicate edges
      const authorId = "https://openalex.org/A123";
      const workId1 = "https://openalex.org/W456";
      const workId2 = "https://openalex.org/W789";

      const author = createMockAuthor(authorId);
      const work1 = createMockWork(workId1, [authorId]);
      const work2 = createMockWork(workId2, [authorId]);

      // Mock API responses
      mockClient.authors.getAuthor.mockResolvedValue(author);
      mockClient.works.getWork.mockImplementation((id: string) => {
        if (id === workId1) return Promise.resolve(work1);
        if (id === workId2) return Promise.resolve(work2);
        return Promise.reject(new Error(`Unknown work ID: ${id}`));
      });

      // Add all nodes at once
      const authorNode = createTestNode(authorId, "authors", author);
      const workNode1 = createTestNode(workId1, "works", work1);
      const workNode2 = createTestNode(workId2, "works", work2);
      store.addNodes([authorNode, workNode1, workNode2]);

      // Detect relationships for all nodes
      const allNodeIds = [authorNode.id, workNode1.id, workNode2.id];
      const detectedEdges =
        await relationshipService.detectRelationshipsForNodes(allNodeIds);

      // Should create exactly 2 authorship edges (one for each work)
      const authorshipEdges = detectedEdges.filter(
        (edge) => edge.type === RelationType.AUTHORED,
      );
      expect(authorshipEdges).toHaveLength(2);

      // Verify each edge is unique
      const edgeKeys = authorshipEdges.map(
        (edge) => `${edge.source}-${edge.type}-${edge.target}`,
      );
      const uniqueKeys = Array.from(new Set(edgeKeys));
      expect(uniqueKeys).toHaveLength(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle API failures gracefully and not break relationship detection", async () => {
      const store = useGraphStore as any;

      // Create test data
      const authorId = "https://openalex.org/A123";
      const workId = "https://openalex.org/W456";

      const author = createMockAuthor(authorId);

      // Mock API to fail for the work
      mockClient.works.getWork.mockRejectedValue(new Error("API Error"));

      // Add nodes to the graph
      const authorNode = createTestNode(authorId, "authors", author);
      const workNode = createTestNode(workId, "works", {
        id: workId,
        display_name: "Test Work",
      });
      store.addNode(authorNode);
      store.addNode(workNode);

      // Attempt to detect relationships (should not throw)
      const detectedEdges =
        await relationshipService.detectRelationshipsForNode(workNode.id);

      // Should return empty array instead of throwing
      expect(detectedEdges).toEqual([]);

      // Store should remain in consistent state
      const storeState = useGraphStore as any;
      expect(Object.keys(storeState.nodes)).toHaveLength(2);
      expect(Object.keys(storeState.edges)).toHaveLength(0);
    });

    it("should handle missing entity data gracefully", async () => {
      // Try to detect relationships for a non-existent node
      const detectedEdges =
        await relationshipService.detectRelationshipsForNode(
          "non-existent-node",
        );

      // Should return empty array
      expect(detectedEdges).toEqual([]);

      // Store should remain unchanged
      const storeState = useGraphStore as any;
      expect(Object.keys(storeState.nodes)).toHaveLength(0);
      expect(Object.keys(storeState.edges)).toHaveLength(0);
    });
  });

  describe("Performance and Efficiency", () => {
    it("should minimize API calls through efficient field selection", async () => {
      const store = useGraphStore as any;

      // Create test data
      const workId = "https://openalex.org/W456";
      const work = createMockWork(workId, ["https://openalex.org/A123"]);

      // Mock API response
      mockClient.works.getWork.mockResolvedValue(work);

      // Add node and detect relationships
      const workNode = createTestNode(workId, "works", work);
      store.addNode(workNode);

      await relationshipService.detectRelationshipsForNode(workNode.id);

      // Since the node has sufficient entity data, API should not be called
      // If API were called, it should use field selection (minimal fields only)
      if (mockClient.works.getWork.mock.calls.length > 0) {
        expect(mockClient.works.getWork).toHaveBeenCalledWith(
          workId,
          expect.objectContaining({
            select: [
              "id",
              "display_name",
              "authorships",
              "primary_location",
              "referenced_works",
              "publication_year",
              "type",
              "open_access",
            ],
          }),
        );
      }
    });

    it("should handle large numbers of nodes efficiently", async () => {
      const store = useGraphStore as any;

      // Create a larger set of test data (10 works citing each other)
      const nodeCount = 10;
      const workIds = Array.from(
        { length: nodeCount },
        (_, i) => `https://openalex.org/W${i}`,
      );

      // Each work cites some previous works
      const works = workIds.map((workId, index) => {
        const referencedWorks = workIds.slice(0, Math.max(0, index - 2)); // Cite up to 2 previous works
        return createMockWork(workId, [], undefined, referencedWorks);
      });

      // Mock API responses
      mockClient.works.getWork.mockImplementation((id: string) => {
        const work = works.find((w) => w.id === id);
        return work
          ? Promise.resolve(work)
          : Promise.reject(new Error(`Unknown work: ${id}`));
      });

      // Create and add all nodes
      const nodes = works.map((work) => createTestNode(work.id, "works", work));
      store.addNodes(nodes);

      // Time the batch relationship detection
      const startTime = Date.now();
      const allNodeIds = nodes.map((node) => node.id);
      const detectedEdges =
        await relationshipService.detectRelationshipsForNodes(allNodeIds);
      const endTime = Date.now();

      // Should complete in reasonable time (< 5 seconds for 10 nodes)
      expect(endTime - startTime).toBeLessThan(5000);

      // Should detect multiple citation edges
      const citationEdges = detectedEdges.filter(
        (edge) => edge.type === RelationType.REFERENCES,
      );
      expect(citationEdges.length).toBeGreaterThan(0);

      // All edges should be properly formed
      detectedEdges.forEach((edge) => {
        expect(edge).toHaveProperty("id");
        expect(edge).toHaveProperty("source");
        expect(edge).toHaveProperty("target");
        expect(edge).toHaveProperty("type");
        expect(edge).toHaveProperty("label");
      });
    });
  });
});
