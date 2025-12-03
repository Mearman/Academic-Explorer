/**
 * Compact catalogue list card for sidebar display
 */

import type { CatalogueList } from "@bibgraph/utils";
import { Badge, Card, Group, Text, Tooltip } from "@mantine/core";
import { IconBook2,IconList } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import * as styles from "./sidebar.css";

interface CatalogueListCardProps {
  list: CatalogueList;
  onClose?: () => void;
}

export const CatalogueListCard = ({ list, onClose }: CatalogueListCardProps) => {
  const isBibliography = list.type === "bibliography";
  const Icon = isBibliography ? IconBook2 : IconList;
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClose) {
      onClose();
    }
    // Navigate to catalogue page with list selected
    void navigate({
      to: "/catalogue",
      search: { list: list.id },
    });
  };

  return (
    <Card
      className={styles.bookmarkCard}
      p="xs"
      withBorder
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <Group gap="xs" wrap="nowrap">
        <Tooltip label={isBibliography ? "Bibliography" : "List"}>
          <Icon size={16} style={{ flexShrink: 0 }} />
        </Tooltip>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {list.title}
          </Text>
          {list.description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {list.description}
            </Text>
          )}
        </div>
        {list.tags && list.tags.length > 0 && (
          <Badge size="xs" variant="light" style={{ flexShrink: 0 }}>
            {list.tags.length}
          </Badge>
        )}
      </Group>
    </Card>
  );
};
