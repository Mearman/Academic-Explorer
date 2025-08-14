import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { cachedOpenAlex } from '@/lib/openalex/client-with-cache';
import { EntityBadge, LoadingSpinner, Icon } from '@/components/atoms';
import { detectEntityType, getEntityIdFromUrl } from '@/lib/openalex/utils/entity-detection';
import * as styles from './autocomplete-search.css';
import type { OpenAlexEntity } from '@/components/types';

interface AutocompleteSuggestion {
  id: string;
  display_name: string;
  entity_type: string;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
  external_ids?: Record<string, any>;
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
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const searchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use OpenAlex autocomplete endpoint
      const response = await cachedOpenAlex.get(`/autocomplete`, {
        q: searchQuery,
        per_page: maxSuggestions
      });

      const suggestions: AutocompleteSuggestion[] = response.results.map((result: any) => ({
        id: result.id,
        display_name: result.display_name,
        entity_type: result.entity_type || detectEntityType(result.id) || 'unknown',
        hint: result.hint,
        cited_by_count: result.cited_by_count,
        works_count: result.works_count,
        external_ids: result.external_ids
      }));

      setSuggestions(suggestions);
      setIsOpen(suggestions.length > 0);
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
    const entityId = getEntityIdFromUrl(suggestion.id);
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
                        type={suggestion.entity_type as any}
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