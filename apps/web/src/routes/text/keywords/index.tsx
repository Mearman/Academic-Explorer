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
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const textKeywordsSearchSchema = z.object({
  title: z.string().optional().catch(undefined),
  abstract: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/text/keywords/")({
  component: TextKeywordsRoute,
  validateSearch: textKeywordsSearchSchema,
});

function TextKeywordsRoute() {
  const urlSearch = Route.useSearch();
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
    data: keywords = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["text", "keywords", title],
    queryFn: async () => {
      if (!title.trim()) return [];

      logger.debug("text", "Extracting keywords from title", { title });

      const keywords = await cachedOpenAlex.client.textAnalysis.getKeywords({
        title,
      });

      logger.debug("text", "Keywords extracted", {
        count: keywords.length,
      });

      return keywords;
    },
    enabled: title.trim().length > 0,
    staleTime: 60000,
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const params = new URLSearchParams();
    if (value) {
      params.set("title", value);
    }
    const newHash = params.toString() ? `#/text/keywords?${params.toString()}` : "#/text/keywords";
    window.history.replaceState(null, "", newHash);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Text Analysis - Keywords</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Extract keywords from academic text using OpenAlex text analysis
          </Text>
        </div>

        <Textarea
          label="Title or Text"
          placeholder="Enter a research title or abstract to extract keywords..."
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
                Paste a research title or abstract to extract keywords
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

        {!isLoading && keywords.length === 0 && title.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No keywords found"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No keywords could be extracted from the provided text. Try a
              longer or more specific text.
            </Text>
          </Alert>
        )}

        {keywords.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {keywords.length} keyword{keywords.length !== 1 ? "s" : ""}
            </Text>
            {keywords.map((keyword) => (
              <Card key={keyword.id} withBorder padding="md" shadow="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      href={`#/keywords/${keyword.id.replace("https://openalex.org/", "")}`}
                      fw={500}
                      size="md"
                    >
                      {keyword.display_name}
                    </Anchor>
                    <Badge size="sm" variant="light" color="teal">
                      Score: {keyword.score.toFixed(2)}
                    </Badge>
                  </Group>

                  <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                    {keyword.id}
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
