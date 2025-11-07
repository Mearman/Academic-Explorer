import { useState, useCallback } from "react";
import { Group, TextInput, Button, Stack, Paper, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import {
  debouncedSearch,
  normalizeSearchQuery,
  isValidSearchQuery,
} from "@academic-explorer/utils";

interface SearchFilters {
  query: string;
}

interface SearchInterfaceProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchInterface({
  onSearch,
  isLoading = false,
  placeholder = "Search academic works, authors, institutions...",
}: SearchInterfaceProps) {
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(() => {
    const filters: SearchFilters = {
      query: isValidSearchQuery(query) ? normalizeSearchQuery(query) : "",
    };

    onSearch(filters);
  }, [query, onSearch]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      // Only trigger debounced search if we have a valid query
      if (isValidSearchQuery(value)) {
        debouncedSearch(() => {
          const filters: SearchFilters = {
            query: normalizeSearchQuery(value),
          };
          onSearch(filters);
        }, value);
      }
    },
    [onSearch],
  );

  const handleClearFilters = () => {
    setQuery("");
    onSearch({
      query: "",
    });
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group>
          <Title order={3}>Search Academic Literature</Title>
        </Group>

        <Group align="flex-end">
          <TextInput
            placeholder={placeholder}
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
            }}
            disabled={isLoading}
            flex={1}
            size="md"
            aria-label="Search query input"
          />

          <Button
            onClick={handleSearch}
            loading={isLoading}
            leftSection={<IconSearch size={16} />}
          >
            Search
          </Button>

          {Boolean(query) && (
            <Button
              variant="subtle"
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Clear
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
