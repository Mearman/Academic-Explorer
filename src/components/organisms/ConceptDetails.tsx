import { Card, Group, Title, Stack, Text, Badge, Paper, Grid } from '@mantine/core';
import { IconInfoCircle, IconHierarchy, IconCalendar } from '@tabler/icons-react';

import { EntityLink } from '@/components';
import type { Concept } from '@/lib/openalex/types';

interface ConceptDetailsProps {
  concept: Concept;
}

export function ConceptDetails({ concept }: ConceptDetailsProps) {
  return (
    <>
      {/* Basic Concept Information */}
      <Card withBorder radius="md" p="xl">
        <Group mb="lg">
          <IconInfoCircle size={20} />
          <Title order={2} size="lg">Concept Information</Title>
        </Group>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Level
              </Text>
              <Badge size="lg" variant="light" color="grape" radius="sm">
                Level {concept.level}
              </Badge>
            </Paper>
          </Grid.Col>
          
          {concept.wikidata && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Wikidata ID
                </Text>
                <Text size="sm" fw={500} ff="mono">
                  {concept.wikidata}
                </Text>
              </Paper>
            </Grid.Col>
          )}
        </Grid>

        {concept.description && (
          <Stack gap="xs" mt="md">
            <Text size="xs" tt="uppercase" fw={600} c="dimmed">
              Description
            </Text>
            <Text size="sm" lh={1.6}>
              {concept.description}
            </Text>
          </Stack>
        )}
      </Card>

      {/* Concept Hierarchy */}
      {concept.ancestors && concept.ancestors.length > 0 && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconHierarchy size={20} />
            <Title order={2} size="lg">Concept Hierarchy</Title>
            <Badge variant="light" color="violet" radius="sm">
              {concept.ancestors.length} ancestors
            </Badge>
          </Group>
          
          <Stack gap="md">
            {concept.ancestors.slice(0, 10).map((ancestor) => (
              <Paper key={ancestor.id} p="md" withBorder radius="sm" bg="gray.0">
                <Group justify="space-between">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Badge variant="light" color="blue" size="sm">
                        Level {ancestor.level}
                      </Badge>
                      <EntityLink
                        entityId={ancestor.id}
                        displayName={ancestor.display_name}
                        size="sm"
                        weight={500}
                      />
                    </Group>
                    {ancestor.description && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {ancestor.description}
                      </Text>
                    )}
                  </Stack>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      {ancestor.works_count.toLocaleString()} works
                    </Text>
                    <Text size="xs" c="dimmed">
                      {ancestor.cited_by_count.toLocaleString()} citations
                    </Text>
                  </Group>
                </Group>
              </Paper>
            ))}
            
            {concept.ancestors.length > 10 && (
              <Text size="sm" c="dimmed" ta="center" fs="italic">
                Showing 10 of {concept.ancestors.length} ancestor concepts
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {/* Temporal Information */}
      <Card withBorder radius="md" p="xl">
        <Group mb="lg">
          <IconCalendar size={20} />
          <Title order={2} size="lg">Temporal Information</Title>
        </Group>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Created Date
              </Text>
              <Text size="sm" fw={500}>
                {new Date(concept.created_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Updated Date
              </Text>
              <Text size="sm" fw={500}>
                {new Date(concept.updated_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>
    </>
  );
}