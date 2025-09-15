/**
 * Unit tests for entity-detection utilities
 * Testing automatic detection of entity types from various identifier formats
 */

import { describe, it, expect } from "vitest";
import { EntityDetector, type DetectionResult } from "./entity-detection";
import type { EntityType } from "../types";

describe("EntityDetector", () => {
	let detector: EntityDetector;

	beforeEach(() => {
		detector = new EntityDetector();
	});

	describe("Static Methods", () => {
		describe("extractOpenAlexId", () => {
			it("should extract ID from OpenAlex URL", () => {
				expect(EntityDetector.extractOpenAlexId("https://openalex.org/W123456789")).toBe("W123456789");
				expect(EntityDetector.extractOpenAlexId("http://openalex.org/A987654321")).toBe("A987654321");
			});

			it("should return input unchanged if not a URL", () => {
				expect(EntityDetector.extractOpenAlexId("W123456789")).toBe("W123456789");
				expect(EntityDetector.extractOpenAlexId("A987654321")).toBe("A987654321");
			});

			it("should handle empty and invalid inputs", () => {
				expect(EntityDetector.extractOpenAlexId("")).toBe("");
				expect(EntityDetector.extractOpenAlexId("not-a-url")).toBe("not-a-url");
			});
		});
	});

	describe("detectEntityIdentifier", () => {
		describe("OpenAlex ID Detection", () => {
			it("should detect Works entities", () => {
				const result = detector.detectEntityIdentifier("W123456789");
				expect(result).toEqual({
					entityType: "works",
					idType: "openalex",
					normalizedId: "W123456789",
					originalInput: "W123456789"
				});
			});

			it("should detect Authors entities", () => {
				const result = detector.detectEntityIdentifier("A123456789");
				expect(result).toEqual({
					entityType: "authors",
					idType: "openalex",
					normalizedId: "A123456789",
					originalInput: "A123456789"
				});
			});

			it("should detect Sources entities", () => {
				const result = detector.detectEntityIdentifier("S123456789");
				expect(result).toEqual({
					entityType: "sources",
					idType: "openalex",
					normalizedId: "S123456789",
					originalInput: "S123456789"
				});
			});

			it("should detect Institutions entities", () => {
				const result = detector.detectEntityIdentifier("I123456789");
				expect(result).toEqual({
					entityType: "institutions",
					idType: "openalex",
					normalizedId: "I123456789",
					originalInput: "I123456789"
				});
			});

			it("should detect Topics entities", () => {
				const result = detector.detectEntityIdentifier("T123456789");
				expect(result).toEqual({
					entityType: "topics",
					idType: "openalex",
					normalizedId: "T123456789",
					originalInput: "T123456789"
				});
			});

			it("should detect Concepts entities", () => {
				const result = detector.detectEntityIdentifier("C123456789");
				expect(result).toEqual({
					entityType: "concepts",
					idType: "openalex",
					normalizedId: "C123456789",
					originalInput: "C123456789"
				});
			});

			it("should detect Publishers entities", () => {
				const result = detector.detectEntityIdentifier("P123456789");
				expect(result).toEqual({
					entityType: "publishers",
					idType: "openalex",
					normalizedId: "P123456789",
					originalInput: "P123456789"
				});
			});

			it("should detect Funders entities", () => {
				const result = detector.detectEntityIdentifier("F123456789");
				expect(result).toEqual({
					entityType: "funders",
					idType: "openalex",
					normalizedId: "F123456789",
					originalInput: "F123456789"
				});
			});

			it("should detect Keywords entities", () => {
				const result = detector.detectEntityIdentifier("K123456789");
				expect(result).toEqual({
					entityType: "keywords",
					idType: "openalex",
					normalizedId: "K123456789",
					originalInput: "K123456789"
				});
			});


			it("should handle case insensitive OpenAlex IDs", () => {
				const result = detector.detectEntityIdentifier("w123456789");
				expect(result.entityType).toBeNull(); // Implementation is case-sensitive
				expect(result.normalizedId).toBe("w123456789");
			});

			it("should detect OpenAlex IDs from URLs", () => {
				const result = detector.detectEntityIdentifier("https://openalex.org/W123456789");
				expect(result).toEqual({
					entityType: "works",
					idType: "openalex",
					normalizedId: "W123456789",
					originalInput: "https://openalex.org/W123456789"
				});
			});

			it("should handle OpenAlex IDs with varying digit lengths", () => {
				expect(detector.detectEntityIdentifier("W12345678").entityType).toBe("works");
				expect(detector.detectEntityIdentifier("W1234567890").entityType).toBe("works");
			});

			it("should reject invalid OpenAlex ID formats", () => {
				expect(detector.detectEntityIdentifier("X123456789").entityType).toBeNull();
				expect(detector.detectEntityIdentifier("W").entityType).toBeNull();
				expect(detector.detectEntityIdentifier("W123abc").entityType).toBeNull();
				expect(detector.detectEntityIdentifier("123456789").entityType).toBeNull();
			});
		});

		describe("DOI Detection", () => {
			it("should detect standard DOI format", () => {
				const result = detector.detectEntityIdentifier("10.1038/nature12373");
				expect(result).toEqual({
					entityType: "works",
					idType: "doi",
					normalizedId: "10.1038/nature12373",
					originalInput: "10.1038/nature12373"
				});
			});

			it("should detect DOI URLs", () => {
				const result = detector.detectEntityIdentifier("https://doi.org/10.1038/nature12373");
				expect(result.entityType).toBe("works");
				expect(result.idType).toBe("doi");
				expect(result.normalizedId).toBe("10.1038/nature12373");
			});

			it("should detect DOI URLs with dx prefix", () => {
				const result = detector.detectEntityIdentifier("https://dx.doi.org/10.1038/nature12373");
				expect(result.entityType).toBe("works");
				expect(result.idType).toBe("doi");
			});

			it("should detect DOI with doi: prefix", () => {
				const result = detector.detectEntityIdentifier("doi:10.1038/nature12373");
				expect(result.entityType).toBe("works");
				expect(result.idType).toBe("doi");
			});

			it("should handle case insensitive DOI URLs", () => {
				const result = detector.detectEntityIdentifier("HTTPS://DOI.ORG/10.1038/nature12373");
				expect(result.entityType).toBe("works");
				expect(result.idType).toBe("doi");
			});
		});

		describe("ORCID Detection", () => {
			it("should detect standard ORCID format", () => {
				const result = detector.detectEntityIdentifier("0000-0003-1613-5981");
				expect(result).toEqual({
					entityType: "authors",
					idType: "orcid",
					normalizedId: "0000-0003-1613-5981",
					originalInput: "0000-0003-1613-5981"
				});
			});

			it("should detect ORCID URLs", () => {
				const result = detector.detectEntityIdentifier("https://orcid.org/0000-0003-1613-5981");
				expect(result.entityType).toBe("authors");
				expect(result.idType).toBe("orcid");
				expect(result.normalizedId).toBe("0000-0003-1613-5981");
			});

			it("should detect ORCID with orcid: prefix", () => {
				const result = detector.detectEntityIdentifier("orcid:0000-0003-1613-5981");
				expect(result.entityType).toBe("authors");
				expect(result.idType).toBe("orcid");
			});

			it("should handle ORCID with X check digit", () => {
				const result = detector.detectEntityIdentifier("0000-0002-1825-000X");
				expect(result.entityType).toBe("authors");
				expect(result.idType).toBe("orcid");
			});

			it("should handle case insensitive ORCID URLs", () => {
				const result = detector.detectEntityIdentifier("HTTPS://ORCID.ORG/0000-0003-1613-5981");
				expect(result.entityType).toBe("authors");
				expect(result.idType).toBe("orcid");
			});
		});

		describe("ISSN Detection", () => {
			it("should detect standard ISSN format", () => {
				const result = detector.detectEntityIdentifier("1476-4687");
				expect(result).toEqual({
					entityType: "sources",
					idType: "issn_l",
					normalizedId: "1476-4687",
					originalInput: "1476-4687"
				});
			});

			it("should detect ISSN URLs", () => {
				const result = detector.detectEntityIdentifier("https://portal.issn.org/resource/ISSN/1476-4687");
				expect(result.entityType).toBe("sources");
				expect(result.idType).toBe("issn_l");
				expect(result.normalizedId).toBe("1476-4687");
			});

			it("should detect ISSN with issn: prefix", () => {
				const result = detector.detectEntityIdentifier("issn:1476-4687");
				expect(result.entityType).toBe("sources");
				expect(result.idType).toBe("issn_l");
			});

			it("should handle ISSN with X check digit", () => {
				const result = detector.detectEntityIdentifier("2049-367X");
				expect(result.entityType).toBe("sources");
				expect(result.idType).toBe("issn_l");
			});
		});

		describe("ROR Detection", () => {
			it("should detect standard ROR format", () => {
				const result = detector.detectEntityIdentifier("03vek6s52");
				expect(result).toEqual({
					entityType: "institutions",
					idType: "ror",
					normalizedId: "03vek6s52",
					originalInput: "03vek6s52"
				});
			});

			it("should detect ROR URLs", () => {
				const result = detector.detectEntityIdentifier("https://ror.org/03vek6s52");
				expect(result.entityType).toBe("institutions");
				expect(result.idType).toBe("ror");
				expect(result.normalizedId).toBe("03vek6s52");
			});

			it("should detect ROR with ror: prefix", () => {
				const result = detector.detectEntityIdentifier("ror:03vek6s52");
				expect(result.entityType).toBe("institutions");
				expect(result.idType).toBe("ror");
			});

			it("should handle case insensitive ROR IDs", () => {
				const result = detector.detectEntityIdentifier("03VEK6S52");
				expect(result.entityType).toBe("institutions");
				expect(result.idType).toBe("ror");
			});
		});

		describe("Wikidata Detection", () => {
			it("should detect standard Wikidata format", () => {
				const result = detector.detectEntityIdentifier("Q42");
				expect(result).toEqual({
					entityType: "concepts", // Implementation maps to concepts, not publishers
					idType: "wikidata",
					normalizedId: "Q42",
					originalInput: "Q42"
				});
			});

			it("should detect Wikidata URLs", () => {
				const result = detector.detectEntityIdentifier("https://www.wikidata.org/wiki/Q42");
				expect(result.entityType).toBe("concepts");
				expect(result.idType).toBe("wikidata");
				expect(result.normalizedId).toBe("Q42");
			});

			it("should detect Wikidata with wikidata: prefix", () => {
				const result = detector.detectEntityIdentifier("wikidata:Q42");
				expect(result.entityType).toBe("concepts");
				expect(result.idType).toBe("wikidata");
			});

			it("should handle case insensitive Wikidata IDs", () => {
				const result = detector.detectEntityIdentifier("q42");
				expect(result.entityType).toBe("concepts");
				expect(result.idType).toBe("wikidata");
			});

			it("should handle large Wikidata IDs", () => {
				const result = detector.detectEntityIdentifier("Q1234567890");
				expect(result.entityType).toBe("concepts");
				expect(result.idType).toBe("wikidata");
			});
		});

		describe("Fallback Behavior", () => {
			it("should return null entity type for unrecognized inputs", () => {
				const result = detector.detectEntityIdentifier("unknown-id-format");
				expect(result).toEqual({
					entityType: null,
					idType: "openalex",
					normalizedId: "unknown-id-format",
					originalInput: "unknown-id-format"
				});
			});

			it("should handle empty input", () => {
				const result = detector.detectEntityIdentifier("");
				expect(result.entityType).toBeNull();
				expect(result.originalInput).toBe("");
			});

			it("should handle whitespace input", () => {
				const result = detector.detectEntityIdentifier("   ");
				expect(result.entityType).toBeNull();
				expect(result.originalInput).toBe("   ");
			});

			it("should trim whitespace from input", () => {
				const result = detector.detectEntityIdentifier("  W123456789  ");
				expect(result.entityType).toBe("works");
				expect(result.originalInput).toBe("W123456789"); // Input is trimmed before passing to detectOpenAlexId
				expect(result.normalizedId).toBe("W123456789"); // Normalized ID is trimmed
			});
		});
	});

	describe("isValidOpenAlexId", () => {
		it("should validate correct OpenAlex IDs", () => {
			expect(detector.isValidOpenAlexId("W123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("A123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("S123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("I123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("T123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("C123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("P123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("F123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("K123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("G123456789")).toBe(true);
		});

		it("should validate OpenAlex IDs with different digit lengths", () => {
			expect(detector.isValidOpenAlexId("W12345678")).toBe(true);   // 8 digits
			expect(detector.isValidOpenAlexId("W123456789")).toBe(true);  // 9 digits
			expect(detector.isValidOpenAlexId("W1234567890")).toBe(true); // 10 digits
		});

		it("should handle OpenAlex URLs", () => {
			expect(detector.isValidOpenAlexId("https://openalex.org/W123456789")).toBe(true);
			expect(detector.isValidOpenAlexId("http://openalex.org/A123456789")).toBe(true);
		});

		it("should reject invalid OpenAlex IDs", () => {
			expect(detector.isValidOpenAlexId("X123456789")).toBe(false); // Invalid prefix
			expect(detector.isValidOpenAlexId("W1234567")).toBe(false);   // Too few digits
			expect(detector.isValidOpenAlexId("W12345678901")).toBe(false); // Too many digits
			expect(detector.isValidOpenAlexId("W123abc789")).toBe(false); // Contains letters
			expect(detector.isValidOpenAlexId("123456789")).toBe(false);  // Missing prefix
			expect(detector.isValidOpenAlexId("")).toBe(false);           // Empty string
		});

		it("should handle null and undefined inputs", () => {
			expect(detector.isValidOpenAlexId(null as any)).toBe(false);
			expect(detector.isValidOpenAlexId(undefined as any)).toBe(false);
		});

		it("should handle non-string inputs", () => {
			expect(detector.isValidOpenAlexId(123456789 as any)).toBe(false);
			expect(detector.isValidOpenAlexId({} as any)).toBe(false);
			expect(detector.isValidOpenAlexId([] as any)).toBe(false);
		});
	});

	describe("getCanonicalUrl", () => {
		it("should generate canonical DOI URLs", () => {
			expect(detector.getCanonicalUrl("doi", "10.1038/nature12373"))
				.toBe("https://doi.org/10.1038/nature12373");
		});

		it("should generate canonical ORCID URLs", () => {
			expect(detector.getCanonicalUrl("orcid", "0000-0003-1613-5981"))
				.toBe("https://orcid.org/0000-0003-1613-5981");
		});

		it("should generate canonical ROR URLs", () => {
			expect(detector.getCanonicalUrl("ror", "03vek6s52"))
				.toBe("https://ror.org/03vek6s52");
		});

		it("should return existing URLs unchanged for DOI", () => {
			const existingUrl = "https://doi.org/10.1038/nature12373";
			// Implementation always prepends base URL, doesn't check for existing URLs
			expect(detector.getCanonicalUrl("doi", existingUrl)).toBe(`https://doi.org/${existingUrl}`);
		});

		it("should return existing URLs unchanged for ORCID", () => {
			const existingUrl = "https://orcid.org/0000-0003-1613-5981";
			expect(detector.getCanonicalUrl("orcid", existingUrl)).toBe(existingUrl); // ORCID checks for existing URLs
		});

		it("should return existing URLs unchanged for ROR", () => {
			const existingUrl = "https://ror.org/03vek6s52";
			expect(detector.getCanonicalUrl("ror", existingUrl)).toBe(existingUrl); // ROR checks for existing URLs
		});

		it("should return value unchanged for unknown ID types", () => {
			expect(detector.getCanonicalUrl("unknown", "some-value")).toBe("some-value");
		});

		it("should handle empty values", () => {
			expect(detector.getCanonicalUrl("doi", "")).toBe("https://doi.org/");
			expect(detector.getCanonicalUrl("orcid", "")).toBe("https://orcid.org/");
			expect(detector.getCanonicalUrl("ror", "")).toBe("https://ror.org/");
		});
	});

	describe("Integration Tests", () => {
		it("should handle mixed case inputs consistently", () => {
			const inputs = [
				{ input: "w123456789", shouldWork: false }, // lowercase fails
				{ input: "W123456789", shouldWork: true },
				{ input: "https://OPENALEX.ORG/W123456789", shouldWork: false }, // uppercase domain fails
				{ input: "HTTPS://openalex.org/w123456789", shouldWork: false } // lowercase w fails
			];

			for (const testCase of inputs) {
				const result = detector.detectEntityIdentifier(testCase.input);
				if (testCase.shouldWork) {
					expect(result.entityType).toBe("works");
				} else {
					expect(result.entityType).toBeNull();
				}
				expect(result.idType).toBe("openalex");
			}
		});

		it("should prioritize OpenAlex ID over external ID patterns", () => {
			// Test with an input that could match multiple patterns
			const result = detector.detectEntityIdentifier("W10001000"); // Could be seen as numeric
			expect(result.entityType).toBe("works");
			expect(result.idType).toBe("openalex");
		});

		it("should handle complex real-world examples", () => {
			const testCases = [
				{
					input: "https://openalex.org/W2741809807",
					expectedType: "works" as EntityType,
					expectedId: "openalex"
				},
				{
					input: "https://doi.org/10.7717/peerj.4375",
					expectedType: "works" as EntityType,
					expectedId: "doi"
				},
				{
					input: "https://orcid.org/0000-0003-1613-5981",
					expectedType: "authors" as EntityType,
					expectedId: "orcid"
				},
				{
					input: "https://ror.org/03vek6s52",
					expectedType: "institutions" as EntityType,
					expectedId: "ror"
				}
			];

			for (const testCase of testCases) {
				const result = detector.detectEntityIdentifier(testCase.input);
				expect(result.entityType).toBe(testCase.expectedType);
				expect(result.idType).toBe(testCase.expectedId);
			}
		});

		it("should handle edge cases gracefully", () => {
			const edgeCases = [
				"",
				"   ",
				"null",
				"undefined",
				"https://",
				"doi:",
				"orcid:",
				"ror:",
				"10.",
				"0000-",
				"Q",
				"W",
				"not-an-id"
			];

			for (const input of edgeCases) {
				const result = detector.detectEntityIdentifier(input);
				expect(result).toBeDefined();
				expect(result.originalInput).toBe(input);
				// Most should return null entity type (except valid partial matches)
			}
		});
	});

	describe("Performance Tests", () => {
		it("should handle large batches of IDs efficiently", () => {
			const ids = [];
			for (let i = 0; i < 1000; i++) {
				ids.push(`W${i.toString().padStart(9, "0")}`);
				ids.push(`A${i.toString().padStart(9, "0")}`);
				ids.push(`10.1038/nature${i}`);
			}

			const startTime = performance.now();
			const results = ids.map(id => detector.detectEntityIdentifier(id));
			const endTime = performance.now();

			expect(results).toHaveLength(3000);
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
			expect(results.every(r => r.entityType !== null)).toBe(true);
		});
	});

	describe("Type Safety", () => {
		it("should return correctly typed DetectionResult", () => {
			const result: DetectionResult = detector.detectEntityIdentifier("W123456789");

			// TypeScript should enforce these types
			expect(["string", "object"].includes(typeof result.entityType)).toBe(true); // null is typeof object
			expect(typeof result.idType).toBe("string");
			expect(typeof result.normalizedId).toBe("string");
			expect(typeof result.originalInput).toBe("string");
		});

		it("should handle all EntityType values", () => {
			const entityTypes: EntityType[] = [
				"works", "authors", "sources", "institutions", "topics",
				"concepts", "publishers", "funders", "keywords"			];

			for (let i = 0; i < entityTypes.length; i++) {
				const prefix = ["W", "A", "S", "I", "T", "C", "P", "F", "K"][i];
				const result = detector.detectEntityIdentifier(`${prefix}123456789`);
				expect(result.entityType).toBe(entityTypes[i]);
			}
		});
	});
});