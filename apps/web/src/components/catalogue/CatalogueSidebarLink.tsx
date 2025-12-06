/**
 * Sidebar link component for catalogue navigation
 */

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconList } from "@tabler/icons-react";

import { ICON_SIZE } from '@/config/style-constants';

interface CatalogueSidebarLinkProps {
  onClose?: () => void;
}

export const CatalogueSidebarLink = ({ onClose }: CatalogueSidebarLinkProps) => {
  const handleClick = () => {
    // Navigate to catalogue page
    window.location.hash = "/catalogue";

    // Close sidebar if provided
    if (onClose) {
      onClose();
    }
  };

  return (
    <Tooltip label="Catalogue" position="right">
      <ActionIcon
        variant="subtle"
        size="lg"
        onClick={handleClick}
        title="Catalogue"
      >
        <IconList size={ICON_SIZE.LG} />
      </ActionIcon>
    </Tooltip>
  );
};