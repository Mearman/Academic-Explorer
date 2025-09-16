/**
 * Unit tests for entity detection utilities
 * Tests entity type detection from OpenAlex IDs and entity data structures
 */

import { describe, it, expect } from "vitest";
import { detectEntityType } from "./entity-detection";
import type { Work, Author, Source, InstitutionEntity } from "@/lib/openalex/types";

describe("detectEntityType", () => {
	describe("string ID detection", () => {
		describe("full OpenAlex URLs", () => {
			it("should detect works from full OpenAlex URL", () => {
				expect(detectEntityType("https://openalex.org/W2741809807")).toBe("works");
			});

			it("should detect authors from full OpenAlex URL", () => {
				expect(detectEntityType("https://openalex.org/A5017898742")).toBe("authors");
			});

			it("should detect sources from full OpenAlex URL", () => {
				expect(detectEntityType("https://openalex.org/S2741809807")).toBe("sources");
			});

			it("should detect institutions from full OpenAlex URL", () => {
				expect(detectEntityType("https://openalex.org/I123456789")).toBe("institutions");
			});

			it("should detect topics from full OpenAlex URL", () => {
				expect(detectEntityType("https://openalex.org/T11088")).toBe("topics");
			});

			it("should detect publishers from full OpenAlex URL", () => {
				expect(detectEntityType("https://openalex.org/P4310320990")).toBe("publishers");
			});

			it("should handle URLs with different length numeric IDs", () => {
				expect(detectEntityType("https://openalex.org/W1")).toBe("works");
				expect(detectEntityType("https://openalex.org/A12345")).toBe("authors");
				expect(detectEntityType("https://openalex.org/S1234567890123")).toBe("sources");
			});
		});

		describe("bare IDs", () => {
			it("should detect works from bare ID", () => {
				expect(detectEntityType("W2741809807")).toBe("works");
			});

			it("should detect authors from bare ID", () => {
				expect(detectEntityType("A5017898742")).toBe("authors");
			});

			it("should detect sources from bare ID", () => {
				expect(detectEntityType("S2741809807")).toBe("sources");
			});

			it("should detect institutions from bare ID", () => {
				expect(detectEntityType("I123456789")).toBe("institutions");
			});

			it("should detect topics from bare ID", () => {
				expect(detectEntityType("T11088")).toBe("topics");
			});

			it("should detect publishers from bare ID", () => {
				expect(detectEntityType("P4310320990")).toBe("publishers");
			});

			it("should handle bare IDs with different length numeric parts", () => {
				expect(detectEntityType("W1")).toBe("works");
				expect(detectEntityType("A12345")).toBe("authors");
				expect(detectEntityType("S1234567890123")).toBe("sources");
			});
		});

		describe("invalid string IDs", () => {
			it("should throw error for invalid OpenAlex URL format", () => {
				expect(() => detectEntityType("https://openalex.org/X123456789")).toThrow(
					"Cannot detect entity type from ID: https://openalex.org/X123456789"
				);
			});

			it("should throw error for invalid bare ID prefix", () => {
				expect(() => detectEntityType("X123456789")).toThrow(
					"Cannot detect entity type from ID: X123456789"
				);
			});

			it("should throw error for missing numeric part in bare ID", () => {
				expect(() => detectEntityType("W")).toThrow(
					"Cannot detect entity type from ID: W"
				);
			});

			it("should throw error for ID without numeric part", () => {
				expect(() => detectEntityType("WABC")).toThrow(
					"Cannot detect entity type from ID: WABC"
				);
			});

			it("should throw error for completely invalid URL", () => {
				expect(() => detectEntityType("https://example.com/W123")).toThrow(
					"Cannot detect entity type from ID: https://example.com/W123"
				);
			});

			it("should throw error for empty string", () => {
				expect(() => detectEntityType("")).toThrow(
					"Cannot detect entity type from ID: "
				);
			});

			it("should throw error for random string", () => {
				expect(() => detectEntityType("invalid-id")).toThrow(
					"Cannot detect entity type from ID: invalid-id"
				);
			});

			it("should throw error for numeric-only string", () => {
				expect(() => detectEntityType("123456789")).toThrow(
					"Cannot detect entity type from ID: 123456789"
				);
			});

			it("should throw error for malformed OpenAlex URL", () => {
				expect(() => detectEntityType("https://openalex.org/123456789")).toThrow(
					"Cannot detect entity type from ID: https://openalex.org/123456789"
				);
			});

			it("should throw error for case-sensitive prefix mismatch", () => {
				expect(() => detectEntityType("w123456789")).toThrow(
					"Cannot detect entity type from ID: w123456789"
				);
			});
		});

		describe("edge cases", () => {
			it("should handle very large numeric IDs", () => {
				expect(detectEntityType("W99999999999999999999")).toBe("works");
			});

			it("should handle minimal valid IDs", () => {
				expect(detectEntityType("W0")).toBe("works");
				expect(detectEntityType("A0")).toBe("authors");
			});

			it("should handle IDs with leading zeros", () => {
				expect(detectEntityType("W000123")).toBe("works");
				expect(detectEntityType("https://openalex.org/A000456")).toBe("authors");
			});
		});
	});

	describe("entity data detection", () => {
		describe("Work entities", () => {
			it("should detect works from entity with authorships field", () => {
				const workEntity: Partial<Work> = {
					id: "https://openalex.org/W123",
					display_name: "Test Work",
					authorships: []
				};
				expect(detectEntityType(workEntity as Work)).toBe("works");
			});

			it("should detect works even with empty authorships", () => {
				const workEntity: Partial<Work> = {
					id: "https://openalex.org/W123",
					display_name: "Test Work",
					authorships: []
				};
				expect(detectEntityType(workEntity as Work)).toBe("works");
			});

			it("should detect works with populated authorships", () => {
				const workEntity: Partial<Work> = {
					id: "https://openalex.org/W123",
					display_name: "Test Work",
					authorships: [
						{
							author_position: "first",
							author: {
								id: "https://openalex.org/A123",
								display_name: "Test Author",
								orcid: null
							},
							institutions: [],
							countries: [],
							is_corresponding: false,
							raw_author_name: "Test Author",
							raw_affiliation_strings: []
						}
					]
				};
				expect(detectEntityType(workEntity as Work)).toBe("works");
			});
		});

		describe("Author entities", () => {
			it("should detect authors from entity with works_count and orcid fields", () => {
				const authorEntity: Partial<Author> = {
					id: "https://openalex.org/A123",
					display_name: "Test Author",
					works_count: 10,
					orcid: "https://orcid.org/0000-0000-0000-0000"
				};
				expect(detectEntityType(authorEntity as Author)).toBe("authors");
			});

			it("should detect authors with null orcid", () => {
				const authorEntity: Partial<Author> = {
					id: "https://openalex.org/A123",
					display_name: "Test Author",
					works_count: 5,
					orcid: null
				};
				expect(detectEntityType(authorEntity as Author)).toBe("authors");
			});

			it("should detect authors with zero works_count", () => {
				const authorEntity: Partial<Author> = {
					id: "https://openalex.org/A123",
					display_name: "Test Author",
					works_count: 0,
					orcid: null
				};
				expect(detectEntityType(authorEntity as Author)).toBe("authors");
			});
		});

		describe("Source entities", () => {
			it("should detect sources from entity with issn_l field", () => {
				const sourceEntity: Partial<Source> = {
					id: "https://openalex.org/S123",
					display_name: "Test Journal",
					issn_l: "1234-5678"
				};
				expect(detectEntityType(sourceEntity as Source)).toBe("sources");
			});

			it("should detect sources with null issn_l", () => {
				const sourceEntity: Partial<Source> = {
					id: "https://openalex.org/S123",
					display_name: "Test Journal",
					issn_l: null
				};
				expect(detectEntityType(sourceEntity as Source)).toBe("sources");
			});
		});

		describe("Institution entities", () => {
			it("should detect institutions from entity with ror field", () => {
				const institutionEntity: Partial<InstitutionEntity> = {
					id: "https://openalex.org/I123",
					display_name: "Test University",
					ror: "https://ror.org/123456"
				};
				expect(detectEntityType(institutionEntity as InstitutionEntity)).toBe("institutions");
			});

			it("should detect institutions with null ror", () => {
				const institutionEntity: Partial<InstitutionEntity> = {
					id: "https://openalex.org/I123",
					display_name: "Test University",
					ror: null
				};
				expect(detectEntityType(institutionEntity as InstitutionEntity)).toBe("institutions");
			});
		});

		describe("ambiguous entities", () => {
			it("should prioritize works detection over authors when both fields present", () => {
				const ambiguousEntity = {
					id: "https://openalex.org/W123",
					display_name: "Test",
					authorships: [], // Works indicator
					works_count: 5,  // Authors indicator
					orcid: null      // Authors indicator
				};
				expect(detectEntityType(ambiguousEntity as any)).toBe("works");
			});

			it("should detect authors when works_count and orcid present but no authorships", () => {
				const authorLikeEntity = {
					id: "https://openalex.org/A123",
					display_name: "Test Author",
					works_count: 5,
					orcid: null
				};
				expect(detectEntityType(authorLikeEntity as any)).toBe("authors");
			});

			it("should detect sources when issn_l present with other fields", () => {
				const sourceWithOtherFields = {
					id: "https://openalex.org/S123",
					display_name: "Test Journal",
					issn_l: "1234-5678",
					works_count: 100 // Could be confused with authors
				};
				expect(detectEntityType(sourceWithOtherFields as any)).toBe("sources");
			});
		});

		describe("invalid entity data", () => {
			it("should throw error for entity with no identifying fields", () => {
				const unknownEntity = {
					id: "https://openalex.org/X123",
					display_name: "Unknown Entity"
				};
				expect(() => detectEntityType(unknownEntity as any)).toThrow(
					"Cannot detect entity type from entity data"
				);
			});

			it("should throw error for empty object", () => {
				expect(() => detectEntityType({} as any)).toThrow(
					"Cannot detect entity type from entity data"
				);
			});

			it("should throw error for entity with only id and display_name", () => {
				const minimalEntity = {
					id: "test",
					display_name: "Test"
				};
				expect(() => detectEntityType(minimalEntity as any)).toThrow(
					"Cannot detect entity type from entity data"
				);
			});

			it("should throw error for entity with irrelevant fields", () => {
				const irrelevantEntity = {
					id: "test",
					display_name: "Test",
					some_other_field: "value",
					random_data: 123
				};
				expect(() => detectEntityType(irrelevantEntity as any)).toThrow(
					"Cannot detect entity type from entity data"
				);
			});
		});
	});

	describe("type consistency", () => {
		it("should return consistent results for same ID in different formats", () => {
			const fullUrl = "https://openalex.org/W123456789";
			const bareId = "W123456789";

			expect(detectEntityType(fullUrl)).toBe("works");
			expect(detectEntityType(bareId)).toBe("works");
			expect(detectEntityType(fullUrl)).toBe(detectEntityType(bareId));
		});

		it("should handle all supported entity types consistently", () => {
			const entityPairs = [
				["https://openalex.org/W123", "W123", "works"],
				["https://openalex.org/A456", "A456", "authors"],
				["https://openalex.org/S789", "S789", "sources"],
				["https://openalex.org/I012", "I012", "institutions"],
				["https://openalex.org/T345", "T345", "topics"],
				["https://openalex.org/P678", "P678", "publishers"]
			] as const;

			for (const [fullUrl, bareId, expectedType] of entityPairs) {
				expect(detectEntityType(fullUrl)).toBe(expectedType);
				expect(detectEntityType(bareId)).toBe(expectedType);
			}
		});
	});

	describe("performance and edge cases", () => {
		it("should handle null input gracefully", () => {
			expect(() => detectEntityType(null as any)).toThrow();
		});

		it("should handle undefined input gracefully", () => {
			expect(() => detectEntityType(undefined as any)).toThrow();
		});

		it("should handle numeric input gracefully", () => {
			expect(() => detectEntityType(123 as any)).toThrow();
		});

		it("should handle boolean input gracefully", () => {
			expect(() => detectEntityType(true as any)).toThrow();
		});

		it("should handle array input gracefully", () => {
			expect(() => detectEntityType([] as any)).toThrow();
		});

		it("should be case-sensitive for entity prefixes", () => {
			expect(() => detectEntityType("w123456789")).toThrow();
			expect(() => detectEntityType("a123456789")).toThrow();
			expect(() => detectEntityType("s123456789")).toThrow();
		});
	});
});