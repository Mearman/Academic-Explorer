import type { EntityType } from "@academic-explorer/types";
import { EntityCard } from "@academic-explorer/ui";
import { Stack, Text } from "@mantine/core";

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
}

export function EntityListView({
  items,
  onNavigate,
  spacing = "sm",
  emptyMessage = "No items to display",
}: EntityListViewProps) {
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
}
