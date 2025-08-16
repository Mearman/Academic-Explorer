import { useDebouncedValue } from '@mantine/hooks';
import { useRouter } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from 'react';

import type { EntityType } from '@/components/types';
import { cachedOpenAlex } from '@/lib/openalex/client-with-cache';

export interface SearchSuggestion {
  value: string;
  id: string;
  entity_type: EntityType;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
}

interface UseTopbarSearchProps {
  debounceMs?: number;
  maxSuggestions?: number;
}

export function useTopbarSearch({ 
  debounceMs = 300,
  maxSuggestions = 6 
}: UseTopbarSearchProps = {}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebouncedValue(query, debounceMs);
  const router = useRouter();

  // Process response from autocomplete API
  const processResponse = useCallback((
    response: PromiseSettledResult<{ results: unknown[] }>, 
    entityType: EntityType,
    maxPerType: number
  ): SearchSuggestion[] => {
    if (response.status !== 'fulfilled' || !response.value?.results) {
      return [];
    }

    return response.value.results.slice(0, maxPerType).map((result: unknown): SearchSuggestion => {
      const item = result as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : '';
      const display_name = typeof item.display_name === 'string' ? item.display_name : '';
      const hint = typeof item.hint === 'string' ? item.hint : undefined;
      const cited_by_count = typeof item.cited_by_count === 'number' ? item.cited_by_count : undefined;
      const works_count = typeof item.works_count === 'number' ? item.works_count : undefined;

      return {
        value: display_name,
        id,
        entity_type: entityType,
        hint,
        cited_by_count,
        works_count
      };
    });
  }, []);

  // Search for suggestions
  const searchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const searchParams = { q: searchQuery };
      const maxPerType = 2; // Keep it compact
      
      const [worksResponse, authorsResponse, sourcesResponse, institutionsResponse] = await Promise.allSettled([
        cachedOpenAlex.worksAutocomplete(searchParams),
        cachedOpenAlex.authorsAutocomplete(searchParams), 
        cachedOpenAlex.sourcesAutocomplete(searchParams),
        cachedOpenAlex.institutionsAutocomplete(searchParams)
      ]);

      const allSuggestions: SearchSuggestion[] = [];
      
      // Combine all results
      allSuggestions.push(
        ...processResponse(worksResponse, 'work', maxPerType),
        ...processResponse(authorsResponse, 'author', maxPerType),
        ...processResponse(sourcesResponse, 'source', maxPerType),
        ...processResponse(institutionsResponse, 'institution', maxPerType)
      );

      // Sort by relevance and limit to maxSuggestions items for compactness
      const sortedSuggestions = allSuggestions
        .sort((a, b) => {
          const aScore = a.cited_by_count || a.works_count || 0;
          const bScore = b.cited_by_count || b.works_count || 0;
          return bScore - aScore;
        })
        .slice(0, maxSuggestions);

      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Topbar search failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [maxSuggestions, processResponse]);

  // Handle suggestion selection
  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    // Extract the OpenAlex ID from URL or use direct ID
    let entityId = suggestion.id;
    
    // If suggestion.id is a URL, extract just the ID part
    if (entityId.includes('openalex.org/')) {
      const match = entityId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
      if (match) {
        entityId = match[1];
      }
    }
    
    // Ensure the entityId is properly formatted (uppercase prefix)
    if (entityId.match(/^[wasipftckrn]\d{7,10}$/i)) {
      entityId = entityId.toUpperCase();
    }
    
    const entityType = suggestion.entity_type;
    
    const routeMap: Record<string, string> = {
      'work': `/works/${entityId}`,
      'author': `/authors/${entityId}`,
      'source': `/sources/${entityId}`,
      'institution': `/institutions/${entityId}`,
      'publisher': `/publishers/${entityId}`,
      'funder': `/funders/${entityId}`,
      'topic': `/topics/${entityId}`,
      'concept': `/concepts/${entityId}`,
    };

    const targetRoute = routeMap[entityType] || `/${entityId}`;
    router.navigate({ to: targetRoute });
    setQuery(''); // Clear search after navigation
  }, [router]);

  // Handle Enter key for general search
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && query.trim() && suggestions.length === 0) {
      // Navigate to a general search results page
      router.navigate({
        to: '/',
        search: { q: query.trim() }
      });
      setQuery('');
    }
  }, [query, suggestions.length, router]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, searchSuggestions]);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    handleSelect,
    handleKeyDown,
  };
}