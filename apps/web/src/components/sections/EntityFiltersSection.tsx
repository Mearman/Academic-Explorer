/**
 * Entity filters section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React, { useMemo } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";
import type { EntityType } from "@academic-explorer/types";
import type { GraphNode } from "@academic-explorer/graph";
import { Checkbox, Badge, Stack } from "@mantine/core";
import { SectionFrame } from "@academic-explorer/ui";
import {
  IconFile,
  IconUser,
  IconBook,
  IconBuilding,
  IconTag,
  IconBuildingStore,
  IconCoin,
  IconBulb,
  IconFilter,
} from "@tabler/icons-react";

// Properly typed entity options without type assertions
const entityTypeOptions: Array<{
  entityType: EntityType;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}> = [
  { entityType: "works", label: "Works", icon: IconFile },
  { entityType: "authors", label: "Authors", icon: IconUser },
  { entityType: "sources", label: "Sources", icon: IconBook },
  { entityType: "institutions", label: "Institutions", icon: IconBuilding },
  { entityType: "topics", label: "Topics", icon: IconTag },
  { entityType: "publishers", label: "Publishers", icon: IconBuildingStore },
  { entityType: "funders", label: "Funders", icon: IconCoin },
  { entityType: "concepts", label: "Concepts", icon: IconBulb },
];

export const EntityFiltersSection: React.FC = () => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const graphStore = useGraphStore();
  const { nodes, visibleEntityTypes, setEntityTypeVisibility } = graphStore;

  const entityStats = useMemo(() => {
    try {
      const nodeValues = Object.values(nodes) as GraphNode[];
      const nodeList = Array.isArray(nodeValues) ? nodeValues : [];

      // Initialize counters for all entity types
      const total: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        concepts: 0,
        publishers: 0,
        funders: 0,
        keywords: 0,
      };
      const visible: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        concepts: 0,
        publishers: 0,
        funders: 0,
        keywords: 0,
      };

      // Count nodes by type
      for (const node of nodeList) {
        if (node.entityType in total) {
          const nodeType = node.entityType as EntityType;
          total[nodeType]++;
          // Note: visibility is handled at the graph level, not per-node
          // For now, count all nodes as visible
          visible[nodeType]++;
        }
      }

      return { total, visible };
    } catch (error) {
      logger.warn("ui", "Failed to calculate entity stats", { error });
      const emptyTotal: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        concepts: 0,
        publishers: 0,
        funders: 0,
        keywords: 0,
      };
      const emptyVisible: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        concepts: 0,
        publishers: 0,
        funders: 0,
        keywords: 0,
      };

      return {
        total: emptyTotal,
        visible: emptyVisible,
      };
    }
  }, [nodes]);

  const handleToggleEntityType = (entityType: EntityType) => {
    const currentVisibility = visibleEntityTypes[entityType];
    logger.debug("ui", `Toggling entity type visibility`, {
      entityType,
      fromVisible: currentVisibility,
      toVisible: !currentVisibility,
    });
    setEntityTypeVisibility(entityType, !currentVisibility);
  };

  return (
    <SectionFrame
      title="Entity Types & Visibility"
      icon={<IconFilter size={16} />}
    >
      <Stack gap="xs" p="md">
        {entityTypeOptions.map((option) => {
          const totalCount = entityStats.total[option.entityType] || 0;
          const visibleCount = entityStats.visible[option.entityType] || 0;
          const isVisible = visibleEntityTypes[option.entityType];
          const Icon = option.icon;

          return (
            <div
              key={option.entityType}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 8px",
                borderRadius: "4px",
                backgroundColor: isVisible
                  ? "transparent"
                  : colors.background.secondary,
                opacity: isVisible ? 1 : 0.6,
                transition: "all 0.2s ease",
              }}
            >
              <Checkbox
                checked={isVisible}
                onChange={() => {
                  handleToggleEntityType(option.entityType);
                }}
                size="sm"
                aria-label={`Toggle ${option.label} visibility`}
              />
              <Icon size={16} style={{ color: colors.text.secondary }} />
              <span
                style={{
                  flex: 1,
                  fontSize: "14px",
                  color: colors.text.primary,
                }}
              >
                {option.label}
              </span>
              <Badge
                size="xs"
                variant="light"
                color={isVisible ? "blue" : "gray"}
              >
                {visibleCount}/{totalCount}
              </Badge>
            </div>
          );
        })}
      </Stack>
    </SectionFrame>
  );
};
