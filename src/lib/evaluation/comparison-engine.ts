/**
 * Comparison engine for evaluating Academic Explorer results against STAR datasets
 * Implements fuzzy matching algorithms for systematic literature review evaluation
 */

import type {
	WorkReference,
	STARDataset,
	ComparisonResults,
	MatchingResults,
	MatchingConfig,
	ComparisonProgress
} from "./types";

/**
 * Default configuration for paper matching algorithms
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
	titleSimilarityThreshold: 0.85, // 85% similarity required for title match
	authorMatchThreshold: 0.7, // 70% author overlap required
	yearToleranceYears: 1, // Allow ±1 year difference
	requireExactDOI: true, // DOI must match exactly if present
	useFuzzyMatching: true // Enable fuzzy string matching
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
	const matrix: number[][] = [];
	const len1 = str1.length;
	const len2 = str2.length;

	if (len1 === 0) return len2;
	if (len2 === 0) return len1;

	// Initialize matrix
	for (let i = 0; i <= len1; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= len2; j++) {
		matrix[0][j] = j;
	}

	// Fill matrix
	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1, // deletion
				matrix[i][j - 1] + 1, // insertion
				matrix[i - 1][j - 1] + cost // substitution
			);
		}
	}

	return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
	if (!str1 || !str2) return 0;

	const normalizedStr1 = str1.toLowerCase().trim();
	const normalizedStr2 = str2.toLowerCase().trim();

	if (normalizedStr1 === normalizedStr2) return 1;

	const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
	if (maxLength === 0) return 1;

	const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
	return (maxLength - distance) / maxLength;
}

/**
 * Normalize title for comparison by removing common variations
 */
function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.trim()
	// Remove punctuation except essential characters
		.replace(/[^\w\s\-:]/g, "")
	// Normalize whitespace
		.replace(/\s+/g, " ")
	// Remove common prefixes/suffixes that might vary
		.replace(/^(a |an |the )/i, "")
		.replace(/(\s+journal|\s+review|\s+study|\s+analysis)$/i, "");
}

/**
 * Calculate author similarity between two paper records
 */
function calculateAuthorSimilarity(authors1: string[], authors2: string[]): number {
	if (authors1.length === 0 && authors2.length === 0) return 1;
	if (authors1.length === 0 || authors2.length === 0) return 0;

	// Normalize author names for comparison
	const normalizedAuthors1 = authors1.map(author =>
		author.toLowerCase().replace(/[^\w\s]/g, "").trim()
	);
	const normalizedAuthors2 = authors2.map(author =>
		author.toLowerCase().replace(/[^\w\s]/g, "").trim()
	);

	let matches = 0;
	const totalAuthors = Math.max(normalizedAuthors1.length, normalizedAuthors2.length);

	// Check for exact matches
	for (const author1 of normalizedAuthors1) {
		if (normalizedAuthors2.includes(author1)) {
			matches++;
		} else {
			// Check for partial matches (last name similarity)
			for (const author2 of normalizedAuthors2) {
				const similarity = stringSimilarity(author1, author2);
				if (similarity > 0.8) { // High threshold for author matching
					matches += similarity;
					break;
				}
			}
		}
	}

	return matches / totalAuthors;
}

/**
 * Check if two papers match based on DOI
 */
function checkDOIMatch(paper1: WorkReference, paper2: WorkReference): boolean {
	if (!paper1.doi || !paper2.doi) return false;

	// Normalize DOIs by removing prefixes and converting to lowercase
	const normalizeDOI = (doi: string) =>
		doi.toLowerCase().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, "").trim();

	return normalizeDOI(paper1.doi) === normalizeDOI(paper2.doi);
}

/**
 * Check if publication years are within acceptable tolerance
 */
function checkYearMatch(paper1: WorkReference, paper2: WorkReference, tolerance: number): boolean {
	if (!paper1.publicationYear || !paper2.publicationYear) {
		// If one paper has no year, don't penalize the match
		return true;
	}

	return Math.abs(paper1.publicationYear - paper2.publicationYear) <= tolerance;
}

/**
 * Calculate overall match score between two papers
 */
function calculateMatchScore(
	paper1: WorkReference,
	paper2: WorkReference,
	config: MatchingConfig
): number {
	// DOI match is definitive if both papers have DOIs
	if (config.requireExactDOI && checkDOIMatch(paper1, paper2)) {
		return 1.0;
	}

	// If DOI is required but doesn't match, reject
	if (config.requireExactDOI && paper1.doi && paper2.doi && !checkDOIMatch(paper1, paper2)) {
		return 0.0;
	}

	let score = 0;
	let weights = 0;

	// Title similarity (highest weight)
	if (config.useFuzzyMatching) {
		const titleSimilarity = stringSimilarity(
			normalizeTitle(paper1.title),
			normalizeTitle(paper2.title)
		);
		score += titleSimilarity * 0.6;
		weights += 0.6;
	}

	// Author similarity (medium weight)
	const authorSimilarity = calculateAuthorSimilarity(paper1.authors, paper2.authors);
	score += authorSimilarity * 0.3;
	weights += 0.3;

	// Year proximity (low weight)
	if (checkYearMatch(paper1, paper2, config.yearToleranceYears)) {
		score += 0.1;
	}
	weights += 0.1;

	return weights > 0 ? score / weights : 0;
}

/**
 * Find the best match for a paper in a list of candidates
 */
function findBestMatch(
	targetPaper: WorkReference,
	candidates: WorkReference[],
	config: MatchingConfig
): { match: WorkReference | null; score: number } {
	let bestMatch: WorkReference | null = null;
	let bestScore = 0;

	for (const candidate of candidates) {
		const score = calculateMatchScore(targetPaper, candidate, config);
		if (score > bestScore) {
			bestScore = score;
			bestMatch = candidate;
		}
	}

	return { match: bestMatch, score: bestScore };
}

/**
 * Perform matching between Academic Explorer results and STAR dataset
 */
function performMatching(
	academicExplorerResults: WorkReference[],
	starDataset: STARDataset,
	config: MatchingConfig
): MatchingResults {
	const truePositives: WorkReference[] = [];
	const falsePositives: WorkReference[] = [];
	const falseNegatives: WorkReference[] = [];

	// Combine included papers from STAR dataset as ground truth
	const groundTruthPapers = starDataset.includedPapers;
	const matchedGroundTruthIds = new Set<string>();

	// Find matches for Academic Explorer results
	for (const academicPaper of academicExplorerResults) {
		const { match, score } = findBestMatch(academicPaper, groundTruthPapers, config);

		if (match && score >= config.titleSimilarityThreshold) {
			// True positive: found in both Academic Explorer and STAR included papers
			truePositives.push(academicPaper);
			matchedGroundTruthIds.add(match.title + (match.doi || ""));
		} else {
			// False positive: found in Academic Explorer but not in STAR included papers
			falsePositives.push(academicPaper);
		}
	}

	// Find false negatives: papers in STAR included but not found by Academic Explorer
	for (const groundTruthPaper of groundTruthPapers) {
		const paperKey = groundTruthPaper.title + (groundTruthPaper.doi || "");
		if (!matchedGroundTruthIds.has(paperKey)) {
			falseNegatives.push(groundTruthPaper);
		}
	}

	return {
		truePositives,
		falsePositives,
		falseNegatives
	};
}

/**
 * Calculate evaluation metrics from matching results
 */
function calculateMetrics(matchingResults: MatchingResults): {
  precision: number;
  recall: number;
  f1Score: number;
} {
	const tp = matchingResults.truePositives.length;
	const fp = matchingResults.falsePositives.length;
	const fn = matchingResults.falseNegatives.length;

	const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
	const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
	const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

	return { precision, recall, f1Score };
}

/**
 * Find additional papers discovered by Academic Explorer that weren't in STAR dataset
 */
function findAdditionalPapers(
	academicExplorerResults: WorkReference[],
	starDataset: STARDataset,
	config: MatchingConfig
): WorkReference[] {
	const additionalPapers: WorkReference[] = [];

	// Combine all STAR papers (included + excluded) for comparison
	const allStarPapers = [...starDataset.includedPapers, ...starDataset.excludedPapers];

	for (const academicPaper of academicExplorerResults) {
		const { score } = findBestMatch(academicPaper, allStarPapers, config);

		// If no good match found in entire STAR dataset, it's an additional discovery
		if (score < config.titleSimilarityThreshold) {
			additionalPapers.push(academicPaper);
		}
	}

	return additionalPapers;
}

/**
 * Main comparison function that evaluates Academic Explorer against STAR dataset
 */
export function compareAcademicExplorerResults(
	academicExplorerResults: WorkReference[],
	starDataset: STARDataset,
	config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
	onProgress?: (progress: ComparisonProgress) => void
): ComparisonResults {
	const startTime = new Date();

	// Report progress
	onProgress?.({
		stage: "matching",
		progress: 10,
		message: "Starting paper matching...",
		startTime
	});

	// Perform the matching
	const matchingResults = performMatching(academicExplorerResults, starDataset, config);

	onProgress?.({
		stage: "calculating",
		progress: 70,
		message: "Calculating evaluation metrics...",
		startTime
	});

	// Calculate metrics
	const { precision, recall, f1Score } = calculateMetrics(matchingResults);

	onProgress?.({
		stage: "calculating",
		progress: 90,
		message: "Finding additional papers...",
		startTime
	});

	// Find additional papers
	const additionalPapersFound = findAdditionalPapers(academicExplorerResults, starDataset, config);

	onProgress?.({
		stage: "complete",
		progress: 100,
		message: "Comparison complete!",
		startTime
	});

	return {
		dataset: starDataset,
		academicExplorerResults,
		truePositives: matchingResults.truePositives,
		falsePositives: matchingResults.falsePositives,
		falseNegatives: matchingResults.falseNegatives,
		precision,
		recall,
		f1Score,
		additionalPapersFound
	};
}

/**
 * Batch comparison function for multiple STAR datasets
 */
export async function batchCompareResults(
	academicExplorerResults: WorkReference[],
	starDatasets: STARDataset[],
	config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
	onProgress?: (datasetIndex: number, progress: ComparisonProgress) => void
): Promise<ComparisonResults[]> {
	const results: ComparisonResults[] = [];

	for (let i = 0; i < starDatasets.length; i++) {
		const dataset = starDatasets[i];

		const result = compareAcademicExplorerResults(
			academicExplorerResults,
			dataset,
			config,
			(progress) => onProgress?.(i, progress)
		);

		results.push(result);
	}

	return results;
}

/**
 * Export utility functions for testing and advanced usage
 */
export {
	stringSimilarity,
	calculateAuthorSimilarity,
	calculateMatchScore,
	normalizeTitle,
	checkDOIMatch,
	checkYearMatch
};