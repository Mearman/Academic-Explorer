/**
 * Entity Information Section
 * Displays detailed information about selected or hovered entities
 * Now also detects current entity from route when no graph selection is available
 */

import { RichEntityDisplay } from "@/components/molecules/RichEntityDisplay";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import type { GraphNode } from "@academic-explorer/graph";
import { logger } from "@academic-explorer/utils/logger";
import { IconInfoCircle } from "@tabler/icons-react";
import React from "react";

interface ThemeColors {
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
    blur: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  primary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  entity: {
    work: string;
    author: string;
    source: string;
    institution: string;
    concept: string;
    topic: string;
    publisher: string;
    funder: string;
  };
}

interface EntityInfoSectionProps {
  className?: string;
}

// Helper function to extract entity ID from hash
const extractEntityIdFromHash = (hash: string): string | null => {
  const entityRouteMatch = hash.match(
    /\/(?:authors|works|sources|institutions|topics|publishers|funders)\/([^/?]+)/,
  );
  return entityRouteMatch ? entityRouteMatch[1] : null;
};

// Custom hook to extract entity ID from URL hash
const useRouteEntityId = () => {
  const [routeEntityId, setRouteEntityId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateRouteEntity = () => {
      const entityId = extractEntityIdFromHash(window.location.hash || "");
      setRouteEntityId(entityId);
    };

    updateRouteEntity();
    window.addEventListener("hashchange", updateRouteEntity);

    return () => {
      window.removeEventListener("hashchange", updateRouteEntity);
    };
  }, []);

  return routeEntityId;
};

// Helper function to determine which entity to display
const getDisplayEntityId = ({
  hoveredNodeId,
  selectedNodeId,
  previewEntityId,
  routeEntityId,
}): string | null => {
  return hoveredNodeId ?? selectedNodeId ?? previewEntityId ?? routeEntityId;
};

// Helper function to get entity source for logging
const getEntitySource = ({
  hoveredNodeId,
  selectedNodeId,
  previewEntityId,
}): string => {
  if (hoveredNodeId) return "hover";
  if (selectedNodeId) return "selection";
  if (previewEntityId) return "preview";
  return "route";
};

// Helper function to convert raw entity to GraphNode
const convertRawEntityToGraphNode = (
  rawEntity: unknown,
): GraphNode | undefined => {
  if (
    typeof rawEntity !== "object" ||
    !rawEntity ||
    !("id" in rawEntity) ||
    typeof rawEntity.id !== "string"
  ) {
    return undefined;
  }

  const entityType =
    rawEntity.id.charAt(0) === "A"
      ? "authors"
      : rawEntity.id.charAt(0) === "W"
        ? "works"
        : rawEntity.id.charAt(0) === "S"
          ? "sources"
          : rawEntity.id.charAt(0) === "I"
            ? "institutions"
            : rawEntity.id.charAt(0) === "T"
              ? "topics"
              : rawEntity.id.charAt(0) === "P"
                ? "publishers"
                : ("works" as const);

  const label =
    "display_name" in rawEntity && typeof rawEntity.display_name === "string"
      ? rawEntity.display_name
      : rawEntity.id;

  return {
    id: rawEntity.id,
    entityType,
    label,
    entityId: rawEntity.id,
    x: 0,
    y: 0,
    externalIds: [],
    entityData: rawEntity as unknown as Record<string, unknown>,
  };
};

// Helper function to create loading state component
const LoadingState = ({
  className,
  colors,
}: {
  className: string;
  colors: ThemeColors;
}) => (
  <div
    className={className}
    style={{
      padding: "24px",
      textAlign: "center",
      color: colors.text.secondary,
    }}
  >
    <IconInfoCircle size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
    <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
      Loading Entity...
    </div>
  </div>
);

// Helper function to create error state component
const ErrorState = ({
  className,
  colors,
  error,
}: {
  className: string;
  colors: ThemeColors;
  error: unknown;
}) => (
  <div
    className={className}
    style={{
      padding: "24px",
      textAlign: "center",
      color: colors.text.secondary,
    }}
  >
    <IconInfoCircle size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
    <div
      style={{
        fontSize: "14px",
        fontWeight: 500,
        marginBottom: "8px",
        color: "red",
      }}
    >
      Error Loading Entity
    </div>
    <div style={{ fontSize: "12px", opacity: 0.7, lineHeight: 1.4 }}>
      {String(error)}
    </div>
  </div>
);

// Helper function to create no entity state component
const NoEntityState = ({
  className,
  colors,
}: {
  className: string;
  colors: ThemeColors;
}) => (
  <div
    className={className}
    style={{
      padding: "24px",
      textAlign: "center",
      color: colors.text.secondary,
    }}
  >
    <IconInfoCircle size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
    <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
      No Entity Selected
    </div>
    <div style={{ fontSize: "12px", opacity: 0.7, lineHeight: 1.4 }}>
      Select a node on the graph or hover over one to see detailed information
    </div>
  </div>
);

export const EntityInfoSection: React.FC<EntityInfoSectionProps> = ({
  className = "",
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const previewEntityId = useLayoutStore((state) => state.previewEntityId);
  const nodesMap = useGraphStore((state) => state.nodes);

  const routeEntityId = useRouteEntityId();
  const displayEntityId = getDisplayEntityId({
    hoveredNodeId,
    selectedNodeId,
    previewEntityId,
    routeEntityId,
  });
  const entityNode = displayEntityId ? nodesMap[displayEntityId] : undefined;

  const rawEntityData = useRawEntityData({
    entityId: routeEntityId,
    enabled: !!routeEntityId && !entityNode,
  });

  // Log entity display information
  React.useEffect(() => {
    if (!displayEntityId) return;

    const logData = {
      entityId: displayEntityId,
      source: getEntitySource({
        hoveredNodeId,
        selectedNodeId,
        previewEntityId,
      }),
      hasNodeData: !!entityNode,
      hasRawData: !!rawEntityData.data,
      routeEntityId,
    };
    logger.debug("ui", "EntityInfoSection displaying entity", logData);
  }, [
    displayEntityId,
    hoveredNodeId,
    selectedNodeId,
    previewEntityId,
    entityNode,
    rawEntityData.data,
    routeEntityId,
  ]);

  // Early returns for different states
  if (routeEntityId && rawEntityData.isLoading && !entityNode) {
    return <LoadingState className={className} colors={colors} />;
  }

  if (routeEntityId && rawEntityData.error && !entityNode) {
    return (
      <ErrorState
        className={className}
        colors={colors}
        error={rawEntityData.error}
      />
    );
  }

  if (!displayEntityId || (!entityNode && !rawEntityData.data)) {
    return <NoEntityState className={className} colors={colors} />;
  }

  // Get entity to display
  const entity = entityNode ?? convertRawEntityToGraphNode(rawEntityData.data);

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
        <IconInfoCircle size={16} />
        Entity Information
      </div>

      {entity && <RichEntityDisplay entity={entity} />}
    </div>
  );
};
