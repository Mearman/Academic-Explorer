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

const textTopicsSearchSchema = z.object({
  title: z.string().optional().catch(undefined),
  abstract: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/text/topics/")({
  component: TextTopicsRoute,
  validateSearch: textTopicsSearchSchema,
});

function TextTopicsRoute() {
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
    data: topics = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["text", "topics", title],
    queryFn: async () => {
      if (!title.trim()) return [];

      logger.debug("text", "Extracting topics from title", { title });

      const topics = await cachedOpenAlex.client.textAnalysis.getTopics({
        title,
      });

      logger.debug("text", "Topics extracted", {
        count: topics.length,
      });

      return topics;
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
    const newHash = params.toString() ? `#/text/topics?${params.toString()}` : "#/text/topics";
    window.history.replaceState(null, "", newHash);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Text Analysis - Topics</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Extract topics from academic text using OpenAlex text analysis
          </Text>
        </div>

        <Textarea
          label="Title or Text"
          placeholder="Enter a research title or abstract to extract topics..."
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
                Paste a research title or abstract to extract topics
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

        {!isLoading && topics.length === 0 && title.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No topics found"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No topics could be extracted from the provided text. Try a
              longer or more specific text.
            </Text>
          </Alert>
        )}

        {topics.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {topics.length} topic{topics.length !== 1 ? "s" : ""}
            </Text>
            {topics.map((topic) => (
              <Card key={topic.id} withBorder padding="md" shadow="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      href={`#/topics/${topic.id.replace("https://openalex.org/", "")}`}
                      fw={500}
                      size="md"
                    >
                      {topic.display_name}
                    </Anchor>
                    <Badge size="sm" variant="light" color="violet">
                      Score: {topic.score.toFixed(2)}
                    </Badge>
                  </Group>

                  {(topic.subfield || topic.field) && (
                    <Group gap="md">
                      {topic.subfield && (
                        <Text size="xs" c="dimmed">
                          Subfield: {topic.subfield.display_name}
                        </Text>
                      )}
                      {topic.field && (
                        <Text size="xs" c="dimmed">
                          Field: {topic.field.display_name}
                        </Text>
                      )}
                    </Group>
                  )}

                  <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                    {topic.id}
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
