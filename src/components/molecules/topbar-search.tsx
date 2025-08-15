import { 
  Group, 
  Autocomplete, 
  Text,
  Stack,
  Loader,
  rem
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

import { useTopbarSearch } from '@/hooks/use-topbar-search';
import type { SearchSuggestion } from '@/hooks/use-topbar-search';

import { EntityBadge } from '../atoms/entity-badge';

interface TopbarSearchProps {
  placeholder?: string;
  width?: number;
}

// Render option component
function renderSearchOption(option: { value: string }, suggestions: SearchSuggestion[]) {
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
}

export function TopbarSearch({ 
  placeholder = "Quick search...",
  width = 400 
}: TopbarSearchProps) {
  const { query, setQuery, suggestions, loading, handleSelect, handleKeyDown } = useTopbarSearch();

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
      renderOption={({ option }) => renderSearchOption(option, suggestions)}
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