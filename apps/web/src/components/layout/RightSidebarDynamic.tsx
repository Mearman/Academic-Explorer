import { EntityInfoSection } from "../sections/EntityInfoSection";
import { useLayoutState, useLayoutActions } from "@/stores/layout-store";
import { Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect } from "react";

/**
 * Right sidebar dynamic component - shows entity preview
 * When an entity is clicked in the relationship section or graph, displays EntityInfoSection
 * Automatically closes sidebar when no entity is being previewed
 */
export function RightSidebarDynamic() {
  const { previewEntityId } = useLayoutState();
  const { setRightSidebarOpen } = useLayoutActions();

  // Auto-close right sidebar when there's no entity to preview
  useEffect(() => {
    if (!previewEntityId) {
      setRightSidebarOpen(false);
    }
  }, [previewEntityId, setRightSidebarOpen]);

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