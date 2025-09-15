/**
 * Unit tests for RelationshipDetectionService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { RelationshipDetectionService } from "./relationship-detection-service";
import { useGraphStore } from "@/stores/graph-store";
import { RelationType } from "@/lib/graph/types";
import type { GraphNode, EntityType } from "@/lib/graph/types";
import type { Work, Author } from "@/lib/openalex/types";

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
			nodes: new Map(),
			addEdges: vi.fn(),
		};
		vi.mocked(useGraphStore.getState).mockReturnValue(mockStore);
	});

	describe("detectRelationshipsForNode", () => {
		it("should return empty array if node not found", async () => {
			mockStore.getNode.mockReturnValue(undefined);

			const result = await service.detectRelationshipsForNode("nonexistent");

			expect(result).toEqual([]);
			expect(mockStore.getNode).toHaveBeenCalledWith("nonexistent");
		});

		it("should skip placeholder nodes", async () => {
			const placeholderNode: GraphNode = {
				id: "W123",
				type: "works" as EntityType,
				label: "Test Work",
				entityId: "https://openalex.org/W123",
				position: { x: 0, y: 0 },
				externalIds: [],
				metadata: { isPlaceholder: true }
			};

			mockStore.getNode.mockReturnValue(placeholderNode);

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
					id: "W456",
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
				targetNodeId: "https://openalex.org/W456",
				relationType: RelationType.REFERENCES,
				label: "references"
			});
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

	// Note: fetchEntityWithSelect is tested via integration tests since it depends on external API client
});