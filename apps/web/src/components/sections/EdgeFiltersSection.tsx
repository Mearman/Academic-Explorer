/**
 * Edge Filters Section
 * Controls edge type visibility and filtering in the graph
 */

import React, { useState, useMemo, useCallback } from "react";
import { IconLink, IconEye, IconEyeOff, IconArrowRight, IconArrowLeft, IconArrowsLeftRight } from "@tabler/icons-react";
import { Button, Checkbox, Badge, Group, Stack, Paper, Text, SegmentedControl } from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { logger } from "@academic-explorer/utils/logger";
import { RelationType, type GraphEdge } from "@academic-explorer/types";
import { safeParseRelationType } from "@academic-explorer/utils";

// Direction filter types
export type EdgeDirectionFilter = "outbound" | "inbound" | "both";

/**
 * Filter edges by direction with memoization for performance
 * @param edges - Array of graph edges to filter
 * @param direction - Direction filter to apply
 * @returns Filtered array of edges matching the direction criterion
 */
export function filterByDirection(
  edges: GraphEdge[],
  direction: EdgeDirectionFilter
): GraphEdge[] {
  if (direction === "both") {
    return edges;
  }

  return edges.filter((edge) => {
    // If edge has explicit direction field, use it
    if (edge.direction) {
      return edge.direction === direction;
    }

    // Fallback: all edges without direction field are considered outbound
    // (legacy edges or edges created before direction field was added)
    return direction === "outbound";
  });
}

// Constants
const FLEX_JUSTIFY_SPACE_BETWEEN = "space-between";

interface EdgeFiltersSectionProps {
  className?: string;
}

// Configuration for relation types with labels and descriptions
const RELATION_TYPE_CONFIG = {
  [RelationType.AUTHORSHIP]: {
    label: "Authorship",
    description: "Work → Author relationship",
  },
  [RelationType.AFFILIATION]: {
    label: "Affiliation",
    description: "Author → Institution relationship",
  },
  [RelationType.PUBLICATION]: {
    label: "Publication",
    description: "Work → Source relationship",
  },
  [RelationType.FUNDED_BY]: {
    label: "Funded By",
    description: "Work → Funder relationship",
  },
  [RelationType.REFERENCE]: {
    label: "Reference",
    description: "Work → Work citation relationship",
  },
  [RelationType.HOST_ORGANIZATION]: {
    label: "Host Organization",
    description: "Source → Publisher relationship",
  },
  [RelationType.LINEAGE]: {
    label: "Lineage",
    description: "Institution → Institution parent relationship",
  },
};

export const EdgeFiltersSection: React.FC<EdgeFiltersSectionProps> = ({
  className = "",
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const prefersReducedMotion = useReducedMotion();

  // Direction filter state
  const [directionFilter, setDirectionFilter] = useState<EdgeDirectionFilter>("both");

  // Get edge state from store
  const graphStore = useGraphStore();
  const { visibleEdgeTypes, edgeTypeStats, toggleEdgeTypeVisibility } = graphStore;

  // Memoized filter function for performance
  // This can be used by parent components that need to filter edges
  const applyDirectionFilter = useCallback(
    (edges: GraphEdge[]) => filterByDirection(edges, directionFilter),
    [directionFilter]
  );

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

      {/* Edge Direction Filters */}
      <CollapsibleSection
        title="Edge Direction"
        icon={<IconArrowsLeftRight size={14} />}
        defaultExpanded={true}
        storageKey="edge-filters-direction"
      >
        <Stack gap="md" style={{ marginTop: "8px" }}>
          {/* Direction Filter Description */}
          <Paper p="sm" radius="md" withBorder bg="var(--mantine-color-blue-0)">
            <Text size="xs" c="dimmed">
              Filter edges by their data ownership direction:
            </Text>
            <Stack gap={4} mt={4}>
              <Group gap="xs">
                <IconArrowRight size={12} />
                <Text size="xs" fw={500}>Outbound</Text>
                <Text size="xs" c="dimmed">- Data stored on source entity</Text>
              </Group>
              <Group gap="xs">
                <IconArrowLeft size={12} />
                <Text size="xs" fw={500}>Inbound</Text>
                <Text size="xs" c="dimmed">- Data discovered via reverse lookup</Text>
              </Group>
            </Stack>
          </Paper>

          {/* Direction Segmented Control */}
          <SegmentedControl
            value={directionFilter}
            onChange={(value) => {
              const newFilter = value as EdgeDirectionFilter;
              logger.debug("ui", `Direction filter changed to ${newFilter}`, {
                previousFilter: directionFilter,
                newFilter,
              });
              setDirectionFilter(newFilter);
            }}
            data={[
              {
                value: "outbound",
                label: (
                  <Group gap="xs" justify="center">
                    <IconArrowRight size={14} />
                    <Text size="sm">Outbound</Text>
                  </Group>
                ),
              },
              {
                value: "inbound",
                label: (
                  <Group gap="xs" justify="center">
                    <IconArrowLeft size={14} />
                    <Text size="sm">Inbound</Text>
                  </Group>
                ),
              },
              {
                value: "both",
                label: (
                  <Group gap="xs" justify="center">
                    <IconArrowsLeftRight size={14} />
                    <Text size="sm">Both</Text>
                  </Group>
                ),
              },
            ]}
            fullWidth
          />

          {/* Filter Stats */}
          <Paper p="sm" radius="md" withBorder>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Current Filter
              </Text>
              <Badge size="sm" variant="light" color="blue" tt="capitalize">
                {directionFilter === "both" ? "All Directions" : directionFilter}
              </Badge>
            </Group>
          </Paper>
        </Stack>
      </CollapsibleSection>
    </Stack>
  );
};
