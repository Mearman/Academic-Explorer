import { cachedOpenAlex } from "@bibgraph/client";
import { ENTITY_METADATA, toEntityType } from "@bibgraph/types";
import type { AutocompleteResult } from "@bibgraph/types/entities";
import { convertToRelativeUrl, SearchEmptyState } from "@bibgraph/ui";
import { formatLargeNumber, logger } from "@bibgraph/utils";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBookmark,
  IconBookmarkOff,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute,useSearch  } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE, SEARCH, TIME_MS } from '@/config/style-constants';
import { useUserInteractions } from "@/hooks/use-user-interactions";

import { SearchInterface } from "../components/search/SearchInterface";
import { BaseTable } from "../components/tables/BaseTable";
import { pageDescription, pageTitle } from "../styles/layout.css";

interface SearchFilters {
  query: string;
}

// Real OpenAlex API autocomplete function - searches across all entity types
const searchAllEntities = async (
  filters: SearchFilters,
): Promise<AutocompleteResult[]> => {
  if (!filters.query.trim()) return [];

  try {
    logger.debug("search", "Searching all entities with autocomplete", {
      filters,
    });

    // Use the general autocomplete endpoint that searches across all entity types
    const results = await cachedOpenAlex.client.autocomplete.autocompleteGeneral(
      filters.query,
    );

    logger.debug("search", "Autocomplete search completed", {
      resultsCount: results.length,
      query: filters.query,
    });

    return results;
  } catch (error) {
    logger.error("search", "Autocomplete search failed", { error, filters });
    throw error;
  }
};

// Helper functions to reduce cognitive complexity
const renderSearchHeader = () => (
  <div>
    <Title order={1} className={pageTitle}>
      Universal Search
    </Title>
    <Text className={pageDescription}>
      Search across all OpenAlex entities - works, authors, sources,
      institutions, and topics. Results are sorted by relevance and cached for
      improved performance.
    </Text>
  </div>
);

const renderEmptyState = (onQuickSearch?: (query: string) => void) => (
  <SearchEmptyState
    variant="initial"
    onQuickSearch={onQuickSearch}
  />
);

const renderLoadingState = () => (
  <Text ta="center" py="xl">
    Searching OpenAlex database...
  </Text>
);

const renderErrorState = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isNetworkError = errorMessage.toLowerCase().includes('network') ||
                         errorMessage.toLowerCase().includes('fetch');
  const isRateLimitError = errorMessage.toLowerCase().includes('rate limit') ||
                           errorMessage.toLowerCase().includes('too many');

  let errorTitle = "Search Error";
  let errorDescription = `Failed to search OpenAlex: ${errorMessage}. Please try again.`;

  if (isNetworkError) {
    errorTitle = "Network Error";
    errorDescription = "Unable to connect to OpenAlex. Please check your internet connection and try again.";
  } else if (isRateLimitError) {
    errorTitle = "Rate Limited";
    errorDescription = "Too many search requests. Please wait a moment and try again.";
  }

  return (
    <Alert
      icon={<IconInfoCircle />}
      title={errorTitle}
      color="red"
      variant="light"
    >
      <Text size="sm">
        {errorDescription}
      </Text>
    </Alert>
  );
};

const renderNoResultsState = (query: string, onQuickSearch?: (query: string) => void) => (
  <SearchEmptyState
    variant="no-results"
    query={query}
    onQuickSearch={onQuickSearch}
  />
);

// Get entity type color for badges using centralized metadata
const getEntityTypeColor = (entityType: AutocompleteResult["entity_type"]) => {
  const pluralForm = toEntityType(entityType);
  if (pluralForm) {
    return ENTITY_METADATA[pluralForm].color;
  }
  return "gray";
};

// Extract column definitions to reduce complexity
const createSearchColumns = (): ColumnDef<AutocompleteResult>[] => [
  {
    accessorKey: "entity_type",
    header: "Type",
    size: 100,
    cell: ({ row }) => {
      const result = row.original;
      return (
        <Badge
          size="sm"
          color={getEntityTypeColor(result.entity_type)}
          variant="light"
        >
          {result.entity_type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "display_name",
    header: "Name",
    cell: ({ row }) => {
      const result = row.original;
      // result.id is already a full URL like "https://openalex.org/T10044"
      // Don't prepend another domain prefix
      const entityUrl = convertToRelativeUrl(result.id);

      return (
        <div>
          {entityUrl ? (
            <Anchor
              href={entityUrl}
              size="sm"
              fw={500}
              style={{ textDecoration: "none" }}
              aria-label={`View ${result.entity_type} ${result.display_name}`}
            >
              {result.display_name}
            </Anchor>
          ) : (
            <Text fw={500} size="sm">
              {result.display_name}
            </Text>
          )}
          {result.hint && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {result.hint}
            </Text>
          )}
          {result.external_id && (
            <Text size="xs" c="dimmed">
              {result.external_id}
            </Text>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "cited_by_count",
    header: "Citations",
    size: 120,
    cell: ({ row }) => {
      const count = row.original.cited_by_count;
      return count ? (
        <Text size="sm" fw={500}>
          {formatLargeNumber(count)}
        </Text>
      ) : (
        <Text size="sm" c="dimmed">
          —
        </Text>
      );
    },
  },
  {
    accessorKey: "works_count",
    header: "Works",
    size: 100,
    cell: ({ row }) => {
      const count = row.original.works_count;
      return count ? (
        <Text size="sm">{formatLargeNumber(count)}</Text>
      ) : (
        <Text size="sm" c="dimmed">
          —
        </Text>
      );
    },
  },
];

const SearchPage = () => {
  const searchParams = useSearch({ from: "/search" });

  // Derive initial search filters from URL parameters using useMemo
  const initialSearchFilters = useMemo<SearchFilters>(() => {
    const qParam = searchParams.q;
    return {
      query: qParam && typeof qParam === "string" ? qParam : "",
    };
  }, [searchParams.q]);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>(
    initialSearchFilters,
  );
  const [loading, setLoading] = useState(false);

  // Update searchFilters when URL parameters change
  useEffect(() => {
    setSearchFilters(initialSearchFilters);
  }, [initialSearchFilters]);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    return searchFilters.query
      ? {}
      : undefined;
  }, [searchFilters.query]);

  // Track page visits and bookmarks - only when we have a query to avoid re-render loops
  const userInteractions = useUserInteractions({
    searchQuery: searchFilters.query || undefined,
    filters: memoizedFilters,
    autoTrackVisits: Boolean(searchFilters.query),
  });

  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["search-autocomplete", searchFilters],
    queryFn: () => searchAllEntities(searchFilters),
    enabled: Boolean(searchFilters.query.trim()),
    retry: SEARCH.MAX_RETRY_ATTEMPTS,
    staleTime: TIME_MS.SEARCH_STALE_TIME,
  });

  const columns = createSearchColumns();

  const handleSearch = async (filters: SearchFilters) => {
    setSearchFilters(filters);
    // Auto-tracking in useUserInteractions will handle page visit recording
  };

  const handleQuickSearch = async (query: string) => {
    setSearchFilters({ query });
    // Auto-tracking in useUserInteractions will handle page visit recording
  };

  const hasResults = searchResults && searchResults.length > 0;
  const hasQuery = Boolean(searchFilters.query.trim());

  const renderSearchResults = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderErrorState(error);
    if (!hasResults) return renderNoResultsState(searchFilters.query, handleQuickSearch);

    return (
      <Stack>
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Found {searchResults.length} results for &quot;
            {searchFilters.query}&quot;
          </Text>

          {hasQuery && (
            <Button
              variant="light"
              color={userInteractions.isBookmarked ? "yellow" : "gray"}
              size="sm"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  if (userInteractions.isBookmarked) {
                    await userInteractions.unbookmarkSearch();
                    notifications.show({
                      title: "Bookmark Removed",
                      message: `Search "${searchFilters.query}" has been removed from your bookmarks`,
                      color: "green",
                      autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
                    });
                  } else {
                    const title = searchFilters.query;
                    await userInteractions.bookmarkSearch({
                      title,
                      searchQuery: searchFilters.query,
                    });
                    notifications.show({
                      title: "Search Bookmarked",
                      message: `Search "${searchFilters.query}" has been added to your bookmarks`,
                      color: "blue",
                      autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
                    });
                  }
                } catch (error) {
                  logger.error("ui", "Bookmark operation failed", {
                    error,
                    searchQuery: searchFilters.query,
                    isBookmarked: userInteractions.isBookmarked
                  }, "SearchPage");

                  notifications.show({
                    title: "Bookmark Failed",
                    message: "Could not update bookmark. Please try again.",
                    color: "red",
                    autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
                  });
                } finally {
                  setLoading(false);
                }
              }}
              leftSection={
                userInteractions.isBookmarked ? (
                  <IconBookmark size={ICON_SIZE.MD} fill="currentColor" />
                ) : (
                  <IconBookmarkOff size={ICON_SIZE.MD} />
                )
              }
              title={
                userInteractions.isBookmarked
                  ? "Remove search bookmark"
                  : "Bookmark this search"
              }
            >
              {userInteractions.isBookmarked ? "Bookmarked" : "Bookmark Search"}
            </Button>
          )}
        </Group>

        <BaseTable
          data={searchResults}
          columns={columns}
          searchable={false} // Search is handled by the SearchInterface
          onRowClick={(result) => {
            logger.debug(
              "ui",
              "Search result clicked",
              {
                id: result.id,
                name: result.display_name,
                type: result.entity_type,
              },
              "SearchPage",
            );
            // Navigation is handled by the entity links in the table
          }}
        />
      </Stack>
    );
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        {renderSearchHeader()}

        <SearchInterface
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Search for works, authors, institutions, topics... e.g. 'machine learning', 'Marie Curie', 'MIT'"
        />

        {hasQuery && <Card style={{ border: BORDER_STYLE_GRAY_3 }}>{renderSearchResults()}</Card>}

        {!hasQuery && renderEmptyState(handleQuickSearch)}
      </Stack>
    </Container>
  );
};

export const Route = createLazyFileRoute("/search")({
  component: SearchPage,
});

export default SearchPage;
