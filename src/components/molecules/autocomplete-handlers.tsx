import React from 'react';

import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

export function useAutocompleteHandlers(
  suggestions: AutocompleteSuggestion[],
  selectedIndex: number,
  handleKeyDown: (e: React.KeyboardEvent) => void,
  handleSuggestionSelect: (suggestion: AutocompleteSuggestion) => void,
  onSelect?: (suggestion: AutocompleteSuggestion) => void,
  inputRef?: React.RefObject<HTMLInputElement | null>
) {
  const handleKeyDownEnhanced = (e: React.KeyboardEvent) => {
    handleKeyDown(e);
    
    if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const suggestion = suggestions[selectedIndex];
      if (suggestion) {
        handleSuggestionSelect(suggestion);
        onSelect?.(suggestion);
      }
    }
    
    if (e.key === 'Escape') {
      inputRef?.current?.blur();
    }
  };

  const handleSuggestionSelectEnhanced = (suggestion: AutocompleteSuggestion) => {
    handleSuggestionSelect(suggestion);
    onSelect?.(suggestion);
  };

  return {
    handleKeyDownEnhanced,
    handleSuggestionSelectEnhanced
  };
}