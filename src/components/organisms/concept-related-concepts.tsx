import { Card, Group, Title, Badge, Grid, Paper, Stack, Text } from '@mantine/core';
import { IconTags } from '@tabler/icons-react';
import React from 'react';

import { EntityLink } from '@/components';
import type { Concept } from '@/lib/openalex/types';

interface ConceptRelatedConceptsProps {
  concept: Concept;
}

/**
 * Display related concepts for a concept
 */
export function ConceptRelatedConcepts({ concept }: ConceptRelatedConceptsProps) {
  if (!concept.related_concepts || concept.related_concepts.length === 0) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconTags size={20} />
        <Title order={2} size="lg">Related Concepts</Title>
        <Badge variant="light" color="blue" radius="sm">
          {concept.related_concepts.length} related concepts
        </Badge>
      </Group>
      
      <Grid>
        {concept.related_concepts.slice(0, 8).map((related) => (
          <Grid.Col key={related.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Paper p="md" withBorder radius="sm" bg="blue.0">
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge variant="light" color="teal" size="xs">
                    Level {related.level}
                  </Badge>
                  <EntityLink
                    entityId={related.id}
                    displayName={related.display_name}
                    size="sm"
                    weight={500}
                  />
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {related.works_count.toLocaleString()} works
                  </Text>
                  <Text size="xs" c="dimmed">
                    {related.cited_by_count.toLocaleString()} citations
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>
        ))}
      </Grid>
      
      {concept.related_concepts.length > 8 && (
        <Text size="sm" c="dimmed" mt="md" ta="center" fs="italic">
          Showing 8 of {concept.related_concepts.length} related concepts
        </Text>
      )}
    </Card>
  );
}