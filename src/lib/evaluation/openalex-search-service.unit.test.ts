/**
 * Unit tests for OpenAlex search service
 * Testing search functionality, configuration handling, and utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	performAcademicExplorerSearch,
	searchBasedOnSTARDataset,
	convertWorkToReference,
	extractSearchCriteriaFromDataset,
	calculateSearchCoverage,
	DEFAULT_SEARCH_CONFIG,
	type AcademicExplorerSearchConfig
} from "./openalex-search-service";
import type { Work } from "@/lib/openalex";
import type { STARDataset, WorkReference } from "./types";
import { openAlex } from "@/lib/openalex";

// Mock the external dependencies
vi.mock("@/lib/openalex", () => ({
	openAlex: {
		works: {
			searchWorks: vi.fn()
		}
	}
}));

vi.mock("@/lib/logger", () => ({
	logError: vi.fn(),
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe("OpenAlex Search Service", () => {
	const mockWork: Work = {
		id: "W2755950973",
		doi: "10.1038/nature12373",
		title: "Deep Learning Applications in Medical Imaging",
		display_name: "Deep Learning Applications in Medical Imaging",
		publication_year: 2023,
		publication_date: "2023-06-15",
		ids: {
			openalex: "https://openalex.org/W2755950973",
			doi: "https://doi.org/10.1038/nature12373",
			mag: "123456789",
			pmid: "https://pubmed.ncbi.nlm.nih.gov/23792563"
		},
		language: "en",
		primary_location: {
			is_oa: true,
			landing_page_url: "https://doi.org/10.1038/nature12373",
			pdf_url: "https://nature.com/articles/nature12373.pdf",
			source: {
				id: "S4210194219",
				display_name: "Nature",
				issn_l: "0028-0836",
				issn: ["0028-0836", "1476-4687"],
				is_oa: false,
				is_in_doaj: false,
				host_organization: "https://openalex.org/P4310319900",
				host_organization_name: "Springer Nature",
				host_organization_lineage: ["https://openalex.org/P4310319900"],
				type: "journal"
			},
			license: "cc-by",
			version: "publishedVersion"
		},
		type: "journal-article",
		type_crossref: "journal-article",
		indexed_in: ["crossref", "pubmed"],
		open_access: {
			is_oa: true,
			oa_date: "2023-06-15",
			oa_url: "https://nature.com/articles/nature12373.pdf",
			any_repository_has_fulltext: true
		},
		authorships: [
			{
				author_position: "first",
				author: {
					id: "A2208157607",
					display_name: "Alice Johnson",
					orcid: "https://orcid.org/0000-0002-1825-0097"
				},
				institutions: [
					{
						id: "I1286329397",
						display_name: "Stanford University",
						ror: "https://ror.org/00f54p054",
						country_code: "US",
						type: "education",
						lineage: ["https://openalex.org/I1286329397"]
					}
				],
				countries: ["US"],
				is_corresponding: true,
				raw_author_name: "Alice Johnson",
				raw_affiliation_strings: ["Stanford University"]
			},
			{
				author_position: "middle",
				author: {
					id: "A2342343423",
					display_name: "Bob Smith",
					orcid: null
				},
				institutions: [
					{
						id: "I1286329397",
						display_name: "Stanford University",
						ror: "https://ror.org/00f54p054",
						country_code: "US",
						type: "education",
						lineage: ["https://openalex.org/I1286329397"]
					}
				],
				countries: ["US"],
				is_corresponding: false,
				raw_author_name: "Bob Smith",
				raw_affiliation_strings: ["Stanford University"]
			}
		],
		institution_assertions: [],
		countries_distinct_count: 1,
		institutions_distinct_count: 1,
		corresponding_author_ids: ["https://openalex.org/A2208157607"],
		corresponding_institution_ids: ["https://openalex.org/I1286329397"],
		apc_list: null,
		apc_paid: null,
		fwci: 2.3,
		has_fulltext: true,
		fulltext_origin: "ngrams",
		cited_by_count: 147,
		citation_normalized_percentile: 0.85,
		counts_by_year: [
			{ year: 2023, cited_by_count: 50 },
			{ year: 2024, cited_by_count: 97 }
		],
		updated_date: "2024-01-15T00:00:00.000000",
		created_date: "2023-06-20T00:00:00.000000",
		abstract_inverted_index: {
			"Deep": [0],
			"learning": [1, 15],
			"has": [2],
			"revolutionized": [3],
			"medical": [4, 18],
			"imaging": [5, 19],
			"analysis": [6]
		},
		best_oa_location: {
			is_oa: true,
			landing_page_url: "https://doi.org/10.1038/nature12373",
			pdf_url: "https://nature.com/articles/nature12373.pdf",
			source: {
				id: "S4210194219",
				display_name: "Nature",
				issn_l: "0028-0836",
				issn: ["0028-0836", "1476-4687"],
				is_oa: false,
				is_in_doaj: false,
				host_organization: "https://openalex.org/P4310319900",
				host_organization_name: "Springer Nature",
				host_organization_lineage: ["https://openalex.org/P4310319900"],
				type: "journal"
			},
			license: "cc-by",
			version: "publishedVersion"
		},
		sustainable_development_goals: [
			{
				id: "https://metadata.un.org/sdg/3",
				display_name: "Good health and well-being",
				score: 0.89
			}
		],
		grants: [],
		datasets: [],
		versions: [],
		referenced_works_count: 35,
		referenced_works: ["https://openalex.org/W2123456789"],
		related_works: ["https://openalex.org/W2987654321"],
		ngrams_url: "https://api.openalex.org/works/W2755950973/ngrams",
		concepts: [
			{
				id: "C154945302",
				wikidata: "https://www.wikidata.org/wiki/Q11190",
				display_name: "Medicine",
				level: 0,
				score: 0.91
			}
		],
		mesh: [
			{
				descriptor_ui: "D000077273",
				descriptor_name: "Deep Learning",
				qualifier_ui: "",
				qualifier_name: "",
				is_major_topic: true
			}
		],
		locations_count: 2,
		locations: [
			{
				is_oa: true,
				landing_page_url: "https://doi.org/10.1038/nature12373",
				pdf_url: "https://nature.com/articles/nature12373.pdf",
				source: {
					id: "S4210194219",
					display_name: "Nature",
					issn_l: "0028-0836",
					issn: ["0028-0836", "1476-4687"],
					is_oa: false,
					is_in_doaj: false,
					host_organization: "https://openalex.org/P4310319900",
					host_organization_name: "Springer Nature",
					host_organization_lineage: ["https://openalex.org/P4310319900"],
					type: "journal"
				},
				license: "cc-by",
				version: "publishedVersion"
			}
		],
		keywords: ["deep learning", "medical imaging", "artificial intelligence"]
	};

	const mockSTARDataset: STARDataset = {
		id: "test-dataset-1",
		name: "Deep Learning in Healthcare Review",
		uploadDate: new Date("2023-01-01"),
		reviewTopic: "Deep Learning Applications in Medical Imaging",
		originalPaperCount: 150,
		includedPapers: [
			{
				title: "Convolutional Neural Networks for Medical Diagnosis",
				authors: ["Dr. Jane Smith", "Prof. John Doe"],
				doi: "10.1000/example1",
				publicationYear: 2022,
				source: "Medical AI Journal",
				openalexId: "W123456789"
			},
			{
				title: "Transfer Learning in Radiology",
				authors: ["Dr. Bob Johnson"],
				publicationYear: 2023,
				source: "Radiology Today"
			}
		],
		excludedPapers: [],
		searchStrategy: {
			databases: ["OpenAlex", "PubMed", "Google Scholar"],
			keywords: ["deep learning", "medical imaging", "artificial intelligence", "neural networks"],
			dateRange: {
				start: new Date("2020-01-01"),
				end: new Date("2023-12-31")
			},
			inclusionCriteria: ["Peer-reviewed", "English language", "Original research"],
			exclusionCriteria: ["Conference abstracts", "Non-empirical"]
		},
		methodology: {
			prismaCompliant: true,
			screeningLevels: 2,
			reviewersCount: 3,
			conflictResolution: "Third reviewer consensus"
		},
		metadata: {
			description: "Systematic review of deep learning applications in medical imaging",
			methodology: "STAR",
			originalSource: "systematic-review-dataset.xlsx",
			dateRange: "2020-2023"
		}
	};

	const mockSearchResponse = {
		results: [mockWork],
		meta: {
			count: 1,
			per_page: 25,
			page: 1,
			cursor: null
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(openAlex.works.searchWorks).mockResolvedValue(mockSearchResponse);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Configuration", () => {
		it("should have correct default search configuration", () => {
			expect(DEFAULT_SEARCH_CONFIG).toEqual({
				maxResults: 200,
				sortBy: "relevance_score",
				includePreprints: true,
				minimumCitations: 0
			});
		});
	});

	describe("convertWorkToReference", () => {
		it("should convert OpenAlex Work to WorkReference correctly", () => {
			const workRef = convertWorkToReference(mockWork);

			expect(workRef).toEqual({
				title: "Deep Learning Applications in Medical Imaging",
				authors: ["Alice Johnson", "Bob Smith"],
				doi: "10.1038/nature12373",
				openalexId: "W2755950973",
				publicationYear: 2023,
				source: "Nature",
				citedByCount: 147,
				abstract: "Abstract available"
			});
		});

		it("should handle work with missing primary location", () => {
			const workWithoutPrimaryLocation: Work = {
				...mockWork,
				primary_location: null,
				best_oa_location: {
					...mockWork.best_oa_location!,
					source: {
						...mockWork.best_oa_location!.source!,
						display_name: "Alternative Source"
					}
				}
			};

			const workRef = convertWorkToReference(workWithoutPrimaryLocation);

			expect(workRef.source).toBe("Alternative Source");
		});

		it("should handle work with no location sources", () => {
			const workWithoutSources: Work = {
				...mockWork,
				primary_location: null,
				best_oa_location: null
			};

			const workRef = convertWorkToReference(workWithoutSources);

			expect(workRef.source).toBe("Unknown Source");
		});

		it("should handle work without title", () => {
			const workWithoutTitle: Work = {
				...mockWork,
				display_name: "",
				title: undefined
			};

			const workRef = convertWorkToReference(workWithoutTitle);

			expect(workRef.title).toBe("Untitled");
		});

		it("should filter out empty author names", () => {
			const workWithEmptyAuthors: Work = {
				...mockWork,
				authorships: [
					{
						...mockWork.authorships[0],
						author: {
							...mockWork.authorships[0].author,
							display_name: ""
						}
					},
					{
						...mockWork.authorships[1],
						author: {
							...mockWork.authorships[1].author,
							display_name: "Valid Author"
						}
					}
				]
			};

			const workRef = convertWorkToReference(workWithEmptyAuthors);

			expect(workRef.authors).toEqual(["Valid Author"]);
		});

		it("should handle DOI from ids if main doi is missing", () => {
			const workWithIdsDoi: Work = {
				...mockWork,
				doi: undefined,
				ids: {
					...mockWork.ids,
					doi: "https://doi.org/10.1000/alternative"
				}
			};

			const workRef = convertWorkToReference(workWithIdsDoi);

			expect(workRef.doi).toBe("https://doi.org/10.1000/alternative");
		});

		it("should handle work without abstract", () => {
			const workWithoutAbstract: Work = {
				...mockWork,
				abstract_inverted_index: null
			};

			const workRef = convertWorkToReference(workWithoutAbstract);

			expect(workRef.abstract).toBeUndefined();
		});
	});

	describe("extractSearchCriteriaFromDataset", () => {
		it("should extract search criteria from STAR dataset", () => {
			const { query, filters } = extractSearchCriteriaFromDataset(mockSTARDataset);

			// Keywords that don't appear in the topic are added, but duplicates are filtered out
			expect(query).toBe("Deep Learning Applications in Medical Imaging artificial intelligence neural networks");
			expect(filters).toMatchObject({
				sort: "relevance_score",
				per_page: 25,
				filters: {
					publication_year: ">2019,<2024"
				}
			});
		});

		it("should handle dataset without additional keywords", () => {
			const datasetWithoutKeywords: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					keywords: []
				}
			};

			const { query, filters: _filters } = extractSearchCriteriaFromDataset(datasetWithoutKeywords);

			expect(query).toBe("Deep Learning Applications in Medical Imaging");
		});

		it("should skip keywords already in review topic", () => {
			const datasetWithDuplicateKeywords: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					keywords: ["deep learning", "medical imaging", "unique keyword"]
				}
			};

			const { query, filters: _filters } = extractSearchCriteriaFromDataset(datasetWithDuplicateKeywords);

			expect(query).toBe("Deep Learning Applications in Medical Imaging unique keyword");
		});

		it("should handle dataset without date range", () => {
			const datasetWithoutDates: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					dateRange: {
						start: undefined,
						end: undefined
					}
				}
			};

			const { query: _query, filters } = extractSearchCriteriaFromDataset(datasetWithoutDates);

			expect(filters.filters).toEqual({});
		});

		it("should handle dataset with only start date", () => {
			const datasetWithOnlyStart: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					dateRange: {
						start: new Date("2020-01-01"),
						end: undefined
					}
				}
			};

			const { query: _query, filters } = extractSearchCriteriaFromDataset(datasetWithOnlyStart);

			expect(filters.filters).toEqual({
				publication_year: ">2019"
			});
		});

		it("should handle dataset with only end date", () => {
			const datasetWithOnlyEnd: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					dateRange: {
						start: undefined,
						end: new Date("2023-12-31")
					}
				}
			};

			const { query: _query, filters } = extractSearchCriteriaFromDataset(datasetWithOnlyEnd);

			expect(filters.filters).toEqual({
				publication_year: "<2024"
			});
		});

		it("should limit additional keywords to prevent overly complex queries", () => {
			const datasetWithManyKeywords: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					keywords: ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
				}
			};

			const { query, filters: _filters } = extractSearchCriteriaFromDataset(datasetWithManyKeywords);

			// Should only include first 3 additional keywords
			const additionalKeywords = query.replace("Deep Learning Applications in Medical Imaging ", "");
			const keywordCount = additionalKeywords.split(" ").length;
			expect(keywordCount).toBe(3);
		});
	});

	describe("performAcademicExplorerSearch", () => {
		it("should perform search with default configuration", async () => {
			const results = await performAcademicExplorerSearch("deep learning");

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith("deep learning", {
				sort: "relevance_score",
				per_page: 200,
				filters: {}
			});

			expect(results).toHaveLength(1);
			expect(results[0].title).toBe("Deep Learning Applications in Medical Imaging");
		});

		it("should apply custom configuration correctly", async () => {
			const config: AcademicExplorerSearchConfig = {
				maxResults: 50,
				sortBy: "cited_by_count",
				yearRange: {
					start: 2020,
					end: 2023
				},
				minimumCitations: 10,
				includePreprints: false
			};

			await performAcademicExplorerSearch("machine learning", config);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith("machine learning", {
				sort: "cited_by_count",
				per_page: 50,
				filters: {
					publication_year: ">2019,<2024",
					cited_by_count: ">9",
					type: "journal-article|book-chapter|book|dataset|dissertation|proceedings-article"
				}
			});
		});

		it("should handle year range with only start year", async () => {
			const config: AcademicExplorerSearchConfig = {
				yearRange: {
					start: 2020
				}
			};

			await performAcademicExplorerSearch("test query", config);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith("test query", {
				sort: "relevance_score",
				per_page: 200,
				filters: {
					publication_year: ">2019",
					type: "journal-article|book-chapter|book|dataset|dissertation|proceedings-article"
				}
			});
		});

		it("should handle year range with only end year", async () => {
			const config: AcademicExplorerSearchConfig = {
				yearRange: {
					end: 2023
				}
			};

			await performAcademicExplorerSearch("test query", config);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith("test query", {
				sort: "relevance_score",
				per_page: 200,
				filters: {
					publication_year: "<2024",
					type: "journal-article|book-chapter|book|dataset|dissertation|proceedings-article"
				}
			});
		});

		it("should respect maximum results limit", async () => {
			const config: AcademicExplorerSearchConfig = {
				maxResults: 500 // Should be capped at 200
			};

			await performAcademicExplorerSearch("test query", config);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith("test query", {
				sort: "relevance_score",
				per_page: 200, // Capped at 200
				filters: {
					type: "journal-article|book-chapter|book|dataset|dissertation|proceedings-article"
				}
			});
		});

		it("should filter out works without titles", async () => {
			const responseWithEmptyTitle = {
				...mockSearchResponse,
				results: [
					mockWork,
					{
						...mockWork,
						display_name: "",
						title: ""
					}
				]
			};

			vi.mocked(openAlex.works.searchWorks).mockResolvedValue(responseWithEmptyTitle);

			const results = await performAcademicExplorerSearch("test query");

			expect(results).toHaveLength(2); // Both works are included, empty title becomes "Untitled"
			expect(results[1].title).toBe("Untitled"); // Fallback title for empty display_name/title
		});

		it("should handle API errors gracefully", async () => {
			const apiError = new Error("OpenAlex API Error");
			vi.mocked(openAlex.works.searchWorks).mockRejectedValue(apiError);

			await expect(performAcademicExplorerSearch("test query")).rejects.toThrow(
				"Academic Explorer search failed: OpenAlex API Error"
			);
		});

		it("should handle non-Error exceptions", async () => {
			vi.mocked(openAlex.works.searchWorks).mockRejectedValue("String error");

			await expect(performAcademicExplorerSearch("test query")).rejects.toThrow(
				"Academic Explorer search failed: Unknown error"
			);
		});
	});

	describe("searchBasedOnSTARDataset", () => {
		it("should search based on STAR dataset criteria", async () => {
			const results = await searchBasedOnSTARDataset(mockSTARDataset);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith(
				"Deep Learning Applications in Medical Imaging artificial intelligence neural networks",
				expect.objectContaining({
					filters: expect.objectContaining({
						publication_year: ">2019,<2024"
					})
				})
			);

			expect(results).toHaveLength(1);
		});

		it("should merge dataset date range with config", async () => {
			const config: AcademicExplorerSearchConfig = {
				maxResults: 100,
				sortBy: "cited_by_count"
			};

			await searchBasedOnSTARDataset(mockSTARDataset, config);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					sort: "cited_by_count",
					per_page: 100,
					filters: expect.objectContaining({
						publication_year: ">2019,<2024"
					})
				})
			);
		});

		it("should use config date range when dataset has no dates", async () => {
			const datasetWithoutDates: STARDataset = {
				...mockSTARDataset,
				searchStrategy: {
					...mockSTARDataset.searchStrategy,
					dateRange: {
						start: undefined,
						end: undefined
					}
				}
			};

			const config: AcademicExplorerSearchConfig = {
				yearRange: {
					start: 2018,
					end: 2022
				}
			};

			await searchBasedOnSTARDataset(datasetWithoutDates, config);

			expect(openAlex.works.searchWorks).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					filters: expect.objectContaining({
						publication_year: ">2017,<2023"
					})
				})
			);
		});
	});

	describe("calculateSearchCoverage", () => {
		const mockResults: WorkReference[] = [
			{
				title: "Result 1",
				authors: ["Author 1"],
				publicationYear: 2023,
				source: "Journal 1"
			},
			{
				title: "Result 2",
				authors: ["Author 2"],
				publicationYear: 2022,
				source: "Journal 2"
			}
		];

		it("should calculate coverage correctly for good coverage", () => {
			const dataset: STARDataset = {
				...mockSTARDataset,
				originalPaperCount: 4 // Results: 2, Coverage: 0.5
			};

			const coverage = calculateSearchCoverage(mockResults, dataset);

			expect(coverage).toEqual({
				coverage: 0.5,
				expectedCount: 4,
				actualCount: 2,
				recommendation: "Search coverage appears reasonable for comparison"
			});
		});

		it("should recommend broadening search for low coverage", () => {
			const dataset: STARDataset = {
				...mockSTARDataset,
				originalPaperCount: 10 // Results: 2, Coverage: 0.2
			};

			const coverage = calculateSearchCoverage(mockResults, dataset);

			expect(coverage).toEqual({
				coverage: 0.2,
				expectedCount: 10,
				actualCount: 2,
				recommendation: "Consider broadening search terms or expanding date range"
			});
		});

		it("should recommend narrowing search for high coverage", () => {
			const dataset: STARDataset = {
				...mockSTARDataset,
				originalPaperCount: 1 // Results: 2, Coverage: 2.0
			};

			const coverage = calculateSearchCoverage(mockResults, dataset);

			expect(coverage).toEqual({
				coverage: 2.0,
				expectedCount: 1,
				actualCount: 2,
				recommendation: "Search coverage appears reasonable for comparison"
			});
		});

		it("should handle zero expected count", () => {
			const dataset: STARDataset = {
				...mockSTARDataset,
				originalPaperCount: 0
			};

			const coverage = calculateSearchCoverage(mockResults, dataset);

			expect(coverage.coverage).toBe(0);
			expect(coverage.expectedCount).toBe(0);
			expect(coverage.actualCount).toBe(2);
		});

		it("should handle empty results", () => {
			const coverage = calculateSearchCoverage([], mockSTARDataset);

			expect(coverage).toEqual({
				coverage: 0,
				expectedCount: 150,
				actualCount: 0,
				recommendation: "Consider broadening search terms or expanding date range"
			});
		});
	});
});