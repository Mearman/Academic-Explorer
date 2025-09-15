/**
 * Unit tests for comparison engine
 * Testing fuzzy matching algorithms, similarity calculations, and evaluation logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	compareAcademicExplorerResults,
	batchCompareResults as _batchCompareResults,
	DEFAULT_MATCHING_CONFIG,
	stringSimilarity,
	calculateAuthorSimilarity,
	calculateMatchScore,
	normalizeTitle,
	checkDOIMatch,
	checkYearMatch,
	type MatchingConfig
} from "./comparison-engine";
import type { WorkReference, STARDataset, ComparisonResults as _ComparisonResults, MatchingResults as _MatchingResults } from "./types";

// Mock the logger
vi.mock("@/lib/logger", () => ({
	logError: vi.fn(),
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe("Comparison Engine", () => {
	// Test data setup
	const mockWorkReferences: WorkReference[] = [
		{
			title: "Deep Learning Applications in Medical Imaging",
			authors: ["Dr. Jane Smith", "Prof. John Doe"],
			doi: "10.1000/example1",
			openalexId: "W123456789",
			publicationYear: 2022,
			source: "Medical AI Journal",
			citedByCount: 147
		},
		{
			title: "Transfer Learning in Radiology",
			authors: ["Dr. Bob Johnson"],
			publicationYear: 2023,
			source: "Radiology Today",
			openalexId: "W987654321",
			citedByCount: 89
		},
		{
			title: "Neural Networks for Medical Diagnosis",
			authors: ["Dr. Alice Chen", "Dr. Robert Lee"],
			doi: "10.1000/example2",
			openalexId: "W555666777",
			publicationYear: 2021,
			source: "AI in Medicine",
			citedByCount: 203
		}
	];

	const mockSTARDataset: STARDataset = {
		id: "test-dataset-1",
		name: "Deep Learning in Healthcare Review",
		uploadDate: new Date("2023-01-01"),
		reviewTopic: "Deep Learning Applications in Medical Imaging",
		originalPaperCount: 150,
		includedPapers: [
			{
				title: "Deep Learning Applications in Medical Imaging",
				authors: ["Dr. Jane Smith", "Prof. John Doe"],
				doi: "10.1000/example1",
				publicationYear: 2022,
				source: "Medical AI Journal",
				openalexId: "W123456789"
			},
			{
				title: "Machine Learning for Radiology",
				authors: ["Dr. Bob Johnson"],
				publicationYear: 2023,
				source: "Radiology Today"
			},
			{
				title: "Convolutional Networks in Healthcare",
				authors: ["Dr. Charlie Wilson"],
				doi: "10.1000/example3",
				publicationYear: 2021,
				source: "Healthcare Computing"
			}
		],
		excludedPapers: [
			{
				title: "Excluded Paper 1",
				authors: ["Dr. Excluded Author"],
				doi: "10.1000/excluded1",
				publicationYear: 2020,
				source: "Irrelevant Journal"
			}
		],
		searchStrategy: {
			databases: ["PubMed", "IEEE Xplore"],
			keywords: ["deep learning", "medical imaging", "artificial intelligence", "neural networks"],
			dateRange: {
				start: new Date("2020-01-01"),
				end: new Date("2023-12-31")
			},
			inclusionCriteria: ["Peer-reviewed", "English language", "Original research"],
			exclusionCriteria: ["Conference abstracts", "Editorial comments"]
		},
		methodology: {
			prismaCompliant: true,
			screeningLevels: 3,
			reviewersCount: 2,
			conflictResolution: "Third reviewer consensus"
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("DEFAULT_MATCHING_CONFIG", () => {
		it("should have sensible default values", () => {
			expect(DEFAULT_MATCHING_CONFIG).toEqual({
				titleSimilarityThreshold: 0.85,
				authorMatchThreshold: 0.7,
				yearToleranceYears: 1,
				requireExactDOI: true,
				useFuzzyMatching: true
			});
		});
	});

	describe("compareAcademicExplorerResults", () => {
		it("should compare academic explorer results with STAR dataset", () => {
			const mockProgressCallback = vi.fn();

			const results = compareAcademicExplorerResults(
				mockWorkReferences,
				mockSTARDataset,
				DEFAULT_MATCHING_CONFIG,
				mockProgressCallback
			);

			expect(results).toBeDefined();
			expect(results.dataset).toBe(mockSTARDataset);
			expect(results.academicExplorerResults).toHaveLength(3);
			expect(results.truePositives).toBeInstanceOf(Array);
			expect(results.falsePositives).toBeInstanceOf(Array);
			expect(results.falseNegatives).toBeInstanceOf(Array);
			expect(results.precision).toBeGreaterThanOrEqual(0);
			expect(results.precision).toBeLessThanOrEqual(1);
			expect(results.recall).toBeGreaterThanOrEqual(0);
			expect(results.recall).toBeLessThanOrEqual(1);
			expect(mockProgressCallback).toHaveBeenCalled();
		});

		it("should handle empty academic explorer results", () => {
			const results = compareAcademicExplorerResults(
				[],
				mockSTARDataset,
				DEFAULT_MATCHING_CONFIG
			);

			expect(results.academicExplorerResults).toHaveLength(0);
			expect(results.truePositives).toHaveLength(0);
			expect(results.precision).toBe(0);
			expect(results.recall).toBe(0);
		});

		it("should handle empty STAR dataset", () => {
			const emptyDataset: STARDataset = {
				...mockSTARDataset,
				includedPapers: [],
				excludedPapers: [],
				originalPaperCount: 0
			};

			const results = compareAcademicExplorerResults(
				mockWorkReferences,
				emptyDataset,
				DEFAULT_MATCHING_CONFIG
			);

			expect(results.dataset.includedPapers).toHaveLength(0);
			expect(results.truePositives).toHaveLength(0);
			expect(results.precision).toBe(0);
			expect(results.recall).toBe(0);
		});

		it("should handle custom matching configuration", () => {
			const customConfig: MatchingConfig = {
				titleSimilarityThreshold: 0.9,
				authorMatchThreshold: 0.8,
				yearToleranceYears: 0,
				requireExactDOI: false,
				useFuzzyMatching: false
			};

			const results = compareAcademicExplorerResults(
				mockWorkReferences,
				mockSTARDataset,
				customConfig
			);

			expect(results).toBeDefined();
			// With stricter thresholds, we expect fewer matches
			expect(results.precision).toBeGreaterThanOrEqual(0);
			expect(results.recall).toBeGreaterThanOrEqual(0);
		});

		it("should report progress during comparison", () => {
			const mockProgressCallback = vi.fn();

			compareAcademicExplorerResults(
				mockWorkReferences,
				mockSTARDataset,
				DEFAULT_MATCHING_CONFIG,
				mockProgressCallback
			);

			expect(mockProgressCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					stage: expect.any(String),
					progress: expect.any(Number),
					message: expect.any(String),
					startTime: expect.any(Date)
				})
			);
		});

		it("should handle papers with missing fields gracefully", () => {
			const incompleteWorkReferences: WorkReference[] = [
				{
					title: "Incomplete Paper",
					authors: [],
					publicationYear: 2022,
					source: "Unknown Journal",
					openalexId: "W000000000"
				}
			];

			const results = compareAcademicExplorerResults(
				incompleteWorkReferences,
				mockSTARDataset,
				DEFAULT_MATCHING_CONFIG
			);

			expect(results).toBeDefined();
			expect(results.academicExplorerResults).toHaveLength(1);
		});
	});

	describe("Utility Functions", () => {
		describe("stringSimilarity", () => {
			it("should return 1 for identical strings", () => {
				const similarity = stringSimilarity("Deep Learning", "Deep Learning");
				expect(similarity).toBe(1);
			});

			it("should return 0 for completely different strings", () => {
				const similarity = stringSimilarity("Deep Learning", "xyz123");
				expect(similarity).toBeCloseTo(0, 1);
			});

			it("should handle case insensitive comparison", () => {
				const similarity = stringSimilarity("Deep Learning", "DEEP LEARNING");
				expect(similarity).toBe(1);
			});

			it("should handle empty strings", () => {
				expect(stringSimilarity("", "")).toBe(0);
				expect(stringSimilarity("test", "")).toBe(0);
				expect(stringSimilarity("", "test")).toBe(0);
			});

			it("should calculate similarity for partially similar strings", () => {
				const similarity = stringSimilarity("Deep Learning", "Deep Neural Networks");
				expect(similarity).toBeGreaterThanOrEqual(0.4);
				expect(similarity).toBeLessThan(0.8);
			});
		});

		describe("normalizeTitle", () => {
			it("should normalize title by removing punctuation and extra spaces", () => {
				const normalized = normalizeTitle("Deep Learning: Applications in Medical Imaging!!");
				expect(normalized).toBe("deep learning: applications in medical imaging");
			});

			it("should remove common articles", () => {
				const normalized = normalizeTitle("A Deep Learning Analysis");
				expect(normalized).toBe("deep learning");
			});

			it("should remove common suffixes", () => {
				const normalized = normalizeTitle("Machine Learning Study");
				expect(normalized).toBe("machine learning");
			});

			it("should handle empty strings", () => {
				const normalized = normalizeTitle("");
				expect(normalized).toBe("");
			});
		});

		describe("calculateAuthorSimilarity", () => {
			it("should return 1 for identical author lists", () => {
				const authors1 = ["Dr. Jane Smith", "Prof. John Doe"];
				const authors2 = ["Dr. Jane Smith", "Prof. John Doe"];
				const similarity = calculateAuthorSimilarity(authors1, authors2);
				expect(similarity).toBe(1);
			});

			it("should return 0 for completely different author lists", () => {
				const authors1 = ["Dr. Jane Smith", "Prof. John Doe"];
				const authors2 = ["Dr. Bob Wilson", "Dr. Alice Chen"];
				const similarity = calculateAuthorSimilarity(authors1, authors2);
				expect(similarity).toBe(0);
			});

			it("should handle partial overlaps", () => {
				const authors1 = ["Dr. Jane Smith", "Prof. John Doe"];
				const authors2 = ["Dr. Jane Smith", "Dr. Bob Wilson"];
				const similarity = calculateAuthorSimilarity(authors1, authors2);
				expect(similarity).toBeCloseTo(0.5, 1);
			});

			it("should handle empty author lists", () => {
				expect(calculateAuthorSimilarity([], [])).toBe(1);
				expect(calculateAuthorSimilarity(["Dr. Jane Smith"], [])).toBe(0);
				expect(calculateAuthorSimilarity([], ["Dr. Jane Smith"])).toBe(0);
			});
		});

		describe("checkDOIMatch", () => {
			it("should return true for identical DOIs", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal", doi: "10.1000/example1" };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", doi: "10.1000/example1" };
				const match = checkDOIMatch(paper1, paper2);
				expect(match).toBe(true);
			});

			it("should return false for different DOIs", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal", doi: "10.1000/example1" };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", doi: "10.1000/example2" };
				const match = checkDOIMatch(paper1, paper2);
				expect(match).toBe(false);
			});

			it("should handle missing DOIs", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal" };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", doi: "10.1000/example1" };
				const paper3: WorkReference = { title: "Paper 3", authors: [], source: "Journal" };

				expect(checkDOIMatch(paper1, paper2)).toBe(false);
				expect(checkDOIMatch(paper2, paper1)).toBe(false);
				expect(checkDOIMatch(paper1, paper3)).toBe(false);
			});
		});

		describe("checkYearMatch", () => {
			it("should return true for exact year match", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal", publicationYear: 2022 };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", publicationYear: 2022 };
				const match = checkYearMatch(paper1, paper2, 0);
				expect(match).toBe(true);
			});

			it("should return true for years within tolerance", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal", publicationYear: 2022 };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", publicationYear: 2023 };
				const match = checkYearMatch(paper1, paper2, 1);
				expect(match).toBe(true);
			});

			it("should return true for years outside tolerance (based on actual implementation)", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal", publicationYear: 2022 };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", publicationYear: 2025 };
				const match = checkYearMatch(paper1, paper2, 1);
				expect(match).toBe(false);
			});

			it("should handle missing years (returns true for missing years)", () => {
				const paper1: WorkReference = { title: "Paper 1", authors: [], source: "Journal" };
				const paper2: WorkReference = { title: "Paper 2", authors: [], source: "Journal", publicationYear: 2022 };
				const paper3: WorkReference = { title: "Paper 3", authors: [], source: "Journal" };

				expect(checkYearMatch(paper1, paper2, 1)).toBe(true);
				expect(checkYearMatch(paper2, paper1, 1)).toBe(true);
				expect(checkYearMatch(paper1, paper3, 1)).toBe(true);
			});
		});

		describe("calculateMatchScore", () => {
			const mockPaper1: WorkReference = {
				title: "Deep Learning Applications",
				authors: ["Dr. Jane Smith"],
				doi: "10.1000/example1",
				publicationYear: 2022,
				source: "AI Journal",
				openalexId: "W123456789"
			};

			const mockPaper2: WorkReference = {
				title: "Deep Learning Applications",
				authors: ["Dr. Jane Smith"],
				doi: "10.1000/example1",
				publicationYear: 2022,
				source: "AI Journal",
				openalexId: "W987654321"
			};

			it("should return high score for very similar papers", () => {
				const score = calculateMatchScore(mockPaper1, mockPaper2, DEFAULT_MATCHING_CONFIG);
				expect(score).toBeGreaterThan(0.8);
			});

			it("should return low score for dissimilar papers", () => {
				const dissimilarPaper: WorkReference = {
					title: "Quantum Computing Principles",
					authors: ["Dr. Bob Wilson"],
					doi: "10.1000/different",
					publicationYear: 2020,
					source: "Physics Today",
					openalexId: "W111222333"
				};

				const score = calculateMatchScore(mockPaper1, dissimilarPaper, DEFAULT_MATCHING_CONFIG);
				expect(score).toBeLessThan(0.5);
			});
		});
	});

	describe("Integration tests", () => {
		it("should provide reasonable results for typical comparison", () => {
			const results = compareAcademicExplorerResults(
				mockWorkReferences,
				mockSTARDataset,
				DEFAULT_MATCHING_CONFIG
			);

			// Verify the structure of results
			expect(results).toMatchObject({
				dataset: expect.any(Object),
				academicExplorerResults: expect.any(Array),
				truePositives: expect.any(Array),
				falsePositives: expect.any(Array),
				falseNegatives: expect.any(Array),
				precision: expect.any(Number),
				recall: expect.any(Number),
				f1Score: expect.any(Number),
				additionalPapersFound: expect.any(Array)
			});

			// Verify metrics are within valid ranges
			expect(results.precision).toBeGreaterThanOrEqual(0);
			expect(results.precision).toBeLessThanOrEqual(1);
			expect(results.recall).toBeGreaterThanOrEqual(0);
			expect(results.recall).toBeLessThanOrEqual(1);
			expect(results.f1Score).toBeGreaterThanOrEqual(0);
			expect(results.f1Score).toBeLessThanOrEqual(1);

			// Verify arrays are properly populated
			expect(results.truePositives).toBeDefined();
			expect(results.falsePositives).toBeDefined();
			expect(results.falseNegatives).toBeDefined();
		});

		it("should handle large datasets efficiently", () => {
			// Create larger test datasets
			const largeWorkReferences: WorkReference[] = Array.from({ length: 100 }, (_, i) => ({
				title: `Research Paper ${i}`,
				authors: [`Author ${i}`, `Co-Author ${i}`],
				doi: `10.1000/example${i}`,
				openalexId: `W${i.toString().padStart(9, "0")}`,
				publicationYear: 2020 + (i % 4),
				source: `Journal ${i % 10}`,
				citedByCount: Math.floor(Math.random() * 500)
			}));

			const largeSTARDataset: STARDataset = {
				...mockSTARDataset,
				originalPaperCount: 100,
				includedPapers: Array.from({ length: 100 }, (_, i) => ({
					title: `STAR Paper ${i}`,
					authors: [`STAR Author ${i}`],
					doi: `10.1000/star${i}`,
					publicationYear: 2020 + (i % 4),
					source: `STAR Journal ${i % 10}`,
					openalexId: `S${i.toString().padStart(9, "0")}`
				}))
			};

			const startTime = performance.now();
			const results = compareAcademicExplorerResults(
				largeWorkReferences,
				largeSTARDataset,
				DEFAULT_MATCHING_CONFIG
			);
			const endTime = performance.now();

			expect(results.academicExplorerResults).toHaveLength(100);
			expect(results.dataset.includedPapers).toHaveLength(100);
			expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
		});
	});

	describe("Error handling", () => {
		it("should handle invalid work references gracefully", () => {
			const invalidWorkReferences = [
				// @ts-expect-error - Testing invalid data
				null,
				// @ts-expect-error - Testing invalid data
				undefined,
				{
					title: "",
					authors: [],
					publicationYear: NaN,
					source: "",
					openalexId: ""
				}
			] as WorkReference[];

			expect(() => {
				compareAcademicExplorerResults(
					invalidWorkReferences,
					mockSTARDataset,
					DEFAULT_MATCHING_CONFIG
				);
			}).toThrow();
		});

		it("should handle missing configuration gracefully", () => {
			expect(() => {
				// @ts-expect-error - Testing invalid config
				compareAcademicExplorerResults(
					mockWorkReferences,
					mockSTARDataset,
					null
				);
			}).toThrow();
		});
	});
});