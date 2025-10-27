import { cachedOpenAlex } from "@academic-explorer/client";
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
  Textarea,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";


function TextAnalysisRoute() {
  const urlSearch = useSearch({ from: "/text/" });
  const [title, setTitle] = useState(urlSearch.title || "");

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
    const newTitle = urlSearch.title || "";
    if (newTitle !== title) {
      setTitle(newTitle);
    }
  }, [urlSearch.title, title]);

  const {
    data: concepts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["text", "concepts", title],
    queryFn: async () => {
      if (!title.trim()) return [];

      logger.debug("text", "Extracting concepts from title", { title });

      const concepts = await cachedOpenAlex.client.textAnalysis.getConcepts({
        title,
      });

      logger.debug("text", "Concepts extracted", {
        count: concepts.length,
      });

      return concepts;
    },
    enabled: title.trim().length > 0,
    staleTime: 60000,
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Update URL manually since text routes are new
    const params = new URLSearchParams();
    if (value) {
      params.set("title", value);
    }
    const newHash = params.toString()
      ? `#/text?${params.toString()}`
      : "#/text";
    window.history.replaceState(null, "", newHash);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Text Analysis</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Extract concepts, keywords, and topics from academic text using
            OpenAlex text analysis
          </Text>
        </div>

        <Textarea
          label="Title or Text"
          placeholder="Enter a research title or abstract to analyze..."
          value={title}
          onChange={(event) => handleTitleChange(event.currentTarget.value)}
          minRows={3}
          autosize
        />

        {!title.trim() && (
          <Card withBorder>
            <Stack align="center" py="xl">
              <Text size="lg" fw={500}>
                Enter text to analyze
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Paste a research title, abstract, or any academic text to
                extract related concepts
              </Text>
            </Stack>
          </Card>
        )}

        {isLoading && title.trim() && (
          <Text ta="center" py="xl">
            Analyzing text...
          </Text>
        )}

        {error && (
          <Alert
            icon={<IconInfoCircle />}
            title="Analysis Error"
            color="red"
            variant="light"
          >
            <Text size="sm">
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </Alert>
        )}

        {!isLoading && concepts.length === 0 && title.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No concepts found"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No concepts could be extracted from the provided text. Try a
              longer or more specific text.
            </Text>
          </Alert>
        )}

        {concepts.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {concepts.length} concept{concepts.length !== 1 ? "s" : ""}
            </Text>
            {concepts.map((concept) => (
              <Card key={concept.id} withBorder padding="md" shadow="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      href={`#/concepts/${concept.id.replace("https://openalex.org/", "")}`}
                      fw={500}
                      size="md"
                    >
                      {concept.display_name}
                    </Anchor>
                    <Group gap="xs">
                      <Badge size="sm" variant="light" color="blue">
                        Concept
                      </Badge>
                      <Badge size="sm" variant="light" color="gray">
                        Score: {concept.score.toFixed(2)}
                      </Badge>
                    </Group>
                  </Group>

                  <Group gap="md">
                    <Text size="xs" c="dimmed">
                      Level: {concept.level}
                    </Text>
                    {concept.wikidata && (
                      <Text size="xs" c="dimmed">
                        Wikidata: {concept.wikidata}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
export const Route = createLazyFileRoute("/text/")({
  component: TextAnalysisRoute,
});

export default TextAnalysisRoute;
