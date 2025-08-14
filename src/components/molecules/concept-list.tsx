import React from 'react';
import { Badge, Group, Paper, Stack, Text, Progress } from '@mantine/core';
import { EntityLink } from '../atoms/entity-link';
import type { Concept, Topic } from '@/lib/openalex/types';

interface ConceptListProps {
  concepts?: Concept[];
  topics?: Topic[];
  title?: string;
  maxItems?: number;
  showScores?: boolean;
  variant?: 'badges' | 'detailed';
}

export function ConceptList({ 
  concepts = [], 
  topics = [], 
  title,
  maxItems = 20,
  showScores = false,
  variant = 'badges'
}: ConceptListProps) {
  // Combine concepts and topics, normalizing the data structure
  const allItems = [
    ...concepts.map(concept => ({
      id: concept.id,
      display_name: concept.display_name,
      score: concept.score,
      level: concept.level,
      type: 'concept' as const
    })),
    ...topics.map(topic => ({
      id: topic.id,
      display_name: topic.display_name,
      score: 'score' in topic ? (topic as Topic & { score: number }).score : undefined,
      level: undefined,
      type: 'topic' as const
    }))
  ];

  const displayedItems = allItems.slice(0, maxItems);
  const hiddenCount = allItems.length > maxItems ? allItems.length - maxItems : 0;

  if (allItems.length === 0) {
    return null;
  }

  if (variant === 'badges') {
    return (
      <Stack gap="sm">
        {title && (
          <Text size="sm" fw={600} c="dimmed" tt="uppercase">
            {title}
          </Text>
        )}
        <Group gap="xs">
          {displayedItems.map((item) => (
            <Badge
              key={item.id}
              variant="light"
              size="md"
              radius="sm"
              color={item.type === 'concept' ? 'blue' : 'green'}
              component="div"
            >
              <EntityLink
                entityId={item.id}
                displayName={item.display_name}
                size="xs"
                underline={false}
                color="inherit"
              />
              {showScores && item.score !== undefined && (
                <Text size="xs" c="dimmed" ml="xs">
                  ({Math.round(item.score * 100)}%)
                </Text>
              )}
            </Badge>
          ))}
          {hiddenCount > 0 && (
            <Badge variant="outline" size="sm" color="gray">
              +{hiddenCount} more
            </Badge>
          )}
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      {title && (
        <Text size="sm" fw={600} c="dimmed" tt="uppercase">
          {title}
        </Text>
      )}
      <Stack gap="xs">
        {displayedItems.map((item) => (
          <Paper key={item.id} p="sm" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between">
              <Group gap="sm">
                <Badge
                  size="xs"
                  variant="dot"
                  color={item.type === 'concept' ? 'blue' : 'green'}
                >
                  {item.type}
                </Badge>
                <EntityLink
                  entityId={item.id}
                  displayName={item.display_name}
                  size="sm"
                  weight={500}
                />
                {item.level !== undefined && (
                  <Badge size="xs" variant="light" color="gray">
                    Level {item.level}
                  </Badge>
                )}
              </Group>
              
              {showScores && item.score !== undefined && (
                <Group gap="sm">
                  <Progress
                    value={item.score * 100}
                    size="sm"
                    w={60}
                    color={item.type === 'concept' ? 'blue' : 'green'}
                  />
                  <Text size="xs" c="dimmed" w={40} ta="right">
                    {Math.round(item.score * 100)}%
                  </Text>
                </Group>
              )}
            </Group>
          </Paper>
        ))}
        
        {hiddenCount > 0 && (
          <Text size="sm" c="dimmed" ta="center" fs="italic">
            Showing {displayedItems.length} of {allItems.length} items
          </Text>
        )}
      </Stack>
    </Stack>
  );
}