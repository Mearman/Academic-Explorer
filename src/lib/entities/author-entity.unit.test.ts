/**
 * Unit tests for AuthorEntity class
 * Tests author-specific operations like expanding works and error handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthorEntity } from "./author-entity";
import type { CachedOpenAlexClient } from "@/lib/openalex/cached-client";
import type { Author, Work, OpenAlexResponse } from "@/lib/openalex/types";
import { logger } from "@/lib/logger";

// Mock the logger
vi.mock("@/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	},
	logError: vi.fn()
}));

describe("AuthorEntity", () => {
	let mockClient: vi.Mocked<CachedOpenAlexClient>;
	let authorEntity: AuthorEntity;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create comprehensive mock client that matches the CachedOpenAlexClient structure
		mockClient = {
			getEntity: vi.fn(),
			getAuthor: vi.fn(),
			getWorks: vi.fn(),
			search: vi.fn(),
			client: {
				works: {
					getWorks: vi.fn(),
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				},
				authors: {
					getAuthor: vi.fn(),
					getAuthors: vi.fn(),
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn(),
					getWorks: vi.fn()
				},
				institutions: {
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				},
				sources: {
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				},
				topics: {
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				},
				publishers: {
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				},
				funders: {
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				},
				concepts: {
					search: vi.fn(),
					get: vi.fn(),
					getMultiple: vi.fn(),
					stream: vi.fn()
				}
			},
			works: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			},
			authors: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn(),
				getWorks: vi.fn()
			},
			institutions: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			},
			sources: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			},
			topics: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			},
			publishers: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			},
			funders: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			},
			concepts: {
				search: vi.fn(),
				get: vi.fn(),
				getMultiple: vi.fn(),
				stream: vi.fn()
			}
		} as vi.Mocked<CachedOpenAlexClient>;

		authorEntity = new AuthorEntity(mockClient);
	});

	describe("constructor", () => {
		it("should create AuthorEntity with client", () => {
			expect(authorEntity).toBeDefined();
			expect(authorEntity["entityType"]).toBe("authors");
		});

		it("should create AuthorEntity with client and entity data", () => {
			const authorData: Partial<Author> = {
				id: "https://openalex.org/A5025875274",
				display_name: "Test Author"
			};

			const entityWithData = new AuthorEntity(mockClient, authorData as Author);
			expect(entityWithData).toBeDefined();
		});
	});

	describe("expand", () => {
		const entityId = "https://openalex.org/A5025875274";
		const context = {
			entityId: "https://openalex.org/A5025875274",
			entityType: "authors" as const,
			client: mockClient
		};
		const options = { limit: 10 };

		it("should successfully expand author with valid works response", async () => {
			const mockWorksResponse: OpenAlexResponse<Work> = {
				meta: {
					count: 2,
					db_response_time_ms: 100,
					page: 1,
					per_page: 25
				},
				results: [
          {
          	id: "https://openalex.org/W1",
          	display_name: "Work 1",
          	title: "Work 1",
          	authorships: [],
          	referenced_works: [],
          	publication_year: 2023,
          	cited_by_count: 10,
          	open_access: { is_oa: true },
          	doi: null
          } as Work,
          {
          	id: "https://openalex.org/W2",
          	display_name: "Work 2",
          	title: "Work 2",
          	authorships: [],
          	referenced_works: [],
          	publication_year: 2022,
          	cited_by_count: 5,
          	open_access: { is_oa: false },
          	doi: null
          } as Work
				]
			};

			// Mock getAuthor to return author data with affiliations
			const mockAuthor: Author = {
				id: entityId,
				display_name: "Test Author",
				affiliations: [
					{
						institution: {
							id: "https://openalex.org/I1",
							display_name: "Test Institution"
						}
					}
				]
			} as Author;

			mockClient.client.authors.getAuthor.mockResolvedValue(mockAuthor);
			mockClient.client.works.getWorks.mockResolvedValue(mockWorksResponse);

			const result = await authorEntity.expand(context, options);

			expect(result.nodes).toHaveLength(3); // 2 works + 1 institution from author affiliations
			expect(result.edges).toHaveLength(3); // 2 author-work edges + 1 author-institution edge
			expect(mockClient.client.works.getWorks).toHaveBeenCalledWith({
				filter: `authorships.author.id:${entityId}`,
				page: 1,
				per_page: 200,
				select: ["id", "display_name", "referenced_works", "doi", "publication_year", "cited_by_count", "open_access"],
				sort: undefined
			});
		});

		it("should handle empty works response gracefully", async () => {
			const emptyResponse: OpenAlexResponse<Work> = {
				meta: {
					count: 0,
					db_response_time_ms: 100,
					page: 1,
					per_page: 25
				},
				results: []
			};

			// Mock getAuthor to return author data with affiliations
			const mockAuthor: Author = {
				id: entityId,
				display_name: "Test Author",
				affiliations: [
					{
						institution: {
							id: "https://openalex.org/I1",
							display_name: "Test Institution"
						}
					}
				]
			} as Author;

			mockClient.client.authors.getAuthor.mockResolvedValue(mockAuthor);
			mockClient.client.works.getWorks.mockResolvedValue(emptyResponse);

			const result = await authorEntity.expand(context, options);

			expect(result.nodes).toHaveLength(1); // 1 institution from author affiliations (no works)
			expect(result.edges).toHaveLength(1); // 1 author-institution edge
			expect(logger.error).not.toHaveBeenCalled();
		});

		describe("error handling", () => {
			it("should handle undefined response from works search", async () => {
				// Mock getAuthor to return author data with affiliations
				const mockAuthor: Author = {
					id: entityId,
					display_name: "Test Author",
					affiliations: [
						{
							institution: {
								id: "https://openalex.org/I1",
								display_name: "Test Institution"
							}
						}
					]
				} as Author;

				mockClient.client.authors.getAuthor.mockResolvedValue(mockAuthor);
				mockClient.client.works.getWorks.mockResolvedValue(undefined as any);

				const result = await authorEntity.expand(context, options);

				expect(result.nodes).toHaveLength(0);
				expect(result.edges).toHaveLength(0);
				// Check for the specific error pattern that should occur
				expect(logger.error).toHaveBeenCalledWith(
					"graph",
					"Error in AuthorEntity.expand",
					expect.objectContaining({
						entityId: entityId,
						error: expect.stringContaining("Cannot read properties of undefined")
					}),
					"AuthorEntity"
				);
			});

			it("should handle response without results property", async () => {
				const responseWithoutResults = {
					meta: {
						count: 0,
						db_response_time_ms: 100,
						page: 1,
						per_page: 25
					}
					// Missing 'results' property
				};

				// Mock getAuthor to return author data with affiliations
				const mockAuthor: Author = {
					id: entityId,
					display_name: "Test Author",
					affiliations: [
						{
							institution: {
								id: "https://openalex.org/I1",
								display_name: "Test Institution"
							}
						}
					]
				} as Author;

				mockClient.client.authors.getAuthor.mockResolvedValue(mockAuthor);
				mockClient.client.works.getWorks.mockResolvedValue(responseWithoutResults as any);

				const result = await authorEntity.expand(context, options);

				expect(result.nodes).toHaveLength(0);
				expect(result.edges).toHaveLength(0);
				// Check for the specific error pattern that should occur
				expect(logger.error).toHaveBeenCalledWith(
					"graph",
					"Error in AuthorEntity.expand",
					expect.objectContaining({
						entityId: entityId,
						error: expect.stringContaining("Cannot read properties of undefined")
					}),
					"AuthorEntity"
				);
			});

			it("should handle null results property", async () => {
				const responseWithNullResults = {
					meta: {
						count: 0,
						db_response_time_ms: 100,
						page: 1,
						per_page: 25
					},
					results: null
				};

				mockClient.client.works.getWorks.mockResolvedValue(responseWithNullResults as any);

				const result = await authorEntity.expand(context, options);

				// Should handle null gracefully without throwing
				expect(result.nodes).toHaveLength(0);
				expect(result.edges).toHaveLength(0);
			});

			it("should handle API rejection with proper error logging", async () => {
				const apiError = new Error("API Error");

				// Mock getAuthor to succeed first (required before getWorks is called)
				const mockAuthor: Author = {
					id: entityId,
					display_name: "Test Author",
					affiliations: []
				} as Author;
				mockClient.client.authors.getAuthor.mockResolvedValue(mockAuthor);

				// Mock getWorks to fail
				mockClient.client.works.getWorks.mockRejectedValue(apiError);

				const result = await authorEntity.expand(context, options);

				expect(result.nodes).toHaveLength(0);
				expect(result.edges).toHaveLength(0);
				expect(logger.error).toHaveBeenCalled();
			});

			it("should handle rate limiting errors", async () => {
				const rateLimitError = new Error("429 TOO MANY REQUESTS");

				// Mock getAuthor to succeed first (required before getWorks is called)
				const mockAuthor: Author = {
					id: entityId,
					display_name: "Test Author",
					affiliations: []
				} as Author;
				mockClient.client.authors.getAuthor.mockResolvedValue(mockAuthor);

				// Mock getWorks to fail with rate limit error
				mockClient.client.works.getWorks.mockRejectedValue(rateLimitError);

				const result = await authorEntity.expand(context, options);

				expect(result.nodes).toHaveLength(0);
				expect(result.edges).toHaveLength(0);
				expect(logger.error).toHaveBeenCalled();
			});
		});
	});

	describe("field configuration", () => {
		it("should return correct minimal fields for author display", () => {
			const minimalFields = authorEntity["getMinimalFields"]();

			expect(minimalFields).toContain("id");
			expect(minimalFields).toContain("display_name");
			expect(minimalFields).toContain("orcid");
		});

		it("should return comprehensive metadata fields", () => {
			const metadataFields = authorEntity["getMetadataFields"]();

			expect(metadataFields).toContain("id");
			expect(metadataFields).toContain("display_name");
			expect(metadataFields).toContain("works_count");
			expect(metadataFields).toContain("cited_by_count");
			expect(metadataFields).toContain("affiliations");
		});
	});

	describe("entity validation", () => {
		it("should handle malformed author data", () => {
			const malformedData = {
				// Missing required fields like 'id'
				display_name: "Test Author"
			};

			expect(() => {
				new AuthorEntity(mockClient, malformedData as Author);
			}).not.toThrow();
		});

		it("should handle null author data", () => {
			expect(() => {
				new AuthorEntity(mockClient, null as any);
			}).not.toThrow();
		});

		it("should handle undefined author data", () => {
			expect(() => {
				new AuthorEntity(mockClient, undefined as any);
			}).not.toThrow();
		});
	});
});