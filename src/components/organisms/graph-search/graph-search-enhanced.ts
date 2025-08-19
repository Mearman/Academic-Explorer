/**
 * Enhanced graph search functionality with fuzzy matching, advanced filtering, and TF-IDF scoring
 * Provides comprehensive search capabilities for large citation networks
 */

import type { EntityGraphVertex, EntityType } from '@/types/entity-graph';

export type SearchMatchType = 'exact' | 'partial' | 'fuzzy' | 'metadata' | 'semantic';

export interface SearchResultWithScore {
  vertex: EntityGraphVertex;
  score: number;
  matchType: SearchMatchType;
  matchedFields?: string[];
  highlights?: Record<string, string>;
}

export interface AdvancedSearchFilters {
  entityTypes?: EntityType[];
  visitStatus?: 'all' | 'visited' | 'unvisited';
  citationRange?: { min?: number; max?: number };
  dateRange?: { from?: string; to?: string };
  hasExternalIds?: boolean;
  keywords?: string[];
  excludeIds?: string[];
}

export interface SearchOptions {
  threshold?: number;
  maxResults?: number;
  enableFuzzy?: boolean;
  searchFields?: string[];
  sortBy?: 'relevance' | 'citationCount' | 'visitCount' | 'alphabetical' | 'date';
  filters?: AdvancedSearchFilters;
  enableHighlighting?: boolean;
  caseSensitive?: boolean;
  useSemanticSearch?: boolean;
}

export interface GraphSearchOptions {
  debounceMs?: number;
  cacheSize?: number;
  onSearch?: (query: string, results: SearchResultWithScore[]) => void;
  onFilterChange?: (filters: AdvancedSearchFilters) => void;
}

export interface SearchIndex {
  termFrequency: Map<string, Map<string, number>>; // term -> vertex -> frequency
  documentFrequency: Map<string, number>; // term -> number of vertices containing term
  vertexTerms: Map<string, Set<string>>; // vertex -> terms
  totalVertices: number;
}

/**
 * Advanced fuzzy search engine with TF-IDF scoring
 */
export class FuzzySearchEngine {
  private vertices: EntityGraphVertex[];
  private searchIndex: SearchIndex;
  private searchHistory: string[] = [];
  private resultCache: Map<string, SearchResultWithScore[]> = new Map();
  private maxCacheSize: number;

  constructor(vertices: EntityGraphVertex[], options: { cacheSize?: number } = {}) {
    this.vertices = vertices;
    this.maxCacheSize = options.cacheSize || 100;
    this.searchIndex = buildSearchIndex(vertices);
  }

  /**
   * Search with TF-IDF scoring for better relevance ranking
   */
  searchWithTfIdf(query: string, options: SearchOptions = {}): SearchResultWithScore[] {
    const cacheKey = `${query}-${JSON.stringify(options)}`;
    
    if (this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey)!;
    }

    const terms = this.tokenize(query.toLowerCase());
    const results: SearchResultWithScore[] = [];

    for (const vertex of this.vertices) {
      const score = this.calculateTfIdfScore(vertex, terms);
      if (score > (options.threshold || 0.1)) {
        results.push({
          vertex,
          score,
          matchType: this.determineMatchType(vertex, query, score),
          matchedFields: this.getMatchedFields(vertex, terms),
        });
      }
    }

    const sortedResults = this.sortResults(results, options.sortBy);
    const limitedResults = options.maxResults 
      ? sortedResults.slice(0, options.maxResults)
      : sortedResults;

    // Cache results
    this.cacheResults(cacheKey, limitedResults);

    return limitedResults;
  }

  /**
   * Get search suggestions based on index terms
   */
  getSuggestions(query: string, maxSuggestions = 5): string[] {
    const queryLower = query.toLowerCase();
    const suggestions: Array<{ term: string; frequency: number }> = [];

    for (const [term, frequency] of this.searchIndex.documentFrequency) {
      if (term.startsWith(queryLower) && term !== queryLower) {
        suggestions.push({ term, frequency });
      }
    }

    return suggestions
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxSuggestions)
      .map(s => s.term);
  }

  /**
   * Add new vertex to search index
   */
  addToIndex(vertex: EntityGraphVertex): void {
    this.vertices.push(vertex);
    this.updateIndexForVertex(vertex, 'add');
    this.resultCache.clear(); // Invalidate cache
  }

  /**
   * Remove vertex from search index
   */
  removeFromIndex(vertexId: string): void {
    const vertexIndex = this.vertices.findIndex(v => v.id === vertexId);
    if (vertexIndex === -1) return;

    const vertex = this.vertices[vertexIndex];
    this.vertices.splice(vertexIndex, 1);
    this.updateIndexForVertex(vertex, 'remove');
    this.resultCache.clear(); // Invalidate cache
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Get cache information
   */
  getCacheSize(): number {
    return this.resultCache.size;
  }

  getCacheKeys(): string[] {
    return Array.from(this.resultCache.keys());
  }

  getIndexSize(): number {
    return this.searchIndex.totalVertices;
  }

  private calculateTfIdfScore(vertex: EntityGraphVertex, terms: string[]): number {
    let score = 0;
    const vertexTerms = this.searchIndex.vertexTerms.get(vertex.id) || new Set();

    for (const term of terms) {
      if (vertexTerms.has(term)) {
        const tf = this.getTermFrequency(vertex.id, term);
        const idf = this.getInverseDocumentFrequency(term);
        score += tf * idf;
      }
    }

    // Boost score for directly visited vertices
    if (vertex.directlyVisited) {
      score *= 1.2;
    }

    // Boost score based on citation count (logarithmic scaling)
    const citationBoost = Math.log((vertex.metadata.citedByCount || 0) + 1) / 10;
    score += citationBoost;

    return score;
  }

  private getTermFrequency(vertexId: string, term: string): number {
    const termMap = this.searchIndex.termFrequency.get(term);
    if (!termMap) return 0;
    
    const frequency = termMap.get(vertexId) || 0;
    const totalTerms = Array.from(this.searchIndex.vertexTerms.get(vertexId) || []).length;
    
    return totalTerms > 0 ? frequency / totalTerms : 0;
  }

  private getInverseDocumentFrequency(term: string): number {
    const documentFrequency = this.searchIndex.documentFrequency.get(term) || 0;
    return documentFrequency > 0 
      ? Math.log(this.searchIndex.totalVertices / documentFrequency)
      : 0;
  }

  private determineMatchType(vertex: EntityGraphVertex, query: string, score: number): SearchMatchType {
    const displayNameLower = vertex.displayName.toLowerCase();
    const queryLower = query.toLowerCase();

    if (displayNameLower === queryLower) return 'exact';
    if (displayNameLower.includes(queryLower)) return 'partial';
    if (this.isMetadataMatch(vertex, query)) return 'metadata';
    if (score > 0.5) return 'fuzzy';
    
    return 'semantic';
  }

  private isMetadataMatch(vertex: EntityGraphVertex, query: string): boolean {
    const queryLower = query.toLowerCase();
    return (
      vertex.metadata.url?.toLowerCase().includes(queryLower) ||
      vertex.id.toLowerCase().includes(queryLower)
    );
  }

  private getMatchedFields(vertex: EntityGraphVertex, terms: string[]): string[] {
    const matchedFields: string[] = [];
    const displayNameTerms = this.tokenize(vertex.displayName.toLowerCase());

    if (terms.some(term => displayNameTerms.includes(term))) {
      matchedFields.push('displayName');
    }

    if (vertex.metadata.url && terms.some(term => vertex.metadata.url!.toLowerCase().includes(term))) {
      matchedFields.push('url');
    }

    return matchedFields;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  private sortResults(results: SearchResultWithScore[], sortBy: string = 'relevance'): SearchResultWithScore[] {
    switch (sortBy) {
      case 'citationCount':
        return results.sort((a, b) => (b.vertex.metadata.citedByCount || 0) - (a.vertex.metadata.citedByCount || 0));
      case 'visitCount':
        return results.sort((a, b) => b.vertex.visitCount - a.vertex.visitCount);
      case 'alphabetical':
        return results.sort((a, b) => a.vertex.displayName.localeCompare(b.vertex.displayName));
      case 'date':
        return results.sort((a, b) => {
          const yearA = a.vertex.metadata.publicationYear || 0;
          const yearB = b.vertex.metadata.publicationYear || 0;
          return yearB - yearA;
        });
      case 'relevance':
      default:
        return results.sort((a, b) => b.score - a.score);
    }
  }

  private updateIndexForVertex(vertex: EntityGraphVertex, operation: 'add' | 'remove'): void {
    const terms = this.extractTermsFromVertex(vertex);

    if (operation === 'add') {
      this.searchIndex.vertexTerms.set(vertex.id, new Set(terms));
      this.searchIndex.totalVertices++;

      for (const term of terms) {
        // Update term frequency
        if (!this.searchIndex.termFrequency.has(term)) {
          this.searchIndex.termFrequency.set(term, new Map());
        }
        const termMap = this.searchIndex.termFrequency.get(term)!;
        termMap.set(vertex.id, (termMap.get(vertex.id) || 0) + 1);

        // Update document frequency
        this.searchIndex.documentFrequency.set(
          term,
          (this.searchIndex.documentFrequency.get(term) || 0) + 1
        );
      }
    } else {
      const vertexTerms = this.searchIndex.vertexTerms.get(vertex.id);
      if (vertexTerms) {
        for (const term of vertexTerms) {
          // Update term frequency
          const termMap = this.searchIndex.termFrequency.get(term);
          if (termMap) {
            termMap.delete(vertex.id);
            if (termMap.size === 0) {
              this.searchIndex.termFrequency.delete(term);
            }
          }

          // Update document frequency
          const docFreq = this.searchIndex.documentFrequency.get(term) || 0;
          if (docFreq > 1) {
            this.searchIndex.documentFrequency.set(term, docFreq - 1);
          } else {
            this.searchIndex.documentFrequency.delete(term);
          }
        }
        this.searchIndex.vertexTerms.delete(vertex.id);
        this.searchIndex.totalVertices--;
      }
    }
  }

  private extractTermsFromVertex(vertex: EntityGraphVertex): string[] {
    const text = [
      vertex.displayName,
      vertex.metadata.url || '',
      vertex.id,
    ].join(' ');

    return this.tokenize(text);
  }

  private cacheResults(key: string, results: SearchResultWithScore[]): void {
    if (this.resultCache.size >= this.maxCacheSize) {
      // Remove oldest cache entry (simple LRU)
      const firstKey = this.resultCache.keys().next().value;
      if (firstKey !== undefined) {
        this.resultCache.delete(firstKey);
      }
    }
    this.resultCache.set(key, results);
  }
}

/**
 * Build search index for TF-IDF calculation
 */
export function buildSearchIndex(vertices: EntityGraphVertex[]): SearchIndex {
  const index: SearchIndex = {
    termFrequency: new Map(),
    documentFrequency: new Map(),
    vertexTerms: new Map(),
    totalVertices: vertices.length,
  };

  for (const vertex of vertices) {
    const text = [
      vertex.displayName,
      vertex.metadata.url || '',
      vertex.id,
    ].join(' ');

    const terms = tokenizeText(text);
    const uniqueTerms = new Set(terms);
    
    index.vertexTerms.set(vertex.id, uniqueTerms);

    for (const term of terms) {
      // Update term frequency
      if (!index.termFrequency.has(term)) {
        index.termFrequency.set(term, new Map());
      }
      const termMap = index.termFrequency.get(term)!;
      termMap.set(vertex.id, (termMap.get(vertex.id) || 0) + 1);
    }

    for (const term of uniqueTerms) {
      // Update document frequency
      index.documentFrequency.set(
        term,
        (index.documentFrequency.get(term) || 0) + 1
      );
    }
  }

  return index;
}

/**
 * Simple fuzzy search with configurable options
 */
export function fuzzySearch(
  vertices: EntityGraphVertex[],
  query: string,
  options: SearchOptions = {}
): SearchResultWithScore[] {
  const {
    threshold = 0.3,
    maxResults = 50,
    enableFuzzy = true,
    searchFields = ['displayName'],
    enableHighlighting = false,
  } = options;

  if (!query.trim()) return [];

  const queryLower = query.toLowerCase();
  const results: SearchResultWithScore[] = [];

  for (const vertex of vertices) {
    let bestScore = 0;
    let matchType: SearchMatchType = 'partial';
    const matchedFields: string[] = [];

    // Search in specified fields
    for (const field of searchFields) {
      const fieldValue = getFieldValue(vertex, field);
      if (!fieldValue) continue;

      const fieldValueLower = fieldValue.toLowerCase();
      let score = 0;

      // Exact match
      if (fieldValueLower === queryLower) {
        score = 1.0;
        matchType = 'exact';
      }
      // Starts with query
      else if (fieldValueLower.startsWith(queryLower)) {
        score = 0.9;
        matchType = 'partial';
      }
      // Contains query
      else if (fieldValueLower.includes(queryLower)) {
        score = 0.7;
        matchType = 'partial';
      }
      // Fuzzy match
      else if (enableFuzzy) {
        score = calculateLevenshteinSimilarity(queryLower, fieldValueLower);
        if (score > threshold) {
          matchType = 'fuzzy';
        }
      }

      if (score > bestScore) {
        bestScore = score;
        if (score > threshold) {
          matchedFields.push(field);
        }
      }
    }

    if (bestScore >= threshold) {
      const result: SearchResultWithScore = {
        vertex,
        score: bestScore,
        matchType,
        matchedFields,
      };

      if (enableHighlighting) {
        result.highlights = createHighlights(vertex, query, matchedFields);
      }

      results.push(result);
    }
  }

  return sortSearchResults(results, options.sortBy).slice(0, maxResults);
}

/**
 * Advanced filtering functions
 */
export function filterByEntityType(vertices: EntityGraphVertex[], types: EntityType[]): EntityGraphVertex[] {
  return vertices.filter(vertex => types.includes(vertex.entityType));
}

export function filterByVisitStatus(vertices: EntityGraphVertex[], status: 'all' | 'visited' | 'unvisited'): EntityGraphVertex[] {
  if (status === 'all') return vertices;
  return vertices.filter(vertex => 
    status === 'visited' ? vertex.directlyVisited : !vertex.directlyVisited
  );
}

export function filterByCitationRange(vertices: EntityGraphVertex[], range: { min?: number; max?: number }): EntityGraphVertex[] {
  return vertices.filter(vertex => {
    const citations = vertex.metadata.citedByCount || 0;
    return (range.min === undefined || citations >= range.min) &&
           (range.max === undefined || citations <= range.max);
  });
}

export function filterByDate(vertices: EntityGraphVertex[], range: { from?: string; to?: string }): EntityGraphVertex[] {
  return vertices.filter(vertex => {
    const year = vertex.metadata.publicationYear || 0;
    const fromYear = range.from ? parseInt(range.from.split('-')[0]) : 0;
    const toYear = range.to ? parseInt(range.to.split('-')[0]) : 9999;
    
    return year >= fromYear && year <= toYear;
  });
}

/**
 * Sort search results by different criteria
 */
export function sortSearchResults(results: SearchResultWithScore[], sortBy: string = 'relevance'): SearchResultWithScore[] {
  switch (sortBy) {
    case 'citationCount':
      return results.sort((a, b) => (b.vertex.metadata.citedByCount || 0) - (a.vertex.metadata.citedByCount || 0));
    case 'visitCount':
      return results.sort((a, b) => b.vertex.visitCount - a.vertex.visitCount);
    case 'alphabetical':
      return results.sort((a, b) => a.vertex.displayName.localeCompare(b.vertex.displayName));
    case 'date':
      return results.sort((a, b) => {
        const yearA = a.vertex.metadata.publicationYear || 0;
        const yearB = b.vertex.metadata.publicationYear || 0;
        return yearB - yearA;
      });
    case 'relevance':
    default:
      return results.sort((a, b) => b.score - a.score);
  }
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerm(text: string, searchTerm: string, className = 'search-highlight'): string {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, `<mark class="${className}">$1</mark>`);
}

/**
 * Create advanced graph search instance
 */
export function createAdvancedGraphSearch(
  vertices: EntityGraphVertex[],
  options: GraphSearchOptions = {}
): {
  search: (query: string, searchOptions?: SearchOptions) => SearchResultWithScore[];
  searchWithFilters: (query: string, filters: AdvancedSearchFilters) => SearchResultWithScore[];
  getSuggestions: (query: string) => string[];
  getSearchHistory: () => string[];
  getCacheSize: () => number;
  getCacheKeys: () => string[];
} {
  const engine = new FuzzySearchEngine(vertices, { cacheSize: options.cacheSize });
  const { debounceMs = 300, onSearch } = options;
  
  let debounceTimer: NodeJS.Timeout | null = null;

  const debouncedSearch = (query: string, searchOptions: SearchOptions = {}) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const results = query.trim()
        ? engine.searchWithTfIdf(query, searchOptions)
        : applyFiltersOnly(vertices, searchOptions.filters);
      
      onSearch?.(query, results);
    }, debounceMs);

    // Return immediate results for synchronous usage
    return query.trim()
      ? engine.searchWithTfIdf(query, searchOptions)
      : applyFiltersOnly(vertices, searchOptions.filters);
  };

  return {
    search: debouncedSearch,
    searchWithFilters: (query: string, filters: AdvancedSearchFilters) => {
      return debouncedSearch(query, { filters });
    },
    getSuggestions: (query: string) => engine.getSuggestions(query),
    getSearchHistory: () => engine.getSearchHistory(),
    getCacheSize: () => engine.getCacheSize(),
    getCacheKeys: () => engine.getCacheKeys(),
  };
}

// Helper functions

function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
}

function getFieldValue(vertex: EntityGraphVertex, field: string): string | undefined {
  if (field.includes('.')) {
    const parts = field.split('.');
    let value: any = vertex;
    for (const part of parts) {
      value = value?.[part];
    }
    return typeof value === 'string' ? value : undefined;
  }
  return (vertex as any)[field];
}

function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

function createHighlights(vertex: EntityGraphVertex, query: string, fields: string[]): Record<string, string> {
  const highlights: Record<string, string> = {};
  
  for (const field of fields) {
    const value = getFieldValue(vertex, field);
    if (value) {
      highlights[field] = highlightSearchTerm(value, query);
    }
  }
  
  return highlights;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyFiltersOnly(vertices: EntityGraphVertex[], filters?: AdvancedSearchFilters): SearchResultWithScore[] {
  if (!filters) {
    return vertices.map(vertex => ({ vertex, score: 1, matchType: 'exact' as const }));
  }

  let filtered = vertices;

  if (filters.entityTypes) {
    filtered = filterByEntityType(filtered, filters.entityTypes);
  }

  if (filters.visitStatus && filters.visitStatus !== 'all') {
    filtered = filterByVisitStatus(filtered, filters.visitStatus);
  }

  if (filters.citationRange) {
    filtered = filterByCitationRange(filtered, filters.citationRange);
  }

  if (filters.dateRange) {
    filtered = filterByDate(filtered, filters.dateRange);
  }

  if (filters.excludeIds) {
    filtered = filtered.filter(vertex => !filters.excludeIds!.includes(vertex.id));
  }

  return filtered.map(vertex => ({ vertex, score: 1, matchType: 'exact' as const }));
}