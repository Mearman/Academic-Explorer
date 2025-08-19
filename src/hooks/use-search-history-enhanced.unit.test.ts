/**
 * Unit tests for enhanced search history and suggestion management
 * Tests intelligent history tracking, personalized suggestions, and advanced search patterns
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/hooks/use-hybrid-storage', () => ({
  useHybridStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  })),
}));

// Types for enhanced search history
export interface SearchEntry {
  id: string;
  query: string;
  filters: Record<string, any>;
  timestamp: Date;
  resultCount: number;
  clickedResults: string[];
  sessionId: string;
  duration: number;
  success: boolean;
  userRating?: number;
  tags: string[];
  context: 'quick_search' | 'advanced_search' | 'autocomplete' | 'suggestion';
}

export interface SearchPattern {
  pattern: string;
  frequency: number;
  lastUsed: Date;
  successRate: number;
  avgResultCount: number;
  relatedQueries: string[];
  userSatisfaction: number;
}

export interface PersonalizedSuggestion {
  id: string;
  query: string;
  confidence: number;
  reasoning: string[];
  basedOn: 'history' | 'trends' | 'similar_users' | 'domain_knowledge';
  category: 'recent' | 'frequent' | 'trending' | 'recommended' | 'autocomplete';
  metadata: {
    estimatedResults: number;
    complexity: 'simple' | 'intermediate' | 'advanced';
    timeframe: 'immediate' | 'short_term' | 'long_term';
  };
}

export interface SearchInsights {
  totalSearches: number;
  uniqueQueries: number;
  avgSessionDuration: number;
  successRate: number;
  mostPopularFilters: Record<string, number>;
  searchPatterns: SearchPattern[];
  timeDistribution: Record<string, number>;
  topDomains: string[];
  improvementSuggestions: string[];
}

// Mock implementation of enhanced search history system
export class EnhancedSearchHistoryManager {
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly PATTERN_MIN_FREQUENCY = 3;
  private readonly SUGGESTION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async saveSearchEntry(entry: Partial<SearchEntry>): Promise<void> {
    const fullEntry: SearchEntry = {
      id: entry.id || this.generateEntryId(),
      query: entry.query || '',
      filters: entry.filters || {},
      timestamp: entry.timestamp || new Date(),
      resultCount: entry.resultCount || 0,
      clickedResults: entry.clickedResults || [],
      sessionId: entry.sessionId || this.getCurrentSessionId(),
      duration: entry.duration || 0,
      success: entry.success ?? false,
      userRating: entry.userRating,
      tags: entry.tags || [],
      context: entry.context || 'quick_search',
    };

    // Save to storage and maintain size limit
    await this.addToHistory(fullEntry);
    await this.trimHistorySize();
    await this.updatePatterns(fullEntry);
  }

  async getSearchHistory(limit?: number): Promise<SearchEntry[]> {
    const history = await this.loadHistory();
    const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sortedHistory.slice(0, limit) : sortedHistory;
  }

  async getRecentSearches(hours: number = 24): Promise<SearchEntry[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const history = await this.getSearchHistory();
    return history.filter(entry => entry.timestamp > cutoff);
  }

  async getFrequentSearches(minCount: number = 3): Promise<SearchPattern[]> {
    const patterns = await this.getSearchPatterns();
    return patterns.filter(pattern => pattern.frequency >= minCount);
  }

  async generatePersonalizedSuggestions(
    context: string = '',
    limit: number = 10
  ): Promise<PersonalizedSuggestion[]> {
    const suggestions: PersonalizedSuggestion[] = [];

    // Recent searches
    const recentSuggestions = await this.getRecentBasedSuggestions(limit / 4);
    suggestions.push(...recentSuggestions);

    // Frequent patterns
    const patternSuggestions = await this.getPatternBasedSuggestions(limit / 4);
    suggestions.push(...patternSuggestions);

    // Trending queries
    const trendingSuggestions = await this.getTrendingSuggestions(limit / 4);
    suggestions.push(...trendingSuggestions);

    // Domain knowledge
    const domainSuggestions = await this.getDomainBasedSuggestions(context, limit / 4);
    suggestions.push(...domainSuggestions);

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  async getSearchInsights(): Promise<SearchInsights> {
    const history = await this.getSearchHistory();
    const patterns = await this.getSearchPatterns();

    const totalSearches = history.length;
    const uniqueQueries = new Set(history.map(h => h.query)).size;
    const avgSessionDuration = history.reduce((sum, h) => sum + h.duration, 0) / totalSearches;
    const successRate = history.filter(h => h.success).length / totalSearches;

    const filterCounts: Record<string, number> = {};
    history.forEach(entry => {
      Object.keys(entry.filters).forEach(filter => {
        filterCounts[filter] = (filterCounts[filter] || 0) + 1;
      });
    });

    const timeDistribution: Record<string, number> = {};
    history.forEach(entry => {
      const hour = entry.timestamp.getHours();
      const timeSlot = this.getTimeSlot(hour);
      timeDistribution[timeSlot] = (timeDistribution[timeSlot] || 0) + 1;
    });

    const topDomains = this.extractTopDomains(history);
    const improvementSuggestions = this.generateImprovementSuggestions(history, patterns);

    return {
      totalSearches,
      uniqueQueries,
      avgSessionDuration,
      successRate,
      mostPopularFilters: filterCounts,
      searchPatterns: patterns,
      timeDistribution,
      topDomains,
      improvementSuggestions,
    };
  }

  async clearHistory(): Promise<void> {
    await this.storage.clear();
  }

  async removeSearchEntry(entryId: string): Promise<void> {
    const history = await this.loadHistory();
    const updatedHistory = history.filter(entry => entry.id !== entryId);
    await this.saveHistory(updatedHistory);
  }

  async updateSearchRating(entryId: string, rating: number): Promise<void> {
    const history = await this.loadHistory();
    const entry = history.find(h => h.id === entryId);
    if (entry) {
      entry.userRating = rating;
      await this.saveHistory(history);
      await this.updatePatterns(entry);
    }
  }

  async tagSearchEntry(entryId: string, tags: string[]): Promise<void> {
    const history = await this.loadHistory();
    const entry = history.find(h => h.id === entryId);
    if (entry) {
      entry.tags = [...new Set([...entry.tags, ...tags])];
      await this.saveHistory(history);
    }
  }

  async searchHistory(query: string): Promise<SearchEntry[]> {
    const history = await this.getSearchHistory();
    const lowercaseQuery = query.toLowerCase();
    
    return history.filter(entry =>
      entry.query.toLowerCase().includes(lowercaseQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  async exportHistory(): Promise<string> {
    const history = await this.getSearchHistory();
    const insights = await this.getSearchInsights();
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      searchHistory: history,
      insights,
      version: '1.0',
    }, null, 2);
  }

  async importHistory(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      if (parsed.searchHistory && Array.isArray(parsed.searchHistory)) {
        // Validate and import entries
        const validEntries = parsed.searchHistory.filter(this.validateSearchEntry);
        await this.saveHistory(validEntries);
        await this.rebuildPatterns();
      }
    } catch (error) {
      throw new Error('Invalid history data format');
    }
  }

  // Private methods (simplified implementations for testing)
  private storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  private generateEntryId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentSessionId(): string {
    return `session_${Date.now()}`;
  }

  private async addToHistory(entry: SearchEntry): Promise<void> {
    const history = await this.loadHistory();
    history.unshift(entry);
    await this.saveHistory(history);
  }

  private async loadHistory(): Promise<SearchEntry[]> {
    try {
      const data = await this.storage.getItem('search_history');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async saveHistory(history: SearchEntry[]): Promise<void> {
    await this.storage.setItem('search_history', JSON.stringify(history));
  }

  private async trimHistorySize(): Promise<void> {
    const history = await this.loadHistory();
    if (history.length > this.MAX_HISTORY_SIZE) {
      const trimmed = history.slice(0, this.MAX_HISTORY_SIZE);
      await this.saveHistory(trimmed);
    }
  }

  private async updatePatterns(entry: SearchEntry): Promise<void> {
    // Simplified pattern update logic
    const patterns = await this.getSearchPatterns();
    const existingPattern = patterns.find(p => p.pattern === entry.query);
    
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = entry.timestamp;
      existingPattern.successRate = this.calculateSuccessRate(existingPattern, entry);
    } else if (patterns.length < 100) { // Limit pattern storage
      patterns.push({
        pattern: entry.query,
        frequency: 1,
        lastUsed: entry.timestamp,
        successRate: entry.success ? 1 : 0,
        avgResultCount: entry.resultCount,
        relatedQueries: [],
        userSatisfaction: entry.userRating || 0,
      });
    }
    
    await this.storage.setItem('search_patterns', JSON.stringify(patterns));
  }

  private async getSearchPatterns(): Promise<SearchPattern[]> {
    try {
      const data = await this.storage.getItem('search_patterns');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private calculateSuccessRate(pattern: SearchPattern, newEntry: SearchEntry): number {
    const totalEntries = pattern.frequency;
    const successfulEntries = Math.round(pattern.successRate * (totalEntries - 1)) + (newEntry.success ? 1 : 0);
    return successfulEntries / totalEntries;
  }

  private async getRecentBasedSuggestions(limit: number): Promise<PersonalizedSuggestion[]> {
    const recent = await this.getRecentSearches(72); // Last 3 days
    const suggestions: PersonalizedSuggestion[] = [];
    
    // Get unique recent queries
    const uniqueRecent = Array.from(new Set(recent.map(r => r.query)))
      .slice(0, limit)
      .map((query, index) => ({
        id: `recent_${index}`,
        query,
        confidence: 0.8,
        reasoning: ['Recently searched'],
        basedOn: 'history' as const,
        category: 'recent' as const,
        metadata: {
          estimatedResults: recent.find(r => r.query === query)?.resultCount || 0,
          complexity: 'simple' as const,
          timeframe: 'immediate' as const,
        },
      }));
    
    return uniqueRecent;
  }

  private async getPatternBasedSuggestions(limit: number): Promise<PersonalizedSuggestion[]> {
    const patterns = await this.getFrequentSearches();
    
    return patterns.slice(0, limit).map((pattern, index) => ({
      id: `pattern_${index}`,
      query: pattern.pattern,
      confidence: Math.min(0.9, 0.5 + (pattern.frequency * 0.1)),
      reasoning: [`Searched ${pattern.frequency} times`, `${Math.round(pattern.successRate * 100)}% success rate`],
      basedOn: 'history' as const,
      category: 'frequent' as const,
      metadata: {
        estimatedResults: pattern.avgResultCount,
        complexity: 'intermediate' as const,
        timeframe: 'short_term' as const,
      },
    }));
  }

  private async getTrendingSuggestions(limit: number): Promise<PersonalizedSuggestion[]> {
    // Mock trending suggestions
    const trending = [
      'artificial intelligence 2024',
      'climate change research',
      'quantum computing advances',
      'machine learning healthcare',
    ];
    
    return trending.slice(0, limit).map((query, index) => ({
      id: `trending_${index}`,
      query,
      confidence: 0.7,
      reasoning: ['Trending in academic research'],
      basedOn: 'trends' as const,
      category: 'trending' as const,
      metadata: {
        estimatedResults: 1000 + Math.random() * 5000,
        complexity: 'intermediate' as const,
        timeframe: 'short_term' as const,
      },
    }));
  }

  private async getDomainBasedSuggestions(context: string, limit: number): Promise<PersonalizedSuggestion[]> {
    // Mock domain-based suggestions
    const domainSuggestions = [
      'systematic review methodology',
      'meta-analysis techniques',
      'research reproducibility',
      'open science practices',
    ];
    
    return domainSuggestions.slice(0, limit).map((query, index) => ({
      id: `domain_${index}`,
      query,
      confidence: 0.6,
      reasoning: ['Based on academic research patterns'],
      basedOn: 'domain_knowledge' as const,
      category: 'recommended' as const,
      metadata: {
        estimatedResults: 500 + Math.random() * 2000,
        complexity: 'advanced' as const,
        timeframe: 'long_term' as const,
      },
    }));
  }

  private getTimeSlot(hour: number): string {
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private extractTopDomains(history: SearchEntry[]): string[] {
    const domainCounts: Record<string, number> = {};
    
    history.forEach(entry => {
      entry.clickedResults.forEach(result => {
        try {
          const url = new URL(result);
          const domain = url.hostname;
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch {
          // Invalid URL, skip
        }
      });
    });
    
    return Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain]) => domain);
  }

  private generateImprovementSuggestions(history: SearchEntry[], patterns: SearchPattern[]): string[] {
    const suggestions: string[] = [];
    
    const avgSuccess = history.filter(h => h.success).length / history.length;
    if (avgSuccess < 0.7) {
      suggestions.push('Try using more specific search terms for better results');
    }
    
    const avgDuration = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
    if (avgDuration > 300000) { // 5 minutes
      suggestions.push('Consider using advanced search filters to find results faster');
    }
    
    const hasAdvancedSearches = history.some(h => h.context === 'advanced_search');
    if (!hasAdvancedSearches && history.length > 10) {
      suggestions.push('Try using the advanced search builder for more precise queries');
    }
    
    return suggestions;
  }

  private validateSearchEntry(entry: any): boolean {
    return (
      entry &&
      typeof entry.id === 'string' &&
      typeof entry.query === 'string' &&
      entry.timestamp &&
      typeof entry.resultCount === 'number'
    );
  }

  private async rebuildPatterns(): Promise<void> {
    const history = await this.getSearchHistory();
    const patterns: SearchPattern[] = [];
    
    // Group by query
    const queryGroups = history.reduce((groups: Record<string, SearchEntry[]>, entry) => {
      if (!groups[entry.query]) {
        groups[entry.query] = [];
      }
      groups[entry.query].push(entry);
      return groups;
    }, {});
    
    // Build patterns
    Object.entries(queryGroups).forEach(([query, entries]) => {
      if (entries.length >= this.PATTERN_MIN_FREQUENCY) {
        const successCount = entries.filter(e => e.success).length;
        const avgResults = entries.reduce((sum, e) => sum + e.resultCount, 0) / entries.length;
        const lastUsed = new Date(Math.max(...entries.map(e => e.timestamp.getTime())));
        
        patterns.push({
          pattern: query,
          frequency: entries.length,
          lastUsed,
          successRate: successCount / entries.length,
          avgResultCount: avgResults,
          relatedQueries: [],
          userSatisfaction: entries.reduce((sum, e) => sum + (e.userRating || 0), 0) / entries.length,
        });
      }
    });
    
    await this.storage.setItem('search_patterns', JSON.stringify(patterns));
  }
}

// Hook for using enhanced search history
export function useEnhancedSearchHistory() {
  const manager = new EnhancedSearchHistoryManager();
  
  return {
    saveSearch: manager.saveSearchEntry.bind(manager),
    getHistory: manager.getSearchHistory.bind(manager),
    getRecentSearches: manager.getRecentSearches.bind(manager),
    getFrequentSearches: manager.getFrequentSearches.bind(manager),
    generateSuggestions: manager.generatePersonalizedSuggestions.bind(manager),
    getInsights: manager.getSearchInsights.bind(manager),
    clearHistory: manager.clearHistory.bind(manager),
    removeEntry: manager.removeSearchEntry.bind(manager),
    rateSearch: manager.updateSearchRating.bind(manager),
    tagSearch: manager.tagSearchEntry.bind(manager),
    searchHistory: manager.searchHistory.bind(manager),
    exportHistory: manager.exportHistory.bind(manager),
    importHistory: manager.importHistory.bind(manager),
  };
}

describe('Enhanced Search History Management', () => {
  let manager: EnhancedSearchHistoryManager;

  beforeEach(() => {
    manager = new EnhancedSearchHistoryManager();
    vi.clearAllMocks();
  });

  describe('Search Entry Management', () => {
    it('should save search entries with complete metadata', async () => {
      const entry: Partial<SearchEntry> = {
        query: 'machine learning',
        filters: { publication_year: '2023' },
        resultCount: 150,
        success: true,
        duration: 45000,
        context: 'advanced_search',
      };

      await manager.saveSearchEntry(entry);

      const history = await manager.getSearchHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('machine learning');
      expect(history[0].filters).toEqual({ publication_year: '2023' });
      expect(history[0].success).toBe(true);
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for entries', async () => {
      const entry1 = { query: 'test 1' };
      const entry2 = { query: 'test 2' };

      await manager.saveSearchEntry(entry1);
      await manager.saveSearchEntry(entry2);

      const history = await manager.getSearchHistory();
      expect(history[0].id).not.toBe(history[1].id);
    });

    it('should maintain search history order by timestamp', async () => {
      const oldEntry = { query: 'old query', timestamp: new Date('2023-01-01') };
      const newEntry = { query: 'new query', timestamp: new Date('2023-12-31') };

      await manager.saveSearchEntry(oldEntry);
      await manager.saveSearchEntry(newEntry);

      const history = await manager.getSearchHistory();
      expect(history[0].query).toBe('new query'); // Most recent first
      expect(history[1].query).toBe('old query');
    });

    it('should limit history size to prevent storage bloat', async () => {
      // Mock MAX_HISTORY_SIZE to be smaller for testing
      const originalMaxSize = (manager as any).MAX_HISTORY_SIZE;
      (manager as any).MAX_HISTORY_SIZE = 3;

      for (let i = 0; i < 5; i++) {
        await manager.saveSearchEntry({ query: `query ${i}` });
      }

      const history = await manager.getSearchHistory();
      expect(history.length).toBeLessThanOrEqual(3);

      // Restore original size
      (manager as any).MAX_HISTORY_SIZE = originalMaxSize;
    });

    it('should update search ratings', async () => {
      const entry = { query: 'test query' };
      await manager.saveSearchEntry(entry);

      const history = await manager.getSearchHistory();
      const entryId = history[0].id;

      await manager.updateSearchRating(entryId, 4);

      const updatedHistory = await manager.getSearchHistory();
      expect(updatedHistory[0].userRating).toBe(4);
    });

    it('should add tags to search entries', async () => {
      const entry = { query: 'test query', tags: ['initial'] };
      await manager.saveSearchEntry(entry);

      const history = await manager.getSearchHistory();
      const entryId = history[0].id;

      await manager.tagSearchEntry(entryId, ['ai', 'research']);

      const updatedHistory = await manager.getSearchHistory();
      expect(updatedHistory[0].tags).toEqual(['initial', 'ai', 'research']);
    });

    it('should remove duplicate tags', async () => {
      const entry = { query: 'test query', tags: ['ai'] };
      await manager.saveSearchEntry(entry);

      const history = await manager.getSearchHistory();
      const entryId = history[0].id;

      await manager.tagSearchEntry(entryId, ['ai', 'ml', 'ai']);

      const updatedHistory = await manager.getSearchHistory();
      expect(updatedHistory[0].tags).toEqual(['ai', 'ml']);
    });
  });

  describe('Search Pattern Analysis', () => {
    it('should identify frequent search patterns', async () => {
      // Add multiple searches for the same query
      for (let i = 0; i < 5; i++) {
        await manager.saveSearchEntry({
          query: 'machine learning',
          success: i < 4, // 80% success rate
          resultCount: 100 + i * 10,
        });
      }

      const patterns = await manager.getFrequentSearches(3);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('machine learning');
      expect(patterns[0].frequency).toBe(5);
      expect(patterns[0].successRate).toBe(0.8);
    });

    it('should calculate accurate success rates for patterns', async () => {
      const query = 'test pattern';
      
      // 3 successful, 2 failed searches
      await manager.saveSearchEntry({ query, success: true });
      await manager.saveSearchEntry({ query, success: true });
      await manager.saveSearchEntry({ query, success: false });
      await manager.saveSearchEntry({ query, success: true });
      await manager.saveSearchEntry({ query, success: false });

      const patterns = await manager.getFrequentSearches(3);
      const pattern = patterns.find(p => p.pattern === query);
      
      expect(pattern?.successRate).toBe(0.6); // 3/5 = 60%
    });

    it('should track average result counts for patterns', async () => {
      const query = 'result count test';
      const resultCounts = [100, 150, 200];
      
      for (const count of resultCounts) {
        await manager.saveSearchEntry({ query, resultCount: count });
      }

      const patterns = await manager.getFrequentSearches(1);
      const pattern = patterns.find(p => p.pattern === query);
      
      expect(pattern?.avgResultCount).toBe(150); // (100 + 150 + 200) / 3
    });
  });

  describe('Personalized Suggestions', () => {
    it('should generate suggestions based on recent searches', async () => {
      await manager.saveSearchEntry({ 
        query: 'recent query',
        timestamp: new Date(), 
        success: true,
        resultCount: 200
      });

      const suggestions = await manager.generatePersonalizedSuggestions('', 10);
      const recentSuggestions = suggestions.filter(s => s.category === 'recent');
      
      expect(recentSuggestions.length).toBeGreaterThan(0);
      expect(recentSuggestions[0].query).toBe('recent query');
      expect(recentSuggestions[0].basedOn).toBe('history');
    });

    it('should generate suggestions based on frequent patterns', async () => {
      // Create a frequent pattern
      for (let i = 0; i < 4; i++) {
        await manager.saveSearchEntry({ query: 'frequent pattern' });
      }

      const suggestions = await manager.generatePersonalizedSuggestions('', 10);
      const patternSuggestions = suggestions.filter(s => s.category === 'frequent');
      
      expect(patternSuggestions.length).toBeGreaterThan(0);
      expect(patternSuggestions[0].query).toBe('frequent pattern');
    });

    it('should include trending suggestions', async () => {
      const suggestions = await manager.generatePersonalizedSuggestions('', 10);
      const trendingSuggestions = suggestions.filter(s => s.category === 'trending');
      
      expect(trendingSuggestions.length).toBeGreaterThan(0);
      expect(trendingSuggestions[0].basedOn).toBe('trends');
    });

    it('should provide domain-based recommendations', async () => {
      const suggestions = await manager.generatePersonalizedSuggestions('academic research', 10);
      const domainSuggestions = suggestions.filter(s => s.category === 'recommended');
      
      expect(domainSuggestions.length).toBeGreaterThan(0);
      expect(domainSuggestions[0].basedOn).toBe('domain_knowledge');
    });

    it('should sort suggestions by confidence score', async () => {
      const suggestions = await manager.generatePersonalizedSuggestions('', 10);
      
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].confidence).toBeGreaterThanOrEqual(suggestions[i + 1].confidence);
      }
    });

    it('should limit suggestions to requested count', async () => {
      const suggestions = await manager.generatePersonalizedSuggestions('', 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should provide reasoning for each suggestion', async () => {
      const suggestions = await manager.generatePersonalizedSuggestions('', 10);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.reasoning).toBeDefined();
        expect(suggestion.reasoning.length).toBeGreaterThan(0);
        expect(typeof suggestion.reasoning[0]).toBe('string');
      });
    });
  });

  describe('Search Insights and Analytics', () => {
    it('should calculate comprehensive search insights', async () => {
      // Add varied search history
      await manager.saveSearchEntry({ query: 'query 1', success: true, duration: 30000 });
      await manager.saveSearchEntry({ query: 'query 2', success: false, duration: 60000 });
      await manager.saveSearchEntry({ query: 'query 1', success: true, duration: 45000 });

      const insights = await manager.getSearchInsights();

      expect(insights.totalSearches).toBe(3);
      expect(insights.uniqueQueries).toBe(2);
      expect(insights.avgSessionDuration).toBe(45000);
      expect(insights.successRate).toBe(2/3);
    });

    it('should track filter usage patterns', async () => {
      await manager.saveSearchEntry({ 
        query: 'test',
        filters: { publication_year: '2023', open_access: true }
      });
      await manager.saveSearchEntry({ 
        query: 'test2',
        filters: { publication_year: '2022' }
      });

      const insights = await manager.getSearchInsights();

      expect(insights.mostPopularFilters['publication_year']).toBe(2);
      expect(insights.mostPopularFilters['open_access']).toBe(1);
    });

    it('should analyze search timing patterns', async () => {
      const morningTime = new Date('2023-12-01T09:00:00');
      const eveningTime = new Date('2023-12-01T19:00:00');

      await manager.saveSearchEntry({ query: 'morning', timestamp: morningTime });
      await manager.saveSearchEntry({ query: 'evening', timestamp: eveningTime });

      const insights = await manager.getSearchInsights();

      expect(insights.timeDistribution['morning']).toBe(1);
      expect(insights.timeDistribution['evening']).toBe(1);
    });

    it('should provide improvement suggestions', async () => {
      // Add searches with low success rate
      for (let i = 0; i < 5; i++) {
        await manager.saveSearchEntry({ 
          query: `query ${i}`,
          success: i < 2, // 40% success rate
          duration: 400000 // Long duration
        });
      }

      const insights = await manager.getSearchInsights();

      expect(insights.improvementSuggestions.length).toBeGreaterThan(0);
      expect(insights.improvementSuggestions.some(s => 
        s.includes('specific search terms')
      )).toBe(true);
    });
  });

  describe('History Search and Filtering', () => {
    it('should search history by query text', async () => {
      await manager.saveSearchEntry({ query: 'machine learning' });
      await manager.saveSearchEntry({ query: 'deep learning' });
      await manager.saveSearchEntry({ query: 'climate change' });

      const mlResults = await manager.searchHistory('learning');
      expect(mlResults.length).toBe(2);
      expect(mlResults.every(r => r.query.includes('learning'))).toBe(true);
    });

    it('should search history by tags', async () => {
      await manager.saveSearchEntry({ query: 'query 1', tags: ['ai', 'research'] });
      await manager.saveSearchEntry({ query: 'query 2', tags: ['climate'] });

      const aiResults = await manager.searchHistory('ai');
      expect(aiResults.length).toBe(1);
      expect(aiResults[0].query).toBe('query 1');
    });

    it('should be case insensitive when searching', async () => {
      await manager.saveSearchEntry({ query: 'Machine Learning' });

      const lowerResults = await manager.searchHistory('machine');
      const upperResults = await manager.searchHistory('MACHINE');

      expect(lowerResults.length).toBe(1);
      expect(upperResults.length).toBe(1);
    });

    it('should get recent searches within time window', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await manager.saveSearchEntry({ query: 'recent', timestamp: now });
      await manager.saveSearchEntry({ query: 'yesterday', timestamp: yesterday });
      await manager.saveSearchEntry({ query: 'old', timestamp: lastWeek });

      const recentSearches = await manager.getRecentSearches(24);
      expect(recentSearches.length).toBe(2); // now and yesterday
      expect(recentSearches.some(s => s.query === 'old')).toBe(false);
    });
  });

  describe('Data Management', () => {
    it('should export search history in valid format', async () => {
      await manager.saveSearchEntry({ query: 'test export' });

      const exportData = await manager.exportHistory();
      const parsed = JSON.parse(exportData);

      expect(parsed.exportDate).toBeDefined();
      expect(parsed.searchHistory).toBeDefined();
      expect(parsed.insights).toBeDefined();
      expect(parsed.version).toBe('1.0');
    });

    it('should import valid search history', async () => {
      const importData = {
        exportDate: new Date().toISOString(),
        searchHistory: [
          {
            id: 'test1',
            query: 'imported query',
            filters: {},
            timestamp: new Date(),
            resultCount: 100,
            clickedResults: [],
            sessionId: 'session1',
            duration: 30000,
            success: true,
            tags: [],
            context: 'quick_search'
          }
        ],
        insights: {},
        version: '1.0'
      };

      await manager.importHistory(JSON.stringify(importData));

      const history = await manager.getSearchHistory();
      expect(history.some(h => h.query === 'imported query')).toBe(true);
    });

    it('should reject invalid import data', async () => {
      const invalidData = '{"invalid": "format"}';

      await expect(manager.importHistory(invalidData)).rejects.toThrow('Invalid history data format');
    });

    it('should clear all history', async () => {
      await manager.saveSearchEntry({ query: 'test 1' });
      await manager.saveSearchEntry({ query: 'test 2' });

      await manager.clearHistory();

      const history = await manager.getSearchHistory();
      expect(history.length).toBe(0);
    });

    it('should remove specific search entries', async () => {
      await manager.saveSearchEntry({ query: 'keep this' });
      await manager.saveSearchEntry({ query: 'remove this' });

      const history = await manager.getSearchHistory();
      const entryToRemove = history.find(h => h.query === 'remove this');
      
      await manager.removeSearchEntry(entryToRemove!.id);

      const updatedHistory = await manager.getSearchHistory();
      expect(updatedHistory.length).toBe(1);
      expect(updatedHistory[0].query).toBe('keep this');
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock storage error
      const mockStorage = manager['storage'];
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw, return empty array instead
      const history = await manager.getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should handle malformed stored data', async () => {
      const mockStorage = manager['storage'];
      mockStorage.getItem.mockResolvedValue('invalid json');

      const history = await manager.getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should validate entry data before saving', async () => {
      const invalidEntry = { query: null, filters: 'invalid' };

      // Should not crash, should handle gracefully
      await expect(manager.saveSearchEntry(invalidEntry as any)).resolves.not.toThrow();
    });

    it('should perform efficiently with large history', async () => {
      // Create large history set
      const promises = Array.from({ length: 100 }, (_, i) =>
        manager.saveSearchEntry({ query: `query ${i}` })
      );
      await Promise.all(promises);

      const startTime = performance.now();
      
      await manager.getSearchInsights();
      await manager.generatePersonalizedSuggestions('', 10);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});