import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLayoutSidebar } from "@tabler/icons-react";

/**
 * Placeholder component for the removed LeftRibbon functionality
 */
export function LeftRibbon() {
  return (
    <Tooltip label="Left Ribbon (temporarily disabled)">
      <ActionIcon
        variant="subtle"
        size="lg"
        c="dimmed"
        disabled
      >
        <IconLayoutSidebar size={18} />
      </ActionIcon>
    </Tooltip>
  );
}