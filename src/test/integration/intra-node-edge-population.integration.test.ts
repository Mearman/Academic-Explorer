/**
 * Integration tests for intra-node edge population
 * Verifies that all edges between related nodes are automatically created when nodes are added to the graph
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { useGraphStore } from "@/stores/graph-store";
import { RelationshipDetectionService, createRelationshipDetectionService } from "@/services/relationship-detection-service";
import { cachedOpenAlex } from "@/lib/openalex/cached-client";
import type { GraphNode, EntityType } from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";
import type { Work, Author, Source, InstitutionEntity } from "@/lib/openalex/types";

// Mock the cached client with proper nested structure
vi.mock("@/lib/openalex/cached-client");
const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);

// Create properly structured mock for the nested client
const mockClient = {
	works: {
		getWork: vi.fn()
	},
	authors: {
		getAuthor: vi.fn()
	},
	sources: {
		getSource: vi.fn()
	},
	institutions: {
		getInstitution: vi.fn()
	},
	topics: {
		get: vi.fn()
	},
	publishers: {
		get: vi.fn()
	},
	funders: {
		get: vi.fn()
	},
	keywords: {
		getKeyword: vi.fn()
	}
};

// Mock the cachedOpenAlex client structure
Object.defineProperty(mockCachedOpenAlex, "client", {
	value: mockClient,
	writable: true
});

// Mock logger to prevent test output noise
vi.mock("@/lib/logger", () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	},
	logError: vi.fn()
}));

// Test data fixtures - realistic OpenAlex entities
const createMockWork = (id: string, authorIds: string[] = [], sourceId?: string, referencedWorkIds: string[] = []): Work => ({
	id,
	display_name: `Test Work ${id}`,
	authorships: authorIds.map(authorId => ({
		author: {
			id: authorId,
			display_name: `Test Author ${authorId}`
		},
		institutions: [],
		is_corresponding: false,
		raw_author_name: `Test Author ${authorId}`,
		raw_affiliation_strings: []
	})),
	locations: [], // Required by isWork type guard
	primary_location: sourceId ? {
		source: {
			id: sourceId,
			display_name: `Test Source ${sourceId}`
		},
		landing_page_url: `https://example.com/${id}`,
		is_oa: false,
		version: null,
		license: null
	} : null,
	referenced_works: referencedWorkIds,
	publication_year: 2023,
	type: "article",
	open_access: {
		is_oa: false,
		oa_date: null,
		oa_url: null,
		any_repository_has_fulltext: false
	},
	biblio: {
		volume: "1",
		issue: "1",
		first_page: "1",
		last_page: "10"
	},
	is_retracted: false,
	is_paratext: false,
	language: "en",
	grants: [],
	apc_list: null,
	apc_paid: null,
	has_fulltext: false,
	fulltext_origin: null,
	cited_by_count: 0,
	cited_by_api_url: `https://api.openalex.org/works?filter=cites:${id}`,
	counts_by_year: [],
	updated_date: new Date().toISOString(),
	created_date: new Date().toISOString()
});

const createMockAuthor = (id: string, institutionIds: string[] = []): Author => ({
	id,
	display_name: `Test Author ${id}`,
	affiliations: institutionIds.map(institutionId => ({
		institution: {
			id: institutionId,
			display_name: `Test Institution ${institutionId}`
		},
		years: [2023]
	})),
	orcid: null,
	works_count: 10,
	cited_by_count: 100,
	h_index: 5,
	i10_index: 3,
	last_known_institution: institutionIds[0] ? {
		id: institutionIds[0],
		display_name: `Test Institution ${institutionIds[0]}`
	} : null,
	last_known_institutions: institutionIds.map(institutionId => ({ // Required by isAuthor type guard
		id: institutionId,
		display_name: `Test Institution ${institutionId}`
	})),
	counts_by_year: [],
	works_api_url: `https://api.openalex.org/works?filter=author.id:${id}`,
	updated_date: new Date().toISOString(),
	created_date: new Date().toISOString()
});

const createMockSource = (id: string, publisherId?: string): Source => ({
	id,
	display_name: `Test Source ${id}`,
	issn_l: `1234-567${id.slice(-1)}`,
	issn: [`1234-567${id.slice(-1)}`],
	publisher: publisherId || null,
	host_organization: publisherId || null,
	host_organization_name: publisherId ? `Test Publisher ${publisherId}` : null,
	host_organization_lineage: publisherId ? [publisherId] : [],
	type: "journal",
	homepage_url: `https://example.com/source/${id}`,
	apc_prices: [],
	apc_usd: null,
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
	created_date: new Date().toISOString()
});

const createMockInstitution = (id: string, parentIds: string[] = []): InstitutionEntity => ({
	id,
	display_name: `Test Institution ${id}`,
	ror: `https://ror.org/${id}`,
	country_code: "US",
	type: "education",
	lineage: [id, ...parentIds],
	homepage_url: `https://example.com/institution/${id}`,
	image_url: null,
	image_thumbnail_url: null,
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
		longitude: -74.0060
	},
	international: {
		display_name: {
			"en": `Test Institution ${id}`
		}
	},
	repositories: [],
	roles: []
});

// Helper to create test graph nodes matching the actual GraphNode interface
const createTestNode = (entityId: string, type: EntityType, entity: any): GraphNode => ({
	id: entityId, // Use same ID pattern as production
	entityId,
	type,
	label: entity.display_name,
	position: { x: 0, y: 0 },
	externalIds: [],
	entityData: entity
});

describe("Intra-Node Edge Population Integration Tests", () => {
	let queryClient: QueryClient;
	let relationshipService: RelationshipDetectionService;

	beforeEach(() => {
		// Reset graph store
		useGraphStore.setState({
			nodes: {},
			edges: {},
			selectedNodeId: null,
			hoveredNodeId: null,
			selectedNodes: {},
			pinnedNodes: {},
			showAllCachedNodes: false,
			traversalDepth: 1,
			nodeDepths: {},
			provider: null,
			providerType: "xyflow",
			visibleEntityTypes: {
				works: true,
				authors: true,
				sources: true,
				institutions: true,
				topics: true,
				concepts: true,
				publishers: true,
				funders: true,
				keywords: true
			},
			lastSearchStats: {},
			visibleEdgeTypes: {
				authored: true,
				affiliated: true,
				published_in: true,
				funded_by: true,
				related_to: true,
				references: true,
				source_published_by: true,
				institution_child_of: true,
				publisher_child_of: true,
				work_has_topic: true,
				work_has_keyword: true,
				author_researches: true,
				institution_located_in: true,
				funder_located_in: true,
				topic_part_of_field: true
			},
			currentLayout: {
				type: "d3-force",
				options: {
					seed: 42,
					iterations: 300,
					linkDistance: 220,
					linkStrength: 0.7,
					chargeStrength: -600,
					centerStrength: 0.03,
					collisionRadius: 100,
					velocityDecay: 0.4,
					alpha: 1,
					alphaDecay: 0.03,
					collisionStrength: 0.8
				}
			},
			isLoading: false,
			error: null,
		});

		// Create fresh services
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 0
				}
			}
		});
		relationshipService = createRelationshipDetectionService(queryClient);

		// Clear all mocks
		vi.clearAllMocks();

		// Reset mock functions
		Object.values(mockClient).forEach(service => {
			Object.values(service).forEach(method => {
				if (typeof method === "function") {
					method.mockReset();
				}
			});
		});
	});

	afterEach(() => {
		queryClient.clear();
	});

	describe("Single Node Relationship Detection", () => {
		it("should detect and create authorship edges when adding a work with existing authors", async () => {
			const store = useGraphStore.getState();

			// Create test data
			const authorId = "https://openalex.org/A123";
			const workId = "https://openalex.org/W456";

			const author = createMockAuthor(authorId);
			const work = createMockWork(workId, [authorId]);

			// Mock API responses
			mockClient.works.getWork.mockResolvedValue(work);

			// First, add the author node to the graph
			const authorNode = createTestNode(authorId, "authors", author);
			store.addNode(authorNode);

			// Now add the work and detect relationships
			const workNode = createTestNode(workId, "works", work);
			store.addNode(workNode);

			// Detect relationships for the work
			const detectedEdges = await relationshipService.detectRelationshipsForNode(workNode.id);

			// Verify authorship edge was created
			expect(detectedEdges).toHaveLength(1);
			expect(detectedEdges[0]).toMatchObject({
				source: authorId,
				target: workId,
				type: RelationType.AUTHORED,
				label: "authored"
			});

			// Note: The RelationshipDetectionService adds edges to the store automatically
			// So we should see them in the store after detection
			const storeState = useGraphStore.getState();
			const edgeValues = Object.values(storeState.edges).filter(Boolean);
			expect(edgeValues).toHaveLength(1);
			expect(edgeValues[0]).toMatchObject({
				source: authorId,
				target: workId,
				type: RelationType.AUTHORED
			});
		});

		it("should detect and create publication edges when adding a work with existing source", async () => {
			const store = useGraphStore.getState();

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
			const detectedEdges = await relationshipService.detectRelationshipsForNode(workNode.id);

			// Verify publication edge was created
			expect(detectedEdges).toHaveLength(1);
			expect(detectedEdges[0]).toMatchObject({
				source: workId,
				target: sourceId,
				type: RelationType.PUBLISHED_IN,
				label: "published in"
			});
		});

		it("should detect and create citation edges when adding a work that references existing works", async () => {
			const store = useGraphStore.getState();

			// Create test data
			const referencedWorkId1 = "https://openalex.org/W111";
			const referencedWorkId2 = "https://openalex.org/W222";
			const citingWorkId = "https://openalex.org/W456";

			const referencedWork1 = createMockWork(referencedWorkId1);
			const referencedWork2 = createMockWork(referencedWorkId2);
			const citingWork = createMockWork(citingWorkId, [], undefined, [referencedWorkId1, referencedWorkId2]);

			// Mock API responses
			mockClient.works.getWork.mockResolvedValue(citingWork);

			// First, add the referenced works to the graph
			const referencedNode1 = createTestNode(referencedWorkId1, "works", referencedWork1);
			const referencedNode2 = createTestNode(referencedWorkId2, "works", referencedWork2);
			store.addNode(referencedNode1);
			store.addNode(referencedNode2);

			// Now add the citing work and detect relationships
			const citingNode = createTestNode(citingWorkId, "works", citingWork);
			store.addNode(citingNode);

			// Detect relationships for the citing work
			const detectedEdges = await relationshipService.detectRelationshipsForNode(citingNode.id);

			// Verify citation edges were created
			expect(detectedEdges).toHaveLength(2);

			const citationEdge1 = detectedEdges.find(edge => edge.target === referencedWorkId1);
			const citationEdge2 = detectedEdges.find(edge => edge.target === referencedWorkId2);

			expect(citationEdge1).toMatchObject({
				source: citingWorkId,
				target: referencedWorkId1,
				type: RelationType.REFERENCES,
				label: "references"
			});

			expect(citationEdge2).toMatchObject({
				source: citingWorkId,
				target: referencedWorkId2,
				type: RelationType.REFERENCES,
				label: "references"
			});
		});

		it("should detect and create affiliation edges when adding an author with existing institutions", async () => {
			const store = useGraphStore.getState();

			// Create test data
			const institutionId = "https://openalex.org/I123";
			const authorId = "https://openalex.org/A456";

			const institution = createMockInstitution(institutionId);
			const author = createMockAuthor(authorId, [institutionId]);

			// Mock API responses
			mockClient.authors.getAuthor.mockResolvedValue(author);

			// First, add the institution node to the graph
			const institutionNode = createTestNode(institutionId, "institutions", institution);
			store.addNode(institutionNode);

			// Now add the author and detect relationships
			const authorNode = createTestNode(authorId, "authors", author);
			store.addNode(authorNode);

			// Detect relationships for the author
			const detectedEdges = await relationshipService.detectRelationshipsForNode(authorNode.id);

			// Verify affiliation edge was created
			expect(detectedEdges).toHaveLength(1);
			expect(detectedEdges[0]).toMatchObject({
				source: authorId,
				target: institutionId,
				type: RelationType.AFFILIATED,
				label: "affiliated with"
			});
		});
	});

	describe("Batch Relationship Detection", () => {
		it("should detect relationships between all nodes when multiple related nodes are added together", async () => {
			const store = useGraphStore.getState();

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
			const institutionNode = createTestNode(institutionId, "institutions", institution);
			const sourceNode = createTestNode(sourceId, "sources", source);
			const workNode = createTestNode(workId, "works", work);

			// Add all nodes to the graph
			store.addNodes([authorNode, institutionNode, sourceNode, workNode]);

			// Detect relationships for all nodes in batch
			const allNodeIds = [authorNode.id, institutionNode.id, sourceNode.id, workNode.id];
			const detectedEdges = await relationshipService.detectRelationshipsForNodes(allNodeIds);

			// Verify all expected relationships were created
			expect(detectedEdges.length).toBeGreaterThanOrEqual(3);

			// Check for authorship edge
			const authorshipEdge = detectedEdges.find(edge =>
				edge.type === RelationType.AUTHORED &&
				edge.source === authorId &&
				edge.target === workId
			);
			expect(authorshipEdge).toBeDefined();

			// Check for affiliation edge
			const affiliationEdge = detectedEdges.find(edge =>
				edge.type === RelationType.AFFILIATED &&
				edge.source === authorId &&
				edge.target === institutionId
			);
			expect(affiliationEdge).toBeDefined();

			// Check for publication edge
			const publicationEdge = detectedEdges.find(edge =>
				edge.type === RelationType.PUBLISHED_IN &&
				edge.source === workId &&
				edge.target === sourceId
			);
			expect(publicationEdge).toBeDefined();

			// Verify edges were added to the store
			const storeState = useGraphStore.getState();
			const edgeValues = Object.values(storeState.edges).filter(Boolean);
			expect(edgeValues.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe("Cross-Batch Relationship Detection", () => {
		it("should detect citation relationships between works added in the same batch", async () => {
			const store = useGraphStore.getState();

			// Create test data - two works where one cites the other
			const referencedWorkId = "https://openalex.org/W111";
			const citingWorkId = "https://openalex.org/W222";

			const referencedWork = createMockWork(referencedWorkId);
			const citingWork = createMockWork(citingWorkId, [], undefined, [referencedWorkId]);

			// Mock API responses
			mockClient.works.getWork.mockImplementation((id: string) => {
				if (id === referencedWorkId) return Promise.resolve(referencedWork);
				if (id === citingWorkId) return Promise.resolve(citingWork);
				return Promise.reject(new Error(`Unknown work ID: ${id}`));
			});

			// Create nodes for both works
			const referencedNode = createTestNode(referencedWorkId, "works", referencedWork);
			const citingNode = createTestNode(citingWorkId, "works", citingWork);

			// Add both nodes to the graph in the same batch
			store.addNodes([referencedNode, citingNode]);

			// Detect relationships for both nodes in batch (this should catch cross-batch citations)
			const allNodeIds = [referencedNode.id, citingNode.id];
			const detectedEdges = await relationshipService.detectRelationshipsForNodes(allNodeIds);

			// Verify citation edge was created between the two works
			const citationEdge = detectedEdges.find(edge =>
				edge.type === RelationType.REFERENCES &&
				edge.source === citingWorkId &&
				edge.target === referencedWorkId
			);
			expect(citationEdge).toBeDefined();
			expect(citationEdge).toMatchObject({
				source: citingWorkId,
				target: referencedWorkId,
				type: RelationType.REFERENCES,
				label: "references"
			});
		});
	});

	describe("Edge Deduplication", () => {
		it("should not create duplicate edges when relationships are detected multiple times", async () => {
			const store = useGraphStore.getState();

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
			const detectedEdges1 = await relationshipService.detectRelationshipsForNode(workNode.id);
			const detectedEdges2 = await relationshipService.detectRelationshipsForNode(workNode.id);

			// Verify both detection runs found the same edge
			expect(detectedEdges1).toHaveLength(1);
			expect(detectedEdges2).toHaveLength(1);

			// But verify no duplicate edges exist in the store
			const storeState = useGraphStore.getState();
			const edgeValues = Object.values(storeState.edges).filter(Boolean);
			expect(edgeValues).toHaveLength(1);

			// Verify the edge has the expected properties
			expect(edgeValues[0]).toMatchObject({
				source: authorId,
				target: workId,
				type: RelationType.AUTHORED
			});
		});

		it("should deduplicate edges when processing batch relationships", async () => {
			const store = useGraphStore.getState();

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
			const detectedEdges = await relationshipService.detectRelationshipsForNodes(allNodeIds);

			// Should create exactly 2 authorship edges (one for each work)
			const authorshipEdges = detectedEdges.filter(edge => edge.type === RelationType.AUTHORED);
			expect(authorshipEdges).toHaveLength(2);

			// Verify each edge is unique
			const edgeKeys = authorshipEdges.map(edge => `${edge.source}-${edge.type}-${edge.target}`);
			const uniqueKeys = [...new Set(edgeKeys)];
			expect(uniqueKeys).toHaveLength(2);
		});
	});

	describe("Error Handling", () => {
		it("should handle API failures gracefully and not break relationship detection", async () => {
			const store = useGraphStore.getState();

			// Create test data
			const authorId = "https://openalex.org/A123";
			const workId = "https://openalex.org/W456";

			const author = createMockAuthor(authorId);

			// Mock API to fail for the work
			mockClient.works.getWork.mockRejectedValue(new Error("API Error"));

			// Add nodes to the graph
			const authorNode = createTestNode(authorId, "authors", author);
			const workNode = createTestNode(workId, "works", { id: workId, display_name: "Test Work" });
			store.addNode(authorNode);
			store.addNode(workNode);

			// Attempt to detect relationships (should not throw)
			const detectedEdges = await relationshipService.detectRelationshipsForNode(workNode.id);

			// Should return empty array instead of throwing
			expect(detectedEdges).toEqual([]);

			// Store should remain in consistent state
			const storeState = useGraphStore.getState();
			expect(Object.keys(storeState.nodes)).toHaveLength(2);
			expect(Object.keys(storeState.edges)).toHaveLength(0);
		});

		it("should handle missing entity data gracefully", async () => {
			// Try to detect relationships for a non-existent node
			const detectedEdges = await relationshipService.detectRelationshipsForNode("non-existent-node");

			// Should return empty array
			expect(detectedEdges).toEqual([]);

			// Store should remain unchanged
			const storeState = useGraphStore.getState();
			expect(Object.keys(storeState.nodes)).toHaveLength(0);
			expect(Object.keys(storeState.edges)).toHaveLength(0);
		});
	});

	describe("Performance and Efficiency", () => {
		it("should minimize API calls through efficient field selection", async () => {
			const store = useGraphStore.getState();

			// Create test data
			const workId = "https://openalex.org/W456";
			const work = createMockWork(workId, ["https://openalex.org/A123"]);

			// Mock API response
			mockClient.works.getWork.mockResolvedValue(work);

			// Add node and detect relationships
			const workNode = createTestNode(workId, "works", work);
			store.addNode(workNode);

			await relationshipService.detectRelationshipsForNode(workNode.id);

			// Verify API was called with field selection (minimal fields only)
			expect(mockClient.works.getWork).toHaveBeenCalledWith(
				workId,
				expect.objectContaining({
					select: [
						"id",
						"display_name",
						"authorships",
						"primary_location",
						"referenced_works"
					]
				})
			);
		});

		it("should handle large numbers of nodes efficiently", async () => {
			const store = useGraphStore.getState();

			// Create a larger set of test data (10 works citing each other)
			const nodeCount = 10;
			const workIds = Array.from({ length: nodeCount }, (_, i) => `https://openalex.org/W${i}`);

			// Each work cites some previous works
			const works = workIds.map((workId, index) => {
				const referencedWorks = workIds.slice(0, Math.max(0, index - 2)); // Cite up to 2 previous works
				return createMockWork(workId, [], undefined, referencedWorks);
			});

			// Mock API responses
			mockClient.works.getWork.mockImplementation((id: string) => {
				const work = works.find(w => w.id === id);
				return work ? Promise.resolve(work) : Promise.reject(new Error(`Unknown work: ${id}`));
			});

			// Create and add all nodes
			const nodes = works.map(work => createTestNode(work.id, "works", work));
			store.addNodes(nodes);

			// Time the batch relationship detection
			const startTime = Date.now();
			const allNodeIds = nodes.map(node => node.id);
			const detectedEdges = await relationshipService.detectRelationshipsForNodes(allNodeIds);
			const endTime = Date.now();

			// Should complete in reasonable time (< 5 seconds for 10 nodes)
			expect(endTime - startTime).toBeLessThan(5000);

			// Should detect multiple citation edges
			const citationEdges = detectedEdges.filter(edge => edge.type === RelationType.REFERENCES);
			expect(citationEdges.length).toBeGreaterThan(0);

			// All edges should be properly formed
			detectedEdges.forEach(edge => {
				expect(edge).toHaveProperty("id");
				expect(edge).toHaveProperty("source");
				expect(edge).toHaveProperty("target");
				expect(edge).toHaveProperty("type");
				expect(edge).toHaveProperty("label");
			});
		});
	});
});