import type { EntityType } from "@bibgraph/types";
import { EntityCard } from "@bibgraph/ui";
import { SimpleGrid, Stack, Text } from "@mantine/core";

import { ContentSkeleton } from "./molecules/ContentSkeleton";

export interface EntityGridItem {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: Array<{ label: string; color?: string }>;
}

interface EntityGridProps {
  items: EntityGridItem[];
  onNavigate?: (path: string) => void;
  cols?: number;
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  emptyMessage?: string;
  loading?: boolean;
  loadingCount?: number;
}

export const EntityGrid = ({
  items,
  onNavigate,
  cols = 3,
  spacing = "md",
  emptyMessage = "No items to display",
  loading = false,
  loadingCount = 6,
}: EntityGridProps) => {
  if (loading) {
    return (
      <SimpleGrid cols={cols} spacing={spacing}>
        {Array.from({ length: loadingCount }).map((_, index) => (
          <ContentSkeleton key={index} variant="card" count={1} />
        ))}
      </SimpleGrid>
    );
  }

  if (items.length === 0) {
    return (
      <Stack align="center" gap="md" p="xl">
        <Text size="lg" c="dimmed">
          {emptyMessage}
        </Text>
      </Stack>
    );
  }

  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {items.map((item) => (
        <EntityCard
          key={item.id}
          id={item.id}
          displayName={item.displayName}
          entityType={item.entityType}
          worksCount={item.worksCount}
          citedByCount={item.citedByCount}
          description={item.description}
          tags={item.tags}
          onNavigate={onNavigate}
        />
      ))}
    </SimpleGrid>
  );
};
