'use client';

import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { useAppStore } from '@/stores/app-store';

import { AutocompleteSearch } from './autocomplete-search';
import type { AutocompleteSuggestion } from './autocomplete-search';
import * as styles from './search-bar.css';

interface SearchBarProps {
  showAutocomplete?: boolean;
  className?: string;
}

// Entity type to route mapping
const ENTITY_ROUTE_MAP: Record<string, string> = {
  'work': '/works',
  'author': '/authors',
  'source': '/sources',
  'institution': '/institutions',
  'publisher': '/publishers',
  'funder': '/funders',
  'topic': '/topics',
  'concept': '/concepts',
};

// Get entity route from suggestion
function getEntityRoute(suggestion: AutocompleteSuggestion): string {
  const entityId = suggestion.id.split('/').pop();
  const entityType = suggestion.entity_type;
  const baseRoute = ENTITY_ROUTE_MAP[entityType];
  return baseRoute ? `${baseRoute}/${entityId}` : `/${entityId}`;
}

// Render autocomplete variant
function renderAutocompleteVariant(
  onSelect: (suggestion: AutocompleteSuggestion) => void,
  className?: string
) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <AutocompleteSearch
        placeholder="Search authors, works, institutions..."
        onSelect={onSelect}
        className={styles.autocomplete}
        showEntityBadges={true}
        maxSuggestions={6}
      />
      <div className={styles.searchHint}>
        Try searching for authors, papers, institutions, or topics
      </div>
    </div>
  );
}

// Render traditional search form
function renderTraditionalForm(
  localQuery: string,
  setLocalQuery: (query: string) => void,
  onSubmit: (e: React.FormEvent) => void,
  className?: string
) {
  return (
    <form onSubmit={onSubmit} className={`${styles.form} ${className || ''}`}>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder="Search academic literature"
        className={styles.input}
        aria-label="Search"
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
    </form>
  );
}

export function SearchBar({ 
  showAutocomplete = true,
  className
}: SearchBarProps) {
  const { searchQuery, setSearchQuery, addToSearchHistory } = useAppStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchQuery(localQuery);
      addToSearchHistory(localQuery);
      
      router.navigate({
        to: '/query',
        search: { q: localQuery.trim() }
      });
    }
  };

  const handleAutocompleteSelect = (suggestion: AutocompleteSuggestion) => {
    setSearchQuery(suggestion.display_name);
    addToSearchHistory(suggestion.display_name);
    
    const targetRoute = getEntityRoute(suggestion);
    router.navigate({ to: targetRoute });
  };

  if (showAutocomplete) {
    return renderAutocompleteVariant(handleAutocompleteSelect, className);
  }

  return renderTraditionalForm(localQuery, setLocalQuery, handleSubmit, className);
}