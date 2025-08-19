/**
 * Unit tests for search result ranking and relevance algorithms
 * Tests advanced scoring, personalization, and ranking strategies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Work, Author, Source, Institution, Authorship } from '../types';

// Mock entity types for testing
interface TestWork extends Partial<Work> {
  id: string;
  display_name: string;
  cited_by_count?: number;
  publication_year?: number;
  concepts?: Array<{ id: string; display_name: string; level: number; score: number }>;
  authorships?: Authorship[];
  open_access?: { 
    is_oa: boolean; 
    oa_status: "gold" | "green" | "hybrid" | "bronze" | "closed"; 
    oa_url?: string; 
    any_repository_has_fulltext: boolean; 
  };
  language?: string;
  type?: string;
  host_venue?: { id: string; display_name: string; is_core?: boolean };
  abstract_inverted_index?: Record<string, number[]>;
}

interface TestAuthor extends Partial<Author> {
  id: string;
  display_name: string;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: {
    h_index: number;
    i10_index: number;
    '2yr_mean_citedness': number;
  };
  last_known_institutions?: Institution[];
  topics?: Array<{ id: string; display_name: string; works_count: number; cited_by_count: number; ids: any; works_api_url: string; updated_date: string; created_date: string; level?: number; score?: number }>;
}

// Mock data for testing
const mockWorks: TestWork[] = [
  {
    id: 'W1',
    display_name: 'Machine Learning in Healthcare',
    cited_by_count: 150,
    publication_year: 2023,
    concepts: [
      { id: 'C1', display_name: 'Machine Learning', level: 2, score: 0.9 },
      { id: 'C2', display_name: 'Healthcare', level: 1, score: 0.8 },
    ],
    open_access: { is_oa: true, oa_status: 'gold', any_repository_has_fulltext: true },
    language: 'en',
    type: 'article',
    host_venue: { id: 'S1', display_name: 'Nature Medicine', is_core: true },
  },
  {
    id: 'W2', 
    display_name: 'Deep Learning Applications',
    cited_by_count: 200,
    publication_year: 2022,
    concepts: [
      { id: 'C1', display_name: 'Machine Learning', level: 2, score: 0.95 },
      { id: 'C3', display_name: 'Computer Vision', level: 2, score: 0.7 },
    ],
    open_access: { is_oa: false, oa_status: 'closed', any_repository_has_fulltext: false },
    language: 'en',
    type: 'article',
    host_venue: { id: 'S2', display_name: 'Journal of AI Research' },
  },
  {
    id: 'W3',
    display_name: 'Climate Change Impact Assessment',
    cited_by_count: 75,
    publication_year: 2024,
    concepts: [
      { id: 'C4', display_name: 'Climate Change', level: 1, score: 0.9 },
      { id: 'C5', display_name: 'Environmental Science', level: 1, score: 0.8 },
    ],
    open_access: { is_oa: true, oa_status: 'green', any_repository_has_fulltext: true },
    language: 'en',
    type: 'article',
  },
];

const mockAuthors: TestAuthor[] = [
  {
    id: 'A1',
    display_name: 'Dr. Jane Smith',
    works_count: 50,
    cited_by_count: 2500,
    summary_stats: {
      h_index: 25,
      i10_index: 40,
      '2yr_mean_citedness': 15.2,
    },
    topics: [
      { 
        id: 'C1', 
        display_name: 'Machine Learning', 
        works_count: 100,
        cited_by_count: 5000,
        ids: {},
        works_api_url: 'https://api.openalex.org/topics/C1/works',
        updated_date: '2024-01-01',
        created_date: '2024-01-01',
        level: 2, 
        score: 0.9 
      },
    ],
  },
  {
    id: 'A2',
    display_name: 'Prof. John Doe',
    works_count: 75,
    cited_by_count: 3000,
    summary_stats: {
      h_index: 30,
      i10_index: 55,
      '2yr_mean_citedness': 18.7,
    },
    topics: [
      { 
        id: 'C4', 
        display_name: 'Climate Change', 
        works_count: 200,
        cited_by_count: 8000,
        ids: {},
        works_api_url: 'https://api.openalex.org/topics/C4/works',
        updated_date: '2024-01-01',
        created_date: '2024-01-01',
        level: 1, 
        score: 0.95 
      },
    ],
  },
];

// Mock relevance ranking algorithms
export interface RelevanceScoreFactors {
  textRelevance: number;
  citationScore: number;
  recencyScore: number;
  authorityScore: number;
  accessibilityScore: number;
  conceptAlignment: number;
  userPersonalization: number;
}

export interface RankingOptions {
  query: string;
  userPreferences?: {
    favoriteFields?: string[];
    preferredLanguages?: string[];
    openAccessPreference?: boolean;
    recencyWeight?: number;
    citationWeight?: number;
  };
  searchType?: 'general' | 'academic' | 'recent' | 'highly-cited';
  boostFactors?: Partial<RelevanceScoreFactors>;
}

export interface RankedResult<T = any> {
  item: T;
  relevanceScore: number;
  scoreBreakdown: RelevanceScoreFactors;
  ranking: number;
  confidence: number;
}

// Mock implementation of relevance ranking system
export class RelevanceRankingSystem {
  private readonly DEFAULT_WEIGHTS: RelevanceScoreFactors = {
    textRelevance: 0.3,
    citationScore: 0.2,
    recencyScore: 0.15,
    authorityScore: 0.15,
    accessibilityScore: 0.1,
    conceptAlignment: 0.05,
    userPersonalization: 0.05,
  };

  calculateTextRelevance(query: string, item: TestWork | TestAuthor): number {
    const searchTerms = query.toLowerCase().split(/\s+/);
    const title = item.display_name.toLowerCase();
    
    // Exact match bonus
    if (title.includes(query.toLowerCase())) {
      return 1.0;
    }
    
    // Partial term matching
    const matchCount = searchTerms.filter(term => title.includes(term)).length;
    return matchCount / searchTerms.length;
  }

  calculateCitationScore(item: TestWork | TestAuthor): number {
    if ('cited_by_count' in item && item.cited_by_count) {
      // Logarithmic scaling for citation counts
      return Math.log10(item.cited_by_count + 1) / 4; // Normalize to 0-1
    }
    return 0;
  }

  calculateRecencyScore(item: TestWork): number {
    if (!item.publication_year) return 0;
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - item.publication_year;
    
    // Exponential decay for older papers
    return Math.exp(-age / 5); // 5-year half-life
  }

  calculateAuthorityScore(item: TestWork): number {
    // Check if published in high-impact venue
    if (item.host_venue?.is_core) {
      return 0.8;
    }
    
    // Consider venue prestige (simplified)
    if (item.host_venue?.display_name.includes('Nature') || 
        item.host_venue?.display_name.includes('Science')) {
      return 1.0;
    }
    
    return 0.3;
  }

  calculateAccessibilityScore(item: TestWork): number {
    if (item.open_access?.is_oa) {
      return 1.0;
    }
    return 0.2;
  }

  calculateConceptAlignment(query: string, item: TestWork | TestAuthor): number {
    const concepts = 'concepts' in item ? item.concepts : 'topics' in item ? item.topics : undefined;
    if (!concepts) return 0;
    
    const queryTerms = query.toLowerCase().split(/\s+/);
    let maxAlignment = 0;
    
    for (const concept of concepts) {
      const conceptName = concept.display_name.toLowerCase();
      const alignment = queryTerms.some(term => conceptName.includes(term)) 
        ? (concept.score ?? 0.5) 
        : 0;
      maxAlignment = Math.max(maxAlignment, alignment);
    }
    
    return maxAlignment;
  }

  calculateUserPersonalization(
    item: TestWork | TestAuthor, 
    userPreferences?: RankingOptions['userPreferences']
  ): number {
    if (!userPreferences) return 0;
    
    let score = 0;
    
    // Language preference
    if (userPreferences.preferredLanguages && 'language' in item) {
      if (userPreferences.preferredLanguages.includes(item.language || '')) {
        score += 0.3;
      }
    }
    
    // Open access preference
    if (userPreferences.openAccessPreference && 'open_access' in item) {
      if (item.open_access?.is_oa) {
        score += 0.4;
      }
    }
    
    // Field preference
    if (userPreferences.favoriteFields) {
      const concepts = 'concepts' in item ? item.concepts : 'topics' in item ? item.topics : undefined;
      if (concepts) {
        const hasPreferredConcept = concepts.some(concept =>
          userPreferences.favoriteFields!.some(field =>
            concept.display_name.toLowerCase().includes(field.toLowerCase())
          )
        );
        if (hasPreferredConcept) {
          score += 0.3;
        }
      }
    }
    
    return Math.min(score, 1.0);
  }

  rankResults<T extends TestWork | TestAuthor>(
    items: T[],
    options: RankingOptions
  ): RankedResult<T>[] {
    const weights = {
      ...this.DEFAULT_WEIGHTS,
      ...options.boostFactors,
    };
    
    // Apply user preference weights
    if (options.userPreferences) {
      if (options.userPreferences.recencyWeight !== undefined) {
        weights.recencyScore = options.userPreferences.recencyWeight;
      }
      if (options.userPreferences.citationWeight !== undefined) {
        weights.citationScore = options.userPreferences.citationWeight;
      }
    }
    
    const scoredResults = items.map((item, index): RankedResult<T> => {
      const scoreBreakdown: RelevanceScoreFactors = {
        textRelevance: this.calculateTextRelevance(options.query, item),
        citationScore: this.calculateCitationScore(item),
        recencyScore: 'publication_year' in item ? this.calculateRecencyScore(item as TestWork) : 0,
        authorityScore: 'host_venue' in item ? this.calculateAuthorityScore(item as TestWork) : 0,
        accessibilityScore: 'open_access' in item ? this.calculateAccessibilityScore(item as TestWork) : 0,
        conceptAlignment: this.calculateConceptAlignment(options.query, item),
        userPersonalization: this.calculateUserPersonalization(item, options.userPreferences),
      };
      
      // Calculate weighted relevance score
      const relevanceScore = Object.entries(scoreBreakdown).reduce(
        (total, [factor, score]) => total + score * weights[factor as keyof RelevanceScoreFactors],
        0
      );
      
      // Calculate confidence based on score distribution
      const variance = Object.values(scoreBreakdown).reduce((sum, score) => {
        const diff = score - relevanceScore;
        return sum + diff * diff;
      }, 0) / Object.values(scoreBreakdown).length;
      
      const confidence = Math.max(0, 1 - Math.sqrt(variance));
      
      return {
        item,
        relevanceScore,
        scoreBreakdown,
        ranking: index + 1, // Will be updated after sorting
        confidence,
      };
    });
    
    // Sort by relevance score
    const rankedResults = scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Update rankings
    rankedResults.forEach((result, index) => {
      result.ranking = index + 1;
    });
    
    return rankedResults;
  }

  // Diversity injection to prevent filter bubbles
  injectDiversity<T extends TestWork | TestAuthor>(
    rankedResults: RankedResult<T>[],
    diversityFactor: number = 0.2
  ): RankedResult<T>[] {
    if (diversityFactor <= 0) return rankedResults;
    
    const diversitySlots = Math.floor(rankedResults.length * diversityFactor);
    const topResults = rankedResults.slice(0, rankedResults.length - diversitySlots);
    const diversityPool = rankedResults.slice(rankedResults.length - diversitySlots);
    
    // Shuffle diversity pool
    const shuffledDiversity = diversityPool.sort(() => Math.random() - 0.5);
    
    // Interleave diversity results
    const result: RankedResult<T>[] = [];
    const diversityInterval = Math.floor(topResults.length / shuffledDiversity.length) || 1;
    
    let diversityIndex = 0;
    for (let i = 0; i < topResults.length; i++) {
      result.push(topResults[i]);
      
      if ((i + 1) % diversityInterval === 0 && diversityIndex < shuffledDiversity.length) {
        result.push(shuffledDiversity[diversityIndex]);
        diversityIndex++;
      }
    }
    
    // Add remaining diversity results
    while (diversityIndex < shuffledDiversity.length) {
      result.push(shuffledDiversity[diversityIndex]);
      diversityIndex++;
    }
    
    return result;
  }
}

describe('Relevance Ranking System', () => {
  let rankingSystem: RelevanceRankingSystem;

  beforeEach(() => {
    rankingSystem = new RelevanceRankingSystem();
  });

  describe('Text Relevance Calculation', () => {
    it('should score exact title matches highest', () => {
      const work = mockWorks[0]; // 'Machine Learning in Healthcare'
      const exactScore = rankingSystem.calculateTextRelevance('Machine Learning in Healthcare', work);
      const partialScore = rankingSystem.calculateTextRelevance('Machine Learning', work);
      const noMatchScore = rankingSystem.calculateTextRelevance('Climate Change', work);

      expect(exactScore).toBe(1.0);
      expect(partialScore).toBeGreaterThan(0);
      expect(partialScore).toBeLessThan(1.0);
      expect(noMatchScore).toBe(0);
    });

    it('should calculate partial matches proportionally', () => {
      const work = mockWorks[0]; // 'Machine Learning in Healthcare'
      const twoTermScore = rankingSystem.calculateTextRelevance('Machine Healthcare', work);
      const oneTermScore = rankingSystem.calculateTextRelevance('Machine Climate', work);

      expect(twoTermScore).toBe(1.0); // 2/2 terms match
      expect(oneTermScore).toBe(0.5); // 1/2 terms match
    });

    it('should be case insensitive', () => {
      const work = mockWorks[0];
      const lowercaseScore = rankingSystem.calculateTextRelevance('machine learning', work);
      const uppercaseScore = rankingSystem.calculateTextRelevance('MACHINE LEARNING', work);
      const mixedCaseScore = rankingSystem.calculateTextRelevance('Machine LEARNING', work);

      expect(lowercaseScore).toBe(uppercaseScore);
      expect(lowercaseScore).toBe(mixedCaseScore);
    });
  });

  describe('Citation Score Calculation', () => {
    it('should use logarithmic scaling for citation counts', () => {
      const highCitedWork = { ...mockWorks[1], cited_by_count: 1000 };
      const medCitedWork = { ...mockWorks[0], cited_by_count: 100 };
      const lowCitedWork = { ...mockWorks[2], cited_by_count: 10 };

      const highScore = rankingSystem.calculateCitationScore(highCitedWork);
      const medScore = rankingSystem.calculateCitationScore(medCitedWork);
      const lowScore = rankingSystem.calculateCitationScore(lowCitedWork);

      expect(highScore).toBeGreaterThan(medScore);
      expect(medScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeLessThanOrEqual(1.0);
    });

    it('should handle zero citations gracefully', () => {
      const uncitedWork = { ...mockWorks[0], cited_by_count: 0 };
      const score = rankingSystem.calculateCitationScore(uncitedWork);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should work for both works and authors', () => {
      const work = mockWorks[1];
      const author = mockAuthors[0];

      const workScore = rankingSystem.calculateCitationScore(work);
      const authorScore = rankingSystem.calculateCitationScore(author);

      expect(workScore).toBeGreaterThanOrEqual(0);
      expect(authorScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recency Score Calculation', () => {
    it('should favor recent publications', () => {
      const currentYear = new Date().getFullYear();
      const recentWork = { ...mockWorks[0], publication_year: currentYear };
      const oldWork = { ...mockWorks[0], publication_year: currentYear - 10 };

      const recentScore = rankingSystem.calculateRecencyScore(recentWork);
      const oldScore = rankingSystem.calculateRecencyScore(oldWork);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should use exponential decay for aging', () => {
      const currentYear = new Date().getFullYear();
      const thisYearWork = { ...mockWorks[0], publication_year: currentYear };
      const lastYearWork = { ...mockWorks[0], publication_year: currentYear - 1 };
      const fiveYearOldWork = { ...mockWorks[0], publication_year: currentYear - 5 };

      const thisYearScore = rankingSystem.calculateRecencyScore(thisYearWork);
      const lastYearScore = rankingSystem.calculateRecencyScore(lastYearWork);
      const fiveYearScore = rankingSystem.calculateRecencyScore(fiveYearOldWork);

      expect(thisYearScore).toBeGreaterThan(lastYearScore);
      expect(lastYearScore).toBeGreaterThan(fiveYearScore);
      expect(fiveYearScore).toBeGreaterThan(0); // Should not be zero
    });

    it('should handle missing publication year', () => {
      const workWithoutYear = { ...mockWorks[0] };
      delete workWithoutYear.publication_year;

      const score = rankingSystem.calculateRecencyScore(workWithoutYear);
      expect(score).toBe(0);
    });
  });

  describe('Authority Score Calculation', () => {
    it('should recognize high-impact venues', () => {
      const coreVenueWork = { ...mockWorks[0], host_venue: { id: 'S1', display_name: 'Nature', is_core: true } };
      const prestigeVenueWork = { ...mockWorks[0], host_venue: { id: 'S2', display_name: 'Science Advances' } };
      const regularVenueWork = { ...mockWorks[0], host_venue: { id: 'S3', display_name: 'Regular Journal' } };

      const coreScore = rankingSystem.calculateAuthorityScore(coreVenueWork);
      const prestigeScore = rankingSystem.calculateAuthorityScore(prestigeVenueWork);
      const regularScore = rankingSystem.calculateAuthorityScore(regularVenueWork);

      expect(coreScore).toBeGreaterThan(regularScore);
      expect(prestigeScore).toBeGreaterThan(regularScore);
    });

    it('should handle works without venue information', () => {
      const workWithoutVenue = { ...mockWorks[0] };
      delete workWithoutVenue.host_venue;

      const score = rankingSystem.calculateAuthorityScore(workWithoutVenue);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Accessibility Score Calculation', () => {
    it('should favor open access publications', () => {
      const openAccessWork = { ...mockWorks[0], open_access: { is_oa: true, oa_status: 'gold' as const, any_repository_has_fulltext: true } };
      const closedAccessWork = { ...mockWorks[0], open_access: { is_oa: false, oa_status: 'closed' as const, any_repository_has_fulltext: false } };

      const openScore = rankingSystem.calculateAccessibilityScore(openAccessWork);
      const closedScore = rankingSystem.calculateAccessibilityScore(closedAccessWork);

      expect(openScore).toBeGreaterThan(closedScore);
      expect(openScore).toBe(1.0);
    });

    it('should handle missing open access information', () => {
      const workWithoutOA = { ...mockWorks[0] };
      delete workWithoutOA.open_access;

      const score = rankingSystem.calculateAccessibilityScore(workWithoutOA);
      expect(score).toBe(0.2); // Default score for unknown access
    });
  });

  describe('Concept Alignment Calculation', () => {
    it('should match query terms with concept names', () => {
      const mlWork = mockWorks[0]; // Has 'Machine Learning' concept
      const climateWork = mockWorks[2]; // Has 'Climate Change' concept

      const mlScore = rankingSystem.calculateConceptAlignment('machine learning', mlWork);
      const climateScore = rankingSystem.calculateConceptAlignment('climate change', climateWork);
      const noMatchScore = rankingSystem.calculateConceptAlignment('quantum physics', mlWork);

      expect(mlScore).toBeGreaterThan(0);
      expect(climateScore).toBeGreaterThan(0);
      expect(noMatchScore).toBe(0);
    });

    it('should use concept score for alignment strength', () => {
      const work = {
        ...mockWorks[0],
        concepts: [
          { id: 'C1', display_name: 'Machine Learning', level: 2, score: 0.9 },
          { id: 'C2', display_name: 'Machine Vision', level: 2, score: 0.3 },
        ],
      };

      const score = rankingSystem.calculateConceptAlignment('machine', work);
      expect(score).toBe(0.9); // Should use highest matching concept score
    });
  });

  describe('User Personalization', () => {
    it('should boost results based on language preferences', () => {
      const englishWork = { ...mockWorks[0], language: 'en' };
      const preferences = { preferredLanguages: ['en'] };

      const score = rankingSystem.calculateUserPersonalization(englishWork, preferences);
      expect(score).toBeGreaterThan(0);
    });

    it('should boost open access when preferred', () => {
      const openAccessWork = { ...mockWorks[0], open_access: { is_oa: true, oa_status: 'gold' as const, any_repository_has_fulltext: true } };
      const preferences = { openAccessPreference: true };

      const score = rankingSystem.calculateUserPersonalization(openAccessWork, preferences);
      expect(score).toBeGreaterThan(0);
    });

    it('should boost results matching favorite fields', () => {
      const mlWork = mockWorks[0]; // Has ML concepts
      const preferences = { favoriteFields: ['Machine Learning'] };

      const score = rankingSystem.calculateUserPersonalization(mlWork, preferences);
      expect(score).toBeGreaterThan(0);
    });

    it('should combine multiple preference factors', () => {
      const work = {
        ...mockWorks[0],
        language: 'en',
        open_access: { is_oa: true, oa_status: 'gold' as const, any_repository_has_fulltext: true },
        concepts: [{ id: 'C1', display_name: 'Machine Learning', level: 2, score: 0.9 }],
      };
      const preferences = {
        preferredLanguages: ['en'],
        openAccessPreference: true,
        favoriteFields: ['Machine Learning'],
      };

      const score = rankingSystem.calculateUserPersonalization(work, preferences);
      expect(score).toBe(1.0); // All factors match, but capped at 1.0
    });
  });

  describe('Complete Ranking System', () => {
    it('should rank results by combined relevance score', () => {
      const options: RankingOptions = {
        query: 'machine learning',
        userPreferences: {
          openAccessPreference: true,
          recencyWeight: 0.2,
          citationWeight: 0.3,
        },
      };

      const rankedResults = rankingSystem.rankResults(mockWorks, options);

      expect(rankedResults).toHaveLength(mockWorks.length);
      expect(rankedResults[0].ranking).toBe(1);
      
      // Results should be sorted by relevance score
      for (let i = 0; i < rankedResults.length - 1; i++) {
        expect(rankedResults[i].relevanceScore).toBeGreaterThanOrEqual(
          rankedResults[i + 1].relevanceScore
        );
      }
    });

    it('should provide detailed score breakdown', () => {
      const options: RankingOptions = { query: 'machine learning' };
      const rankedResults = rankingSystem.rankResults([mockWorks[0]], options);

      const result = rankedResults[0];
      expect(result.scoreBreakdown).toHaveProperty('textRelevance');
      expect(result.scoreBreakdown).toHaveProperty('citationScore');
      expect(result.scoreBreakdown).toHaveProperty('recencyScore');
      expect(result.scoreBreakdown).toHaveProperty('authorityScore');
      expect(result.scoreBreakdown).toHaveProperty('accessibilityScore');
      expect(result.scoreBreakdown).toHaveProperty('conceptAlignment');
      expect(result.scoreBreakdown).toHaveProperty('userPersonalization');
    });

    it('should calculate confidence scores', () => {
      const options: RankingOptions = { query: 'machine learning' };
      const rankedResults = rankingSystem.rankResults(mockWorks, options);

      rankedResults.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle different search types', () => {
      const academicOptions: RankingOptions = {
        query: 'machine learning',
        searchType: 'academic',
        boostFactors: { citationScore: 0.4, authorityScore: 0.3 },
      };

      const recentOptions: RankingOptions = {
        query: 'machine learning',
        searchType: 'recent',
        boostFactors: { recencyScore: 0.5 },
      };

      const academicResults = rankingSystem.rankResults(mockWorks, academicOptions);
      const recentResults = rankingSystem.rankResults(mockWorks, recentOptions);

      // Different search types should potentially produce different rankings
      expect(academicResults[0].item.id).not.toBeUndefined();
      expect(recentResults[0].item.id).not.toBeUndefined();
    });

    it('should work with different entity types', () => {
      const workOptions: RankingOptions = { query: 'machine learning' };
      const authorOptions: RankingOptions = { query: 'jane smith' };

      const workResults = rankingSystem.rankResults(mockWorks, workOptions);
      const authorResults = rankingSystem.rankResults(mockAuthors, authorOptions);

      expect(workResults.length).toBeGreaterThan(0);
      expect(authorResults.length).toBeGreaterThan(0);
      
      // Author results should have different score breakdowns
      expect(authorResults[0].scoreBreakdown.recencyScore).toBe(0);
      expect(authorResults[0].scoreBreakdown.authorityScore).toBe(0);
    });
  });

  describe('Diversity Injection', () => {
    it('should inject diversity to prevent filter bubbles', () => {
      const rankedResults = [
        { item: mockWorks[0], relevanceScore: 0.9, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 1, confidence: 0.8 },
        { item: mockWorks[1], relevanceScore: 0.8, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 2, confidence: 0.7 },
        { item: mockWorks[2], relevanceScore: 0.7, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 3, confidence: 0.6 },
      ];

      const diverseResults = rankingSystem.injectDiversity(rankedResults, 0.3);

      expect(diverseResults).toHaveLength(rankedResults.length);
      // Order should be different due to diversity injection
      expect(diverseResults).not.toEqual(rankedResults);
    });

    it('should maintain top results when diversity factor is low', () => {
      const rankedResults = [
        { item: mockWorks[0], relevanceScore: 0.9, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 1, confidence: 0.8 },
        { item: mockWorks[1], relevanceScore: 0.8, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 2, confidence: 0.7 },
        { item: mockWorks[2], relevanceScore: 0.7, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 3, confidence: 0.6 },
      ];

      const diverseResults = rankingSystem.injectDiversity(rankedResults, 0.1);

      expect(diverseResults[0]).toBe(rankedResults[0]); // Top result should remain
    });

    it('should handle zero diversity factor', () => {
      const rankedResults = [
        { item: mockWorks[0], relevanceScore: 0.9, scoreBreakdown: {} as RelevanceScoreFactors, ranking: 1, confidence: 0.8 },
      ];

      const diverseResults = rankingSystem.injectDiversity(rankedResults, 0);

      expect(diverseResults).toEqual(rankedResults);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty result sets', () => {
      const options: RankingOptions = { query: 'test' };
      const rankedResults = rankingSystem.rankResults([], options);

      expect(rankedResults).toEqual([]);
    });

    it('should handle malformed entities gracefully', () => {
      const malformedWork = { id: 'W1' } as TestWork; // Missing required fields
      const options: RankingOptions = { query: 'test' };

      expect(() => rankingSystem.rankResults([malformedWork], options)).not.toThrow();
      
      const results = rankingSystem.rankResults([malformedWork], options);
      expect(results).toHaveLength(1);
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0);
    });

    it('should be performant with large result sets', () => {
      const largeWorkSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWorks[0],
        id: `W${i}`,
        display_name: `Work ${i}`,
        cited_by_count: Math.floor(Math.random() * 1000),
      }));

      const options: RankingOptions = { query: 'machine learning' };
      const startTime = performance.now();
      
      const rankedResults = rankingSystem.rankResults(largeWorkSet, options);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(rankedResults).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should produce stable rankings for identical scores', () => {
      const identicalWorks = [
        { ...mockWorks[0], id: 'W1' },
        { ...mockWorks[0], id: 'W2' },
        { ...mockWorks[0], id: 'W3' },
      ];

      const options: RankingOptions = { query: 'machine learning' };
      
      const results1 = rankingSystem.rankResults(identicalWorks, options);
      const results2 = rankingSystem.rankResults(identicalWorks, options);

      // Should produce consistent rankings
      expect(results1.map(r => r.item.id)).toEqual(results2.map(r => r.item.id));
    });
  });
});