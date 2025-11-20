import { EntityInfoSection } from "../sections/EntityInfoSection";
import { useLayoutState } from "@/stores/layout-store";
import { Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

/**
 * Right sidebar dynamic component - shows entity preview
 * When an entity is clicked in the relationship section or graph, displays EntityInfoSection
 * Otherwise shows a placeholder message
 */
export function RightSidebarDynamic() {
  const { previewEntityId } = useLayoutState();

  // Show entity preview if available, otherwise show placeholder
  if (previewEntityId) {
    return <EntityInfoSection />;
  }

  return (
    <Stack
      align="center"
      justify="center"
      h="100%"
      gap="md"
      p="xl"
      style={{ textAlign: "center" }}
    >
      <IconInfoCircle size={48} opacity={0.3} />
      <Text size="sm" c="dimmed">
        Click on an entity to view details
      </Text>
    </Stack>
  );
}