import { createLazyFileRoute } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { cachedOpenAlex, createWorksQuery } from "@academic-explorer/client";
import type { Work, WorksFilters } from "@academic-explorer/types";
import { convertToRelativeUrl } from "@academic-explorer/ui/components/entity-views/matchers/index";
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
export const Route = createLazyFileRoute("/search")({
  component: SearchPage,
});

import { useEffect, useMemo, useState } from "react";
import { SearchInterface } from "../components/search/SearchInterface";
import { BaseTable } from "../components/tables/BaseTable";
import { pageDescription, pageTitle } from "../styles/layout.css";

interface SearchFilters {
  query: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Real OpenAlex API search function
const searchWorks = async (filters: SearchFilters): Promise<Work[]> => {
  if (!filters.query.trim()) return [];

  try {
    logger.debug("search", "Searching works with filters", { filters });

    const queryBuilder = createWorksQuery();

    // Add search query
    queryBuilder.addSearch(
      "display_name.search" as keyof WorksFilters,
      filters.query,
    );

    // Add date filters if provided
    if (filters.startDate) {
      const startYear = filters.startDate.getFullYear();
      queryBuilder.addFilter("publication_year", `>=${startYear}`);
    }

    if (filters.endDate) {
      const endYear = filters.endDate.getFullYear();
      queryBuilder.addFilter("publication_year", `<=${endYear}`);
    }

    const response = await cachedOpenAlex.client.works.searchWorks(
      filters.query,
      {
        filters: queryBuilder.build(),
        select: [
          "id",
          "display_name",
          "authorships",
          "publication_year",
          "cited_by_count",
          "primary_location",
          "open_access",
          "doi",
        ],
        per_page: 20,
      },
    );

    logger.debug("search", "Search completed", {
      resultsCount: response.results.length,
      total: response.meta.count,
    });

    return response.results;
  } catch (error) {
    logger.error("search", "Search failed", { error, filters });
    throw error;
  }
};

// Helper functions to reduce cognitive complexity
const renderSearchHeader = () => (
  <div>
    <Title order={1} className={pageTitle}>
      Academic Search
    </Title>
    <Text className={pageDescription}>
      Search the OpenAlex database of academic works with advanced filtering
      capabilities. Results are cached for improved performance.
    </Text>
  </div>
);

const renderEmptyState = () => (
  <Card withBorder>
    <Stack align="center" py="xl">
      <Text size="lg" fw={500}>
        Enter a search term to explore academic literature
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        Search millions of academic works from OpenAlex with real-time results,
        date filtering, and advanced search capabilities.
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
      No academic works found for &quot;{query}&quot;. Try different search
      terms or adjust your filters.
    </Text>
  </Alert>
);

// Extract column definitions to reduce complexity
const createSearchColumns = (): ColumnDef<Work>[] => [
  {
    accessorKey: "display_name",
    header: "Title",
    cell: ({ row }) => {
      const work = row.original;
      const authors =
        work.authorships
          ?.slice(0, 3)
          .map((a) => a.author?.display_name)
          .filter(Boolean) || [];
      const moreAuthors = (work.authorships?.length || 0) > 3;

      return (
        <div>
          <Text fw={500} size="sm" lineClamp={2}>
            {work.display_name}
          </Text>
          <Text size="xs" c="dimmed">
            {authors.length > 0 ? (
              <span>
                {authors.join(", ")}
                {moreAuthors && ` +${(work.authorships?.length || 0) - 3} more`}
              </span>
            ) : (
              "No authors listed"
            )}
          </Text>
          {work.doi && (
            <Anchor
              href={`https://doi.org/${work.doi}`}
              target="_blank"
              size="xs"
              c="dimmed"
            >
              DOI: {work.doi}
            </Anchor>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "display_name",
    header: "Title",
    cell: ({ row }) => {
      const work = row.original;
      const authors =
        work.authorships
          ?.slice(0, 3)
          .map((a) => a.author)
          .filter(Boolean) || [];
      const moreAuthors = (work.authorships?.length || 0) > 3;

      return (
        <div>
          <Text fw={500} size="sm" lineClamp={2}>
            {work.display_name}
          </Text>
          <Text size="xs" c="dimmed">
            {authors.length > 0 ? (
              <span>
                {authors.slice(0, 3).map((author, index) => {
                  const authorUrl = convertToRelativeUrl(
                    `https://openalex.org/${author.id}`,
                  );
                  return (
                    <span key={author.id}>
                      {authorUrl ? (
                        <Anchor
                          href={authorUrl}
                          size="xs"
                          style={{ textDecoration: "none" }}
                          aria-label={`View author ${author.display_name}`}
                        >
                          {author.display_name}
                        </Anchor>
                      ) : (
                        <span>{author.display_name}</span>
                      )}
                      {index < Math.min(authors.length, 3) - 1 && ", "}
                    </span>
                  );
                })}
                {moreAuthors && ` +${(work.authorships?.length || 0) - 3} more`}
              </span>
            ) : (
              "No authors listed"
            )}
          </Text>
          {work.doi && (
            <Anchor
              href={`https://doi.org/${work.doi}`}
              target="_blank"
              size="xs"
              c="dimmed"
            >
              DOI: {work.doi}
            </Anchor>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "primary_location",
    header: "Source",
    cell: ({ row }) => {
      const location = row.original.primary_location;
      const source = location?.source;

      if (!source?.display_name) {
        return <Text size="sm">Unknown</Text>;
      }

      const sourceUrl = convertToRelativeUrl(
        `https://openalex.org/${source.id}`,
      );

      return sourceUrl ? (
        <Anchor
          href={sourceUrl}
          size="sm"
          style={{ textDecoration: "none" }}
          aria-label={`View source ${source.display_name}`}
        >
          {source.display_name}
        </Anchor>
      ) : (
        <Text size="sm">{source.display_name}</Text>
      );
    },
  },
  {
    accessorKey: "cited_by_count",
    header: "Citations",
    cell: ({ row }) => (
      <Text size="sm" fw={500}>
        {formatLargeNumber(row.original.cited_by_count || 0)}
      </Text>
    ),
  },
  {
    accessorKey: "open_access",
    header: "Access",
    cell: ({ row }) => {
      const isOpen = row.original.open_access?.is_oa || false;

      return (
        <Badge
          size="sm"
          color={isOpen ? "green" : "gray"}
          variant={isOpen ? "light" : "outline"}
        >
          {isOpen ? "Open Access" : "Closed"}
        </Badge>
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
    queryKey: ["search", searchFilters],
    queryFn: () => searchWorks(searchFilters),
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
          onRowClick={(work) => {
            logger.debug(
              "ui",
              "Work clicked in search results",
              { workId: work.id, workTitle: work.display_name },
              "SearchPage",
            );
            // Navigate to work detail page if needed
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
          placeholder="Try searching for 'machine learning', 'climate change', or 'artificial intelligence'"
          showDateFilter={true}
        />

        {hasQuery && <Card withBorder>{renderSearchResults()}</Card>}

        {!hasQuery && renderEmptyState()}
      </Stack>
    </Container>
  );
}

export default SearchPage;
