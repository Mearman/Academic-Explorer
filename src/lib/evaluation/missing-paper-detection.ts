/**
 * Missing Paper Detection Algorithms for Historical Review Validation
 * Identifies potentially relevant papers that systematic reviews may have missed
 */

import { openAlex, buildFilterString } from '@/lib/openalex';
import type { WorkReference, STARDataset } from './types';
import { convertWorkToReference } from './openalex-search-service';
import { logError } from '@/lib/logger';

/**
 * Configuration for missing paper detection algorithms
 */
export interface MissingPaperDetectionConfig {
  /** Maximum papers to analyze per detection method */
  maxPapersPerMethod?: number;
  /** Minimum citation count threshold for candidate papers */
  minimumCitationThreshold?: number;
  /** Years before/after review period to search */
  temporalWindowYears?: number;
  /** Minimum similarity score for semantic matching */
  semanticSimilarityThreshold?: number;
  /** Enable citation network analysis */
  enableCitationAnalysis?: boolean;
  /** Enable author network analysis */
  enableAuthorAnalysis?: boolean;
  /** Enable temporal gap analysis */
  enableTemporalAnalysis?: boolean;
  /** Enable keyword expansion analysis */
  enableKeywordExpansion?: boolean;
}

/**
 * Default configuration optimized for systematic review validation
 */
export const DEFAULT_DETECTION_CONFIG: MissingPaperDetectionConfig = {
  maxPapersPerMethod: 50,
  minimumCitationThreshold: 5,
  temporalWindowYears: 2,
  semanticSimilarityThreshold: 0.7,
  enableCitationAnalysis: true,
  enableAuthorAnalysis: true,
  enableTemporalAnalysis: true,
  enableKeywordExpansion: false // Computationally intensive, disabled by default
};

/**
 * Results of missing paper detection analysis
 */
export interface MissingPaperDetectionResults {
  dataset: STARDataset;
  detectionMethods: {
    temporalGapAnalysis: WorkReference[];
    citationNetworkAnalysis: WorkReference[];
    authorNetworkAnalysis: WorkReference[];
    keywordExpansionAnalysis: WorkReference[];
  };
  candidateMissingPapers: WorkReference[];
  detectionStatistics: {
    totalCandidates: number;
    highConfidenceCandidates: number;
    averageCitationCount: number;
    temporalDistribution: { [year: number]: number };
    methodContributions: { [method: string]: number };
  };
  validationMetrics: {
    precisionEstimate?: number;
    confidenceScore: number;
    algorithmicBias: string[];
  };
}

/**
 * Progress callback for long-running detection operations
 */
export interface DetectionProgress {
  currentMethod: string;
  progress: number; // 0-100
  message: string;
  papersFound: number;
}

/**
 * Extract publication year range from STAR dataset
 */
function extractPublicationYearRange(dataset: STARDataset): { start: number; end: number } {
  const includedYears = dataset.includedPapers
    .map(paper => paper.publicationYear)
    .filter((year): year is number => typeof year === 'number');

  if (includedYears.length === 0) {
    // Fallback to search strategy date range
    const searchStart = dataset.searchStrategy.dateRange?.start;
    const searchEnd = dataset.searchStrategy.dateRange?.end;

    return {
      start: searchStart ? searchStart.getFullYear() : new Date().getFullYear() - 10,
      end: searchEnd ? searchEnd.getFullYear() : new Date().getFullYear()
    };
  }

  return {
    start: Math.min(...includedYears),
    end: Math.max(...includedYears)
  };
}

/**
 * Extract dominant keywords from included papers
 */
function extractDominantKeywords(dataset: STARDataset): string[] {
  // Combine search strategy keywords with extracted title keywords
  const searchKeywords = dataset.searchStrategy.keywords || [];

  // Extract frequent words from paper titles (simple approach)
  const titleWords = dataset.includedPapers
    .map(paper => paper.title.toLowerCase())
    .join(' ')
    .split(/\W+/)
    .filter(word => word.length > 3) // Filter out short words
    .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'does', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));

  // Count word frequency
  const wordCounts = titleWords.reduce((counts, word) => {
    counts[word] = (counts[word] || 0) + 1;
    return counts;
  }, {} as { [word: string]: number });

  // Get top keywords
  const topTitleKeywords = Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  return [...new Set([...searchKeywords, ...topTitleKeywords])];
}

/**
 * Temporal Gap Analysis - Find papers published during review period that match criteria
 */
async function performTemporalGapAnalysis(
  dataset: STARDataset,
  config: MissingPaperDetectionConfig,
  onProgress?: (progress: DetectionProgress) => void
): Promise<WorkReference[]> {
  onProgress?.({
    currentMethod: 'Temporal Gap Analysis',
    progress: 0,
    message: 'Analyzing publication timeline gaps',
    papersFound: 0
  });

  const yearRange = extractPublicationYearRange(dataset);
  const keywords = extractDominantKeywords(dataset);

  // Expand temporal window
  const searchStart = yearRange.start - (config.temporalWindowYears || 2);
  const searchEnd = yearRange.end + (config.temporalWindowYears || 2);

  const searchQuery = keywords.slice(0, 5).join(' OR '); // Limit to top 5 keywords
  const worksParams = {
    search: searchQuery,
    filter: buildFilterString({
      from_publication_date: `${searchStart}-01-01`,
      to_publication_date: `${searchEnd}-12-31`,
      cited_by_count: `>${config.minimumCitationThreshold || 5}`
    }),
    select: ['id', 'title', 'display_name', 'authorships', 'publication_year', 'doi', 'ids', 'primary_location', 'best_oa_location', 'cited_by_count', 'abstract_inverted_index'],
    per_page: config.maxPapersPerMethod || 50,
    sort: 'cited_by_count'
  };

  try {
    const response = await openAlex.works.getWorks(worksParams);
    const works = response.results || [];

    onProgress?.({
      currentMethod: 'Temporal Gap Analysis',
      progress: 100,
      message: `Found ${works.length} potential temporal gap papers`,
      papersFound: works.length
    });

    return works.map(convertWorkToReference);
  } catch (error) {
    logError('Temporal gap analysis failed', error, 'MissingPaperDetection', 'api');
    return [];
  }
}

/**
 * Citation Network Analysis - Find highly cited papers that cite or are cited by included papers
 */
async function performCitationNetworkAnalysis(
  dataset: STARDataset,
  config: MissingPaperDetectionConfig,
  onProgress?: (progress: DetectionProgress) => void
): Promise<WorkReference[]> {
  onProgress?.({
    currentMethod: 'Citation Network Analysis',
    progress: 0,
    message: 'Analyzing citation networks',
    papersFound: 0
  });

  const candidates: WorkReference[] = [];
  const includedPapersWithIds = dataset.includedPapers.filter(paper => paper.openalexId);

  if (includedPapersWithIds.length === 0) {
    onProgress?.({
      currentMethod: 'Citation Network Analysis',
      progress: 100,
      message: 'No OpenAlex IDs found in included papers',
      papersFound: 0
    });
    return [];
  }

  // Sample up to 10 highly cited papers for citation analysis
  const samplePapers = includedPapersWithIds.slice(0, 10);

  for (let i = 0; i < samplePapers.length; i++) {
    const paper = samplePapers[i];
    const progress = (i / samplePapers.length) * 100;

    onProgress?.({
      currentMethod: 'Citation Network Analysis',
      progress,
      message: `Analyzing citations for paper ${i + 1}/${samplePapers.length}`,
      papersFound: candidates.length
    });

    if (!paper.openalexId) continue;

    try {
      // Find papers that cite this paper
      const citingPapersResponse = await openAlex.works.getWorks({
        filter: buildFilterString({
          referenced_works: paper.openalexId,
          cited_by_count: `>${config.minimumCitationThreshold || 5}`
        }),
        select: ['id', 'title', 'display_name', 'authorships', 'publication_year', 'doi', 'ids', 'primary_location', 'best_oa_location', 'cited_by_count', 'abstract_inverted_index'],
        per_page: Math.min(20, (config.maxPapersPerMethod || 50) / samplePapers.length),
        sort: 'cited_by_count'
      });

      const citingWorks = citingPapersResponse.results || [];
      candidates.push(...citingWorks.map(convertWorkToReference));

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      logError(`Citation analysis failed for paper ${paper.openalexId}`, error, 'MissingPaperDetection', 'api');
    }
  }

  onProgress?.({
    currentMethod: 'Citation Network Analysis',
    progress: 100,
    message: `Found ${candidates.length} potential citation network papers`,
    papersFound: candidates.length
  });

  return candidates;
}

/**
 * Author Network Analysis - Find papers by authors who published included papers
 */
async function performAuthorNetworkAnalysis(
  dataset: STARDataset,
  config: MissingPaperDetectionConfig,
  onProgress?: (progress: DetectionProgress) => void
): Promise<WorkReference[]> {
  onProgress?.({
    currentMethod: 'Author Network Analysis',
    progress: 0,
    message: 'Analyzing author networks',
    papersFound: 0
  });

  // Extract all authors from included papers
  const allAuthors = dataset.includedPapers
    .flatMap(paper => paper.authors)
    .filter((author, index, arr) => arr.indexOf(author) === index) // Remove duplicates
    .slice(0, 20); // Limit to top 20 authors to avoid API overload

  if (allAuthors.length === 0) {
    onProgress?.({
      currentMethod: 'Author Network Analysis',
      progress: 100,
      message: 'No authors found in included papers',
      papersFound: 0
    });
    return [];
  }

  const yearRange = extractPublicationYearRange(dataset);
  const keywords = extractDominantKeywords(dataset);
  const candidates: WorkReference[] = [];

  // Search for papers by these authors in the same time period
  const authorQuery = allAuthors.slice(0, 10).map(author => `"${author}"`).join(' OR ');
  const keywordQuery = keywords.slice(0, 3).join(' OR ');

  try {
    const response = await openAlex.works.getWorks({
      search: `(author:${authorQuery}) AND (${keywordQuery})`,
      filter: buildFilterString({
        from_publication_date: `${yearRange.start - 1}-01-01`,
        to_publication_date: `${yearRange.end + 1}-12-31`,
        cited_by_count: `>${config.minimumCitationThreshold || 5}`
      }),
      select: ['id', 'title', 'display_name', 'authorships', 'publication_year', 'doi', 'ids', 'primary_location', 'best_oa_location', 'cited_by_count', 'abstract_inverted_index'],
      per_page: config.maxPapersPerMethod || 50,
      sort: 'cited_by_count'
    });
    const works = response.results || [];

    candidates.push(...works.map(convertWorkToReference));
  } catch (error) {
    logError('Author network analysis failed', error, 'MissingPaperDetection', 'api');
  }

  onProgress?.({
    currentMethod: 'Author Network Analysis',
    progress: 100,
    message: `Found ${candidates.length} potential author network papers`,
    papersFound: candidates.length
  });

  return candidates;
}

/**
 * Keyword Expansion Analysis - Use semantic similarity to find papers with related terminology
 */
async function performKeywordExpansionAnalysis(
  dataset: STARDataset,
  config: MissingPaperDetectionConfig,
  onProgress?: (progress: DetectionProgress) => void
): Promise<WorkReference[]> {
  onProgress?.({
    currentMethod: 'Keyword Expansion Analysis',
    progress: 0,
    message: 'Expanding keyword search',
    papersFound: 0
  });

  // This is a simplified implementation - in a real scenario, you might use
  // semantic similarity models or concept expansion techniques
  const baseKeywords = extractDominantKeywords(dataset);
  const yearRange = extractPublicationYearRange(dataset);

  // Create expanded search terms using common academic synonyms and related terms
  const expandedTerms = expandKeywordsWithSynonyms(baseKeywords);
  const candidates: WorkReference[] = [];

  for (let i = 0; i < expandedTerms.length; i += 2) {
    const termPair = expandedTerms.slice(i, i + 2);
    const progress = (i / expandedTerms.length) * 100;

    onProgress?.({
      currentMethod: 'Keyword Expansion Analysis',
      progress,
      message: `Searching expanded terms: ${termPair.join(', ')}`,
      papersFound: candidates.length
    });

    try {
      const searchQuery = termPair.join(' OR ');
      const response = await openAlex.works.getWorks({
        search: searchQuery,
        filter: buildFilterString({
          from_publication_date: `${yearRange.start}-01-01`,
          to_publication_date: `${yearRange.end}-12-31`,
          cited_by_count: `>${config.minimumCitationThreshold || 5}`
        }),
        select: ['id', 'title', 'display_name', 'authorships', 'publication_year', 'doi', 'ids', 'primary_location', 'best_oa_location', 'cited_by_count', 'abstract_inverted_index'],
        per_page: Math.min(10, (config.maxPapersPerMethod || 50) / (expandedTerms.length / 2)),
        sort: 'cited_by_count'
      });
      const works = response.results || [];
      candidates.push(...works.map(convertWorkToReference));

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      logError(`Keyword expansion search failed for terms ${termPair}`, error, 'MissingPaperDetection', 'api');
    }
  }

  onProgress?.({
    currentMethod: 'Keyword Expansion Analysis',
    progress: 100,
    message: `Found ${candidates.length} potential expanded keyword papers`,
    papersFound: candidates.length
  });

  return candidates;
}

/**
 * Expand keywords with common academic synonyms and related terms
 */
function expandKeywordsWithSynonyms(keywords: string[]): string[] {
  const synonymMap: { [key: string]: string[] } = {
    'machine': ['artificial', 'automated', 'computational'],
    'learning': ['training', 'education', 'algorithm'],
    'analysis': ['evaluation', 'assessment', 'examination'],
    'method': ['approach', 'technique', 'methodology'],
    'system': ['framework', 'platform', 'architecture'],
    'data': ['information', 'dataset', 'evidence'],
    'model': ['framework', 'paradigm', 'structure'],
    'performance': ['effectiveness', 'efficiency', 'results'],
    'review': ['survey', 'overview', 'examination'],
    'research': ['study', 'investigation', 'inquiry']
  };

  const expanded = new Set<string>();

  keywords.forEach(keyword => {
    expanded.add(keyword);

    // Find synonyms for individual words in multi-word keywords
    keyword.toLowerCase().split(/\s+/).forEach(word => {
      if (synonymMap[word]) {
        synonymMap[word].forEach(synonym => {
          expanded.add(keyword.replace(new RegExp(word, 'gi'), synonym));
        });
      }
    });
  });

  return Array.from(expanded);
}

/**
 * Remove duplicate papers and papers already in the included set
 */
function deduplicateAndFilter(
  candidates: WorkReference[],
  dataset: STARDataset
): WorkReference[] {
  const includedIds = new Set([
    ...dataset.includedPapers.map(p => p.doi).filter(Boolean),
    ...dataset.includedPapers.map(p => p.openalexId).filter(Boolean),
    ...dataset.includedPapers.map(p => p.title.toLowerCase())
  ]);

  // Deduplicate candidates
  const seen = new Set<string>();
  const unique = candidates.filter(paper => {
    const id = paper.doi || paper.openalexId || paper.title.toLowerCase();
    if (seen.has(id) || includedIds.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });

  return unique;
}

/**
 * Calculate validation metrics for missing paper detection results
 */
function calculateValidationMetrics(
  results: Omit<MissingPaperDetectionResults, 'validationMetrics'>
): MissingPaperDetectionResults['validationMetrics'] {
  const totalCandidates = results.candidateMissingPapers.length;
  const methodCounts = Object.values(results.detectionMethods).map(papers => papers.length);

  // Estimate confidence based on method agreement and paper quality indicators
  const methodAgreement = methodCounts.filter(count => count > 0).length / Object.keys(results.detectionMethods).length;
  const avgCitationCount = results.detectionStatistics.averageCitationCount;

  // Simple confidence heuristic
  const confidenceScore = Math.min(1.0, (methodAgreement * 0.6) + (Math.min(avgCitationCount / 20, 1.0) * 0.4));

  // Identify potential algorithmic biases
  const biases: string[] = [];
  if (results.detectionStatistics.methodContributions.temporalGapAnalysis > totalCandidates * 0.8) {
    biases.push('Temporal bias - over-reliance on publication date patterns');
  }
  if (results.detectionStatistics.averageCitationCount > 50) {
    biases.push('Citation bias - favor for highly cited papers');
  }
  if (results.detectionMethods.authorNetworkAnalysis.length === 0) {
    biases.push('Author network incomplete - potential missing perspectives');
  }

  return {
    confidenceScore,
    algorithmicBias: biases
  };
}

/**
 * Main function to detect potentially missing papers from systematic reviews
 */
export async function detectMissingPapers(
  dataset: STARDataset,
  config: MissingPaperDetectionConfig = DEFAULT_DETECTION_CONFIG,
  onProgress?: (progress: DetectionProgress) => void
): Promise<MissingPaperDetectionResults> {
  const detectionMethods = {
    temporalGapAnalysis: [] as WorkReference[],
    citationNetworkAnalysis: [] as WorkReference[],
    authorNetworkAnalysis: [] as WorkReference[],
    keywordExpansionAnalysis: [] as WorkReference[]
  };

  // Run enabled detection methods
  if (config.enableTemporalAnalysis !== false) {
    detectionMethods.temporalGapAnalysis = await performTemporalGapAnalysis(dataset, config, onProgress);
  }

  if (config.enableCitationAnalysis !== false) {
    detectionMethods.citationNetworkAnalysis = await performCitationNetworkAnalysis(dataset, config, onProgress);
  }

  if (config.enableAuthorAnalysis !== false) {
    detectionMethods.authorNetworkAnalysis = await performAuthorNetworkAnalysis(dataset, config, onProgress);
  }

  if (config.enableKeywordExpansion === true) {
    detectionMethods.keywordExpansionAnalysis = await performKeywordExpansionAnalysis(dataset, config, onProgress);
  }

  // Combine and deduplicate all candidates
  const allCandidates = [
    ...detectionMethods.temporalGapAnalysis,
    ...detectionMethods.citationNetworkAnalysis,
    ...detectionMethods.authorNetworkAnalysis,
    ...detectionMethods.keywordExpansionAnalysis
  ];

  const candidateMissingPapers = deduplicateAndFilter(allCandidates, dataset);

  // Calculate statistics
  const citationCounts = candidateMissingPapers
    .map(paper => extractCitationCount(paper))
    .filter(count => count > 0);

  const temporalDistribution = candidateMissingPapers.reduce((dist, paper) => {
    if (paper.publicationYear) {
      dist[paper.publicationYear] = (dist[paper.publicationYear] || 0) + 1;
    }
    return dist;
  }, {} as { [year: number]: number });

  const methodContributions = {
    temporalGapAnalysis: detectionMethods.temporalGapAnalysis.length,
    citationNetworkAnalysis: detectionMethods.citationNetworkAnalysis.length,
    authorNetworkAnalysis: detectionMethods.authorNetworkAnalysis.length,
    keywordExpansionAnalysis: detectionMethods.keywordExpansionAnalysis.length
  };

  const detectionStatistics = {
    totalCandidates: candidateMissingPapers.length,
    highConfidenceCandidates: candidateMissingPapers.filter(paper =>
      extractCitationCount(paper) >= (config.minimumCitationThreshold || 5) * 2
    ).length,
    averageCitationCount: citationCounts.length > 0
      ? citationCounts.reduce((sum, count) => sum + count, 0) / citationCounts.length
      : 0,
    temporalDistribution,
    methodContributions
  };

  const preliminaryResults = {
    dataset,
    detectionMethods,
    candidateMissingPapers,
    detectionStatistics
  };

  const validationMetrics = calculateValidationMetrics(preliminaryResults);

  return {
    ...preliminaryResults,
    validationMetrics
  };
}

/**
 * Extract citation count from WorkReference
 */
function extractCitationCount(paper: WorkReference): number {
  return paper.citedByCount || 0;
}