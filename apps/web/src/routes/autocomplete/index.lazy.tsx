import {
  cachedOpenAlex,
  type AutocompleteResult,
} from "@bibgraph/client";
import { logger } from "@bibgraph/utils";
import {
  Alert,
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconInfoCircle, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, createLazyFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { EntityGrid } from "@/components/EntityGrid";
import { EntityListView } from "@/components/EntityListView";
import { BaseTable } from "@/components/tables/BaseTable";
import { ViewModeToggle, type TableViewMode } from "@/components/ViewModeToggle";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { transformAutocompleteResultToGridItem } from "@/utils/entity-mappers";


function AutocompleteGeneralRoute() {
  const urlSearch = useSearch({ from: "/autocomplete/" });
  const [query, setQuery] = useState(urlSearch.q || urlSearch.search || "");
  const [viewMode, setViewMode] = useState<TableViewMode>("list");
  const { getEntityColor } = useThemeColors();

  // Define table columns for AutocompleteResult
  const tableColumns = useMemo<ColumnDef<AutocompleteResult>[]>(() => [
    {
      id: "display_name",
      accessorKey: "display_name",
      header: "Name",
      cell: (info) => {
        const result = info.row.original;
        const id = typeof result.id === 'string' ? result.id : String(result.id);
        const cleanId = id.replace("https://openalex.org/", "");
        const routeMap: Record<string, string> = {
          work: "works",
          author: "authors",
          institution: "institutions",
          source: "sources",
          concept: "concepts",
          topic: "topics",
          funder: "funders",
          publisher: "publishers",
        };
        const routePath = routeMap[result.entity_type] || result.entity_type;
        return (
          <Anchor href={`#/${routePath}/${cleanId}`} fw={500}>
            {info.getValue() as string}
          </Anchor>
        );
      },
    },
    {
      id: "entity_type",
      accessorKey: "entity_type",
      header: "Type",
      cell: (info) => {
        const entityType = info.getValue() as string;
        return (
          <Badge size="sm" variant="light" color={getEntityColor(entityType)}>
            {entityType}
          </Badge>
        );
      },
    },
    {
      id: "hint",
      accessorKey: "hint",
      header: "Description",
      cell: (info) => {
        const hint = info.getValue() as string | undefined;
        return hint ? (
          <Text size="sm" c="dimmed" lineClamp={1}>
            {hint}
          </Text>
        ) : null;
      },
    },
    {
      id: "works_count",
      accessorKey: "works_count",
      header: "Works",
      cell: (info) => {
        const count = info.getValue() as number | undefined;
        return count !== undefined && count !== null
          ? count.toLocaleString()
          : "-";
      },
    },
    {
      id: "cited_by_count",
      accessorKey: "cited_by_count",
      header: "Citations",
      cell: (info) => {
        const count = info.getValue() as number | undefined;
        return count !== undefined && count !== null
          ? count.toLocaleString()
          : "-";
      },
    },
  ], [getEntityColor]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash;
      const decodedHash = decodeURIComponent(currentHash);
      if (currentHash !== decodedHash) {
        window.history.replaceState(null, "", decodedHash);
      }
    }
  }, []);

  useEffect(() => {
    const newQuery = urlSearch.q || urlSearch.search || "";
    if (newQuery !== query) {
      setQuery(newQuery);
    }
  }, [urlSearch.q, urlSearch.search, query]);

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["autocomplete", "general", query],
    queryFn: async () => {
      if (!query.trim()) return [];

      logger.debug(
        "autocomplete",
        "Fetching general autocomplete suggestions",
        { query },
      );

      const response =
        await cachedOpenAlex.client.autocomplete.autocompleteGeneral(query);

      logger.debug("autocomplete", "General suggestions received", {
        count: response.length,
      });

      return response;
    },
    enabled: query.trim().length > 0,
    staleTime: 30000,
  });

  const handleSearch = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams();
    if (value) {
      params.set("q", value);
    }
    if (urlSearch.filter) {
      params.set("filter", urlSearch.filter);
    }
    const newHash = params.toString()
      ? `#/autocomplete?${params.toString()}`
      : "#/autocomplete";
    window.history.replaceState(null, "", newHash);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>General Autocomplete</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Search across all entity types with real-time suggestions from the
            OpenAlex database
          </Text>
        </div>

        <TextInput
          placeholder="Search for anything in OpenAlex..."
          value={query}
          onChange={(event) => handleSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="md"
        />

        {urlSearch.filter && (
          <Alert icon={<IconInfoCircle />} title="Active Filters" color="blue">
            <Text size="sm">Filter: {urlSearch.filter}</Text>
          </Alert>
        )}

        {!query.trim() && (
          <Card withBorder>
            <Stack align="center" py="xl">
              <Text size="lg" fw={500}>
                Enter a search term to see suggestions
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Start typing to get real-time autocomplete suggestions from all
                OpenAlex entities
              </Text>
            </Stack>
          </Card>
        )}

        {isLoading && query.trim() && (
          <Text ta="center" py="xl">
            Loading suggestions...
          </Text>
        )}

        {error && (
          <Alert
            icon={<IconInfoCircle />}
            title="API Error"
            color="red"
            variant="light"
          >
            <Stack gap="xs">
              <Text size="sm">
                {(() => {
                  if (error instanceof Error) {
                    const match = error.message.match(
                      /autocomplete failed: (.+)/,
                    );
                    if (match) {
                      return match[1];
                    }
                    return error.message;
                  }
                  return String(error);
                })()}
              </Text>
            </Stack>
          </Alert>
        )}

        {!isLoading && results.length === 0 && query.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No results"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No results found matching &quot;{query}&quot;. Try different
              search terms.
            </Text>
          </Alert>
        )}

        {results.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Found {results.length} suggestion{results.length !== 1 ? "s" : ""}
              </Text>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </Group>

            {viewMode === "table" && (
              <BaseTable
                data={results}
                columns={tableColumns}
                searchable={false}
                pageSize={25}
              />
            )}

            {viewMode === "list" && (
              <EntityListView
                items={results.map(transformAutocompleteResultToGridItem)}
              />
            )}

            {viewMode === "grid" && (
              <EntityGrid
                items={results.map(transformAutocompleteResultToGridItem)}
              />
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
export const Route = createLazyFileRoute("/autocomplete/")({
  component: AutocompleteGeneralRoute,
});

export default AutocompleteGeneralRoute;
