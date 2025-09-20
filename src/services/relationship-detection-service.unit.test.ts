/**
 * Unit tests for RelationshipDetectionService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { RelationshipDetectionService } from "./relationship-detection-service";
import { useGraphStore } from "@/stores/graph-store";
import { RelationType } from "@/lib/graph/types";
import type { GraphNode, EntityType } from "@/lib/graph/types";

// Mock the external dependencies
vi.mock("@/lib/openalex/rate-limited-client");
vi.mock("@/stores/graph-store");
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
		vi.mocked(useGraphStore.getState).mockReturnValue(mockStore);

		// Mock the deduplication service to prevent undefined access
		const mockDeduplicationService = {
			getEntity: vi.fn(),
			getStats: vi.fn(),
			clear: vi.fn(),
			refreshEntity: vi.fn()
		};
		(service as any).deduplicationService = mockDeduplicationService;
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
				type: "works" as EntityType,
				label: "Test Work",
				entityId: "https://openalex.org/W123",
				position: { x: 0, y: 0 },
				externalIds: [],
				metadata: { hydrationLevel: "minimal" as const }
			};

			mockStore.getNode.mockReturnValue(minimalNode);

			const result = await service.detectRelationshipsForNode("W123");

			expect(result).toEqual([]);
		});
	});

	describe("analyzeWorkRelationships", () => {
		it("should detect author relationships", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				authorships: [
					{
						author: {
							id: "https://openalex.org/A456",
							display_name: "Test Author"
						}
					}
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "A456",
					type: "authors" as EntityType,
					label: "Test Author",
					entityId: "https://openalex.org/A456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			// Access the private method via bracket notation for testing
			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				sourceNodeId: "https://openalex.org/A456",
				targetNodeId: "https://openalex.org/W123",
				relationType: RelationType.AUTHORED,
				label: "authored",
				weight: 1.0
			});
		});

		it("should detect source relationships", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				primary_location: {
					source: {
						id: "https://openalex.org/S789",
						display_name: "Test Journal"
					}
				}
			};

			const existingNodes: GraphNode[] = [
				{
					id: "S789",
					type: "sources" as EntityType,
					label: "Test Journal",
					entityId: "https://openalex.org/S789",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				sourceNodeId: "https://openalex.org/W123",
				targetNodeId: "https://openalex.org/S789",
				relationType: RelationType.PUBLISHED_IN,
				label: "published in"
			});
		});

		it("should detect citation relationships", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				referenced_works: ["https://openalex.org/W456"]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "https://openalex.org/W456",
					type: "works" as EntityType,
					label: "Referenced Work",
					entityId: "https://openalex.org/W456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				sourceNodeId: "https://openalex.org/W123",
				targetNodeId: "https://openalex.org/W456", // Use actual node ID (full URL format)
				relationType: RelationType.REFERENCES,
				label: "references"
			});
		});

		it("should handle citation relationships correctly (real-world scenario)", () => {
			// This test replicates the real-world scenario: both referenced_works and graph nodes use full URL format
			const workData = {
				id: "https://openalex.org/W3188841554",
				entityType: "works" as EntityType,
				display_name: "Attention Is All You Need",
				referenced_works: [
					"https://openalex.org/W2250748100", // Full URL format
					"https://openalex.org/W3200026003"  // Full URL format
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "https://openalex.org/W2250748100", // Full URL format (real graph node format)
					type: "works" as EntityType,
					label: "Referenced Work 1",
					entityId: "https://openalex.org/W2250748100", // Full URL in entityId
					position: { x: 0, y: 0 },
					externalIds: []
				},
				{
					id: "https://openalex.org/W3200026003", // Full URL format (real graph node format)
					type: "works" as EntityType,
					label: "Referenced Work 2",
					entityId: "https://openalex.org/W3200026003", // Full URL in entityId
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(2);
			expect(result.every(r => r.relationType === RelationType.REFERENCES)).toBe(true);
			// targetNodeId should be the actual node ID (full URL format)
			expect(result.map(r => r.targetNodeId)).toEqual([
				"https://openalex.org/W2250748100", // Full URL (node.id)
				"https://openalex.org/W3200026003"  // Full URL (node.id)
			]);
			expect(result.map(r => r.sourceNodeId)).toEqual([
				"https://openalex.org/W3188841554",
				"https://openalex.org/W3188841554"
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
							display_name: "Test University"
						}
					}
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "I456",
					type: "institutions" as EntityType,
					label: "Test University",
					entityId: "https://openalex.org/I456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeAuthorRelationships(authorData, existingNodes);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				sourceNodeId: "https://openalex.org/A123",
				targetNodeId: "https://openalex.org/I456",
				relationType: RelationType.AFFILIATED,
				label: "affiliated with"
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
					weight: 1.0
				}
			];

			const result = (service as any).createEdgesFromRelationships(relationships);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: "A123-authored-W456",
				source: "A123",
				target: "W456",
				type: RelationType.AUTHORED,
				label: "authored",
				weight: 1.0,
				metadata: undefined
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
				refreshEntity: vi.fn()
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
							display_name: "Test Author"
						}
					}
				],
				referenced_works: ["https://openalex.org/W789"],
				primary_location: {
					source: {
						id: "https://openalex.org/S321",
						display_name: "Test Journal"
					}
				},
				// Required fields for isWork type guard
				locations: [],
				publication_year: 2023
			};

			mockDeduplicationService.getEntity.mockResolvedValue(mockWorkData);

			const result = await (service as any).fetchMinimalEntityData("https://openalex.org/W123", "works");

			expect(result).toEqual({
				id: "https://openalex.org/W123",
				entityType: "works",
				display_name: "Test Work",
				authorships: mockWorkData.authorships,
				referenced_works: mockWorkData.referenced_works,
				primary_location: mockWorkData.primary_location
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
							display_name: "Test University"
						}
					}
				],
				// Required fields for isAuthor type guard
				works_count: 10,
				last_known_institutions: [],
				orcid: null
			};

			mockDeduplicationService.getEntity.mockResolvedValue(mockAuthorData);

			const result = await (service as any).fetchMinimalEntityData("https://openalex.org/A123", "authors");

			expect(result).toEqual({
				id: "https://openalex.org/A123",
				entityType: "authors",
				display_name: "Test Author",
				affiliations: mockAuthorData.affiliations
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
				abbreviated_title: "Test J"
			};

			mockDeduplicationService.getEntity.mockResolvedValue(mockSourceData);

			const result = await (service as any).fetchMinimalEntityData("https://openalex.org/S123", "sources");

			expect(result).toEqual({
				id: "https://openalex.org/S123",
				entityType: "sources",
				display_name: "Test Journal",
				publisher: mockSourceData.publisher
			});
		});

		it("should fetch minimal data for institutions entity", async () => {
			const mockInstitutionData = {
				id: "https://openalex.org/I123",
				display_name: "Test University"
			};

			mockDeduplicationService.getEntity.mockResolvedValue(mockInstitutionData);

			const result = await (service as any).fetchMinimalEntityData("https://openalex.org/I123", "institutions");

			expect(result).toEqual({
				id: "https://openalex.org/I123",
				entityType: "institutions",
				display_name: "Test University"
			});
		});

		it("should return null if entity fetching fails", async () => {
			mockDeduplicationService.getEntity.mockRejectedValue(new Error("API Error"));

			const result = await (service as any).fetchMinimalEntityData("https://openalex.org/W123", "works");

			expect(result).toBeNull();
		});

		it("should handle entity types with no specific field mapping", async () => {
			const mockTopicData = {
				id: "https://openalex.org/T123",
				display_name: "Test Topic"
			};

			mockDeduplicationService.getEntity.mockResolvedValue(mockTopicData);

			const result = await (service as any).fetchMinimalEntityData("https://openalex.org/T123", "topics");

			expect(result).toEqual({
				id: "https://openalex.org/T123",
				entityType: "topics",
				display_name: "Test Topic"
			});
		});
	});

	describe("analyzeWorkRelationships - advanced scenarios", () => {
		it("should handle works with multiple authors", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				authorships: [
					{
						author: {
							id: "https://openalex.org/A456",
							display_name: "First Author"
						}
					},
					{
						author: {
							id: "https://openalex.org/A789",
							display_name: "Second Author"
						}
					}
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "A456",
					type: "authors" as EntityType,
					label: "First Author",
					entityId: "https://openalex.org/A456",
					position: { x: 0, y: 0 },
					externalIds: []
				},
				{
					id: "A789",
					type: "authors" as EntityType,
					label: "Second Author",
					entityId: "https://openalex.org/A789",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(2);
			expect(result[0].relationType).toBe(RelationType.AUTHORED);
			expect(result[1].relationType).toBe(RelationType.AUTHORED);
			expect(result.map(r => r.sourceNodeId)).toEqual([
				"https://openalex.org/A456",
				"https://openalex.org/A789"
			]);
		});

		it("should handle works with multiple referenced works", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				referenced_works: [
					"https://openalex.org/W456",
					"https://openalex.org/W789",
					"https://openalex.org/W101"
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "W456",
					type: "works" as EntityType,
					label: "Referenced Work 1",
					entityId: "https://openalex.org/W456",
					position: { x: 0, y: 0 },
					externalIds: []
				},
				{
					id: "W789",
					type: "works" as EntityType,
					label: "Referenced Work 2",
					entityId: "https://openalex.org/W789",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(2);
			expect(result.every(r => r.relationType === RelationType.REFERENCES)).toBe(true);
			expect(result.map(r => r.targetNodeId)).toEqual([
				"W456", // FIXED: Use actual node IDs
				"W789"  // FIXED: Use actual node IDs
			]);
		});

		it("should handle works with no matching existing nodes", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				authorships: [
					{
						author: {
							id: "https://openalex.org/A999",
							display_name: "Unknown Author"
						}
					}
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "A456",
					type: "authors" as EntityType,
					label: "Different Author",
					entityId: "https://openalex.org/A456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

			expect(result).toHaveLength(0);
		});

		it("should handle works with complex authorship data", () => {
			const workData = {
				id: "https://openalex.org/W123",
				entityType: "works" as EntityType,
				display_name: "Test Work",
				authorships: [
					{
						author: {
							id: "https://openalex.org/A456",
							display_name: "Test Author"
						},
						institutions: [
							{
								id: "https://openalex.org/I789",
								display_name: "Test University"
							}
						]
					}
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "A456",
					type: "authors" as EntityType,
					label: "Test Author",
					entityId: "https://openalex.org/A456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeWorkRelationships(workData, existingNodes);

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
							display_name: "Primary University"
						}
					},
					{
						institution: {
							id: "https://openalex.org/I789",
							display_name: "Secondary University"
						}
					}
				]
			};

			const existingNodes: GraphNode[] = [
				{
					id: "I456",
					type: "institutions" as EntityType,
					label: "Primary University",
					entityId: "https://openalex.org/I456",
					position: { x: 0, y: 0 },
					externalIds: []
				},
				{
					id: "I789",
					type: "institutions" as EntityType,
					label: "Secondary University",
					entityId: "https://openalex.org/I789",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeAuthorRelationships(authorData, existingNodes);

			expect(result).toHaveLength(2);
			expect(result.every(r => r.relationType === RelationType.AFFILIATED)).toBe(true);
			expect(result.map(r => r.targetNodeId)).toEqual([
				"https://openalex.org/I456",
				"https://openalex.org/I789"
			]);
		});

		it("should handle authors with no institutional connections", () => {
			const authorData = {
				id: "https://openalex.org/A123",
				entityType: "authors" as EntityType,
				display_name: "Test Author",
				affiliations: []
			};

			const existingNodes: GraphNode[] = [
				{
					id: "I456",
					type: "institutions" as EntityType,
					label: "Some University",
					entityId: "https://openalex.org/I456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeAuthorRelationships(authorData, existingNodes);

			expect(result).toHaveLength(0);
		});
	});

	describe("analyzeSourceRelationships", () => {
		it("should detect relationships with publisher", () => {
			const sourceData = {
				id: "https://openalex.org/S123",
				entityType: "sources" as EntityType,
				display_name: "Test Journal",
				publisher: "https://openalex.org/P456"
			};

			const existingNodes: GraphNode[] = [
				{
					id: "P456",
					type: "publishers" as EntityType,
					label: "Test Publisher",
					entityId: "https://openalex.org/P456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeSourceRelationships(sourceData, existingNodes);

			expect(result).toHaveLength(1);
			expect(result[0].relationType).toBe(RelationType.SOURCE_PUBLISHED_BY);
			expect(result[0].sourceNodeId).toBe("https://openalex.org/S123");
			expect(result[0].targetNodeId).toBe("https://openalex.org/P456");
		});

		it("should handle sources without publisher relationships", () => {
			const sourceData = {
				id: "https://openalex.org/S123",
				entityType: "sources" as EntityType,
				display_name: "Test Journal"
			};

			const existingNodes: GraphNode[] = [
				{
					id: "P456",
					type: "publishers" as EntityType,
					label: "Some Publisher",
					entityId: "https://openalex.org/P456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeSourceRelationships(sourceData, existingNodes);

			expect(result).toHaveLength(0);
		});
	});

	describe("analyzeInstitutionRelationships", () => {
		it("should return empty array as institutions have no predefined relationships", () => {
			const institutionData = {
				id: "https://openalex.org/I123",
				entityType: "institutions" as EntityType,
				display_name: "Test University"
			};

			const existingNodes: GraphNode[] = [
				{
					id: "A456",
					type: "authors" as EntityType,
					label: "Some Author",
					entityId: "https://openalex.org/A456",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			const result = (service as any).analyzeInstitutionRelationships(institutionData, existingNodes);

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
					weight: 1.0
				},
				{
					sourceNodeId: "W456",
					targetNodeId: "S789",
					relationType: RelationType.PUBLISHED_IN,
					label: "published in",
					weight: 0.8
				}
			];

			const result = (service as any).createEdgesFromRelationships(relationships);

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
					metadata: { collaborationType: "primary" }
				}
			];

			const result = (service as any).createEdgesFromRelationships(relationships);

			expect(result).toHaveLength(1);
			expect(result[0].metadata).toEqual({ collaborationType: "primary" });
		});

		it("should generate unique edge IDs", () => {
			const relationships = [
				{
					sourceNodeId: "A123",
					targetNodeId: "W456",
					relationType: RelationType.AUTHORED,
					label: "authored"
				},
				{
					sourceNodeId: "A789",
					targetNodeId: "W456",
					relationType: RelationType.AUTHORED,
					label: "authored"
				}
			];

			const result = (service as any).createEdgesFromRelationships(relationships);

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
				refreshEntity: vi.fn()
			};
			(service as any).deduplicationService = mockDeduplicationService;
		});

		it("should handle errors in detectRelationshipsForNode gracefully", async () => {
			const testNode: GraphNode = {
				id: "W123",
				type: "works" as EntityType,
				label: "Test Work",
				entityId: "https://openalex.org/W123",
				position: { x: 0, y: 0 },
				externalIds: [],
				metadata: { hydrationLevel: "full" as const }
			};

			mockStore.getNode.mockReturnValue(testNode);
			mockDeduplicationService.getEntity.mockRejectedValue(new Error("Network error"));

			const result = await service.detectRelationshipsForNode("W123");

			expect(result).toEqual([]);
		});

		it("should handle malformed entity data gracefully", async () => {
			const testNode: GraphNode = {
				id: "W123",
				type: "works" as EntityType,
				label: "Test Work",
				entityId: "https://openalex.org/W123",
				position: { x: 0, y: 0 },
				externalIds: [],
				metadata: { hydrationLevel: "full" as const }
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
				refreshEntity: vi.fn()
			};
			(service as any).deduplicationService = mockDeduplicationService;
		});

		it("should handle complex multi-entity relationship detection", async () => {
			const testNode: GraphNode = {
				id: "W123",
				type: "works" as EntityType,
				label: "Test Work",
				entityId: "https://openalex.org/W123",
				position: { x: 0, y: 0 },
				externalIds: [],
				metadata: { hydrationLevel: "full" as const }
			};

			const mockWorkData = {
				id: "https://openalex.org/W123",
				display_name: "Test Work",
				authorships: [
					{
						author: {
							id: "https://openalex.org/A456",
							display_name: "Test Author"
						}
					}
				],
				referenced_works: ["https://openalex.org/W789"],
				primary_location: {
					source: {
						id: "https://openalex.org/S321",
						display_name: "Test Journal"
					}
				},
				// Required fields for isWork type guard
				locations: [],
				publication_year: 2023
			};

			const existingNodes = [
				{
					id: "A456",
					type: "authors" as EntityType,
					label: "Test Author",
					entityId: "https://openalex.org/A456",
					position: { x: 0, y: 0 },
					externalIds: []
				},
				{
					id: "W789",
					type: "works" as EntityType,
					label: "Referenced Work",
					entityId: "https://openalex.org/W789",
					position: { x: 0, y: 0 },
					externalIds: []
				},
				{
					id: "S321",
					type: "sources" as EntityType,
					label: "Test Journal",
					entityId: "https://openalex.org/S321",
					position: { x: 0, y: 0 },
					externalIds: []
				}
			];

			mockStore.getNode.mockReturnValue(testNode);
			// Set up nodes as an object (not Map) for the graph store
			mockStore.nodes = Object.fromEntries(existingNodes.map(node => [node.id, node]));
			mockDeduplicationService.getEntity.mockResolvedValue(mockWorkData);

			const result = await service.detectRelationshipsForNode("W123");

			expect(result).toHaveLength(3);
			expect(result.map(r => r.type)).toEqual([
				RelationType.AUTHORED,
				RelationType.PUBLISHED_IN,
				RelationType.REFERENCES
			]);
		});
	});

	// Note: fetchEntityWithSelect is tested via integration tests since it depends on external API client
});