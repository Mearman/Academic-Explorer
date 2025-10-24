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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const autocompleteAuthorsSearchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/autocomplete/authors/")({
  component: AutocompleteAuthorsRoute,
  validateSearch: autocompleteAuthorsSearchSchema,
});

function AutocompleteAuthorsRoute() {
  const urlSearch = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState(urlSearch.q || urlSearch.search || "");

  useEffect(() => {
    // Prettify the URL by decoding encoded characters
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash;
      const decodedHash = decodeURIComponent(currentHash);

      // Only update if the URL actually changed after decoding
      if (currentHash !== decodedHash) {
        window.history.replaceState(null, "", decodedHash);
      }
    }
  }, []);

  // Update query when URL search params change
  useEffect(() => {
    const newQuery = urlSearch.q || urlSearch.search || "";
    if (newQuery !== query) {
      setQuery(newQuery);
    }
  }, [urlSearch.q, urlSearch.search, query]);

  // Fetch autocomplete results
  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["autocomplete", "authors", query],
    queryFn: async () => {
      if (!query.trim()) return [];

      logger.debug("autocomplete", "Fetching author suggestions", { query });

      // Note: OpenAlex autocomplete endpoint doesn't support per_page parameter
      const response = await cachedOpenAlex.client.authors.autocomplete(query);

      logger.debug("autocomplete", "Author suggestions received", {
        count: response.length,
      });

      return response;
    },
    enabled: query.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });

  const handleSearch = (value: string) => {
    setQuery(value);
    void navigate({
      to: "/autocomplete/authors",
      search: { q: value, filter: urlSearch.filter, search: urlSearch.search },
      replace: true,
    });
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Autocomplete Authors</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Search for authors and researchers with real-time suggestions from
            the OpenAlex database
          </Text>
        </div>

        <TextInput
          placeholder="Search for authors, researchers..."
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
                Start typing to get real-time autocomplete suggestions for
                authors and researchers
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
                  // Handle Error instances with message property
                  if (error instanceof Error) {
                    // Extract OpenAlex error message if wrapped
                    const match = error.message.match(
                      /(?:Authors|Author) autocomplete failed: (.+)/,
                    );
                    if (match) {
                      return match[1];
                    }
                    return error.message;
                  }

                  // Fallback for non-Error objects
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
              No authors found matching &quot;{query}&quot;. Try different
              search terms.
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
                      href={`#/authors/${result.id.replace("https://openalex.org/", "")}`}
                      fw={500}
                      size="md"
                    >
                      {result.display_name}
                    </Anchor>
                    <Badge size="sm" variant="light" color="teal">
                      Author
                    </Badge>
                  </Group>

                  {result.hint && (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {result.hint}
                    </Text>
                  )}

                  <Group gap="md">
                    {result.cited_by_count !== undefined &&
                      result.cited_by_count !== null && (
                        <Text size="xs" c="dimmed">
                          Citations: {result.cited_by_count.toLocaleString()}
                        </Text>
                      )}
                    {result.works_count !== undefined &&
                      result.works_count !== null && (
                        <Text size="xs" c="dimmed">
                          Works: {result.works_count.toLocaleString()}
                        </Text>
                      )}
                  </Group>

                  <Text
                    size="xs"
                    c="dimmed"
                    style={{ fontFamily: "monospace" }}
                  >
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
