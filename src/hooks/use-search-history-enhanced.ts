/**
 * Enhanced search history and suggestion management hook
 * Provides intelligent history tracking, personalized suggestions, and advanced search patterns
 */

import { useCallback, useMemo } from 'react';

import { useHybridStorage } from '@/hooks/use-hybrid-storage';

// Types for enhanced search history
export interface SearchEntry {
  id: string;
  query: string;
  filters: Record<string, unknown>;
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

// Enhanced Search History Manager
class EnhancedSearchHistoryManager {
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly PATTERN_MIN_FREQUENCY = 3;
  private readonly SUGGESTION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private storage: ReturnType<typeof useHybridStorage>) {}

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
    const sortedHistory = history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sortedHistory.slice(0, limit) : sortedHistory;
  }

  async getRecentSearches(hours: number = 24): Promise<SearchEntry[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const history = await this.getSearchHistory();
    return history.filter(entry => new Date(entry.timestamp) > cutoff);
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
    const recentSuggestions = await this.getRecentBasedSuggestions(Math.max(1, Math.floor(limit / 4)));
    suggestions.push(...recentSuggestions);

    // Frequent patterns
    const patternSuggestions = await this.getPatternBasedSuggestions(Math.max(1, Math.floor(limit / 4)));
    suggestions.push(...patternSuggestions);

    // Trending queries
    const trendingSuggestions = await this.getTrendingSuggestions(Math.max(1, Math.floor(limit / 4)));
    suggestions.push(...trendingSuggestions);

    // Domain knowledge
    const domainSuggestions = await this.getDomainBasedSuggestions(context, Math.max(1, Math.floor(limit / 4)));
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
    const avgSessionDuration = totalSearches > 0 ? history.reduce((sum, h) => sum + h.duration, 0) / totalSearches : 0;
    const successRate = totalSearches > 0 ? history.filter(h => h.success).length / totalSearches : 0;

    const filterCounts: Record<string, number> = {};
    history.forEach(entry => {
      Object.keys(entry.filters).forEach(filter => {
        filterCounts[filter] = (filterCounts[filter] || 0) + 1;
      });
    });

    const timeDistribution: Record<string, number> = {};
    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
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
    try {
      await this.storage.removeItem('search_history');
      await this.storage.removeItem('search_patterns');
    } catch (error) {
      console.error('Failed to clear search history:', error);
      throw error;
    }
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
    } catch {
      throw new Error('Invalid history data format');
    }
  }

  // Private methods
  private generateEntryId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return parsed.map((entry: unknown) => {
        if (!this.validateSearchEntry(entry)) {
          throw new Error('Invalid search entry format');
        }
        return {
          ...entry,
          timestamp: new Date(entry.timestamp),
        };
      });
    } catch {
      return [];
    }
  }

  private async saveHistory(history: SearchEntry[]): Promise<void> {
    try {
      await this.storage.setItem('search_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save search history:', error);
      throw error;
    }
  }

  private async trimHistorySize(): Promise<void> {
    const history = await this.loadHistory();
    if (history.length > this.MAX_HISTORY_SIZE) {
      const trimmed = history.slice(0, this.MAX_HISTORY_SIZE);
      await this.saveHistory(trimmed);
    }
  }

  private async updatePatterns(entry: SearchEntry): Promise<void> {
    const patterns = await this.getSearchPatterns();
    const pattern = patterns.find(p => p.pattern === entry.query) || {
      pattern: entry.query,
      frequency: 0,
      lastUsed: entry.timestamp,
      successRate: 0,
      avgResultCount: 0,
      relatedQueries: [],
      userSatisfaction: 0,
    };

    pattern.frequency += 1;
    pattern.lastUsed = entry.timestamp;
    pattern.avgResultCount = (pattern.avgResultCount * (pattern.frequency - 1) + entry.resultCount) / pattern.frequency;
    
    if (entry.success) {
      const successCount = Math.floor(pattern.successRate * (pattern.frequency - 1)) + 1;
      pattern.successRate = successCount / pattern.frequency;
    }

    const updatedPatterns = patterns.filter(p => p.pattern !== entry.query);
    updatedPatterns.push(pattern);
    
    try {
      await this.storage.setItem('search_patterns', JSON.stringify(updatedPatterns));
    } catch (error) {
      console.error('Failed to update search patterns:', error);
      throw error;
    }
  }

  private async getSearchPatterns(): Promise<SearchPattern[]> {
    try {
      const data = await this.storage.getItem('search_patterns');
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      // Convert lastUsed strings back to Date objects
      return parsed.map((pattern: unknown) => {
        if (!this.validateSearchPattern(pattern)) {
          throw new Error('Invalid search pattern format');
        }
        return {
          ...pattern,
          lastUsed: new Date(pattern.lastUsed),
        };
      });
    } catch {
      return [];
    }
  }

  private async getRecentBasedSuggestions(limit: number): Promise<PersonalizedSuggestion[]> {
    const recent = await this.getRecentSearches(24);
    return recent.slice(0, limit).map((entry, index) => ({
      id: `recent_${entry.id}`,
      query: entry.query,
      confidence: 0.8 - (index * 0.1),
      reasoning: ['Based on recent search activity'],
      basedOn: 'history' as const,
      category: 'recent' as const,
      metadata: {
        estimatedResults: entry.resultCount,
        complexity: 'simple' as const,
        timeframe: 'immediate' as const,
      },
    }));
  }

  private async getPatternBasedSuggestions(limit: number): Promise<PersonalizedSuggestion[]> {
    const patterns = await this.getFrequentSearches();
    return patterns.slice(0, limit).map((pattern, index) => ({
      id: `pattern_${pattern.pattern}`,
      query: pattern.pattern,
      confidence: 0.7 - (index * 0.05),
      reasoning: [`Frequently searched (${pattern.frequency} times)`],
      basedOn: 'history' as const,
      category: 'frequent' as const,
      metadata: {
        estimatedResults: Math.round(pattern.avgResultCount),
        complexity: 'intermediate' as const,
        timeframe: 'short_term' as const,
      },
    }));
  }

  private async getTrendingSuggestions(limit: number): Promise<PersonalizedSuggestion[]> {
    // Mock trending suggestions for now
    const trending = ['machine learning', 'artificial intelligence', 'climate change', 'quantum computing'];
    return trending.slice(0, limit).map((query, index) => ({
      id: `trending_${query}`,
      query,
      confidence: 0.6 - (index * 0.05),
      reasoning: ['Currently trending in your field'],
      basedOn: 'trends' as const,
      category: 'trending' as const,
      metadata: {
        estimatedResults: 1000,
        complexity: 'intermediate' as const,
        timeframe: 'short_term' as const,
      },
    }));
  }

  private async getDomainBasedSuggestions(context: string, limit: number): Promise<PersonalizedSuggestion[]> {
    const domainQueries = [
      'systematic review',
      'meta-analysis',
      'research methodology',
      'academic writing',
    ];
    
    return domainQueries.slice(0, limit).map((query, index) => ({
      id: `domain_${query}`,
      query,
      confidence: 0.5 - (index * 0.02),
      reasoning: ['Relevant to academic research'],
      basedOn: 'domain_knowledge' as const,
      category: 'recommended' as const,
      metadata: {
        estimatedResults: 500,
        complexity: 'advanced' as const,
        timeframe: 'long_term' as const,
      },
    }));
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private extractTopDomains(_history: SearchEntry[]): string[] {
    // Mock implementation - extract domains from query patterns
    const domains = ['computer science', 'biology', 'physics', 'mathematics'];
    return domains.slice(0, 5);
  }

  private generateImprovementSuggestions(history: SearchEntry[], _patterns: SearchPattern[]): string[] {
    const suggestions: string[] = [];
    
    if (history.length > 0) {
      const successRate = history.filter(h => h.success).length / history.length;
      if (successRate < 0.7) {
        suggestions.push('Try using more specific keywords to improve search success');
      }
      
      const avgDuration = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
      if (avgDuration > 60000) {
        suggestions.push('Consider using filters to narrow down results faster');
      }
    }
    
    return suggestions;
  }

  private validateSearchEntry = (entry: unknown): entry is SearchEntry => {
    return entry !== null &&
           typeof entry === 'object' &&
           'id' in entry &&
           'query' in entry &&
           'timestamp' in entry &&
           typeof (entry as SearchEntry).id === 'string' &&
           typeof (entry as SearchEntry).query === 'string' &&
           (entry as SearchEntry).timestamp !== undefined;
  };

  private validateSearchPattern = (pattern: unknown): pattern is SearchPattern => {
    return pattern !== null &&
           typeof pattern === 'object' &&
           'pattern' in pattern &&
           'frequency' in pattern &&
           'lastUsed' in pattern &&
           typeof (pattern as SearchPattern).pattern === 'string' &&
           typeof (pattern as SearchPattern).frequency === 'number' &&
           (pattern as SearchPattern).lastUsed !== undefined;
  };

  private async rebuildPatterns(): Promise<void> {
    try {
      const history = await this.loadHistory();
      await this.storage.removeItem('search_patterns');
      
      for (const entry of history) {
        await this.updatePatterns(entry);
      }
    } catch (error) {
      console.error('Failed to rebuild search patterns:', error);
      throw error;
    }
  }
}

// Hook for using enhanced search history
export function useEnhancedSearchHistory() {
  const storage = useHybridStorage();
  const manager = useMemo(() => new EnhancedSearchHistoryManager(storage), [storage]);
  
  const saveSearch = useCallback((entry: Partial<SearchEntry>) => {
    return manager.saveSearchEntry(entry);
  }, [manager]);

  const getHistory = useCallback((limit?: number) => {
    return manager.getSearchHistory(limit);
  }, [manager]);

  const getRecentSearches = useCallback((hours?: number) => {
    return manager.getRecentSearches(hours);
  }, [manager]);

  const getFrequentSearches = useCallback((minCount?: number) => {
    return manager.getFrequentSearches(minCount);
  }, [manager]);

  const generateSuggestions = useCallback((context?: string, limit?: number) => {
    return manager.generatePersonalizedSuggestions(context, limit);
  }, [manager]);

  const getInsights = useCallback(() => {
    return manager.getSearchInsights();
  }, [manager]);

  const clearHistory = useCallback(() => {
    return manager.clearHistory();
  }, [manager]);

  const removeEntry = useCallback((entryId: string) => {
    return manager.removeSearchEntry(entryId);
  }, [manager]);

  const rateSearch = useCallback((entryId: string, rating: number) => {
    return manager.updateSearchRating(entryId, rating);
  }, [manager]);

  const tagSearch = useCallback((entryId: string, tags: string[]) => {
    return manager.tagSearchEntry(entryId, tags);
  }, [manager]);

  const searchHistory = useCallback((query: string) => {
    return manager.searchHistory(query);
  }, [manager]);

  const exportHistory = useCallback(() => {
    return manager.exportHistory();
  }, [manager]);

  const importHistory = useCallback((data: string) => {
    return manager.importHistory(data);
  }, [manager]);

  return {
    saveSearch,
    getHistory,
    getRecentSearches,
    getFrequentSearches,
    generateSuggestions,
    getInsights,
    clearHistory,
    removeEntry,
    rateSearch,
    tagSearch,
    searchHistory,
    exportHistory,
    importHistory,
  };
}