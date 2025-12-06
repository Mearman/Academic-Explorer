import type { EntityType } from "@bibgraph/types";
import { EntityCard } from "@bibgraph/ui";
import { Stack, Text } from "@mantine/core";

import { ContentSkeleton } from "./molecules/ContentSkeleton";

export interface EntityListItem {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: Array<{ label: string; color?: string }>;
}

interface EntityListViewProps {
  items: EntityListItem[];
  onNavigate?: (path: string) => void;
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  emptyMessage?: string;
  loading?: boolean;
  loadingCount?: number;
}

export const EntityListView = ({
  items,
  onNavigate,
  spacing = "sm",
  emptyMessage = "No items to display",
  loading = false,
  loadingCount = 5,
}: EntityListViewProps) => {
  if (loading) {
    return <ContentSkeleton variant="list" count={loadingCount} />;
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
    <Stack gap={spacing}>
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
    </Stack>
  );
};
