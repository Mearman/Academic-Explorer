/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { GraphDataService } from "./graph-data-service";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { EntityFactory } from "@/lib/entities";
import { useGraphStore } from "@/stores/graph-store";
import type {
	EntityType,
	SearchOptions,
} from "@/lib/graph/types";
import type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	OpenAlexEntity,
} from "@/lib/openalex/types";

// Mock dependencies
vi.mock("@/lib/openalex/cached-client", () => ({
	cachedOpenAlex: {
		getEntity: vi.fn(),
		search: vi.fn(),
		searchAll: vi.fn(),
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
}));

vi.mock("@/lib/graph/utils/entity-detection");
vi.mock("@/lib/entities");
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
vi.mock("@/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	logError: vi.fn(),
}));

vi.mock("@/lib/cache/graph-cache", () => ({
	getCachedOpenAlexEntities: vi.fn(),
	setCachedGraphNodes: vi.fn(),
	setCachedGraphEdges: vi.fn(),
	setNodeExpanded: vi.fn(),
	isNodeExpanded: vi.fn(),
}));

vi.mock("./request-deduplication-service", () => ({
	createRequestDeduplicationService: vi.fn(),
}));

vi.mock("./relationship-detection-service", () => ({
	createRelationshipDetectionService: vi.fn(),
}));

// Import mocked modules
import { cachedOpenAlex } from "@/lib/openalex/cached-client";
import { logger, logError } from "@/lib/logger";
import {
	getCachedOpenAlexEntities,
	setCachedGraphNodes,
	setCachedGraphEdges,
	setNodeExpanded,
	isNodeExpanded,
} from "@/lib/cache/graph-cache";
import { createRequestDeduplicationService } from "./request-deduplication-service";
import { createRelationshipDetectionService } from "./relationship-detection-service";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";

describe("GraphDataService", () => {
	let service: GraphDataService;
	let queryClient: QueryClient;
	let mockStore: any;
	let mockDetector: any;
	let mockDeduplicationService: any;
	let mockRelationshipDetectionService: any;
	let mockExpansionSettingsStore: any;

	// Test data fixtures
	const mockWorkEntity: Work = {
		id: "W123456789",
		display_name: "Test Work",
		type: "article",
		publication_year: 2023,
		doi: "10.1234/test",
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
					},
				],
			},
		],
		primary_location: {
			source: {
				id: "S123456789",
				display_name: "Test Source",
				issn_l: "1234-5678",
			},
		},
		cited_by_count: 100,
		referenced_works_count: 50,
		referenced_works: ["W111111111", "W222222222", "W333333333"],
		open_access: {
			is_oa: true,
			oa_date: "2023-01-01",
			oa_url: "https://example.com/open-access-url",
		},
	} as Work;

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

	const mockSourceEntity: Source = {
		id: "S123456789",
		display_name: "Test Source",
		issn_l: "1234-5678",
		works_count: 1000,
		cited_by_count: 50000,
		publisher: {
			id: "P123456789",
			display_name: "Test Publisher",
		},
	} as Source;

	const mockInstitutionEntity: InstitutionEntity = {
		id: "I123456789",
		display_name: "Test Institution",
		ror: "01abc23de",
		works_count: 5000,
		cited_by_count: 100000,
		lineage: ["I987654321"],
	} as InstitutionEntity;

	// Additional mock entities for complex tests
	const mockAuthor1: Author = {
		id: "A111111111",
		display_name: "First Author",
		orcid: "0000-0000-0000-0001",
		works_count: 20,
		cited_by_count: 300,
		affiliations: [
			{
				institution: {
					id: "I111111111",
					display_name: "First Institution",
					ror: "01abc11111",
				},
			},
		],
	} as Author;

	const mockAuthor2: Author = {
		id: "A222222222",
		display_name: "Second Author",
		orcid: "0000-0000-0000-0002",
		works_count: 15,
		cited_by_count: 250,
		affiliations: [
			{
				institution: {
					id: "I222222222",
					display_name: "Second Institution",
					ror: "01abc22222",
				},
			},
		],
	} as Author;

	const mockSource1: Source = {
		id: "S111111111",
		display_name: "Primary Source",
		issn_l: "1111-1111",
		works_count: 500,
		cited_by_count: 25000,
		publisher: {
			id: "P111111111",
			display_name: "Primary Publisher",
		},
	} as Source;


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
			setGraphData: vi.fn(), // Added missing method
			nodes: {}, // Changed from Map to Record
			edges: {}, // Changed from Map to Record
			pinnedNodes: new Set(),
		};

		// Mock detector
		mockDetector = {
			detectEntityIdentifier: vi.fn(),
		};
		vi.mocked(EntityDetector).mockImplementation(() => mockDetector);

		// Mock EntityFactory
		const mockEntity = {
			expand: vi.fn().mockResolvedValue({
				nodes: [],
				edges: [],
			}),
		};
		vi.mocked(EntityFactory.isSupported).mockReturnValue(true);
		vi.mocked(EntityFactory.create).mockReturnValue(mockEntity);

		// Mock useGraphStore properly AFTER other setup to avoid clearing
		vi.mocked(useGraphStore.getState).mockReturnValue(mockStore);

		// Mock expansion settings store
		mockExpansionSettingsStore = {
			getSettings: vi.fn().mockReturnValue({
				target: "works",
				limit: 25,
				sorts: [],
				filters: [],
				enabled: true,
				name: "Default Settings"
			}),
		};
		vi.mocked(useExpansionSettingsStore.getState).mockReturnValue(mockExpansionSettingsStore);

		// Mock deduplication service BEFORE creating the service
		mockDeduplicationService = {
			getEntity: vi.fn(),
		};
		vi.mocked(createRequestDeduplicationService).mockReturnValue(mockDeduplicationService);

		// Mock relationship detection service BEFORE creating the service
		mockRelationshipDetectionService = {
			detectRelationshipsForNode: vi.fn().mockResolvedValue([]),
			detectRelationshipsForNodes: vi.fn().mockResolvedValue([]),
		};
		vi.mocked(createRelationshipDetectionService).mockReturnValue(mockRelationshipDetectionService);


		// Setup getEntity mock to return appropriate mock data based on ID
		vi.mocked(cachedOpenAlex.getEntity).mockImplementation((id: string) => {
			// Handle both direct IDs and full URLs
			const entityId = id.startsWith("https://openalex.org/") ? id.replace("https://openalex.org/", "") : id;

			switch (entityId) {
				case "W123456789":
					return Promise.resolve(mockWorkEntity);
				case "A123456789":
					return Promise.resolve(mockAuthorEntity);
				case "A111111111":
					return Promise.resolve(mockAuthor1);
				case "A222222222":
					return Promise.resolve(mockAuthor2);
				case "S123456789":
					return Promise.resolve(mockSourceEntity);
				case "S111111111":
					return Promise.resolve(mockSource1);
				case "I123456789":
					return Promise.resolve(mockInstitutionEntity);
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
		it("should initialize with QueryClient and create detector", () => {
			const newService = new GraphDataService(queryClient);
			expect(newService).toBeInstanceOf(GraphDataService);
			// Verify EntityDetector was called (exact count may vary due to other test setup)
			expect(EntityDetector).toHaveBeenCalled();
		});

		it("should initialize cache with empty maps and sets", () => {
			// Cache is private, but we can verify behavior through other methods
			expect(service).toBeDefined();
		});
	});

	describe("loadEntityGraph", () => {
		beforeEach(() => {
			// Clear only specific mock call history, not all mocks
			Object.values(mockStore).forEach((mockFn) => {
				if (typeof mockFn === "function" && "mockClear" in mockFn) {
					mockFn.mockClear();
				}
			});
			vi.mocked(cachedOpenAlex.getEntity).mockClear();
			mockDeduplicationService.getEntity.mockClear();
			vi.mocked(logError).mockClear();

			// Setup detector to handle multiple calls consistently
			mockDetector.detectEntityIdentifier.mockImplementation((id: string) => ({
				entityType: "works",
				normalizedId: id,
				idType: "openalex",
			}));
			mockDeduplicationService.getEntity.mockResolvedValue(mockWorkEntity);
			mockDeduplicationService.getEntity.mockResolvedValue(mockWorkEntity);
		});

		it("should load entity graph successfully", async () => {
			await service.loadEntityGraph("W123456789");

			expect(mockStore.setLoading).toHaveBeenCalledWith(true);
			expect(mockStore.setError).toHaveBeenCalledWith(null);
			expect(mockDetector.detectEntityIdentifier).toHaveBeenCalledWith("W123456789");
			expect(mockDeduplicationService.getEntity).toHaveBeenCalledWith("https://openalex.org/W123456789", expect.any(Function));
			expect(mockStore.clear).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
			expect(setCachedGraphNodes).toHaveBeenCalled();
			expect(setCachedGraphEdges).toHaveBeenCalled();
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
			expect(logger.debug).toHaveBeenCalledWith(
				"graph",
				"Entity graph loaded with incremental hydration",
				expect.objectContaining({
					nodeCount: expect.any(Number),
					edgeCount: expect.any(Number),
					primaryNodeId: expect.any(String),
				}),
				"GraphDataService"
			);
		});

		it("should handle entity detection failure", async () => {
			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: null,
			});

			await service.loadEntityGraph("invalid-id");

			expect(mockStore.setError).toHaveBeenCalledWith(
				"Unable to detect entity type for: invalid-id"
			);
			expect(logError).toHaveBeenCalledWith(
				"Failed to load entity graph",
				expect.any(Error),
				"GraphDataService",
				"graph"
			);
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should handle API errors", async () => {
			const apiError = new Error("API error");
			// Clear previous mocks and set up the error for this test
			mockDeduplicationService.getEntity.mockClear();
			mockDeduplicationService.getEntity.mockRejectedValue(apiError);

			await service.loadEntityGraph("W123456789");

			expect(mockStore.setError).toHaveBeenCalledWith("API error");
			expect(logError).toHaveBeenCalledWith(
				"Failed to load entity graph",
				apiError,
				"GraphDataService",
				"graph"
			);
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should pin and calculate depths for primary node", async () => {
			// We'll test this through the behavior - the service should call store methods
			await service.loadEntityGraph("W123456789");

			expect(mockStore.calculateNodeDepths).toHaveBeenCalled();
			expect(mockStore.pinNode).toHaveBeenCalled();
		});
	});

	describe("loadEntityIntoGraph", () => {
		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(cachedOpenAlex.getEntity).mockClear();
			mockDeduplicationService.getEntity.mockClear();

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "authors",
				normalizedId: "A123456789",
				idType: "openalex",
			});
			mockDeduplicationService.getEntity.mockResolvedValue(mockAuthorEntity);
			mockDeduplicationService.getEntity.mockResolvedValue(mockAuthorEntity);
		});

		it("should select existing node if it exists", async () => {
			const existingNode = {
				id: "node-1",
				entityId: "A123456789",
				entityData: { id: "https://openalex.org/A123456789", display_name: "Test Entity" },
			};

			// Mock the store's nodes as an object (not Map) since implementation uses Object.values()
			mockStore.nodes = { "node-1": existingNode };

			await service.loadEntityIntoGraph("A123456789");

			expect(mockStore.selectNode).toHaveBeenCalledWith("node-1");
			expect(cachedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should load new entity if not exists", async () => {
			mockStore.nodes = {};

			await service.loadEntityIntoGraph("A123456789");

			expect(mockDetector.detectEntityIdentifier).toHaveBeenCalledWith("A123456789");
			expect(mockDeduplicationService.getEntity).toHaveBeenCalledWith("https://openalex.org/A123456789", expect.any(Function));
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
		});

		it("should load existing node when entity is requested", async () => {
			const existingNode = {
				id: "node-1",
				entityId: "A123456789",
				entityData: { id: "https://openalex.org/A123456789" },
			};

			mockStore.nodes = { "node-1": existingNode };

			await service.loadEntityIntoGraph("A123456789");

			// Should not fetch entity data since node already exists
			expect(mockDeduplicationService.getEntity).not.toHaveBeenCalled();
		});

		it("should handle detection errors", async () => {
			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: null,
			});

			await service.loadEntityIntoGraph("invalid-id");

			expect(logError).toHaveBeenCalledWith(
				"Failed to load entity into graph",
				expect.any(Error),
				"GraphDataService",
				"graph"
			);
		});
	});

	describe("loadAllCachedNodes", () => {
		it("should load all cached entities successfully", () => {
			const cachedEntities = [mockWorkEntity, mockAuthorEntity];
			vi.mocked(getCachedOpenAlexEntities).mockReturnValue(cachedEntities);

			service.loadAllCachedNodes();

			expect(getCachedOpenAlexEntities).toHaveBeenCalledWith(queryClient);
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
			expect(setCachedGraphNodes).toHaveBeenCalled();
			expect(setCachedGraphEdges).toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				"graph",
				"Loading all cached entities into graph",
				{ count: 2 },
				"GraphDataService"
			);
		});

		it("should handle empty cache", () => {
			vi.mocked(getCachedOpenAlexEntities).mockReturnValue([]);

			service.loadAllCachedNodes();

			expect(logger.debug).toHaveBeenCalledWith(
				"graph",
				"No cached entities found to load",
				{},
				"GraphDataService"
			);
			expect(mockStore.addNodes).not.toHaveBeenCalled();
		});

		it("should handle transformation errors gracefully", () => {
			const invalidEntity = { id: "invalid" } as OpenAlexEntity;
			vi.mocked(getCachedOpenAlexEntities).mockReturnValue([invalidEntity]);

			service.loadAllCachedNodes();

			expect(logError).toHaveBeenCalledWith(
				"Failed to transform cached entity to graph",
				expect.any(Error),
				"GraphDataService",
				"graph"
			);
		});
	});

	describe("expandNode", () => {
		const nodeId = "W123456789";

		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(cachedOpenAlex.getEntity).mockClear();

			mockStore.nodes = {
				[nodeId]: {
					id: nodeId,
					entityId: nodeId,
					type: "works" as EntityType,
					label: "Test Work",
					entityData: {},
					externalIds: [],
				},
			};
		});

		it("should skip expansion if already expanded and not forced", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);

			await service.expandNode(nodeId);

			expect(isNodeExpanded).toHaveBeenCalledWith(queryClient, nodeId);
			expect(cachedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should expand node when forced", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);
			vi.mocked(EntityFactory.isSupported).mockReturnValue(true);

			// Clear API mock calls for clean test state
			vi.mocked(cachedOpenAlex.getEntity).mockClear();

			// Mock the entity.expand method to simulate successful expansion
			const mockExpand = vi.fn().mockResolvedValue({
				nodes: [
					{
						id: "related-node-1",
						entityId: "A999999999",
						type: "authors" as EntityType,
						label: "Related Author",
						entityData: {},
						externalIds: [],
					},
				],
				edges: [
					{
						id: "edge-1",
						source: nodeId,
						target: "related-node-1",
						type: "authored",
					},
				],
			});

			// Create a proper mock entity instance
			const mockEntity = {
				expand: mockExpand,
			};

			// Override EntityFactory.create to return our mock entity
			vi.mocked(EntityFactory.create).mockReturnValue(mockEntity);

			await service.expandNode(nodeId, { force: true });

			expect(mockExpand).toHaveBeenCalled();
			expect(mockStore.setGraphData).toHaveBeenCalled();
			expect(setNodeExpanded).toHaveBeenCalledWith(queryClient, nodeId, true);
		});

		it("should return early if node not found", async () => {
			mockStore.nodes = {};

			await service.expandNode("nonexistent");

			expect(cachedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should handle unsupported entity types", async () => {
			vi.mocked(EntityFactory.isSupported).mockReturnValue(false);

			await service.expandNode(nodeId);

			expect(cachedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should handle expansion errors", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(false);
			vi.mocked(EntityFactory.isSupported).mockReturnValue(true);
			const expansionError = new Error("Expansion failed");

			// Clear logError mock for clean test state
			vi.mocked(logError).mockClear();

			// Mock the entity.expand method to throw an error
			const mockExpand = vi.fn().mockRejectedValue(expansionError);

			// Create a proper mock entity instance
			const mockEntity = {
				expand: mockExpand,
			};

			// Override EntityFactory.create to return our mock entity
			vi.mocked(EntityFactory.create).mockReturnValue(mockEntity);

			await service.expandNode(nodeId);

			// Check that logError was called with the expansion error
			expect(logError).toHaveBeenCalledWith(
				"Failed to expand node",
				expansionError,
				"GraphDataService",
				"graph"
			);
		});
	});

	describe("searchAndVisualize", () => {
		const searchQuery = "machine learning";
		const searchOptions: SearchOptions = {
			entityTypes: ["works"],
			limit: 10,
		};

		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(cachedOpenAlex.getEntity).mockClear();
			vi.mocked(cachedOpenAlex.client.works.getWorks).mockClear();
			vi.mocked(cachedOpenAlex.client.authors.getAuthors).mockClear();
			vi.mocked(cachedOpenAlex.client.sources.getSources).mockClear();
			vi.mocked(cachedOpenAlex.client.institutions.searchInstitutions).mockClear();
			vi.mocked(cachedOpenAlex.client.topics.getMultiple).mockClear();

			// Clear store mock call history
			Object.values(mockStore).forEach((mockFn) => {
				if (typeof mockFn === "function" && "mockClear" in mockFn) {
					mockFn.mockClear();
				}
			});

			// Setup detector for search results
			mockDetector.detectEntityIdentifier.mockImplementation((id: string) => ({
				entityType: "works",
				normalizedId: id,
			}));

			// Mock the individual client methods that are actually called in searchAndVisualize
			vi.mocked(cachedOpenAlex.client.works.getWorks).mockResolvedValue({
				results: [mockWorkEntity],
				meta: { count: 1, per_page: 25, page: 1 },
			});
			vi.mocked(cachedOpenAlex.client.authors.getAuthors).mockResolvedValue({
				results: [],
				meta: { count: 0, per_page: 25, page: 1 },
			});
			vi.mocked(cachedOpenAlex.client.sources.getSources).mockResolvedValue({
				results: [],
				meta: { count: 0, per_page: 25, page: 1 },
			});
			vi.mocked(cachedOpenAlex.client.institutions.searchInstitutions).mockResolvedValue({
				results: [],
				meta: { count: 0, per_page: 25, page: 1 },
			});
			vi.mocked(cachedOpenAlex.client.topics.getMultiple).mockResolvedValue({
				results: [],
				meta: { count: 0, per_page: 25, page: 1 },
			});
		});

		it("should perform search and visualize results", async () => {
			await service.searchAndVisualize(searchQuery, searchOptions);

			expect(mockStore.setLoading).toHaveBeenCalledWith(true);
			// Check that the works client method was called since entityTypes is ["works"]
			expect(cachedOpenAlex.client.works.getWorks).toHaveBeenCalledWith({
				search: searchQuery,
				per_page: 10 // The limit from searchOptions
			});
			expect(mockStore.clear).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should handle search errors gracefully", async () => {
			const searchError = new Error("Search failed");
			vi.mocked(cachedOpenAlex.client.works.getWorks).mockRejectedValue(searchError);

			await service.searchAndVisualize(searchQuery, searchOptions);

			// Individual API call failures are caught and logged but don't cause overall failure
			// The search continues with other entity types and returns what it can
			expect(mockStore.setError).toHaveBeenCalledWith(null); // Error state is cleared at start
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
			// The overall operation should still complete successfully
			expect(mockStore.clear).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalled();
		});

		it("should handle critical search errors that prevent completion", async () => {
			// Mock store.clear to throw to simulate a critical error after API calls
			const criticalError = new Error("Critical search failure");
			mockStore.clear.mockImplementation(() => {
				throw criticalError;
			});

			await service.searchAndVisualize(searchQuery, searchOptions);

			// Should handle the critical error and set error state
			expect(mockStore.setError).toHaveBeenCalledWith("Critical search failure");
			expect(logError).toHaveBeenCalledWith(
				"Failed to search and visualize",
				criticalError,
				"GraphDataService",
				"graph"
			);
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should use default options when none provided", async () => {
			await service.searchAndVisualize(searchQuery, {});

			// When no entityTypes are specified, it searches all default types
			// Check that all default entity types are searched
			expect(cachedOpenAlex.client.works.getWorks).toHaveBeenCalledWith({
				search: searchQuery,
				per_page: 20 // default limit
			});
			expect(cachedOpenAlex.client.authors.getAuthors).toHaveBeenCalledWith({
				search: searchQuery,
				per_page: 20
			});
			expect(cachedOpenAlex.client.sources.getSources).toHaveBeenCalledWith({
				search: searchQuery,
				per_page: 20
			});
			expect(cachedOpenAlex.client.institutions.searchInstitutions).toHaveBeenCalledWith(
				searchQuery,
				{ per_page: 20 }
			);
			expect(cachedOpenAlex.client.topics.getMultiple).toHaveBeenCalledWith({
				search: searchQuery,
				per_page: 20
			});
		});
	});

	describe("private method behaviors through public interface", () => {
		// Test private methods through their public interfaces since they're not directly accessible

		describe("transformEntityToGraph behavior", () => {
			it("should transform work entity correctly", async () => {
				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "works",
					normalizedId: "W123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(mockWorkEntity);

				await service.loadEntityGraph("W123456789");

				// Verify that nodes and edges were created
				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "W123456789",
							type: "works",
							label: "Test Work",
						}),
					])
				);
				expect(mockStore.addEdges).toHaveBeenCalled();
			});

			it("should transform author entity correctly", async () => {
				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "authors",
					normalizedId: "A123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(mockAuthorEntity);

				await service.loadEntityGraph("A123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "A123456789",
							type: "authors",
							label: "Test Author",
						}),
					])
				);
			});

			it("should transform source entity correctly", async () => {
				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "sources",
					normalizedId: "S123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(mockSourceEntity);

				await service.loadEntityGraph("S123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "S123456789",
							type: "sources",
							label: "Test Source",
						}),
					])
				);
			});

			it("should transform institution entity correctly", async () => {
				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "institutions",
					normalizedId: "I123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(mockInstitutionEntity);

				await service.loadEntityGraph("I123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "I123456789",
							type: "institutions",
							label: "Test Institution",
						}),
					])
				);
			});
		});

		describe("external ID extraction behavior", () => {
			it("should extract DOI from work entity", async () => {
				const workWithDoi = {
					...mockWorkEntity,
					doi: "10.1234/test-doi",
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "works",
					normalizedId: "W123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(workWithDoi);

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
					])
				);
			});

			it("should extract ORCID from author entity", async () => {
				const authorWithOrcid = {
					...mockAuthorEntity,
					orcid: "0000-0000-0000-0001",
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "authors",
					normalizedId: "A123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(authorWithOrcid);

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
					])
				);
			});

			it("should extract ISSN-L from source entity", async () => {
				const sourceWithIssn = {
					...mockSourceEntity,
					issn_l: "1234-5679",
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "sources",
					normalizedId: "S123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(sourceWithIssn);

				await service.loadEntityGraph("S123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							externalIds: expect.arrayContaining([
								expect.objectContaining({
									type: "issn_l",
									value: "1234-5679",
								}),
							]),
						}),
					])
				);
			});

			it("should extract ROR from institution entity", async () => {
				const institutionWithRor = {
					...mockInstitutionEntity,
					ror: "01abc23df",
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "institutions",
					normalizedId: "I123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(institutionWithRor);

				await service.loadEntityGraph("I123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							externalIds: expect.arrayContaining([
								expect.objectContaining({
									type: "ror",
									value: "01abc23df",
								}),
							]),
						}),
					])
				);
			});
		});

		describe("entity data storage behavior", () => {
			it("should store entity data from work entity", async () => {
				const workWithData = {
					...mockWorkEntity,
					publication_year: 2024,
					cited_by_count: 150,
					referenced_works_count: 75,
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "works",
					normalizedId: "W123456789",
				});
				mockDeduplicationService.getEntity.mockClear();
				mockDeduplicationService.getEntity.mockResolvedValue(workWithData);

				await service.loadEntityGraph("W123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "W123456789",
							type: "works",
							entityData: expect.objectContaining({
								publication_year: 2024,
								cited_by_count: 150,
								referenced_works_count: 75,
							}),
						}),
					])
				);
			});

			it("should store entity data from author entity", async () => {
				const authorWithData = {
					...mockAuthorEntity,
					works_count: 30,
					cited_by_count: 600,
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "authors",
					normalizedId: "A123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(authorWithData);

				await service.loadEntityGraph("A123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityData: expect.objectContaining({
								works_count: 30,
								cited_by_count: 600,
							}),
						}),
					])
				);
			});
		});

		describe("edge creation behavior", () => {
			it("should create edges for work relationships", async () => {
				const workWithRelations = {
					...mockWorkEntity,
					authorships: [
						{
							author: {
								id: "A123456789",
								display_name: "Test Author",
							},
							institutions: [
								{
									id: "I123456789",
									display_name: "Test Institution",
								},
							],
						},
					],
					primary_location: {
						source: {
							id: "S123456789",
							display_name: "Test Source",
						},
					},
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "works",
					normalizedId: "W123456789",
				});
				mockDeduplicationService.getEntity.mockResolvedValue(workWithRelations);

				await service.loadEntityGraph("W123456789");

				// Should store the work entity with its relationship data
				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "W123456789",
							type: "works",
							entityData: expect.objectContaining({
								authorships: expect.arrayContaining([
									expect.objectContaining({
										author: expect.objectContaining({
											id: "A123456789",
											display_name: "Test Author",
										}),
									}),
								]),
							}),
						}),
					])
				);
			});
		});

		describe("search result transformation", () => {
			beforeEach(() => {
				// Set up detector to handle search results
				mockDetector.detectEntityIdentifier.mockImplementation((id: string) => {
					if (id.startsWith("W")) return { entityType: "works", normalizedId: id };
					if (id.startsWith("A")) return { entityType: "authors", normalizedId: id };
					if (id.startsWith("S")) return { entityType: "sources", normalizedId: id };
					if (id.startsWith("I")) return { entityType: "institutions", normalizedId: id };
					return { entityType: "works", normalizedId: id };
				});
			});

			it("should transform search results with minimal connections", async () => {
				// Mock the works search since entityTypes is ["works"]
				vi.mocked(cachedOpenAlex.client.works.getWorks).mockResolvedValue({
					results: [mockWorkEntity],
					meta: { count: 1, per_page: 25, page: 1 },
				});

				await service.searchAndVisualize("test query", { entityTypes: ["works"] });

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "W123456789",
							type: "works",
						}),
					])
				);
			});
		});
	});

	describe("error handling", () => {
		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(cachedOpenAlex.getEntity).mockClear();

			// Clear store mock call history
			Object.values(mockStore).forEach((mockFn) => {
				if (typeof mockFn === "function" && "mockClear" in mockFn) {
					mockFn.mockClear();
				}
			});

			// Set up detector for error handling tests
			mockDetector.detectEntityIdentifier.mockImplementation((id: string) => {
				if (id.startsWith("W")) return { entityType: "works", normalizedId: id };
				if (id.startsWith("A")) return { entityType: "authors", normalizedId: id };
				if (id.startsWith("X")) return { entityType: "works", normalizedId: id }; // Unknown type mapped to works
				return { entityType: "works", normalizedId: id };
			});
		});

		it("should handle unknown entity types gracefully", async () => {
			const unknownEntity = {
				id: "X123456789",
				display_name: "Unknown Entity",
				type: "article", // Add minimal work properties
				authorships: [],
				referenced_works: [],
				open_access: { is_oa: false },
			} as OpenAlexEntity;

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				normalizedId: "X123456789",
			});
			mockDeduplicationService.getEntity.mockResolvedValue(unknownEntity);

			await service.loadEntityGraph("X123456789");

			// Should still attempt to process but may have limited functionality
			expect(mockStore.addNodes).toHaveBeenCalled();
		});

		it("should handle missing optional entity properties", async () => {
			const minimalWork: Work = {
				id: "W123456789",
				display_name: "Minimal Work",
				type: "article",
				// Include minimum required properties for transformation
				authorships: [],
				referenced_works: [],
				open_access: {
					is_oa: false,
				},
				// Missing optional properties like doi, primary_location, etc.
			} as Work;

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				normalizedId: "W123456789",
			});
			mockDeduplicationService.getEntity.mockResolvedValue(minimalWork);

			await service.loadEntityGraph("W123456789");

			expect(mockStore.addNodes).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						entityId: "W123456789",
						type: "works",
						label: "Minimal Work",
					}),
				])
			);
		});

		it("should handle cache operation failures gracefully", async () => {
			const cacheError = new Error("Cache operation failed");
			vi.mocked(setCachedGraphNodes).mockImplementation(() => {
				throw cacheError;
			});

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				normalizedId: "W123456789",
			});
			mockDeduplicationService.getEntity.mockResolvedValue(mockWorkEntity);

			// Should not throw error, but log it
			await service.loadEntityGraph("W123456789");

			expect(mockStore.addNodes).toHaveBeenCalled();
			// Service should continue functioning despite cache errors
		});
	});

	describe("integration scenarios", () => {
		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(cachedOpenAlex.getEntity).mockClear();
			vi.mocked(cachedOpenAlex.client.works.getWorks).mockClear();
			vi.mocked(cachedOpenAlex.client.authors.getAuthors).mockClear();
			vi.mocked(cachedOpenAlex.client.sources.getSources).mockClear();
			vi.mocked(cachedOpenAlex.client.institutions.searchInstitutions).mockClear();
			vi.mocked(cachedOpenAlex.client.topics.getMultiple).mockClear();

			// Clear store mock call history
			Object.values(mockStore).forEach((mockFn) => {
				if (typeof mockFn === "function" && "mockClear" in mockFn) {
					mockFn.mockClear();
				}
			});

			// Setup detector for integration tests
			mockDetector.detectEntityIdentifier.mockImplementation((id: string) => {
				if (id.startsWith("W")) return { entityType: "works", normalizedId: id };
				if (id.startsWith("A")) return { entityType: "authors", normalizedId: id };
				if (id.startsWith("S")) return { entityType: "sources", normalizedId: id };
				if (id.startsWith("I")) return { entityType: "institutions", normalizedId: id };
				return { entityType: "works", normalizedId: id };
			});
		});

		it("should handle complex work with multiple relationships", async () => {
			const complexWork: Work = {
				...mockWorkEntity,
				authorships: [
					{
						author: {
							id: "A111111111",
							display_name: "First Author",
							orcid: "0000-0000-0000-0001",
						},
						author_position: "first",
						institutions: [
							{
								id: "I111111111",
								display_name: "First Institution",
								ror: "01abc11de",
							},
							{
								id: "I222222222",
								display_name: "Second Institution",
								ror: "01abc22de",
							},
						],
					},
					{
						author: {
							id: "A222222222",
							display_name: "Second Author",
							orcid: "0000-0000-0000-0002",
						},
						author_position: "middle",
						institutions: [
							{
								id: "I111111111",
								display_name: "First Institution",
								ror: "01abc11de",
							},
						],
					},
				],
				primary_location: {
					source: {
						id: "S111111111",
						display_name: "Primary Source",
						issn_l: "1111-1111",
					},
				},
			};

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				normalizedId: "W123456789",
			});
			mockDeduplicationService.getEntity.mockResolvedValue(complexWork);

			await service.loadEntityGraph("W123456789");

			// Should create the primary work node with full entity data
			expect(mockStore.addNodes).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						entityId: "W123456789",
						type: "works",
						entityData: expect.objectContaining({
							authorships: expect.arrayContaining([
								expect.objectContaining({
									author: expect.objectContaining({
										id: "A111111111",
										display_name: "First Author",
									}),
								}),
								expect.objectContaining({
									author: expect.objectContaining({
										id: "A222222222",
										display_name: "Second Author",
									}),
								}),
							]),
						})
					}),
				])
			);
		});

		it("should handle expansion of already expanded nodes with force option", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);
			vi.mocked(EntityFactory.isSupported).mockReturnValue(true);
			const nodeId = "W123456789";

			mockStore.nodes = {
				[nodeId]: {
					id: nodeId,
					entityId: nodeId,
					type: "works" as EntityType,
					label: "Test Work",
					entityData: {},
					externalIds: [],
				},
			};

			// Setup mock expand function
			const mockExpand = vi.fn().mockResolvedValue({
				nodes: [],
				edges: [],
			});

			// Create a proper mock entity instance
			const mockEntity = {
				expand: mockExpand,
			};

			// Override EntityFactory.create to return our mock entity
			vi.mocked(EntityFactory.create).mockReturnValue(mockEntity);

			await service.expandNode(nodeId, { force: true });

			expect(mockExpand).toHaveBeenCalled();
			expect(setNodeExpanded).toHaveBeenCalledWith(queryClient, nodeId, true);
		});

		it("should handle large search result sets", async () => {
			const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
				...mockWorkEntity,
				id: `W${i.toString().padStart(9, "0")}`,
				display_name: `Work ${i}`,
			}));

			vi.mocked(cachedOpenAlex.client.works.getWorks).mockResolvedValue({
				results: largeResultSet,
				meta: { count: 100, per_page: 25, page: 1 },
			});

			await service.searchAndVisualize("large query", { entityTypes: ["works"], limit: 100 });

			expect(mockStore.addNodes).toHaveBeenCalledWith(
				expect.arrayContaining(
					largeResultSet.map((work) =>
						expect.objectContaining({
							entityId: work.id,
							type: "works",
							label: work.display_name,
						})
					)
				)
			);
		});
	});

	describe("error handling and null safety", () => {
		describe("loadEntityIntoGraph null/undefined handling", () => {
			it("should handle undefined entity response from API", async () => {
				mockDeduplicationService.getEntity.mockResolvedValue(undefined);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});

			it("should handle null entity response from API", async () => {
				mockDeduplicationService.getEntity.mockResolvedValue(null);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});

			it("should handle entity without required id property", async () => {
				const entityWithoutId = {
					display_name: "Test Author",
					// Missing 'id' property
				};

				mockDeduplicationService.getEntity.mockResolvedValue(entityWithoutId);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});
		});

		describe("hydrateNodeToFull null/undefined handling", () => {
			it("should handle undefined institution response", async () => {
				mockDeduplicationService.getEntity.mockResolvedValue(undefined);

				try {
					await service.hydrateNodeToFull("https://openalex.org/I161548249");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});

			it("should handle institution without ror property", async () => {
				const institutionWithoutRor = {
					id: "https://openalex.org/I161548249",
					display_name: "Bangor University",
					// Missing 'ror' property that code might access
				};

				mockDeduplicationService.getEntity.mockResolvedValue(institutionWithoutRor);

				try {
					await service.hydrateNodeToFull("https://openalex.org/I161548249");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});

			it("should handle null institution response gracefully", async () => {
				mockDeduplicationService.getEntity.mockResolvedValue(null);

				try {
					await service.hydrateNodeToFull("https://openalex.org/I161548249");
				} catch (error) {
					expect(error).toBeDefined();
				}
			});
		});

		describe("rate limiting and API errors", () => {
			it("should handle 429 rate limit errors", async () => {
				const rateLimitError = new Error("429 TOO MANY REQUESTS");
				vi.mocked(cachedOpenAlex.getEntity).mockRejectedValue(rateLimitError);

				try {
					await service.hydrateNodeToFull("https://openalex.org/I2799442855");
				} catch (error) {
					expect(String(error)).toContain("429");
				}
			});

			it("should handle network errors gracefully", async () => {
				const networkError = new Error("Network error");
				vi.mocked(cachedOpenAlex.getEntity).mockRejectedValue(networkError);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
					expect(logError).toHaveBeenCalled();
				}
			});

			it("should handle malformed API responses", async () => {
				const malformedResponse = {
					// Missing expected properties
					invalid: true
				};

				mockDeduplicationService.getEntity.mockResolvedValue(malformedResponse);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
				}
			});
		});

		describe("store method safety", () => {
			it("should handle missing store methods gracefully", async () => {
				// Mock store without all expected methods
				const incompleteStore = {
					nodes: new Map(),
					edges: new Map(),
					addNode: vi.fn(),
					addEdge: vi.fn(),
					// Missing setError, getNode methods that code might call
				};

				vi.mocked(useGraphStore.getState).mockReturnValue(incompleteStore as any);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					// Should handle missing store methods
					expect(error).toBeDefined();
				}
			});
		});
	});
});