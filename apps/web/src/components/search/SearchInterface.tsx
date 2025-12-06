import { debouncedSearch, isValidSearchQuery, logger, normalizeSearchQuery } from "@bibgraph/utils";
import { ActionIcon, Alert, Button, Group, Paper, Stack, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle, IconSearch, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { SearchLoadingSpinner } from '@bibgraph/ui';

interface SearchFilters {
  query: string;
}

interface SearchInterfaceProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
  placeholder?: string;
  showHelp?: boolean;
}

export const SearchInterface = ({
  onSearch,
  isLoading = false,
  placeholder = "Search academic works, authors, institutions...",
  showHelp = false
}: SearchInterfaceProps) => {
  const [query, setQuery] = useState("");
  const [searchTip, setSearchTip] = useState("");

  const handleSearch = useCallback(() => {
    const filters = {
      query: isValidSearchQuery(query) ? normalizeSearchQuery(query) : "",
    };
    onSearch(filters);
  }, [query, onSearch]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Only trigger debounced search if we have a valid query
    if (isValidSearchQuery(value)) {
      debouncedSearch(() => {
        const filters = {
          query: normalizeSearchQuery(value),
        };
        onSearch(filters);
      }, value);
    }
  }, [onSearch]);

  // Generate search tips rotation
  useEffect(() => {
    const tips = [
      "Use quotes for exact phrases: \"machine learning\"",
      "Combine terms: AI AND healthcare",
      "Exclude terms: climate -change",
      "Search by entity type: authors:Smith",
      "Use wildcards: neural* networks",
      "Filter by year: published:>2020"
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setSearchTip(randomTip);

    const tipInterval = setInterval(() => {
      const nextTip = tips[Math.floor(Math.random() * tips.length)];
      setSearchTip(nextTip);
    }, 8000); // Rotate tips every 8 seconds

    return () => clearInterval(tipInterval);
  }, []);

  const handleClearFilters = () => {
    setQuery("");
    onSearch({
      query: "",
    });
    logger.info("ui", "Search cleared by user", { component: "SearchInterface" }, "SearchInterface");
  };

  // Log search activity
  useEffect(() => {
    if (query.length > 0) {
      logger.debug("ui", "Search query updated", {
        queryLength: query.length,
        isValid: isValidSearchQuery(query)
      }, "SearchInterface");
    }
  }, [query]);

  return (
    <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Stack gap="md">
        {/* Header with help */}
        <Group justify="space-between" align="center">
          <Title order={3}>Search Academic Literature</Title>
          {showHelp && (
            <Tooltip label="Search tips and help" position="bottom">
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label="Search help"
                onClick={() => {
                  logger.info("ui", "Search help requested", { component: "SearchInterface" }, "SearchInterface");
                }}
              >
                <IconInfoCircle size={ICON_SIZE.SM} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        {/* Search Tips */}
        {showHelp && searchTip && (
          <Alert
            variant="light"
            color="blue"
            icon={<IconInfoCircle size={ICON_SIZE.SM} />}
            radius="md"
          >
            <Text size="sm">
              <strong>Pro tip:</strong> {searchTip}
            </Text>
          </Alert>
        )}

        {/* Search Input Group */}
        <Group align="flex-end">
          <TextInput
            placeholder={placeholder}
            leftSection={
              isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid var(--mantine-color-blue-6)',
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : (
                <IconSearch size={ICON_SIZE.MD} />
              )
            }
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
            }}
            disabled={isLoading}
            flex={1}
            size="md"
            aria-label="Search query input"
            rightSection={query && !isLoading && (
              <Tooltip label="Clear search">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleClearFilters}
                  aria-label="Clear search query"
                >
                  <IconX size={ICON_SIZE.SM} />
                </ActionIcon>
              </Tooltip>
            )}
          />
          <Button
            onClick={handleSearch}
            loading={isLoading}
            leftSection={<IconSearch size={ICON_SIZE.MD} />}
            disabled={!query.trim() || isLoading}
            aria-label="Execute search"
          >
            Search
          </Button>
        </Group>

        {/* Search Status */}
        {query && !isLoading && (
          <Text size="sm" c="dimmed" ta="center">
            {isValidSearchQuery(query)
              ? `Ready to search for "${normalizeSearchQuery(query)}"`
              : "Enter a valid search query to continue"}
          </Text>
        )}

        {/* Enhanced Loading Indicator */}
        {isLoading && (
          <SearchLoadingSpinner
            message="Searching academic database..."
            showEta={true}
          />
        )}
      </Stack>
    </Paper>
  );
};