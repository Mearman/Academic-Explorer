import { Stack, Text, Button, Group, TextInput, Box } from '@mantine/core';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { useAppStore } from '@/stores/app-store';

import { AutocompleteSearch } from './autocomplete-search';
import type { AutocompleteSuggestion } from './autocomplete-search';

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
    <Box maw={600} mx="auto" mb="xl" className={className}>
      <Stack align="center" gap="md">
        <Box style={{ width: '100%' }}>
          <AutocompleteSearch
            placeholder="Search authors, works, institutions..."
            onSelect={onSelect}
            showEntityBadges={true}
            maxSuggestions={6}
          />
        </Box>
        <Text size="sm" c="dimmed" ta="center" fs="italic">
          Try searching for authors, papers, institutions, or topics
        </Text>
      </Stack>
    </Box>
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
    <Box maw={600} mx="auto" mb="xl" className={className}>
      <form onSubmit={onSubmit}>
        <Group gap="md" style={{ flexDirection: 'row', '@media (max-width: 640px)': { flexDirection: 'column' } }}>
          <TextInput
            flex={1}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search academic literature"
            aria-label="Search"
            size="lg"
          />
          <Button 
            type="submit" 
            size="lg" 
            color="blue"
            style={{ whiteSpace: 'nowrap' }}
          >
            Search
          </Button>
        </Group>
      </form>
    </Box>
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