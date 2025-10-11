import {
    cachedOpenAlex,
    type AutocompleteResult,
} from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils";
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
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const autocompleteSearchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/autocomplete/")({
  component: AutocompleteGeneralRoute,
  validateSearch: autocompleteSearchSchema,
});

function AutocompleteGeneralRoute() {
  const urlSearch = Route.useSearch();
  const [query, setQuery] = useState(urlSearch.q || urlSearch.search || "");

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

      logger.debug("autocomplete", "Fetching general autocomplete suggestions", { query });

      const response = await cachedOpenAlex.client.autocomplete.autocompleteGeneral(query);

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
    const newHash = params.toString() ? `#/autocomplete?${params.toString()}` : "#/autocomplete";
    window.history.replaceState(null, "", newHash);
  };

  const getEntityColor = (entityType: string | undefined): string => {
    const colorMap: Record<string, string> = {
      work: "blue",
      author: "teal",
      institution: "cyan",
      source: "indigo",
      concept: "blue",
      topic: "violet",
      funder: "green",
      publisher: "orange",
    };
    return colorMap[entityType || ""] || "gray";
  };

  const getEntityRoute = (result: AutocompleteResult): string => {
    const cleanId = result.id.replace("https://openalex.org/", "");
    const entityType = result.entity_type || "";

    // Map entity_type to route path
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

    const routePath = routeMap[entityType] || entityType;
    return `#/${routePath}/${cleanId}`;
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>General Autocomplete</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Search across all entity types with real-time suggestions from the OpenAlex database
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
                Start typing to get real-time autocomplete suggestions from all OpenAlex entities
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
                    const match = error.message.match(/autocomplete failed: (.+)/);
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
              No results found matching &quot;{query}&quot;. Try different search terms.
            </Text>
          </Alert>
        )}

        {results.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {results.length} suggestion{results.length !== 1 ? "s" : ""}
            </Text>
            {results.map((result: AutocompleteResult) => (
              <Card key={result.id} withBorder padding="md" shadow="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      href={getEntityRoute(result)}
                      fw={500}
                      size="md"
                    >
                      {result.display_name}
                    </Anchor>
                    <Badge size="sm" variant="light" color={getEntityColor(result.entity_type)}>
                      {result.entity_type || "Unknown"}
                    </Badge>
                  </Group>

                  {result.hint && (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {result.hint}
                    </Text>
                  )}

                  <Group gap="md">
                    {result.cited_by_count !== undefined && result.cited_by_count !== null && (
                      <Text size="xs" c="dimmed">
                        Citations: {result.cited_by_count.toLocaleString()}
                      </Text>
                    )}
                    {result.works_count !== undefined && result.works_count !== null && (
                      <Text size="xs" c="dimmed">
                        Works: {result.works_count.toLocaleString()}
                      </Text>
                    )}
                  </Group>

                  <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                    {result.id}
                  </Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
