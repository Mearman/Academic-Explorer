/**
 * Unit tests for OpenAlex data transformers
 */

import { describe, it, expect } from "vitest";
import {
	reconstructAbstract,
	getAbstractStats,
	hasAbstract,
	extractKeywords,
	formatCitation,
	analyzeReadability,
} from "./transformers";

describe("transformers", () => {
	describe("reconstructAbstract", () => {
		it("should reconstruct simple abstract from inverted index", () => {
			const invertedIndex = {
				"Machine": [0],
				"learning": [1],
				"is": [2],
				"powerful": [3],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("Machine learning is powerful");
		});

		it("should handle repeated words at different positions", () => {
			const invertedIndex = {
				"The": [0],
				"cat": [1, 5],
				"sat": [2],
				"on": [3],
				"the": [4],
				"mat": [6],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("The cat sat on the cat mat");
		});

		it("should handle gaps in position indices", () => {
			const invertedIndex = {
				"Hello": [0],
				"world": [2],
				"test": [5],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("Hello world test");
		});

		it("should handle complex academic abstract", () => {
			const invertedIndex = {
				"Machine": [0],
				"learning": [1, 15],
				"algorithms": [2],
				"have": [3],
				"shown": [4],
				"remarkable": [5],
				"success": [6],
				"in": [7],
				"various": [8],
				"domains": [9],
				"including": [10],
				"computer": [11],
				"vision": [12],
				"and": [13],
				"natural": [14],
				"processing": [16],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("Machine learning algorithms have shown remarkable success in various domains including computer vision and natural learning processing");
		});

		it("should return null for null input", () => {
			const result = reconstructAbstract(null);
			expect(result).toBeNull();
		});

		it("should return null for undefined input", () => {
			const result = reconstructAbstract(undefined);
			expect(result).toBeNull();
		});

		it("should return null for empty object", () => {
			const result = reconstructAbstract({});
			expect(result).toBeNull();
		});

		it("should handle invalid position arrays", () => {
			const invertedIndex = {
				"valid": [0],
				"invalid1": ["not a number" as unknown as number],
				"invalid2": [null as unknown as number],
				"invalid3": [undefined as unknown as number],
				"valid2": [1],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("valid valid2");
		});

		it("should handle negative positions gracefully", () => {
			const invertedIndex = {
				"word1": [0],
				"word2": [-1], // Invalid negative position
				"word3": [1],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("word1 word3");
		});

		it("should handle very large position indices", () => {
			const invertedIndex = {
				"start": [0],
				"middle": [1000],
				"end": [1001],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("start middle end");
		});

		it("should handle non-array position values", () => {
			const invertedIndex = {
				"word1": [0],
				"word2": "not an array" as unknown as number[],
				"word3": [1],
			};

			const result = reconstructAbstract(invertedIndex);
			expect(result).toBe("word1 word3");
		});
	});

	describe("getAbstractStats", () => {
		it("should calculate basic statistics for simple abstract", () => {
			const invertedIndex = {
				"hello": [0, 2], // appears twice
				"world": [1],
				"test": [3],
			};

			const stats = getAbstractStats(invertedIndex);
			expect(stats).toEqual({
				wordCount: 4, // hello appears twice + world + test
				uniqueWords: 3,
				avgWordLength: 4.75, // (5*2 + 5 + 4) / 4
				longestWord: "hello",
				shortestWord: "test",
			});
		});

		it("should return null for null input", () => {
			const result = getAbstractStats(null);
			expect(result).toBeNull();
		});

		it("should return null for undefined input", () => {
			const result = getAbstractStats(undefined);
			expect(result).toBeNull();
		});

		it("should return null for empty object", () => {
			const result = getAbstractStats({});
			expect(result).toBeNull();
		});

		it("should handle single word", () => {
			const invertedIndex = {
				"machine": [0, 1, 2], // appears 3 times
			};

			const stats = getAbstractStats(invertedIndex);
			expect(stats).toEqual({
				wordCount: 3,
				uniqueWords: 1,
				avgWordLength: 7, // 'machine' has 7 characters
				longestWord: "machine",
				shortestWord: "machine",
			});
		});

		it("should calculate stats for complex abstract", () => {
			const invertedIndex = {
				"AI": [0], // 2 chars
				"algorithms": [1], // 10 chars
				"are": [2], // 3 chars
				"powerful": [3], // 8 chars
			};

			const stats = getAbstractStats(invertedIndex);
			expect(stats).toEqual({
				wordCount: 4,
				uniqueWords: 4,
				avgWordLength: 5.75, // (2 + 10 + 3 + 8) / 4
				longestWord: "algorithms",
				shortestWord: "AI",
			});
		});
	});

	describe("hasAbstract", () => {
		it("should return true for work with valid abstract", () => {
			const work = {
				abstract_inverted_index: {
					"hello": [0],
					"world": [1],
				},
			};

			expect(hasAbstract(work)).toBe(true);
		});

		it("should return false for work without abstract", () => {
			const work = {};
			expect(hasAbstract(work)).toBe(false);
		});

		it("should return false for work with null abstract", () => {
			const work = {
				abstract_inverted_index: null,
			};

			expect(hasAbstract(work)).toBe(false);
		});

		it("should return false for work with empty abstract", () => {
			const work = {
				abstract_inverted_index: {},
			};

			expect(hasAbstract(work)).toBe(false);
		});

		it("should return false for work with non-object abstract", () => {
			const work = {
				abstract_inverted_index: "not an object" as unknown as Record<string, number[]>,
			};

			expect(hasAbstract(work)).toBe(false);
		});
	});

	describe("extractKeywords", () => {
		it("should extract keywords from simple text", () => {
			const abstract = "Machine learning algorithms are powerful tools for data analysis";

			const keywords = extractKeywords(abstract, { maxKeywords: 5 });

			// Should exclude common stop words like 'are', 'for'
			expect(keywords).toContain("machine");
			expect(keywords).toContain("learning");
			expect(keywords).toContain("algorithms");
			expect(keywords).toContain("powerful");
			expect(keywords).toContain("tools");
			// Removed 'data' and 'analysis' expectations since maxKeywords: 5 only returns 5 items
			expect(keywords.length).toBeLessThanOrEqual(5);
		});

		it("should handle null/empty input", () => {
			expect(extractKeywords(null)).toEqual([]);
			expect(extractKeywords("")).toEqual([]);
			expect(extractKeywords("   ")).toEqual([]);
		});

		it("should respect minLength parameter", () => {
			const abstract = "AI is a big field";

			const keywords = extractKeywords(abstract, { minLength: 3 });

			// Should exclude 'AI' and 'is' due to length
			expect(keywords).toContain("big");
			expect(keywords).toContain("field");
			expect(keywords).not.toContain("ai");
		});

		it("should extract compound terms", () => {
			const abstract = "Machine learning and deep learning are artificial intelligence techniques";

			const keywords = extractKeywords(abstract, { maxKeywords: 10 });

			// Should include compound terms
			expect(keywords.some(k => k.includes("machine learning") || k.includes("deep learning") || k.includes("artificial intelligence"))).toBe(true);
		});

		it("should exclude common stop words", () => {
			const abstract = "The quick brown fox jumps over the lazy dog";

			const keywords = extractKeywords(abstract, { excludeCommon: true });

			// Should exclude common words
			expect(keywords).not.toContain("the");
			expect(keywords).not.toContain("over");
			expect(keywords).toContain("quick");
			expect(keywords).toContain("brown");
		});

		it("should handle text with punctuation", () => {
			const abstract = "Machine learning, deep learning, and AI are transformative technologies!";

			const keywords = extractKeywords(abstract);

			expect(keywords).toContain("machine");
			expect(keywords).toContain("learning");
			expect(keywords).toContain("deep");
			expect(keywords).toContain("transformative");
			expect(keywords).toContain("technologies");
		});

		it("should limit number of keywords", () => {
			const abstract = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10";

			const keywords = extractKeywords(abstract, { maxKeywords: 3 });

			expect(keywords.length).toBeLessThanOrEqual(3);
		});
	});

	describe("formatCitation", () => {
		const mockWork = {
			display_name: "Machine Learning in Healthcare",
			authorships: [
				{ author: { display_name: "John Doe" } },
				{ author: { display_name: "Jane Smith" } },
			],
			publication_year: 2023,
			primary_location: {
				source: {
					display_name: "Journal of Medical AI",
				},
			},
			biblio: {
				volume: "15",
				issue: "3",
				first_page: "123",
				last_page: "135",
			},
			doi: "10.1234/example.2023.456",
		};

		it("should format APA citation correctly", () => {
			const citation = formatCitation(mockWork, "apa");

			expect(citation).toContain("John Doe & Jane Smith");
			expect(citation).toContain("(2023)");
			expect(citation).toContain("Machine Learning in Healthcare");
			expect(citation).toContain("*Journal of Medical AI*");
			expect(citation).toContain("15(3)");
			expect(citation).toContain("123-135");
			expect(citation).toContain("https://doi.org/10.1234/example.2023.456");
		});

		it("should format MLA citation correctly", () => {
			const citation = formatCitation(mockWork, "mla");

			expect(citation).toContain("Doe, John, and Jane Smith");
			expect(citation).toContain('"Machine Learning in Healthcare."');
			expect(citation).toContain("*Journal of Medical AI*");
			expect(citation).toContain("vol. 15");
			expect(citation).toContain("no. 3");
			expect(citation).toContain("2023");
			expect(citation).toContain("pp. 123-135");
		});

		it("should format Chicago citation correctly", () => {
			const citation = formatCitation(mockWork, "chicago");

			expect(citation).toContain("John Doe, Jane Smith");
			expect(citation).toContain('"Machine Learning in Healthcare."');
			expect(citation).toContain("*Journal of Medical AI*");
			expect(citation).toContain("15, no. 3");
			expect(citation).toContain("(2023)");
			expect(citation).toContain(": 123-135");
		});

		it("should handle single author", () => {
			const singleAuthorWork = {
				...mockWork,
				authorships: [{ author: { display_name: "John Doe" } }],
			};

			const citation = formatCitation(singleAuthorWork, "apa");
			expect(citation).toContain("John Doe");
			expect(citation).not.toContain(" & ");
		});

		it("should handle multiple authors with et al", () => {
			const multiAuthorWork = {
				...mockWork,
				authorships: [
					{ author: { display_name: "John Doe" } },
					{ author: { display_name: "Jane Smith" } },
					{ author: { display_name: "Bob Johnson" } },
					{ author: { display_name: "Alice Williams" } },
				],
			};

			const citation = formatCitation(multiAuthorWork, "apa");
			expect(citation).toContain("John Doe, Jane Smith, & Bob Johnson, et al.");
		});

		it("should handle missing fields gracefully", () => {
			const incompleteWork = {
				display_name: "Test Article",
				// Missing most fields
			};

			const citation = formatCitation(incompleteWork, "apa");
			expect(citation).toContain("Unknown Author");
			expect(citation).toContain("(n.d.)");
			expect(citation).toContain("Test Article");
		});

		it("should default to APA for unknown style", () => {
			const citation = formatCitation(mockWork, "unknown" as "apa" | "mla" | "chicago");

			// Should be same as APA format
			expect(citation).toContain("John Doe & Jane Smith");
			expect(citation).toContain("(2023)");
		});
	});

	describe("analyzeReadability", () => {
		it("should analyze simple text readability", () => {
			const abstract = "This is a simple test. It has short words. Very easy to read.";

			const result = analyzeReadability(abstract);

			expect(result).not.toBeNull();
			expect(result!.wordCount).toBe(13);
			expect(result!.sentenceCount).toBe(3);
			expect(result!.avgWordsPerSentence).toBeCloseTo(4.33, 2);
			expect(result!.fleschReadingEase).toBeGreaterThan(70); // Should be fairly easy
			expect(result!.readingLevel).toMatch(/Easy|Very Easy|Fairly Easy/);
		});

		it("should handle complex academic text", () => {
			const abstract = "The implementation of sophisticated machine learning algorithms requires comprehensive understanding of mathematical foundations, computational complexity theory, and statistical methodologies to achieve optimal performance in multidimensional optimization problems.";

			const result = analyzeReadability(abstract);

			expect(result).not.toBeNull();
			expect(result!.wordCount).toBeGreaterThan(20);
			expect(result!.avgSyllablesPerWord).toBeGreaterThan(2); // Complex words
			expect(result!.fleschReadingEase).toBeLessThan(60); // Should be difficult
			expect(result!.readingLevel).toMatch(/Difficult|Very Difficult|Fairly Difficult/);
		});

		it("should return null for null/empty input", () => {
			expect(analyzeReadability(null)).toBeNull();
			expect(analyzeReadability("")).toBeNull();
			expect(analyzeReadability("   ")).toBeNull();
		});

		it("should handle single sentence", () => {
			const abstract = "Machine learning is powerful.";

			const result = analyzeReadability(abstract);

			expect(result).not.toBeNull();
			expect(result!.wordCount).toBe(4);
			expect(result!.sentenceCount).toBe(1);
			expect(result!.avgWordsPerSentence).toBe(4);
		});

		it("should handle text without periods", () => {
			const abstract = "This text has no sentence endings";

			const result = analyzeReadability(abstract);

			expect(result).not.toBeNull();
			expect(result!.sentenceCount).toBe(1); // Should treat as single sentence
		});

		it("should calculate Flesch-Kincaid grade level", () => {
			const abstract = "The cat sat on the mat. It was a warm day.";

			const result = analyzeReadability(abstract);

			expect(result).not.toBeNull();
			// Flesch-Kincaid can produce negative values for very simple texts - this is mathematically correct
			expect(result!.fleschKincaidGrade).toBeGreaterThan(-5); // Allow negative for very simple text
			expect(result!.fleschKincaidGrade).toBeLessThan(20); // Reasonable grade level
		});

		it("should categorize reading levels correctly", () => {
			// Very simple text
			const simple = "Cat sat. Dog ran.";
			const simpleResult = analyzeReadability(simple);
			expect(simpleResult!.readingLevel).toMatch(/Easy|Very Easy/);

			// Complex text
			const complex = "The sophisticated methodological approaches necessitate comprehensive understanding of multifaceted theoretical frameworks.";
			const complexResult = analyzeReadability(complex);
			expect(complexResult!.readingLevel).toMatch(/Difficult|Very Difficult/);
		});
	});

	describe("integration tests", () => {
		it("should work with realistic OpenAlex data", () => {
			// Realistic inverted index from OpenAlex
			const invertedIndex = {
				"Machine": [0],
				"learning": [1, 15],
				"algorithms": [2],
				"have": [3],
				"demonstrated": [4],
				"remarkable": [5],
				"success": [6],
				"across": [7],
				"various": [8],
				"domains,": [9],
				"including": [10],
				"computer": [11],
				"vision,": [12],
				"natural": [13],
				"language": [14],
				"processing,": [16],
				"and": [17],
				"robotics.": [18],
			};

			// Test reconstruction
			const abstract = reconstructAbstract(invertedIndex);
			expect(abstract).toBeTruthy();
			expect(abstract).toContain("Machine learning algorithms");

			// Test statistics
			const stats = getAbstractStats(invertedIndex);
			expect(stats).toBeTruthy();
			expect(stats!.wordCount).toBeGreaterThan(15);

			// Test keyword extraction
			const keywords = extractKeywords(abstract, { maxKeywords: 5 });
			expect(keywords.length).toBeGreaterThan(0);
			expect(keywords.some(k => k.includes("machine") || k.includes("learning"))).toBe(true);

			// Test readability
			const readability = analyzeReadability(abstract);
			expect(readability).toBeTruthy();
			expect(readability!.wordCount).toBeGreaterThan(15);
		});

		it("should handle workflow from inverted index to analysis", () => {
			const invertedIndex = {
				"This": [0],
				"is": [1],
				"a": [2],
				"test": [3],
				"abstract": [4],
				"for": [5],
				"machine": [6],
				"learning": [7],
				"research.": [8],
			};

			// Full workflow
			const abstract = reconstructAbstract(invertedIndex);
			const stats = getAbstractStats(invertedIndex);
			const keywords = extractKeywords(abstract);
			const readability = analyzeReadability(abstract);

			// All should succeed
			expect(abstract).toBeTruthy();
			expect(stats).toBeTruthy();
			expect(keywords.length).toBeGreaterThan(0);
			expect(readability).toBeTruthy();

			// Verify consistency
			expect(stats!.wordCount).toBe(9);
			expect(readability!.wordCount).toBe(9);
		});
	});
});