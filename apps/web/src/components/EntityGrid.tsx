import type { EntityType } from "@academic-explorer/types";
// FIXME: EntityCard not exported from @academic-explorer/ui - this file is unused
// import { EntityCard } from "@academic-explorer/ui";
import { SimpleGrid, Stack, Text } from "@mantine/core";

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
}

export function EntityGrid({
  items,
  onNavigate,
  cols = 3,
  spacing = "md",
  emptyMessage = "No items to display",
}: EntityGridProps) {
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
        <div key={item.id}>
          {/* FIXME: EntityCard not available - this component is unused */}
          <Text>{item.displayName}</Text>
        </div>
      ))}
    </SimpleGrid>
  );
}
