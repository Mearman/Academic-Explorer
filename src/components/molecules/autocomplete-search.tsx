import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { cachedOpenAlex } from '@/lib/openalex/client-with-cache';
import { EntityBadge, LoadingSpinner, Icon } from '@/components';
import { detectEntityType, parseEntityIdentifier } from '@/lib/openalex/utils/entity-detection';
import type { EntityType } from '@/components/types';
import * as styles from './autocomplete-search.css';

interface AutocompleteSuggestion {
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

interface AutocompleteSearchProps {
  placeholder?: string;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  className?: string;
  showEntityBadges?: boolean;
  maxSuggestions?: number;
}

export function AutocompleteSearch({
  placeholder = "Search authors, works, institutions...",
  onSelect,
  className,
  showEntityBadges = true,
  maxSuggestions = 8
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Search across multiple entity types using their specific autocomplete endpoints
      const searchParams = { q: searchQuery };
      const maxPerType = Math.ceil(maxSuggestions / 4); // Distribute across 4 main types
      
      const [worksResponse, authorsResponse, sourcesResponse, institutionsResponse] = await Promise.allSettled([
        cachedOpenAlex.worksAutocomplete(searchParams),
        cachedOpenAlex.authorsAutocomplete(searchParams), 
        cachedOpenAlex.sourcesAutocomplete(searchParams),
        cachedOpenAlex.institutionsAutocomplete(searchParams)
      ]);

      const allSuggestions: AutocompleteSuggestion[] = [];
      
      // Process each response and combine results
      const processResponse = (response: PromiseSettledResult<{ results: unknown[] }>, entityType: string) => {
        if (response.status === 'fulfilled' && response.value?.results) {
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
        }
        return [];
      };

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
  }, [maxSuggestions]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchSuggestions(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.display_name);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(suggestion);
  };

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Generate suggestion link URL
  const getSuggestionUrl = (suggestion: AutocompleteSuggestion) => {
    const entityId = parseEntityIdentifier(suggestion.id).numericId;
    const entityType = suggestion.entity_type;
    
    // Map entity types to routes
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

    return routeMap[entityType] || `/${entityId}`;
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={styles.input}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          autoComplete="off"
        />
        
        <div className={styles.inputSuffix}>
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Icon name="search" size="sm" className={styles.searchIcon} />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className={styles.suggestionsList}
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`suggestion-${index}`}
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.suggestionSelected : ''
              }`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <Link
                to={getSuggestionUrl(suggestion)}
                className={styles.suggestionLink}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className={styles.suggestionContent}>
                  <div className={styles.suggestionHeader}>
                    <span className={styles.suggestionName}>
                      {suggestion.display_name}
                    </span>
                    {showEntityBadges && (
                      <EntityBadge 
                        entityType={suggestion.entity_type}
                        size="sm"
                      />
                    )}
                  </div>
                  
                  {suggestion.hint && (
                    <div className={styles.suggestionHint}>
                      {suggestion.hint}
                    </div>
                  )}
                  
                  <div className={styles.suggestionMeta}>
                    {suggestion.entity_type === 'work' && suggestion.cited_by_count !== undefined && (
                      <span className={styles.metricBadge}>
                        <Icon name="citation" size="xs" />
                        {suggestion.cited_by_count.toLocaleString()} citations
                      </span>
                    )}
                    {suggestion.entity_type === 'author' && suggestion.works_count !== undefined && (
                      <span className={styles.metricBadge}>
                        <Icon name="publication" size="xs" />
                        {suggestion.works_count.toLocaleString()} works
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}