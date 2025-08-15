import React, { forwardRef } from 'react';

import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

interface SuggestionsListProps {
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  showEntityBadges: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  className?: string;
  children: React.ReactNode;
}

export const SuggestionsList = forwardRef<HTMLUListElement, SuggestionsListProps>(
  ({ 
    suggestions,
    selectedIndex: _selectedIndex,
    showEntityBadges: _showEntityBadges,
    onSelect: _onSelect,
    className = '',
    children
  }, ref) => {
    if (suggestions.length === 0) {
      return null;
    }

    return (
      <ul
        ref={ref}
        className={className}
        role="listbox"
        aria-label="Search suggestions"
      >
        {children}
      </ul>
    );
  }
);

SuggestionsList.displayName = 'SuggestionsList';