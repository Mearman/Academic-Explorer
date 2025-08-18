import { Badge, Group, Paper, Stack, Text, Progress } from '@mantine/core';
import React from 'react';

import type { Concept, Topic } from '@/lib/openalex/types';

import { EntityLink } from '../atoms/entity-link';


interface ConceptListProps {
  concepts?: Concept[];
  topics?: Topic[];
  title?: string;
  maxItems?: number;
  showScores?: boolean;
  variant?: 'badges' | 'detailed';
}

/**
 * Normalized item type for concepts and topics
 */
type NormalizedItem = {
  id: string;
  display_name: string;
  score?: number;
  level?: number;
  type: 'concept' | 'topic';
};

/**
 * Normalize concepts and topics into a common format
 */
function normalizeItems(concepts: Concept[], topics: Topic[]): NormalizedItem[] {
  return [
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
}

/**
 * Render title if provided
 */
function renderTitle(title?: string) {
  if (!title) return null;
  
  return (
    <Text size="sm" fw={600} c="dimmed" tt="uppercase">
      {title}
    </Text>
  );
}

/**
 * Render badge variant of concept/topic item
 */
function renderBadgeItem(item: NormalizedItem, showScores: boolean) {
  return (
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
  );
}

/**
 * Render detailed variant of concept/topic item
 */
function renderDetailedItem(item: NormalizedItem, showScores: boolean) {
  return (
    <Paper key={item.id} p="sm" withBorder radius="sm" >
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
  );
}

/**
 * Render badges variant
 */
function renderBadgesVariant(items: NormalizedItem[], showScores: boolean, hiddenCount: number) {
  return (
    <Group gap="xs">
      {items.map((item) => renderBadgeItem(item, showScores))}
      {hiddenCount > 0 && (
        <Badge variant="outline" size="sm" color="gray">
          +{hiddenCount} more
        </Badge>
      )}
    </Group>
  );
}

/**
 * Render detailed variant
 */
function renderDetailedVariant(items: NormalizedItem[], showScores: boolean, hiddenCount: number, totalCount: number) {
  return (
    <Stack gap="xs">
      {items.map((item) => renderDetailedItem(item, showScores))}
      
      {hiddenCount > 0 && (
        <Text size="sm" c="dimmed" ta="center" fs="italic">
          Showing {items.length} of {totalCount} items
        </Text>
      )}
    </Stack>
  );
}

export function ConceptList({ 
  concepts = [], 
  topics = [], 
  title,
  maxItems = 20,
  showScores = false,
  variant = 'badges'
}: ConceptListProps) {
  const allItems = normalizeItems(concepts, topics);
  const displayedItems = allItems.slice(0, maxItems);
  const hiddenCount = allItems.length > maxItems ? allItems.length - maxItems : 0;

  if (allItems.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm">
      {renderTitle(title)}
      {variant === 'badges' 
        ? renderBadgesVariant(displayedItems, showScores, hiddenCount)
        : renderDetailedVariant(displayedItems, showScores, hiddenCount, allItems.length)
      }
    </Stack>
  );
}