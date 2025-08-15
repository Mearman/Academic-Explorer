import { useState, useEffect, useRef, useCallback } from 'react';

import type { EntityType } from '@/components/types';
import { cachedOpenAlex } from '@/lib/openalex/client-with-cache';
import { detectEntityType } from '@/lib/openalex/utils/entity-detection';

export interface AutocompleteSuggestion {
  id: string;
  display_name: string;
  entity_type: EntityType;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
  external_ids?: Record<string, unknown>;
}

const VALID_ENTITY_TYPES: EntityType[] = [
  'work', 'author', 'source', 'institution', 'publisher', 
  'funder', 'topic', 'concept', 'keyword', 'continent', 'region'
];

function isValidEntityType(type: string): type is EntityType {
  return VALID_ENTITY_TYPES.includes(type as EntityType);
}

interface UseAutocompleteSearchProps {
  maxSuggestions?: number;
  debounceMs?: number;
  minQueryLength?: number;
}

export function useAutocompleteSearch({
  maxSuggestions = 8,
  debounceMs = 300,
  minQueryLength = 2,
}: UseAutocompleteSearchProps = {}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Process response from autocomplete API
  const processResponse = useCallback((
    response: PromiseSettledResult<{ results: unknown[] }>, 
    entityType: string
  ): AutocompleteSuggestion[] => {
    if (response.status !== 'fulfilled' || !response.value?.results) {
      return [];
    }

    const maxPerType = Math.ceil(maxSuggestions / 4);
    
    return response.value.results.slice(0, maxPerType).map((result: unknown): AutocompleteSuggestion => {
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid autocomplete result format');
      }
      
      const item = result as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : '';
      const display_name = typeof item.display_name === 'string' ? item.display_name : '';
      const hint = typeof item.hint === 'string' ? item.hint : undefined;
      const cited_by_count = typeof item.cited_by_count === 'number' ? item.cited_by_count : undefined;
      const works_count = typeof item.works_count === 'number' ? item.works_count : undefined;
      const external_ids = item.external_ids && typeof item.external_ids === 'object' ? 
        item.external_ids as Record<string, unknown> : undefined;

      // Ensure entity_type is valid, fallback to detected type or 'work'
      const validEntityType = isValidEntityType(entityType) ? entityType : 
        (detectEntityType(id) && isValidEntityType(detectEntityType(id)!)) ? detectEntityType(id)! : 'work' as EntityType;

      return {
        id,
        display_name,
        entity_type: validEntityType,
        hint,
        cited_by_count,
        works_count,
        external_ids
      };
    });
  }, [maxSuggestions]);

  // Search for suggestions
  const searchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Search across multiple entity types using their specific autocomplete endpoints
      const searchParams = { q: searchQuery };
      
      const [worksResponse, authorsResponse, sourcesResponse, institutionsResponse] = await Promise.allSettled([
        cachedOpenAlex.worksAutocomplete(searchParams),
        cachedOpenAlex.authorsAutocomplete(searchParams), 
        cachedOpenAlex.sourcesAutocomplete(searchParams),
        cachedOpenAlex.institutionsAutocomplete(searchParams)
      ]);

      const allSuggestions: AutocompleteSuggestion[] = [];
      
      // Combine all results
      allSuggestions.push(
        ...processResponse(worksResponse, 'work'),
        ...processResponse(authorsResponse, 'author'),
        ...processResponse(sourcesResponse, 'source'),
        ...processResponse(institutionsResponse, 'institution')
      );

      // Sort by relevance (cited_by_count or works_count) and limit
      const sortedSuggestions = allSuggestions
        .sort((a, b) => {
          const aScore = a.cited_by_count || a.works_count || 0;
          const bScore = b.cited_by_count || b.works_count || 0;
          return bScore - aScore;
        })
        .slice(0, maxSuggestions);

      setSuggestions(sortedSuggestions);
      setIsOpen(sortedSuggestions.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Autocomplete search failed:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength, maxSuggestions, processResponse]);

  // Handle input change with debouncing
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchSuggestions(value);
    }, debounceMs);
  }, [searchSuggestions, debounceMs]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions.length]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.display_name);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    suggestions,
    isLoading,
    isOpen,
    selectedIndex,
    setQuery,
    setIsOpen,
    setSelectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSuggestionSelect,
  };
}