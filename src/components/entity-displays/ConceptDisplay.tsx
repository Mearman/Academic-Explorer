import { Stack, Text, Paper } from '@mantine/core';
import type { Concept } from '@/lib/openalex/types';

interface ConceptDisplayProps {
  entity: Concept;
}

export function ConceptDisplay({ entity: concept }: ConceptDisplayProps) {
  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {concept.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Concept ID: {concept.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {concept.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {concept.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Level: {concept.level}
        </Text>
        {concept.description && (
          <Text c="dimmed" mb="xs">
            Description: {concept.description}
          </Text>
        )}
        {concept.wikidata && (
          <Text c="dimmed" mb="xs">
            Wikidata: {concept.wikidata}
          </Text>
        )}
      </Paper>
    </Stack>
  );
}