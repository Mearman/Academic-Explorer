/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
	isWork,
	isAuthor,
	isInstitution,
	isSource,
	isTopic,
	isConcept,
	isPublisher,
	isFunder,
	isKeyword,
	getEntityType,
	hasProperty
} from "./type-guards";
import type { Work, Author, InstitutionEntity, Source, Topic, Concept, Publisher, Funder, Keyword } from "./types";

describe("OpenAlex Type Guards", () => {
	describe("isWork", () => {
		it("should correctly identify Work entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: [],
				primary_location: undefined,
				publication_year: 2023
			};

			expect(isWork(work as Work)).toBe(true);
		});

		it("should return false for non-Work entities", () => {
			const author: Partial<Author> = {
				id: "A123",
				display_name: "Test Author",
				affiliations: [],
				works_count: 10
			};

			expect(isWork(author as Author)).toBe(false);
		});

		it("should return false for entities missing required Work properties", () => {
			const incompleteWork = {
				id: "W123",
				display_name: "Test Work",
				// Missing authorships, locations, primary_location, publication_year
			};

			expect(isWork(incompleteWork as Work)).toBe(false);
		});
	});

	describe("isAuthor", () => {
		it("should correctly identify Author entities", () => {
			const author: Partial<Author> = {
				id: "A123",
				display_name: "Test Author",
				affiliations: [],
				works_count: 10,
				last_known_institutions: [],
				orcid: undefined
			};

			expect(isAuthor(author as Author)).toBe(true);
		});

		it("should return false for non-Author entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isAuthor(work as Work)).toBe(false);
		});

		it("should return false for entities missing required Author properties", () => {
			const incompleteAuthor = {
				id: "A123",
				display_name: "Test Author",
				// Missing affiliations, works_count, last_known_institutions, orcid
			};

			expect(isAuthor(incompleteAuthor as Author)).toBe(false);
		});
	});

	describe("isInstitution", () => {
		it("should correctly identify Institution entities", () => {
			const institution: Partial<InstitutionEntity> = {
				id: "I123",
				display_name: "Test Institution",
				geo: { country_code: "US", city: "Test City" },
				country_code: "US",
				works_count: 100,
				ror: undefined
			};

			expect(isInstitution(institution as InstitutionEntity)).toBe(true);
		});

		it("should return false for non-Institution entities", () => {
			const author: Partial<Author> = {
				id: "A123",
				display_name: "Test Author",
				affiliations: [],
				works_count: 10
			};

			expect(isInstitution(author as Author)).toBe(false);
		});

		it("should return false for entities missing required Institution properties", () => {
			const incompleteInstitution = {
				id: "I123",
				display_name: "Test Institution",
				// Missing geo, country_code, works_count, ror
			};

			expect(isInstitution(incompleteInstitution as InstitutionEntity)).toBe(false);
		});
	});

	describe("isSource", () => {
		it("should correctly identify Source entities", () => {
			const source: Partial<Source> = {
				id: "S123",
				display_name: "Test Source",
				issn_l: "1234-5678",
				host_organization: "P123",
				abbreviated_title: "Test"
			};

			expect(isSource(source as Source)).toBe(true);
		});

		it("should return false for non-Source entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isSource(work as Work)).toBe(false);
		});
	});

	describe("isTopic", () => {
		it("should correctly identify Topic entities", () => {
			const topic: Partial<Topic> = {
				id: "T123",
				display_name: "Test Topic",
				subfield: { id: "SF123", display_name: "Test Subfield" },
				field: { id: "F123", display_name: "Test Field" },
				domain: { id: "D123", display_name: "Test Domain" },
				works_count: 50,
				cited_by_count: 100
			};

			expect(isTopic(topic as Topic)).toBe(true);
		});

		it("should return false for non-Topic entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isTopic(work as Work)).toBe(false);
		});
	});

	describe("isPublisher", () => {
		it("should correctly identify Publisher entities", () => {
			const publisher: Partial<Publisher> = {
				id: "P123",
				display_name: "Test Publisher",
				parent_publisher: null,
				sources_api_url: "https://api.example.com",
				hierarchy_level: 0
			};

			expect(isPublisher(publisher as Publisher)).toBe(true);
		});

		it("should return false for non-Publisher entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isPublisher(work as Work)).toBe(false);
		});
	});

	describe("isConcept", () => {
		it("should correctly identify Concept entities", () => {
			const concept: Partial<Concept> = {
				id: "C123",
				display_name: "Test Concept",
				level: 2,
				ancestors: [],
				related_concepts: [],
				international: { display_name: {} },
				works_count: 50,
				cited_by_count: 100
			};

			expect(isConcept(concept as Concept)).toBe(true);
		});

		it("should return false for non-Concept entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isConcept(work as Work)).toBe(false);
		});

		it("should return false for entities missing required Concept properties", () => {
			const incompleteConcept = {
				id: "C123",
				display_name: "Test Concept",
				works_count: 50
				// Missing level, ancestors, related_concepts, international, cited_by_count
			};

			expect(isConcept(incompleteConcept as Concept)).toBe(false);
		});
	});

	describe("isFunder", () => {
		it("should correctly identify Funder entities", () => {
			const funder: Partial<Funder> = {
				id: "F123",
				display_name: "Test Funder",
				grants_count: 25,
				works_count: 100,
				country_code: "US",
				homepage_url: "https://example.com"
			};

			expect(isFunder(funder as Funder)).toBe(true);
		});

		it("should return false for non-Funder entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isFunder(work as Work)).toBe(false);
		});
	});

	describe("isKeyword", () => {
		it("should correctly identify Keyword entities", () => {
			const keyword: Partial<Keyword> = {
				id: "K123",
				display_name: "Test Keyword",
				keywords: ["test", "keyword"],
				works_count: 25,
				cited_by_count: 50,
				works_api_url: "https://api.example.com"
			};

			expect(isKeyword(keyword as Keyword)).toBe(true);
		});

		it("should return false for Topic entities (which also have keywords)", () => {
			const topic: Partial<Topic> = {
				id: "T123",
				display_name: "Test Topic",
				keywords: ["test", "topic"],
				subfield: { id: "SF123", display_name: "Test Subfield" },
				field: { id: "F123", display_name: "Test Field" },
				domain: { id: "D123", display_name: "Test Domain" },
				works_count: 50,
				cited_by_count: 100
			};

			expect(isKeyword(topic as Topic)).toBe(false);
		});

		it("should return false for non-Keyword entities", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: []
			};

			expect(isKeyword(work as Work)).toBe(false);
		});
	});

	describe("getEntityType", () => {
		it("should return correct entity type for Work", () => {
			const work: Partial<Work> = {
				id: "W123",
				display_name: "Test Work",
				authorships: [],
				locations: [],
				primary_location: undefined,
				publication_year: 2023
			};

			expect(getEntityType(work as Work)).toBe("works");
		});

		it("should return correct entity type for Author", () => {
			const author: Partial<Author> = {
				id: "A123",
				display_name: "Test Author",
				affiliations: [],
				works_count: 10,
				last_known_institutions: [],
				orcid: undefined
			};

			expect(getEntityType(author as Author)).toBe("authors");
		});

		it("should return correct entity type for Institution", () => {
			const institution: Partial<InstitutionEntity> = {
				id: "I123",
				display_name: "Test Institution",
				geo: { country_code: "US", city: "Test City" },
				country_code: "US",
				works_count: 100,
				ror: undefined
			};

			expect(getEntityType(institution as InstitutionEntity)).toBe("institutions");
		});

		it("should return correct entity type for Source", () => {
			const source: Partial<Source> = {
				id: "S123",
				display_name: "Test Source",
				issn_l: "1234-5678",
				host_organization: "P123",
				abbreviated_title: "Test"
			};

			expect(getEntityType(source as Source)).toBe("sources");
		});

		it("should return correct entity type for Topic", () => {
			const topic: Partial<Topic> = {
				id: "T123",
				display_name: "Test Topic",
				subfield: { id: "SF123", display_name: "Test Subfield" },
				field: { id: "F123", display_name: "Test Field" },
				domain: { id: "D123", display_name: "Test Domain" },
				works_count: 50,
				cited_by_count: 100
			};

			expect(getEntityType(topic as Topic)).toBe("topics");
		});

		it("should return correct entity type for Concept", () => {
			const concept: Partial<Concept> = {
				id: "C123",
				display_name: "Test Concept",
				level: 2,
				ancestors: [],
				related_concepts: [],
				international: { display_name: {} },
				works_count: 50,
				cited_by_count: 100
			};

			expect(getEntityType(concept as Concept)).toBe("concepts");
		});

		it("should return correct entity type for Publisher", () => {
			const publisher: Partial<Publisher> = {
				id: "P123",
				display_name: "Test Publisher",
				parent_publisher: null,
				sources_api_url: "https://api.example.com",
				hierarchy_level: 0
			};

			expect(getEntityType(publisher as Publisher)).toBe("publishers");
		});

		it("should return correct entity type for Funder", () => {
			const funder: Partial<Funder> = {
				id: "F123",
				display_name: "Test Funder",
				grants_count: 25,
				works_count: 100,
				country_code: "US",
				homepage_url: "https://example.com"
			};

			expect(getEntityType(funder as Funder)).toBe("funders");
		});

		it("should return correct entity type for Keyword", () => {
			const keyword: Partial<Keyword> = {
				id: "K123",
				display_name: "Test Keyword",
				keywords: ["test", "keyword"],
				works_count: 25,
				cited_by_count: 50,
				works_api_url: "https://api.example.com"
			};

			expect(getEntityType(keyword as Keyword)).toBe("keywords");
		});

		it('should return "unknown" for unrecognized entities', () => {
			const unknownEntity = {
				id: "X123",
				display_name: "Unknown Entity"
			};

			expect(getEntityType(unknownEntity as any)).toBe("unknown");
		});
	});

	describe("hasProperty", () => {
		it("should return true when entity has the specified property", () => {
			const entity = {
				id: "E123",
				display_name: "Test Entity",
				custom_property: "value"
			};

			expect(hasProperty(entity as any, "custom_property")).toBe(true);
			expect(hasProperty(entity as any, "display_name")).toBe(true);
		});

		it("should return false when entity does not have the specified property", () => {
			const entity = {
				id: "E123",
				display_name: "Test Entity"
			};

			expect(hasProperty(entity as any, "missing_property")).toBe(false);
		});

		it("should provide proper type narrowing", () => {
			const entity = {
				id: "E123",
				display_name: "Test Entity",
				works_count: 42
			};

			if (hasProperty(entity as any, "works_count")) {
				// TypeScript should recognize that entity now has works_count property
				expect(typeof entity.works_count).toBe("number");
				expect(entity.works_count).toBe(42);
			}
		});
	});

	describe("Type guard edge cases", () => {
		it("should handle null and undefined entities", () => {
			expect(isWork(null as any)).toBe(false);
			expect(isWork(undefined as any)).toBe(false);
			expect(isAuthor(null as any)).toBe(false);
			expect(isInstitution(undefined as any)).toBe(false);
		});

		it("should handle empty objects", () => {
			const emptyObject = {};

			expect(isWork(emptyObject as any)).toBe(false);
			expect(isAuthor(emptyObject as any)).toBe(false);
			expect(isInstitution(emptyObject as any)).toBe(false);
			expect(isSource(emptyObject as any)).toBe(false);
			expect(isTopic(emptyObject as any)).toBe(false);
			expect(isConcept(emptyObject as any)).toBe(false);
			expect(isPublisher(emptyObject as any)).toBe(false);
			expect(isFunder(emptyObject as any)).toBe(false);
			expect(isKeyword(emptyObject as any)).toBe(false);
		});

		it("should handle entities with partial properties", () => {
			const partialWork = {
				id: "W123",
				display_name: "Test Work",
				authorships: []
				// Missing locations, primary_location, publication_year
			};

			expect(isWork(partialWork as any)).toBe(false);
		});
	});
});