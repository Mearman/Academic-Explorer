import { useState, useCallback, useEffect } from 'react';
import { 
  Group, 
  Autocomplete, 
  Text,
  Stack,
  Loader,
  rem
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useRouter } from '@tanstack/react-router';
import { cachedOpenAlex } from '@/lib/openalex/client-with-cache';
import { parseEntityIdentifier } from '@/lib/openalex/utils/entity-detection';
import { EntityBadge } from '../atoms/entity-badge';
import type { EntityType } from '../types';

interface SearchSuggestion {
  value: string;
  id: string;
  entity_type: EntityType;
  hint?: string;
  cited_by_count?: number;
  works_count?: number;
}

interface TopbarSearchProps {
  placeholder?: string;
  width?: number;
}

export function TopbarSearch({ 
  placeholder = "Quick search...",
  width = 400 
}: TopbarSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const router = useRouter();

  // Search for suggestions
  const searchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const searchParams = { q: searchQuery };
      const maxPerType = 2; // Keep it compact
      
      const [worksResponse, authorsResponse, sourcesResponse, institutionsResponse] = await Promise.allSettled([
        cachedOpenAlex.worksAutocomplete(searchParams),
        cachedOpenAlex.authorsAutocomplete(searchParams), 
        cachedOpenAlex.sourcesAutocomplete(searchParams),
        cachedOpenAlex.institutionsAutocomplete(searchParams)
      ]);

      const allSuggestions: SearchSuggestion[] = [];
      
      const processResponse = (response: PromiseSettledResult<{ results: unknown[] }>, entityType: EntityType) => {
        if (response.status === 'fulfilled' && response.value?.results) {
          return response.value.results.slice(0, maxPerType).map((result: unknown): SearchSuggestion => {
            const item = result as Record<string, unknown>;
            const id = typeof item.id === 'string' ? item.id : '';
            const display_name = typeof item.display_name === 'string' ? item.display_name : '';
            const hint = typeof item.hint === 'string' ? item.hint : undefined;
            const cited_by_count = typeof item.cited_by_count === 'number' ? item.cited_by_count : undefined;
            const works_count = typeof item.works_count === 'number' ? item.works_count : undefined;

            return {
              value: display_name,
              id,
              entity_type: entityType,
              hint,
              cited_by_count,
              works_count
            };
          });
        }
        return [];
      };

      allSuggestions.push(
        ...processResponse(worksResponse, 'work'),
        ...processResponse(authorsResponse, 'author'),
        ...processResponse(sourcesResponse, 'source'),
        ...processResponse(institutionsResponse, 'institution')
      );

      // Sort by relevance and limit to 6 items for compactness
      const sortedSuggestions = allSuggestions
        .sort((a, b) => {
          const aScore = a.cited_by_count || a.works_count || 0;
          const bScore = b.cited_by_count || b.works_count || 0;
          return bScore - aScore;
        })
        .slice(0, 6);

      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Topbar search failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, searchSuggestions]);

  // Handle suggestion selection
  const handleSelect = (suggestion: SearchSuggestion) => {
    const entityId = parseEntityIdentifier(suggestion.id).numericId;
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
    setQuery(''); // Clear search after navigation
  };

  // Handle Enter key for general search
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && query.trim() && suggestions.length === 0) {
      // Navigate to a general search results page
      router.navigate({
        to: '/',
        search: { q: query.trim() }
      });
      setQuery('');
    }
  };

  return (
    <Autocomplete
      value={query}
      onChange={setQuery}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} />}
      rightSection={loading ? <Loader size="xs" /> : null}
      data={suggestions}
      onOptionSubmit={(value) => {
        const suggestion = suggestions.find(s => s.value === value);
        if (suggestion) {
          handleSelect(suggestion);
        }
      }}
      renderOption={({ option }) => {
        const suggestion = suggestions.find(s => s.value === option.value);
        if (!suggestion) return <Text>{option.value}</Text>;

        return (
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" lineClamp={1}>
                {suggestion.value}
              </Text>
              <EntityBadge entityType={suggestion.entity_type} size="xs" />
            </Group>
            {suggestion.hint && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {suggestion.hint}
              </Text>
            )}
            {(suggestion.cited_by_count || suggestion.works_count) && (
              <Text size="xs" c="dimmed">
                {suggestion.entity_type === 'work' && suggestion.cited_by_count && 
                  `${suggestion.cited_by_count.toLocaleString()} citations`}
                {suggestion.entity_type === 'author' && suggestion.works_count && 
                  `${suggestion.works_count.toLocaleString()} works`}
              </Text>
            )}
          </Stack>
        );
      }}
      styles={{
        root: { width },
        dropdown: { maxWidth: 500 },
      }}
      comboboxProps={{
        position: 'bottom-start',
        middlewares: { flip: true, shift: true },
        dropdownPadding: 0,
      }}
      maxDropdownHeight={300}
      limit={6}
    />
  );
}