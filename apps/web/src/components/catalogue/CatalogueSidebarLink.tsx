/**
 * Sidebar link component for catalogue navigation
 */

import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconList } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

interface CatalogueSidebarLinkProps {
  onClose?: () => void;
}

export function CatalogueSidebarLink({ onClose }: CatalogueSidebarLinkProps) {
  const navigate = useNavigate();

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
        <IconList size={18} />
      </ActionIcon>
    </Tooltip>
  );
}