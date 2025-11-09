/**
 * Edge Filters Section
 * Controls edge type visibility and filtering in the graph
 */

import React from "react";
import { IconLink, IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button, Checkbox, Badge, Group, Stack, Paper, Text } from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { logger } from "@academic-explorer/utils/logger";
import { RelationType } from "@academic-explorer/graph";
import { safeParseRelationType } from "@academic-explorer/utils";

// Constants
const FLEX_JUSTIFY_SPACE_BETWEEN = "space-between";

interface EdgeFiltersSectionProps {
  className?: string;
}

// Configuration for relation types with labels and descriptions
const RELATION_TYPE_CONFIG = {
  [RelationType.AUTHORED]: {
    label: "Authored",
    description: "Author wrote this work",
  },
  [RelationType.AFFILIATED]: {
    label: "Affiliated",
    description: "Author is affiliated with institution",
  },
  [RelationType.PUBLISHED_IN]: {
    label: "Published In",
    description: "Work was published in this source",
  },
  [RelationType.FUNDED_BY]: {
    label: "Funded By",
    description: "Work was funded by this organization",
  },
  [RelationType.REFERENCES]: {
    label: "References",
    description: "Work cites another work",
  },
  [RelationType.SOURCE_PUBLISHED_BY]: {
    label: "Source Published By",
    description: "Source is published by this publisher",
  },
};

export const EdgeFiltersSection: React.FC<EdgeFiltersSectionProps> = ({
  className = "",
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const prefersReducedMotion = useReducedMotion();

  // Get edge state from store
  const graphStore = useGraphStore();
  const { visibleEdgeTypes, edgeTypeStats, toggleEdgeTypeVisibility } = graphStore;

  // Calculate visibility stats with proper types
  const totalVisibleEdges = edgeTypeStats.visible || 0;
  const totalEdges = edgeTypeStats.total || 0;
  const visibleTypesCount =
    Object.values(visibleEdgeTypes).filter(Boolean).length;
  const totalTypesCount = Object.keys(RELATION_TYPE_CONFIG).length;

  const handleShowAll = () => {
    logger.debug("ui", "Showing all edge types");
    Object.keys(RELATION_TYPE_CONFIG).forEach((edgeTypeKey) => {
      const parsedType = safeParseRelationType(edgeTypeKey);
      const edgeType = edgeTypeKey as RelationType;
      if (parsedType && !visibleEdgeTypes[edgeType]) {
        toggleEdgeTypeVisibility(edgeType);
      }
    });
  };

  const handleHideAll = () => {
    logger.debug("ui", "Hiding all edge types");
    Object.keys(RELATION_TYPE_CONFIG).forEach((edgeTypeKey) => {
      const parsedType = safeParseRelationType(edgeTypeKey);
      const edgeType = edgeTypeKey as RelationType;
      if (parsedType && visibleEdgeTypes[edgeType]) {
        toggleEdgeTypeVisibility(edgeType);
      }
    });
  };

  const handleToggleEdgeType = (edgeType: RelationType) => {
    logger.debug("ui", `Toggling edge type ${edgeType}`, {
      edgeType,
      currentlyVisible: visibleEdgeTypes[edgeType],
    });
    toggleEdgeTypeVisibility(edgeType);
  };

  return (
    <Stack p="md" className={className}>
      <Group gap="sm">
        <IconLink size={16} />
        <Text size="sm" fw={600} c="var(--mantine-color-text)">
          Edge Types & Visibility
        </Text>
      </Group>

      {/* Summary Stats */}
      <Paper p="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Visible Connections
            </Text>
            <Badge size="sm" variant="light" color="blue">
              {totalVisibleEdges.toLocaleString()} / {totalEdges.toLocaleString()}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Active Types
            </Text>
            <Badge size="sm" variant="light" color="green">
              {visibleTypesCount} / {totalTypesCount}
            </Badge>
          </Group>
        </Stack>
      </Paper>

      {/* Bulk Actions */}
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconEye size={12} />}
          onClick={handleShowAll}
          disabled={visibleTypesCount === totalTypesCount}
        >
          Show All
        </Button>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconEyeOff size={12} />}
          onClick={handleHideAll}
          disabled={visibleTypesCount === 0}
        >
          Hide All
        </Button>
      </Group>

      {/* Edge Type Filters */}
      <CollapsibleSection
        title="Connection Types"
        icon={<IconLink size={14} />}
        defaultExpanded={true}
        storageKey="edge-filters-types"
      >
        <Stack gap="xs" style={{ marginTop: "8px" }}>
          {Object.entries(RELATION_TYPE_CONFIG).map(([edgeTypeKey, config]) => {
            const parsedType = safeParseRelationType(edgeTypeKey);
            if (!parsedType) return null;
            const edgeType = edgeTypeKey as RelationType;
            const typeStats = edgeTypeStats[edgeType];
            const visibleCount = typeof typeStats === "object" ? typeStats.visible : 0;
            const totalCount = typeof typeStats === "object" ? typeStats.total : 0;
            const isVisible = visibleEdgeTypes[edgeType] || false;

            return (
              <Paper
                key={edgeType}
                p="xs"
                radius="md"
                withBorder
                bg={isVisible ? "var(--mantine-color-gray-0)" : "var(--mantine-color-gray-1)"}
                style={{
                  borderColor: isVisible ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-3)",
                  transition: prefersReducedMotion ? "none" : "all 0.2s ease",
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Group gap="sm" flex={1}>
                    <Checkbox
                      checked={isVisible}
                      onChange={() => {
                        handleToggleEdgeType(edgeType);
                      }}
                      size="sm"
                    />
                    <Stack gap={2} flex={1}>
                      <Text size="sm" fw={500} tt="capitalize">
                        {config.label || edgeType.replace("_", " ")}
                      </Text>
                      {config.description && (
                        <Text size="xs" c="dimmed">
                          {config.description}
                        </Text>
                      )}
                    </Stack>
                  </Group>

                  <Group gap="xs">
                    {totalCount > 0 && (
                      <>
                        <Badge
                          size="xs"
                          variant={isVisible ? "filled" : "light"}
                          color={isVisible ? "blue" : "gray"}
                        >
                          {isVisible ? visibleCount.toLocaleString() : "Hidden"}
                        </Badge>
                        {visibleCount !== totalCount && (
                          <Badge size="xs" variant="light" color="gray">
                            {totalCount.toLocaleString()} total
                          </Badge>
                        )}
                      </>
                    )}
                    {totalCount === 0 && (
                      <Badge size="xs" variant="light" color="gray">
                        None
                      </Badge>
                    )}
                  </Group>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </CollapsibleSection>

      {/* Edge Direction Filters - Future Enhancement */}
      <CollapsibleSection
        title="Direction & Weight"
        icon={<IconLink size={14} />}
        defaultExpanded={false}
        storageKey="edge-filters-direction"
      >
        <Stack p="md" align="center">
          <Text size="sm" c="dimmed" ta="center">
            Direction and weight filtering
          </Text>
          <Text size="xs" c="dimmed" opacity={0.7} ta="center">
            Coming soon: Filter by edge direction (incoming/outgoing) and
            connection strength
          </Text>
        </Stack>
      </CollapsibleSection>
    </Stack>
  );
};
