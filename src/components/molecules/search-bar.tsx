'use client';

import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useAppStore } from '@/stores/app-store';
import { AutocompleteSearch } from './autocomplete-search';

interface AutocompleteSuggestion {
  id: string;
  display_name: string;
  entity_type: string;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
  external_ids?: Record<string, unknown>;
}
import * as styles from './search-bar.css';

interface SearchBarProps {
  showAutocomplete?: boolean;
  className?: string;
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
      
      // Navigate to search results page with query
      router.navigate({
        to: '/search',
        search: {
          q: localQuery.trim(),
          entity_type: 'works', // Default to works search
        }
      });
    }
  };

  const handleAutocompleteSelect = (suggestion: AutocompleteSuggestion) => {
    setSearchQuery(suggestion.display_name);
    addToSearchHistory(suggestion.display_name);
    
    // Navigate to the specific entity page
    const entityId = suggestion.id.split('/').pop();
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
  };

  if (showAutocomplete) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <AutocompleteSearch
          placeholder="Search authors, works, institutions..."
          onSelect={handleAutocompleteSelect}
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

  // Fallback to traditional search bar
  return (
    <form onSubmit={handleSubmit} className={`${styles.form} ${className || ''}`}>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder="Search academic literature..."
        className={styles.input}
        aria-label="Search"
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
    </form>
  );
}