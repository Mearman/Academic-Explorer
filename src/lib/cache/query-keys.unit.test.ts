/**
 * Unit tests for query-keys utilities
 * Testing TanStack Query key factory and hierarchical key generation
 */

import { describe, it, expect } from "vitest";
import {
	queryKeys,
	getEntityQueryKey,
	getRelatedEntityQueryKeys,
	type QueryKey as _QueryKey
} from "./query-keys";

describe("Query Keys Factory", () => {
	describe("Root and Base Keys", () => {
		it("should provide consistent root key", () => {
			expect(queryKeys.all).toEqual(["openalex"]);
		});

		it("should provide hierarchical entity base keys", () => {
			expect(queryKeys.works()).toEqual(["openalex", "works"]);
			expect(queryKeys.authors()).toEqual(["openalex", "authors"]);
			expect(queryKeys.sources()).toEqual(["openalex", "sources"]);
			expect(queryKeys.institutions()).toEqual(["openalex", "institutions"]);
			expect(queryKeys.topics()).toEqual(["openalex", "topics"]);
			expect(queryKeys.publishers()).toEqual(["openalex", "publishers"]);
			expect(queryKeys.funders()).toEqual(["openalex", "funders"]);
		});
	});

	describe("Works Query Keys", () => {
		it("should generate work entity key", () => {
			const workId = "W123456789";
			expect(queryKeys.work(workId)).toEqual(["openalex", "works", workId]);
		});

		it("should generate work citations key", () => {
			const workId = "W123456789";
			expect(queryKeys.workCitations(workId)).toEqual([
				"openalex", "works", workId, "citations", undefined
			]);
		});

		it("should generate work citations key with parameters", () => {
			const workId = "W123456789";
			const params = { page: 1, per_page: 20 };
			expect(queryKeys.workCitations(workId, params)).toEqual([
				"openalex", "works", workId, "citations", params
			]);
		});

		it("should generate work references key", () => {
			const workId = "W123456789";
			expect(queryKeys.workReferences(workId)).toEqual([
				"openalex", "works", workId, "references", undefined
			]);
		});

		it("should generate work references key with parameters", () => {
			const workId = "W123456789";
			const params = { filter: "publication_year:>2020" };
			expect(queryKeys.workReferences(workId, params)).toEqual([
				"openalex", "works", workId, "references", params
			]);
		});

		it("should generate work related key", () => {
			const workId = "W123456789";
			expect(queryKeys.workRelated(workId)).toEqual([
				"openalex", "works", workId, "related", undefined
			]);
		});

		it("should generate work related key with parameters", () => {
			const workId = "W123456789";
			const params = { similarity_threshold: 0.8 };
			expect(queryKeys.workRelated(workId, params)).toEqual([
				"openalex", "works", workId, "related", params
			]);
		});
	});

	describe("Authors Query Keys", () => {
		it("should generate author entity key", () => {
			const authorId = "A123456789";
			expect(queryKeys.author(authorId)).toEqual(["openalex", "authors", authorId]);
		});

		it("should generate author works key", () => {
			const authorId = "A123456789";
			expect(queryKeys.authorWorks(authorId)).toEqual([
				"openalex", "authors", authorId, "works", undefined
			]);
		});

		it("should generate author works key with parameters", () => {
			const authorId = "A123456789";
			const params = { sort: "publication_year:desc", per_page: 50 };
			expect(queryKeys.authorWorks(authorId, params)).toEqual([
				"openalex", "authors", authorId, "works", params
			]);
		});

		it("should generate author coauthors key", () => {
			const authorId = "A123456789";
			expect(queryKeys.authorCoauthors(authorId)).toEqual([
				"openalex", "authors", authorId, "coauthors", undefined
			]);
		});

		it("should generate author coauthors key with parameters", () => {
			const authorId = "A123456789";
			const params = { min_collaborations: 3 };
			expect(queryKeys.authorCoauthors(authorId, params)).toEqual([
				"openalex", "authors", authorId, "coauthors", params
			]);
		});

		it("should generate author institutions key", () => {
			const authorId = "A123456789";
			expect(queryKeys.authorInstitutions(authorId)).toEqual([
				"openalex", "authors", authorId, "institutions"
			]);
		});
	});

	describe("Sources Query Keys", () => {
		it("should generate source entity key", () => {
			const sourceId = "S123456789";
			expect(queryKeys.source(sourceId)).toEqual(["openalex", "sources", sourceId]);
		});

		it("should generate source works key", () => {
			const sourceId = "S123456789";
			expect(queryKeys.sourceWorks(sourceId)).toEqual([
				"openalex", "sources", sourceId, "works", undefined
			]);
		});

		it("should generate source works key with parameters", () => {
			const sourceId = "S123456789";
			const params = { filter: "is_oa:true" };
			expect(queryKeys.sourceWorks(sourceId, params)).toEqual([
				"openalex", "sources", sourceId, "works", params
			]);
		});

		it("should generate source authors key", () => {
			const sourceId = "S123456789";
			expect(queryKeys.sourceAuthors(sourceId)).toEqual([
				"openalex", "sources", sourceId, "authors", undefined
			]);
		});

		it("should generate source authors key with parameters", () => {
			const sourceId = "S123456789";
			const params = { sort: "works_count:desc" };
			expect(queryKeys.sourceAuthors(sourceId, params)).toEqual([
				"openalex", "sources", sourceId, "authors", params
			]);
		});
	});

	describe("Institutions Query Keys", () => {
		it("should generate institution entity key", () => {
			const institutionId = "I123456789";
			expect(queryKeys.institution(institutionId)).toEqual(["openalex", "institutions", institutionId]);
		});

		it("should generate institution works key", () => {
			const institutionId = "I123456789";
			expect(queryKeys.institutionWorks(institutionId)).toEqual([
				"openalex", "institutions", institutionId, "works", undefined
			]);
		});

		it("should generate institution works key with parameters", () => {
			const institutionId = "I123456789";
			const params = { filter: "publication_year:2023" };
			expect(queryKeys.institutionWorks(institutionId, params)).toEqual([
				"openalex", "institutions", institutionId, "works", params
			]);
		});

		it("should generate institution authors key", () => {
			const institutionId = "I123456789";
			expect(queryKeys.institutionAuthors(institutionId)).toEqual([
				"openalex", "institutions", institutionId, "authors", undefined
			]);
		});

		it("should generate institution authors key with parameters", () => {
			const institutionId = "I123456789";
			const params = { filter: "is_corresponding:true" };
			expect(queryKeys.institutionAuthors(institutionId, params)).toEqual([
				"openalex", "institutions", institutionId, "authors", params
			]);
		});
	});

	describe("Topics Query Keys", () => {
		it("should generate topic entity key", () => {
			const topicId = "T123456789";
			expect(queryKeys.topic(topicId)).toEqual(["openalex", "topics", topicId]);
		});

		it("should generate topic works key", () => {
			const topicId = "T123456789";
			expect(queryKeys.topicWorks(topicId)).toEqual([
				"openalex", "topics", topicId, "works", undefined
			]);
		});

		it("should generate topic works key with parameters", () => {
			const topicId = "T123456789";
			const params = { filter: "type:journal-article" };
			expect(queryKeys.topicWorks(topicId, params)).toEqual([
				"openalex", "topics", topicId, "works", params
			]);
		});
	});

	describe("Publishers Query Keys", () => {
		it("should generate publisher entity key", () => {
			const publisherId = "P123456789";
			expect(queryKeys.publisher(publisherId)).toEqual(["openalex", "publishers", publisherId]);
		});
	});

	describe("Funders Query Keys", () => {
		it("should generate funder entity key", () => {
			const funderId = "F123456789";
			expect(queryKeys.funder(funderId)).toEqual(["openalex", "funders", funderId]);
		});
	});

	describe("Search Query Keys", () => {
		it("should generate general search key", () => {
			const query = "machine learning";
			expect(queryKeys.search(query)).toEqual([
				"openalex", "search", { query, filters: undefined }
			]);
		});

		it("should generate general search key with filters", () => {
			const query = "artificial intelligence";
			const filters = { "publication_year": ">2020" };
			expect(queryKeys.search(query, filters)).toEqual([
				"openalex", "search", { query, filters }
			]);
		});

		it("should generate works search key", () => {
			const query = "neural networks";
			expect(queryKeys.searchWorks(query)).toEqual([
				"openalex", "works", "search", { query, filters: undefined }
			]);
		});

		it("should generate works search key with filters", () => {
			const query = "deep learning";
			const filters = { "type": "journal-article" };
			expect(queryKeys.searchWorks(query, filters)).toEqual([
				"openalex", "works", "search", { query, filters }
			]);
		});

		it("should generate authors search key", () => {
			const query = "John Smith";
			expect(queryKeys.searchAuthors(query)).toEqual([
				"openalex", "authors", "search", { query, filters: undefined }
			]);
		});

		it("should generate authors search key with filters", () => {
			const query = "Jane Doe";
			const filters = { "works_count": ">50" };
			expect(queryKeys.searchAuthors(query, filters)).toEqual([
				"openalex", "authors", "search", { query, filters }
			]);
		});

		it("should generate sources search key", () => {
			const query = "Nature";
			expect(queryKeys.searchSources(query)).toEqual([
				"openalex", "sources", "search", { query, filters: undefined }
			]);
		});

		it("should generate sources search key with filters", () => {
			const query = "Science";
			const filters = { "type": "journal" };
			expect(queryKeys.searchSources(query, filters)).toEqual([
				"openalex", "sources", "search", { query, filters }
			]);
		});

		it("should generate institutions search key", () => {
			const query = "MIT";
			expect(queryKeys.searchInstitutions(query)).toEqual([
				"openalex", "institutions", "search", { query, filters: undefined }
			]);
		});

		it("should generate institutions search key with filters", () => {
			const query = "Stanford";
			const filters = { "country_code": "US" };
			expect(queryKeys.searchInstitutions(query, filters)).toEqual([
				"openalex", "institutions", "search", { query, filters }
			]);
		});
	});

	describe("Autocomplete Query Keys", () => {
		it("should generate autocomplete key for works", () => {
			const query = "machine";
			expect(queryKeys.autocomplete(query, "work")).toEqual([
				"openalex", "autocomplete", "work", query
			]);
		});

		it("should generate autocomplete key for authors", () => {
			const query = "john";
			expect(queryKeys.autocomplete(query, "author")).toEqual([
				"openalex", "autocomplete", "author", query
			]);
		});

		it("should generate autocomplete key for institutions", () => {
			const query = "mit";
			expect(queryKeys.autocomplete(query, "institution")).toEqual([
				"openalex", "autocomplete", "institution", query
			]);
		});
	});

	describe("External ID Query Keys", () => {
		it("should generate DOI external ID key", () => {
			const doi = "10.1038/nature12373";
			expect(queryKeys.externalId("doi", doi)).toEqual([
				"openalex", "external", "doi", doi
			]);
		});

		it("should generate ORCID external ID key", () => {
			const orcid = "0000-0003-1613-5981";
			expect(queryKeys.externalId("orcid", orcid)).toEqual([
				"openalex", "external", "orcid", orcid
			]);
		});

		it("should generate ROR external ID key", () => {
			const ror = "03vek6s52";
			expect(queryKeys.externalId("ror", ror)).toEqual([
				"openalex", "external", "ror", ror
			]);
		});

		it("should generate ISSN external ID key", () => {
			const issn = "1476-4687";
			expect(queryKeys.externalId("issn", issn)).toEqual([
				"openalex", "external", "issn", issn
			]);
		});
	});
});

describe("Entity Query Key Helper", () => {
	describe("getEntityQueryKey", () => {
		it("should return work query key", () => {
			const workId = "W123456789";
			expect(getEntityQueryKey("work", workId)).toEqual(["openalex", "works", workId]);
		});

		it("should return author query key", () => {
			const authorId = "A123456789";
			expect(getEntityQueryKey("author", authorId)).toEqual(["openalex", "authors", authorId]);
		});

		it("should return source query key", () => {
			const sourceId = "S123456789";
			expect(getEntityQueryKey("source", sourceId)).toEqual(["openalex", "sources", sourceId]);
		});

		it("should return institution query key", () => {
			const institutionId = "I123456789";
			expect(getEntityQueryKey("institution", institutionId)).toEqual(["openalex", "institutions", institutionId]);
		});

		it("should return topic query key", () => {
			const topicId = "T123456789";
			expect(getEntityQueryKey("topic", topicId)).toEqual(["openalex", "topics", topicId]);
		});

		it("should return publisher query key", () => {
			const publisherId = "P123456789";
			expect(getEntityQueryKey("publisher", publisherId)).toEqual(["openalex", "publishers", publisherId]);
		});

		it("should return funder query key", () => {
			const funderId = "F123456789";
			expect(getEntityQueryKey("funder", funderId)).toEqual(["openalex", "funders", funderId]);
		});

		it("should throw error for unknown entity type", () => {
			expect(() => getEntityQueryKey("unknown" as any, "ID123")).toThrow("Unknown entity type: unknown");
		});
	});
});

describe("Related Entity Query Keys Helper", () => {
	describe("getRelatedEntityQueryKeys", () => {
		it("should return work related query keys", () => {
			const workId = "W123456789";
			const result = getRelatedEntityQueryKeys("work", workId);

			expect(result).toEqual({
				citations: ["openalex", "works", workId, "citations", undefined],
				references: ["openalex", "works", workId, "references", undefined],
				related: ["openalex", "works", workId, "related", undefined],
			});
		});

		it("should return author related query keys", () => {
			const authorId = "A123456789";
			const result = getRelatedEntityQueryKeys("author", authorId);

			expect(result).toEqual({
				works: ["openalex", "authors", authorId, "works", undefined],
				coauthors: ["openalex", "authors", authorId, "coauthors", undefined],
				institutions: ["openalex", "authors", authorId, "institutions"],
			});
		});

		it("should return source related query keys", () => {
			const sourceId = "S123456789";
			const result = getRelatedEntityQueryKeys("source", sourceId);

			expect(result).toEqual({
				works: ["openalex", "sources", sourceId, "works", undefined],
				authors: ["openalex", "sources", sourceId, "authors", undefined],
			});
		});

		it("should return institution related query keys", () => {
			const institutionId = "I123456789";
			const result = getRelatedEntityQueryKeys("institution", institutionId);

			expect(result).toEqual({
				works: ["openalex", "institutions", institutionId, "works", undefined],
				authors: ["openalex", "institutions", institutionId, "authors", undefined],
			});
		});

		it("should return topic related query keys", () => {
			const topicId = "T123456789";
			const result = getRelatedEntityQueryKeys("topic", topicId);

			expect(result).toEqual({
				works: ["openalex", "topics", topicId, "works", undefined],
			});
		});

		it("should return empty object for unsupported entity types", () => {
			expect(getRelatedEntityQueryKeys("publisher", "P123456789")).toEqual({});
			expect(getRelatedEntityQueryKeys("funder", "F123456789")).toEqual({});
		});

		it("should return empty object for unknown entity type", () => {
			expect(getRelatedEntityQueryKeys("unknown" as any, "ID123")).toEqual({});
		});
	});
});

describe("Type Safety", () => {
	it("should maintain readonly tuple types", () => {
		const workKey = queryKeys.work("W123");
		const authorsKey = queryKeys.authors();

		// TypeScript should infer these as readonly tuple types
		expect(workKey).toBeInstanceOf(Array);
		expect(authorsKey).toBeInstanceOf(Array);

		// Verify immutability by checking they can't be modified
		expect(() => {
			// @ts-expect-error - This should fail in TypeScript
			workKey[0] = "modified";
		}).not.toThrow(); // Runtime doesn't prevent this, but TS should catch it
	});

	it("should handle complex parameter objects", () => {
		const complexParams = {
			filter: "publication_year:>2020,is_oa:true",
			sort: "cited_by_count:desc",
			per_page: 100,
			page: 2,
			select: ["id", "title", "publication_year"],
			nested: {
				deep: {
					value: "test"
				}
			}
		};

		const workCitationsKey = queryKeys.workCitations("W123", complexParams);
		expect(workCitationsKey).toEqual([
			"openalex", "works", "W123", "citations", complexParams
		]);

		// Verify the parameter object is preserved as-is
		expect(workCitationsKey[4]).toBe(complexParams);
	});

	it("should handle edge cases with empty and special values", () => {
		// Empty string IDs
		expect(queryKeys.work("")).toEqual(["openalex", "works", ""]);

		// Special characters in IDs
		expect(queryKeys.author("A123-456_789")).toEqual(["openalex", "authors", "A123-456_789"]);

		// Empty parameter objects
		expect(queryKeys.searchWorks("test", {})).toEqual([
			"openalex", "works", "search", { query: "test", filters: {} }
		]);

		// Null/undefined handling
		expect(queryKeys.workCitations("W123", undefined)).toEqual([
			"openalex", "works", "W123", "citations", undefined
		]);
	});
});