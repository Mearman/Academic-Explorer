/**
 * RelationshipItem component
 * Displays an individual relationship connection with clickable entity link and optional metadata
 *
 * @module RelationshipItem
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import React from 'react';
import { Anchor, Text, Group, Stack } from '@mantine/core';
import { useEntityInteraction } from '@/hooks/use-entity-interaction';
import type { RelationshipItem as RelationshipItemType } from '@/types/relationship';

export interface RelationshipItemProps {
  /** The relationship item to display */
  item: RelationshipItemType;
}

/**
 * Displays a single relationship connection
 * Shows the related entity name as a clickable link, with optional subtitle and metadata
 */
export const RelationshipItem: React.FC<RelationshipItemProps> = ({ item }) => {
  const { handleSidebarEntityClick } = useEntityInteraction();

  // Determine which entity to link to (the "other" entity, not the current one being viewed)
  const relatedEntityId = item.direction === 'inbound' ? item.sourceId : item.targetId;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Determine the entity type from the item
    const entityType = item.direction === 'inbound' ? item.sourceType : item.targetType;
    handleSidebarEntityClick({ entityId: relatedEntityId, entityType });
  };

  return (
    <Stack gap="xs" data-testid={`relationship-item-${item.id}`}>
      <Group gap="xs">
        <Anchor onClick={handleClick} size="sm">
          {item.displayName}
        </Anchor>
        {item.isSelfReference && (
          <Text size="xs" c="dimmed">
            (self-reference)
          </Text>
        )}
      </Group>
      {item.subtitle && (
        <Text size="xs" c="dimmed" data-testid="relationship-subtitle">
          {item.subtitle}
        </Text>
      )}
      {item.metadata && (
        <Text size="xs" c="dimmed" data-testid="relationship-metadata">
          {/* TODO: Format metadata based on type in Phase 6 */}
          {JSON.stringify(item.metadata)}
        </Text>
      )}
    </Stack>
  );
};
