import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLayoutSidebarRight } from "@tabler/icons-react";

/**
 * Placeholder component for the removed RightRibbon functionality
 */
export function RightRibbon() {
  return (
    <Tooltip label="Right Ribbon (temporarily disabled)">
      <ActionIcon
        variant="subtle"
        size="lg"
        c="dimmed"
        disabled
      >
        <IconLayoutSidebarRight size={18} />
      </ActionIcon>
    </Tooltip>
  );
}