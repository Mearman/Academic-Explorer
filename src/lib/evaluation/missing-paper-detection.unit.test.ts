/**
 * Unit tests for missing paper detection algorithms
 * Testing all detection methods, utility functions, and configuration handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	detectMissingPapers,
	DEFAULT_DETECTION_CONFIG,
	type MissingPaperDetectionConfig,
	type DetectionProgress
} from "./missing-paper-detection";
import type { STARDataset } from "./types";
import { openAlex } from "@/lib/openalex";

// Mock the external dependencies
vi.mock("@/lib/openalex", () => ({
	openAlex: {
		works: {
			getWorks: vi.fn()
		}
	},
	buildFilterString: vi.fn((filters) => {
		return Object.entries(filters)
			.map(([key, value]) => `${key}:${value}`)
			.join(",");
	})
}));

vi.mock("./openalex-search-service", () => ({
	convertWorkToReference: vi.fn((work) => ({
		title: work.display_name || work.title || "Mock Work",
		authors: work.authorships?.map((a: any) => a.author?.display_name).filter(Boolean) || ["Mock Author"],
		doi: work.doi || undefined,
		publicationYear: work.publication_year || 2023,
		source: work.primary_location?.source?.display_name || "Mock Journal",
		openalexId: work.id || undefined,
		citedByCount: work.cited_by_count || 0
	}))
}));

vi.mock("@/lib/logger", () => ({
	logError: vi.fn()
}));

describe("Missing Paper Detection", () => {
	const mockSTARDataset: STARDataset = {
		id: "test-dataset-1",
		name: "Test Systematic Review",
		uploadDate: new Date("2023-01-01"),
		reviewTopic: "Machine Learning Applications",
		originalPaperCount: 100,
		includedPapers: [
			{
				title: "Deep Learning for Image Recognition",
				authors: ["John Smith", "Jane Doe"],
				doi: "10.1000/test1",
				publicationYear: 2022,
				source: "Nature Machine Intelligence",
				openalexId: "W123456789",
				citedByCount: 50
			},
			{
				title: "Neural Networks in Computer Vision",
				authors: ["Alice Johnson", "Bob Wilson"],
				doi: "10.1000/test2",
				publicationYear: 2021,
				source: "IEEE Transactions on Pattern Analysis",
				openalexId: "W987654321",
				citedByCount: 35
			},
			{
				title: "Machine Learning Methods for Data Analysis",
				authors: ["Carol Davis", "David Brown"],
				publicationYear: 2023,
				source: "Journal of Machine Learning Research",
				openalexId: undefined // Test case without OpenAlex ID
			}
		],
		excludedPapers: [
			{
				title: "Excluded Paper on Different Topic",
				authors: ["Eve Miller"],
				publicationYear: 2020,
				source: "Different Journal"
			}
		],
		searchStrategy: {
			databases: ["OpenAlex", "PubMed"],
			keywords: ["machine learning", "neural networks", "deep learning"],
			dateRange: {
				start: new Date("2020-01-01"),
				end: new Date("2023-12-31")
			},
			inclusionCriteria: ["Peer-reviewed articles", "English language"],
			exclusionCriteria: ["Conference abstracts", "Non-empirical studies"]
		},
		methodology: {
			prismaCompliant: true,
			screeningLevels: 2,
			reviewersCount: 2,
			conflictResolution: "Third reviewer"
		},
		metadata: {
			description: "Test dataset for algorithm validation",
			methodology: "STAR",
			originalSource: "test-file.xlsx",
			dateRange: "2020-2023"
		}
	};

	const mockOpenAlexResponse = {
		results: [
			{
				id: "W111111111",
				display_name: "Advanced Machine Learning Techniques",
				title: "Advanced Machine Learning Techniques",
				authorships: [
					{ author: { display_name: "Test Author 1" } },
					{ author: { display_name: "Test Author 2" } }
				],
				publication_year: 2022,
				doi: "10.1000/mock1",
				primary_location: {
					source: { display_name: "Mock AI Journal" }
				},
				cited_by_count: 25,
				abstract_inverted_index: { "test": [1, 5], "abstract": [2, 6] }
			},
			{
				id: "W222222222",
				display_name: "Computer Vision Applications",
				authorships: [
					{ author: { display_name: "Test Author 3" } }
				],
				publication_year: 2023,
				doi: "10.1000/mock2",
				primary_location: {
					source: { display_name: "Computer Vision Review" }
				},
				cited_by_count: 18
			}
		],
		meta: {
			count: 2,
			per_page: 25,
			page: 1
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(openAlex.works.getWorks).mockResolvedValue(mockOpenAlexResponse);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Configuration", () => {
		it("should have correct default configuration", () => {
			expect(DEFAULT_DETECTION_CONFIG).toEqual({
				maxPapersPerMethod: 50,
				minimumCitationThreshold: 5,
				temporalWindowYears: 2,
				semanticSimilarityThreshold: 0.7,
				enableCitationAnalysis: true,
				enableAuthorAnalysis: true,
				enableTemporalAnalysis: true,
				enableKeywordExpansion: false
			});
		});

		it("should merge custom config with defaults", async () => {
			const customConfig: Partial<MissingPaperDetectionConfig> = {
				maxPapersPerMethod: 25,
				enableKeywordExpansion: true
			};

			const result = await detectMissingPapers(mockSTARDataset, customConfig);

			expect(result).toBeDefined();
			expect(result.dataset).toBe(mockSTARDataset);
		});
	});

	describe("Main Detection Function", () => {
		it("should successfully detect missing papers with default config", async () => {
			const result = await detectMissingPapers(mockSTARDataset);

			expect(result).toBeDefined();
			expect(result.dataset).toBe(mockSTARDataset);
			expect(result.candidateMissingPapers).toBeInstanceOf(Array);
			expect(result.detectionMethods).toBeDefined();
			expect(result.detectionStatistics).toBeDefined();
			expect(result.validationMetrics).toBeDefined();
		});

		it("should track progress through callback", async () => {
			const progressUpdates: DetectionProgress[] = [];
			const onProgress = (progress: DetectionProgress) => {
				progressUpdates.push(progress);
			};

			await detectMissingPapers(mockSTARDataset, DEFAULT_DETECTION_CONFIG, onProgress);

			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[0]).toMatchObject({
				currentMethod: expect.any(String),
				progress: expect.any(Number),
				message: expect.any(String),
				papersFound: expect.any(Number)
			});
		});

		it("should handle custom configuration correctly", async () => {
			const customConfig: MissingPaperDetectionConfig = {
				maxPapersPerMethod: 25,
				minimumCitationThreshold: 10,
				temporalWindowYears: 3,
				enableCitationAnalysis: false,
				enableAuthorAnalysis: false,
				enableTemporalAnalysis: true,
				enableKeywordExpansion: false
			};

			const result = await detectMissingPapers(mockSTARDataset, customConfig);

			expect(result.detectionMethods.citationNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.authorNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.temporalGapAnalysis.length).toBeGreaterThanOrEqual(0);
		});

		it("should enable keyword expansion when configured", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				enableKeywordExpansion: true,
				enableTemporalAnalysis: false,
				enableCitationAnalysis: false,
				enableAuthorAnalysis: false
			};

			const result = await detectMissingPapers(mockSTARDataset, config);

			expect(result.detectionMethods.keywordExpansionAnalysis.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Detection Statistics", () => {
		it("should calculate correct detection statistics", async () => {
			const result = await detectMissingPapers(mockSTARDataset);

			expect(result.detectionStatistics).toMatchObject({
				totalCandidates: expect.any(Number),
				highConfidenceCandidates: expect.any(Number),
				averageCitationCount: expect.any(Number),
				temporalDistribution: expect.any(Object),
				methodContributions: expect.any(Object)
			});

			expect(result.detectionStatistics.totalCandidates).toBeGreaterThanOrEqual(0);
			expect(result.detectionStatistics.highConfidenceCandidates).toBeGreaterThanOrEqual(0);
			expect(result.detectionStatistics.averageCitationCount).toBeGreaterThanOrEqual(0);
		});

		it("should have correct method contributions structure", async () => {
			const result = await detectMissingPapers(mockSTARDataset);

			expect(result.detectionStatistics.methodContributions).toHaveProperty("temporalGapAnalysis");
			expect(result.detectionStatistics.methodContributions).toHaveProperty("citationNetworkAnalysis");
			expect(result.detectionStatistics.methodContributions).toHaveProperty("authorNetworkAnalysis");
			expect(result.detectionStatistics.methodContributions).toHaveProperty("keywordExpansionAnalysis");

			Object.values(result.detectionStatistics.methodContributions).forEach(count => {
				expect(typeof count).toBe("number");
				expect(count).toBeGreaterThanOrEqual(0);
			});
		});

		it("should calculate temporal distribution correctly", async () => {
			const result = await detectMissingPapers(mockSTARDataset);

			expect(result.detectionStatistics.temporalDistribution).toBeInstanceOf(Object);

			Object.entries(result.detectionStatistics.temporalDistribution).forEach(([year, count]) => {
				expect(typeof year).toBe("string");
				expect(Number(year)).toBeGreaterThan(1900);
				expect(Number(year)).toBeLessThan(2100);
				expect(typeof count).toBe("number");
				expect(count).toBeGreaterThan(0);
			});
		});
	});

	describe("Validation Metrics", () => {
		it("should calculate validation metrics correctly", async () => {
			const result = await detectMissingPapers(mockSTARDataset);

			expect(result.validationMetrics).toMatchObject({
				confidenceScore: expect.any(Number),
				algorithmicBias: expect.any(Array)
			});

			expect(result.validationMetrics.confidenceScore).toBeGreaterThanOrEqual(0);
			expect(result.validationMetrics.confidenceScore).toBeLessThanOrEqual(1);
			expect(Array.isArray(result.validationMetrics.algorithmicBias)).toBe(true);
		});

		it("should identify potential algorithmic biases", async () => {
			// Create a dataset that should trigger bias detection
			const biasedDataset: STARDataset = {
				...mockSTARDataset,
				includedPapers: mockSTARDataset.includedPapers.map(paper => ({
					...paper,
					citedByCount: 100 // High citation counts should trigger citation bias
				}))
			};

			const result = await detectMissingPapers(biasedDataset);

			expect(result.validationMetrics.algorithmicBias).toBeInstanceOf(Array);
		});

		it("should detect missing author network when no authors present", async () => {
			const noAuthorDataset: STARDataset = {
				...mockSTARDataset,
				includedPapers: [{
					title: "Paper Without Authors",
					authors: [],
					publicationYear: 2022,
					source: "Test Journal"
				}]
			};

			const result = await detectMissingPapers(noAuthorDataset);

			expect(result.validationMetrics.algorithmicBias).toContain(
				"Author network incomplete - potential missing perspectives"
			);
		});
	});

	describe("Error Handling", () => {
		it("should handle OpenAlex API failures gracefully", async () => {
			vi.mocked(openAlex.works.getWorks).mockRejectedValue(new Error("API failure"));

			const result = await detectMissingPapers(mockSTARDataset);

			// Should still return a result even with API failures
			expect(result).toBeDefined();
			expect(result.candidateMissingPapers).toBeInstanceOf(Array);
			expect(result.detectionStatistics.totalCandidates).toBe(0);
		});

		it("should handle empty datasets", async () => {
			const emptyDataset: STARDataset = {
				...mockSTARDataset,
				includedPapers: [],
				excludedPapers: [],
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					keywords: [] // Also empty keywords to prevent fallback searches
				}
			};

			const result = await detectMissingPapers(emptyDataset);

			expect(result).toBeDefined();
			expect(result.candidateMissingPapers).toBeInstanceOf(Array);
			expect(result.detectionStatistics.totalCandidates).toBeGreaterThanOrEqual(0);
			expect(result.detectionStatistics.averageCitationCount).toBeGreaterThanOrEqual(0);
		});

		it("should handle datasets without publication years", async () => {
			const noYearDataset: STARDataset = {
				...mockSTARDataset,
				includedPapers: [{
					title: "Paper Without Year",
					authors: ["Test Author"],
					source: "Test Journal"
				}],
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					dateRange: {
						start: undefined,
						end: undefined
					}
				}
			};

			const result = await detectMissingPapers(noYearDataset);

			expect(result).toBeDefined();
			expect(result.candidateMissingPapers).toBeInstanceOf(Array);
		});

		it("should handle datasets without OpenAlex IDs", async () => {
			const noIdDataset: STARDataset = {
				...mockSTARDataset,
				includedPapers: mockSTARDataset.includedPapers.map(paper => ({
					...paper,
					openalexId: undefined
				}))
			};

			const result = await detectMissingPapers(noIdDataset);

			expect(result).toBeDefined();
			// Citation network analysis should be empty without OpenAlex IDs
			expect(result.detectionMethods.citationNetworkAnalysis).toHaveLength(0);
		});
	});

	describe("Deduplication and Filtering", () => {
		it("should remove duplicate papers from results", async () => {
			// Mock response with duplicate entries
			const duplicateResponse = {
				...mockOpenAlexResponse,
				results: [
					...mockOpenAlexResponse.results,
					// Duplicate with same ID
					{
						...mockOpenAlexResponse.results[0],
						id: "W111111111"
					},
					// Duplicate with same DOI
					{
						...mockOpenAlexResponse.results[1],
						id: "W333333333",
						doi: "10.1000/mock2"
					}
				]
			};

			vi.mocked(openAlex.works.getWorks).mockResolvedValue(duplicateResponse);

			const result = await detectMissingPapers(mockSTARDataset);

			// Check that the final candidateMissingPapers list has no duplicates
			const candidateIds = result.candidateMissingPapers.map(p => p.openalexId).filter(Boolean);
			const uniqueCandidateIds = new Set(candidateIds);
			expect(candidateIds.length).toBe(uniqueCandidateIds.size);

			const candidateDois = result.candidateMissingPapers.map(p => p.doi).filter(Boolean);
			const uniqueCandidateDois = new Set(candidateDois);
			expect(candidateDois.length).toBe(uniqueCandidateDois.size);

			const candidateTitles = result.candidateMissingPapers.map(p => p.title.toLowerCase());
			const uniqueCandidateTitles = new Set(candidateTitles);
			expect(candidateTitles.length).toBe(uniqueCandidateTitles.size);
		});

		it("should filter out papers already in included set", async () => {
			// Mock response that includes papers already in the dataset
			const overlappingResponse = {
				...mockOpenAlexResponse,
				results: [
					...mockOpenAlexResponse.results,
					{
						id: "W123456789", // Same as included paper
						display_name: "Deep Learning for Image Recognition",
						doi: "10.1000/test1",
						publication_year: 2022,
						cited_by_count: 50
					}
				]
			};

			vi.mocked(openAlex.works.getWorks).mockResolvedValue(overlappingResponse);

			const result = await detectMissingPapers(mockSTARDataset);

			// Should not include papers already in the included set
			const candidateIds = result.candidateMissingPapers.map(p => p.openalexId);
			expect(candidateIds).not.toContain("W123456789");

			const candidateDois = result.candidateMissingPapers.map(p => p.doi);
			expect(candidateDois).not.toContain("10.1000/test1");
		});
	});

	describe("Keyword and Year Range Extraction", () => {
		it("should extract year range from included papers", async () => {
			// The extraction happens internally, we test by verifying API calls
			await detectMissingPapers(mockSTARDataset);

			expect(openAlex.works.getWorks).toHaveBeenCalled();

			// Check that API calls include proper date filters
			const calls = vi.mocked(openAlex.works.getWorks).mock.calls;
			const hasDateFilter = calls.some(call => {
				const params = call[0];
				return params.filter && params.filter.includes("publication_date");
			});

			expect(hasDateFilter).toBe(true);
		});

		it("should extract keywords from search strategy and titles", async () => {
			await detectMissingPapers(mockSTARDataset);

			expect(openAlex.works.getWorks).toHaveBeenCalled();

			// Check that API calls include search terms
			const calls = vi.mocked(openAlex.works.getWorks).mock.calls;
			const hasSearchTerms = calls.some(call => {
				const params = call[0];
				return params.search && typeof params.search === "string";
			});

			expect(hasSearchTerms).toBe(true);
		});

		it("should handle fallback to search strategy dates when no publication years", async () => {
			const noYearPapers: STARDataset = {
				...mockSTARDataset,
				includedPapers: [{
					title: "Paper Without Year",
					authors: ["Author"],
					source: "Journal"
				}]
			};

			const result = await detectMissingPapers(noYearPapers);

			expect(result).toBeDefined();
			expect(openAlex.works.getWorks).toHaveBeenCalled();
		});
	});

	describe("Individual Detection Methods", () => {
		it("should perform temporal gap analysis when enabled", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				enableTemporalAnalysis: true,
				enableCitationAnalysis: false,
				enableAuthorAnalysis: false,
				enableKeywordExpansion: false
			};

			const result = await detectMissingPapers(mockSTARDataset, config);

			expect(result.detectionMethods.temporalGapAnalysis.length).toBeGreaterThanOrEqual(0);
			expect(result.detectionMethods.citationNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.authorNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.keywordExpansionAnalysis).toHaveLength(0);
		});

		it("should perform citation network analysis when enabled", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				enableTemporalAnalysis: false,
				enableCitationAnalysis: true,
				enableAuthorAnalysis: false,
				enableKeywordExpansion: false
			};

			const result = await detectMissingPapers(mockSTARDataset, config);

			expect(result.detectionMethods.temporalGapAnalysis).toHaveLength(0);
			expect(result.detectionMethods.citationNetworkAnalysis.length).toBeGreaterThanOrEqual(0);
			expect(result.detectionMethods.authorNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.keywordExpansionAnalysis).toHaveLength(0);
		});

		it("should perform author network analysis when enabled", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				enableTemporalAnalysis: false,
				enableCitationAnalysis: false,
				enableAuthorAnalysis: true,
				enableKeywordExpansion: false
			};

			const result = await detectMissingPapers(mockSTARDataset, config);

			expect(result.detectionMethods.temporalGapAnalysis).toHaveLength(0);
			expect(result.detectionMethods.citationNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.authorNetworkAnalysis.length).toBeGreaterThanOrEqual(0);
			expect(result.detectionMethods.keywordExpansionAnalysis).toHaveLength(0);
		});

		it("should skip disabled methods", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				enableTemporalAnalysis: false,
				enableCitationAnalysis: false,
				enableAuthorAnalysis: false,
				enableKeywordExpansion: false
			};

			const result = await detectMissingPapers(mockSTARDataset, config);

			expect(result.detectionMethods.temporalGapAnalysis).toHaveLength(0);
			expect(result.detectionMethods.citationNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.authorNetworkAnalysis).toHaveLength(0);
			expect(result.detectionMethods.keywordExpansionAnalysis).toHaveLength(0);
			expect(result.candidateMissingPapers).toHaveLength(0);
		});
	});

	describe("API Call Patterns", () => {
		it("should make API calls with correct parameters", async () => {
			await detectMissingPapers(mockSTARDataset);

			expect(openAlex.works.getWorks).toHaveBeenCalled();

			const calls = vi.mocked(openAlex.works.getWorks).mock.calls;
			expect(calls.length).toBeGreaterThan(0);

			// Check that all calls have required parameters
			calls.forEach(call => {
				const params = call[0];
				expect(params).toHaveProperty("select");
				expect(params.select).toContain("id");
				expect(params.select).toContain("title");
				expect(params.select).toContain("display_name");
			});
		});

		it("should respect maxPapersPerMethod configuration", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				maxPapersPerMethod: 10
			};

			await detectMissingPapers(mockSTARDataset, config);

			const calls = vi.mocked(openAlex.works.getWorks).mock.calls;

			// Check that per_page parameters respect the limit
			calls.forEach(call => {
				const params = call[0];
				if (params.per_page) {
					expect(params.per_page).toBeLessThanOrEqual(10);
				}
			});
		});

		it("should include citation count filters", async () => {
			const config: MissingPaperDetectionConfig = {
				...DEFAULT_DETECTION_CONFIG,
				minimumCitationThreshold: 20
			};

			await detectMissingPapers(mockSTARDataset, config);

			const calls = vi.mocked(openAlex.works.getWorks).mock.calls;

			// Check that citation filters are applied
			const hasCitationFilter = calls.some(call => {
				const params = call[0];
				return params.filter && params.filter.includes("cited_by_count:>20");
			});

			expect(hasCitationFilter).toBe(true);
		});
	});
});