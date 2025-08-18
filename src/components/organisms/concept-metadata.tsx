import { Card, Group, Title, Grid, Paper, Text, Anchor } from '@mantine/core';
import { IconInfoCircle, IconCalendar } from '@tabler/icons-react';
import React from 'react';

import type { Concept } from '@/lib/openalex/types';

interface ConceptMetadataProps {
  concept: Concept;
}

/**
 * Display concept metadata including ID, level, dates, and external IDs
 */
export function ConceptMetadata({ concept }: ConceptMetadataProps) {
  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconInfoCircle size={20} />
        <Title order={2} size="lg">Concept Metadata</Title>
      </Group>
      
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder radius="sm" >
            <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
              Concept ID
            </Text>
            <Text size="sm" fw={500} ff="monospace">
              {concept.id}
            </Text>
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder radius="sm" >
            <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
              Hierarchy Level
            </Text>
            <Text size="sm" fw={500}>
              Level {concept.level}
            </Text>
          </Paper>
        </Grid.Col>

        {concept.updated_date && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Group gap="xs" mb="xs">
                <IconCalendar size={14} />
                <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                  Last Updated
                </Text>
              </Group>
              <Text size="sm" fw={500}>
                {new Date(concept.updated_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
        )}

        {concept.score && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Concept Score
              </Text>
              <Text size="sm" fw={500}>
                {concept.score.toFixed(3)}
              </Text>
            </Paper>
          </Grid.Col>
        )}

        {/* External IDs */}
        {concept.ids?.wikidata && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Wikidata ID
              </Text>
              <Anchor 
                href={`https://www.wikidata.org/wiki/${concept.ids.wikidata}`}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={500}
                c="blue"
              >
                {concept.ids.wikidata}
              </Anchor>
            </Paper>
          </Grid.Col>
        )}

        {concept.ids?.wikipedia && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Wikipedia URL
              </Text>
              <Anchor 
                href={concept.ids.wikipedia}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={500}
                c="blue"
                truncate
              >
                {concept.ids.wikipedia}
              </Anchor>
            </Paper>
          </Grid.Col>
        )}
      </Grid>
    </Card>
  );
}