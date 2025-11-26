/**
 * RelationshipList component
 * Displays a paginated list of relationship items with "Load more" functionality
 *
 * @module RelationshipList
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import { Stack, Button, Text } from '@mantine/core';
import React, { useState, useCallback } from 'react';


import type { RelationshipSection } from '@/types/relationship';
import { DEFAULT_PAGE_SIZE } from '@/types/relationship';

import { RelationshipItem } from './RelationshipItem';

export interface RelationshipListProps {
  /** The relationship section containing items to display */
  section: RelationshipSection;

  /** Optional callback when "Load more" is clicked */
  onLoadMore?: () => void;
}

/**
 * Displays a paginated list of relationship items
 * Shows first 50 items by default with "Load more" button for additional items
 */
export const RelationshipList: React.FC<RelationshipListProps> = ({
  section,
  onLoadMore,
}) => {
  const [visibleCount, setVisibleCount] = useState(
    Math.min(section.items.length, DEFAULT_PAGE_SIZE)
  );

  const handleLoadMore = useCallback(() => {
    const newCount = Math.min(
      visibleCount + DEFAULT_PAGE_SIZE,
      section.items.length
    );
    setVisibleCount(newCount);
    onLoadMore?.();
  }, [visibleCount, section.items.length, onLoadMore]);

  const visibleItems = section.items.slice(0, visibleCount);
  const hasMore = visibleCount < section.items.length;

  return (
    <Stack gap="md">
      <Stack gap="sm">
        {visibleItems.map((item) => (
          <RelationshipItem key={item.id} item={item} />
        ))}
      </Stack>

      {hasMore && (
        <Button variant="light" onClick={handleLoadMore}>
          Load more
        </Button>
      )}

      <Text size="sm" c="dimmed">
        Showing {visibleCount} of {section.items.length}
      </Text>
    </Stack>
  );
};
