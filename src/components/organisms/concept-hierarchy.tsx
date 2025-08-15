import { Card, Group, Title, Badge, Stack, Paper, Text } from '@mantine/core';
import { IconHierarchy } from '@tabler/icons-react';
import React from 'react';

import { EntityLink } from '@/components';
import type { Concept } from '@/lib/openalex/types';

interface ConceptHierarchyProps {
  concept: Concept;
}

/**
 * Display concept hierarchy with ancestors
 */
export function ConceptHierarchy({ concept }: ConceptHierarchyProps) {
  if (!concept.ancestors || concept.ancestors.length === 0) {
    return null;
  }

  return (
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
  );
}