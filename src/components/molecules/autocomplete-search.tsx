import React, { useEffect, useRef } from 'react';

import { LoadingSpinner, Icon } from '@/components';
import { useAutocompleteSearch } from '@/hooks/use-autocomplete-search';
import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

import { SuggestionItem } from './autocomplete-search/suggestion-item';
import { createClickOutsideHandler } from './autocomplete-search/utils';
import * as styles from './autocomplete-search.css';

// Re-export the type for external use
export type { AutocompleteSuggestion };

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
  const {
    query,
    suggestions,
    isLoading,
    isOpen,
    selectedIndex,
    setIsOpen,
    setSelectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSuggestionSelect,
  } = useAutocompleteSearch({ maxSuggestions });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Handle enhanced keyboard navigation
  const handleKeyDownEnhanced = (e: React.KeyboardEvent) => {
    handleKeyDown(e);
    
    // Handle Enter key for suggestion selection
    if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const suggestion = suggestions[selectedIndex];
      handleSuggestionSelect(suggestion);
      onSelect?.(suggestion);
    }
    
    // Handle Escape key to blur input
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  // Handle suggestion selection with callback
  const handleSuggestionSelectEnhanced = (suggestion: AutocompleteSuggestion) => {
    handleSuggestionSelect(suggestion);
    onSelect?.(suggestion);
  };

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = createClickOutsideHandler(
      inputRef,
      listRef,
      setIsOpen,
      setSelectedIndex
    );

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen, setSelectedIndex]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDownEnhanced}
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
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
              isSelected={index === selectedIndex}
              showEntityBadges={showEntityBadges}
              onSelect={handleSuggestionSelectEnhanced}
            />
          ))}
        </ul>
      )}
    </div>
  );
}