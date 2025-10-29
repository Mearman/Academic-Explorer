/**
 * Edge Filters Section
 * Controls edge type visibility and filtering in the graph
 */

import React from "react";
import { IconLink, IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button, Checkbox, Badge, Group, Stack } from "@mantine/core";
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
    <div className={className} style={{ padding: "16px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
          color: colors.text.primary,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <IconLink size={16} />
        Edge Types & Visibility
      </div>

      {/* Summary Stats */}
      <div
        style={{
          padding: "12px",
          backgroundColor: colors.background.secondary,
          borderRadius: "8px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: FLEX_JUSTIFY_SPACE_BETWEEN,
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "12px", color: colors.text.secondary }}>
            Visible Connections
          </span>
          <Badge size="sm" variant="light" color="blue">
            {totalVisibleEdges.toLocaleString()} / {totalEdges.toLocaleString()}
          </Badge>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: FLEX_JUSTIFY_SPACE_BETWEEN,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: colors.text.secondary }}>
            Active Types
          </span>
          <Badge size="sm" variant="light" color="green">
            {visibleTypesCount} / {totalTypesCount}
          </Badge>
        </div>
      </div>

      {/* Bulk Actions */}
      <Group gap="xs" style={{ marginBottom: "16px" }}>
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
              <div
                key={edgeType}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: FLEX_JUSTIFY_SPACE_BETWEEN,
                  padding: "8px 12px",
                  backgroundColor: isVisible
                    ? colors.background.tertiary
                    : colors.background.secondary,
                  borderRadius: "6px",
                  border: `1px solid ${isVisible ? colors.primary : colors.border.secondary}`,
                  transition: prefersReducedMotion ? "none" : "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flex: 1,
                  }}
                >
                  <Checkbox
                    checked={isVisible}
                    onChange={() => {
                      handleToggleEdgeType(edgeType);
                    }}
                    size="sm"
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: colors.text.primary,
                        textTransform: "capitalize",
                      }}
                    >
                      {config.label || edgeType.replace("_", " ")}
                    </div>
                    {config.description && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: colors.text.secondary,
                          marginTop: "2px",
                        }}
                      >
                        {config.description}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
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
                </div>
              </div>
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
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: colors.text.secondary,
            fontSize: "12px",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            Direction and weight filtering
          </div>
          <div style={{ fontSize: "11px", opacity: 0.7 }}>
            Coming soon: Filter by edge direction (incoming/outgoing) and
            connection strength
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};
