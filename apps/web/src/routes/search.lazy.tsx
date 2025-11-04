import { createLazyFileRoute } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { cachedOpenAlex } from "@academic-explorer/client";
import type { AutocompleteResult } from "@academic-explorer/client";
import { convertToRelativeUrl } from "@academic-explorer/ui";
import { formatLargeNumber, logger } from "@academic-explorer/utils";
import {
  Alert,
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBookmark,
  IconBookmarkOff,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { useEffect, useMemo, useState } from "react";
import { SearchInterface } from "../components/search/SearchInterface";
import { BaseTable } from "../components/tables/BaseTable";
import { pageDescription, pageTitle } from "../styles/layout.css";

interface SearchFilters {
  query: string;
  startDate: Date | null;
  endDate: Date | null;
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
      {
        per_page: 50, // Get more results for better coverage
      },
    );

    logger.debug("search", "Autocomplete search completed", {
      resultsCount: results.length,
      query: filters.query,
    });

    // Filter by date if provided
    if (filters.startDate || filters.endDate) {
      return results.filter((result) => {
        // Only works have publication_year, so filter those
        if (result.entity_type !== "work") return true;

        const year = (result as unknown as { publication_year?: number })
          .publication_year;
        if (!year) return true;

        if (filters.startDate && year < filters.startDate.getFullYear()) {
          return false;
        }
        if (filters.endDate && year > filters.endDate.getFullYear()) {
          return false;
        }
        return true;
      });
    }

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

const renderEmptyState = () => (
  <Card withBorder>
    <Stack align="center" py="xl">
      <Text size="lg" fw={500}>
        Enter a search term to explore OpenAlex
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        Search across millions of works, authors, sources, institutions, and
        topics with real-time results and intelligent ranking.
      </Text>
    </Stack>
  </Card>
);

const renderLoadingState = () => (
  <Text ta="center" py="xl">
    Searching OpenAlex database...
  </Text>
);

const renderErrorState = (error: unknown) => (
  <Alert
    icon={<IconInfoCircle />}
    title="Search Error"
    color="red"
    variant="light"
  >
    <Text size="sm">
      Failed to search OpenAlex: {String(error)}. Please try again.
    </Text>
  </Alert>
);

const renderNoResultsState = (query: string) => (
  <Alert
    icon={<IconInfoCircle />}
    title="No results found"
    color="blue"
    variant="light"
  >
    <Text size="sm">
      No entities found for &quot;{query}&quot;. Try different search terms or
      adjust your filters.
    </Text>
  </Alert>
);

// Get entity type color for badges
const getEntityTypeColor = (entityType: AutocompleteResult["entity_type"]) => {
  const colors: Record<AutocompleteResult["entity_type"], string> = {
    work: "blue",
    author: "green",
    source: "orange",
    institution: "purple",
    topic: "red",
    concept: "pink",
    publisher: "grape",
    funder: "teal",
    keyword: "cyan",
  };
  return colors[entityType] || "gray";
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
      const entityUrl = convertToRelativeUrl(
        `https://openalex.org/${result.id}`,
      );

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

function SearchPage() {
  const searchParams = useSearch({ from: "/search" });

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: "",
    startDate: null,
    endDate: null,
  });

  // Handle URL parameters on mount
  useEffect(() => {
    const qParam = searchParams.q;

    if (qParam && typeof qParam === "string") {
      setSearchFilters((prev) => ({ ...prev, query: qParam }));
    }
  }, [searchParams.q]);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    return searchFilters.query
      ? {
          startDate: searchFilters.startDate?.toISOString(),
          endDate: searchFilters.endDate?.toISOString(),
        }
      : undefined;
  }, [searchFilters.query, searchFilters.startDate, searchFilters.endDate]);

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
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const columns = createSearchColumns();

  const handleSearch = async (filters: SearchFilters) => {
    setSearchFilters(filters);
    // Auto-tracking in useUserInteractions will handle page visit recording
  };

  const hasResults = searchResults && searchResults.length > 0;
  const hasQuery = Boolean(searchFilters.query.trim());

  const renderSearchResults = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderErrorState(error);
    if (!hasResults) return renderNoResultsState(searchFilters.query);

    return (
      <Stack>
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Found {searchResults.length} results for &quot;
            {searchFilters.query}&quot;
            {searchFilters.startDate || searchFilters.endDate ? (
              <span> with date filters applied</span>
            ) : null}
          </Text>

          {hasQuery && (
            <button
              onClick={async () => {
                if (userInteractions.isBookmarked) {
                  await userInteractions.unbookmarkSearch();
                } else {
                  const title =
                    searchFilters.startDate || searchFilters.endDate
                      ? `${searchFilters.query} (${searchFilters.startDate?.getFullYear() || ""}-${searchFilters.endDate?.getFullYear() || ""})`
                      : searchFilters.query;
                  await userInteractions.bookmarkSearch({
                    title,
                    searchQuery: searchFilters.query,
                    filters: {
                      startDate: searchFilters.startDate?.toISOString(),
                      endDate: searchFilters.endDate?.toISOString(),
                    },
                  });
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                userInteractions.isBookmarked
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={
                userInteractions.isBookmarked
                  ? "Remove search bookmark"
                  : "Bookmark this search"
              }
            >
              {userInteractions.isBookmarked ? (
                <IconBookmark size={16} fill="currentColor" />
              ) : (
                <IconBookmarkOff size={16} />
              )}
              {userInteractions.isBookmarked ? "Bookmarked" : "Bookmark Search"}
            </button>
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
          showDateFilter={true}
        />

        {hasQuery && <Card withBorder>{renderSearchResults()}</Card>}

        {!hasQuery && renderEmptyState()}
      </Stack>
    </Container>
  );
}

export const Route = createLazyFileRoute("/search")({
  component: SearchPage,
});

export default SearchPage;
