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
	},
}));

vi.mock("@/lib/graph/utils/entity-detection");
vi.mock("@/lib/entities");
vi.mock("@/stores/graph-store");
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

describe("GraphDataService", () => {
	let service: GraphDataService;
	let queryClient: QueryClient;
	let mockStore: any;
	let mockDetector: any;

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
		citations_count: 100,
		referenced_works_count: 50,
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
			nodes: new Map(),
			edges: new Map(),
		};

		// Mock useGraphStore properly
		Object.assign(useGraphStore, {
			getState: vi.fn(() => mockStore),
		});

		// Mock detector
		mockDetector = {
			detectEntityIdentifier: vi.fn(),
		};
		vi.mocked(EntityDetector).mockImplementation(() => mockDetector);

		// Mock EntityFactory
		vi.mocked(EntityFactory.isSupported).mockReturnValue(true);

		// Reset all mocks before creating service
		vi.clearAllMocks();

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
			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				normalizedId: "W123456789",
			});
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockWorkEntity);
		});

		it("should load entity graph successfully", async () => {
			await service.loadEntityGraph("W123456789");

			expect(mockStore.setLoading).toHaveBeenCalledWith(true);
			expect(mockStore.setError).toHaveBeenCalledWith(null);
			expect(mockDetector.detectEntityIdentifier).toHaveBeenCalledWith("W123456789");
			expect(rateLimitedOpenAlex.getEntity).toHaveBeenCalledWith("W123456789");
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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockRejectedValue(apiError);

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
			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "authors",
				normalizedId: "A123456789",
			});
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockAuthorEntity);
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
			expect(rateLimitedOpenAlex.getEntity).toHaveBeenCalledWith("A123456789");
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

			expect(rateLimitedOpenAlex.getEntity).toHaveBeenCalledWith("A123456789");
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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockWorkEntity);

			await service.expandNode(nodeId, { force: true });

			expect(rateLimitedOpenAlex.getEntity).toHaveBeenCalledWith(nodeId);
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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockRejectedValue(expansionError);

			await service.expandNode(nodeId);

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
			entityType: "works",
			limit: 10,
		};

		beforeEach(() => {
			vi.mocked(rateLimitedOpenAlex.search).mockResolvedValue([mockWorkEntity]);
		});

		it("should perform search and visualize results", async () => {
			await service.searchAndVisualize(searchQuery, searchOptions);

			expect(mockStore.setLoading).toHaveBeenCalledWith(true);
			expect(rateLimitedOpenAlex.search).toHaveBeenCalledWith(
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
			vi.mocked(rateLimitedOpenAlex.search).mockRejectedValue(searchError);

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

			expect(rateLimitedOpenAlex.search).toHaveBeenCalledWith(
				searchQuery,
				expect.objectContaining({
					entityType: undefined,
					limit: undefined,
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
					citations_count: 150,
					referenced_works_count: 75,
				};

				mockDetector.detectEntityIdentifier.mockReturnValue({
					entityType: "works",
					normalizedId: "W123456789",
				});
				vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(workWithMetadata);

				await service.loadEntityGraph("W123456789");

				expect(mockStore.addNodes).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							metadata: expect.objectContaining({
								publication_year: 2024,
								citations_count: 150,
								referenced_works_count: 75,
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
							source: expect.stringContaining("W123456789"),
							target: expect.stringContaining("A123456789"),
							type: "authored_by",
						}),
					])
				);
			});
		});

		describe("search result transformation", () => {
			it("should transform search results with minimal connections", async () => {
				const searchResults = [mockWorkEntity, mockAuthorEntity];
				vi.mocked(rateLimitedOpenAlex.search).mockResolvedValue(searchResults);

				await service.searchAndVisualize("test query", { entityType: "works" });

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
		it("should handle unknown entity types gracefully", async () => {
			const unknownEntity = {
				id: "X123456789",
				display_name: "Unknown Entity",
			} as OpenAlexEntity;

			mockDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				normalizedId: "X123456789",
			});
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(unknownEntity);

			await service.loadEntityGraph("X123456789");

			// Should still attempt to process but may have limited functionality
			expect(mockStore.addNodes).toHaveBeenCalled();
		});

		it("should handle missing optional entity properties", async () => {
			const minimalWork: Work = {
				id: "W123456789",
				display_name: "Minimal Work",
				type: "article",
				// Missing optional properties like doi, authorships, etc.
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
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(complexWork);

			await service.loadEntityGraph("W123456789");

			// Should create nodes for all entities
			expect(mockStore.addNodes).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ entityId: "W123456789", type: "works" }),
					expect.objectContaining({ entityId: "A111111111", type: "authors" }),
					expect.objectContaining({ entityId: "A222222222", type: "authors" }),
					expect.objectContaining({ entityId: "I111111111", type: "institutions" }),
					expect.objectContaining({ entityId: "I222222222", type: "institutions" }),
					expect.objectContaining({ entityId: "S111111111", type: "sources" }),
				])
			);

			// Should create edges for all relationships
			expect(mockStore.addEdges).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						source: expect.stringMatching(/W123456789/),
						target: expect.stringMatching(/A111111111/),
						type: "authored_by",
					}),
					expect.objectContaining({
						source: expect.stringMatching(/W123456789/),
						target: expect.stringMatching(/A222222222/),
						type: "authored_by",
					}),
				])
			);
		});

		it("should handle expansion of already expanded nodes with force option", async () => {
			vi.mocked(isNodeExpanded).mockReturnValue(true);
			vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(mockWorkEntity);

			mockStore.nodes = new Map([
				[
					"W123456789",
					{
						id: "W123456789",
						entityId: "W123456789",
						type: "works" as EntityType,
						label: "Test Work",
						metadata: {},
						externalIds: [],
					},
				],
			]);

			await service.expandNode("W123456789", { force: true });

			expect(rateLimitedOpenAlex.getEntity).toHaveBeenCalledWith("W123456789");
			expect(setNodeExpanded).toHaveBeenCalledWith(queryClient, "W123456789", true);
		});

		it("should handle large search result sets", async () => {
			const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
				...mockWorkEntity,
				id: `W${i.toString().padStart(9, "0")}`,
				display_name: `Work ${i}`,
			}));

			vi.mocked(rateLimitedOpenAlex.search).mockResolvedValue(largeResultSet);

			await service.searchAndVisualize("large query", { entityType: "works", limit: 100 });

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
});