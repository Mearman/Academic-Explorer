import React, { useEffect, useRef } from 'react';

import { AutocompleteInput, SuggestionsList } from '@/components';
import { useAutocompleteSearch } from '@/hooks/use-autocomplete-search';
import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

import { useAutocompleteHandlers } from './autocomplete-handlers';
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

  const { handleKeyDownEnhanced, handleSuggestionSelectEnhanced } = useAutocompleteHandlers(
    suggestions,
    selectedIndex,
    handleKeyDown,
    handleSuggestionSelect,
    onSelect,
    inputRef
  );

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
      <AutocompleteInput
        ref={inputRef}
        query={query}
        placeholder={placeholder}
        isLoading={isLoading}
        isOpen={isOpen}
        selectedIndex={selectedIndex}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDownEnhanced}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        wrapperClassName={styles.inputWrapper}
        inputClassName={styles.input}
        suffixClassName={styles.inputSuffix}
        searchIconClassName={styles.searchIcon}
      />

      {isOpen && (
        <SuggestionsList
          ref={listRef}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          showEntityBadges={showEntityBadges}
          onSelect={handleSuggestionSelectEnhanced}
          className={styles.suggestionsList}
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
        </SuggestionsList>
      )}
    </div>
  );
}