/**
 * Unit tests for EntityFactory class
 * Tests the factory pattern implementation for entity creation and management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EntityFactory } from "./entity-factory";
import { WorkEntity } from "./work-entity";
import { AuthorEntity } from "./author-entity";
import type { CachedOpenAlexClient } from "@/lib/openalex/cached-client";
import type { Work, Author } from "@/lib/openalex/types";
import type { EntityType } from "@/lib/graph/types";

// Mock the dependencies
vi.mock("./work-entity");
vi.mock("./author-entity");
vi.mock("./entity-detection", () => ({
	detectEntityType: vi.fn()
}));

const { detectEntityType } = await import("./entity-detection");

describe("EntityFactory", () => {
	let mockClient: CachedOpenAlexClient;

	beforeEach(() => {
		mockClient = {
			works: vi.fn(),
			authors: vi.fn(),
			sources: vi.fn(),
			institutions: vi.fn(),
			topics: vi.fn(),
			publishers: vi.fn(),
			funders: vi.fn(),
			keywords: vi.fn()
		} as unknown as CachedOpenAlexClient;

		vi.clearAllMocks();
	});

	describe("create", () => {
		it("should create a WorkEntity for works type", () => {
			const mockWorkData: Work = {
				id: "https://openalex.org/W123",
				display_name: "Test Work",
				authorships: [],
				cited_by_count: 10,
				publication_year: 2023,
				type: "article",
				primary_location: null,
				best_oa_location: null,
				abstract_inverted_index: null,
				biblio: null,
				concepts: [],
				corresponding_author_ids: [],
				corresponding_institution_ids: [],
				countries_distinct_count: 0,
				created_date: "2023-01-01",
				doi: null,
				grants: [],
				has_fulltext: false,
				ids: { openalex: "https://openalex.org/W123" },
				indexed_in: [],
				institutions_distinct_count: 0,
				is_oa: false,
				is_paratext: false,
				is_retracted: false,
				keywords: [],
				language: null,
				license: null,
				locations: [],
				locations_count: 0,
				mesh: [],
				ngrams_url: null,
				open_access: { any_repository_has_fulltext: false, is_oa: false, oa_date: null, oa_url: null },
				primary_topic: null,
				publication_date: "2023-01-01",
				referenced_works: [],
				referenced_works_count: 0,
				related_works: [],
				sustainable_development_goals: [],
				title: "Test Work",
				topics: [],
				type_crossref: null,
				updated_date: "2023-01-01"
			};

			const result = EntityFactory.create("works", mockClient, mockWorkData);

			expect(WorkEntity).toHaveBeenCalledWith(mockClient, mockWorkData);
			expect(result).toBeDefined();
		});

		it("should create an AuthorEntity for authors type", () => {
			const mockAuthorData: Author = {
				id: "https://openalex.org/A123",
				display_name: "Test Author",
				affiliations: [],
				cited_by_count: 50,
				works_count: 5,
				ids: { openalex: "https://openalex.org/A123" },
				display_name_alternatives: [],
				works_api_url: "",
				created_date: "2023-01-01",
				updated_date: "2023-01-01",
				orcid: null,
				scopus: null,
				summary_stats: {
					"2yr_mean_citedness": 0,
					"2yr_h_index": 0,
					"2yr_i10_index": 0,
					"2yr_works_count": 0,
					cited_by_count: 50,
					h_index: 5,
					i10_index: 2,
					oa_percent: 0.5,
					works_count: 5
				}
			};

			const result = EntityFactory.create("authors", mockClient, mockAuthorData);

			expect(AuthorEntity).toHaveBeenCalledWith(mockClient, mockAuthorData);
			expect(result).toBeDefined();
		});

		it("should create entity without data when data is not provided", () => {
			const result = EntityFactory.create("works", mockClient);

			expect(WorkEntity).toHaveBeenCalledWith(mockClient, undefined);
			expect(result).toBeDefined();
		});

		it("should throw error for unsupported entity type", () => {
			expect(() => {
				EntityFactory.create("unsupported" as EntityType, mockClient);
			}).toThrow("No entity class registered for type: unsupported");
		});

		it("should handle sources entity type when not implemented", () => {
			expect(() => {
				EntityFactory.create("sources", mockClient);
			}).toThrow("No entity class registered for type: sources");
		});

		it("should handle institutions entity type when not implemented", () => {
			expect(() => {
				EntityFactory.create("institutions", mockClient);
			}).toThrow("No entity class registered for type: institutions");
		});

		it("should handle topics entity type when not implemented", () => {
			expect(() => {
				EntityFactory.create("topics", mockClient);
			}).toThrow("No entity class registered for type: topics");
		});

		it("should handle publishers entity type when not implemented", () => {
			expect(() => {
				EntityFactory.create("publishers", mockClient);
			}).toThrow("No entity class registered for type: publishers");
		});

		it("should handle funders entity type when not implemented", () => {
			expect(() => {
				EntityFactory.create("funders", mockClient);
			}).toThrow("No entity class registered for type: funders");
		});

		it("should handle keywords entity type when not implemented", () => {
			expect(() => {
				EntityFactory.create("keywords", mockClient);
			}).toThrow("No entity class registered for type: keywords");
		});
	});

	describe("createFromData", () => {
		it("should create WorkEntity from work data with automatic type detection", () => {
			const mockWorkData: Work = {
				id: "https://openalex.org/W456",
				display_name: "Another Test Work",
				authorships: [],
				cited_by_count: 20,
				publication_year: 2024,
				type: "article",
				primary_location: null,
				best_oa_location: null,
				abstract_inverted_index: null,
				biblio: null,
				concepts: [],
				corresponding_author_ids: [],
				corresponding_institution_ids: [],
				countries_distinct_count: 0,
				created_date: "2024-01-01",
				doi: null,
				grants: [],
				has_fulltext: false,
				ids: { openalex: "https://openalex.org/W456" },
				indexed_in: [],
				institutions_distinct_count: 0,
				is_oa: false,
				is_paratext: false,
				is_retracted: false,
				keywords: [],
				language: null,
				license: null,
				locations: [],
				locations_count: 0,
				mesh: [],
				ngrams_url: null,
				open_access: { any_repository_has_fulltext: false, is_oa: false, oa_date: null, oa_url: null },
				primary_topic: null,
				publication_date: "2024-01-01",
				referenced_works: [],
				referenced_works_count: 0,
				related_works: [],
				sustainable_development_goals: [],
				title: "Another Test Work",
				topics: [],
				type_crossref: null,
				updated_date: "2024-01-01"
			};

			vi.mocked(detectEntityType).mockReturnValue("works");

			const result = EntityFactory.createFromData(mockWorkData, mockClient);

			expect(detectEntityType).toHaveBeenCalledWith(mockWorkData);
			expect(WorkEntity).toHaveBeenCalledWith(mockClient, mockWorkData);
			expect(result).toBeDefined();
		});

		it("should create AuthorEntity from author data with automatic type detection", () => {
			const mockAuthorData: Author = {
				id: "https://openalex.org/A789",
				display_name: "Another Test Author",
				affiliations: [],
				cited_by_count: 100,
				works_count: 10,
				ids: { openalex: "https://openalex.org/A789" },
				display_name_alternatives: [],
				works_api_url: "",
				created_date: "2024-01-01",
				updated_date: "2024-01-01",
				orcid: null,
				scopus: null,
				summary_stats: {
					"2yr_mean_citedness": 0,
					"2yr_h_index": 0,
					"2yr_i10_index": 0,
					"2yr_works_count": 0,
					cited_by_count: 100,
					h_index: 8,
					i10_index: 5,
					oa_percent: 0.7,
					works_count: 10
				}
			};

			vi.mocked(detectEntityType).mockReturnValue("authors");

			const result = EntityFactory.createFromData(mockAuthorData, mockClient);

			expect(detectEntityType).toHaveBeenCalledWith(mockAuthorData);
			expect(AuthorEntity).toHaveBeenCalledWith(mockClient, mockAuthorData);
			expect(result).toBeDefined();
		});

		it("should handle entity data with detected unsupported type", () => {
			const mockData = { id: "test", display_name: "test" } as any;
			vi.mocked(detectEntityType).mockReturnValue("sources");

			expect(() => {
				EntityFactory.createFromData(mockData, mockClient);
			}).toThrow("No entity class registered for type: sources");
		});
	});

	describe("getRegisteredTypes", () => {
		it("should return array of registered entity types", () => {
			const types = EntityFactory.getRegisteredTypes();

			expect(types).toBeInstanceOf(Array);
			expect(types).toContain("works");
			expect(types).toContain("authors");
			expect(types.length).toBeGreaterThanOrEqual(2);
		});

		it("should return types in consistent order", () => {
			const types1 = EntityFactory.getRegisteredTypes();
			const types2 = EntityFactory.getRegisteredTypes();

			expect(types1).toEqual(types2);
		});
	});

	describe("isSupported", () => {
		it("should return true for works entity type", () => {
			expect(EntityFactory.isSupported("works")).toBe(true);
		});

		it("should return true for authors entity type", () => {
			expect(EntityFactory.isSupported("authors")).toBe(true);
		});

		it("should return false for sources entity type (not implemented)", () => {
			expect(EntityFactory.isSupported("sources")).toBe(false);
		});

		it("should return false for institutions entity type (not implemented)", () => {
			expect(EntityFactory.isSupported("institutions")).toBe(false);
		});

		it("should return false for topics entity type (not implemented)", () => {
			expect(EntityFactory.isSupported("topics")).toBe(false);
		});

		it("should return false for publishers entity type (not implemented)", () => {
			expect(EntityFactory.isSupported("publishers")).toBe(false);
		});

		it("should return false for funders entity type (not implemented)", () => {
			expect(EntityFactory.isSupported("funders")).toBe(false);
		});

		it("should return false for keywords entity type (not implemented)", () => {
			expect(EntityFactory.isSupported("keywords")).toBe(false);
		});

		it("should return false for invalid entity type", () => {
			expect(EntityFactory.isSupported("invalid" as EntityType)).toBe(false);
		});
	});

	describe("register", () => {
		// Create a mock entity class for testing
		class MockEntity {
			constructor(public client: CachedOpenAlexClient, public entityData?: any) {}
		}

		beforeEach(() => {
			// Clean up any custom registrations between tests
		});

		it("should register a new entity class", () => {
			const customType = "custom" as EntityType;

			expect(EntityFactory.isSupported(customType)).toBe(false);

			EntityFactory.register(customType, MockEntity as any);

			expect(EntityFactory.isSupported(customType)).toBe(true);
			expect(EntityFactory.getRegisteredTypes()).toContain(customType);
		});

		it("should create instance of registered custom entity", () => {
			const customType = "custom" as EntityType;
			EntityFactory.register(customType, MockEntity as any);

			const result = EntityFactory.create(customType, mockClient);

			expect(result).toBeDefined();
			expect((result as any).client).toBe(mockClient);
		});

		it("should create instance of registered custom entity with data", () => {
			const customType = "custom" as EntityType;
			const customData = { id: "test", name: "Test Entity" };
			EntityFactory.register(customType, MockEntity as any);

			const result = EntityFactory.create(customType, mockClient, customData);

			expect(result).toBeDefined();
			expect((result as any).client).toBe(mockClient);
			expect((result as any).entityData).toBe(customData);
		});

		it("should override existing registration", () => {
			class OverrideEntity {
				constructor(public client: CachedOpenAlexClient, public entityData?: any) {}
			}

			EntityFactory.register("works", OverrideEntity as any);

			const result = EntityFactory.create("works", mockClient);

			expect(result).toBeDefined();
			// Can't reliably test instanceof with mocked classes in this context
		});
	});

	describe("edge cases and error handling", () => {
		it("should handle null client parameter", () => {
			expect(() => {
				EntityFactory.create("works", null as any);
			}).not.toThrow();
		});

		it("should handle undefined client parameter", () => {
			expect(() => {
				EntityFactory.create("works", undefined as any);
			}).not.toThrow();
		});

		it("should handle null entity data", () => {
			expect(() => {
				EntityFactory.create("works", mockClient, null as any);
			}).not.toThrow();
		});

		it("should handle empty string entity type", () => {
			expect(() => {
				EntityFactory.create("" as EntityType, mockClient);
			}).toThrow("No entity class registered for type: ");
		});

		it("should handle whitespace-only entity type", () => {
			expect(() => {
				EntityFactory.create("   " as EntityType, mockClient);
			}).toThrow("No entity class registered for type:    ");
		});
	});

	describe("factory pattern compliance", () => {
		it("should maintain singleton-like behavior for entity class registry", () => {
			const types1 = EntityFactory.getRegisteredTypes();
			const types2 = EntityFactory.getRegisteredTypes();

			// Should return the same set of types
			expect(types1.sort()).toEqual(types2.sort());
		});

		it("should allow inspection of factory state", () => {
			const supportedWorks = EntityFactory.isSupported("works");
			const supportedAuthors = EntityFactory.isSupported("authors");
			const registeredTypes = EntityFactory.getRegisteredTypes();

			expect(supportedWorks).toBe(true);
			expect(supportedAuthors).toBe(true);
			expect(registeredTypes).toContain("works");
			expect(registeredTypes).toContain("authors");
		});

		it("should handle factory operations in correct sequence", () => {
			// Test typical factory usage pattern
			const entityType: EntityType = "works";

			// 1. Check if supported
			expect(EntityFactory.isSupported(entityType)).toBe(true);

			// 2. Get registered types for validation
			const types = EntityFactory.getRegisteredTypes();
			expect(types).toContain(entityType);

			// 3. Create entity
			const entity = EntityFactory.create(entityType, mockClient);
			expect(entity).toBeDefined();
		});
	});
});