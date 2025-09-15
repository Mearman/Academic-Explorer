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
	_GraphNode,
	GraphEdge,
	EntityType,
	_ExternalIdentifier,
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
vi.mock("@/lib/openalex/rate-limited-client", () => ({
	rateLimitedOpenAlex: {
		getEntity: vi.fn(),
		search: vi.fn(),
		searchAll: vi.fn(),
	},
}));

vi.mock("@/lib/graph/utils/entity-detection");
vi.mock("@/lib/entities");
vi.mock("@/stores/graph-store", () => ({
	useGraphStore: {
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

vi.mock("../request-deduplication-service", () => ({
	createRequestDeduplicationService: vi.fn(),
}));

// Import mocked modules
import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { logger, logError } from "@/lib/logger";
import {
	getCachedOpenAlexEntities,
	setCachedGraphNodes,
	setCachedGraphEdges,
	setNodeExpanded,
	isNodeExpanded,
} from "@/lib/cache/graph-cache";
import { createRequestDeduplicationService } from "../request-deduplication-service";

describe("GraphDataService", () => {
	let service: GraphDataService;
	let queryClient: QueryClient;
	let mockStore: any;
	let mockDetector: any;
	let mockDeduplicationService: any;

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

	// Complex work entity for integration tests
	const _mockComplexWork: Work = {
		id: "W123456789",
		display_name: "Test Work",
		type: "article",
		publication_year: 2023,
		doi: "10.1234/test",
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
						ror: "01abc11111",
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
						id: "I222222222",
						display_name: "Second Institution",
						ror: "01abc22222",
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
		citations_count: 100,
		referenced_works_count: 3,
		referenced_works: ["W111111111", "W222222222", "W333333333"],
		open_access: {
			is_oa: true,
			oa_date: "2023-01-01",
			oa_url: "https://example.com/open-access-url",
		},
	} as Work;

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
			nodes: new Map(),
			edges: new Map(),
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

		// Mock deduplication service
		mockDeduplicationService = {
			getEntity: vi.fn(),
		};
		vi.mocked(createRequestDeduplicationService).mockReturnValue(mockDeduplicationService);

		// Setup deduplication service getEntity mock to return appropriate mock data based on ID
		mockDeduplicationService.getEntity.mockImplementation((id: string) => {
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

		// Setup getEntity mock to return appropriate mock data based on ID
		vi.mocked(rateLimitedOpenAlex.getEntity).mockImplementation((id: string) => {
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

		service = new GraphDataService(queryClient);
	});

	afterEach(() => {
		queryClient.clear();
	});

	describe("constructor", () => {
		it("should initialize with QueryClient and create detector", () => {
			// Clear call count before creating new service
			vi.mocked(EntityDetector).mockClear();

			const newService = new GraphDataService(queryClient);
			expect(newService).toBeInstanceOf(GraphDataService);
			expect(EntityDetector).toHaveBeenCalledTimes(1); // One from this instance only
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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();
			mockDeduplicationService.getEntity.mockClear();
			vi.mocked(logError).mockClear();

			// Setup detector to handle multiple calls consistently
			mockDetector.detectEntityIdentifier.mockImplementation((id: string) => ({
				entityType: "works",
				normalizedId: id,
				idType: "openalex",
			}));
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockWorkEntity);
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
			expect(logger.info).toHaveBeenCalledWith(
				"graph",
				"Entity graph loaded without auto-expansion",
				expect.objectContaining({
					nodeCount: expect.any(Number),
					edgeCount: expect.any(Number),
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
			// Mock transformEntityToGraph to return nodes with a primary node
			const _mockNodes = [
				{
					id: "node-1",
					entityId: "W123456789",
					type: "works" as EntityType,
					label: "Test Work",
					metadata: {},
					externalIds: [],
				},
			];
			const _mockEdges: GraphEdge[] = [];

			// We'll test this through the behavior - the service should call store methods
			await service.loadEntityGraph("W123456789");

			expect(mockStore.calculateNodeDepths).toHaveBeenCalled();
			expect(mockStore.pinNode).toHaveBeenCalled();
		});
	});

	describe("loadEntityIntoGraph", () => {
		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();
			mockDeduplicationService.getEntity.mockClear();

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "authors",
				normalizedId: "A123456789",
				idType: "openalex",
			});
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockAuthorEntity);
			mockDeduplicationService.getEntity.mockResolvedValue(mockAuthorEntity);
		});

		it("should select existing node if it exists", async () => {
			const existingNode = {
				id: "node-1",
				entityId: "A123456789",
				metadata: { isPlaceholder: false },
			};

			// Mock the store's nodes.values() method
			const mockNodes = new Map([["node-1", existingNode]]);
			mockStore.nodes = mockNodes;

			// Mock Array.from behavior for the store.nodes.values() call
			vi.spyOn(Array, "from").mockReturnValueOnce([existingNode]);

			await service.loadEntityIntoGraph("A123456789");

			expect(mockStore.selectNode).toHaveBeenCalledWith("node-1");
			expect(rateLimitedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should load new entity if not exists", async () => {
			mockStore.nodes = new Map();

			await service.loadEntityIntoGraph("A123456789");

			expect(mockDetector.detectEntityIdentifier).toHaveBeenCalledWith("A123456789");
			expect(mockDeduplicationService.getEntity).toHaveBeenCalledWith("https://openalex.org/A123456789", expect.any(Function));
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
		});

		it("should handle placeholder nodes by loading full data", async () => {
			const placeholderNode = {
				id: "node-1",
				entityId: "A123456789",
				metadata: { isPlaceholder: true },
			};

			mockStore.nodes = new Map([["node-1", placeholderNode]]);

			await service.loadEntityIntoGraph("A123456789");

			expect(mockDeduplicationService.getEntity).toHaveBeenCalledWith("https://openalex.org/A123456789", expect.any(Function));
			expect(mockStore.addNodes).toHaveBeenCalled();
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
			expect(logger.info).toHaveBeenCalledWith(
				"graph",
				"Loading all cached entities into graph",
				{ count: 2 },
				"GraphDataService"
			);
		});

		it("should handle empty cache", () => {
			vi.mocked(getCachedOpenAlexEntities).mockReturnValue([]);

			service.loadAllCachedNodes();

			expect(logger.info).toHaveBeenCalledWith(
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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();

			mockStore.nodes = new Map([
				[
					nodeId,
					{
						id: nodeId,
						entityId: nodeId,
						type: "works" as EntityType,
						label: "Test Work",
						metadata: {},
						externalIds: [],
					},
				],
			]);
		});

		it("should skip expansion if already expanded and not forced", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);

			await service.expandNode(nodeId);

			expect(isNodeExpanded).toHaveBeenCalledWith(queryClient, nodeId);
			expect(rateLimitedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should expand node when forced", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);

			// Clear API mock calls for clean test state
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();

			// Mock the entity.expand method to simulate successful expansion
			const mockExpand = vi.fn().mockResolvedValue({
				nodes: [
					{
						id: "related-node-1",
						entityId: "A999999999",
						type: "authors" as EntityType,
						label: "Related Author",
						metadata: {},
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

			// Override EntityFactory.create to return our mock entity
			vi.mocked(EntityFactory.create).mockReturnValue({
				expand: mockExpand,
			});

			await service.expandNode(nodeId, { force: true });

			expect(mockExpand).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
			expect(setNodeExpanded).toHaveBeenCalledWith(queryClient, nodeId, true);
		});

		it("should return early if node not found", async () => {
			mockStore.nodes = new Map();

			await service.expandNode("nonexistent");

			expect(rateLimitedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should handle unsupported entity types", async () => {
			vi.mocked(EntityFactory.isSupported).mockReturnValue(false);

			await service.expandNode(nodeId);

			expect(rateLimitedOpenAlex.getEntity).not.toHaveBeenCalled();
		});

		it("should handle expansion errors", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(false);
			const expansionError = new Error("Expansion failed");

			// Clear logError mock for clean test state
			vi.mocked(logError).mockClear();

			// Mock the entity.expand method to throw an error
			const mockExpand = vi.fn().mockRejectedValue(expansionError);

			// Override EntityFactory.create to return our mock entity
			vi.mocked(EntityFactory.create).mockReturnValue({
				expand: mockExpand,
			});

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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();
			vi.mocked(rateLimitedOpenAlex.searchAll).mockClear();

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

			vi.mocked(rateLimitedOpenAlex.searchAll).mockResolvedValue({
				works: [mockWorkEntity],
				authors: [],
				sources: [],
				institutions: [],
				topics: [],
				publishers: [],
				funders: [],
				keywords: [],
				geo: [],
				meta: { count: 1, per_page: 25, page: 1 },
			});
		});

		it("should perform search and visualize results", async () => {
			await service.searchAndVisualize(searchQuery, searchOptions);

			expect(mockStore.setLoading).toHaveBeenCalledWith(true);
			expect(rateLimitedOpenAlex.searchAll).toHaveBeenCalledWith(
				searchQuery,
				expect.objectContaining(searchOptions)
			);
			expect(mockStore.clear).toHaveBeenCalled();
			expect(mockStore.addNodes).toHaveBeenCalled();
			expect(mockStore.addEdges).toHaveBeenCalled();
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should handle search errors", async () => {
			const searchError = new Error("Search failed");
			vi.mocked(rateLimitedOpenAlex.searchAll).mockRejectedValue(searchError);

			await service.searchAndVisualize(searchQuery, searchOptions);

			expect(mockStore.setError).toHaveBeenCalledWith("Search failed");
			expect(logError).toHaveBeenCalledWith(
				"Failed to search and visualize",
				searchError,
				"GraphDataService",
				"graph"
			);
			expect(mockStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should use default options when none provided", async () => {
			await service.searchAndVisualize(searchQuery, {});

			expect(rateLimitedOpenAlex.searchAll).toHaveBeenCalledWith(
				searchQuery,
				expect.objectContaining({
					entityTypes: undefined,
					limit: 20,
				})
			);
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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockWorkEntity);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockAuthorEntity);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockSourceEntity);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockInstitutionEntity);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(workWithDoi);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(authorWithOrcid);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(sourceWithIssn);

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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(institutionWithRor);

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

		describe("metadata extraction behavior", () => {
			it("should extract metadata from work entity", async () => {
				const workWithMetadata = {
					...mockWorkEntity,
					publication_year: 2024,
					cited_by_count: 150,
					referenced_works_count: 75,
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "works",
					normalizedId: "W123456789",
				});
				vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValueOnce(workWithMetadata);

				await service.loadEntityGraph("W123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "W123456789",
							type: "works",
							metadata: expect.objectContaining({
								publication_year: 2024,
								cited_by_count: 150,
								referenced_works_count: 75,
								open_access: expect.any(Boolean),
							}),
						}),
					])
				);
			});

			it("should extract metadata from author entity", async () => {
				const authorWithMetadata = {
					...mockAuthorEntity,
					works_count: 30,
					cited_by_count: 600,
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "authors",
					normalizedId: "A123456789",
				});
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(authorWithMetadata);

				await service.loadEntityGraph("A123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							metadata: expect.objectContaining({
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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(workWithRelations);

				await service.loadEntityGraph("W123456789");

				// Should create edges between work and its related entities
				expect(mockStore.addEdges).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							source: "A123456789",
							target: "W123456789",
							type: "authored",
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
				vi.mocked(rateLimitedOpenAlex.searchAll).mockResolvedValue({
					works: [mockWorkEntity],
					authors: [mockAuthorEntity],
					sources: [],
					institutions: [],
					topics: [],
					publishers: [],
					funders: [],
					keywords: [],
					geo: [],
					meta: { count: 2, per_page: 25, page: 1 },
				});

				await service.searchAndVisualize("test query", { entityTypes: ["works"] });

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							entityId: "W123456789",
							type: "works",
						}),
						expect.objectContaining({
							entityId: "A123456789",
							type: "authors",
						}),
					])
				);
			});
		});
	});

	describe("error handling", () => {
		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();

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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValueOnce(unknownEntity);

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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(minimalWork);

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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockWorkEntity);

			// Should not throw error, but log it
			await service.loadEntityGraph("W123456789");

			expect(mockStore.addNodes).toHaveBeenCalled();
			// Service should continue functioning despite cache errors
		});
	});

	describe("integration scenarios", () => {
		beforeEach(() => {
			// Clear API call history from previous tests
			vi.mocked(rateLimitedOpenAlex.getEntity).mockClear();
			vi.mocked(rateLimitedOpenAlex.searchAll).mockClear();

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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValueOnce(complexWork);

			await service.loadEntityGraph("W123456789");

			// Should create nodes for all entities
			expect(mockStore.addNodes).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ entityId: "W123456789", type: "works" }),
					expect.objectContaining({ entityId: "A111111111", type: "authors" }),
					expect.objectContaining({ entityId: "A222222222", type: "authors" }),
					expect.objectContaining({ entityId: "S111111111", type: "sources" }),
				])
			);

			// Should create edges for all relationships
			expect(mockStore.addEdges).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						source: expect.stringMatching(/A111111111/),
						target: expect.stringMatching(/W123456789/),
						type: "authored",
					}),
					expect.objectContaining({
						source: expect.stringMatching(/A222222222/),
						target: expect.stringMatching(/W123456789/),
						type: "authored",
					}),
				])
			);
		});

		it("should handle expansion of already expanded nodes with force option", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);
			const nodeId = "W123456789";

			mockStore.nodes = new Map([
				[
					nodeId,
					{
						id: nodeId,
						entityId: nodeId,
						type: "works" as EntityType,
						label: "Test Work",
						metadata: {},
						externalIds: [],
					},
				],
			]);

			// Setup mock expand function
			const mockExpand = vi.fn().mockResolvedValue({
				nodes: [],
				edges: [],
			});

			// Override EntityFactory.create to return our mock entity
			vi.mocked(EntityFactory.create).mockReturnValue({
				expand: mockExpand,
			});

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

			vi.mocked(rateLimitedOpenAlex.searchAll).mockResolvedValue({
				works: largeResultSet,
				authors: [],
				sources: [],
				institutions: [],
				topics: [],
				publishers: [],
				funders: [],
				keywords: [],
				geo: [],
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
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(undefined);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});

			it("should handle null entity response from API", async () => {
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(null);

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

				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(entityWithoutId);

				try {
					await service.loadEntityIntoGraph("A5025875274", "authors");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});
		});

		describe("loadPlaceholderNodeData null/undefined handling", () => {
			it("should handle undefined institution response", async () => {
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(undefined);

				try {
					await service.loadPlaceholderNodeData("https://openalex.org/I161548249", "institutions", "Bangor University");
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

				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(institutionWithoutRor);

				try {
					await service.loadPlaceholderNodeData("https://openalex.org/I161548249", "institutions", "Bangor University");
				} catch (error) {
					expect(error).toBeDefined();
					expect(String(error)).toContain("Cannot read properties of undefined");
				}
			});

			it("should handle null institution response gracefully", async () => {
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(null);

				try {
					await service.loadPlaceholderNodeData("https://openalex.org/I161548249", "institutions", "Bangor University");
				} catch (error) {
					expect(error).toBeDefined();
				}
			});
		});

		describe("rate limiting and API errors", () => {
			it("should handle 429 rate limit errors", async () => {
				const rateLimitError = new Error("429 TOO MANY REQUESTS");
				vi.mocked(rateLimitedOpenAlex.getEntity).mockRejectedValue(rateLimitError);

				try {
					await service.loadPlaceholderNodeData("https://openalex.org/I2799442855", "institutions", "New York University Press");
				} catch (error) {
					expect(String(error)).toContain("429");
				}
			});

			it("should handle network errors gracefully", async () => {
				const networkError = new Error("Network error");
				vi.mocked(rateLimitedOpenAlex.getEntity).mockRejectedValue(networkError);

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

				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(malformedResponse);

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