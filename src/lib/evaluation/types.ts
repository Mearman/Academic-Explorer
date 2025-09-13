/**
 * Type definitions for STAR methodology integration
 * Used for systematic literature review evaluation and comparison
 */

/**
 * Reference to a work/paper in the literature
 */
export interface WorkReference {
  title: string;
  authors: string[];
  doi?: string;
  openalexId?: string;
  publicationYear?: number;
  source: string;
}

/**
 * Search strategy used in the systematic review
 */
export interface SearchCriteria {
  databases: string[];
  keywords: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  inclusionCriteria: string[];
  exclusionCriteria: string[];
}

/**
 * STAR methodology metadata
 */
export interface STARMethodology {
  prismaCompliant: boolean;
  screeningLevels: number;
  reviewersCount: number;
  conflictResolution: string;
}

/**
 * Complete STAR dataset containing systematic review data
 */
export interface STARDataset {
  id: string;
  name: string;
  uploadDate: Date;
  reviewTopic: string;
  originalPaperCount: number;
  includedPapers: WorkReference[];
  excludedPapers: WorkReference[];
  searchStrategy: SearchCriteria;
  methodology: STARMethodology;
  metadata?: {
    description?: string;
    methodology?: string;
    dateRange?: string;
    originalSource?: string;
  };
}

/**
 * Results of comparing Academic Explorer against STAR dataset
 */
export interface ComparisonResults {
  dataset: STARDataset;
  academicExplorerResults: WorkReference[];
  truePositives: WorkReference[];
  falsePositives: WorkReference[];
  falseNegatives: WorkReference[];
  precision: number;
  recall: number;
  f1Score: number;
  additionalPapersFound: WorkReference[];
}

/**
 * Matching results when comparing papers
 */
export interface MatchingResults {
  truePositives: WorkReference[];
  falsePositives: WorkReference[];
  falseNegatives: WorkReference[];
}

/**
 * Configuration for paper matching algorithms
 */
export interface MatchingConfig {
  titleSimilarityThreshold: number;
  authorMatchThreshold: number;
  yearToleranceYears: number;
  requireExactDOI: boolean;
  useFuzzyMatching: boolean;
}

/**
 * Progress tracking for long-running comparison operations
 */
export interface ComparisonProgress {
  stage: 'searching' | 'matching' | 'calculating' | 'complete';
  progress: number; // 0-100
  message: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
}